import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * List denials with optional filters and cursor-based pagination.
 */
export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("new"),
        v.literal("acknowledged"),
        v.literal("appealing"),
        v.literal("appealed"),
        v.literal("won"),
        v.literal("lost"),
        v.literal("partial"),
        v.literal("written_off")
      )
    ),
    category: v.optional(
      v.union(
        v.literal("eligibility"),
        v.literal("coding"),
        v.literal("documentation"),
        v.literal("authorization"),
        v.literal("timely_filing"),
        v.literal("duplicate"),
        v.literal("other")
      )
    ),
    payerId: v.optional(v.string()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const limit = args.limit ?? 50;

    // Choose best index based on filters
    let results;

    if (args.status) {
      results = await ctx.db
        .query("denials")
        .withIndex("by_status", (q: any) =>
          q.eq("orgId", orgId).eq("status", args.status!)
        )
        .collect();
    } else if (args.category) {
      results = await ctx.db
        .query("denials")
        .withIndex("by_category", (q: any) =>
          q.eq("orgId", orgId).eq("category", args.category!)
        )
        .collect();
    } else {
      results = await ctx.db
        .query("denials")
        .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
        .collect();
    }

    // Apply remaining filters not covered by index
    if (args.category && args.status) {
      results = results.filter((d: any) => d.category === args.category);
    }
    if (args.payerId) {
      results = results.filter((d: any) => d.payerId === args.payerId);
    }

    // Sort by createdAt descending (most recent first)
    results.sort((a: any, b: any) => b.createdAt - a.createdAt);

    // Cursor-based pagination
    let startIdx = 0;
    if (args.cursor) {
      const cursorIdx = results.findIndex((d: any) => d._id === args.cursor);
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
      denials: page,
      nextCursor,
      totalCount: results.length,
    };
  },
});

/**
 * Get a single denial by ID with org check.
 */
export const getById = query({
  args: { denialId: v.id("denials") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const denial = await ctx.db.get(args.denialId);
    if (!denial || denial.orgId !== orgId) {
      throw new Error("Denial not found");
    }

    return denial;
  },
});

/**
 * Get denial linked to a specific claim.
 */
export const getByClaim = query({
  args: { claimId: v.id("claims") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const denial = await ctx.db
      .query("denials")
      .withIndex("by_claim", (q: any) =>
        q.eq("orgId", orgId).eq("claimId", args.claimId)
      )
      .first();

    return denial;
  },
});

/**
 * Aggregate denial stats for the org:
 * - Count by status
 * - Count by category
 * - Appeal success rate (won / total with outcome)
 * - Total denied amount
 * - Escalated count
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);

    const allDenials = await ctx.db
      .query("denials")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    // Count by status
    const statusCounts: Record<string, number> = {};
    for (const denial of allDenials) {
      statusCounts[denial.status] = (statusCounts[denial.status] || 0) + 1;
    }

    // Count by category
    const categoryCounts: Record<string, number> = {};
    for (const denial of allDenials) {
      const cat = denial.category ?? "uncategorized";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    // Appeal success rate: won / (won + lost + partial)
    const outcomeStatuses = ["won", "lost", "partial"];
    const withOutcome = allDenials.filter((d: any) =>
      outcomeStatuses.includes(d.status)
    );
    const wonCount = allDenials.filter(
      (d: any) => d.status === "won"
    ).length;
    const appealSuccessRate =
      withOutcome.length > 0 ? wonCount / withOutcome.length : 0;

    // Total denied amount
    const totalDeniedAmount = allDenials.reduce(
      (sum: number, d: any) => sum + (d.amount ?? 0),
      0
    );

    // Escalated count
    const escalatedCount = allDenials.filter(
      (d: any) => d.isEscalated === true
    ).length;

    return {
      totalDenials: allDenials.length,
      statusCounts,
      categoryCounts,
      appealSuccessRate: Math.round(appealSuccessRate * 10000) / 100, // percentage with 2 decimals
      totalDeniedAmount: Math.round(totalDeniedAmount * 100) / 100,
      escalatedCount,
    };
  },
});
