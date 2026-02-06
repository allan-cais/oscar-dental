import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId, requireRole } from "../lib/auth";

/**
 * Create a new provider.
 */
export const create = mutation({
  args: {
    practiceId: v.id("practices"),
    firstName: v.string(),
    lastName: v.string(),
    npi: v.optional(v.string()),
    type: v.union(
      v.literal("dentist"),
      v.literal("hygienist"),
      v.literal("specialist"),
      v.literal("assistant")
    ),
    specialty: v.optional(v.string()),
    color: v.optional(v.string()),
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
    const providerId = await ctx.db.insert("providers", {
      orgId,
      practiceId: args.practiceId,
      firstName: args.firstName,
      lastName: args.lastName,
      npi: args.npi,
      type: args.type,
      specialty: args.specialty,
      color: args.color,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return providerId;
  },
});

/**
 * Update provider fields.
 */
export const update = mutation({
  args: {
    providerId: v.id("providers"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    npi: v.optional(v.string()),
    type: v.optional(
      v.union(
        v.literal("dentist"),
        v.literal("hygienist"),
        v.literal("specialist"),
        v.literal("assistant")
      )
    ),
    specialty: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin", "office_manager");
    const orgId = await getOrgId(ctx);

    const provider = await ctx.db.get(args.providerId);
    if (!provider || provider.orgId !== orgId) {
      throw new Error("Provider not found");
    }

    const { providerId, ...fields } = args;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    await ctx.db.patch(providerId, updates);
    return providerId;
  },
});

/**
 * Deactivate a provider (set isActive to false).
 */
export const deactivate = mutation({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin", "office_manager");
    const orgId = await getOrgId(ctx);

    const provider = await ctx.db.get(args.providerId);
    if (!provider || provider.orgId !== orgId) {
      throw new Error("Provider not found");
    }

    await ctx.db.patch(args.providerId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return args.providerId;
  },
});
