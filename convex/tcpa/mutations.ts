import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

const CHANNELS = ["sms", "email", "phone"] as const;
const MESSAGE_TYPES = [
  "reminders",
  "billing",
  "marketing",
  "scheduling",
  "forms",
] as const;

/**
 * Record or update consent for a patient.
 * Creates individual communicationConsents records per channel/messageType combination.
 */
export const recordConsent = mutation({
  args: {
    patientId: v.id("patients"),
    channels: v.object({
      sms: v.boolean(),
      email: v.boolean(),
      phone: v.boolean(),
    }),
    messageTypes: v.object({
      reminders: v.boolean(),
      billing: v.boolean(),
      marketing: v.boolean(),
      scheduling: v.boolean(),
    }),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const now = Date.now();

    // Verify patient belongs to org
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.orgId !== orgId) {
      throw new Error("Patient not found");
    }

    // Get existing consents for this patient
    const existing = await ctx.db
      .query("communicationConsents")
      .withIndex("by_patient", (q: any) =>
        q.eq("orgId", orgId).eq("patientId", args.patientId)
      )
      .collect();

    const existingMap = new Map<string, any>();
    for (const record of existing) {
      existingMap.set(`${record.channel}:${record.messageType}`, record);
    }

    const createdIds: string[] = [];
    const updatedIds: string[] = [];

    // For each enabled channel + message type combo, create/update consent records
    for (const channel of CHANNELS) {
      const channelEnabled = args.channels[channel as keyof typeof args.channels];

      for (const msgType of MESSAGE_TYPES) {
        const typeEnabled =
          args.messageTypes[msgType as keyof typeof args.messageTypes] ?? false;
        const consented = channelEnabled && typeEnabled;
        const key = `${channel}:${msgType}`;
        const existingRecord = existingMap.get(key);

        if (existingRecord) {
          // Update existing record
          if (consented && existingRecord.revokedAt) {
            // Re-consenting after revocation
            await ctx.db.patch(existingRecord._id, {
              consented: true,
              consentTimestamp: now,
              consentSource: args.source,
              revokedAt: undefined,
              revokeSource: undefined,
            });
            updatedIds.push(existingRecord._id);
          } else if (!consented && existingRecord.consented && !existingRecord.revokedAt) {
            // Revoking consent
            await ctx.db.patch(existingRecord._id, {
              consented: false,
              revokedAt: now,
              revokeSource: args.source,
            });
            updatedIds.push(existingRecord._id);
          }
        } else if (consented) {
          // Create new consent record only for consented combinations
          const id = await ctx.db.insert("communicationConsents", {
            orgId,
            patientId: args.patientId,
            channel: channel as any,
            messageType: msgType as any,
            consented: true,
            consentTimestamp: now,
            consentSource: args.source,
          });
          createdIds.push(id);
        }
      }
    }

    return {
      patientId: args.patientId,
      created: createdIds.length,
      updated: updatedIds.length,
      timestamp: now,
    };
  },
});

/**
 * Process a STOP keyword — TCPA critical path.
 * IMMEDIATELY revokes all message types for the specified channel.
 * Creates a notification for the office manager.
 */
export const processStopKeyword = mutation({
  args: {
    patientId: v.id("patients"),
    channel: v.union(v.literal("sms"), v.literal("email"), v.literal("phone")),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const now = Date.now();

    // Verify patient belongs to org
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.orgId !== orgId) {
      throw new Error("Patient not found");
    }

    // Find all consents for this patient + channel
    const consents = await ctx.db
      .query("communicationConsents")
      .withIndex("by_patient_channel", (q: any) =>
        q
          .eq("orgId", orgId)
          .eq("patientId", args.patientId)
          .eq("channel", args.channel)
      )
      .collect();

    // IMMEDIATELY revoke all
    let revokedCount = 0;
    for (const consent of consents) {
      if (consent.consented && !consent.revokedAt) {
        await ctx.db.patch(consent._id, {
          consented: false,
          revokedAt: now,
          revokeSource: `stop_keyword_${args.channel}`,
        });
        revokedCount++;
      }
    }

    // If no existing records, create revoked records to mark the STOP
    if (consents.length === 0) {
      for (const msgType of MESSAGE_TYPES) {
        await ctx.db.insert("communicationConsents", {
          orgId,
          patientId: args.patientId,
          channel: args.channel,
          messageType: msgType as any,
          consented: false,
          consentTimestamp: now,
          consentSource: `stop_keyword_${args.channel}`,
          revokedAt: now,
          revokeSource: `stop_keyword_${args.channel}`,
        });
      }
    }

    // Create notification for office_manager users
    const officeManagers = await ctx.db
      .query("users")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const managers = officeManagers.filter(
      (u: any) =>
        (u.role === "office_manager" || u.role === "admin") && u.isActive
    );

    for (const manager of managers) {
      await ctx.db.insert("notifications", {
        orgId,
        userId: manager._id,
        title: "STOP Keyword Received",
        message: `Patient ${patient.firstName} ${patient.lastName} sent STOP for ${args.channel}. All ${args.channel} communications have been disabled.`,
        type: "warning",
        resourceType: "patient",
        resourceId: args.patientId,
        isRead: false,
        createdAt: now,
      });
    }

    return {
      patientId: args.patientId,
      channel: args.channel,
      revokedCount,
      timestamp: now,
    };
  },
});

/**
 * Update individual message type preferences without changing channel-level consent.
 */
export const updatePreferences = mutation({
  args: {
    patientId: v.id("patients"),
    messageTypes: v.object({
      reminders: v.optional(v.boolean()),
      billing: v.optional(v.boolean()),
      marketing: v.optional(v.boolean()),
      scheduling: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const now = Date.now();

    // Verify patient belongs to org
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.orgId !== orgId) {
      throw new Error("Patient not found");
    }

    // Get all existing consents for this patient
    const existing = await ctx.db
      .query("communicationConsents")
      .withIndex("by_patient", (q: any) =>
        q.eq("orgId", orgId).eq("patientId", args.patientId)
      )
      .collect();

    let updatedCount = 0;

    for (const [msgType, enabled] of Object.entries(args.messageTypes)) {
      if (enabled === undefined) continue;

      // Find existing records for this message type across all channels
      const records = existing.filter((c: any) => c.messageType === msgType);

      for (const record of records) {
        if (enabled && !record.consented) {
          await ctx.db.patch(record._id, {
            consented: true,
            consentTimestamp: now,
            consentSource: "preference_update",
            revokedAt: undefined,
            revokeSource: undefined,
          });
          updatedCount++;
        } else if (!enabled && record.consented && !record.revokedAt) {
          await ctx.db.patch(record._id, {
            consented: false,
            revokedAt: now,
            revokeSource: "preference_update",
          });
          updatedCount++;
        }
      }
    }

    return {
      patientId: args.patientId,
      updatedCount,
      timestamp: now,
    };
  },
});

/**
 * Revoke ALL consent for a patient — equivalent to "STOP ALL".
 * Sets all channels and all message types to false.
 */
export const revokeAll = mutation({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const now = Date.now();

    // Verify patient belongs to org
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.orgId !== orgId) {
      throw new Error("Patient not found");
    }

    // Get all existing consents for this patient
    const consents = await ctx.db
      .query("communicationConsents")
      .withIndex("by_patient", (q: any) =>
        q.eq("orgId", orgId).eq("patientId", args.patientId)
      )
      .collect();

    let revokedCount = 0;
    for (const consent of consents) {
      if (consent.consented && !consent.revokedAt) {
        await ctx.db.patch(consent._id, {
          consented: false,
          revokedAt: now,
          revokeSource: "stop_all",
        });
        revokedCount++;
      }
    }

    // If no records existed, create revoked records for all channel/type combos
    if (consents.length === 0) {
      for (const channel of CHANNELS) {
        for (const msgType of MESSAGE_TYPES) {
          await ctx.db.insert("communicationConsents", {
            orgId,
            patientId: args.patientId,
            channel: channel as any,
            messageType: msgType as any,
            consented: false,
            consentTimestamp: now,
            consentSource: "stop_all",
            revokedAt: now,
            revokeSource: "stop_all",
          });
        }
      }
    }

    // Notify office managers
    const users = await ctx.db
      .query("users")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const managers = users.filter(
      (u: any) =>
        (u.role === "office_manager" || u.role === "admin") && u.isActive
    );

    for (const manager of managers) {
      await ctx.db.insert("notifications", {
        orgId,
        userId: manager._id,
        title: "STOP ALL Received",
        message: `Patient ${patient.firstName} ${patient.lastName} has revoked ALL communication consent. All channels and message types disabled.`,
        type: "warning",
        resourceType: "patient",
        resourceId: args.patientId,
        isRead: false,
        createdAt: now,
      });
    }

    return {
      patientId: args.patientId,
      revokedCount,
      timestamp: now,
    };
  },
});
