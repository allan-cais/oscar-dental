import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId, getCurrentUser } from "../lib/auth";

/**
 * List notifications for the current user.
 * Supports filtering to unread only.
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
    unreadOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User not found");
    }

    const limit = args.limit ?? 50;

    let results;

    if (args.unreadOnly) {
      results = await ctx.db
        .query("notifications")
        .withIndex("by_user_unread", (q: any) =>
          q.eq("orgId", orgId).eq("userId", user._id).eq("isRead", false)
        )
        .collect();
    } else {
      results = await ctx.db
        .query("notifications")
        .withIndex("by_user", (q: any) =>
          q.eq("orgId", orgId).eq("userId", user._id)
        )
        .collect();
    }

    // Sort by createdAt desc (newest first)
    results.sort((a: any, b: any) => b.createdAt - a.createdAt);

    return results.slice(0, limit);
  },
});

/**
 * Get count of unread notifications for the current user.
 */
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User not found");
    }

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q: any) =>
        q.eq("orgId", orgId).eq("userId", user._id).eq("isRead", false)
      )
      .collect();

    return { count: unread.length };
  },
});

/**
 * Get all notifications linked to a specific resource.
 */
export const getByResource = query({
  args: {
    resourceType: v.string(),
    resourceId: v.string(),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const all = await ctx.db
      .query("notifications")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const filtered = all.filter(
      (n: any) =>
        n.resourceType === args.resourceType &&
        n.resourceId === args.resourceId
    );

    // Sort by createdAt desc
    filtered.sort((a: any, b: any) => b.createdAt - a.createdAt);

    return filtered;
  },
});
