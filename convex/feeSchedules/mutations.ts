import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId, requireRole } from "../lib/auth";

/**
 * Create a new fee schedule.
 */
export const create = mutation({
  args: {
    practiceId: v.id("practices"),
    payerId: v.optional(v.string()),
    payerName: v.optional(v.string()),
    name: v.string(),
    fees: v.array(
      v.object({
        code: v.string(),
        description: v.string(),
        fee: v.number(),
        effectiveDate: v.optional(v.string()),
      })
    ),
    isDefault: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin", "office_manager", "billing");
    const orgId = await getOrgId(ctx);

    // Verify practice belongs to org
    const practice = await ctx.db.get(args.practiceId);
    if (!practice || practice.orgId !== orgId) {
      throw new Error("Practice not found");
    }

    const now = Date.now();
    const feeScheduleId = await ctx.db.insert("feeSchedules", {
      orgId,
      practiceId: args.practiceId,
      payerId: args.payerId,
      payerName: args.payerName,
      name: args.name,
      fees: args.fees,
      isDefault: args.isDefault,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return feeScheduleId;
  },
});

/**
 * Update a fee schedule's metadata (name, payer info, default flag, active status).
 */
export const update = mutation({
  args: {
    feeScheduleId: v.id("feeSchedules"),
    name: v.optional(v.string()),
    payerId: v.optional(v.string()),
    payerName: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin", "office_manager", "billing");
    const orgId = await getOrgId(ctx);

    const feeSchedule = await ctx.db.get(args.feeScheduleId);
    if (!feeSchedule || feeSchedule.orgId !== orgId) {
      throw new Error("Fee schedule not found");
    }

    const { feeScheduleId, ...fields } = args;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    await ctx.db.patch(feeScheduleId, updates);
    return feeScheduleId;
  },
});

/**
 * Add a single fee entry to an existing fee schedule.
 * If a fee for this code already exists, it is replaced.
 */
export const addFee = mutation({
  args: {
    feeScheduleId: v.id("feeSchedules"),
    code: v.string(),
    description: v.string(),
    fee: v.number(),
    effectiveDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin", "office_manager", "billing");
    const orgId = await getOrgId(ctx);

    const feeSchedule = await ctx.db.get(args.feeScheduleId);
    if (!feeSchedule || feeSchedule.orgId !== orgId) {
      throw new Error("Fee schedule not found");
    }

    // Remove existing entry for this code (if any) then add new one
    const existingFees = feeSchedule.fees.filter(
      (f: any) => f.code !== args.code
    );

    existingFees.push({
      code: args.code,
      description: args.description,
      fee: args.fee,
      effectiveDate: args.effectiveDate,
    });

    await ctx.db.patch(args.feeScheduleId, {
      fees: existingFees,
      updatedAt: Date.now(),
    });

    return args.feeScheduleId;
  },
});

/**
 * Remove a fee entry from a fee schedule by procedure code.
 */
export const removeFee = mutation({
  args: {
    feeScheduleId: v.id("feeSchedules"),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin", "office_manager", "billing");
    const orgId = await getOrgId(ctx);

    const feeSchedule = await ctx.db.get(args.feeScheduleId);
    if (!feeSchedule || feeSchedule.orgId !== orgId) {
      throw new Error("Fee schedule not found");
    }

    const updatedFees = feeSchedule.fees.filter(
      (f: any) => f.code !== args.code
    );

    if (updatedFees.length === feeSchedule.fees.length) {
      throw new Error(`Fee entry with code "${args.code}" not found`);
    }

    await ctx.db.patch(args.feeScheduleId, {
      fees: updatedFees,
      updatedAt: Date.now(),
    });

    return args.feeScheduleId;
  },
});
