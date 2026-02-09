import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * List tasks for the current organization with optional filters.
 * Supports filtering by status, assignedRole, priority, resourceType, search.
 * Returns tasks sorted by priority (urgent first) then createdAt (newest first).
 */
export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("open"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled"),
        v.literal("all")
      )
    ),
    assignedRole: v.optional(
      v.union(
        v.literal("front_desk"),
        v.literal("billing"),
        v.literal("clinical"),
        v.literal("office_manager"),
        v.literal("admin"),
        v.literal("all")
      )
    ),
    priority: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("urgent"),
        v.literal("all")
      )
    ),
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
        v.literal("general"),
        v.literal("all")
      )
    ),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const limit = args.limit ?? 100;

    // Use the status index if a specific status is requested
    const statusFilter = args.status && args.status !== "all" ? args.status : null;
    const roleFilter = args.assignedRole && args.assignedRole !== "all" ? args.assignedRole : null;

    let results;
    if (statusFilter && roleFilter) {
      results = await ctx.db
        .query("tasks")
        .withIndex("by_assigned_role", (q: any) =>
          q.eq("orgId", orgId).eq("assignedRole", roleFilter).eq("status", statusFilter)
        )
        .collect();
    } else if (statusFilter) {
      results = await ctx.db
        .query("tasks")
        .withIndex("by_status", (q: any) =>
          q.eq("orgId", orgId).eq("status", statusFilter)
        )
        .collect();
    } else {
      results = await ctx.db
        .query("tasks")
        .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
        .collect();
    }

    // Apply remaining client-side filters
    let filtered = results as any[];

    // If we used by_org index but have a role filter, apply it
    if (!statusFilter && roleFilter) {
      filtered = filtered.filter((t) => t.assignedRole === roleFilter);
    }

    if (args.priority && args.priority !== "all") {
      filtered = filtered.filter((t) => t.priority === args.priority);
    }

    if (args.resourceType && args.resourceType !== "all") {
      filtered = filtered.filter((t) => t.resourceType === args.resourceType);
    }

    if (args.search) {
      const searchLower = args.search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(searchLower) ||
          (t.description && t.description.toLowerCase().includes(searchLower))
      );
    }

    // Sort: urgent first, then by createdAt desc
    const priorityOrder: Record<string, number> = {
      urgent: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    filtered.sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 4;
      const pb = priorityOrder[b.priority] ?? 4;
      if (pa !== pb) return pa - pb;
      return b.createdAt - a.createdAt;
    });

    // Update SLA statuses in-memory for display (don't persist here)
    const now = Date.now();
    const AT_RISK_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours before deadline

    filtered = filtered.map((t) => {
      if (t.status === "completed" || t.status === "cancelled") return t;
      if (!t.slaDeadline) return t;

      let computedSlaStatus = t.slaStatus;
      if (now > t.slaDeadline) {
        computedSlaStatus = "overdue";
      } else if (t.slaDeadline - now < AT_RISK_THRESHOLD_MS) {
        computedSlaStatus = "at_risk";
      } else {
        computedSlaStatus = "on_track";
      }
      return { ...t, slaStatus: computedSlaStatus };
    });

    return filtered.slice(0, limit);
  },
});

/**
 * Get a single task by ID.
 */
export const getById = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task || (task as any).orgId !== orgId) {
      throw new Error("Task not found");
    }
    return task;
  },
});

/**
 * Get task statistics: counts by status and SLA state.
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);
    const allTasks = await ctx.db
      .query("tasks")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const now = Date.now();
    const AT_RISK_THRESHOLD_MS = 2 * 60 * 60 * 1000;

    let open = 0;
    let inProgress = 0;
    let completedToday = 0;
    let atRisk = 0;
    let overdue = 0;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();

    for (const t of allTasks as any[]) {
      if (t.status === "open") open++;
      if (t.status === "in_progress") inProgress++;
      if (t.status === "completed" && t.completedAt && t.completedAt >= todayMs) {
        completedToday++;
      }

      // Compute live SLA status for non-completed tasks
      if (t.status !== "completed" && t.status !== "cancelled" && t.slaDeadline) {
        if (now > t.slaDeadline) {
          overdue++;
        } else if (t.slaDeadline - now < AT_RISK_THRESHOLD_MS) {
          atRisk++;
        }
      }
    }

    return { open, inProgress, completedToday, atRisk, overdue };
  },
});
