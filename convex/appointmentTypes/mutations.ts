import { mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import type { MutationCtx } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId, requireRole } from "../lib/auth";

async function scheduleAppointmentTypePushSync(
  ctx: MutationCtx,
  params: {
    appointmentTypeId: string;
    orgId: string;
    operation: "create" | "update";
  }
) {
  const config = await ctx.db
    .query("nexhealthConfigs")
    .filter((q: any) =>
      q.and(q.eq(q.field("orgId"), params.orgId), q.eq(q.field("isActive"), true))
    )
    .first();

  if (!config) return;

  await ctx.scheduler.runAfter(
    0,
    internal.nexhealth.actions.pushAppointmentType as any,
    {
      appointmentTypeId: params.appointmentTypeId as any,
      orgId: params.orgId,
      practiceId: config.practiceId as any,
      operation: params.operation,
    }
  );
}

/**
 * Create a new appointment type.
 */
export const create = mutation({
  args: {
    name: v.string(),
    code: v.optional(v.string()),
    duration: v.number(),
    color: v.optional(v.string()),
    category: v.union(
      v.literal("hygiene"),
      v.literal("restorative"),
      v.literal("surgical"),
      v.literal("diagnostic"),
      v.literal("preventive"),
      v.literal("endodontic"),
      v.literal("prosthodontic"),
      v.literal("orthodontic"),
      v.literal("emergency"),
      v.literal("other")
    ),
    productionValue: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin", "office_manager");
    const orgId = await getOrgId(ctx);

    const now = Date.now();
    const appointmentTypeId = await ctx.db.insert("appointmentTypes", {
      orgId,
      name: args.name,
      code: args.code,
      duration: args.duration,
      color: args.color,
      category: args.category,
      productionValue: args.productionValue,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await scheduleAppointmentTypePushSync(ctx, {
      appointmentTypeId: appointmentTypeId as string,
      orgId,
      operation: "create",
    });

    return appointmentTypeId;
  },
});

/**
 * Update appointment type fields.
 */
export const update = mutation({
  args: {
    appointmentTypeId: v.id("appointmentTypes"),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    duration: v.optional(v.number()),
    color: v.optional(v.string()),
    category: v.optional(
      v.union(
        v.literal("hygiene"),
        v.literal("restorative"),
        v.literal("surgical"),
        v.literal("diagnostic"),
        v.literal("preventive"),
        v.literal("endodontic"),
        v.literal("prosthodontic"),
        v.literal("orthodontic"),
        v.literal("emergency"),
        v.literal("other")
      )
    ),
    productionValue: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin", "office_manager");
    const orgId = await getOrgId(ctx);

    const appointmentType = await ctx.db.get(args.appointmentTypeId);
    if (!appointmentType || appointmentType.orgId !== orgId) {
      throw new Error("Appointment type not found");
    }

    const { appointmentTypeId, ...fields } = args;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    await ctx.db.patch(appointmentTypeId, updates);

    await scheduleAppointmentTypePushSync(ctx, {
      appointmentTypeId: appointmentTypeId as string,
      orgId,
      operation: "update",
    });

    return appointmentTypeId;
  },
});

/**
 * Deactivate an appointment type (set isActive to false).
 */
export const deactivate = mutation({
  args: { appointmentTypeId: v.id("appointmentTypes") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin", "office_manager");
    const orgId = await getOrgId(ctx);

    const appointmentType = await ctx.db.get(args.appointmentTypeId);
    if (!appointmentType || appointmentType.orgId !== orgId) {
      throw new Error("Appointment type not found");
    }

    await ctx.db.patch(args.appointmentTypeId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    await scheduleAppointmentTypePushSync(ctx, {
      appointmentTypeId: args.appointmentTypeId as string,
      orgId,
      operation: "update",
    });

    return args.appointmentTypeId;
  },
});
