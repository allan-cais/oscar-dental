import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * List all fee schedules for the current organization.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);

    return await ctx.db
      .query("feeSchedules")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();
  },
});

/**
 * Get a single fee schedule by ID with org check.
 */
export const getById = query({
  args: { feeScheduleId: v.id("feeSchedules") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const feeSchedule = await ctx.db.get(args.feeScheduleId);
    if (!feeSchedule || feeSchedule.orgId !== orgId) {
      throw new Error("Fee schedule not found");
    }

    return feeSchedule;
  },
});

/**
 * Get fee schedules for a specific payer within the org.
 * Returns all fee schedules that match the payerId.
 */
export const getByPayer = query({
  args: { payerId: v.string() },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // No direct payer index, so filter from org-level results
    const allSchedules = await ctx.db
      .query("feeSchedules")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    return allSchedules.filter((fs: any) => fs.payerId === args.payerId);
  },
});
