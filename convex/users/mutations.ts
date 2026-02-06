import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";
import { requireRole } from "../lib/auth";

const roleValidator = v.union(
  v.literal("admin"),
  v.literal("office_manager"),
  v.literal("billing"),
  v.literal("clinical"),
  v.literal("front_desk"),
  v.literal("provider")
);

/**
 * Create a new user. Requires admin role.
 */
export const create = mutation({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    role: roleValidator,
    practiceId: v.optional(v.id("practices")),
    clerkUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    const orgId = await getOrgId(ctx);

    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      orgId,
      clerkUserId: args.clerkUserId ?? `pending_${now}`,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      role: args.role,
      practiceId: args.practiceId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return userId;
  },
});

/**
 * Update user fields. Requires admin role.
 */
export const update = mutation({
  args: {
    userId: v.id("users"),
    email: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    role: v.optional(roleValidator),
    practiceId: v.optional(v.id("practices")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    const orgId = await getOrgId(ctx);

    const user = await ctx.db.get(args.userId);
    if (!user || user.orgId !== orgId) {
      throw new Error("User not found");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.email !== undefined) updates.email = args.email;
    if (args.firstName !== undefined) updates.firstName = args.firstName;
    if (args.lastName !== undefined) updates.lastName = args.lastName;
    if (args.role !== undefined) updates.role = args.role;
    if (args.practiceId !== undefined) updates.practiceId = args.practiceId;

    await ctx.db.patch(args.userId, updates);
    return args.userId;
  },
});

/**
 * Change a user's role. Requires admin role.
 */
export const updateRole = mutation({
  args: {
    userId: v.id("users"),
    role: roleValidator,
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    const orgId = await getOrgId(ctx);

    const user = await ctx.db.get(args.userId);
    if (!user || user.orgId !== orgId) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.userId, {
      role: args.role,
      updatedAt: Date.now(),
    });

    return args.userId;
  },
});

/**
 * Deactivate a user (set isActive to false). Requires admin role.
 */
export const deactivate = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    const orgId = await getOrgId(ctx);

    const user = await ctx.db.get(args.userId);
    if (!user || user.orgId !== orgId) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.userId, {
      isActive: !user.isActive,
      updatedAt: Date.now(),
    });

    return args.userId;
  },
});
