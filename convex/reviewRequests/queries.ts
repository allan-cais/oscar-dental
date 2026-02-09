import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * List review requests with optional status filter.
 */
export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("scheduled"),
        v.literal("sent"),
        v.literal("clicked"),
        v.literal("completed"),
        v.literal("skipped"),
        v.literal("filtered")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const limit = args.limit ?? 50;

    let results;

    if (args.status) {
      results = await ctx.db
        .query("reviewRequests")
        .withIndex("by_status", (q: any) =>
          q.eq("orgId", orgId).eq("status", args.status!)
        )
        .collect();
    } else {
      results = await ctx.db
        .query("reviewRequests")
        .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
        .collect();
    }

    // Sort by createdAt desc
    results.sort((a: any, b: any) => b.createdAt - a.createdAt);

    return results.slice(0, limit);
  },
});

/**
 * Get review requests for a specific patient.
 */
export const getByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const results = await ctx.db
      .query("reviewRequests")
      .withIndex("by_patient", (q: any) =>
        q.eq("orgId", orgId).eq("patientId", args.patientId)
      )
      .collect();

    // Sort by createdAt desc
    results.sort((a: any, b: any) => b.createdAt - a.createdAt);

    return results;
  },
});

/**
 * Get patients eligible for a review request.
 *
 * Eligible = had appointment completed in last 24 hours AND:
 * - No review request sent in last 30 days
 * - Not opted out of SMS communications
 * - No recent complaint (rating <= 2 review in last 30 days)
 */
export const getEligiblePatients = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);

    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Get completed appointments in last 24 hours
    const completedAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_status", (q: any) =>
        q.eq("orgId", orgId).eq("status", "completed")
      )
      .collect();

    const recentCompleted = completedAppointments.filter(
      (a: any) => a.completedAt && a.completedAt >= twentyFourHoursAgo
    );

    if (recentCompleted.length === 0) {
      return [];
    }

    // Get all review requests in last 30 days for this org
    const recentRequests = await ctx.db
      .query("reviewRequests")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();
    const recentRequestPatientIds = new Set(
      recentRequests
        .filter((r: any) => r.createdAt >= thirtyDaysAgo)
        .map((r: any) => r.patientId)
    );

    // Get recent low reviews (complaints)
    const recentReviews = await ctx.db
      .query("reviews")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();
    const complaintPatientIds = new Set(
      recentReviews
        .filter(
          (r: any) =>
            r.rating <= 2 &&
            r.publishedAt >= thirtyDaysAgo &&
            r.matchedPatientId
        )
        .map((r: any) => r.matchedPatientId)
    );

    // Get SMS opt-outs
    const consents = await ctx.db
      .query("communicationConsents")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();
    const optedOutPatientIds = new Set(
      consents
        .filter(
          (c: any) =>
            c.channel === "sms" && !c.consented && !c.revokedAt
        )
        .map((c: any) => c.patientId)
    );

    // Deduplicate patients from appointments
    const patientIds = [
      ...new Set(recentCompleted.map((a: any) => a.patientId)),
    ];

    const eligible: any[] = [];
    for (const patientId of patientIds) {
      const reasons: string[] = [];

      if (recentRequestPatientIds.has(patientId)) {
        continue; // Skip: request sent in last 30 days
      }
      if (complaintPatientIds.has(patientId)) {
        continue; // Skip: recent complaint
      }
      if (optedOutPatientIds.has(patientId)) {
        continue; // Skip: opted out of SMS
      }

      const patient = await ctx.db.get(patientId) as any;
      if (!patient || patient.orgId !== orgId || !patient.isActive) {
        continue;
      }
      if (!patient.phone) {
        continue; // No phone number for SMS
      }

      const appointment = recentCompleted.find(
        (a: any) => a.patientId === patientId
      );

      reasons.push("completed appointment in last 24 hours");
      if (patient.smsConsent) {
        reasons.push("SMS consent on file");
      }

      eligible.push({
        patient,
        appointmentId: appointment?._id,
        appointmentDate: appointment?.date,
        eligibilityReasons: reasons,
      });
    }

    return eligible;
  },
});
