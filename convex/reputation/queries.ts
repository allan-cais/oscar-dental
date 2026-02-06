import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * Reputation dashboard: avg rating, total count, star distribution,
 * review volume by month (last 6), sentiment breakdown.
 */
export const getDashboard = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);

    const allReviews = await ctx.db
      .query("reviews")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const totalCount = allReviews.length;

    // Star distribution
    const starDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let ratingSum = 0;
    for (const review of allReviews) {
      const r = review.rating as 1 | 2 | 3 | 4 | 5;
      if (r >= 1 && r <= 5) {
        starDistribution[r]++;
      }
      ratingSum += review.rating;
    }
    const averageRating =
      totalCount > 0 ? Math.round((ratingSum / totalCount) * 10) / 10 : 0;

    // Review volume by month (last 6 months)
    const now = Date.now();
    const sixMonthsAgo = now - 6 * 30 * 24 * 60 * 60 * 1000;
    const monthlyVolume: Record<string, number> = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyVolume[key] = 0;
    }
    for (const review of allReviews) {
      if (review.publishedAt >= sixMonthsAgo) {
        const d = new Date(review.publishedAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (key in monthlyVolume) {
          monthlyVolume[key]++;
        }
      }
    }

    // Sentiment breakdown
    const sentimentBreakdown = { positive: 0, neutral: 0, negative: 0 };
    for (const review of allReviews) {
      const s = review.sentiment as "positive" | "neutral" | "negative" | undefined;
      if (s && s in sentimentBreakdown) {
        sentimentBreakdown[s]++;
      }
    }

    return {
      averageRating,
      totalCount,
      starDistribution,
      monthlyVolume,
      sentimentBreakdown,
    };
  },
});

/**
 * List reviews with optional filters. Sort by reviewDate desc.
 */
export const getRecentReviews = query({
  args: {
    limit: v.optional(v.number()),
    rating: v.optional(v.number()),
    sentiment: v.optional(
      v.union(
        v.literal("positive"),
        v.literal("neutral"),
        v.literal("negative")
      )
    ),
    hasResponse: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const limit = args.limit ?? 50;

    let results;

    if (args.rating) {
      results = await ctx.db
        .query("reviews")
        .withIndex("by_rating", (q: any) =>
          q.eq("orgId", orgId).eq("rating", args.rating!)
        )
        .collect();
    } else {
      results = await ctx.db
        .query("reviews")
        .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
        .collect();
    }

    // Apply remaining filters
    if (args.sentiment) {
      results = results.filter((r: any) => r.sentiment === args.sentiment);
    }
    if (args.hasResponse !== undefined) {
      if (args.hasResponse) {
        results = results.filter(
          (r: any) =>
            r.responseStatus === "posted" || r.responseStatus === "approved"
        );
      } else {
        results = results.filter(
          (r: any) =>
            r.responseStatus === "pending" || r.responseStatus === "draft_ready"
        );
      }
    }

    // Sort by publishedAt desc
    results.sort((a: any, b: any) => b.publishedAt - a.publishedAt);

    return results.slice(0, limit);
  },
});

/**
 * Priority alerts: reviews with rating <= 2 that have not been responded to.
 * Returns reviews needing urgent attention.
 */
export const getPriorityAlerts = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);

    const allReviews = await ctx.db
      .query("reviews")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    // Filter: rating <= 2 and responseStatus is pending or draft_ready
    const alerts = allReviews.filter(
      (r: any) =>
        r.rating <= 2 &&
        (r.responseStatus === "pending" || r.responseStatus === "draft_ready")
    );

    // Sort by publishedAt desc (most recent first)
    alerts.sort((a: any, b: any) => b.publishedAt - a.publishedAt);

    // Add urgency indicator based on time since published
    const now = Date.now();
    const TWO_MINUTES = 2 * 60 * 1000;

    return alerts.map((review: any) => {
      const ageMs = now - review.publishedAt;
      const urgency =
        ageMs > TWO_MINUTES ? "overdue" : "urgent";
      return { ...review, urgency };
    });
  },
});

/**
 * Get a single review by ID with org check.
 */
export const getReviewById = query({
  args: { reviewId: v.id("reviews") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const review = await ctx.db.get(args.reviewId);
    if (!review || review.orgId !== orgId) {
      throw new Error("Review not found");
    }

    // Also fetch the response if one exists
    const response = await ctx.db
      .query("reviewResponses")
      .withIndex("by_review", (q: any) =>
        q.eq("orgId", orgId).eq("reviewId", args.reviewId)
      )
      .first();

    return { ...review, response };
  },
});
