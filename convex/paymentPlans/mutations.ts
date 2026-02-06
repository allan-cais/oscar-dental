import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";
import { MockPaymentsAdapter } from "../integrations/payments/mock";

const payments = new MockPaymentsAdapter();

/**
 * Compute installment dates based on cadence.
 */
function generateInstallmentSchedule(
  totalAmount: number,
  numberOfInstallments: number,
  cadence: "weekly" | "biweekly" | "monthly",
  startDate: string
): Array<{ number: number; amount: number; dueDate: string; status: "pending" }> {
  const installmentAmount = Math.floor(totalAmount / numberOfInstallments);
  const remainder = totalAmount - installmentAmount * numberOfInstallments;

  const cadenceDays = cadence === "weekly" ? 7 : cadence === "biweekly" ? 14 : 30;
  const installments = [];

  for (let i = 0; i < numberOfInstallments; i++) {
    const start = new Date(startDate);
    start.setDate(start.getDate() + i * cadenceDays);
    const dueDate = start.toISOString().split("T")[0];

    // Add remainder to the last installment
    const amount = i === numberOfInstallments - 1
      ? installmentAmount + remainder
      : installmentAmount;

    installments.push({
      number: i + 1,
      amount,
      dueDate,
      status: "pending" as const,
    });
  }

  return installments;
}

/**
 * Create a new payment plan with generated installment schedule.
 */
export const create = mutation({
  args: {
    patientId: v.id("patients"),
    totalAmount: v.number(), // cents
    numberOfInstallments: v.number(),
    cadence: v.union(
      v.literal("weekly"),
      v.literal("biweekly"),
      v.literal("monthly")
    ),
    startDate: v.string(), // ISO date
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // Verify patient belongs to org
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.orgId !== orgId) {
      throw new Error("Patient not found");
    }

    if (args.numberOfInstallments < 2) {
      throw new Error("Payment plans require at least 2 installments");
    }

    const installments = generateInstallmentSchedule(
      args.totalAmount,
      args.numberOfInstallments,
      args.cadence,
      args.startDate
    );

    const installmentAmount = installments[0].amount;
    const now = Date.now();

    const planId = await ctx.db.insert("paymentPlans", {
      orgId,
      patientId: args.patientId,
      totalAmount: args.totalAmount,
      remainingAmount: args.totalAmount,
      installmentAmount,
      cadence: args.cadence,
      installments,
      status: "active",
      nextChargeDate: installments[0].dueDate,
      createdAt: now,
      updatedAt: now,
    });

    return { planId, installments };
  },
});

/**
 * Record a payment for a specific installment.
 * If all installments are paid, mark the plan as completed.
 */
export const recordPayment = mutation({
  args: {
    planId: v.id("paymentPlans"),
    installmentIndex: v.number(), // 0-based
    amount: v.number(), // cents
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const plan = await ctx.db.get(args.planId);
    if (!plan || plan.orgId !== orgId) {
      throw new Error("Payment plan not found");
    }

    if (plan.status !== "active") {
      throw new Error(`Cannot record payment for plan with status "${plan.status}"`);
    }

    if (args.installmentIndex < 0 || args.installmentIndex >= plan.installments.length) {
      throw new Error("Invalid installment index");
    }

    const installment = plan.installments[args.installmentIndex];
    if (installment.status === "paid") {
      throw new Error("Installment already paid");
    }

    // Create a payment record
    const now = Date.now();
    const paymentId = await ctx.db.insert("payments", {
      orgId,
      patientId: plan.patientId,
      paymentPlanId: args.planId,
      amount: args.amount,
      type: "payment_plan",
      method: "card",
      status: "completed",
      paidAt: now,
      notes: `Payment plan installment ${installment.number} of ${plan.installments.length}`,
      createdAt: now,
      updatedAt: now,
    });

    // Update the installment
    const updatedInstallments = [...plan.installments];
    updatedInstallments[args.installmentIndex] = {
      ...installment,
      status: "paid",
      paidAt: now,
      paymentId,
    };

    const newRemainingAmount = plan.remainingAmount - args.amount;
    const allPaid = updatedInstallments.every((i) => i.status === "paid");

    // Find the next pending installment date
    const nextPending = updatedInstallments.find((i) => i.status === "pending");

    await ctx.db.patch(args.planId, {
      installments: updatedInstallments,
      remainingAmount: Math.max(0, newRemainingAmount),
      status: allPaid ? "completed" : "active",
      nextChargeDate: nextPending?.dueDate,
      updatedAt: now,
    });

    return {
      paymentId,
      planStatus: allPaid ? "completed" : "active",
      remainingAmount: Math.max(0, newRemainingAmount),
    };
  },
});

/**
 * Cancel a payment plan.
 */
export const cancel = mutation({
  args: {
    planId: v.id("paymentPlans"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const plan = await ctx.db.get(args.planId);
    if (!plan || plan.orgId !== orgId) {
      throw new Error("Payment plan not found");
    }

    if (plan.status !== "active") {
      throw new Error(`Cannot cancel plan with status "${plan.status}"`);
    }

    const now = Date.now();
    await ctx.db.patch(args.planId, {
      status: "cancelled",
      nextChargeDate: undefined,
      updatedAt: now,
    });

    return { planId: args.planId, status: "cancelled" };
  },
});

/**
 * Internal mutation for cron: charge installments due today.
 * Iterates all orgs (no getOrgId call).
 * For each active plan with a pending installment due today,
 * attempts to charge the patient's card on file.
 */
export const chargeInstallment = internalMutation({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split("T")[0];

    // Get all active payment plans across all orgs
    const activePlans = await ctx.db
      .query("paymentPlans")
      .filter((q: any) => q.eq(q.field("status"), "active"))
      .collect();

    let charged = 0;
    let failed = 0;
    let skipped = 0;

    for (const plan of activePlans) {
      // Find the first pending installment due today
      const installmentIndex = plan.installments.findIndex(
        (i: any) => i.status === "pending" && i.dueDate === today
      );

      if (installmentIndex === -1) {
        continue;
      }

      const installment = plan.installments[installmentIndex];

      // Try to find an active card-on-file consent for this patient
      const consents = await ctx.db
        .query("cardOnFileConsents")
        .withIndex("by_patient", (q: any) =>
          q.eq("orgId", plan.orgId).eq("patientId", plan.patientId)
        )
        .collect();

      const activeConsent = consents.find((c: any) => c.isActive);

      if (!activeConsent) {
        skipped++;
        continue;
      }

      // Validate amount against auto-charge limit
      if (activeConsent.maxChargeAmount && installment.amount > activeConsent.maxChargeAmount) {
        skipped++;
        continue;
      }

      // Attempt charge
      const result = await payments.chargeCard(
        activeConsent.stripePaymentMethodId ?? "",
        installment.amount,
        activeConsent.stripeCustomerId ?? "",
        `Payment plan installment ${installment.number}`
      );

      const now = Date.now();

      if (result.success) {
        const paymentId = await ctx.db.insert("payments", {
          orgId: plan.orgId,
          patientId: plan.patientId,
          paymentPlanId: plan._id,
          amount: installment.amount,
          type: "payment_plan",
          method: "card",
          status: "completed",
          stripePaymentIntentId: result.transactionId,
          paidAt: now,
          notes: `Auto-charged installment ${installment.number}`,
          createdAt: now,
          updatedAt: now,
        });

        const updatedInstallments = [...plan.installments];
        updatedInstallments[installmentIndex] = {
          ...installment,
          status: "paid",
          paidAt: now,
          paymentId,
        };

        const newRemaining = plan.remainingAmount - installment.amount;
        const allPaid = updatedInstallments.every((i) => i.status === "paid");
        const nextPending = updatedInstallments.find((i) => i.status === "pending");

        await ctx.db.patch(plan._id, {
          installments: updatedInstallments,
          remainingAmount: Math.max(0, newRemaining),
          status: allPaid ? "completed" : "active",
          nextChargeDate: nextPending?.dueDate,
          updatedAt: now,
        });

        charged++;
      } else {
        // Mark installment as failed
        const updatedInstallments = [...plan.installments];
        updatedInstallments[installmentIndex] = {
          ...installment,
          status: "failed",
        };

        await ctx.db.patch(plan._id, {
          installments: updatedInstallments,
          updatedAt: now,
        });

        // Record the failed payment
        await ctx.db.insert("payments", {
          orgId: plan.orgId,
          patientId: plan.patientId,
          paymentPlanId: plan._id,
          amount: installment.amount,
          type: "payment_plan",
          method: "card",
          status: "failed",
          failedReason: result.failureMessage ?? "Card charge failed",
          notes: `Failed auto-charge installment ${installment.number}`,
          createdAt: now,
          updatedAt: now,
        });

        failed++;
      }
    }

    return { charged, failed, skipped, total: activePlans.length };
  },
});
