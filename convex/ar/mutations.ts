import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";
import { createAuditLog } from "../lib/audit";

/**
 * Compute follow-up priority based on claim age in days.
 */
function priorityFromAge(
  ageDays: number
): "low" | "medium" | "high" | "urgent" {
  if (ageDays > 90) return "urgent";
  if (ageDays > 60) return "high";
  if (ageDays > 30) return "medium";
  return "low";
}

/**
 * Create a follow-up task linked to a claim.
 *
 * Creates a task in the tasks table with resourceType="claim",
 * assignedRole="billing", and priority based on the claim age.
 */
export const createFollowUp = mutation({
  args: {
    claimId: v.id("claims"),
    actionType: v.union(
      v.literal("call"),
      v.literal("letter"),
      v.literal("note")
    ),
    notes: v.optional(v.string()),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const claim = await ctx.db.get(args.claimId);
    if (!claim || claim.orgId !== orgId) {
      throw new Error("Claim not found");
    }

    const now = Date.now();

    // Calculate age for priority
    const ageMs = claim.submittedAt ? now - claim.submittedAt : 0;
    const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
    const priority = priorityFromAge(ageDays);

    // Build task title
    const actionLabels = { call: "Call", letter: "Send letter to", note: "Note on" };
    const title = `${actionLabels[args.actionType]} payer re: claim ${claim.claimNumber ?? claim._id}`;

    // Create the task
    const taskId = await ctx.db.insert("tasks", {
      orgId,
      title,
      description:
        args.notes ??
        `Follow-up ${args.actionType} for claim ${claim.claimNumber ?? claim._id} (${claim.payerName}). Amount: $${claim.totalCharged.toFixed(2)}. Age: ${ageDays} days.`,
      resourceType: "claim",
      resourceId: claim._id,
      assignedRole: "billing",
      priority,
      status: "open",
      slaDeadline: args.dueDate ?? now + 2 * 24 * 60 * 60 * 1000, // default 2 days
      slaStatus: "on_track",
      createdAt: now,
      updatedAt: now,
    });

    return taskId;
  },
});

/**
 * Write off a claim.
 *
 * Sets adjustments = totalCharged (zeroes out the balance) and creates
 * an audit log entry for compliance.
 */
export const writeOff = mutation({
  args: {
    claimId: v.id("claims"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const claim = await ctx.db.get(args.claimId);
    if (!claim || claim.orgId !== orgId) {
      throw new Error("Claim not found");
    }

    const now = Date.now();

    // Write off: set adjustments to cover entire remaining balance
    const alreadyPaid = claim.totalPaid ?? 0;
    const existingAdj = claim.adjustments ?? 0;
    const remainingBalance = claim.totalCharged - alreadyPaid - existingAdj;
    const newAdjustments = existingAdj + remainingBalance;

    await ctx.db.patch(args.claimId, {
      adjustments: newAdjustments,
      updatedAt: now,
    });

    // Create audit log entry via the tamper-evident helper
    await createAuditLog(ctx, {
      action: "write_off",
      resourceType: "claim",
      resourceId: args.claimId,
      details: {
        claimNumber: claim.claimNumber,
        payerId: claim.payerId,
        payerName: claim.payerName,
        totalCharged: claim.totalCharged,
        previousAdjustments: existingAdj,
        writeOffAmount: remainingBalance,
        newAdjustments,
        reason: args.reason ?? "No reason provided",
      },
      phiAccessed: true,
    });

    return args.claimId;
  },
});

/**
 * Flag a payer behavior alert.
 *
 * Creates a warning notification for all billing/admin users when a payer
 * exhibits problematic patterns (slow payment, high denial rate).
 */
export const flagPayerAlert = mutation({
  args: {
    payerId: v.string(),
    payerName: v.string(),
    flags: v.array(v.string()), // e.g., ["slow", "high_denial"]
    avgDaysToPay: v.optional(v.number()),
    denialRate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const now = Date.now();

    // Build alert message from flags
    const details: string[] = [];
    if (args.flags.includes("slow") && args.avgDaysToPay != null) {
      details.push(`Avg ${args.avgDaysToPay} days to pay (threshold: 45)`);
    }
    if (args.flags.includes("high_denial") && args.denialRate != null) {
      details.push(`${args.denialRate}% denial rate (threshold: 10%)`);
    }

    const title = `Payer Alert: ${args.payerName}`;
    const message = `Payer ${args.payerName} flagged for: ${args.flags.join(", ")}. ${details.join(". ")}`;

    // Find all billing and admin users in this org to notify
    const users = await ctx.db
      .query("users")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const targetUsers = users.filter(
      (u: any) =>
        u.isActive &&
        (u.role === "billing" || u.role === "admin" || u.role === "office_manager")
    );

    const notificationIds: string[] = [];
    for (const user of targetUsers) {
      const notifId = await ctx.db.insert("notifications", {
        orgId,
        userId: user._id,
        title,
        message,
        type: "warning",
        resourceType: "payer",
        resourceId: args.payerId,
        isRead: false,
        createdAt: now,
      });
      notificationIds.push(notifId);
    }

    return { notificationCount: notificationIds.length, payerId: args.payerId };
  },
});
