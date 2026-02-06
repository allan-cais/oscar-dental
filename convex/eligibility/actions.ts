import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { MockClearinghouseAdapter } from "../integrations/clearinghouse/mock";

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

/**
 * Batch eligibility verification action.
 * Runs daily (scheduled via crons.ts at 5:30 AM CT / 11:30 UTC).
 *
 * 1. Queries appointments for tomorrow
 * 2. For each, checks if the patient has a valid cached eligibility result
 * 3. If not, calls the clearinghouse and stores the result with verifiedBy="batch"
 * 4. Returns a summary of the run
 */
export const runBatchVerification = internalAction({
  handler: async (ctx): Promise<{
    total: number;
    verified: number;
    cached: number;
    failed: number;
  }> => {
    const now = Date.now();

    // Calculate tomorrow's date in ISO format
    const tomorrow = new Date(now + 24 * 60 * 60 * 1000);
    const tomorrowISO = tomorrow.toISOString().split("T")[0];

    // Query all appointments for tomorrow across all orgs
    // In a multi-tenant system we'd scope this, but batch runs across the platform
    // We query all appointments and group by org
    const allAppointments: Array<{
      _id: string;
      orgId: string;
      patientId: string;
      date: string;
      status: string;
    }> = await ctx.runQuery(internal.eligibility.actions._getTomorrowAppointments, {
      date: tomorrowISO,
    });

    const adapter = new MockClearinghouseAdapter();
    let verified = 0;
    let cached = 0;
    let failed = 0;

    for (const appointment of allAppointments) {
      try {
        // Check if patient already has a valid cached result
        const existingResult = await ctx.runQuery(
          internal.eligibility.actions._getValidEligibility,
          {
            orgId: appointment.orgId,
            patientId: appointment.patientId,
            now,
          }
        );

        if (existingResult) {
          cached++;
          continue;
        }

        // Get patient details for insurance info
        const patient = await ctx.runQuery(
          internal.eligibility.actions._getPatient,
          { patientId: appointment.patientId }
        );

        if (!patient?.primaryInsurance) {
          failed++;
          continue;
        }

        const insurance = patient.primaryInsurance;

        // Call clearinghouse
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

        // Map benefits to schema format
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
                (wp) =>
                  `${wp.category}: ${wp.monthsRemaining} months remaining`
              ),
            }
          : undefined;

        // Store the result via internal mutation
        await ctx.runMutation(internal.eligibility.mutations.recordResult, {
          orgId: appointment.orgId,
          patientId: appointment.patientId as any,
          appointmentId: appointment._id as any,
          payerId: result.payerId,
          payerName: result.payerName,
          verifiedAt: result.verifiedAt,
          expiresAt: now + TWENTY_FOUR_HOURS,
          status: result.status,
          benefits: schemaBenefits,
          costEstimate: schemaBenefits?.annualRemaining,
          errorMessage: result.errorMessage,
          verifiedBy: "batch",
        });

        if (result.status === "error") {
          failed++;
        } else {
          verified++;
        }
      } catch (error) {
        failed++;
        console.error(
          `Batch eligibility failed for appointment ${appointment._id}:`,
          error
        );
      }
    }

    const summary = {
      total: allAppointments.length,
      verified,
      cached,
      failed,
    };

    console.log("Batch eligibility verification complete:", summary);
    return summary;
  },
});

// ---------------------------------------------------------------------------
// Internal helper queries used by the batch action
// Actions cannot access ctx.db directly, so we use internal queries.
// ---------------------------------------------------------------------------

import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get all appointments for a given date (tomorrow).
 */
export const _getTomorrowAppointments = internalQuery({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    // Collect appointments across all orgs for the given date
    // We use the by_date index but need to scan across orgs
    // Since we don't know orgIds upfront in batch, collect all and filter
    const allAppointments = await ctx.db
      .query("appointments")
      .filter((q) =>
        q.and(
          q.eq(q.field("date"), args.date),
          q.neq(q.field("status"), "cancelled"),
          q.neq(q.field("status"), "no_show")
        )
      )
      .collect();

    return allAppointments.map((a) => ({
      _id: a._id,
      orgId: a.orgId,
      patientId: a.patientId,
      date: a.date,
      status: a.status,
    }));
  },
});

/**
 * Check if a patient has a valid (non-expired) eligibility result.
 */
export const _getValidEligibility = internalQuery({
  args: {
    orgId: v.string(),
    patientId: v.string(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("eligibilityResults")
      .withIndex("by_patient", (q) =>
        q.eq("orgId", args.orgId).eq("patientId", args.patientId as any)
      )
      .order("desc")
      .collect();

    return results.find((r) => r.expiresAt > args.now) ?? null;
  },
});

/**
 * Get a patient by ID.
 */
export const _getPatient = internalQuery({
  args: { patientId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.patientId as any);
  },
});
