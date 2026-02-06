import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId, getCurrentUser } from "../lib/auth";
import { getAdapter } from "../integrations/factory";

// ---------------------------------------------------------------------------
// PHI detection patterns
// ---------------------------------------------------------------------------
const PHI_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN
  /\b\d{2}\/\d{2}\/\d{4}\b/, // DOB mm/dd/yyyy
  /\b\d{4}-\d{2}-\d{2}\b/, // DOB yyyy-mm-dd
  /\bSSN\b/i,
  /\bDOB\b/i,
  /\bdate\s+of\s+birth\b/i,
  /\bmember\s*id\b/i,
  /\bpolicy\s*number\b/i,
  /\binsurance\s*id\b/i,
];

// Dental treatment terms that could reveal PHI in a public response
const TREATMENT_TERMS = [
  /\broot\s+canal\b/i,
  /\bextraction\b/i,
  /\bcrown\b/i,
  /\bfilling\b/i,
  /\bimplant\b/i,
  /\bdenture\b/i,
  /\bperiodontal\b/i,
  /\bdiagnos/i,
  /\bprescri/i,
  /\bmedication\b/i,
];

/**
 * Check text for PHI content.
 * Returns { safe: boolean, violations: string[] }
 */
function checkForPhi(
  text: string,
  patientNames?: string[]
): { safe: boolean; violations: string[] } {
  const violations: string[] = [];

  // Check PHI patterns
  for (const pattern of PHI_PATTERNS) {
    if (pattern.test(text)) {
      violations.push(`Contains potential PHI: ${pattern.source}`);
    }
  }

  // Check for treatment details (shouldn't be in public responses)
  for (const pattern of TREATMENT_TERMS) {
    if (pattern.test(text)) {
      violations.push(`Contains treatment detail: ${pattern.source}`);
    }
  }

  // Check for patient names if provided
  if (patientNames) {
    for (const name of patientNames) {
      if (name && text.toLowerCase().includes(name.toLowerCase())) {
        violations.push(`Contains patient name: ${name}`);
      }
    }
  }

  return { safe: violations.length === 0, violations };
}

/**
 * Generate an AI draft response for a review.
 * Calls MockAiAdapter, runs PHI check, stores as draft.
 */
export const generateDraft = mutation({
  args: { reviewId: v.id("reviews") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const review = await ctx.db.get(args.reviewId);
    if (!review || review.orgId !== orgId) {
      throw new Error("Review not found");
    }

    // Check if a draft already exists
    const existing = await ctx.db
      .query("reviewResponses")
      .withIndex("by_review", (q: any) =>
        q.eq("orgId", orgId).eq("reviewId", args.reviewId)
      )
      .first();

    if (existing && existing.status === "draft") {
      return { responseId: existing._id, status: "already_exists" };
    }

    const startTime = Date.now();

    // Generate response via AI adapter
    const aiAdapter = getAdapter("ai");
    const result = await aiAdapter.generateResponse(
      "Generate a professional review response for a dental practice",
      {
        rating: review.rating,
        reviewText: review.text ?? "",
        sentiment: review.sentiment ?? "neutral",
      }
    );

    const generationTimeMs = Date.now() - startTime;

    // Run PHI check on the generated response
    const phiCheck = checkForPhi(result.text);

    if (!phiCheck.safe) {
      // PHI detected — still store but mark as failed
      const responseId = await ctx.db.insert("reviewResponses", {
        orgId,
        reviewId: args.reviewId,
        draftContent: result.text,
        aiGeneratedAt: Date.now(),
        aiGenerationTimeMs: generationTimeMs,
        phiCheckPassed: false,
        status: "rejected",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      return {
        responseId,
        status: "phi_rejected",
        violations: phiCheck.violations,
      };
    }

    // Store draft
    const responseId = await ctx.db.insert("reviewResponses", {
      orgId,
      reviewId: args.reviewId,
      draftContent: result.text,
      aiGeneratedAt: Date.now(),
      aiGenerationTimeMs: generationTimeMs,
      phiCheckPassed: true,
      status: "draft",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update review status
    await ctx.db.patch(review._id, {
      responseStatus: "draft_ready",
      updatedAt: Date.now(),
    });

    return {
      responseId,
      status: "draft_created",
      generationTimeMs,
    };
  },
});

/**
 * Approve a response draft. Staff has reviewed and approved.
 */
export const approve = mutation({
  args: { responseId: v.id("reviewResponses") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const user = await getCurrentUser(ctx);

    const response = await ctx.db.get(args.responseId);
    if (!response || response.orgId !== orgId) {
      throw new Error("Response not found");
    }

    if (response.status !== "draft" && response.status !== "edited") {
      throw new Error(`Cannot approve response with status "${response.status}"`);
    }

    await ctx.db.patch(args.responseId, {
      status: "approved",
      approvedBy: user?._id,
      approvedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update review status
    await ctx.db.patch(response.reviewId, {
      responseStatus: "approved",
      updatedAt: Date.now(),
    });

    return { status: "approved" };
  },
});

/**
 * Edit a response draft. Re-runs PHI check on edited text.
 */
export const edit = mutation({
  args: {
    responseId: v.id("reviewResponses"),
    editedText: v.string(),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const user = await getCurrentUser(ctx);

    const response = await ctx.db.get(args.responseId);
    if (!response || response.orgId !== orgId) {
      throw new Error("Response not found");
    }

    if (response.status === "posted") {
      throw new Error("Cannot edit a posted response");
    }

    // Re-run PHI check on edited text
    const phiCheck = checkForPhi(args.editedText);

    if (!phiCheck.safe) {
      return {
        status: "phi_rejected",
        violations: phiCheck.violations,
      };
    }

    await ctx.db.patch(args.responseId, {
      editedContent: args.editedText,
      editedBy: user?._id,
      editedAt: Date.now(),
      phiCheckPassed: true,
      status: "edited",
      updatedAt: Date.now(),
    });

    return { status: "edited" };
  },
});

/**
 * Post a response to Google via the reviews adapter.
 * Sets status="posted" and links back to review.
 */
export const post = mutation({
  args: { responseId: v.id("reviewResponses") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const response = await ctx.db.get(args.responseId);
    if (!response || response.orgId !== orgId) {
      throw new Error("Response not found");
    }

    if (response.status !== "approved") {
      throw new Error("Response must be approved before posting");
    }

    const review = await ctx.db.get(response.reviewId);
    if (!review || review.orgId !== orgId) {
      throw new Error("Linked review not found");
    }

    // Use edited content if available, otherwise draft
    const contentToPost = response.editedContent ?? response.draftContent;

    // Post via reviews adapter
    const reviewsAdapter = getAdapter("reviews");
    const postResult = await reviewsAdapter.postResponse(
      review.externalReviewId ?? review._id,
      contentToPost
    );

    if (!postResult.success) {
      throw new Error(postResult.errorMessage ?? "Failed to post response");
    }

    await ctx.db.patch(args.responseId, {
      status: "posted",
      postedAt: postResult.postedAt ?? Date.now(),
      updatedAt: Date.now(),
    });

    // Update review status
    await ctx.db.patch(review._id, {
      responseStatus: "posted",
      updatedAt: Date.now(),
    });

    return { status: "posted", postedAt: postResult.postedAt };
  },
});

/**
 * Reject a response draft with a reason.
 */
export const reject = mutation({
  args: {
    responseId: v.id("reviewResponses"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const response = await ctx.db.get(args.responseId);
    if (!response || response.orgId !== orgId) {
      throw new Error("Response not found");
    }

    if (response.status === "posted") {
      throw new Error("Cannot reject a posted response");
    }

    await ctx.db.patch(args.responseId, {
      status: "rejected",
      updatedAt: Date.now(),
    });

    return { status: "rejected" };
  },
});
