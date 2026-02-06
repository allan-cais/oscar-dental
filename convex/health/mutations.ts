import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Record a health check result for a service.
 * Called by crons or internal monitoring actions.
 */
export const recordHealthCheck = internalMutation({
  args: {
    orgId: v.optional(v.string()),
    service: v.string(),
    status: v.union(
      v.literal("healthy"),
      v.literal("degraded"),
      v.literal("down")
    ),
    responseTime: v.number(),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const id = await ctx.db.insert("healthChecks", {
      orgId: args.orgId,
      checkType: "integration",
      target: args.service,
      status: args.status,
      responseTimeMs: args.responseTime,
      message: args.details,
      timestamp: now,
    });

    return id;
  },
});

/**
 * Record a health alert and create notifications for admin users.
 * Called when a service degrades or goes down.
 */
export const recordAlert = internalMutation({
  args: {
    orgId: v.string(),
    service: v.string(),
    severity: v.union(
      v.literal("info"),
      v.literal("warning"),
      v.literal("critical")
    ),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Record as a health check with the alert message
    const healthCheckId = await ctx.db.insert("healthChecks", {
      orgId: args.orgId,
      checkType: "system",
      target: args.service,
      status:
        args.severity === "critical"
          ? "down"
          : args.severity === "warning"
            ? "degraded"
            : "healthy",
      message: args.message,
      metadata: JSON.stringify({
        alertSeverity: args.severity,
        alertTimestamp: now,
      }),
      timestamp: now,
    });

    // Map severity to notification type
    const notificationType =
      args.severity === "critical"
        ? "error"
        : args.severity === "warning"
          ? "warning"
          : "info";

    // Notify admin users in this org
    const users = await ctx.db
      .query("users")
      .withIndex("by_org", (q: any) => q.eq("orgId", args.orgId))
      .collect();

    const admins = users.filter(
      (u: any) => u.role === "admin" && u.isActive
    );

    const notificationIds: string[] = [];
    for (const admin of admins) {
      const id = await ctx.db.insert("notifications", {
        orgId: args.orgId,
        userId: admin._id,
        title: `${args.severity.toUpperCase()}: ${args.service}`,
        message: args.message,
        type: notificationType as any,
        resourceType: "health_check",
        resourceId: healthCheckId,
        isRead: false,
        createdAt: now,
      });
      notificationIds.push(id);
    }

    return {
      healthCheckId,
      notificationsCreated: notificationIds.length,
    };
  },
});
