import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * List AI-generated response drafts with optional status filter.
 * Sorted by createdAt descending.
 */
export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("edited"),
        v.literal("approved"),
        v.literal("posted"),
        v.literal("rejected")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const limit = args.limit ?? 50;

    let results;

    if (args.status) {
      // No direct by_status index on reviewResponses, filter in memory
      results = await ctx.db
        .query("reviewResponses")
        .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
        .collect();
      results = results.filter((r: any) => r.status === args.status);
    } else {
      results = await ctx.db
        .query("reviewResponses")
        .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
        .collect();
    }

    // Sort by createdAt descending
    results.sort((a: any, b: any) => b.createdAt - a.createdAt);

    return results.slice(0, limit);
  },
});

/**
 * Get response draft for a specific review.
 */
export const getByReview = query({
  args: { reviewId: v.id("reviews") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const responses = await ctx.db
      .query("reviewResponses")
      .withIndex("by_review", (q: any) =>
        q.eq("orgId", orgId).eq("reviewId", args.reviewId)
      )
      .collect();

    // Return the most recent one
    if (responses.length === 0) return null;
    responses.sort((a: any, b: any) => b.createdAt - a.createdAt);
    return responses[0];
  },
});

/**
 * Get drafts awaiting staff review (status="draft").
 */
export const getPendingApproval = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const limit = args.limit ?? 50;

    const allResponses = await ctx.db
      .query("reviewResponses")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const drafts = allResponses.filter((r: any) => r.status === "draft");

    // Sort by createdAt descending
    drafts.sort((a: any, b: any) => b.createdAt - a.createdAt);

    return drafts.slice(0, limit);
  },
});
