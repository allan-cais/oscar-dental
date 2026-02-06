import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId, requireRole } from "../lib/auth";

/**
 * Create a new practice.
 */
export const create = mutation({
  args: {
    name: v.string(),
    address: v.object({
      street: v.string(),
      city: v.string(),
      state: v.string(),
      zip: v.string(),
    }),
    phone: v.string(),
    email: v.string(),
    npi: v.optional(v.string()),
    taxId: v.optional(v.string()),
    timezone: v.string(),
    pmsType: v.optional(
      v.union(
        v.literal("opendental"),
        v.literal("eaglesoft"),
        v.literal("dentrix")
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin", "office_manager");
    const orgId = await getOrgId(ctx);

    const now = Date.now();
    const practiceId = await ctx.db.insert("practices", {
      orgId,
      name: args.name,
      address: args.address,
      phone: args.phone,
      email: args.email,
      npi: args.npi,
      taxId: args.taxId,
      timezone: args.timezone,
      pmsType: args.pmsType,
      pmsConnectionStatus: "disconnected",
      createdAt: now,
      updatedAt: now,
    });

    return practiceId;
  },
});

/**
 * Update practice fields.
 */
export const update = mutation({
  args: {
    practiceId: v.id("practices"),
    name: v.optional(v.string()),
    address: v.optional(
      v.object({
        street: v.string(),
        city: v.string(),
        state: v.string(),
        zip: v.string(),
      })
    ),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    npi: v.optional(v.string()),
    taxId: v.optional(v.string()),
    timezone: v.optional(v.string()),
    businessHours: v.optional(
      v.array(
        v.object({
          day: v.string(),
          open: v.string(),
          close: v.string(),
          closed: v.boolean(),
        })
      )
    ),
    pmsType: v.optional(
      v.union(
        v.literal("opendental"),
        v.literal("eaglesoft"),
        v.literal("dentrix")
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin", "office_manager");
    const orgId = await getOrgId(ctx);

    const practice = await ctx.db.get(args.practiceId);
    if (!practice || practice.orgId !== orgId) {
      throw new Error("Practice not found");
    }

    const { practiceId, ...fields } = args;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    await ctx.db.patch(practiceId, updates);
    return practiceId;
  },
});

/**
 * Update practice settings.
 */
export const updateSettings = mutation({
  args: {
    practiceId: v.id("practices"),
    reviewRequestDelay: v.optional(v.number()),
    reviewMinSatisfactionScore: v.optional(v.number()),
    defaultAppointmentDuration: v.optional(v.number()),
    scheduleStartTime: v.optional(v.string()),
    scheduleEndTime: v.optional(v.string()),
    collectionsThresholds: v.optional(
      v.object({
        day0: v.number(),
        day7: v.number(),
        day14: v.number(),
        day30: v.number(),
        day60: v.number(),
        day90: v.number(),
      })
    ),
    smsOptOutKeywords: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin", "office_manager");
    const orgId = await getOrgId(ctx);

    // Verify practice ownership
    const practice = await ctx.db.get(args.practiceId);
    if (!practice || practice.orgId !== orgId) {
      throw new Error("Practice not found");
    }

    const existing = await ctx.db
      .query("practiceSettings")
      .withIndex("by_practice", (q) => q.eq("practiceId", args.practiceId))
      .first();

    const { practiceId, ...fields } = args;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    if (existing) {
      await ctx.db.patch(existing._id, updates);
      return existing._id;
    } else {
      const settingsId = await ctx.db.insert("practiceSettings", {
        orgId,
        practiceId: args.practiceId,
        ...updates,
        updatedAt: Date.now(),
      } as any);
      return settingsId;
    }
  },
});
