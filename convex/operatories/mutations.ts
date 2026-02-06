import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId, requireRole } from "../lib/auth";

/**
 * Create a new operatory.
 */
export const create = mutation({
  args: {
    practiceId: v.id("practices"),
    name: v.string(),
    shortName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin", "office_manager");
    const orgId = await getOrgId(ctx);

    // Verify practice belongs to org
    const practice = await ctx.db.get(args.practiceId);
    if (!practice || practice.orgId !== orgId) {
      throw new Error("Practice not found");
    }

    const now = Date.now();
    const operatoryId = await ctx.db.insert("operatories", {
      orgId,
      practiceId: args.practiceId,
      name: args.name,
      shortName: args.shortName,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return operatoryId;
  },
});

/**
 * Update operatory fields.
 */
export const update = mutation({
  args: {
    operatoryId: v.id("operatories"),
    name: v.optional(v.string()),
    shortName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin", "office_manager");
    const orgId = await getOrgId(ctx);

    const operatory = await ctx.db.get(args.operatoryId);
    if (!operatory || operatory.orgId !== orgId) {
      throw new Error("Operatory not found");
    }

    const { operatoryId, ...fields } = args;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    await ctx.db.patch(operatoryId, updates);
    return operatoryId;
  },
});

/**
 * Deactivate an operatory (set isActive to false).
 */
export const deactivate = mutation({
  args: { operatoryId: v.id("operatories") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin", "office_manager");
    const orgId = await getOrgId(ctx);

    const operatory = await ctx.db.get(args.operatoryId);
    if (!operatory || operatory.orgId !== orgId) {
      throw new Error("Operatory not found");
    }

    await ctx.db.patch(args.operatoryId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return args.operatoryId;
  },
});
