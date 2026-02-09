import { mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { getOrgId, requireRole } from "../lib/auth";
import type { MutationCtx } from "../_generated/server";

async function scheduleWorkingHourPushSync(
  ctx: MutationCtx,
  params: {
    workingHourId: string;
    orgId: string;
    operation: "create" | "update" | "delete";
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
    internal.nexhealth.actions.pushWorkingHour as any,
    {
      workingHourId: params.workingHourId as any,
      orgId: params.orgId,
      practiceId: config.practiceId as any,
      operation: params.operation,
    }
  );
}

/**
 * Create a new working hour record for a provider.
 */
export const create = mutation({
  args: {
    pmsProviderId: v.string(),
    dayOfWeek: v.number(), // 0=Sunday, 1=Monday, ..., 6=Saturday
    startTime: v.string(), // "08:00"
    endTime: v.string(),   // "17:00"
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin", "office_manager");
    const orgId = await getOrgId(ctx);
    const now = Date.now();

    const workingHourId = await ctx.db.insert("workingHours", {
      orgId,
      pmsProviderId: args.pmsProviderId,
      dayOfWeek: args.dayOfWeek,
      startTime: args.startTime,
      endTime: args.endTime,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await scheduleWorkingHourPushSync(ctx, {
      workingHourId: workingHourId as string,
      orgId,
      operation: "create",
    });

    return workingHourId;
  },
});

/**
 * Update a working hour record.
 */
export const update = mutation({
  args: {
    workingHourId: v.id("workingHours"),
    dayOfWeek: v.optional(v.number()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin", "office_manager");
    const orgId = await getOrgId(ctx);

    const existing = await ctx.db.get(args.workingHourId);
    if (!existing || (existing as any).orgId !== orgId) {
      throw new Error("Working hour not found");
    }

    const { workingHourId, ...fields } = args;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    await ctx.db.patch(workingHourId, updates);

    await scheduleWorkingHourPushSync(ctx, {
      workingHourId: workingHourId as string,
      orgId,
      operation: "update",
    });

    return workingHourId;
  },
});

/**
 * Soft-delete a working hour (set isActive to false).
 */
export const remove = mutation({
  args: { workingHourId: v.id("workingHours") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin", "office_manager");
    const orgId = await getOrgId(ctx);

    const existing = await ctx.db.get(args.workingHourId);
    if (!existing || (existing as any).orgId !== orgId) {
      throw new Error("Working hour not found");
    }

    await ctx.db.patch(args.workingHourId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    await scheduleWorkingHourPushSync(ctx, {
      workingHourId: args.workingHourId as string,
      orgId,
      operation: "delete",
    });

    return args.workingHourId;
  },
});
