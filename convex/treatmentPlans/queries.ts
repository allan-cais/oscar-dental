import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * List treatment plans for the current organization.
 * Optionally filter by patient PMS ID.
 */
export const list = query({
  args: {
    patientId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    let results;

    if (args.patientId) {
      results = await ctx.db
        .query("treatmentPlans")
        .withIndex("by_patient", (q: any) =>
          q.eq("orgId", orgId).eq("pmsPatientId", args.patientId)
        )
        .collect();
    } else {
      results = await ctx.db
        .query("treatmentPlans")
        .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
        .collect();
    }

    return results;
  },
});

/**
 * Get a single treatment plan by ID. Verifies orgId matches.
 */
export const getById = query({
  args: { id: v.id("treatmentPlans") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const record = await ctx.db.get(args.id);
    if (!record || record.orgId !== orgId) {
      throw new Error("Not found");
    }

    return record;
  },
});
