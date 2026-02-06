import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

// ---------------------------------------------------------------------------
// Stop words to filter from keyword extraction
// ---------------------------------------------------------------------------
const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "it", "was", "are", "were", "be",
  "been", "has", "have", "had", "do", "did", "not", "no", "so", "if",
  "my", "i", "me", "we", "our", "you", "your", "they", "them", "their",
  "he", "she", "his", "her", "this", "that", "these", "those", "its",
  "all", "can", "will", "just", "would", "could", "should", "about",
  "up", "out", "very", "more", "also", "than", "then", "into", "over",
  "only", "after", "before", "some", "what", "which", "when", "where",
  "how", "who", "get", "got", "did", "does", "am", "as", "there",
]);

// Positive / negative keyword lists for deterministic analysis
const POSITIVE_WORDS = [
  "great", "excellent", "wonderful", "best", "love", "amazing", "fantastic",
  "recommend", "friendly", "gentle", "painless", "professional", "clean",
  "thorough", "kind", "patient", "comfortable", "modern", "quick", "easy",
  "smooth", "caring", "grateful", "seamless", "terrific", "nice",
];

const NEGATIVE_WORDS = [
  "terrible", "worst", "horrible", "rude", "waited", "pain", "billing",
  "charge", "refund", "frustrated", "disappointed", "confusing", "rushed",
  "surprise", "frustrating", "long", "slow", "unprofessional",
];

/**
 * Analyze a single review deterministically.
 * Sentiment from rating + keyword matching, keywords from text.
 */
export const analyzeReview = query({
  args: { reviewId: v.id("reviews") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const review = await ctx.db.get(args.reviewId);
    if (!review || review.orgId !== orgId) {
      throw new Error("Review not found");
    }

    // Determine sentiment from rating
    let sentiment: "positive" | "neutral" | "negative";
    if (review.rating >= 4) sentiment = "positive";
    else if (review.rating === 3) sentiment = "neutral";
    else sentiment = "negative";

    // Score: map 1-5 rating to 0-100
    const score = Math.round(((review.rating - 1) / 4) * 100);

    // Extract keywords from review text
    const keywords: string[] = [];
    if (review.text) {
      const lower = review.text.toLowerCase();
      const words = lower.replace(/[^a-z\s]/g, "").split(/\s+/);
      const uniqueWords = [...new Set(words)];

      for (const word of uniqueWords) {
        if (word.length < 3) continue;
        if (STOP_WORDS.has(word)) continue;
        if (POSITIVE_WORDS.includes(word) || NEGATIVE_WORDS.includes(word)) {
          keywords.push(word);
        }
      }
    }

    // Build summary
    const summary =
      review.text && review.text.length > 120
        ? review.text.slice(0, 120) + "..."
        : review.text ?? "";

    return {
      reviewId: args.reviewId,
      sentiment,
      score,
      keywords,
      summary,
      rating: review.rating,
      reviewerName: review.reviewerName,
    };
  },
});

/**
 * Aggregate sentiment trends over time.
 * Returns monthly breakdown of positive/neutral/negative counts + average score.
 */
export const getTrends = query({
  args: {
    months: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const months = args.months ?? 6;

    const allReviews = await ctx.db
      .query("reviews")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    // Calculate cutoff date
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - months);
    const cutoffTs = cutoff.getTime();

    // Filter to date range
    const filtered = allReviews.filter(
      (r: any) => r.publishedAt >= cutoffTs
    );

    // Group by month
    const monthlyBuckets: Record<
      string,
      { positive: number; neutral: number; negative: number; totalScore: number; count: number }
    > = {};

    for (const review of filtered) {
      const date = new Date(review.publishedAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!monthlyBuckets[key]) {
        monthlyBuckets[key] = { positive: 0, neutral: 0, negative: 0, totalScore: 0, count: 0 };
      }

      const bucket = monthlyBuckets[key];
      const score = Math.round(((review.rating - 1) / 4) * 100);
      bucket.totalScore += score;
      bucket.count += 1;

      // Use stored sentiment if available, otherwise derive from rating
      const sentiment =
        review.sentiment ??
        (review.rating >= 4 ? "positive" : review.rating === 3 ? "neutral" : "negative");

      if (sentiment === "positive") bucket.positive++;
      else if (sentiment === "negative") bucket.negative++;
      else bucket.neutral++;
    }

    // Convert to sorted array
    const trends = Object.entries(monthlyBuckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        positive: data.positive,
        neutral: data.neutral,
        negative: data.negative,
        avgScore: data.count > 0 ? Math.round(data.totalScore / data.count) : 0,
        total: data.count,
      }));

    return {
      months,
      trends,
      totalReviews: filtered.length,
    };
  },
});

/**
 * Extract top keywords from all reviews with frequency counts.
 * Groups keywords by sentiment association.
 */
export const getKeywordCloud = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);

    const allReviews = await ctx.db
      .query("reviews")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    // Frequency counters
    const positiveFreq: Record<string, number> = {};
    const negativeFreq: Record<string, number> = {};
    const neutralFreq: Record<string, number> = {};

    for (const review of allReviews) {
      if (!review.text) continue;

      const lower = review.text.toLowerCase();
      const words = lower.replace(/[^a-z\s]/g, "").split(/\s+/);
      const uniqueWords = [...new Set(words)];

      for (const word of uniqueWords) {
        if (word.length < 3) continue;
        if (STOP_WORDS.has(word)) continue;

        if (POSITIVE_WORDS.includes(word)) {
          positiveFreq[word] = (positiveFreq[word] || 0) + 1;
        } else if (NEGATIVE_WORDS.includes(word)) {
          negativeFreq[word] = (negativeFreq[word] || 0) + 1;
        } else {
          neutralFreq[word] = (neutralFreq[word] || 0) + 1;
        }
      }
    }

    // Sort and take top entries
    const sortByFreq = (freq: Record<string, number>, limit: number) =>
      Object.entries(freq)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([keyword, count]) => ({ keyword, count }));

    return {
      positive: sortByFreq(positiveFreq, 20),
      negative: sortByFreq(negativeFreq, 20),
      neutral: sortByFreq(neutralFreq, 20),
      totalReviewsAnalyzed: allReviews.filter((r: any) => r.text).length,
    };
  },
});
