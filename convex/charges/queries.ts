import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

export const list = query({
  args: {
    patientId: v.optional(v.string()),
    claimId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const results = await ctx.db
      .query("charges")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    return results.filter((r: any) => {
      if (args.patientId && r.pmsPatientId !== args.patientId) return false;
      if (args.claimId && r.pmsClaimId !== args.claimId) return false;
      return true;
    });
  },
});

/**
 * Get a single charge by ID. Verifies orgId matches.
 */
export const getById = query({
  args: { id: v.id("charges") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const record = await ctx.db.get(args.id);
    if (!record || record.orgId !== orgId) {
      throw new Error("Not found");
    }
    return record;
  },
});
