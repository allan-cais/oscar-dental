import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";
import { MockClearinghouseAdapter } from "../integrations/clearinghouse/mock";

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

/**
 * Real-time eligibility verification.
 * Checks cache first, then calls clearinghouse if needed.
 */
export const verify = mutation({
  args: {
    patientId: v.id("patients"),
    appointmentId: v.optional(v.id("appointments")),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const now = Date.now();

    // 1. Get the patient record
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.orgId !== orgId) {
      throw new Error("Patient not found");
    }

    // 2. Check cache: look for a non-expired eligibility result for this patient
    const cachedResults = await ctx.db
      .query("eligibilityResults")
      .withIndex("by_patient", (q) =>
        q.eq("orgId", orgId).eq("patientId", args.patientId)
      )
      .order("desc")
      .collect();

    const cached = cachedResults.find((r) => r.expiresAt > now);
    if (cached) {
      // If we have a valid cached result and an appointmentId was provided
      // but the cached result isn't linked to it, we could optionally link it.
      // For now, just return the cached result.
      return { _id: cached._id, ...cached, fromCache: true };
    }

    // 3. No valid cache - get insurance info and call clearinghouse
    const insurance = patient.primaryInsurance;
    if (!insurance) {
      throw new Error("Patient has no primary insurance on file");
    }

    const adapter = new MockClearinghouseAdapter();
    const result = await adapter.verifyEligibility(
      insurance.payerId,
      insurance.memberId,
      {
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth,
        memberId: insurance.memberId,
        groupNumber: insurance.groupNumber,
        relationship: insurance.relationship,
      }
    );

    // 4. Map the clearinghouse benefits to the schema format
    const schemaBenefits = result.benefits
      ? {
          annualMaximum: result.benefits.annualMaximum,
          annualUsed: result.benefits.annualUsed,
          annualRemaining: result.benefits.annualRemaining,
          deductible: result.benefits.deductible,
          deductibleMet: result.benefits.deductibleMet,
          preventiveCoverage: result.benefits.preventiveCoverage,
          basicCoverage: result.benefits.basicCoverage,
          majorCoverage: result.benefits.majorCoverage,
          waitingPeriods: result.benefits.waitingPeriods?.map(
            (wp) => `${wp.category}: ${wp.monthsRemaining} months remaining`
          ),
        }
      : undefined;

    // 5. Store the result
    const resultId = await ctx.db.insert("eligibilityResults", {
      orgId,
      patientId: args.patientId,
      appointmentId: args.appointmentId,
      payerId: result.payerId,
      payerName: result.payerName,
      verifiedAt: result.verifiedAt,
      expiresAt: now + TWENTY_FOUR_HOURS,
      status: result.status,
      benefits: schemaBenefits,
      costEstimate: schemaBenefits?.annualRemaining,
      rawResponse: result.rawResponse,
      errorMessage: result.errorMessage,
      verifiedBy: "realtime",
      createdAt: now,
    });

    const stored = await ctx.db.get(resultId);
    return { ...stored, fromCache: false };
  },
});

/**
 * Internal mutation to store an eligibility result directly.
 * Used by the batch verification action.
 */
export const recordResult = internalMutation({
  args: {
    orgId: v.string(),
    patientId: v.id("patients"),
    appointmentId: v.optional(v.id("appointments")),
    payerId: v.string(),
    payerName: v.string(),
    verifiedAt: v.number(),
    expiresAt: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("error"),
      v.literal("pending")
    ),
    benefits: v.optional(
      v.object({
        annualMaximum: v.optional(v.number()),
        annualUsed: v.optional(v.number()),
        annualRemaining: v.optional(v.number()),
        deductible: v.optional(v.number()),
        deductibleMet: v.optional(v.number()),
        preventiveCoverage: v.optional(v.number()),
        basicCoverage: v.optional(v.number()),
        majorCoverage: v.optional(v.number()),
        waitingPeriods: v.optional(v.array(v.string())),
      })
    ),
    costEstimate: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    verifiedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("eligibilityResults", {
      orgId: args.orgId,
      patientId: args.patientId,
      appointmentId: args.appointmentId,
      payerId: args.payerId,
      payerName: args.payerName,
      verifiedAt: args.verifiedAt,
      expiresAt: args.expiresAt,
      status: args.status,
      benefits: args.benefits,
      costEstimate: args.costEstimate,
      errorMessage: args.errorMessage,
      verifiedBy: args.verifiedBy,
      createdAt: now,
    });
  },
});
