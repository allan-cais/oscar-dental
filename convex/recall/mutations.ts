import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * Create a recall due item for a patient.
 */
export const create = mutation({
  args: {
    patientId: v.id("patients"),
    dueDate: v.string(),
    recallType: v.union(
      v.literal("hygiene"),
      v.literal("periodic_exam"),
      v.literal("perio_maintenance")
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // Verify patient belongs to org
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.orgId !== orgId) {
      throw new Error("Patient not found");
    }

    // Default interval based on recall type
    const intervalDefaults: Record<string, number> = {
      hygiene: 6,
      periodic_exam: 6,
      perio_maintenance: 3,
    };
    const intervalMonths = intervalDefaults[args.recallType] ?? 6;

    const now = Date.now();

    const recallId = await ctx.db.insert("recallDueList", {
      orgId,
      patientId: args.patientId,
      dueDate: args.dueDate,
      recallType: args.recallType,
      intervalMonths,
      outreachStatus: "pending",
      outreachAttempts: 0,
      createdAt: now,
      updatedAt: now,
    });

    return recallId;
  },
});

/**
 * Update the outreach status of a recall item.
 * Transitions: pending -> sms_sent/email_sent/called -> scheduled/refused
 */
export const updateStatus = mutation({
  args: {
    recallId: v.id("recallDueList"),
    status: v.union(
      v.literal("pending"),
      v.literal("sms_sent"),
      v.literal("email_sent"),
      v.literal("called"),
      v.literal("scheduled"),
      v.literal("refused")
    ),
    scheduledAppointmentId: v.optional(v.id("appointments")),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const recall = await ctx.db.get(args.recallId);
    if (!recall || recall.orgId !== orgId) {
      throw new Error("Recall item not found");
    }

    const patch: Record<string, any> = {
      outreachStatus: args.status,
      updatedAt: Date.now(),
    };

    if (args.scheduledAppointmentId) {
      patch.scheduledAppointmentId = args.scheduledAppointmentId;
    }

    await ctx.db.patch(args.recallId, patch);

    return args.recallId;
  },
});

/**
 * Record an outreach attempt for a recall item.
 * Updates lastOutreachAt, increments outreachAttempts, and sets outreach status.
 */
export const recordOutreach = mutation({
  args: {
    recallId: v.id("recallDueList"),
    method: v.union(
      v.literal("sms"),
      v.literal("email"),
      v.literal("phone")
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const recall = await ctx.db.get(args.recallId);
    if (!recall || recall.orgId !== orgId) {
      throw new Error("Recall item not found");
    }

    // Map method to outreach status
    const statusMap: Record<string, string> = {
      sms: "sms_sent",
      email: "email_sent",
      phone: "called",
    };

    const now = Date.now();
    await ctx.db.patch(args.recallId, {
      outreachStatus: statusMap[args.method] as any,
      outreachAttempts: (recall.outreachAttempts ?? 0) + 1,
      lastOutreachAt: now,
      updatedAt: now,
    });

    return args.recallId;
  },
});

/**
 * Internal mutation for the daily cron job.
 * Scans all active patients and creates recall items for those overdue.
 *
 * Intervals:
 * - hygiene: 6 months
 * - periodic_exam: 6 months (same as hygiene for most practices)
 * - perio_maintenance: 3 months
 *
 * Deduplication: Does not create a recall if one already exists for
 * the same patient + recallType with a non-terminal outreach status.
 */
export const generateDueList = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Internal cron runs system-wide across all orgs.
    // We need to process all patients grouped by org.
    const allPatients = await ctx.db.query("patients").collect();

    // Get all existing non-terminal recalls for dedup
    const allRecalls = await ctx.db.query("recallDueList").collect();
    const terminalStatuses = ["scheduled", "refused"];
    const activeRecalls = allRecalls.filter(
      (r: any) => !terminalStatuses.includes(r.outreachStatus)
    );

    // Build a dedup set: "patientId:recallType"
    const existingKeys = new Set(
      activeRecalls.map((r: any) => `${r.patientId}:${r.recallType}`)
    );

    const now = new Date();
    const nowMs = Date.now();

    // Recall type configs: recallType -> intervalMonths
    const recallConfigs: Array<{
      recallType: "hygiene" | "periodic_exam" | "perio_maintenance";
      intervalMonths: number;
    }> = [
      { recallType: "hygiene", intervalMonths: 6 },
      { recallType: "perio_maintenance", intervalMonths: 3 },
    ];

    let createdCount = 0;

    for (const patient of allPatients) {
      if (!patient.isActive) continue;

      for (const config of recallConfigs) {
        const dedupeKey = `${patient._id}:${config.recallType}`;
        if (existingKeys.has(dedupeKey)) continue;

        // Determine if patient is overdue based on lastVisitDate
        const lastVisit = patient.lastVisitDate;
        if (!lastVisit) {
          // No visit on record — create a recall due for today
          await ctx.db.insert("recallDueList", {
            orgId: patient.orgId,
            patientId: patient._id,
            dueDate: now.toISOString().split("T")[0],
            recallType: config.recallType,
            intervalMonths: config.intervalMonths,
            outreachStatus: "pending",
            outreachAttempts: 0,
            createdAt: nowMs,
            updatedAt: nowMs,
          });
          existingKeys.add(dedupeKey);
          createdCount++;
          continue;
        }

        // Calculate due date: lastVisitDate + intervalMonths
        const lastVisitDate = new Date(lastVisit + "T00:00:00Z");
        const dueDate = new Date(lastVisitDate);
        dueDate.setMonth(dueDate.getMonth() + config.intervalMonths);
        const dueDateStr = dueDate.toISOString().split("T")[0];

        // Only create if due date has passed (patient is overdue)
        if (dueDateStr <= now.toISOString().split("T")[0]) {
          await ctx.db.insert("recallDueList", {
            orgId: patient.orgId,
            patientId: patient._id,
            dueDate: dueDateStr,
            recallType: config.recallType,
            intervalMonths: config.intervalMonths,
            outreachStatus: "pending",
            outreachAttempts: 0,
            createdAt: nowMs,
            updatedAt: nowMs,
          });
          existingKeys.add(dedupeKey);
          createdCount++;
        }
      }
    }

    return { createdCount };
  },
});
