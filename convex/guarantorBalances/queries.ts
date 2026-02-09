import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

export const list = query({
  args: {
    patientId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const results = await ctx.db
      .query("guarantorBalances")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    if (!args.patientId) return results;
    return results.filter((r: any) => r.pmsPatientId === args.patientId);
  },
});
