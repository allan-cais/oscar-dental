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
      .query("adjustments")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    if (!args.patientId) return results;
    return results.filter((r: any) => r.pmsPatientId === args.patientId);
  },
});

/**
 * Get a single adjustment by ID. Verifies orgId matches.
 */
export const getById = query({
  args: { id: v.id("adjustments") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const record = await ctx.db.get(args.id);
    if (!record || record.orgId !== orgId) {
      throw new Error("Not found");
    }
    return record;
  },
});
