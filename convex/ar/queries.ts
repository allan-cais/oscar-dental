import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

// Open claim statuses for A/R purposes
const AR_STATUSES = ["submitted", "accepted", "denied", "appealed"];

/**
 * Compute age bucket from submittedAt timestamp vs now.
 */
function computeAgeBucket(
  submittedAt: number,
  now: number
): "0-30" | "31-60" | "61-90" | "91-120" | "120+" {
  const days = Math.floor((now - submittedAt) / (1000 * 60 * 60 * 24));
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  if (days <= 120) return "91-120";
  return "120+";
}

/**
 * Compute age in days from submittedAt timestamp.
 */
function ageDays(submittedAt: number | undefined, now: number): number {
  if (!submittedAt) return 0;
  return Math.floor((now - submittedAt) / (1000 * 60 * 60 * 24));
}

/**
 * A/R Aging Report.
 *
 * Groups open claims (submitted/accepted/denied/appealed) into aging buckets.
 * Splits into insurance A/R (the totalCharged minus patientPortion) vs
 * patient A/R (patientPortion). Returns bucket breakdowns and totals.
 */
export const getAgingReport = query({
  args: {
    practiceId: v.optional(v.id("practices")),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const now = Date.now();

    // Fetch all claims for the org
    let claims;
    if (args.practiceId) {
      claims = await ctx.db
        .query("claims")
        .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
        .collect();
      claims = claims.filter((c: any) => c.practiceId === args.practiceId);
    } else {
      claims = await ctx.db
        .query("claims")
        .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
        .collect();
    }

    // Filter to open A/R statuses, exclude pre-determinations
    const arClaims = claims.filter(
      (c: any) => AR_STATUSES.includes(c.status) && !c.isPreDetermination
    );

    // Bucket definitions
    const bucketOrder = ["0-30", "31-60", "61-90", "91-120", "120+"] as const;
    type Bucket = (typeof bucketOrder)[number];

    const insuranceBuckets: Record<Bucket, { count: number; totalAmount: number }> = {
      "0-30": { count: 0, totalAmount: 0 },
      "31-60": { count: 0, totalAmount: 0 },
      "61-90": { count: 0, totalAmount: 0 },
      "91-120": { count: 0, totalAmount: 0 },
      "120+": { count: 0, totalAmount: 0 },
    };

    const patientBuckets: Record<Bucket, { count: number; totalAmount: number }> = {
      "0-30": { count: 0, totalAmount: 0 },
      "31-60": { count: 0, totalAmount: 0 },
      "61-90": { count: 0, totalAmount: 0 },
      "91-120": { count: 0, totalAmount: 0 },
      "120+": { count: 0, totalAmount: 0 },
    };

    let totalInsurance = 0;
    let totalPatient = 0;

    for (const claim of arClaims) {
      // Calculate bucket from submittedAt (fall back to stored ageBucket or createdAt)
      let bucket: Bucket;
      if (claim.submittedAt) {
        bucket = computeAgeBucket(claim.submittedAt, now);
      } else if (claim.ageBucket) {
        bucket = claim.ageBucket;
      } else {
        bucket = computeAgeBucket(claim.createdAt, now);
      }

      const patientPortion = claim.patientPortion ?? 0;
      const totalPaid = claim.totalPaid ?? 0;
      const adjustments = claim.adjustments ?? 0;
      // Insurance outstanding = totalCharged - patientPortion - totalPaid - adjustments
      const insuranceAmount = Math.max(
        0,
        claim.totalCharged - patientPortion - totalPaid - adjustments
      );

      // Insurance A/R
      if (insuranceAmount > 0) {
        insuranceBuckets[bucket].count += 1;
        insuranceBuckets[bucket].totalAmount += insuranceAmount;
        totalInsurance += insuranceAmount;
      }

      // Patient A/R
      if (patientPortion > 0) {
        patientBuckets[bucket].count += 1;
        patientBuckets[bucket].totalAmount += patientPortion;
        totalPatient += patientPortion;
      }
    }

    // Round amounts to 2 decimal places
    const round = (n: number) => Math.round(n * 100) / 100;

    const insuranceAging = bucketOrder.map((bucket) => ({
      bucket,
      count: insuranceBuckets[bucket].count,
      totalAmount: round(insuranceBuckets[bucket].totalAmount),
    }));

    const patientAging = bucketOrder.map((bucket) => ({
      bucket,
      count: patientBuckets[bucket].count,
      totalAmount: round(patientBuckets[bucket].totalAmount),
    }));

    return {
      insuranceAging,
      patientAging,
      totals: {
        insurance: round(totalInsurance),
        patient: round(totalPatient),
        total: round(totalInsurance + totalPatient),
      },
    };
  },
});

/**
 * AI-Prioritized A/R Worklist.
 *
 * Scores open claims using a deterministic algorithm based on:
 * - Age: older claims score higher (risk of timely filing)
 * - Amount: higher-value claims score higher
 * - Payer history: known slow/high-denial payers score lower probability
 * - Denial history: previously denied claims score lower probability
 *
 * Returns items sorted by collection priority score descending.
 */
export const getPrioritizedWorklist = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const limit = args.limit ?? 20;
    const now = Date.now();

    // Fetch all claims
    const allClaims = await ctx.db
      .query("claims")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    // Filter to open A/R statuses, exclude pre-determinations
    const openClaims = allClaims.filter(
      (c: any) => AR_STATUSES.includes(c.status) && !c.isPreDetermination
    );

    // Build payer stats for scoring (denial rate, avg pay time)
    const payerStats: Record<
      string,
      { total: number; denied: number; paidDays: number[]; }
    > = {};
    for (const c of allClaims) {
      if (c.isPreDetermination) continue;
      if (!payerStats[c.payerId]) {
        payerStats[c.payerId] = { total: 0, denied: 0, paidDays: [] };
      }
      payerStats[c.payerId].total += 1;
      if (c.status === "denied") {
        payerStats[c.payerId].denied += 1;
      }
      if (c.status === "paid" && c.submittedAt && c.paidAt) {
        const days = Math.floor(
          (c.paidAt - c.submittedAt) / (1000 * 60 * 60 * 24)
        );
        payerStats[c.payerId].paidDays.push(days);
      }
    }

    // Fetch denials to check claim denial history
    const denials = await ctx.db
      .query("denials")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();
    const deniedClaimIds = new Set(denials.map((d: any) => d.claimId));

    // Fetch patient names for display
    const patientIds = [...new Set(openClaims.map((c: any) => c.patientId))];
    const patients: Record<string, { firstName: string; lastName: string }> = {};
    for (const pid of patientIds) {
      const patient = await ctx.db.get(pid) as any;
      if (patient && patient.firstName) {
        patients[pid] = {
          firstName: patient.firstName,
          lastName: patient.lastName,
        };
      }
    }

    // Score each claim
    const scored = openClaims.map((claim: any) => {
      const age = ageDays(claim.submittedAt, now);
      const amount = claim.totalCharged;
      const rationale: string[] = [];
      let score = 50; // base score

      // Age factor: older claims need more urgent attention (max +30)
      if (age > 90) {
        score += 30;
        rationale.push(`Critical age (${age} days) - timely filing risk`);
      } else if (age > 60) {
        score += 20;
        rationale.push(`High age (${age} days) - approaching deadline`);
      } else if (age > 30) {
        score += 10;
        rationale.push(`Moderate age (${age} days)`);
      } else {
        rationale.push(`Recent claim (${age} days)`);
      }

      // Amount factor: higher value = higher priority (max +20)
      if (amount >= 2000) {
        score += 20;
        rationale.push(`High value ($${amount.toFixed(2)})`);
      } else if (amount >= 1000) {
        score += 15;
        rationale.push(`Moderate value ($${amount.toFixed(2)})`);
      } else if (amount >= 500) {
        score += 10;
        rationale.push(`Standard value ($${amount.toFixed(2)})`);
      } else {
        score += 5;
        rationale.push(`Low value ($${amount.toFixed(2)})`);
      }

      // Payer factor: slow/high-denial payers reduce collection probability
      const ps = payerStats[claim.payerId];
      if (ps && ps.total >= 3) {
        const denialRate = ps.denied / ps.total;
        const avgPayDays =
          ps.paidDays.length > 0
            ? ps.paidDays.reduce((a: number, b: number) => a + b, 0) /
              ps.paidDays.length
            : 0;

        if (denialRate > 0.15) {
          score -= 10;
          rationale.push(
            `Payer ${claim.payerName} high denial rate (${Math.round(denialRate * 100)}%)`
          );
        }
        if (avgPayDays > 45) {
          score -= 5;
          rationale.push(
            `Payer ${claim.payerName} slow payer (avg ${Math.round(avgPayDays)} days)`
          );
        }
      }

      // Denial history factor
      if (deniedClaimIds.has(claim._id) || claim.status === "denied") {
        score -= 10;
        rationale.push("Previously denied - lower collection probability");
      }

      // Status factor
      if (claim.status === "appealed") {
        score += 5;
        rationale.push("Appeal in progress - monitor closely");
      }

      // Clamp score 0-100
      score = Math.max(0, Math.min(100, score));

      const patient = patients[claim.patientId];
      const patientName = patient
        ? `${patient.lastName}, ${patient.firstName}`
        : "Unknown";

      return {
        claimId: claim._id,
        patientId: claim.patientId,
        patientName,
        payerName: claim.payerName,
        amount: claim.totalCharged,
        ageDays: age,
        score,
        rationale: rationale.join("; "),
      };
    });

    // Sort by score descending, then by age descending for tiebreaking
    scored.sort((a: any, b: any) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.ageDays - a.ageDays;
    });

    return scored.slice(0, limit);
  },
});

/**
 * Payer Behavior Analysis.
 *
 * Aggregates claims by payer to compute:
 * - Total claims, paid claims, avg days to pay
 * - Denial rate, appeal success rate
 * - Flags for slow payers (avgDays > 45) and high denial (denialRate > 10%)
 */
export const getPayerBehavior = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);

    const allClaims = await ctx.db
      .query("claims")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    // Exclude pre-determinations
    const claims = allClaims.filter((c: any) => !c.isPreDetermination);

    // Fetch appeals for success rate
    const allAppeals = await ctx.db
      .query("appeals")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    // Map appeal outcomes by claimId
    const appealsByClaimId: Record<string, Array<{ status: string }>> = {};
    for (const appeal of allAppeals) {
      if (!appealsByClaimId[appeal.claimId]) {
        appealsByClaimId[appeal.claimId] = [];
      }
      appealsByClaimId[appeal.claimId].push({ status: appeal.status });
    }

    // Aggregate by payer
    const payerMap: Record<
      string,
      {
        payerId: string;
        payerName: string;
        totalClaims: number;
        paidClaims: number;
        deniedClaims: number;
        appealedClaims: number;
        appealWins: number;
        payDays: number[];
        totalCharged: number;
        totalPaid: number;
      }
    > = {};

    for (const claim of claims) {
      if (!payerMap[claim.payerId]) {
        payerMap[claim.payerId] = {
          payerId: claim.payerId,
          payerName: claim.payerName,
          totalClaims: 0,
          paidClaims: 0,
          deniedClaims: 0,
          appealedClaims: 0,
          appealWins: 0,
          payDays: [],
          totalCharged: 0,
          totalPaid: 0,
        };
      }

      const payer = payerMap[claim.payerId];
      payer.totalClaims += 1;
      payer.totalCharged += claim.totalCharged;
      payer.totalPaid += claim.totalPaid ?? 0;

      if (claim.status === "paid") {
        payer.paidClaims += 1;
        if (claim.submittedAt && claim.paidAt) {
          const days = Math.floor(
            (claim.paidAt - claim.submittedAt) / (1000 * 60 * 60 * 24)
          );
          payer.payDays.push(days);
        }
      }

      if (claim.status === "denied") {
        payer.deniedClaims += 1;
      }

      // Check appeals for this claim
      const claimAppeals = appealsByClaimId[claim._id];
      if (claimAppeals && claimAppeals.length > 0) {
        payer.appealedClaims += 1;
        const won = claimAppeals.some(
          (a) => a.status === "won" || a.status === "partial"
        );
        if (won) {
          payer.appealWins += 1;
        }
      }
    }

    // Build result array
    const result = Object.values(payerMap).map((payer) => {
      const avgDaysToPay =
        payer.payDays.length > 0
          ? Math.round(
              payer.payDays.reduce((a, b) => a + b, 0) / payer.payDays.length
            )
          : null;

      const denialRate =
        payer.totalClaims > 0
          ? Math.round((payer.deniedClaims / payer.totalClaims) * 10000) / 100
          : 0;

      const appealSuccessRate =
        payer.appealedClaims > 0
          ? Math.round(
              (payer.appealWins / payer.appealedClaims) * 10000
            ) / 100
          : null;

      const flags: string[] = [];
      if (avgDaysToPay !== null && avgDaysToPay > 45) {
        flags.push("slow");
      }
      if (denialRate > 10) {
        flags.push("high_denial");
      }

      return {
        payerId: payer.payerId,
        payerName: payer.payerName,
        totalClaims: payer.totalClaims,
        paidClaims: payer.paidClaims,
        deniedClaims: payer.deniedClaims,
        avgDaysToPay,
        denialRate,
        appealedClaims: payer.appealedClaims,
        appealSuccessRate,
        totalCharged: Math.round(payer.totalCharged * 100) / 100,
        totalPaid: Math.round(payer.totalPaid * 100) / 100,
        flags,
      };
    });

    // Sort by total claims descending
    result.sort((a, b) => b.totalClaims - a.totalClaims);

    return result;
  },
});

/**
 * Get all open claims for a specific payer.
 */
export const getByPayer = query({
  args: {
    payerId: v.string(),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const claims = await ctx.db
      .query("claims")
      .withIndex("by_payer", (q: any) =>
        q.eq("orgId", orgId).eq("payerId", args.payerId)
      )
      .collect();

    // Filter to open A/R statuses, exclude pre-determinations
    const openClaims = claims.filter(
      (c: any) => AR_STATUSES.includes(c.status) && !c.isPreDetermination
    );

    // Sort by createdAt descending
    openClaims.sort((a: any, b: any) => b.createdAt - a.createdAt);

    return openClaims;
  },
});
