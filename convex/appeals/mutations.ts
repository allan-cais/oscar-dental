import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId, getCurrentUser } from "../lib/auth";
import { MockAiAdapter } from "../integrations/ai/mock";

/**
 * Create a new appeal in draft status.
 */
export const create = mutation({
  args: {
    denialId: v.id("denials"),
    claimId: v.id("claims"),
    patientId: v.id("patients"),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // Verify denial belongs to org
    const denial = await ctx.db.get(args.denialId);
    if (!denial || denial.orgId !== orgId) {
      throw new Error("Denial not found");
    }

    // Verify claim belongs to org
    const claim = await ctx.db.get(args.claimId);
    if (!claim || claim.orgId !== orgId) {
      throw new Error("Claim not found");
    }

    // Verify patient belongs to org
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.orgId !== orgId) {
      throw new Error("Patient not found");
    }

    const now = Date.now();
    const appealId = await ctx.db.insert("appeals", {
      orgId,
      denialId: args.denialId,
      claimId: args.claimId,
      patientId: args.patientId,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });

    // Update denial status to "appealing"
    await ctx.db.patch(args.denialId, {
      status: "appealing",
      updatedAt: now,
    });

    return appealId;
  },
});

/**
 * Generate an appeal letter using AI.
 * Gathers denial + claim + patient + provider data and calls the AI mock adapter.
 */
export const generateLetter = mutation({
  args: { appealId: v.id("appeals") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const appeal = await ctx.db.get(args.appealId);
    if (!appeal || appeal.orgId !== orgId) {
      throw new Error("Appeal not found");
    }

    // Get denial
    const denial = await ctx.db.get(appeal.denialId);
    if (!denial) {
      throw new Error("Denial not found");
    }

    // Get claim
    const claim = await ctx.db.get(appeal.claimId);
    if (!claim) {
      throw new Error("Claim not found");
    }

    // Get patient
    const patient = await ctx.db.get(appeal.patientId);
    if (!patient) {
      throw new Error("Patient not found");
    }

    // Try to find the provider from the claim's appointment
    let providerName = "Provider";
    let providerNpi = "";
    if (claim.appointmentId) {
      const appointment = await ctx.db.get(claim.appointmentId);
      if (appointment?.providerId) {
        const provider = await ctx.db.get(appointment.providerId);
        if (provider) {
          providerName = `Dr. ${provider.firstName} ${provider.lastName}`;
          providerNpi = provider.npi ?? "";
        }
      }
    }

    // Get practice NPI as fallback
    if (!providerNpi && claim.practiceId) {
      const practice = await ctx.db.get(claim.practiceId);
      if (practice?.npi) {
        providerNpi = practice.npi;
      }
    }

    const ai = new MockAiAdapter();
    const startTime = Date.now();
    const result = await ai.generateAppealLetter(
      {
        reasonCode: denial.reasonCode,
        reasonDescription: denial.reasonDescription,
        category: denial.category ?? "other",
      },
      {
        patientName: `${patient.firstName} ${patient.lastName}`,
        dateOfService: denial.denialDate,
        procedures: (claim.procedures ?? []).map((p: any) => ({
          code: p.code,
          description: p.description,
        })),
        payerName: denial.payerName,
        providerName,
        providerNpi,
      }
    );
    const generationTimeMs = Date.now() - startTime;

    const now = Date.now();
    await ctx.db.patch(args.appealId, {
      letterContent: result.letter,
      aiGeneratedAt: now,
      aiGenerationTimeMs: generationTimeMs,
      updatedAt: now,
    });

    return {
      appealId: args.appealId,
      letterContent: result.letter,
      confidence: result.confidence,
      suggestedAttachments: result.suggestedAttachments,
      generationTimeMs,
    };
  },
});

/**
 * Update the appeal letter content (human edit).
 */
export const updateLetter = mutation({
  args: {
    appealId: v.id("appeals"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const appeal = await ctx.db.get(args.appealId);
    if (!appeal || appeal.orgId !== orgId) {
      throw new Error("Appeal not found");
    }

    const user = await getCurrentUser(ctx);
    const now = Date.now();

    await ctx.db.patch(args.appealId, {
      editedBy: user?._id,
      editedAt: now,
      updatedAt: now,
    });

    // Store edited content in a separate field — schema does not have editedContent,
    // but the letterContent field serves as the current content. We update letterContent
    // and track who edited it.
    await ctx.db.patch(args.appealId, {
      letterContent: args.content,
    });

    return args.appealId;
  },
});

/**
 * Submit an appeal. Validates that letter content exists.
 */
export const submit = mutation({
  args: { appealId: v.id("appeals") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const appeal = await ctx.db.get(args.appealId);
    if (!appeal || appeal.orgId !== orgId) {
      throw new Error("Appeal not found");
    }

    if (!appeal.letterContent) {
      throw new Error(
        "Cannot submit appeal without letter content. Generate or write a letter first."
      );
    }

    const user = await getCurrentUser(ctx);
    const now = Date.now();

    await ctx.db.patch(args.appealId, {
      status: "submitted",
      submittedAt: now,
      submittedBy: user?._id,
      updatedAt: now,
    });

    // Update denial status to "appealed"
    await ctx.db.patch(appeal.denialId, {
      status: "appealed",
      updatedAt: now,
    });

    // Update claim status to "appealed"
    await ctx.db.patch(appeal.claimId, {
      status: "appealed",
      updatedAt: now,
    });

    return args.appealId;
  },
});

/**
 * Record the outcome of an appeal. Updates both the appeal and parent denial.
 */
export const recordOutcome = mutation({
  args: {
    appealId: v.id("appeals"),
    outcome: v.union(
      v.literal("won"),
      v.literal("lost"),
      v.literal("partial")
    ),
    outcomeAmount: v.optional(v.number()),
    outcomeDate: v.optional(v.string()),
    outcomeNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const appeal = await ctx.db.get(args.appealId);
    if (!appeal || appeal.orgId !== orgId) {
      throw new Error("Appeal not found");
    }

    const now = Date.now();

    // Update appeal
    await ctx.db.patch(args.appealId, {
      status: args.outcome,
      outcomeAmount: args.outcomeAmount,
      outcomeDate: args.outcomeDate,
      outcomeNotes: args.outcomeNotes,
      updatedAt: now,
    });

    // Update parent denial status to match outcome
    await ctx.db.patch(appeal.denialId, {
      status: args.outcome,
      updatedAt: now,
    });

    return args.appealId;
  },
});
