import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * Add a patient to the Quick Fill queue.
 * Sets status="active" and calculates priorityScore from urgency + estimatedValue.
 */
export const addToQueue = mutation({
  args: {
    patientId: v.id("patients"),
    appointmentTypeId: v.optional(v.id("appointmentTypes")),
    preferredDays: v.optional(v.array(v.string())),
    preferredTimes: v.optional(v.array(v.string())),
    urgency: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
    reason: v.optional(v.string()),
    estimatedValue: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // Verify patient belongs to org
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.orgId !== orgId) {
      throw new Error("Patient not found");
    }

    // Verify appointment type if provided
    if (args.appointmentTypeId) {
      const apptType = await ctx.db.get(args.appointmentTypeId);
      if (!apptType || apptType.orgId !== orgId) {
        throw new Error("Appointment type not found");
      }
    }

    // Calculate production value from appointment type if not explicitly provided
    let productionValue = args.estimatedValue;
    if (productionValue === undefined && args.appointmentTypeId) {
      const apptType = await ctx.db.get(args.appointmentTypeId);
      productionValue = apptType?.productionValue ?? undefined;
    }

    const now = Date.now();

    const queueItemId = await ctx.db.insert("quickFillQueue", {
      orgId,
      patientId: args.patientId,
      appointmentTypeId: args.appointmentTypeId,
      preferredDays: args.preferredDays,
      preferredTimes: args.preferredTimes,
      urgency: args.urgency,
      productionValue,
      reason: args.reason,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    return queueItemId;
  },
});

/**
 * Remove a patient from the Quick Fill queue.
 * Sets status to "removed" with an optional reason.
 */
export const removeFromQueue = mutation({
  args: {
    queueItemId: v.id("quickFillQueue"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const item = await ctx.db.get(args.queueItemId);
    if (!item || item.orgId !== orgId) {
      throw new Error("Quick Fill queue item not found");
    }

    await ctx.db.patch(args.queueItemId, {
      status: "removed",
      reason: args.reason ?? item.reason,
      updatedAt: Date.now(),
    });

    return args.queueItemId;
  },
});

/**
 * Update the status of a Quick Fill queue item.
 * Valid transitions: active -> contacted -> scheduled/removed
 */
export const updateStatus = mutation({
  args: {
    queueItemId: v.id("quickFillQueue"),
    status: v.union(
      v.literal("active"),
      v.literal("contacted"),
      v.literal("scheduled"),
      v.literal("removed")
    ),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const item = await ctx.db.get(args.queueItemId);
    if (!item || item.orgId !== orgId) {
      throw new Error("Quick Fill queue item not found");
    }

    await ctx.db.patch(args.queueItemId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return args.queueItemId;
  },
});

/**
 * Mark a queue item as contacted. Sets lastContactedAt timestamp.
 */
export const contactPatient = mutation({
  args: {
    queueItemId: v.id("quickFillQueue"),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const item = await ctx.db.get(args.queueItemId);
    if (!item || item.orgId !== orgId) {
      throw new Error("Quick Fill queue item not found");
    }

    const now = Date.now();
    await ctx.db.patch(args.queueItemId, {
      status: "contacted",
      lastContactedAt: now,
      updatedAt: now,
    });

    return args.queueItemId;
  },
});
