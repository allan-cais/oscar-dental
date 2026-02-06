import { internalAction, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { MockReviewsAdapter } from "../integrations/reviews/mock";
import { MockAiAdapter } from "../integrations/ai/mock";

/**
 * Fetch reviews from Google (and other platforms) for all practices.
 * Runs every 15 minutes via cron.
 *
 * For each practice:
 * 1. Calls MockReviewsAdapter.fetchReviews()
 * 2. Deduplicates against existing reviews by platformReviewId
 * 3. Ingests new reviews via internal mutation
 */
export const fetchReviews = internalAction({
  handler: async (ctx) => {
    const adapter = new MockReviewsAdapter();
    const ai = new MockAiAdapter();

    // Get all practices
    const practices: any[] = await ctx.runQuery(
      internal.reputation.actions._getAllPractices
    );

    let totalNew = 0;
    let totalSkipped = 0;

    for (const practice of practices) {
      try {
        const fetchedReviews = await adapter.fetchReviews();

        for (const fetched of fetchedReviews) {
          // Check if already in DB
          const existing = await ctx.runQuery(
            internal.reputation.actions._findByExternalId,
            {
              orgId: practice.orgId,
              externalReviewId: fetched.reviewId,
            }
          );

          if (existing) {
            totalSkipped++;
            continue;
          }

          // Run sentiment analysis on the review text
          let sentiment: "positive" | "neutral" | "negative" = "neutral";
          let sentimentKeywords: string[] = [];
          if (fetched.text) {
            const analysis = await ai.analyzeText(fetched.text, "sentiment");
            try {
              const parsed = JSON.parse(analysis.result);
              sentiment = parsed.sentiment ?? "neutral";
              sentimentKeywords = parsed.keywords ?? [];
            } catch {
              // fallback
            }
          }
          if (!fetched.text) {
            if (fetched.rating >= 4) sentiment = "positive";
            else if (fetched.rating <= 2) sentiment = "negative";
          }

          // Ingest via internal mutation
          await ctx.runMutation(
            internal.reputation.actions._ingestReviewInternal,
            {
              orgId: practice.orgId,
              practiceId: practice._id,
              source: fetched.source,
              reviewerName: fetched.reviewerName,
              rating: fetched.rating,
              reviewText: fetched.text,
              reviewDate: fetched.publishedAt,
              platformReviewId: fetched.reviewId,
              sentiment,
              sentimentKeywords,
            }
          );

          totalNew++;
        }
      } catch (error) {
        console.error(
          `Failed to fetch reviews for practice ${practice._id}:`,
          error
        );
      }
    }

    console.log(
      `Review fetch complete: ${totalNew} new, ${totalSkipped} skipped`
    );
    return { totalNew, totalSkipped };
  },
});

// ---------------------------------------------------------------------------
// Internal helper queries/mutations used by the action
// ---------------------------------------------------------------------------

/**
 * Get all practices across all orgs (for cron context).
 */
export const _getAllPractices = internalQuery({
  handler: async (ctx) => {
    const practices = await ctx.db.query("practices").collect();
    return practices.map((p: any) => ({
      _id: p._id,
      orgId: p.orgId,
      name: p.name,
    }));
  },
});

/**
 * Find a review by external ID within an org.
 */
export const _findByExternalId = internalQuery({
  args: {
    orgId: v.string(),
    externalReviewId: v.string(),
  },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_org", (q: any) => q.eq("orgId", args.orgId))
      .collect();

    return (
      reviews.find((r: any) => r.externalReviewId === args.externalReviewId) ??
      null
    );
  },
});

/**
 * Internal mutation to ingest a review from the cron action.
 * Separate from the user-facing mutation since crons don't have auth context.
 */
import { internalMutation } from "../_generated/server";

export const _ingestReviewInternal = internalMutation({
  args: {
    orgId: v.string(),
    practiceId: v.string(),
    source: v.union(
      v.literal("google"),
      v.literal("yelp"),
      v.literal("healthgrades"),
      v.literal("internal")
    ),
    reviewerName: v.string(),
    rating: v.number(),
    reviewText: v.optional(v.string()),
    reviewDate: v.number(),
    platformReviewId: v.optional(v.string()),
    sentiment: v.union(
      v.literal("positive"),
      v.literal("neutral"),
      v.literal("negative")
    ),
    sentimentKeywords: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const isPriority = args.rating <= 2;

    const reviewId = await ctx.db.insert("reviews", {
      orgId: args.orgId,
      practiceId: args.practiceId as any,
      source: args.source,
      externalReviewId: args.platformReviewId,
      reviewerName: args.reviewerName,
      rating: args.rating,
      text: args.reviewText,
      publishedAt: args.reviewDate,
      sentiment: args.sentiment,
      sentimentKeywords: args.sentimentKeywords,
      responseStatus: "pending",
      isPriority,
      alertSentAt: isPriority ? now : undefined,
      createdAt: now,
      updatedAt: now,
    });

    // Priority alerts for low-rated reviews
    if (isPriority) {
      const managers = await ctx.db
        .query("users")
        .filter((q: any) =>
          q.and(
            q.eq(q.field("orgId"), args.orgId),
            q.eq(q.field("role"), "office_manager"),
            q.eq(q.field("isActive"), true)
          )
        )
        .collect();

      for (const manager of managers) {
        await ctx.db.insert("notifications", {
          orgId: args.orgId,
          userId: manager._id,
          title: "Priority Review Alert",
          message: `${args.rating}-star review from ${args.reviewerName} on ${args.source}. Immediate response recommended.`,
          type: "action_required",
          resourceType: "review",
          resourceId: reviewId,
          isRead: false,
          createdAt: now,
        });
      }

      await ctx.db.insert("tasks", {
        orgId: args.orgId,
        title: `Respond to ${args.rating}-star review from ${args.reviewerName}`,
        description: args.reviewText
          ? `Review text: "${args.reviewText.slice(0, 200)}${args.reviewText.length > 200 ? "..." : ""}"`
          : `${args.rating}-star review with no text. Respond promptly.`,
        resourceType: "review",
        resourceId: reviewId,
        assignedRole: "office_manager",
        priority: args.rating === 1 ? "urgent" : "high",
        status: "open",
        slaDeadline: now + 24 * 60 * 60 * 1000,
        slaStatus: "on_track",
        isEscalated: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Generate AI draft response for reviews with text
    if (args.reviewText) {
      const ai = new MockAiAdapter();
      const generated = await ai.generateResponse(
        "Generate a review response for this review",
        { rating: args.rating, reviewText: args.reviewText }
      );

      const phiCheck = await ai.analyzeText(generated.text, "phi_check");
      const phiResult = JSON.parse(phiCheck.result);

      await ctx.db.insert("reviewResponses", {
        orgId: args.orgId,
        reviewId,
        draftContent: generated.text,
        aiGeneratedAt: now,
        aiGenerationTimeMs: 350,
        phiCheckPassed: phiResult.safe,
        status: "draft",
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.patch(reviewId, {
        responseStatus: "draft_ready",
        updatedAt: now,
      });
    }

    return reviewId;
  },
});
