import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * Get consent status for a specific patient.
 * Returns all consent records across channels and message types.
 */
export const getConsentStatus = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const consents = await ctx.db
      .query("communicationConsents")
      .withIndex("by_patient", (q: any) =>
        q.eq("orgId", orgId).eq("patientId", args.patientId)
      )
      .collect();

    // Build structured consent view
    const channels: Record<string, boolean> = {
      sms: false,
      email: false,
      phone: false,
    };
    const messageTypes: Record<string, boolean> = {
      forms: false,
      reminders: false,
      scheduling: false,
      billing: false,
      marketing: false,
    };

    let latestTimestamp: number | null = null;
    let latestSource: string | null = null;

    for (const consent of consents) {
      if (consent.consented && !consent.revokedAt) {
        channels[consent.channel] = true;
        if (consent.messageType === "all") {
          messageTypes.forms = true;
          messageTypes.reminders = true;
          messageTypes.scheduling = true;
          messageTypes.billing = true;
          messageTypes.marketing = true;
        } else {
          messageTypes[consent.messageType] = true;
        }
      }

      if (!latestTimestamp || consent.consentTimestamp > latestTimestamp) {
        latestTimestamp = consent.consentTimestamp;
        latestSource = consent.consentSource;
      }
    }

    return {
      patientId: args.patientId,
      channels,
      messageTypes,
      consentTimestamp: latestTimestamp,
      source: latestSource,
      rawRecords: consents,
    };
  },
});

/**
 * List all opted-out patients.
 * Filters by channel if provided.
 */
export const getOptOuts = query({
  args: {
    limit: v.optional(v.number()),
    channel: v.optional(
      v.union(v.literal("sms"), v.literal("email"), v.literal("phone"))
    ),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const limit = args.limit ?? 50;

    const allConsents = await ctx.db
      .query("communicationConsents")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    // Find consents that are revoked or explicitly not consented
    let optOuts = allConsents.filter(
      (c: any) => !c.consented || c.revokedAt
    );

    if (args.channel) {
      optOuts = optOuts.filter((c: any) => c.channel === args.channel);
    }

    // Sort by most recent revocation/update
    optOuts.sort((a: any, b: any) => {
      const aTime = a.revokedAt ?? a.consentTimestamp;
      const bTime = b.revokedAt ?? b.consentTimestamp;
      return bTime - aTime;
    });

    return optOuts.slice(0, limit);
  },
});

/**
 * Get consent change history for a patient (audit trail).
 * Returns all consent records ordered by timestamp.
 */
export const getConsentHistory = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const consents = await ctx.db
      .query("communicationConsents")
      .withIndex("by_patient", (q: any) =>
        q.eq("orgId", orgId).eq("patientId", args.patientId)
      )
      .collect();

    // Sort by timestamp ascending for chronological history
    consents.sort(
      (a: any, b: any) => a.consentTimestamp - b.consentTimestamp
    );

    return consents.map((c: any) => ({
      _id: c._id,
      channel: c.channel,
      messageType: c.messageType,
      consented: c.consented,
      consentTimestamp: c.consentTimestamp,
      consentSource: c.consentSource,
      revokedAt: c.revokedAt,
      revokeSource: c.revokeSource,
    }));
  },
});

/**
 * Aggregate compliance stats across the org.
 * Total consented, opted out, opt-out %, STOP keywords processed this month.
 */
export const getComplianceStats = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);

    const allConsents = await ctx.db
      .query("communicationConsents")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const consented = allConsents.filter(
      (c: any) => c.consented && !c.revokedAt
    );
    const optedOut = allConsents.filter(
      (c: any) => !c.consented || c.revokedAt
    );

    // STOP keywords processed this month (revocations with revokeSource containing "stop")
    const now = Date.now();
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartMs = monthStart.getTime();

    const stopKeywordsThisMonth = allConsents.filter(
      (c: any) =>
        c.revokedAt &&
        c.revokedAt >= monthStartMs &&
        c.revokeSource &&
        c.revokeSource.toLowerCase().includes("stop")
    ).length;

    const totalRecords = allConsents.length;
    const optOutPercentage =
      totalRecords > 0
        ? Math.round((optedOut.length / totalRecords) * 1000) / 10
        : 0;

    return {
      totalConsented: consented.length,
      totalOptedOut: optedOut.length,
      optOutPercentage,
      stopKeywordsProcessedThisMonth: stopKeywordsThisMonth,
      totalRecords,
    };
  },
});

/**
 * List all patients with their aggregated consent status.
 * Groups communicationConsents by patient and derives per-channel consent flags.
 */
export const listConsents = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);

    const allConsents = await ctx.db
      .query("communicationConsents")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    // Group by patientId
    const grouped: Record<string, any[]> = {};
    for (const c of allConsents) {
      const pid = c.patientId as string;
      if (!grouped[pid]) grouped[pid] = [];
      grouped[pid].push(c);
    }

    const sourceMap: Record<string, string> = {
      patient_portal: "web_form",
      sms_reply: "sms_optin",
      front_desk: "phone",
    };

    const results: Array<{
      id: string;
      name: string;
      smsConsent: boolean;
      emailConsent: boolean;
      voiceConsent: boolean;
      messagePrefs: string[];
      lastUpdated: string;
      source: string;
    }> = [];

    for (const [patientId, consents] of Object.entries(grouped)) {
      const patient = await ctx.db.get(patientId as any) as any;
      const name = patient
        ? `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim()
        : "Unknown";

      const active = consents.filter((c: any) => c.consented && !c.revokedAt);

      const smsConsent = active.some((c: any) => c.channel === "sms");
      const emailConsent = active.some((c: any) => c.channel === "email");
      const voiceConsent = active.some((c: any) => c.channel === "phone");

      const prefsSet = new Set<string>();
      for (const c of active) {
        const mt = c.messageType === "reminders" ? "appt_reminders" : c.messageType;
        prefsSet.add(mt);
      }

      // Find most recent consent record
      let latestTimestamp = 0;
      let latestSource = "";
      for (const c of consents) {
        if (c.consentTimestamp > latestTimestamp) {
          latestTimestamp = c.consentTimestamp;
          latestSource = c.consentSource;
        }
      }

      const friendlySource = sourceMap[latestSource] ?? (latestSource || "paper");

      results.push({
        id: patientId,
        name,
        smsConsent,
        emailConsent,
        voiceConsent,
        messagePrefs: Array.from(prefsSet),
        lastUpdated: latestTimestamp
          ? new Date(latestTimestamp).toISOString()
          : "",
        source: friendlySource,
      });
    }

    results.sort((a, b) => a.name.localeCompare(b.name));
    return results;
  },
});
