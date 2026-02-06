import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

// ---------------------------------------------------------------------------
// Stop words for keyword extraction
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

/**
 * Extract keywords from review text using word frequency.
 * Filters stop words and short words.
 */
function extractKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  const words = lower.replace(/[^a-z\s]/g, "").split(/\s+/);
  const freq: Record<string, number> = {};

  for (const word of words) {
    if (word.length < 3) continue;
    if (STOP_WORDS.has(word)) continue;
    freq[word] = (freq[word] || 0) + 1;
  }

  // Return top 10 keywords by frequency
  return Object.entries(freq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * Analyze all un-analyzed reviews in the org.
 * Determines sentiment from rating, extracts keywords, stores results on review record.
 */
export const analyzeBatch = mutation({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);

    const allReviews = await ctx.db
      .query("reviews")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    // Filter to reviews without a sentiment field
    const unanalyzed = allReviews.filter((r: any) => !r.sentiment);

    let analyzedCount = 0;

    for (const review of unanalyzed) {
      // Determine sentiment from rating
      let sentiment: "positive" | "neutral" | "negative";
      if (review.rating >= 4) sentiment = "positive";
      else if (review.rating === 3) sentiment = "neutral";
      else sentiment = "negative";

      // Extract keywords from text
      const keywords = review.text ? extractKeywords(review.text) : [];

      // Update the review record
      await ctx.db.patch(review._id, {
        sentiment,
        sentimentKeywords: keywords,
        updatedAt: Date.now(),
      });

      analyzedCount++;
    }

    return {
      analyzedCount,
      totalReviews: allReviews.length,
      alreadyAnalyzed: allReviews.length - unanalyzed.length,
    };
  },
});

/**
 * Attempt to match a review's reviewerName to a patient in the org.
 * Uses firstName + lastName fuzzy matching.
 * If match found, links patientId to the review.
 * If no match, flags for manual review by creating a task.
 */
export const matchReviewerToPatient = mutation({
  args: { reviewId: v.id("reviews") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const review = await ctx.db.get(args.reviewId);
    if (!review || review.orgId !== orgId) {
      throw new Error("Review not found");
    }

    if (!review.reviewerName) {
      return { matched: false, reason: "No reviewer name on record" };
    }

    // Already matched
    if (review.matchedPatientId) {
      return { matched: true, patientId: review.matchedPatientId, reason: "Already matched" };
    }

    // Parse reviewer name — handle "FirstName LastInitial." pattern
    const nameParts = review.reviewerName.trim().replace(/\.$/, "").split(/\s+/);
    if (nameParts.length < 2) {
      return { matched: false, reason: "Could not parse first and last name" };
    }

    const reviewerFirst = nameParts[0].toLowerCase();
    const reviewerLast = nameParts[nameParts.length - 1].toLowerCase();

    // Search patients by last name using the by_name index
    // Since reviewer might use initial (e.g. "S"), do a prefix match
    const patients = await ctx.db
      .query("patients")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    // Find matches
    const matches = patients.filter((p: any) => {
      const pFirst = p.firstName.toLowerCase();
      const pLast = p.lastName.toLowerCase();

      // Exact first name match
      const firstMatch = pFirst === reviewerFirst;

      // Last name: exact match or reviewer used initial only
      const lastMatch =
        pLast === reviewerLast ||
        (reviewerLast.length === 1 && pLast.startsWith(reviewerLast));

      return firstMatch && lastMatch;
    });

    if (matches.length === 1) {
      // Single match — link
      await ctx.db.patch(review._id, {
        matchedPatientId: matches[0]._id,
        updatedAt: Date.now(),
      });

      return {
        matched: true,
        patientId: matches[0]._id,
        patientName: `${matches[0].firstName} ${matches[0].lastName}`,
        reason: "Single match found",
      };
    }

    if (matches.length > 1) {
      // Ambiguous — flag for manual review
      await ctx.db.insert("tasks", {
        orgId,
        title: `Match reviewer "${review.reviewerName}" to patient`,
        description: `Review from ${review.reviewerName} (rating: ${review.rating}) has ${matches.length} possible patient matches. Manual resolution required.`,
        resourceType: "review",
        resourceId: review._id,
        assignedRole: "front_desk",
        priority: "low",
        status: "open",
        dedupeKey: `review-match-${review._id}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      return {
        matched: false,
        reason: `${matches.length} ambiguous matches found — task created for manual resolution`,
        candidateCount: matches.length,
      };
    }

    // No match
    return {
      matched: false,
      reason: "No matching patient found",
    };
  },
});
