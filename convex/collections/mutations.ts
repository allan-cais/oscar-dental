import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";
import { MockSmsAdapter } from "../integrations/sms/mock";

// Step definitions: step index -> { day offset, action description }
const STEP_CONFIG = [
  { day: 0, action: "Generate statement" },
  { day: 7, action: "Send SMS reminder" },
  { day: 14, action: "Send email reminder" },
  { day: 30, action: "Phone call task" },
  { day: 60, action: "Final notice SMS" },
  { day: 90, action: "Escalate to collections agency" },
] as const;

/**
 * Create a new collection sequence for a patient.
 * Starts at step 0 (statement generation) with nextActionDate = now.
 */
export const create = mutation({
  args: {
    patientId: v.id("patients"),
    claimId: v.optional(v.id("claims")),
    balance: v.number(),
    practiceId: v.id("practices"),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // Verify patient belongs to org
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.orgId !== orgId) {
      throw new Error("Patient not found");
    }

    // Verify practice belongs to org
    const practice = await ctx.db.get(args.practiceId);
    if (!practice || practice.orgId !== orgId) {
      throw new Error("Practice not found");
    }

    // Verify claim if provided
    if (args.claimId) {
      const claim = await ctx.db.get(args.claimId);
      if (!claim || claim.orgId !== orgId) {
        throw new Error("Claim not found");
      }
    }

    if (args.balance <= 0) {
      throw new Error("Balance must be greater than zero");
    }

    const now = Date.now();

    // Build initial steps array
    const steps = STEP_CONFIG.map((config, index) => ({
      day: config.day,
      action: config.action,
      status: index === 0 ? ("pending" as const) : ("pending" as const),
      sentAt: undefined,
      response: undefined,
    }));

    const sequenceId = await ctx.db.insert("collectionSequences", {
      orgId,
      patientId: args.patientId,
      totalBalance: args.balance,
      currentStep: 0,
      status: "active",
      steps,
      startedAt: now,
      lastActionAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return sequenceId;
  },
});

/**
 * Internal mutation called by hourly cron to advance collection sequences.
 * For each active sequence where nextActionDate has passed, executes the current step
 * and advances to the next one.
 */
export const advanceStep = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Query all active sequences across all orgs (cron is system-wide)
    const activeSequences = await ctx.db
      .query("collectionSequences")
      .filter((q: any) => q.eq(q.field("status"), "active"))
      .collect();

    let advancedCount = 0;

    for (const seq of activeSequences) {
      const currentStep = seq.currentStep ?? 0;

      // Check if enough time has passed since sequence started
      const stepConfig = STEP_CONFIG[currentStep];
      if (!stepConfig) continue;

      const daysSinceStart = (now - seq.startedAt) / (1000 * 60 * 60 * 24);
      if (daysSinceStart < stepConfig.day) continue;

      // Check if this step was already executed
      const steps = [...seq.steps];
      if (steps[currentStep]?.status === "sent" || steps[currentStep]?.status === "completed") {
        // Already processed, try advancing to next step
        if (currentStep + 1 < STEP_CONFIG.length) {
          const nextStepConfig = STEP_CONFIG[currentStep + 1];
          if (daysSinceStart >= nextStepConfig.day) {
            await ctx.db.patch(seq._id, {
              currentStep: currentStep + 1,
              updatedAt: now,
            });
          }
        }
        continue;
      }

      // Execute the current step
      const patient = await ctx.db.get(seq.patientId);

      switch (currentStep) {
        case 0: {
          // Step 0: Generate statement
          steps[0] = {
            ...steps[0],
            status: "sent",
            sentAt: now,
            response: "Statement generated",
          };
          break;
        }
        case 1: {
          // Step 1 (Day 7): Send SMS reminder
          if (patient?.phone && patient?.smsConsent !== false) {
            const sms = new MockSmsAdapter();
            const result = await sms.sendSms(
              patient.phone,
              `Reminder: You have an outstanding balance of $${seq.totalBalance.toFixed(2)}. Please contact our office to arrange payment.`
            );
            steps[1] = {
              ...steps[1],
              status: result.status === "failed" ? "skipped" : "sent",
              sentAt: now,
              response: result.status === "failed" ? "SMS delivery failed" : `SMS sent: ${result.messageId}`,
            };
          } else {
            steps[1] = {
              ...steps[1],
              status: "skipped",
              sentAt: now,
              response: "No phone number or SMS consent not given",
            };
          }
          break;
        }
        case 2: {
          // Step 2 (Day 14): Send email reminder
          steps[2] = {
            ...steps[2],
            status: "sent",
            sentAt: now,
            response: patient?.email
              ? `Email reminder sent to ${patient.email}`
              : "No email on file - skipped",
          };
          break;
        }
        case 3: {
          // Step 3 (Day 30): Phone call task - create HITL task
          await ctx.db.insert("tasks", {
            orgId: seq.orgId,
            title: `Collection call: ${patient?.firstName ?? "Unknown"} ${patient?.lastName ?? "Patient"} - $${seq.totalBalance.toFixed(2)}`,
            description: `Phone call required for collection sequence. Patient balance: $${seq.totalBalance.toFixed(2)}. This is step 4 of the collections process (Day 30).`,
            resourceType: "collection",
            resourceId: seq._id,
            assignedRole: "billing",
            priority: "high",
            status: "open",
            slaDeadline: now + 48 * 60 * 60 * 1000, // 48 hour SLA
            slaStatus: "on_track",
            isHitlFallback: true,
            workPacket: JSON.stringify({
              action: "phone_call",
              patientId: seq.patientId,
              patientName: `${patient?.firstName ?? ""} ${patient?.lastName ?? ""}`.trim(),
              patientPhone: patient?.phone ?? "N/A",
              balance: seq.totalBalance,
              sequenceId: seq._id,
            }),
            createdAt: now,
            updatedAt: now,
          });

          steps[3] = {
            ...steps[3],
            status: "sent",
            sentAt: now,
            response: "HITL phone call task created",
          };
          break;
        }
        case 4: {
          // Step 4 (Day 60): Final notice SMS
          if (patient?.phone && patient?.smsConsent !== false) {
            const sms = new MockSmsAdapter();
            const result = await sms.sendSms(
              patient.phone,
              `FINAL NOTICE: Your balance of $${seq.totalBalance.toFixed(2)} is past due. Please contact our office immediately to avoid further action.`
            );
            steps[4] = {
              ...steps[4],
              status: result.status === "failed" ? "skipped" : "sent",
              sentAt: now,
              response: result.status === "failed" ? "SMS delivery failed" : `Final notice SMS sent: ${result.messageId}`,
            };
          } else {
            steps[4] = {
              ...steps[4],
              status: "skipped",
              sentAt: now,
              response: "No phone number or SMS consent not given",
            };
          }
          break;
        }
        case 5: {
          // Step 5 (Day 90): Escalate to collections agency
          steps[5] = {
            ...steps[5],
            status: "completed",
            sentAt: now,
            response: "Escalated to external collections agency",
          };

          // Update sequence status
          await ctx.db.patch(seq._id, {
            currentStep: 5,
            status: "completed",
            steps,
            lastActionAt: now,
            updatedAt: now,
          });

          // Create task for office manager
          await ctx.db.insert("tasks", {
            orgId: seq.orgId,
            title: `Collections agency referral: ${patient?.firstName ?? "Unknown"} ${patient?.lastName ?? "Patient"} - $${seq.totalBalance.toFixed(2)}`,
            description: `Patient has reached Day 90 of the collection sequence. Balance of $${seq.totalBalance.toFixed(2)} should be referred to external collections agency.`,
            resourceType: "collection",
            resourceId: seq._id,
            assignedRole: "office_manager",
            priority: "urgent",
            status: "open",
            isHitlFallback: true,
            workPacket: JSON.stringify({
              action: "agency_referral",
              patientId: seq.patientId,
              patientName: `${patient?.firstName ?? ""} ${patient?.lastName ?? ""}`.trim(),
              balance: seq.totalBalance,
              sequenceId: seq._id,
            }),
            createdAt: now,
            updatedAt: now,
          });

          advancedCount++;
          continue; // Already patched above
        }
      }

      // Advance to next step if not the final step
      const nextStep = currentStep + 1 < STEP_CONFIG.length ? currentStep + 1 : currentStep;

      await ctx.db.patch(seq._id, {
        currentStep: nextStep,
        steps,
        lastActionAt: now,
        updatedAt: now,
      });

      advancedCount++;
    }

    return { advancedCount };
  },
});

/**
 * Pause an active collection sequence.
 */
export const pause = mutation({
  args: { sequenceId: v.id("collectionSequences") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const seq = await ctx.db.get(args.sequenceId);
    if (!seq || seq.orgId !== orgId) {
      throw new Error("Collection sequence not found");
    }

    if (seq.status !== "active") {
      throw new Error("Can only pause active sequences");
    }

    await ctx.db.patch(args.sequenceId, {
      status: "paused",
      updatedAt: Date.now(),
    });

    return args.sequenceId;
  },
});

/**
 * Resume a paused collection sequence.
 */
export const resume = mutation({
  args: { sequenceId: v.id("collectionSequences") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const seq = await ctx.db.get(args.sequenceId);
    if (!seq || seq.orgId !== orgId) {
      throw new Error("Collection sequence not found");
    }

    if (seq.status !== "paused") {
      throw new Error("Can only resume paused sequences");
    }

    await ctx.db.patch(args.sequenceId, {
      status: "active",
      updatedAt: Date.now(),
    });

    return args.sequenceId;
  },
});

/**
 * Record a payment against a collection sequence.
 * If amount >= balance, marks sequence as paid.
 */
export const recordPayment = mutation({
  args: {
    sequenceId: v.id("collectionSequences"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const seq = await ctx.db.get(args.sequenceId);
    if (!seq || seq.orgId !== orgId) {
      throw new Error("Collection sequence not found");
    }

    if (args.amount <= 0) {
      throw new Error("Payment amount must be greater than zero");
    }

    const newBalance = Math.max(0, seq.totalBalance - args.amount);
    const now = Date.now();

    if (newBalance <= 0) {
      // Fully paid
      await ctx.db.patch(args.sequenceId, {
        totalBalance: 0,
        status: "paid",
        lastActionAt: now,
        updatedAt: now,
      });
    } else {
      // Partial payment
      await ctx.db.patch(args.sequenceId, {
        totalBalance: Math.round(newBalance * 100) / 100,
        lastActionAt: now,
        updatedAt: now,
      });
    }

    return {
      sequenceId: args.sequenceId,
      previousBalance: seq.totalBalance,
      paymentAmount: args.amount,
      newBalance: Math.round(newBalance * 100) / 100,
      status: newBalance <= 0 ? "paid" : "active",
    };
  },
});

/**
 * Update collection thresholds for a practice.
 * Stores custom step delays in practiceSettings.
 */
export const updateThresholds = mutation({
  args: {
    practiceId: v.id("practices"),
    thresholds: v.object({
      day0: v.number(),
      day7: v.number(),
      day14: v.number(),
      day30: v.number(),
      day60: v.number(),
      day90: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // Verify practice belongs to org
    const practice = await ctx.db.get(args.practiceId);
    if (!practice || practice.orgId !== orgId) {
      throw new Error("Practice not found");
    }

    // Find existing practiceSettings for this practice
    const existing = await ctx.db
      .query("practiceSettings")
      .withIndex("by_practice", (q: any) =>
        q.eq("practiceId", args.practiceId)
      )
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        collectionsThresholds: args.thresholds,
        updatedAt: now,
      });
      return existing._id;
    } else {
      const id = await ctx.db.insert("practiceSettings", {
        orgId,
        practiceId: args.practiceId,
        collectionsThresholds: args.thresholds,
        updatedAt: now,
      });
      return id;
    }
  },
});
