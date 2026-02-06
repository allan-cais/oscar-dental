import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";
import { MockAiAdapter } from "../integrations/ai/mock";

/**
 * Create a new denial record. Auto-categorizes using AI mock and sets SLA deadline.
 */
export const create = mutation({
  args: {
    claimId: v.id("claims"),
    patientId: v.id("patients"),
    payerId: v.string(),
    payerName: v.string(),
    denialDate: v.string(),
    reasonCode: v.string(),
    reasonDescription: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

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

    // Get procedure codes from the claim for AI categorization
    const procedureCodes = (claim.procedures ?? []).map(
      (p: any) => p.code as string
    );

    // AI categorization (mock adapter - methods return synchronously from mock)
    const ai = new MockAiAdapter();
    const categorization = await ai.categorizeDenial({
      reasonCode: args.reasonCode,
      reasonDescription: args.reasonDescription,
      procedureCodes,
      payerName: args.payerName,
      amount: args.amount,
    });

    const now = Date.now();
    const slaDeadline = now + 24 * 60 * 60 * 1000; // 24 hours from now

    const denialId = await ctx.db.insert("denials", {
      orgId,
      claimId: args.claimId,
      patientId: args.patientId,
      payerId: args.payerId,
      payerName: args.payerName,
      denialDate: args.denialDate,
      reasonCode: args.reasonCode,
      reasonDescription: args.reasonDescription,
      amount: args.amount,
      status: "new",
      category: categorization.category,
      aiCategorization: categorization.reasoning,
      aiConfidence: categorization.confidence,
      slaDeadline,
      isEscalated: false,
      createdAt: now,
      updatedAt: now,
    });

    // Update claim status to "denied"
    await ctx.db.patch(args.claimId, {
      status: "denied",
      updatedAt: now,
    });

    return denialId;
  },
});

/**
 * Acknowledge a denial. Sets status to "acknowledged".
 */
export const acknowledge = mutation({
  args: { denialId: v.id("denials") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const denial = await ctx.db.get(args.denialId);
    if (!denial || denial.orgId !== orgId) {
      throw new Error("Denial not found");
    }

    const now = Date.now();
    await ctx.db.patch(args.denialId, {
      status: "acknowledged",
      acknowledgedAt: now,
      updatedAt: now,
    });

    return args.denialId;
  },
});

/**
 * Generic status update for a denial.
 */
export const updateStatus = mutation({
  args: {
    denialId: v.id("denials"),
    status: v.union(
      v.literal("new"),
      v.literal("acknowledged"),
      v.literal("appealing"),
      v.literal("appealed"),
      v.literal("won"),
      v.literal("lost"),
      v.literal("partial"),
      v.literal("written_off")
    ),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const denial = await ctx.db.get(args.denialId);
    if (!denial || denial.orgId !== orgId) {
      throw new Error("Denial not found");
    }

    await ctx.db.patch(args.denialId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return args.denialId;
  },
});

/**
 * Escalate a denial. Creates notifications for office_manager users.
 */
export const escalate = mutation({
  args: { denialId: v.id("denials") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const denial = await ctx.db.get(args.denialId);
    if (!denial || denial.orgId !== orgId) {
      throw new Error("Denial not found");
    }

    const now = Date.now();
    await ctx.db.patch(args.denialId, {
      isEscalated: true,
      escalatedAt: now,
      updatedAt: now,
    });

    // Notify all office_manager users in the org
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
        title: "Denial Escalated",
        message: `Denial for claim has been escalated. Reason: ${denial.reasonCode} - ${denial.reasonDescription}. Amount: $${denial.amount.toFixed(2)}.`,
        type: "action_required",
        resourceType: "denial",
        resourceId: args.denialId,
        isRead: false,
        createdAt: now,
      });
    }

    return args.denialId;
  },
});

/**
 * Assign a denial to a user.
 */
export const assignTo = mutation({
  args: {
    denialId: v.id("denials"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const denial = await ctx.db.get(args.denialId);
    if (!denial || denial.orgId !== orgId) {
      throw new Error("Denial not found");
    }

    // Verify user belongs to org
    const user = await ctx.db.get(args.userId);
    if (!user || user.orgId !== orgId) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.denialId, {
      assignedTo: args.userId,
      updatedAt: Date.now(),
    });

    return args.denialId;
  },
});

/**
 * Internal mutation used by the SLA cron to escalate overdue new denials.
 */
export const escalateOverdue = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Query all denials with status "new"
    // We cannot filter by orgId in a cron (runs system-wide), so query all new denials
    const newDenials = await ctx.db
      .query("denials")
      .filter((q: any) => q.eq(q.field("status"), "new"))
      .collect();

    let escalatedCount = 0;
    for (const denial of newDenials) {
      if (denial.slaDeadline && denial.slaDeadline < now && !denial.isEscalated) {
        await ctx.db.patch(denial._id, {
          isEscalated: true,
          updatedAt: now,
        });
        escalatedCount++;
      }
    }

    return { escalatedCount };
  },
});
