import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

/**
 * Auto-generate a claim from a completed appointment.
 *
 * 1. Gets appointment data (must be completed)
 * 2. Gets patient insurance information
 * 3. Creates a claim in draft status
 * 4. Runs the scrub engine on the new claim
 *
 * Returns the claim ID and scrub result.
 */
export const autoGenerateClaim = action({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    // 1. Get the appointment
    const appointment: any = await ctx.runQuery(
      api.scheduling.queries.getById,
      { appointmentId: args.appointmentId }
    );

    if (!appointment) {
      throw new Error("Appointment not found");
    }

    if (appointment.status !== "completed") {
      throw new Error(
        `Appointment must be completed to generate a claim. Current status: "${appointment.status}"`
      );
    }

    if (!appointment.procedures || appointment.procedures.length === 0) {
      throw new Error("Appointment has no procedures to generate a claim from");
    }

    // 2. Get patient insurance info
    const insurance: any = await ctx.runQuery(
      api.patients.queries.getInsurance,
      { patientId: appointment.patientId }
    );

    if (!insurance.primaryInsurance) {
      throw new Error(
        "Patient has no primary insurance on file. Cannot auto-generate claim."
      );
    }

    const payer = insurance.primaryInsurance;

    // 3. Build procedures array matching the claims schema
    const procedures = appointment.procedures.map((proc: any) => ({
      code: proc.code,
      description: proc.description,
      fee: proc.fee,
      tooth: proc.tooth,
      surface: proc.surface,
      quantity: 1,
    }));

    const totalCharged = procedures.reduce(
      (sum: number, p: any) => sum + p.fee,
      0
    );

    // 4. Create the claim
    const claimId = await ctx.runMutation(api.claims.mutations.create, {
      practiceId: appointment.practiceId,
      patientId: appointment.patientId,
      appointmentId: args.appointmentId,
      payerId: payer.payerId,
      payerName: payer.payerName,
      procedures,
      totalCharged,
    });

    // 5. Run scrub on the new claim
    const scrubResult = await ctx.runMutation(api.claims.mutations.scrub, {
      claimId,
    });

    return {
      claimId,
      scrubResult,
    };
  },
});
