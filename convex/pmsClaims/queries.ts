import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * List PMS claims for the current organization.
 * Optionally filter by patient PMS ID and/or status.
 */
export const list = query({
  args: {
    patientId: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // When filtering by status, use the by_status index for efficiency
    if (args.status) {
      let results = await ctx.db
        .query("pmsClaims")
        .withIndex("by_status", (q: any) =>
          q.eq("orgId", orgId).eq("status", args.status)
        )
        .collect();

      if (args.patientId) {
        results = results.filter(
          (r: any) => r.pmsPatientId === args.patientId
        );
      }

      return results;
    }

    // When filtering by patient only, use the by_patient index
    if (args.patientId) {
      const results = await ctx.db
        .query("pmsClaims")
        .withIndex("by_patient", (q: any) =>
          q.eq("orgId", orgId).eq("pmsPatientId", args.patientId)
        )
        .collect();

      return results;
    }

    // No filters — list all for the org
    const results = await ctx.db
      .query("pmsClaims")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    return results;
  },
});

/**
 * Get a single PMS claim by ID. Verifies orgId matches.
 */
export const getById = query({
  args: { id: v.id("pmsClaims") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const record = await ctx.db.get(args.id);
    if (!record || record.orgId !== orgId) {
      throw new Error("Not found");
    }

    return record;
  },
});
