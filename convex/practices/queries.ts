import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * List all practices for the current organization.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);

    return await ctx.db
      .query("practices")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();
  },
});

/**
 * Get a practice by ID. Verifies the practice belongs to the current org.
 */
export const getById = query({
  args: { practiceId: v.id("practices") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const practice = await ctx.db.get(args.practiceId);
    if (!practice || practice.orgId !== orgId) {
      throw new Error("Practice not found");
    }

    return practice;
  },
});

/**
 * Get practice settings for a given practice.
 */
export const getSettings = query({
  args: { practiceId: v.id("practices") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // Verify practice ownership
    const practice = await ctx.db.get(args.practiceId);
    if (!practice || practice.orgId !== orgId) {
      throw new Error("Practice not found");
    }

    const settings = await ctx.db
      .query("practiceSettings")
      .withIndex("by_practice", (q) => q.eq("practiceId", args.practiceId))
      .first();

    return settings;
  },
});
