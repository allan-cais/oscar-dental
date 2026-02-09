import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * List insurance balances for the current organization.
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
        .query("insuranceBalances")
        .withIndex("by_patient", (q: any) =>
          q.eq("orgId", orgId).eq("pmsPatientId", args.patientId)
        )
        .collect();
    } else {
      results = await ctx.db
        .query("insuranceBalances")
        .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
        .collect();
    }

    return results;
  },
});
