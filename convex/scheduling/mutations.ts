import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

// Valid status transitions: from -> allowed targets
const VALID_TRANSITIONS: Record<string, string[]> = {
  scheduled: ["confirmed", "cancelled", "no_show"],
  confirmed: ["checked_in", "cancelled", "no_show"],
  checked_in: ["in_progress"],
  in_progress: ["completed"],
  // Terminal states have no transitions
  completed: [],
  cancelled: [],
  no_show: [],
};

/**
 * Create a new appointment.
 */
export const create = mutation({
  args: {
    practiceId: v.id("practices"),
    patientId: v.id("patients"),
    providerId: v.id("providers"),
    operatoryId: v.optional(v.id("operatories")),
    appointmentTypeId: v.optional(v.id("appointmentTypes")),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    duration: v.number(),
    productionAmount: v.optional(v.number()),
    procedures: v.optional(
      v.array(
        v.object({
          code: v.string(),
          description: v.string(),
          fee: v.number(),
          tooth: v.optional(v.string()),
          surface: v.optional(v.string()),
        })
      )
    ),
    notes: v.optional(v.string()),
    pmsAppointmentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // Verify practice belongs to org
    const practice = await ctx.db.get(args.practiceId);
    if (!practice || practice.orgId !== orgId) {
      throw new Error("Practice not found");
    }

    // Verify patient belongs to org
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.orgId !== orgId) {
      throw new Error("Patient not found");
    }

    // Verify provider belongs to org
    const provider = await ctx.db.get(args.providerId);
    if (!provider || provider.orgId !== orgId) {
      throw new Error("Provider not found");
    }

    // Verify operatory if provided
    if (args.operatoryId) {
      const operatory = await ctx.db.get(args.operatoryId);
      if (!operatory || operatory.orgId !== orgId) {
        throw new Error("Operatory not found");
      }
    }

    // Verify appointment type if provided
    if (args.appointmentTypeId) {
      const appointmentType = await ctx.db.get(args.appointmentTypeId);
      if (!appointmentType || appointmentType.orgId !== orgId) {
        throw new Error("Appointment type not found");
      }
    }

    const now = Date.now();
    const appointmentId = await ctx.db.insert("appointments", {
      orgId,
      practiceId: args.practiceId,
      patientId: args.patientId,
      providerId: args.providerId,
      operatoryId: args.operatoryId,
      appointmentTypeId: args.appointmentTypeId,
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      duration: args.duration,
      status: "scheduled",
      productionAmount: args.productionAmount,
      procedures: args.procedures,
      notes: args.notes,
      pmsAppointmentId: args.pmsAppointmentId,
      createdAt: now,
      updatedAt: now,
    });

    return appointmentId;
  },
});

/**
 * Update appointment fields (non-status fields).
 */
export const update = mutation({
  args: {
    appointmentId: v.id("appointments"),
    operatoryId: v.optional(v.id("operatories")),
    appointmentTypeId: v.optional(v.id("appointmentTypes")),
    date: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    duration: v.optional(v.number()),
    productionAmount: v.optional(v.number()),
    procedures: v.optional(
      v.array(
        v.object({
          code: v.string(),
          description: v.string(),
          fee: v.number(),
          tooth: v.optional(v.string()),
          surface: v.optional(v.string()),
        })
      )
    ),
    notes: v.optional(v.string()),
    pmsAppointmentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment || appointment.orgId !== orgId) {
      throw new Error("Appointment not found");
    }

    // Verify operatory if provided
    if (args.operatoryId) {
      const operatory = await ctx.db.get(args.operatoryId);
      if (!operatory || operatory.orgId !== orgId) {
        throw new Error("Operatory not found");
      }
    }

    // Verify appointment type if provided
    if (args.appointmentTypeId) {
      const appointmentType = await ctx.db.get(args.appointmentTypeId);
      if (!appointmentType || appointmentType.orgId !== orgId) {
        throw new Error("Appointment type not found");
      }
    }

    const { appointmentId, ...fields } = args;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    await ctx.db.patch(appointmentId, updates);
    return appointmentId;
  },
});

/**
 * Transition appointment status with strict validation.
 *
 * Valid transitions:
 *   scheduled -> confirmed, cancelled, no_show
 *   confirmed -> checked_in, cancelled, no_show
 *   checked_in -> in_progress
 *   in_progress -> completed
 *
 * cancelled/completed/no_show are terminal states.
 */
export const updateStatus = mutation({
  args: {
    appointmentId: v.id("appointments"),
    status: v.union(
      v.literal("scheduled"),
      v.literal("confirmed"),
      v.literal("checked_in"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("no_show")
    ),
    cancellationReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment || appointment.orgId !== orgId) {
      throw new Error("Appointment not found");
    }

    const currentStatus = appointment.status;
    const targetStatus = args.status;

    // Validate the transition
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(targetStatus)) {
      throw new Error(
        `Invalid status transition: "${currentStatus}" -> "${targetStatus}". ` +
          `Allowed transitions from "${currentStatus}": ${
            allowed && allowed.length > 0 ? allowed.join(", ") : "none (terminal state)"
          }`
      );
    }

    // Require cancellation reason when cancelling
    if (targetStatus === "cancelled" && !args.cancellationReason) {
      throw new Error("cancellationReason is required when cancelling an appointment");
    }

    const now = Date.now();
    const updates: Record<string, unknown> = {
      status: targetStatus,
      updatedAt: now,
    };

    // Set timestamp fields based on target status
    if (targetStatus === "confirmed") {
      updates.confirmedAt = now;
    } else if (targetStatus === "checked_in") {
      updates.checkedInAt = now;
    } else if (targetStatus === "completed") {
      updates.completedAt = now;
    } else if (targetStatus === "cancelled") {
      updates.cancelledAt = now;
      updates.cancellationReason = args.cancellationReason;
    }

    await ctx.db.patch(args.appointmentId, updates);
    return args.appointmentId;
  },
});

/**
 * Cancel an appointment. Shortcut for updateStatus to cancelled.
 */
export const cancel = mutation({
  args: {
    appointmentId: v.id("appointments"),
    cancellationReason: v.string(),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment || appointment.orgId !== orgId) {
      throw new Error("Appointment not found");
    }

    const currentStatus = appointment.status;
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes("cancelled")) {
      throw new Error(
        `Cannot cancel appointment with status "${currentStatus}". ` +
          `Only "scheduled" or "confirmed" appointments can be cancelled.`
      );
    }

    const now = Date.now();
    await ctx.db.patch(args.appointmentId, {
      status: "cancelled",
      cancelledAt: now,
      cancellationReason: args.cancellationReason,
      updatedAt: now,
    });

    return args.appointmentId;
  },
});

/**
 * Check in an appointment. Shortcut for updateStatus to checked_in.
 */
export const checkIn = mutation({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment || appointment.orgId !== orgId) {
      throw new Error("Appointment not found");
    }

    if (appointment.status !== "confirmed") {
      throw new Error(
        `Cannot check in appointment with status "${appointment.status}". ` +
          `Only "confirmed" appointments can be checked in.`
      );
    }

    const now = Date.now();
    await ctx.db.patch(args.appointmentId, {
      status: "checked_in",
      checkedInAt: now,
      updatedAt: now,
    });

    return args.appointmentId;
  },
});

/**
 * Complete an appointment. Shortcut for updateStatus to completed.
 */
export const complete = mutation({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment || appointment.orgId !== orgId) {
      throw new Error("Appointment not found");
    }

    if (appointment.status !== "in_progress") {
      throw new Error(
        `Cannot complete appointment with status "${appointment.status}". ` +
          `Only "in_progress" appointments can be completed.`
      );
    }

    const now = Date.now();
    await ctx.db.patch(args.appointmentId, {
      status: "completed",
      completedAt: now,
      updatedAt: now,
    });

    return args.appointmentId;
  },
});
