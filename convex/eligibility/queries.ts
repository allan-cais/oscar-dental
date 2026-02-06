import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * Get the latest valid (non-expired) eligibility result for a patient.
 */
export const getByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const results = await ctx.db
      .query("eligibilityResults")
      .withIndex("by_patient", (q) =>
        q.eq("orgId", orgId).eq("patientId", args.patientId)
      )
      .order("desc")
      .collect();

    // Return the most recent result that hasn't expired
    const now = Date.now();
    return results.find((r) => r.expiresAt > now) ?? null;
  },
});

/**
 * Get the eligibility result linked to a specific appointment.
 */
export const getByAppointment = query({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    return await ctx.db
      .query("eligibilityResults")
      .withIndex("by_appointment", (q) =>
        q.eq("orgId", orgId).eq("appointmentId", args.appointmentId)
      )
      .order("desc")
      .first();
  },
});

/**
 * List eligibility results with status "error" for the org. Paginated.
 */
export const listExceptions = query({
  args: { paginationOpts: v.object({ numItems: v.number(), cursor: v.union(v.string(), v.null()) }) },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    return await ctx.db
      .query("eligibilityResults")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .filter((q) => q.eq(q.field("status"), "error"))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/**
 * Get info about the most recent batch verification run.
 * Returns the most recent eligibility result verified by "batch", plus a count of
 * batch results from the same day to give a sense of the last run.
 */
export const getBatchStatus = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);

    // Get the most recent batch result
    const allResults = await ctx.db
      .query("eligibilityResults")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .order("desc")
      .collect();

    const batchResults = allResults.filter((r) => r.verifiedBy === "batch");
    const latestBatch = batchResults[0] ?? null;

    if (!latestBatch) {
      return {
        lastRunAt: null,
        totalVerified: 0,
        activeCount: 0,
        errorCount: 0,
        inactiveCount: 0,
      };
    }

    // Count results from the same batch run (within 10 minutes of the latest)
    const batchWindowStart = latestBatch.createdAt - 10 * 60 * 1000;
    const runResults = batchResults.filter(
      (r) => r.createdAt >= batchWindowStart && r.createdAt <= latestBatch.createdAt
    );

    return {
      lastRunAt: latestBatch.createdAt,
      totalVerified: runResults.length,
      activeCount: runResults.filter((r) => r.status === "active").length,
      errorCount: runResults.filter((r) => r.status === "error").length,
      inactiveCount: runResults.filter((r) => r.status === "inactive").length,
    };
  },
});
