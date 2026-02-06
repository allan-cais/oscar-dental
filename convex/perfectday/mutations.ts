import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * Create a Perfect Day template for a practice and day of week.
 */
export const createTemplate = mutation({
  args: {
    practiceId: v.id("practices"),
    dayOfWeek: v.number(),
    name: v.string(),
    slots: v.array(
      v.object({
        startTime: v.string(),
        endTime: v.string(),
        category: v.string(),
        productionTarget: v.optional(v.number()),
      })
    ),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // Verify practice belongs to org
    const practice = await ctx.db.get(args.practiceId);
    if (!practice || practice.orgId !== orgId) {
      throw new Error("Practice not found");
    }

    // Validate dayOfWeek
    if (args.dayOfWeek < 0 || args.dayOfWeek > 6) {
      throw new Error("dayOfWeek must be between 0 (Sunday) and 6 (Saturday)");
    }

    const now = Date.now();

    const templateId = await ctx.db.insert("perfectDayTemplates", {
      orgId,
      practiceId: args.practiceId,
      dayOfWeek: args.dayOfWeek,
      name: args.name,
      slots: args.slots,
      isActive: args.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });

    return templateId;
  },
});

/**
 * Update an existing Perfect Day template.
 */
export const updateTemplate = mutation({
  args: {
    templateId: v.id("perfectDayTemplates"),
    name: v.optional(v.string()),
    slots: v.optional(
      v.array(
        v.object({
          startTime: v.string(),
          endTime: v.string(),
          category: v.string(),
          productionTarget: v.optional(v.number()),
        })
      )
    ),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const template = await ctx.db.get(args.templateId);
    if (!template || template.orgId !== orgId) {
      throw new Error("Template not found");
    }

    const updates: Record<string, any> = { updatedAt: Date.now() };

    if (args.name !== undefined) {
      updates.name = args.name;
    }
    if (args.slots !== undefined) {
      updates.slots = args.slots;
    }
    if (args.isActive !== undefined) {
      updates.isActive = args.isActive;
    }

    await ctx.db.patch(args.templateId, updates);

    return args.templateId;
  },
});

/**
 * Soft delete a template by setting isActive=false.
 */
export const deleteTemplate = mutation({
  args: {
    templateId: v.id("perfectDayTemplates"),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const template = await ctx.db.get(args.templateId);
    if (!template || template.orgId !== orgId) {
      throw new Error("Template not found");
    }

    await ctx.db.patch(args.templateId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return args.templateId;
  },
});

/**
 * Duplicate a template to a different day of week.
 * Creates a new template with the same slots and name (suffixed with target day).
 */
export const duplicateTemplate = mutation({
  args: {
    templateId: v.id("perfectDayTemplates"),
    targetDayOfWeek: v.number(),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const source = await ctx.db.get(args.templateId);
    if (!source || source.orgId !== orgId) {
      throw new Error("Template not found");
    }

    // Validate dayOfWeek
    if (args.targetDayOfWeek < 0 || args.targetDayOfWeek > 6) {
      throw new Error("targetDayOfWeek must be between 0 (Sunday) and 6 (Saturday)");
    }

    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const now = Date.now();

    const newId = await ctx.db.insert("perfectDayTemplates", {
      orgId,
      practiceId: source.practiceId,
      dayOfWeek: args.targetDayOfWeek,
      name: `${source.name} (${dayNames[args.targetDayOfWeek]})`,
      slots: source.slots,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return newId;
  },
});
