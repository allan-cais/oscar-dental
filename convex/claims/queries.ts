import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * List claims with optional filters and cursor-based pagination.
 */
export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("scrubbing"),
        v.literal("scrub_failed"),
        v.literal("ready"),
        v.literal("submitted"),
        v.literal("accepted"),
        v.literal("rejected"),
        v.literal("paid"),
        v.literal("denied"),
        v.literal("appealed")
      )
    ),
    payerId: v.optional(v.string()),
    ageBucket: v.optional(
      v.union(
        v.literal("0-30"),
        v.literal("31-60"),
        v.literal("61-90"),
        v.literal("91-120"),
        v.literal("120+")
      )
    ),
    practiceId: v.optional(v.id("practices")),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const limit = args.limit ?? 50;

    // Choose best index based on filters
    let results;

    if (args.practiceId && args.status) {
      results = await ctx.db
        .query("claims")
        .withIndex("by_practice_status", (q: any) =>
          q
            .eq("orgId", orgId)
            .eq("practiceId", args.practiceId!)
            .eq("status", args.status!)
        )
        .collect();
    } else if (args.status) {
      results = await ctx.db
        .query("claims")
        .withIndex("by_status", (q: any) =>
          q.eq("orgId", orgId).eq("status", args.status!)
        )
        .collect();
    } else if (args.payerId) {
      results = await ctx.db
        .query("claims")
        .withIndex("by_payer", (q: any) =>
          q.eq("orgId", orgId).eq("payerId", args.payerId!)
        )
        .collect();
    } else if (args.ageBucket) {
      results = await ctx.db
        .query("claims")
        .withIndex("by_age_bucket", (q: any) =>
          q.eq("orgId", orgId).eq("ageBucket", args.ageBucket!)
        )
        .collect();
    } else {
      results = await ctx.db
        .query("claims")
        .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
        .collect();
    }

    // Apply remaining filters not covered by the chosen index
    const usedPayerIndex = !!args.payerId && !args.status && !args.practiceId && !args.ageBucket;
    const usedAgeBucketIndex = !!args.ageBucket && !args.status && !args.payerId && !args.practiceId;
    const usedStatusIndex = !!args.status;
    const usedPracticeStatusIndex = !!args.practiceId && !!args.status;

    if (args.payerId && !usedPayerIndex) {
      results = results.filter((c: any) => c.payerId === args.payerId);
    }
    if (args.ageBucket && !usedAgeBucketIndex) {
      results = results.filter((c: any) => c.ageBucket === args.ageBucket);
    }
    if (args.practiceId && !usedPracticeStatusIndex) {
      results = results.filter((c: any) => c.practiceId === args.practiceId);
    }

    // Sort by createdAt descending (most recent first)
    results.sort((a: any, b: any) => b.createdAt - a.createdAt);

    // Cursor-based pagination
    let startIdx = 0;
    if (args.cursor) {
      const cursorIdx = results.findIndex((c: any) => c._id === args.cursor);
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
      claims: page,
      nextCursor,
      totalCount: results.length,
    };
  },
});

/**
 * Get a single claim by ID with org check.
 */
export const getById = query({
  args: { claimId: v.id("claims") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const claim = await ctx.db.get(args.claimId);
    if (!claim || claim.orgId !== orgId) {
      throw new Error("Claim not found");
    }

    return claim;
  },
});

/**
 * Get all claims for a patient, ordered by createdAt descending.
 */
export const getByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const claims = await ctx.db
      .query("claims")
      .withIndex("by_patient", (q: any) =>
        q.eq("orgId", orgId).eq("patientId", args.patientId)
      )
      .collect();

    return claims.sort((a: any, b: any) => b.createdAt - a.createdAt);
  },
});

/**
 * Get scrub errors for a specific claim.
 */
export const getScrubErrors = query({
  args: { claimId: v.id("claims") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const claim = await ctx.db.get(args.claimId);
    if (!claim || claim.orgId !== orgId) {
      throw new Error("Claim not found");
    }

    return claim.scrubErrors ?? [];
  },
});

/**
 * Aggregate stats for the org:
 * - Count claims by status
 * - Clean claim rate (passed scrub on first try / total scrubbed)
 * - Average age of open claims (submitted but not yet paid/denied)
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);

    const allClaims = await ctx.db
      .query("claims")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    // Count by status
    const statusCounts: Record<string, number> = {};
    for (const claim of allClaims) {
      statusCounts[claim.status] = (statusCounts[claim.status] || 0) + 1;
    }

    // Clean claim rate: claims that went from draft/scrubbing -> ready on first
    // scrub (scrubPassedAt is set and no scrub_failed history). We approximate
    // this as claims with scrubPassedAt set and current status is NOT scrub_failed.
    // Claims that are currently scrub_failed had errors. Claims that passed have
    // scrubPassedAt set.
    const scrubbed = allClaims.filter(
      (c: any) => c.scrubPassedAt || c.status === "scrub_failed"
    );
    const passedFirstTime = allClaims.filter(
      (c: any) => c.scrubPassedAt && c.status !== "scrub_failed"
    );
    const cleanClaimRate =
      scrubbed.length > 0 ? passedFirstTime.length / scrubbed.length : 0;

    // Average age of open claims (submitted, accepted, rejected, appealed)
    const openStatuses = ["submitted", "accepted", "rejected", "appealed"];
    const openClaims = allClaims.filter((c: any) =>
      openStatuses.includes(c.status)
    );
    const now = Date.now();
    let avgAgeInDays = 0;
    if (openClaims.length > 0) {
      const totalAge = openClaims.reduce((sum: number, c: any) => {
        if (c.ageInDays != null) return sum + c.ageInDays;
        // Fall back to computing from submittedAt
        if (c.submittedAt) {
          return sum + Math.floor((now - c.submittedAt) / (1000 * 60 * 60 * 24));
        }
        return sum;
      }, 0);
      avgAgeInDays = Math.round(totalAge / openClaims.length);
    }

    return {
      totalClaims: allClaims.length,
      statusCounts,
      cleanClaimRate: Math.round(cleanClaimRate * 10000) / 100, // percentage with 2 decimals
      openClaimsCount: openClaims.length,
      avgAgeInDays,
    };
  },
});
