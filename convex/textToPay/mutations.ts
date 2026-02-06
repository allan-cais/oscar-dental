import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";
import { MockPaymentsAdapter } from "../integrations/payments/mock";
import { MockSmsAdapter } from "../integrations/sms/mock";

const payments = new MockPaymentsAdapter();
const sms = new MockSmsAdapter();

/**
 * Create a text-to-pay payment link.
 * Generates a mock Stripe payment link and creates a payment record.
 */
export const createPaymentLink = mutation({
  args: {
    patientId: v.id("patients"),
    amount: v.number(), // cents
    description: v.string(),
    dueDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // Verify patient belongs to org
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.orgId !== orgId) {
      throw new Error("Patient not found");
    }

    // Create payment link via adapter
    const link = await payments.createPaymentLink(
      args.amount,
      patient.oscarPatientId,
      args.description
    );

    const now = Date.now();
    const paymentId = await ctx.db.insert("payments", {
      orgId,
      patientId: args.patientId,
      amount: args.amount,
      type: "text_to_pay",
      method: "card",
      status: "pending",
      stripePaymentIntentId: link.linkId,
      stripePaymentLinkUrl: link.linkUrl,
      notes: args.dueDate
        ? `Due: ${args.dueDate}. ${args.description}`
        : args.description,
      createdAt: now,
      updatedAt: now,
    });

    return {
      paymentId,
      linkUrl: link.linkUrl,
      linkId: link.linkId,
    };
  },
});

/**
 * Send a payment link to a patient via SMS.
 * Updates the payment status to "processing" (sent).
 */
export const sendViaSms = mutation({
  args: {
    paymentId: v.id("payments"),
    phoneNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const payment = await ctx.db.get(args.paymentId);
    if (!payment || payment.orgId !== orgId || payment.type !== "text_to_pay") {
      throw new Error("Payment link not found");
    }

    if (payment.status !== "pending") {
      throw new Error(`Cannot send payment link with status "${payment.status}"`);
    }

    const linkUrl = payment.stripePaymentLinkUrl ?? "https://pay.stripe.com/test/unknown";
    const messageBody = `You have a payment of $${(payment.amount / 100).toFixed(2)} due. Pay securely here: ${linkUrl}`;

    const result = await sms.sendSms(args.phoneNumber, messageBody);

    const now = Date.now();
    await ctx.db.patch(args.paymentId, {
      status: "processing",
      smsDeliveredAt: now,
      updatedAt: now,
    });

    return {
      messageId: result.messageId,
      status: result.status,
    };
  },
});

/**
 * Mark a text-to-pay payment as paid.
 * In production this would be triggered by a Stripe webhook.
 */
export const markPaid = mutation({
  args: {
    paymentId: v.id("payments"),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const payment = await ctx.db.get(args.paymentId);
    if (!payment || payment.orgId !== orgId || payment.type !== "text_to_pay") {
      throw new Error("Payment link not found");
    }

    const now = Date.now();
    await ctx.db.patch(args.paymentId, {
      status: "completed",
      paidAt: now,
      updatedAt: now,
    });

    return { paymentId: args.paymentId, status: "completed" };
  },
});

/**
 * Expire a text-to-pay payment link.
 */
export const expire = mutation({
  args: {
    paymentId: v.id("payments"),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const payment = await ctx.db.get(args.paymentId);
    if (!payment || payment.orgId !== orgId || payment.type !== "text_to_pay") {
      throw new Error("Payment link not found");
    }

    if (payment.status === "completed") {
      throw new Error("Cannot expire a completed payment");
    }

    const now = Date.now();
    await ctx.db.patch(args.paymentId, {
      status: "failed",
      failedReason: "Payment link expired",
      updatedAt: now,
    });

    return { paymentId: args.paymentId, status: "failed" };
  },
});
