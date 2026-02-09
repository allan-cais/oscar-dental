import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * List all insurance plans for the current organization.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);

    const results = await ctx.db
      .query("insurancePlans")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    return results;
  },
});

/**
 * Get a single insurance plan by ID. Verifies orgId matches.
 */
export const getById = query({
  args: { id: v.id("insurancePlans") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const record = await ctx.db.get(args.id);
    if (!record || record.orgId !== orgId) {
      throw new Error("Not found");
    }

    return record;
  },
});
