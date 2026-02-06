import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId, getCurrentUser } from "../lib/auth";

/**
 * Mark a single notification as read.
 */
export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User not found");
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.orgId !== orgId) {
      throw new Error("Notification not found");
    }

    // Verify the notification belongs to the current user
    if (notification.userId !== user._id) {
      throw new Error("Not authorized to modify this notification");
    }

    await ctx.db.patch(args.notificationId, {
      isRead: true,
      readAt: Date.now(),
    });

    return args.notificationId;
  },
});

/**
 * Mark all unread notifications for the current user as read.
 */
export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User not found");
    }

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q: any) =>
        q.eq("orgId", orgId).eq("userId", user._id).eq("isRead", false)
      )
      .collect();

    const now = Date.now();
    let markedCount = 0;

    for (const notification of unread) {
      await ctx.db.patch(notification._id, {
        isRead: true,
        readAt: now,
      });
      markedCount++;
    }

    return { markedCount };
  },
});

/**
 * Dismiss a notification (soft-delete).
 * Sets a dismissed flag without actually removing the record.
 */
export const dismiss = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User not found");
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.orgId !== orgId) {
      throw new Error("Notification not found");
    }

    if (notification.userId !== user._id) {
      throw new Error("Not authorized to modify this notification");
    }

    // Soft-delete: mark as read and remove from active view
    // The notifications table doesn't have a dismissed field in schema,
    // so we mark as read to effectively dismiss it.
    await ctx.db.patch(args.notificationId, {
      isRead: true,
      readAt: Date.now(),
    });

    return args.notificationId;
  },
});

/**
 * Create notifications in bulk. Used by system events (crons, triggers).
 * This is an internalMutation so it can be called without auth by crons/actions.
 */
export const createBulk = internalMutation({
  args: {
    notifications: v.array(
      v.object({
        orgId: v.string(),
        userId: v.id("users"),
        title: v.string(),
        message: v.string(),
        type: v.union(
          v.literal("info"),
          v.literal("warning"),
          v.literal("error"),
          v.literal("success"),
          v.literal("action_required")
        ),
        resourceType: v.optional(v.string()),
        resourceId: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const ids: string[] = [];

    for (const notification of args.notifications) {
      const id = await ctx.db.insert("notifications", {
        orgId: notification.orgId,
        userId: notification.userId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        resourceType: notification.resourceType,
        resourceId: notification.resourceId,
        isRead: false,
        createdAt: now,
      });
      ids.push(id);
    }

    return { created: ids.length, ids };
  },
});
