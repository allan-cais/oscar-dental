import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * List appeals with optional status filter and cursor-based pagination.
 */
export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("reviewed"),
        v.literal("submitted"),
        v.literal("won"),
        v.literal("lost"),
        v.literal("partial")
      )
    ),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const limit = args.limit ?? 50;

    let results;

    if (args.status) {
      results = await ctx.db
        .query("appeals")
        .withIndex("by_status", (q: any) =>
          q.eq("orgId", orgId).eq("status", args.status!)
        )
        .collect();
    } else {
      results = await ctx.db
        .query("appeals")
        .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
        .collect();
    }

    // Sort by createdAt descending
    results.sort((a: any, b: any) => b.createdAt - a.createdAt);

    // Cursor-based pagination
    let startIdx = 0;
    if (args.cursor) {
      const cursorIdx = results.findIndex((a: any) => a._id === args.cursor);
      if (cursorIdx >= 0) {
        startIdx = cursorIdx + 1;
      }
    }

    const page = results.slice(startIdx, startIdx + limit);
    const nextCursor =
      page.length === limit && startIdx + limit < results.length
        ? page[page.length - 1]._id
        : null;

    return {
      appeals: page,
      nextCursor,
      totalCount: results.length,
    };
  },
});

/**
 * Get a single appeal by ID with org check.
 */
export const getById = query({
  args: { appealId: v.id("appeals") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const appeal = await ctx.db.get(args.appealId);
    if (!appeal || appeal.orgId !== orgId) {
      throw new Error("Appeal not found");
    }

    return appeal;
  },
});

/**
 * Get appeal for a specific denial.
 */
export const getByDenial = query({
  args: { denialId: v.id("denials") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const appeal = await ctx.db
      .query("appeals")
      .withIndex("by_denial", (q: any) =>
        q.eq("orgId", orgId).eq("denialId", args.denialId)
      )
      .first();

    return appeal;
  },
});
