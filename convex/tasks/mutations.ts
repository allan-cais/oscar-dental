import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId, getCurrentUser } from "../lib/auth";

/**
 * Assign a task to the current user.
 */
export const assignToMe = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const user = await getCurrentUser(ctx);

    const task = await ctx.db.get(args.taskId);
    if (!task || (task as any).orgId !== orgId) {
      throw new Error("Task not found");
    }

    await ctx.db.patch(args.taskId, {
      assignedTo: user?._id,
      status: "in_progress" as any,
      updatedAt: Date.now(),
    } as any);

    return args.taskId;
  },
});

/**
 * Escalate a task — marks it as escalated and bumps priority.
 */
export const escalate = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task || (task as any).orgId !== orgId) {
      throw new Error("Task not found");
    }

    // Bump priority one level
    const priorityEscalation: Record<string, string> = {
      low: "medium",
      medium: "high",
      high: "urgent",
      urgent: "urgent",
    };

    await ctx.db.patch(args.taskId, {
      isEscalated: true,
      escalatedAt: Date.now(),
      priority: priorityEscalation[(task as any).priority] ?? "urgent",
      updatedAt: Date.now(),
    } as any);

    return args.taskId;
  },
});

/**
 * Complete a task.
 */
export const complete = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const user = await getCurrentUser(ctx);

    const task = await ctx.db.get(args.taskId);
    if (!task || (task as any).orgId !== orgId) {
      throw new Error("Task not found");
    }

    const now = Date.now();
    await ctx.db.patch(args.taskId, {
      status: "completed" as any,
      completedBy: user?._id,
      completedAt: now,
      updatedAt: now,
    } as any);

    return args.taskId;
  },
});

/**
 * Update task status (open → in_progress, etc.)
 */
export const updateStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task || (task as any).orgId !== orgId) {
      throw new Error("Task not found");
    }

    const patch: Record<string, any> = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.status === "completed") {
      const user = await getCurrentUser(ctx);
      patch.completedBy = user?._id;
      patch.completedAt = Date.now();
    }

    await ctx.db.patch(args.taskId, patch as any);
    return args.taskId;
  },
});

/**
 * Create a new task (for manual task creation).
 */
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    resourceType: v.optional(
      v.union(
        v.literal("claim"),
        v.literal("denial"),
        v.literal("review"),
        v.literal("payment"),
        v.literal("patient"),
        v.literal("appointment"),
        v.literal("collection"),
        v.literal("recall"),
        v.literal("eligibility"),
        v.literal("general")
      )
    ),
    assignedRole: v.optional(
      v.union(
        v.literal("front_desk"),
        v.literal("billing"),
        v.literal("clinical"),
        v.literal("office_manager"),
        v.literal("admin")
      )
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
    slaHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const now = Date.now();
    const slaHours = args.slaHours ?? 4;

    const taskId = await ctx.db.insert("tasks", {
      orgId,
      title: args.title,
      description: args.description,
      resourceType: args.resourceType,
      assignedRole: args.assignedRole,
      priority: args.priority,
      status: "open",
      slaDeadline: now + slaHours * 60 * 60 * 1000,
      slaStatus: "on_track",
      createdAt: now,
      updatedAt: now,
    });

    return taskId;
  },
});

// ---------------------------------------------------------------------------
// Seed tasks (internal — callable from CLI or scheduler, no auth required)
// ---------------------------------------------------------------------------

const TASK_TEMPLATES = [
  { title: "Follow up on unpaid claim >30 days", description: "Contact payer for claim status update. Check for any missing information.", resourceType: "claim" as const, assignedRole: "billing" as const, priority: "high" as const },
  { title: "Review denied claim - coding error", description: "Review denial reason code and determine if corrected claim can be resubmitted.", resourceType: "denial" as const, assignedRole: "billing" as const, priority: "high" as const },
  { title: "Respond to negative Google review", description: "Draft a professional response to the patient review. Do not include PHI.", resourceType: "review" as const, assignedRole: "office_manager" as const, priority: "urgent" as const },
  { title: "Patient callback - billing question", description: "Patient called with questions about their statement. Return call within 4 hours.", resourceType: "patient" as const, assignedRole: "front_desk" as const, priority: "medium" as const },
  { title: "Verify eligibility for tomorrow's patients", description: "Run batch eligibility verification for all patients with appointments tomorrow.", resourceType: "eligibility" as const, assignedRole: "front_desk" as const, priority: "medium" as const },
  { title: "Appeal denied claim - documentation missing", description: "Gather required documentation (radiographs, perio charting) and submit appeal.", resourceType: "denial" as const, assignedRole: "billing" as const, priority: "high" as const },
  { title: "Follow up on claim appeal", description: "Check status of previously submitted appeal. Escalate if no response in 30 days.", resourceType: "claim" as const, assignedRole: "billing" as const, priority: "medium" as const },
  { title: "Patient balance >$500 - contact for payment", description: "Reach out to patient about outstanding balance. Offer payment plan options.", resourceType: "patient" as const, assignedRole: "front_desk" as const, priority: "medium" as const },
  { title: "Review insurance aging report", description: "Review all claims in 61-90 day bucket and take action on stalled claims.", resourceType: "claim" as const, assignedRole: "billing" as const, priority: "high" as const },
  { title: "Respond to positive review", description: "Draft a thank-you response to the 5-star review. Keep it professional and appreciative.", resourceType: "review" as const, assignedRole: "front_desk" as const, priority: "low" as const },
  { title: "Re-verify expired eligibility", description: "Patient eligibility expired. Re-verify before upcoming appointment.", resourceType: "eligibility" as const, assignedRole: "front_desk" as const, priority: "high" as const },
  { title: "Patient callback - appointment reschedule", description: "Patient requested to reschedule their upcoming appointment. Call back to find a new time.", resourceType: "patient" as const, assignedRole: "front_desk" as const, priority: "low" as const },
  { title: "Review claim scrub failure", description: "Claim failed scrubbing rules. Review errors and correct before resubmitting.", resourceType: "claim" as const, assignedRole: "billing" as const, priority: "high" as const },
  { title: "Dental benefits maximum tracking", description: "Patient is approaching annual maximum. Coordinate treatment plan timing.", resourceType: "patient" as const, assignedRole: "billing" as const, priority: "medium" as const },
  { title: "Missing pre-authorization for crown", description: "Pre-authorization required before crown prep. Submit to payer with radiographs.", resourceType: "claim" as const, assignedRole: "billing" as const, priority: "urgent" as const },
  { title: "Patient complaint follow-up", description: "Patient expressed dissatisfaction during visit. Manager should follow up within 24 hours.", resourceType: "patient" as const, assignedRole: "office_manager" as const, priority: "urgent" as const },
  { title: "Coordinate secondary insurance claim", description: "Primary EOB received. Submit to secondary insurance with primary EOB attached.", resourceType: "claim" as const, assignedRole: "billing" as const, priority: "medium" as const },
  { title: "Recall patient - 6 months overdue", description: "Patient is 6 months past due for hygiene recall. Attempt contact via SMS then phone.", resourceType: "patient" as const, assignedRole: "front_desk" as const, priority: "low" as const },
  { title: "Review denial trends report", description: "Analyze this month's denial patterns and identify root causes for improvement.", resourceType: "denial" as const, assignedRole: "office_manager" as const, priority: "medium" as const },
  { title: "Insurance credentialing follow-up", description: "Check status of provider credentialing application with new insurance carrier.", resourceType: "eligibility" as const, assignedRole: "office_manager" as const, priority: "medium" as const },
];

export const seedTasks = internalMutation({
  args: { orgId: v.string() },
  handler: async (ctx, { orgId }) => {
    // Idempotency: skip if tasks already exist for this org
    const existing = await ctx.db
      .query("tasks")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .first();
    if (existing) {
      return { seeded: false, message: "Tasks already exist" };
    }

    const now = Date.now();
    const HOUR = 60 * 60 * 1000;
    const DAY = 24 * HOUR;

    const statuses: Array<"open" | "in_progress" | "completed"> = [
      "open", "open", "open", "open", "open", "open", "open", "open",
      "in_progress", "in_progress", "in_progress", "in_progress", "in_progress", "in_progress",
      "completed", "completed", "completed", "completed", "completed", "completed",
    ];

    for (let i = 0; i < 20; i++) {
      const t = TASK_TEMPLATES[i];
      const status = statuses[i];

      // Vary SLA deadlines: some overdue, some at-risk, most on-track
      let slaDeadline: number;
      if (i % 7 === 0) {
        slaDeadline = now - (1 + i) * HOUR; // overdue
      } else if (i % 5 === 0) {
        slaDeadline = now + HOUR; // at-risk (< 2h)
      } else {
        slaDeadline = now + (4 + i * 3) * HOUR; // on-track
      }

      const createdAt = now - (1 + i * 2) * HOUR;

      await ctx.db.insert("tasks", {
        orgId,
        title: t.title,
        description: t.description,
        resourceType: t.resourceType,
        assignedRole: t.assignedRole,
        priority: t.priority,
        status,
        slaDeadline,
        slaStatus: status === "completed" ? "on_track" : (now > slaDeadline ? "overdue" : (slaDeadline - now < 2 * HOUR ? "at_risk" : "on_track")),
        isEscalated: now > slaDeadline && status !== "completed",
        completedAt: status === "completed" ? now - (i * 30 * 60 * 1000) : undefined,
        createdAt,
        updatedAt: now,
      });
    }

    return { seeded: true, count: 20 };
  },
});
