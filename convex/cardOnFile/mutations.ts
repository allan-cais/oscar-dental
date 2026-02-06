import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";
import { MockPaymentsAdapter } from "../integrations/payments/mock";

const payments = new MockPaymentsAdapter();

/**
 * Record a card-on-file consent for a patient.
 * Creates a consent record with a mock Stripe token.
 */
export const recordConsent = mutation({
  args: {
    patientId: v.id("patients"),
    last4: v.string(),
    cardBrand: v.string(),
    expiryMonth: v.number(),
    expiryYear: v.number(),
    autoChargeLimit: v.number(), // max amount in cents
    consentMethod: v.union(
      v.literal("in_person"),
      v.literal("online"),
      v.literal("phone")
    ),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // Verify patient belongs to org
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.orgId !== orgId) {
      throw new Error("Patient not found");
    }

    // Create a mock Stripe customer for this patient
    const customer = await payments.createCustomer({
      name: `${patient.firstName} ${patient.lastName}`,
      email: patient.email,
      phone: patient.phone,
      metadata: { oscarPatientId: patient.oscarPatientId },
    });

    // Deactivate any existing active consents for this patient
    const existingConsents = await ctx.db
      .query("cardOnFileConsents")
      .withIndex("by_patient", (q: any) =>
        q.eq("orgId", orgId).eq("patientId", args.patientId)
      )
      .collect();

    for (const consent of existingConsents) {
      if (consent.isActive) {
        await ctx.db.patch(consent._id, {
          isActive: false,
          revokedAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }

    const now = Date.now();
    const consentId = await ctx.db.insert("cardOnFileConsents", {
      orgId,
      patientId: args.patientId,
      stripeCustomerId: customer.customerId,
      stripePaymentMethodId: `pm_mock_${args.last4}_${now}`,
      last4: args.last4,
      brand: args.cardBrand,
      consentedAt: now,
      consentSource: args.consentMethod,
      maxChargeAmount: args.autoChargeLimit,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return { consentId, stripeCustomerId: customer.customerId };
  },
});

/**
 * Revoke a card-on-file consent.
 */
export const revokeConsent = mutation({
  args: { consentId: v.id("cardOnFileConsents") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const consent = await ctx.db.get(args.consentId);
    if (!consent || consent.orgId !== orgId) {
      throw new Error("Consent not found");
    }

    if (!consent.isActive) {
      throw new Error("Consent is already revoked");
    }

    const now = Date.now();
    await ctx.db.patch(args.consentId, {
      isActive: false,
      revokedAt: now,
      updatedAt: now,
    });

    return { consentId: args.consentId, status: "revoked" };
  },
});

/**
 * Charge a patient's card on file.
 * Validates amount does not exceed the auto-charge limit.
 * Creates a payment record upon success.
 */
export const chargeCard = mutation({
  args: {
    consentId: v.id("cardOnFileConsents"),
    amount: v.number(), // cents
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const consent = await ctx.db.get(args.consentId);
    if (!consent || consent.orgId !== orgId) {
      throw new Error("Consent not found");
    }

    if (!consent.isActive) {
      throw new Error("Card-on-file consent is not active");
    }

    // Validate amount against auto-charge limit
    if (consent.maxChargeAmount && args.amount > consent.maxChargeAmount) {
      throw new Error(
        `Amount $${(args.amount / 100).toFixed(2)} exceeds auto-charge limit of $${(consent.maxChargeAmount / 100).toFixed(2)}`
      );
    }

    // Charge via mock adapter
    const result = await payments.chargeCard(
      consent.stripePaymentMethodId ?? "",
      args.amount,
      consent.stripeCustomerId ?? "",
      args.description
    );

    const now = Date.now();

    if (result.success) {
      const paymentId = await ctx.db.insert("payments", {
        orgId,
        patientId: consent.patientId,
        amount: args.amount,
        type: "card_on_file",
        method: "card",
        status: "completed",
        stripePaymentIntentId: result.transactionId,
        paidAt: now,
        notes: args.description,
        createdAt: now,
        updatedAt: now,
      });

      return {
        success: true,
        paymentId,
        transactionId: result.transactionId,
        receiptUrl: result.receiptUrl,
      };
    }

    // Record failed payment
    const paymentId = await ctx.db.insert("payments", {
      orgId,
      patientId: consent.patientId,
      amount: args.amount,
      type: "card_on_file",
      method: "card",
      status: "failed",
      failedReason: result.failureMessage ?? "Card charge failed",
      notes: args.description,
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: false,
      paymentId,
      failureCode: result.failureCode,
      failureMessage: result.failureMessage,
    };
  },
});
