import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { NexHealthApiClient, NexHealthApiError } from "../integrations/nexhealth/client";

/**
 * Push seed data to NexHealth sandbox.
 * Creates appointments, payments, and adjustments via the NexHealth API
 * so that subsequent pull syncs bring real financial/scheduling data into Oscar.
 *
 * Run: npx convex run "nexhealth/seedPush:seedPushToNexHealth" '{"orgId":"org_canopy_dev","practiceId":"nd778yh1qn511h727tbzpeef5s80p9j4"}'
 */
export const seedPushToNexHealth = internalAction({
  args: {
    orgId: v.string(),
    practiceId: v.id("practices"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    appointmentsPushed: number;
    appointmentsErrors: string[];
    paymentsPushed: number;
    paymentsErrors: string[];
    adjustmentsPushed: number;
    adjustmentsErrors: string[];
  }> => {
    // 1. Get NexHealth config
    const config = await ctx.runQuery(
      internal.nexhealth.queries._getConfigInternal,
      { practiceId: args.practiceId, orgId: args.orgId }
    );

    if (!config) {
      return {
        appointmentsPushed: 0,
        appointmentsErrors: ["No NexHealth configuration found for this practice"],
        paymentsPushed: 0,
        paymentsErrors: [],
        adjustmentsPushed: 0,
        adjustmentsErrors: [],
      };
    }

    // 2. Create NexHealth API client and authenticate
    const client = new NexHealthApiClient({
      apiKey: config.apiKey,
      subdomain: config.subdomain,
      locationId: config.locationId,
      environment: config.environment,
    });
    await client.authenticate();

    // 3. Query Convex for patients, providers, operatories, and appointment types
    const patients = await ctx.runQuery(
      internal.nexhealth.queries.listPmsPatientIds,
      { orgId: args.orgId }
    );

    const providers = await ctx.runQuery(
      (internal.nexhealth.queries as any)._listPmsProviderIds,
      { orgId: args.orgId }
    );

    const appointmentTypes = await ctx.runQuery(
      (internal.nexhealth.queries as any)._listAppointmentTypes,
      { orgId: args.orgId }
    );

    // Query operatories from Convex for operatory_id
    const activeOperatories = await ctx.runQuery(
      (internal.nexhealth.queries as any)._listPmsOperatoryIds,
      { orgId: args.orgId }
    );

    if (patients.length === 0) {
      return {
        appointmentsPushed: 0,
        appointmentsErrors: ["No patients with pmsPatientId found — run full sync first"],
        paymentsPushed: 0,
        paymentsErrors: [],
        adjustmentsPushed: 0,
        adjustmentsErrors: [],
      };
    }

    if (providers.length === 0) {
      return {
        appointmentsPushed: 0,
        appointmentsErrors: ["No providers with pmsProviderId found — run full sync first"],
        paymentsPushed: 0,
        paymentsErrors: [],
        adjustmentsPushed: 0,
        adjustmentsErrors: [],
      };
    }

    // 4. Fetch payment types and adjustment types from NexHealth API
    let paymentTypeName = "Cash"; // fallback
    let adjustmentTypeName = "Adjustment"; // fallback
    try {
      const ptResp = await client.getPaymentTypes({ per_page: 10 });
      if (ptResp.data && ptResp.data.length > 0) {
        paymentTypeName = (ptResp.data[0] as any).name ?? "Cash";
      }
    } catch { /* use fallback */ }

    try {
      const atResp = await client.getAdjustmentTypes({ per_page: 10 });
      if (atResp.data && atResp.data.length > 0) {
        adjustmentTypeName = (atResp.data[0] as any).name ?? "Adjustment";
      }
    } catch { /* use fallback */ }

    // 5. Push appointments (20)
    const appointmentsErrors: string[] = [];
    let appointmentsPushed = 0;

    const appointmentSlots = [
      "09:00", "09:30", "10:00", "10:30", "11:00",
      "13:00", "13:30", "14:00", "14:30", "15:00",
      "09:00", "09:30", "10:00", "10:30", "11:00",
      "13:00", "13:30", "14:00", "14:30", "15:00",
    ];

    for (let i = 0; i < 20; i++) {
      try {
        const patient = patients[i % patients.length];
        const provider = providers[i % providers.length];
        const dayOffset = Math.floor(i / 2) + 1; // Spread across 1-10 days ahead
        const apptDate = new Date();
        apptDate.setDate(apptDate.getDate() + dayOffset);
        const dateStr = apptDate.toISOString().slice(0, 10);
        const startTime = appointmentSlots[i];

        const operatoryId = activeOperatories.length > 0
          ? Number(activeOperatories[i % activeOperatories.length].pmsOperatoryId)
          : undefined;

        const payload: Record<string, unknown> = {
          patient_id: Number(patient.pmsPatientId),
          provider_id: Number(provider.pmsProviderId),
          start_time: `${dateStr}T${startTime}:00`,
        };
        if (operatoryId) payload.operatory_id = operatoryId;

        // Only include appointment_type_id if the sandbox supports it — omit to avoid slot config errors

        await client.createAppointment(payload as any);
        appointmentsPushed++;
      } catch (err) {
        const msg = err instanceof NexHealthApiError
          ? `${err.message} — ${err.responseBody ?? ""}`
          : err instanceof Error ? err.message : "Unknown error";
        appointmentsErrors.push(`Appointment ${i + 1}: ${msg}`);
      }
    }

    // 6. Push payments (10) — all use the first available payment type
    const paymentsErrors: string[] = [];
    let paymentsPushed = 0;

    const paymentAmounts = [50, 75, 100, 150, 200, 250, 300, 125, 85, 500]; // dollars

    for (let i = 0; i < 10; i++) {
      try {
        const patient = patients[i % patients.length];

        const payload = {
          patient_id: Number(patient.pmsPatientId),
          amount: paymentAmounts[i],
          type_name: paymentTypeName,
          transaction_id: `API:oscar-seed-pay-${Date.now()}-${i}`,
        };

        await client.createPayment(payload as any);
        paymentsPushed++;
      } catch (err) {
        const msg = err instanceof NexHealthApiError
          ? `${err.message} — ${err.responseBody ?? ""}`
          : err instanceof Error ? err.message : "Unknown error";
        paymentsErrors.push(`Payment ${i + 1}: ${msg}`);
      }
    }

    // 7. Push adjustments (5) — all use the first available adjustment type
    const adjustmentsErrors: string[] = [];
    let adjustmentsPushed = 0;

    const adjustmentAmounts = [25, 50, 30, 75, 15]; // dollars

    for (let i = 0; i < 5; i++) {
      try {
        const patient = patients[i % patients.length];
        const provider = providers[i % providers.length];
        const providerId = String(Number(provider.pmsProviderId));

        const payload = {
          patient_id: Number(patient.pmsPatientId),
          amount: adjustmentAmounts[i],
          transaction_id: `API:oscar-seed-adj-${Date.now()}-${i}`,
          type_name: adjustmentTypeName,
          provider_splits: { [providerId]: String(adjustmentAmounts[i]) },
        };

        await client.createAdjustment(payload as any);
        adjustmentsPushed++;
      } catch (err) {
        const msg = err instanceof NexHealthApiError
          ? `${err.message} — ${err.responseBody ?? ""}`
          : err instanceof Error ? err.message : "Unknown error";
        adjustmentsErrors.push(`Adjustment ${i + 1}: ${msg}`);
      }
    }

    return {
      appointmentsPushed,
      appointmentsErrors,
      paymentsPushed,
      paymentsErrors,
      adjustmentsPushed,
      adjustmentsErrors,
    };
  },
});
