import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";
import { MockAiAdapter } from "../integrations/ai/mock";
import { MockReviewsAdapter } from "../integrations/reviews/mock";

/**
 * Ingest a review (from Google fetch or manual entry).
 * Runs AI sentiment analysis. If rating <= 2, creates priority notification
 * for all office_manager users and a follow-up task.
 */
export const ingestReview = mutation({
  args: {
    practiceId: v.id("practices"),
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
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // Verify practice belongs to org
    const practice = await ctx.db.get(args.practiceId);
    if (!practice || practice.orgId !== orgId) {
      throw new Error("Practice not found");
    }

    // Check for duplicate by platformReviewId
    if (args.platformReviewId) {
      const existing = await ctx.db
        .query("reviews")
        .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
        .collect();
      const dupe = existing.find(
        (r: any) => r.externalReviewId === args.platformReviewId
      );
      if (dupe) {
        return dupe._id;
      }
    }

    // AI sentiment analysis
    let sentiment: "positive" | "neutral" | "negative" = "neutral";
    let sentimentKeywords: string[] = [];
    if (args.reviewText) {
      const ai = new MockAiAdapter();
      const analysis = await ai.analyzeText(args.reviewText, "sentiment");
      try {
        const parsed = JSON.parse(analysis.result);
        sentiment = parsed.sentiment ?? "neutral";
        sentimentKeywords = parsed.keywords ?? [];
      } catch {
        // fallback
      }
    }

    // Derive sentiment from rating if no text
    if (!args.reviewText) {
      if (args.rating >= 4) sentiment = "positive";
      else if (args.rating <= 2) sentiment = "negative";
      else sentiment = "neutral";
    }

    const now = Date.now();
    const isPriority = args.rating <= 2;

    const reviewId = await ctx.db.insert("reviews", {
      orgId,
      practiceId: args.practiceId,
      source: args.source,
      externalReviewId: args.platformReviewId,
      reviewerName: args.reviewerName,
      rating: args.rating,
      text: args.reviewText,
      publishedAt: args.reviewDate,
      sentiment,
      sentimentKeywords,
      responseStatus: "pending",
      isPriority,
      alertSentAt: isPriority ? now : undefined,
      createdAt: now,
      updatedAt: now,
    });

    // If rating <= 2: create notifications for office_managers and a task
    if (isPriority) {
      const managers = await ctx.db
        .query("users")
        .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
        .collect();

      const officeManagers = managers.filter(
        (u: any) => u.role === "office_manager" && u.isActive
      );

      for (const manager of officeManagers) {
        await ctx.db.insert("notifications", {
          orgId,
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

      // Create follow-up task
      await ctx.db.insert("tasks", {
        orgId,
        title: `Respond to ${args.rating}-star review from ${args.reviewerName}`,
        description: args.reviewText
          ? `Review text: "${args.reviewText.slice(0, 200)}${args.reviewText.length > 200 ? "..." : ""}"`
          : `${args.rating}-star review with no text. Respond promptly.`,
        resourceType: "review",
        resourceId: reviewId,
        assignedRole: "office_manager",
        priority: args.rating === 1 ? "urgent" : "high",
        status: "open",
        slaDeadline: now + 24 * 60 * 60 * 1000, // 24 hours
        slaStatus: "on_track",
        isEscalated: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Generate AI draft response
    if (args.reviewText) {
      const ai = new MockAiAdapter();
      const generated = await ai.generateResponse(
        "Generate a review response for this review",
        { rating: args.rating, reviewText: args.reviewText }
      );

      // PHI check on the draft
      const phiCheck = await ai.analyzeText(generated.text, "phi_check");
      const phiResult = JSON.parse(phiCheck.result);

      await ctx.db.insert("reviewResponses", {
        orgId,
        reviewId,
        draftContent: generated.text,
        aiGeneratedAt: now,
        aiGenerationTimeMs: 350, // mock timing
        phiCheckPassed: phiResult.safe,
        status: "draft",
        createdAt: now,
        updatedAt: now,
      });

      // Update review status to draft_ready
      await ctx.db.patch(reviewId, {
        responseStatus: "draft_ready",
        updatedAt: now,
      });
    }

    return reviewId;
  },
});

/**
 * Post a response to a review. Updates the review record and
 * calls the reviews adapter for Google reviews.
 */
export const postResponse = mutation({
  args: {
    reviewId: v.id("reviews"),
    responseText: v.string(),
    respondedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const review = await ctx.db.get(args.reviewId);
    if (!review || review.orgId !== orgId) {
      throw new Error("Review not found");
    }

    // Verify user belongs to org
    const user = await ctx.db.get(args.respondedBy);
    if (!user || user.orgId !== orgId) {
      throw new Error("User not found");
    }

    const now = Date.now();

    // Post to Google if external review
    if (review.source === "google" && review.externalReviewId) {
      const adapter = new MockReviewsAdapter();
      const result = await adapter.postResponse(
        review.externalReviewId,
        args.responseText
      );
      if (!result.success) {
        throw new Error(
          result.errorMessage ?? "Failed to post response to Google"
        );
      }
    }

    // Update review
    await ctx.db.patch(args.reviewId, {
      responseStatus: "posted",
      updatedAt: now,
    });

    // Update or create reviewResponse record
    const existingResponse = await ctx.db
      .query("reviewResponses")
      .withIndex("by_review", (q: any) =>
        q.eq("orgId", orgId).eq("reviewId", args.reviewId)
      )
      .first();

    if (existingResponse) {
      await ctx.db.patch(existingResponse._id, {
        editedContent: args.responseText,
        editedBy: args.respondedBy,
        editedAt: now,
        approvedBy: args.respondedBy,
        approvedAt: now,
        postedAt: now,
        status: "posted",
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("reviewResponses", {
        orgId,
        reviewId: args.reviewId,
        draftContent: args.responseText,
        approvedBy: args.respondedBy,
        approvedAt: now,
        postedAt: now,
        status: "posted",
        createdAt: now,
        updatedAt: now,
      });
    }

    // Complete any open tasks for this review
    const openTasks = await ctx.db
      .query("tasks")
      .withIndex("by_resource", (q: any) =>
        q
          .eq("orgId", orgId)
          .eq("resourceType", "review")
          .eq("resourceId", args.reviewId)
      )
      .collect();

    for (const task of openTasks) {
      if (task.status === "open" || task.status === "in_progress") {
        await ctx.db.patch(task._id, {
          status: "completed",
          completedBy: args.respondedBy,
          completedAt: now,
          updatedAt: now,
        });
      }
    }

    return args.reviewId;
  },
});
