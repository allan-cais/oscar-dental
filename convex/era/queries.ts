import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * List ERA records with optional match status filter.
 */
export const list = query({
  args: {
    matchStatus: v.optional(
      v.union(
        v.literal("matched"),
        v.literal("unmatched"),
        v.literal("exception")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const limit = args.limit ?? 50;

    const allRecords = await ctx.db
      .query("eraRecords")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    let results = allRecords;

    // Filter by matchStatus if provided (check individual claimPayments)
    if (args.matchStatus) {
      results = results.filter((era: any) =>
        era.claimPayments.some(
          (cp: any) => cp.matchStatus === args.matchStatus
        )
      );
    }

    // Sort by createdAt desc (most recent first, using createdAt as proxy for receivedAt)
    results.sort((a: any, b: any) => b.createdAt - a.createdAt);

    const page = results.slice(0, limit);

    return {
      eraRecords: page,
      totalCount: results.length,
    };
  },
});

/**
 * Get a single ERA record by ID with matched claim details.
 */
export const getById = query({
  args: { eraId: v.id("eraRecords") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const era = await ctx.db.get(args.eraId);
    if (!era || era.orgId !== orgId) {
      throw new Error("ERA record not found");
    }

    // Enrich claim payments with matched claim details
    const enrichedPayments = await Promise.all(
      era.claimPayments.map(async (cp: any) => {
        if (cp.matchedClaimId) {
          const claim = await ctx.db.get(cp.matchedClaimId) as any;
          return {
            ...cp,
            matchedClaim: claim
              ? {
                  _id: claim._id,
                  claimNumber: claim.claimNumber ?? null,
                  status: claim.status,
                  totalCharged: claim.totalCharged,
                  totalPaid: claim.totalPaid ?? null,
                  patientId: claim.patientId,
                }
              : null,
          };
        }
        return { ...cp, matchedClaim: null };
      })
    );

    return {
      ...era,
      claimPayments: enrichedPayments,
    };
  },
});

/**
 * Get ERA records with exception status needing manual review.
 */
export const getExceptions = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const limit = args.limit ?? 50;

    const allRecords = await ctx.db
      .query("eraRecords")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    // Filter to ERAs that have at least one exception line item
    const withExceptions = allRecords.filter((era: any) =>
      era.claimPayments.some((cp: any) => cp.matchStatus === "exception")
    );

    // Sort by createdAt desc
    withExceptions.sort((a: any, b: any) => b.createdAt - a.createdAt);

    const page = withExceptions.slice(0, limit);

    // Return only the exception line items from each ERA
    const results = page.map((era: any) => ({
      ...era,
      exceptionPayments: era.claimPayments.filter(
        (cp: any) => cp.matchStatus === "exception"
      ),
    }));

    return {
      exceptions: results,
      totalCount: withExceptions.length,
    };
  },
});

/**
 * Reconciliation summary: matched/unmatched/exception counts and amounts,
 * plus auto-match rate.
 */
export const getReconciliationSummary = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);

    const allRecords = await ctx.db
      .query("eraRecords")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    let matchedCount = 0;
    let matchedAmount = 0;
    let unmatchedCount = 0;
    let unmatchedAmount = 0;
    let exceptionCount = 0;
    let exceptionAmount = 0;
    let totalLineItems = 0;

    for (const era of allRecords) {
      for (const cp of era.claimPayments) {
        totalLineItems++;
        const amount = (cp as any).amountPaid ?? 0;

        switch ((cp as any).matchStatus) {
          case "matched":
            matchedCount++;
            matchedAmount += amount;
            break;
          case "unmatched":
            unmatchedCount++;
            unmatchedAmount += amount;
            break;
          case "exception":
            exceptionCount++;
            exceptionAmount += amount;
            break;
        }
      }
    }

    const autoMatchRate =
      totalLineItems > 0
        ? Math.round((matchedCount / totalLineItems) * 10000) / 100
        : 0;

    return {
      totalERAs: allRecords.length,
      totalLineItems,
      matched: {
        count: matchedCount,
        amount: Math.round(matchedAmount * 100) / 100,
      },
      unmatched: {
        count: unmatchedCount,
        amount: Math.round(unmatchedAmount * 100) / 100,
      },
      exception: {
        count: exceptionCount,
        amount: Math.round(exceptionAmount * 100) / 100,
      },
      autoMatchRate, // percentage
    };
  },
});
