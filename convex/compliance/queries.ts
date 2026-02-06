import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

// ---------------------------------------------------------------------------
// FTC incentive language patterns
// ---------------------------------------------------------------------------
const INCENTIVE_WORDS = [
  "discount", "free", "reward", "gift", "coupon", "prize", "raffle",
  "drawing", "enter to win", "giveaway", "sweepstakes", "bonus",
  "promotion", "promo", "deal", "offer", "percent off", "% off",
  "credit", "cashback", "cash back", "loyalty",
];

/**
 * Scan template text for FTC-violating incentive language.
 * Returns compliance status and list of violations.
 */
export const checkFtcCompliance = query({
  args: { templateText: v.string() },
  handler: async (ctx, args) => {
    await getOrgId(ctx); // auth check

    const lower = args.templateText.toLowerCase();
    const violations: string[] = [];

    for (const word of INCENTIVE_WORDS) {
      if (lower.includes(word)) {
        violations.push(`Contains incentive language: "${word}"`);
      }
    }

    return {
      compliant: violations.length === 0,
      violations,
    };
  },
});

/**
 * Check whether a patient is eligible to receive a review request.
 * Checks: recent complaint, recent request, opt-out status, negative sentiment.
 */
export const getRequestFilterStatus = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.orgId !== orgId) {
      throw new Error("Patient not found");
    }

    const reasons: string[] = [];
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Check 1: Recent complaint (task with resource type "review" or "patient"
    // that is a complaint, within 30 days)
    const recentTasks = await ctx.db
      .query("tasks")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const recentComplaints = recentTasks.filter(
      (t: any) =>
        t.createdAt >= thirtyDaysAgo &&
        (t.resourceType === "review" || t.resourceType === "patient") &&
        t.title?.toLowerCase().includes("complaint")
    );

    if (recentComplaints.length > 0) {
      reasons.push("Patient has a recent complaint (within 30 days)");
    }

    // Check 2: Recent review request (within 30 days)
    const recentRequests = await ctx.db
      .query("reviewRequests")
      .withIndex("by_patient", (q: any) =>
        q.eq("orgId", orgId).eq("patientId", args.patientId)
      )
      .collect();

    const recentSentRequests = recentRequests.filter(
      (r: any) => r.createdAt >= thirtyDaysAgo && r.status !== "filtered"
    );

    if (recentSentRequests.length > 0) {
      reasons.push("Review request already sent within last 30 days");
    }

    // Check 3: SMS opt-out status
    const consents = await ctx.db
      .query("communicationConsents")
      .withIndex("by_patient", (q: any) =>
        q.eq("orgId", orgId).eq("patientId", args.patientId)
      )
      .collect();

    const smsOptedOut = consents.some(
      (c: any) =>
        c.channel === "sms" &&
        !c.consented &&
        (c.messageType === "marketing" || c.messageType === "all")
    );

    if (smsOptedOut) {
      reasons.push("Patient has opted out of SMS marketing");
    }

    // Check 4: Negative sentiment on last visit review
    // Find the most recent review for this patient (if matched)
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const patientReviews = reviews
      .filter((r: any) => r.matchedPatientId === args.patientId)
      .sort((a: any, b: any) => b.publishedAt - a.publishedAt);

    if (patientReviews.length > 0) {
      const lastReview = patientReviews[0];
      if (lastReview.sentiment === "negative" || lastReview.rating <= 2) {
        reasons.push("Last review had negative sentiment");
      }
    }

    return {
      eligible: reasons.length === 0,
      reasons,
      patientId: args.patientId,
      patientName: `${patient.firstName} ${patient.lastName}`,
    };
  },
});
