import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { NexHealthApiClient } from "../integrations/nexhealth/client";
import {
  mapNexHealthPatientToPms,
  mapNexHealthAppointmentToPms,
  mapNexHealthProviderToPms,
  mapNexHealthAppointmentTypeToPms,
  mapNexHealthInsuranceCoverageToPms,
  mapNexHealthPatientRecallToPms,
  mapNexHealthFeeScheduleToPms,
  mapNexHealthPaymentToPms,
  mapNexHealthChargeToPms,
  mapNexHealthInsurancePlanToPms,
  mapNexHealthProcedureToPms,
  mapNexHealthAdjustmentToPms,
  mapNexHealthGuarantorBalanceToPms,
  mapNexHealthInsuranceBalanceToPms,
  mapNexHealthTreatmentPlanToPms,
  mapNexHealthClaimToPms,
  mapNexHealthWorkingHourToPms,
} from "../integrations/nexhealth/mappers";

/**
 * Extract orgId from the auth identity in an action context.
 * Actions have ctx.auth but not the same helpers as queries/mutations.
 */
async function getActionOrgId(ctx: { auth: { getUserIdentity: () => Promise<any> } }): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  const orgId = (identity as Record<string, unknown>).org_id as string | undefined;
  if (!orgId) {
    throw new Error("No organization selected");
  }
  return orgId;
}

/**
 * Test a NexHealth connection for a practice.
 * Authenticates with the stored credentials and makes a lightweight API call.
 * Updates the connection status based on the result.
 */
export const testConnection = action({
  args: { practiceId: v.id("practices") },
  handler: async (ctx, args): Promise<{ success: boolean; providerCount?: number; error?: string }> => {
    const orgId = await getActionOrgId(ctx);

    const config = await ctx.runQuery(internal.nexhealth.queries._getConfigInternal, {
      practiceId: args.practiceId,
      orgId,
    });

    if (!config) {
      return { success: false, error: "No NexHealth configuration found for this practice" };
    }

    try {
      const client = new NexHealthApiClient({
        apiKey: config.apiKey,
        subdomain: config.subdomain,
        locationId: config.locationId,
        environment: config.environment,
      });

      await client.authenticate();
      const providersResponse = await client.getProviders({ per_page: 100 });
      const providerCount = providersResponse.data?.length ?? 0;

      await ctx.runMutation(internal.nexhealth.mutations.updateConnectionStatus, {
        configId: config._id,
        status: "connected",
      });

      return { success: true, providerCount };
    } catch (error) {
      await ctx.runMutation(internal.nexhealth.mutations.updateConnectionStatus, {
        configId: config._id,
        status: "error",
      });

      return { success: false, error: getErrorMessage(error) };
    }
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

/**
 * Extract an array from a NexHealth API response's `data` field.
 * NexHealth API v20240412 returns flat arrays for all endpoints (`{ data: [...] }`).
 * The nested object fallback (`{ data: { patients: [...] } }`) is retained for
 * backward compatibility with webhook event data and older response shapes.
 */
function extractDataArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data === null || data === undefined) return [];
  if (typeof data === "object") {
    const values = Object.values(data as Record<string, unknown>);
    for (const val of values) {
      if (Array.isArray(val)) return val;
    }
  }
  return [];
}

async function paginateFetch<T>(
  fetchPage: (params: { per_page: number; end_cursor?: string }) => Promise<{ data: unknown; page_info?: { has_next_page: boolean; end_cursor: string } }>,
  processItem: (item: any) => Promise<void>,
  stepName: string,
  errors: string[]
): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;
  const perPage = 100;
  let endCursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await fetchPage({ per_page: perPage, end_cursor: endCursor });
    const items = extractDataArray(response.data) as any[];

    for (const item of items) {
      try {
        await processItem(item);
        processed++;
      } catch (err) {
        failed++;
        errors.push(`${stepName} ${item.id}: ${getErrorMessage(err)}`);
      }
    }

    const pageInfo = (response as any).page_info;
    if (pageInfo?.has_next_page && pageInfo.end_cursor) {
      endCursor = pageInfo.end_cursor;
    } else {
      hasMore = false;
    }
  }

  return { processed, failed };
}

// ---------------------------------------------------------------------------
// Full Sync — Pull all data from NexHealth for a single practice
// ---------------------------------------------------------------------------

export const runFullSync = internalAction({
  args: {
    configId: v.id("nexhealthConfigs"),
    orgId: v.string(),
    practiceId: v.id("practices"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; processed?: number; failed?: number; error?: string }> => {
    // 1. Get full config
    const config = await ctx.runQuery(internal.nexhealth.queries._getConfigInternal, {
      practiceId: args.practiceId,
      orgId: args.orgId,
    });

    if (!config) {
      return { success: false, error: "No NexHealth configuration found for this practice" };
    }

    // 2. Create a sync job to track progress
    const jobId = await ctx.runMutation(internal.nexhealth.mutations._createSyncJobInternal, {
      orgId: args.orgId,
      practiceId: args.practiceId,
      jobType: "full_sync",
    });

    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      // 3. Create NexHealth API client and authenticate
      const client = new NexHealthApiClient({
        apiKey: config.apiKey,
        subdomain: config.subdomain,
        locationId: config.locationId,
        environment: config.environment,
      });
      await client.authenticate();

      // 4. Pull and upsert providers
      try {
        const result = await paginateFetch(
          (params) => client.getProviders(params),
          async (nhProvider) => {
            const pmsProvider = mapNexHealthProviderToPms(nhProvider);
            await ctx.runMutation(internal.nexhealth.mutations.upsertSyncedProvider, {
              orgId: args.orgId,
              practiceId: args.practiceId,
              pmsProviderId: pmsProvider.pmsProviderId,
              firstName: pmsProvider.firstName,
              lastName: pmsProvider.lastName,
              npi: pmsProvider.npi,
              type: pmsProvider.type,
              specialty: pmsProvider.specialty,
              isActive: pmsProvider.isActive,
            });
          },
          "Provider",
          errors
        );
        processed += result.processed;
        failed += result.failed;
      } catch (err) {
        errors.push(`Step 4 (providers): ${getErrorMessage(err)}`);
      }

      // 5. Pull and upsert operatories
      try {
        let endCursor: string | undefined;
        const perPage = 100;
        let hasMore = true;
        while (hasMore) {
          const response = await client.getOperatories({ per_page: perPage, end_cursor: endCursor } as any);
          for (const nhOperatory of extractDataArray(response.data) as any[]) {
            try {
              await ctx.runMutation(internal.nexhealth.mutations.upsertSyncedOperatory, {
                orgId: args.orgId,
                practiceId: args.practiceId,
                pmsOperatoryId: String(nhOperatory.id),
                name: nhOperatory.name,
                shortName: nhOperatory.short_name,
                isActive: !nhOperatory.inactive,
              });
              processed++;
            } catch (err) {
              failed++;
              errors.push(`Operatory ${nhOperatory.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
            }
          }
          const pageInfo = (response as any).page_info;
          if (pageInfo?.has_next_page && pageInfo.end_cursor) {
            endCursor = pageInfo.end_cursor;
          } else {
            hasMore = false;
          }
        }
      } catch (err) {
        errors.push(`Step 5 (operatories): ${err instanceof Error ? err.message : "Unknown error"}`);
      }

      // 6. Pull and upsert patients
      try {
        let endCursor: string | undefined;
        const perPage = 100;
        let hasMore = true;
        while (hasMore) {
          const response = await client.getPatients({ per_page: perPage, end_cursor: endCursor } as any);
          for (const nhPatient of extractDataArray(response.data) as any[]) {
            try {
              const pmsPatient = mapNexHealthPatientToPms(nhPatient);
              await ctx.runMutation(internal.nexhealth.mutations.upsertSyncedPatient, {
                orgId: args.orgId,
                practiceId: args.practiceId,
                pmsPatientId: pmsPatient.pmsPatientId,
                firstName: pmsPatient.firstName,
                lastName: pmsPatient.lastName,
                dateOfBirth: pmsPatient.dateOfBirth,
                gender: pmsPatient.gender,
                email: pmsPatient.email,
                phone: pmsPatient.phone,
                address: pmsPatient.address,
                isActive: pmsPatient.isActive,
              });
              processed++;
            } catch (err) {
              failed++;
              errors.push(`Patient ${nhPatient.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
            }
          }
          const pageInfo = (response as any).page_info;
          if (pageInfo?.has_next_page && pageInfo.end_cursor) {
            endCursor = pageInfo.end_cursor;
          } else {
            hasMore = false;
          }
        }
      } catch (err) {
        errors.push(`Step 6 (patients): ${err instanceof Error ? err.message : "Unknown error"}`);
      }

      // 7. Pull and upsert appointments (next 90 days)
      try {
        const today = new Date();
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 90);

        let endCursor: string | undefined;
        const perPage = 100;
        let hasMore = true;
        while (hasMore) {
          const response = await client.getAppointments({
            start: formatDate(today),
            end: formatDate(endDate),
            per_page: perPage,
            end_cursor: endCursor,
          } as any);
          for (const nhAppt of extractDataArray(response.data) as any[]) {
            try {
              const pmsAppt = mapNexHealthAppointmentToPms(nhAppt);
              await ctx.runMutation(internal.nexhealth.mutations.upsertSyncedAppointment, {
                orgId: args.orgId,
                practiceId: args.practiceId,
                pmsAppointmentId: pmsAppt.pmsAppointmentId,
                pmsPatientId: pmsAppt.patientId,
                pmsProviderId: pmsAppt.providerId,
                date: pmsAppt.date,
                startTime: pmsAppt.startTime,
                endTime: pmsAppt.endTime,
                duration: pmsAppt.duration,
                status: pmsAppt.status,
                notes: pmsAppt.notes,
              });
              processed++;
            } catch (err) {
              failed++;
              errors.push(`Appointment ${nhAppt.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
            }
          }
          const pageInfo = (response as any).page_info;
          if (pageInfo?.has_next_page && pageInfo.end_cursor) {
            endCursor = pageInfo.end_cursor;
          } else {
            hasMore = false;
          }
        }
      } catch (err) {
        errors.push(`Step 7 (appointments): ${err instanceof Error ? err.message : "Unknown error"}`);
      }

      // 8. Pull and upsert appointment types
      try {
        let endCursor: string | undefined;
        const perPage = 100;
        let hasMore = true;
        while (hasMore) {
          const response = await client.getAppointmentTypes({ per_page: perPage, end_cursor: endCursor } as any);
          for (const nhType of extractDataArray(response.data) as any[]) {
            try {
              const mapped = mapNexHealthAppointmentTypeToPms(nhType);
              await ctx.runMutation(internal.nexhealth.mutations.upsertSyncedAppointmentType, {
                orgId: args.orgId,
                practiceId: args.practiceId,
                pmsAppointmentTypeId: mapped.pmsAppointmentTypeId,
                name: mapped.name,
                duration: mapped.duration,
                color: mapped.color,
                isActive: mapped.isActive,
              });
              processed++;
            } catch (err) {
              failed++;
              errors.push(`AppointmentType ${nhType.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
            }
          }
          const pageInfo = (response as any).page_info;
          if (pageInfo?.has_next_page && pageInfo.end_cursor) {
            endCursor = pageInfo.end_cursor;
          } else {
            hasMore = false;
          }
        }
      } catch (err) {
        errors.push(`Step 8 (appointment_types): ${err instanceof Error ? err.message : "Unknown error"}`);
      }

      // 9. Pull and upsert fee schedules
      try {
        let endCursor: string | undefined;
        const perPage = 100;
        let hasMore = true;
        while (hasMore) {
          const response = await client.getFeeSchedules({ per_page: perPage, end_cursor: endCursor } as any);
          for (const nhFee of extractDataArray(response.data) as any[]) {
            try {
              const mapped = mapNexHealthFeeScheduleToPms(nhFee);
              await ctx.runMutation(internal.nexhealth.mutations.upsertSyncedFeeSchedule, {
                orgId: args.orgId,
                practiceId: args.practiceId,
                pmsFeeScheduleId: mapped.pmsFeeScheduleId,
                name: mapped.name,
                description: mapped.description,
                isDefault: mapped.isDefault,
              });
              processed++;
            } catch (err) {
              failed++;
              errors.push(`FeeSchedule ${nhFee.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
            }
          }
          const pageInfo = (response as any).page_info;
          if (pageInfo?.has_next_page && pageInfo.end_cursor) {
            endCursor = pageInfo.end_cursor;
          } else {
            hasMore = false;
          }
        }
      } catch (err) {
        errors.push(`Step 9 (fee_schedules): ${err instanceof Error ? err.message : "Unknown error"}`);
      }

      // 10. Pull and upsert patient recalls
      try {
        let endCursor: string | undefined;
        const perPage = 100;
        let hasMore = true;
        while (hasMore) {
          const response = await client.getPatientRecalls({ per_page: perPage, end_cursor: endCursor } as any);
          for (const nhRecall of extractDataArray(response.data) as any[]) {
            try {
              const mapped = mapNexHealthPatientRecallToPms(nhRecall);
              await ctx.runMutation(internal.nexhealth.mutations.upsertSyncedRecall, {
                orgId: args.orgId,
                practiceId: args.practiceId,
                pmsRecallId: mapped.pmsRecallId,
                pmsPatientId: mapped.patientId,
                recallTypeId: mapped.recallTypeId,
                dueDate: mapped.dueDate,
                status: mapped.status,
                completedDate: mapped.completedDate,
              });
              processed++;
            } catch (err) {
              failed++;
              errors.push(`Recall ${nhRecall.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
            }
          }
          const pageInfo = (response as any).page_info;
          if (pageInfo?.has_next_page && pageInfo.end_cursor) {
            endCursor = pageInfo.end_cursor;
          } else {
            hasMore = false;
          }
        }
      } catch (err) {
        errors.push(`Step 10 (recalls): ${err instanceof Error ? err.message : "Unknown error"}`);
      }

      // 11. Pull and upsert insurance plans (before coverages so plan names are available for lookup)
      try {
        let endCursor: string | undefined;
        const perPage = 100;
        let hasMore = true;
        while (hasMore) {
          const response = await client.getInsurancePlans({ per_page: perPage, end_cursor: endCursor } as any);
          for (const item of extractDataArray(response.data) as any[]) {
            try {
              const mapped = mapNexHealthInsurancePlanToPms(item);
              await ctx.runMutation(internal.nexhealth.mutations.upsertSyncedInsurancePlan, {
                orgId: args.orgId,
                ...mapped,
              });
              processed++;
            } catch (err) {
              failed++;
              errors.push(`InsurancePlan ${item.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
            }
          }
          const pageInfo = (response as any).page_info;
          if (pageInfo?.has_next_page && pageInfo.end_cursor) {
            endCursor = pageInfo.end_cursor;
          } else {
            hasMore = false;
          }
        }
      } catch (err) {
        errors.push(`Step 11 (insurance_plans): ${err instanceof Error ? err.message : "Unknown error"}`);
      }

      // 12. Pull and upsert insurance coverages (bulk, then per-patient fallback)
      try {
        let endCursor: string | undefined;
        const perPage = 100;
        let hasMore = true;
        let coverageCount = 0;
        while (hasMore) {
          const response = await client.getInsuranceCoverages({ per_page: perPage, end_cursor: endCursor } as any);
          for (const nhCoverage of extractDataArray(response.data) as any[]) {
            try {
              const mapped = mapNexHealthInsuranceCoverageToPms(nhCoverage);
              await ctx.runMutation(internal.nexhealth.mutations.upsertSyncedInsuranceCoverage, {
                orgId: args.orgId,
                practiceId: args.practiceId,
                pmsInsuranceCoverageId: mapped.pmsInsuranceCoverageId,
                pmsPatientId: mapped.patientId,
                insurancePlanId: mapped.insurancePlanId,
                memberId: mapped.memberId,
                groupNumber: mapped.groupNumber,
                subscriberName: mapped.subscriberName,
                subscriberDob: mapped.subscriberDob,
                relationship: mapped.relationship,
                rank: mapped.rank,
                effectiveDate: mapped.effectiveDate,
                terminationDate: mapped.terminationDate,
              });
              processed++;
              coverageCount++;
            } catch (err) {
              failed++;
              errors.push(`InsuranceCoverage ${nhCoverage.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
            }
          }
          const pageInfo = (response as any).page_info;
          if (pageInfo?.has_next_page && pageInfo.end_cursor) {
            endCursor = pageInfo.end_cursor;
          } else {
            hasMore = false;
          }
        }

        // Per-patient fallback: if bulk returned no coverages, try fetching per-patient
        if (coverageCount === 0) {
          const patients = await ctx.runQuery(internal.nexhealth.queries.listPmsPatientIds, {
            orgId: args.orgId,
          });
          for (const p of patients) {
            try {
              const resp = await client.getInsuranceCoverages({ patient_id: Number(p.pmsPatientId), per_page: 50 } as any);
              for (const nhCoverage of extractDataArray(resp.data) as any[]) {
                const mapped = mapNexHealthInsuranceCoverageToPms(nhCoverage);
                await ctx.runMutation(internal.nexhealth.mutations.upsertSyncedInsuranceCoverage, {
                  orgId: args.orgId,
                  practiceId: args.practiceId,
                  pmsInsuranceCoverageId: mapped.pmsInsuranceCoverageId,
                  pmsPatientId: mapped.patientId,
                  insurancePlanId: mapped.insurancePlanId,
                  memberId: mapped.memberId,
                  groupNumber: mapped.groupNumber,
                  subscriberName: mapped.subscriberName,
                  subscriberDob: mapped.subscriberDob,
                  relationship: mapped.relationship,
                  rank: mapped.rank,
                  effectiveDate: mapped.effectiveDate,
                  terminationDate: mapped.terminationDate,
                });
                processed++;
              }
            } catch {
              // Per-patient coverage fetch may 404 — skip silently
            }
          }
        }
      } catch (err) {
        errors.push(`Step 12 (insurance_coverages): ${err instanceof Error ? err.message : "Unknown error"}`);
      }

      // 13. Pull and upsert procedures
      try {
        let endCursor: string | undefined;
        const perPage = 100;
        let hasMore = true;
        while (hasMore) {
          const response = await client.getProcedures({ per_page: perPage, end_cursor: endCursor } as any);
          for (const item of extractDataArray(response.data) as any[]) {
            try {
              const mapped = mapNexHealthProcedureToPms(item);
              await ctx.runMutation(internal.nexhealth.mutations.upsertSyncedProcedure, {
                orgId: args.orgId,
                pmsProcedureId: mapped.pmsProcedureId,
                pmsPatientId: mapped.patientId,
                pmsAppointmentId: mapped.appointmentId,
                pmsProviderId: mapped.providerId,
                code: mapped.code,
                description: mapped.description,
                fee: mapped.fee,
                tooth: mapped.tooth,
                surface: mapped.surface,
                status: mapped.status,
                completedAt: mapped.completedAt,
                foreignId: mapped.foreignId,
              });
              processed++;
            } catch (err) {
              failed++;
              errors.push(`Procedure ${item.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
            }
          }
          const pageInfo = (response as any).page_info;
          if (pageInfo?.has_next_page && pageInfo.end_cursor) {
            endCursor = pageInfo.end_cursor;
          } else {
            hasMore = false;
          }
        }
      } catch (err) {
        errors.push(`Step 13 (procedures): ${err instanceof Error ? err.message : "Unknown error"}`);
      }

      // 14. Pull and upsert charges
      try {
        let endCursor: string | undefined;
        const perPage = 100;
        let hasMore = true;
        while (hasMore) {
          const response = await client.getCharges({ per_page: perPage, end_cursor: endCursor } as any);
          for (const item of extractDataArray(response.data) as any[]) {
            try {
              const mapped = mapNexHealthChargeToPms(item);
              await ctx.runMutation(internal.nexhealth.mutations.upsertSyncedCharge, {
                orgId: args.orgId,
                pmsChargeId: mapped.pmsChargeId,
                pmsPatientId: mapped.patientId,
                pmsProviderId: mapped.providerId,
                amount: mapped.amount,
                procedureCode: mapped.procedureCode,
                description: mapped.description,
                date: mapped.date,
                status: mapped.status,
                pmsClaimId: mapped.claimId,
                foreignId: mapped.foreignId,
              });
              processed++;
            } catch (err) {
              failed++;
              errors.push(`Charge ${item.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
            }
          }
          const pageInfo = (response as any).page_info;
          if (pageInfo?.has_next_page && pageInfo.end_cursor) {
            endCursor = pageInfo.end_cursor;
          } else {
            hasMore = false;
          }
        }
      } catch (err) {
        errors.push(`Step 14 (charges): ${err instanceof Error ? err.message : "Unknown error"}`);
      }

      // 15. Pull and upsert PMS payments
      try {
        let endCursor: string | undefined;
        const perPage = 100;
        let hasMore = true;
        while (hasMore) {
          const response = await client.getPayments({ per_page: perPage, end_cursor: endCursor } as any);
          for (const item of extractDataArray(response.data) as any[]) {
            try {
              const mapped = mapNexHealthPaymentToPms(item);
              await ctx.runMutation(internal.nexhealth.mutations.upsertSyncedPmsPayment, {
                orgId: args.orgId,
                pmsPaymentId: mapped.pmsPaymentId,
                pmsPatientId: mapped.patientId,
                amount: mapped.amount,
                paymentTypeId: mapped.paymentTypeId,
                paymentMethod: mapped.paymentMethod,
                date: mapped.date,
                note: mapped.note,
                pmsClaimId: mapped.claimId,
                foreignId: mapped.foreignId,
              });
              processed++;
            } catch (err) {
              failed++;
              errors.push(`PmsPayment ${item.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
            }
          }
          const pageInfo = (response as any).page_info;
          if (pageInfo?.has_next_page && pageInfo.end_cursor) {
            endCursor = pageInfo.end_cursor;
          } else {
            hasMore = false;
          }
        }
      } catch (err) {
        errors.push(`Step 15 (payments): ${err instanceof Error ? err.message : "Unknown error"}`);
      }

      // 16. Pull and upsert adjustments
      try {
        let endCursor: string | undefined;
        const perPage = 100;
        let hasMore = true;
        while (hasMore) {
          const response = await client.getAdjustments({ per_page: perPage, end_cursor: endCursor } as any);
          for (const item of extractDataArray(response.data) as any[]) {
            try {
              const mapped = mapNexHealthAdjustmentToPms(item);
              await ctx.runMutation(internal.nexhealth.mutations.upsertSyncedAdjustment, {
                orgId: args.orgId,
                pmsAdjustmentId: mapped.pmsAdjustmentId,
                pmsPatientId: mapped.patientId,
                pmsProviderId: mapped.providerId,
                amount: mapped.amount,
                adjustmentTypeId: mapped.adjustmentTypeId,
                description: mapped.description,
                date: mapped.date,
                foreignId: mapped.foreignId,
              });
              processed++;
            } catch (err) {
              failed++;
              errors.push(`Adjustment ${item.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
            }
          }
          const pageInfo = (response as any).page_info;
          if (pageInfo?.has_next_page && pageInfo.end_cursor) {
            endCursor = pageInfo.end_cursor;
          } else {
            hasMore = false;
          }
        }
      } catch (err) {
        errors.push(`Step 16 (adjustments): ${err instanceof Error ? err.message : "Unknown error"}`);
      }

      // 17. Pull and upsert guarantor balances
      try {
        let endCursor: string | undefined;
        const perPage = 100;
        let hasMore = true;
        while (hasMore) {
          const response = await client.getGuarantorBalances({ per_page: perPage, end_cursor: endCursor } as any);
          for (const item of extractDataArray(response.data) as any[]) {
            try {
              const mapped = mapNexHealthGuarantorBalanceToPms(item);
              await ctx.runMutation(internal.nexhealth.mutations.upsertSyncedGuarantorBalance, {
                orgId: args.orgId,
                pmsGuarantorBalanceId: mapped.pmsGuarantorBalanceId,
                pmsPatientId: mapped.patientId,
                balance: mapped.balance,
                lastPaymentDate: mapped.lastPaymentDate,
                lastPaymentAmount: mapped.lastPaymentAmount,
                foreignId: mapped.foreignId,
              });
              processed++;
            } catch (err) {
              failed++;
              errors.push(`GuarantorBalance ${item.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
            }
          }
          const pageInfo = (response as any).page_info;
          if (pageInfo?.has_next_page && pageInfo.end_cursor) {
            endCursor = pageInfo.end_cursor;
          } else {
            hasMore = false;
          }
        }
      } catch (err) {
        errors.push(`Step 17 (guarantor_balances): ${err instanceof Error ? err.message : "Unknown error"}`);
      }

      // 18. Pull and upsert insurance balances
      try {
        let endCursor: string | undefined;
        const perPage = 100;
        let hasMore = true;
        while (hasMore) {
          const response = await client.getInsuranceBalances({ per_page: perPage, end_cursor: endCursor } as any);
          for (const item of extractDataArray(response.data) as any[]) {
            try {
              const mapped = mapNexHealthInsuranceBalanceToPms(item);
              await ctx.runMutation(internal.nexhealth.mutations.upsertSyncedInsuranceBalance, {
                orgId: args.orgId,
                pmsInsuranceBalanceId: mapped.pmsInsuranceBalanceId,
                pmsPatientId: mapped.patientId,
                insurancePlanId: mapped.insurancePlanId,
                balance: mapped.balance,
                foreignId: mapped.foreignId,
              });
              processed++;
            } catch (err) {
              failed++;
              errors.push(`InsuranceBalance ${item.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
            }
          }
          const pageInfo = (response as any).page_info;
          if (pageInfo?.has_next_page && pageInfo.end_cursor) {
            endCursor = pageInfo.end_cursor;
          } else {
            hasMore = false;
          }
        }
      } catch (err) {
        errors.push(`Step 18 (insurance_balances): ${err instanceof Error ? err.message : "Unknown error"}`);
      }

      // 19. Pull and upsert treatment plans
      try {
        let endCursor: string | undefined;
        const perPage = 100;
        let hasMore = true;
        while (hasMore) {
          const response = await client.getTreatmentPlans({ per_page: perPage, end_cursor: endCursor } as any);
          for (const item of extractDataArray(response.data) as any[]) {
            try {
              const mapped = mapNexHealthTreatmentPlanToPms(item);
              await ctx.runMutation(internal.nexhealth.mutations.upsertSyncedTreatmentPlan, {
                orgId: args.orgId,
                pmsTreatmentPlanId: mapped.pmsTreatmentPlanId,
                pmsPatientId: mapped.patientId,
                pmsProviderId: mapped.providerId,
                name: mapped.name,
                status: mapped.status,
                totalFee: mapped.totalFee,
                procedures: mapped.procedures,
                foreignId: mapped.foreignId,
              });
              processed++;
            } catch (err) {
              failed++;
              errors.push(`TreatmentPlan ${item.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
            }
          }
          const pageInfo = (response as any).page_info;
          if (pageInfo?.has_next_page && pageInfo.end_cursor) {
            endCursor = pageInfo.end_cursor;
          } else {
            hasMore = false;
          }
        }
      } catch (err) {
        errors.push(`Step 19 (treatment_plans): ${err instanceof Error ? err.message : "Unknown error"}`);
      }

      // 20. Pull and upsert PMS claims
      try {
        let endCursor: string | undefined;
        const perPage = 100;
        let hasMore = true;
        while (hasMore) {
          const response = await client.getClaims({ per_page: perPage, end_cursor: endCursor } as any);
          for (const item of extractDataArray(response.data) as any[]) {
            try {
              const mapped = mapNexHealthClaimToPms(item);
              await ctx.runMutation(internal.nexhealth.mutations.upsertSyncedPmsClaim, {
                orgId: args.orgId,
                pmsClaimId: mapped.pmsClaimId,
                pmsPatientId: mapped.patientId,
                insurancePlanId: mapped.insurancePlanId,
                totalAmount: mapped.totalAmount,
                paidAmount: mapped.paidAmount,
                status: mapped.status,
                submittedDate: mapped.submittedDate,
                foreignId: mapped.foreignId,
              });
              processed++;
            } catch (err) {
              failed++;
              errors.push(`PmsClaim ${item.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
            }
          }
          const pageInfo = (response as any).page_info;
          if (pageInfo?.has_next_page && pageInfo.end_cursor) {
            endCursor = pageInfo.end_cursor;
          } else {
            hasMore = false;
          }
        }
      } catch (err) {
        errors.push(`Step 20 (claims): ${err instanceof Error ? err.message : "Unknown error"}`);
      }

      // 21. Pull and upsert working hours
      try {
        let endCursor: string | undefined;
        const perPage = 100;
        let hasMore = true;
        while (hasMore) {
          const response = await client.getWorkingHours({ per_page: perPage, end_cursor: endCursor } as any);
          for (const item of extractDataArray(response.data) as any[]) {
            try {
              const mapped = mapNexHealthWorkingHourToPms(item);
              await ctx.runMutation(internal.nexhealth.mutations.upsertSyncedWorkingHour, {
                orgId: args.orgId,
                pmsWorkingHourId: mapped.pmsWorkingHourId,
                pmsProviderId: mapped.providerId,
                dayOfWeek: mapped.dayOfWeek,
                startTime: mapped.startTime,
                endTime: mapped.endTime,
                locationId: mapped.locationId,
                isActive: mapped.isActive,
                foreignId: mapped.foreignId,
              });
              processed++;
            } catch (err) {
              failed++;
              errors.push(`WorkingHour ${item.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
            }
          }
          const pageInfo = (response as any).page_info;
          if (pageInfo?.has_next_page && pageInfo.end_cursor) {
            endCursor = pageInfo.end_cursor;
          } else {
            hasMore = false;
          }
        }
      } catch (err) {
        errors.push(`Step 21 (working_hours): ${err instanceof Error ? err.message : "Unknown error"}`);
      }

      // 22. Complete sync job as successful
      await ctx.runMutation(internal.nexhealth.mutations._completeSyncJobInternal, {
        jobId,
        status: "completed",
        recordsProcessed: processed,
        recordsFailed: failed,
        errors: errors.length > 0 ? errors : undefined,
      });

      // 23. Update connection status
      await ctx.runMutation(internal.nexhealth.mutations.updateConnectionStatus, {
        configId: args.configId,
        status: "connected",
      });

      return { success: true, processed, failed };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      errors.push(`Full sync failed: ${message}`);

      // Mark sync job as failed
      await ctx.runMutation(internal.nexhealth.mutations._completeSyncJobInternal, {
        jobId,
        status: "failed",
        recordsProcessed: processed,
        recordsFailed: failed,
        errors,
      });

      // Update connection status to error
      await ctx.runMutation(internal.nexhealth.mutations.updateConnectionStatus, {
        configId: args.configId,
        status: "error",
      });

      return { success: false, processed, failed, error: message };
    }
  },
});

// ---------------------------------------------------------------------------
// Incremental Sync — Pull recently changed data for all active configs
// Called by cron (no args required).
// ---------------------------------------------------------------------------

export const runIncrementalSync = internalAction({
  args: {},
  handler: async (
    ctx
  ): Promise<{
    configsProcessed: number;
    totalProcessed: number;
    totalFailed: number;
    errors: string[];
  }> => {
    // 1. Get all active NexHealth configs across all orgs
    const configs = await ctx.runQuery(internal.nexhealth.queries._listActiveConfigs, {});

    let configsProcessed = 0;
    let totalProcessed = 0;
    let totalFailed = 0;
    const allErrors: string[] = [];

    // 2. Process each config independently
    for (const config of configs) {
      try {
        let processed = 0;
        let failed = 0;

        // a. Determine the updated_since cutoff
        const lastSyncAt = await ctx.runQuery(
          internal.nexhealth.queries._getLastSyncTimestamp,
          { configId: config._id }
        );

        let updatedSince: string;
        if (lastSyncAt) {
          updatedSince = new Date(lastSyncAt).toISOString();
        } else {
          // Default to 24 hours ago if no previous sync
          const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          updatedSince = twentyFourHoursAgo.toISOString();
        }

        // b. Create NexHealth API client and authenticate
        const client = new NexHealthApiClient({
          apiKey: config.apiKey,
          subdomain: config.subdomain,
          locationId: config.locationId,
          environment: config.environment,
        });
        await client.authenticate();

        // c. Pull and upsert patients updated since last sync
        {
          let endCursor: string | undefined;
          const perPage = 100;
          let hasMore = true;
          while (hasMore) {
            const response = await client.getPatients({
              per_page: perPage,
              end_cursor: endCursor,
              updated_since: updatedSince,
            } as any);
            for (const nhPatient of extractDataArray(response.data) as any[]) {
              try {
                const pmsPatient = mapNexHealthPatientToPms(nhPatient);
                await ctx.runMutation(internal.nexhealth.mutations.upsertSyncedPatient, {
                  orgId: config.orgId,
                  practiceId: config.practiceId,
                  pmsPatientId: pmsPatient.pmsPatientId,
                  firstName: pmsPatient.firstName,
                  lastName: pmsPatient.lastName,
                  dateOfBirth: pmsPatient.dateOfBirth,
                  gender: pmsPatient.gender,
                  email: pmsPatient.email,
                  phone: pmsPatient.phone,
                  address: pmsPatient.address,
                  isActive: pmsPatient.isActive,
                });
                processed++;
              } catch (err) {
                failed++;
                allErrors.push(
                  `Config ${config._id} Patient ${nhPatient.id}: ${err instanceof Error ? err.message : "Unknown error"}`
                );
              }
            }
            const pageInfo = (response as any).page_info;
            if (pageInfo?.has_next_page && pageInfo.end_cursor) {
              endCursor = pageInfo.end_cursor;
            } else {
              hasMore = false;
            }
          }
        }

        // d. Pull and upsert appointments updated since last sync
        {
          let endCursor: string | undefined;
          const perPage = 100;
          let hasMore = true;
          while (hasMore) {
            const response = await client.getAppointments({
              per_page: perPage,
              end_cursor: endCursor,
              updated_since: updatedSince,
              start: "2020-01-01",
              end: "2030-12-31",
            } as any);
            for (const nhAppt of extractDataArray(response.data) as any[]) {
              try {
                const pmsAppt = mapNexHealthAppointmentToPms(nhAppt);
                await ctx.runMutation(internal.nexhealth.mutations.upsertSyncedAppointment, {
                  orgId: config.orgId,
                  practiceId: config.practiceId,
                  pmsAppointmentId: pmsAppt.pmsAppointmentId,
                  pmsPatientId: pmsAppt.patientId,
                  pmsProviderId: pmsAppt.providerId,
                  date: pmsAppt.date,
                  startTime: pmsAppt.startTime,
                  endTime: pmsAppt.endTime,
                  duration: pmsAppt.duration,
                  status: pmsAppt.status,
                  notes: pmsAppt.notes,
                });
                processed++;
              } catch (err) {
                failed++;
                allErrors.push(
                  `Config ${config._id} Appointment ${nhAppt.id}: ${err instanceof Error ? err.message : "Unknown error"}`
                );
              }
            }
            const pageInfo = (response as any).page_info;
            if (pageInfo?.has_next_page && pageInfo.end_cursor) {
              endCursor = pageInfo.end_cursor;
            } else {
              hasMore = false;
            }
          }
        }

        // e. Pull and upsert insurance coverages
        {
          let endCursor: string | undefined;
          const perPage = 100;
          let hasMore = true;
          while (hasMore) {
            const response = await client.getInsuranceCoverages({
              per_page: perPage,
              end_cursor: endCursor,
            } as any);
            for (const nhCoverage of extractDataArray(response.data) as any[]) {
              try {
                const mapped = mapNexHealthInsuranceCoverageToPms(nhCoverage);
                await ctx.runMutation(internal.nexhealth.mutations.upsertSyncedInsuranceCoverage, {
                  orgId: config.orgId,
                  practiceId: config.practiceId,
                  pmsInsuranceCoverageId: mapped.pmsInsuranceCoverageId,
                  pmsPatientId: mapped.patientId,
                  insurancePlanId: mapped.insurancePlanId,
                  memberId: mapped.memberId,
                  groupNumber: mapped.groupNumber,
                  subscriberName: mapped.subscriberName,
                  subscriberDob: mapped.subscriberDob,
                  relationship: mapped.relationship,
                  rank: mapped.rank,
                  effectiveDate: mapped.effectiveDate,
                  terminationDate: mapped.terminationDate,
                });
                processed++;
              } catch (err) {
                failed++;
                allErrors.push(
                  `Config ${config._id} InsuranceCoverage ${nhCoverage.id}: ${err instanceof Error ? err.message : "Unknown error"}`
                );
              }
            }
            const pageInfo = (response as any).page_info;
            if (pageInfo?.has_next_page && pageInfo.end_cursor) {
              endCursor = pageInfo.end_cursor;
            } else {
              hasMore = false;
            }
          }
        }

        // f. Pull and upsert patient recalls
        {
          let endCursor: string | undefined;
          const perPage = 100;
          let hasMore = true;
          while (hasMore) {
            const response = await client.getPatientRecalls({
              per_page: perPage,
              end_cursor: endCursor,
            } as any);
            for (const nhRecall of extractDataArray(response.data) as any[]) {
              try {
                const mapped = mapNexHealthPatientRecallToPms(nhRecall);
                await ctx.runMutation(internal.nexhealth.mutations.upsertSyncedRecall, {
                  orgId: config.orgId,
                  practiceId: config.practiceId,
                  pmsRecallId: mapped.pmsRecallId,
                  pmsPatientId: mapped.patientId,
                  recallTypeId: mapped.recallTypeId,
                  dueDate: mapped.dueDate,
                  status: mapped.status,
                  completedDate: mapped.completedDate,
                });
                processed++;
              } catch (err) {
                failed++;
                allErrors.push(
                  `Config ${config._id} Recall ${nhRecall.id}: ${err instanceof Error ? err.message : "Unknown error"}`
                );
              }
            }
            const pageInfo = (response as any).page_info;
            if (pageInfo?.has_next_page && pageInfo.end_cursor) {
              endCursor = pageInfo.end_cursor;
            } else {
              hasMore = false;
            }
          }
        }

        // g. Pull and upsert procedures updated since last sync
        {
          let endCursor: string | undefined;
          const perPage = 100;
          let hasMore = true;
          while (hasMore) {
            const response = await client.getProcedures({
              per_page: perPage,
              end_cursor: endCursor,
              updated_since: updatedSince,
            } as any);
            for (const item of extractDataArray(response.data) as any[]) {
              try {
                const mapped = mapNexHealthProcedureToPms(item);
                await ctx.runMutation(internal.nexhealth.mutations.upsertSyncedProcedure, {
                  orgId: config.orgId,
                  pmsProcedureId: mapped.pmsProcedureId,
                  pmsPatientId: mapped.patientId,
                  pmsAppointmentId: mapped.appointmentId,
                  pmsProviderId: mapped.providerId,
                  code: mapped.code,
                  description: mapped.description,
                  fee: mapped.fee,
                  tooth: mapped.tooth,
                  surface: mapped.surface,
                  status: mapped.status,
                  completedAt: mapped.completedAt,
                  foreignId: mapped.foreignId,
                });
                processed++;
              } catch (err) {
                failed++;
                allErrors.push(
                  `Config ${config._id} Procedure ${item.id}: ${err instanceof Error ? err.message : "Unknown error"}`
                );
              }
            }
            const pageInfo = (response as any).page_info;
            if (pageInfo?.has_next_page && pageInfo.end_cursor) {
              endCursor = pageInfo.end_cursor;
            } else {
              hasMore = false;
            }
          }
        }

        // h. Pull and upsert charges updated since last sync
        {
          let endCursor: string | undefined;
          const perPage = 100;
          let hasMore = true;
          while (hasMore) {
            const response = await client.getCharges({
              per_page: perPage,
              end_cursor: endCursor,
              updated_since: updatedSince,
            } as any);
            for (const item of extractDataArray(response.data) as any[]) {
              try {
                const mapped = mapNexHealthChargeToPms(item);
                await ctx.runMutation(internal.nexhealth.mutations.upsertSyncedCharge, {
                  orgId: config.orgId,
                  pmsChargeId: mapped.pmsChargeId,
                  pmsPatientId: mapped.patientId,
                  pmsProviderId: mapped.providerId,
                  amount: mapped.amount,
                  procedureCode: mapped.procedureCode,
                  description: mapped.description,
                  date: mapped.date,
                  status: mapped.status,
                  pmsClaimId: mapped.claimId,
                  foreignId: mapped.foreignId,
                });
                processed++;
              } catch (err) {
                failed++;
                allErrors.push(
                  `Config ${config._id} Charge ${item.id}: ${err instanceof Error ? err.message : "Unknown error"}`
                );
              }
            }
            const pageInfo = (response as any).page_info;
            if (pageInfo?.has_next_page && pageInfo.end_cursor) {
              endCursor = pageInfo.end_cursor;
            } else {
              hasMore = false;
            }
          }
        }

        // i. Pull and upsert PMS payments
        {
          let endCursor: string | undefined;
          const perPage = 100;
          let hasMore = true;
          while (hasMore) {
            const response = await client.getPayments({
              per_page: perPage,
              end_cursor: endCursor,
            } as any);
            for (const item of extractDataArray(response.data) as any[]) {
              try {
                const mapped = mapNexHealthPaymentToPms(item);
                await ctx.runMutation(internal.nexhealth.mutations.upsertSyncedPmsPayment, {
                  orgId: config.orgId,
                  pmsPaymentId: mapped.pmsPaymentId,
                  pmsPatientId: mapped.patientId,
                  amount: mapped.amount,
                  paymentTypeId: mapped.paymentTypeId,
                  paymentMethod: mapped.paymentMethod,
                  date: mapped.date,
                  note: mapped.note,
                  pmsClaimId: mapped.claimId,
                  foreignId: mapped.foreignId,
                });
                processed++;
              } catch (err) {
                failed++;
                allErrors.push(
                  `Config ${config._id} PmsPayment ${item.id}: ${err instanceof Error ? err.message : "Unknown error"}`
                );
              }
            }
            const pageInfo = (response as any).page_info;
            if (pageInfo?.has_next_page && pageInfo.end_cursor) {
              endCursor = pageInfo.end_cursor;
            } else {
              hasMore = false;
            }
          }
        }

        // j. Update connection status to connected on success
        await ctx.runMutation(internal.nexhealth.mutations.updateConnectionStatus, {
          configId: config._id,
          status: "connected",
        });

        totalProcessed += processed;
        totalFailed += failed;
        configsProcessed++;
      } catch (error) {
        // One config failing should not stop others
        const message = error instanceof Error ? error.message : "Unknown error";
        allErrors.push(`Config ${config._id} failed: ${message}`);

        // Update connection status to error for this config
        try {
          await ctx.runMutation(internal.nexhealth.mutations.updateConnectionStatus, {
            configId: config._id,
            status: "error",
          });
        } catch {
          // Swallow — don't let status update failure block the loop
        }

        configsProcessed++;
      }
    }

    return {
      configsProcessed,
      totalProcessed,
      totalFailed,
      errors: allErrors,
    };
  },
});

// ---------------------------------------------------------------------------
// Webhook Event Processing
// ---------------------------------------------------------------------------

/**
 * Process a NexHealth webhook event.
 * Called by the Next.js API route after signature verification.
 * Routes events to the appropriate upsert mutations.
 */
export const processWebhookEvent = internalAction({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    subdomain: v.string(),
    resourceId: v.number(),
    data: v.string(), // JSON-stringified event data
    orgId: v.string(),
    practiceId: v.id("practices"),
    configId: v.id("nexhealthConfigs"),
  },
  handler: async (ctx, args) => {
    // 1. Record the event
    const eventDocId = await ctx.runMutation(
      internal.nexhealth.mutations._recordWebhookEvent,
      {
        orgId: args.orgId,
        eventId: args.eventId,
        eventType: args.eventType,
        payload: args.data,
      }
    );

    try {
      const eventData = JSON.parse(args.data);

      // 2. Route by event type prefix
      if (args.eventType.startsWith("patient.")) {
        // eventData should be a NexHealthPatient-like object
        const mapped = mapNexHealthPatientToPms(eventData);
        await ctx.runMutation(
          internal.nexhealth.mutations.upsertSyncedPatient,
          {
            orgId: args.orgId,
            practiceId: args.practiceId,
            pmsPatientId: mapped.pmsPatientId,
            firstName: mapped.firstName,
            lastName: mapped.lastName,
            dateOfBirth: mapped.dateOfBirth || "",
            gender: mapped.gender,
            email: mapped.email,
            phone: mapped.phone,
            address: mapped.address,
            isActive: mapped.isActive ?? true,
          }
        );
      } else if (args.eventType.startsWith("appointment.")) {
        // eventData should be a NexHealthAppointment-like object
        const mapped = mapNexHealthAppointmentToPms(eventData);
        await ctx.runMutation(
          internal.nexhealth.mutations.upsertSyncedAppointment,
          {
            orgId: args.orgId,
            practiceId: args.practiceId,
            pmsAppointmentId: mapped.pmsAppointmentId,
            pmsPatientId: mapped.patientId,
            pmsProviderId: mapped.providerId,
            date: mapped.date,
            startTime: mapped.startTime,
            endTime: mapped.endTime,
            duration: mapped.duration,
            status: mapped.status,
            notes: mapped.notes,
          }
        );
      } else if (args.eventType.startsWith("payment.")) {
        const mapped = mapNexHealthPaymentToPms(eventData);
        await ctx.runMutation(
          internal.nexhealth.mutations._recordWebhookPayment,
          {
            orgId: args.orgId,
            practiceId: args.practiceId,
            pmsPaymentId: mapped.pmsPaymentId,
            pmsPatientId: mapped.patientId,
            amount: mapped.amount,
            paymentMethod: mapped.paymentMethod,
            date: mapped.date,
            note: mapped.note,
            claimId: mapped.claimId,
          }
        );
      } else if (args.eventType.startsWith("insurance.")) {
        const mapped = mapNexHealthInsuranceCoverageToPms(eventData);
        await ctx.runMutation(
          internal.nexhealth.mutations.upsertSyncedInsuranceCoverage,
          {
            orgId: args.orgId,
            practiceId: args.practiceId,
            pmsInsuranceCoverageId: mapped.pmsInsuranceCoverageId,
            pmsPatientId: mapped.patientId,
            insurancePlanId: mapped.insurancePlanId,
            memberId: mapped.memberId,
            groupNumber: mapped.groupNumber,
            subscriberName: mapped.subscriberName,
            subscriberDob: mapped.subscriberDob,
            relationship: mapped.relationship,
            rank: mapped.rank,
            effectiveDate: mapped.effectiveDate,
            terminationDate: mapped.terminationDate,
          }
        );
      } else if (args.eventType.startsWith("charge.")) {
        const mapped = mapNexHealthChargeToPms(eventData);
        await ctx.runMutation(
          internal.nexhealth.mutations._recordWebhookCharge,
          {
            orgId: args.orgId,
            practiceId: args.practiceId,
            pmsChargeId: mapped.pmsChargeId,
            pmsPatientId: mapped.patientId,
            amount: mapped.amount,
            procedureCode: mapped.procedureCode,
            description: mapped.description,
            date: mapped.date,
            status: mapped.status,
            claimId: mapped.claimId,
          }
        );
      }
      // Other event types are recorded but not routed

      // 3. Mark event processed
      await ctx.runMutation(
        internal.nexhealth.mutations._markWebhookProcessed,
        { eventDocId }
      );

      // 4. Update connection status
      await ctx.runMutation(
        internal.nexhealth.mutations.updateConnectionStatus,
        { configId: args.configId, status: "connected" }
      );

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await ctx.runMutation(
        internal.nexhealth.mutations._markWebhookFailed,
        { eventDocId, error: message }
      );
      return { success: false, error: message };
    }
  },
});

/**
 * Public-facing webhook handler action.
 * Called by the Next.js API route — does config lookup + event processing.
 * Signature verification happens in the route layer.
 *
 * This is a regular `action` (client-callable) because ConvexHttpClient
 * cannot call internalAction.
 */
export const handleWebhookEvent = action({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    subdomain: v.string(),
    resourceId: v.number(),
    data: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    const config = await ctx.runQuery(
      internal.nexhealth.queries._getConfigBySubdomain,
      { subdomain: args.subdomain }
    );

    if (!config) {
      return { success: false, error: "Unknown subdomain" };
    }

    const eventDocId = await ctx.runMutation(
      internal.nexhealth.mutations._recordWebhookEvent,
      {
        orgId: config.orgId,
        eventId: args.eventId,
        eventType: args.eventType,
        payload: args.data,
      }
    );

    try {
      const eventData = JSON.parse(args.data);

      if (args.eventType.startsWith("patient.")) {
        const mapped = mapNexHealthPatientToPms(eventData);
        await ctx.runMutation(
          internal.nexhealth.mutations.upsertSyncedPatient,
          {
            orgId: config.orgId,
            practiceId: config.practiceId,
            pmsPatientId: mapped.pmsPatientId,
            firstName: mapped.firstName,
            lastName: mapped.lastName,
            dateOfBirth: mapped.dateOfBirth || "",
            gender: mapped.gender,
            email: mapped.email,
            phone: mapped.phone,
            address: mapped.address,
            isActive: mapped.isActive ?? true,
          }
        );
      } else if (args.eventType.startsWith("appointment.")) {
        const mapped = mapNexHealthAppointmentToPms(eventData);
        await ctx.runMutation(
          internal.nexhealth.mutations.upsertSyncedAppointment,
          {
            orgId: config.orgId,
            practiceId: config.practiceId,
            pmsAppointmentId: mapped.pmsAppointmentId,
            pmsPatientId: mapped.patientId,
            pmsProviderId: mapped.providerId,
            date: mapped.date,
            startTime: mapped.startTime,
            endTime: mapped.endTime,
            duration: mapped.duration,
            status: mapped.status,
            notes: mapped.notes,
          }
        );
      } else if (args.eventType.startsWith("payment.")) {
        const mapped = mapNexHealthPaymentToPms(eventData);
        await ctx.runMutation(
          internal.nexhealth.mutations._recordWebhookPayment,
          {
            orgId: config.orgId,
            practiceId: config.practiceId,
            pmsPaymentId: mapped.pmsPaymentId,
            pmsPatientId: mapped.patientId,
            amount: mapped.amount,
            paymentMethod: mapped.paymentMethod,
            date: mapped.date,
            note: mapped.note,
            claimId: mapped.claimId,
          }
        );
      } else if (args.eventType.startsWith("insurance.")) {
        const mapped = mapNexHealthInsuranceCoverageToPms(eventData);
        await ctx.runMutation(
          internal.nexhealth.mutations.upsertSyncedInsuranceCoverage,
          {
            orgId: config.orgId,
            practiceId: config.practiceId,
            pmsInsuranceCoverageId: mapped.pmsInsuranceCoverageId,
            pmsPatientId: mapped.patientId,
            insurancePlanId: mapped.insurancePlanId,
            memberId: mapped.memberId,
            groupNumber: mapped.groupNumber,
            subscriberName: mapped.subscriberName,
            subscriberDob: mapped.subscriberDob,
            relationship: mapped.relationship,
            rank: mapped.rank,
            effectiveDate: mapped.effectiveDate,
            terminationDate: mapped.terminationDate,
          }
        );
      } else if (args.eventType.startsWith("charge.")) {
        const mapped = mapNexHealthChargeToPms(eventData);
        await ctx.runMutation(
          internal.nexhealth.mutations._recordWebhookCharge,
          {
            orgId: config.orgId,
            practiceId: config.practiceId,
            pmsChargeId: mapped.pmsChargeId,
            pmsPatientId: mapped.patientId,
            amount: mapped.amount,
            procedureCode: mapped.procedureCode,
            description: mapped.description,
            date: mapped.date,
            status: mapped.status,
            claimId: mapped.claimId,
          }
        );
      }

      await ctx.runMutation(
        internal.nexhealth.mutations._markWebhookProcessed,
        { eventDocId }
      );

      await ctx.runMutation(
        internal.nexhealth.mutations.updateConnectionStatus,
        { configId: config._id, status: "connected" }
      );

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await ctx.runMutation(
        internal.nexhealth.mutations._markWebhookFailed,
        { eventDocId, error: message }
      );
      return { success: false, error: message };
    }
  },
});

// ---------------------------------------------------------------------------
// Push Sync — Write Oscar changes back to NexHealth / PMS
// ---------------------------------------------------------------------------

/**
 * Push an appointment create/update/cancel to NexHealth.
 * Called after Oscar creates, updates, or cancels an appointment.
 * Works for all PMS types via NexHealth Synchronizer.
 */
export const pushAppointment = internalAction({
  args: {
    appointmentId: v.id("appointments"),
    orgId: v.string(),
    practiceId: v.id("practices"),
    operation: v.union(v.literal("create"), v.literal("update"), v.literal("cancel")),
  },
  handler: async (ctx, args): Promise<{ success: boolean; pmsAppointmentId?: string; error?: string }> => {
    // 1. Get NexHealth config
    const config = await ctx.runQuery(
      internal.nexhealth.queries._getConfigInternal,
      { practiceId: args.practiceId, orgId: args.orgId }
    );
    if (!config) {
      return { success: false, error: "No NexHealth config" };
    }

    // 2. Get the appointment
    const appointment = await ctx.runQuery(
      internal.nexhealth.queries._getAppointmentInternal,
      { appointmentId: args.appointmentId }
    );
    if (!appointment) {
      return { success: false, error: "Appointment not found" };
    }

    try {
      const client = new NexHealthApiClient({
        apiKey: config.apiKey,
        subdomain: config.subdomain,
        locationId: config.locationId,
        environment: config.environment,
      });

      // 3. Resolve provider PMS ID
      const provider = await ctx.runQuery(
        internal.nexhealth.queries._getProviderInternal,
        { providerId: appointment.providerId }
      );

      // 4. Resolve patient PMS ID
      const patient = await ctx.runQuery(
        internal.nexhealth.queries._getPatientInternal,
        { patientId: appointment.patientId }
      );

      if (args.operation === "create") {
        // Build NexHealth appointment payload
        const nhPayload = {
          patient_id: patient?.pmsPatientId ? Number(patient.pmsPatientId) : undefined,
          provider_id: provider?.pmsProviderId ? Number(provider.pmsProviderId) : undefined,
          start_time: `${appointment.date}T${appointment.startTime}:00Z`,
          duration: appointment.duration,
          note: appointment.notes,
        };

        const response = await client.createAppointment(nhPayload as any);
        const pmsAppointmentId = String(response.data.id);

        // Patch appointment with the NexHealth ID
        await ctx.runMutation(
          internal.nexhealth.mutations._patchAppointmentPmsId,
          { appointmentId: args.appointmentId, pmsAppointmentId }
        );

        return { success: true, pmsAppointmentId };

      } else if (args.operation === "update") {
        if (!appointment.pmsAppointmentId) {
          return { success: false, error: "No PMS appointment ID to update" };
        }
        await client.updateAppointment(Number(appointment.pmsAppointmentId), {
          start_time: `${appointment.date}T${appointment.startTime}:00Z`,
          duration: appointment.duration,
          note: appointment.notes,
        } as any);
        return { success: true, pmsAppointmentId: appointment.pmsAppointmentId };

      } else if (args.operation === "cancel") {
        if (!appointment.pmsAppointmentId) {
          return { success: false, error: "No PMS appointment ID to cancel" };
        }
        await client.updateAppointment(Number(appointment.pmsAppointmentId), {
          cancelled: true,
        } as any);
        return { success: true, pmsAppointmentId: appointment.pmsAppointmentId };
      }

      return { success: false, error: "Unknown operation" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  },
});

/**
 * Push a patient create/update to NexHealth.
 * If the patient has a pmsPatientId, updates the existing NexHealth record.
 * Otherwise, creates a new patient in NexHealth and stores the returned PMS ID.
 * Works for all PMS types via NexHealth Synchronizer.
 */
export const pushPatientUpdate = internalAction({
  args: {
    patientId: v.id("patients"),
    orgId: v.string(),
    practiceId: v.id("practices"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; pmsPatientId?: string; error?: string }> => {
    const config = await ctx.runQuery(
      internal.nexhealth.queries._getConfigInternal,
      { practiceId: args.practiceId, orgId: args.orgId }
    );
    if (!config) {
      return { success: false, error: "No NexHealth config" };
    }

    const patient = await ctx.runQuery(
      internal.nexhealth.queries._getPatientInternal,
      { patientId: args.patientId }
    );
    if (!patient) {
      return { success: false, error: "Patient not found" };
    }

    try {
      const client = new NexHealthApiClient({
        apiKey: config.apiKey,
        subdomain: config.subdomain,
        locationId: config.locationId,
        environment: config.environment,
      });

      const nhPayload = {
        first_name: patient.firstName,
        last_name: patient.lastName,
        email: patient.email,
        bio: {
          date_of_birth: patient.dateOfBirth || undefined,
          gender: patient.gender,
          cell_phone_number: patient.phone || undefined,
          address_line_1: patient.address?.street || undefined,
          city: patient.address?.city || undefined,
          state: patient.address?.state || undefined,
          zip_code: patient.address?.zip || undefined,
        },
      };

      if (patient.pmsPatientId) {
        // Update existing
        await client.updatePatient(Number(patient.pmsPatientId), nhPayload as any);
        return { success: true, pmsPatientId: patient.pmsPatientId };
      } else {
        // Create new
        const response = await client.createPatient(nhPayload as any);
        const pmsPatientId = String(response.data.id);

        await ctx.runMutation(
          internal.nexhealth.mutations._patchPatientPmsId,
          { patientId: args.patientId, pmsPatientId }
        );

        return { success: true, pmsPatientId };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  },
});

/**
 * Push a payment to NexHealth.
 * Posts a payment record to the PMS via NexHealth Synchronizer.
 * Works for all PMS types.
 */
export const pushPayment = internalAction({
  args: {
    orgId: v.string(),
    practiceId: v.id("practices"),
    patientId: v.string(),
    amount: v.number(),
    paymentMethod: v.optional(v.string()),
    date: v.optional(v.string()),
    note: v.optional(v.string()),
    claimId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; pmsPaymentId?: string; error?: string }> => {
    const config = await ctx.runQuery(
      internal.nexhealth.queries._getConfigInternal,
      { practiceId: args.practiceId, orgId: args.orgId }
    );
    if (!config) {
      return { success: false, error: "No NexHealth config" };
    }

    try {
      const client = new NexHealthApiClient({
        apiKey: config.apiKey,
        subdomain: config.subdomain,
        locationId: config.locationId,
        environment: config.environment,
      });

      const nhPayload = {
        patient_id: Number(args.patientId),
        amount: args.amount,
        transaction_id: `API:oscar-pay-${Date.now()}`,
        type_name: "Cash",
      };

      const response = await client.createPayment(nhPayload as any);
      return { success: true, pmsPaymentId: String(response.data.id) };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  },
});

/**
 * Push an adjustment (write-off) to NexHealth.
 * Posts an adjustment record to the PMS via NexHealth Synchronizer.
 * Works for all PMS types.
 */
export const pushAdjustment = internalAction({
  args: {
    orgId: v.string(),
    practiceId: v.id("practices"),
    patientId: v.string(),
    amount: v.number(),
    adjustmentTypeId: v.optional(v.string()),
    description: v.optional(v.string()),
    date: v.optional(v.string()),
    providerId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; pmsAdjustmentId?: string; error?: string }> => {
    const config = await ctx.runQuery(
      internal.nexhealth.queries._getConfigInternal,
      { practiceId: args.practiceId, orgId: args.orgId }
    );
    if (!config) {
      return { success: false, error: "No NexHealth config" };
    }

    try {
      const client = new NexHealthApiClient({
        apiKey: config.apiKey,
        subdomain: config.subdomain,
        locationId: config.locationId,
        environment: config.environment,
      });

      const nhPayload = {
        patient_id: Number(args.patientId),
        amount: args.amount,
        transaction_id: `API:oscar-adj-${Date.now()}`,
        adjustment_type_id: args.adjustmentTypeId ? Number(args.adjustmentTypeId) : undefined,
        notes: args.description,
        adjusted_at: args.date ?? new Date().toISOString().split("T")[0],
        provider_splits: args.providerId ? { [args.providerId]: String(args.amount) } : undefined,
      };

      const response = await client.createAdjustment(nhPayload as any);
      return { success: true, pmsAdjustmentId: String(response.data.id) };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  },
});

/**
 * Push an appointment type create/update to NexHealth.
 * Works for all PMS types via NexHealth Synchronizer.
 */
export const pushAppointmentType = internalAction({
  args: {
    appointmentTypeId: v.id("appointmentTypes"),
    orgId: v.string(),
    practiceId: v.id("practices"),
    operation: v.union(v.literal("create"), v.literal("update")),
  },
  handler: async (ctx, args): Promise<{ success: boolean; pmsAppointmentTypeId?: string; error?: string }> => {
    const config = await ctx.runQuery(
      internal.nexhealth.queries._getConfigInternal,
      { practiceId: args.practiceId, orgId: args.orgId }
    );
    if (!config) {
      return { success: false, error: "No NexHealth config" };
    }

    const appointmentType = await ctx.runQuery(
      internal.nexhealth.queries._getAppointmentTypeInternal,
      { appointmentTypeId: args.appointmentTypeId }
    );
    if (!appointmentType) {
      return { success: false, error: "Appointment type not found" };
    }

    try {
      const client = new NexHealthApiClient({
        apiKey: config.apiKey,
        subdomain: config.subdomain,
        locationId: config.locationId,
        environment: config.environment,
      });

      const nhPayload = {
        name: appointmentType.name,
        duration: appointmentType.duration,
        code: (appointmentType as any).code || undefined,
      };

      if (args.operation === "create" && !(appointmentType as any).pmsAppointmentTypeId) {
        const response = await client.createAppointmentType(nhPayload as any);
        const pmsAppointmentTypeId = String(response.data.id);

        await ctx.runMutation(
          internal.nexhealth.mutations._patchAppointmentTypePmsId,
          { appointmentTypeId: args.appointmentTypeId, pmsAppointmentTypeId }
        );

        return { success: true, pmsAppointmentTypeId };
      } else {
        const pmsId = (appointmentType as any).pmsAppointmentTypeId;
        if (!pmsId) {
          return { success: false, error: "No PMS appointment type ID to update" };
        }
        await client.updateAppointmentType(Number(pmsId), nhPayload as any);
        return { success: true, pmsAppointmentTypeId: pmsId };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  },
});

// ---------------------------------------------------------------------------
// Push Working Hours — Create / Update / Delete working hours in NexHealth
// Works for all PMS types via NexHealth Synchronizer.
// ---------------------------------------------------------------------------

export const pushWorkingHour = internalAction({
  args: {
    workingHourId: v.id("workingHours"),
    orgId: v.string(),
    practiceId: v.id("practices"),
    operation: v.union(v.literal("create"), v.literal("update"), v.literal("delete")),
  },
  handler: async (ctx, args): Promise<{ success: boolean; pmsWorkingHourId?: string; error?: string }> => {
    const config = await ctx.runQuery(
      internal.nexhealth.queries._getConfigInternal,
      { practiceId: args.practiceId, orgId: args.orgId }
    );
    if (!config) {
      return { success: false, error: "No NexHealth config" };
    }

    const workingHour = await ctx.runQuery(
      internal.nexhealth.queries._getWorkingHourInternal as any,
      { workingHourId: args.workingHourId }
    );
    if (!workingHour) {
      return { success: false, error: "Working hour not found" };
    }

    try {
      const client = new NexHealthApiClient({
        apiKey: config.apiKey,
        subdomain: config.subdomain,
        locationId: config.locationId,
        environment: config.environment,
      });

      // Map day of week numbers to NexHealth day names
      const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const dayName = dayNames[(workingHour as any).dayOfWeek] || "monday";

      const nhPayload = {
        day: dayName,
        start_time: (workingHour as any).startTime,
        end_time: (workingHour as any).endTime,
        provider_id: (workingHour as any).pmsProviderId ? Number((workingHour as any).pmsProviderId) : undefined,
      };

      if (args.operation === "create" && !(workingHour as any).pmsWorkingHourId) {
        const response = await client.createWorkingHour(nhPayload as any);
        const pmsWorkingHourId = String((response as any).data.id);

        await ctx.runMutation(
          internal.nexhealth.mutations._patchWorkingHourPmsId as any,
          { workingHourId: args.workingHourId, pmsWorkingHourId }
        );

        return { success: true, pmsWorkingHourId };
      } else if (args.operation === "delete") {
        const pmsId = (workingHour as any).pmsWorkingHourId;
        if (pmsId) {
          await client.deleteWorkingHour(Number(pmsId));
        }
        return { success: true, pmsWorkingHourId: pmsId };
      } else {
        const pmsId = (workingHour as any).pmsWorkingHourId;
        if (!pmsId) {
          return { success: false, error: "No PMS working hour ID to update" };
        }
        await client.updateWorkingHour(Number(pmsId), nhPayload as any);
        return { success: true, pmsWorkingHourId: pmsId };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  },
});

// ---------------------------------------------------------------------------
// Push Patient Alerts + Documents — Write to NexHealth / PMS
// ---------------------------------------------------------------------------

/**
 * Push a patient alert to NexHealth.
 * Posts an alert to the patient record in the PMS via NexHealth Synchronizer.
 */
export const pushPatientAlert = internalAction({
  args: {
    alertId: v.id("patientAlerts"),
    orgId: v.string(),
    practiceId: v.id("practices"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; pmsAlertId?: string; error?: string }> => {
    const config = await ctx.runQuery(
      internal.nexhealth.queries._getConfigInternal,
      { practiceId: args.practiceId, orgId: args.orgId }
    );
    if (!config) {
      return { success: false, error: "No NexHealth config" };
    }

    const alert = await ctx.runQuery(
      internal.nexhealth.queries._getPatientAlertInternal as any,
      { alertId: args.alertId }
    );
    if (!alert) {
      return { success: false, error: "Alert not found" };
    }

    try {
      const client = new NexHealthApiClient({
        apiKey: config.apiKey,
        subdomain: config.subdomain,
        locationId: config.locationId,
        environment: config.environment,
      });

      const pmsPatientId = (alert as any).pmsPatientId;
      if (!pmsPatientId) {
        return { success: false, error: "Patient has no PMS ID" };
      }

      const nhPayload = {
        note: (alert as any).message,
        alert_type: (alert as any).alertType || "general",
      };

      const response = await client.createPatientAlert(Number(pmsPatientId), nhPayload as any);
      const pmsAlertId = String(response.data.id);

      await ctx.runMutation(
        internal.nexhealth.mutations._patchPatientAlertPmsId as any,
        { alertId: args.alertId, pmsAlertId }
      );

      return { success: true, pmsAlertId };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  },
});

/**
 * Push a patient document to NexHealth.
 * Posts a document record to the patient in the PMS via NexHealth Synchronizer.
 */
export const pushPatientDocument = internalAction({
  args: {
    documentId: v.id("patientDocuments"),
    orgId: v.string(),
    practiceId: v.id("practices"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; pmsDocumentId?: string; error?: string }> => {
    const config = await ctx.runQuery(
      internal.nexhealth.queries._getConfigInternal,
      { practiceId: args.practiceId, orgId: args.orgId }
    );
    if (!config) {
      return { success: false, error: "No NexHealth config" };
    }

    const doc = await ctx.runQuery(
      internal.nexhealth.queries._getPatientDocumentInternal as any,
      { documentId: args.documentId }
    );
    if (!doc) {
      return { success: false, error: "Document not found" };
    }

    try {
      const client = new NexHealthApiClient({
        apiKey: config.apiKey,
        subdomain: config.subdomain,
        locationId: config.locationId,
        environment: config.environment,
      });

      const pmsPatientId = (doc as any).pmsPatientId;
      if (!pmsPatientId) {
        return { success: false, error: "Patient has no PMS ID" };
      }

      const nhPayload = {
        name: (doc as any).name,
        document_type: (doc as any).documentType || "other",
        url: (doc as any).url || undefined,
      };

      const response = await client.createPatientDocument(Number(pmsPatientId), nhPayload as any);
      const pmsDocumentId = String(response.data.id);

      await ctx.runMutation(
        internal.nexhealth.mutations._patchPatientDocumentPmsId as any,
        { documentId: args.documentId, pmsDocumentId }
      );

      return { success: true, pmsDocumentId };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  },
});

// ---------------------------------------------------------------------------
// Health Monitoring — Check NexHealth connectivity for all active configs
// Called by cron every 5 minutes.
// ---------------------------------------------------------------------------

export const runHealthCheck = internalAction({
  args: {},
  handler: async (ctx): Promise<{
    configsChecked: number;
    healthy: number;
    degraded: number;
    down: number;
  }> => {
    const configs = await ctx.runQuery(internal.nexhealth.queries._listActiveConfigs, {});

    let configsChecked = 0;
    let healthy = 0;
    let degraded = 0;
    let down = 0;

    for (const config of configs) {
      const startMs = Date.now();
      let status: "healthy" | "degraded" | "down" = "down";
      let message = "";

      try {
        const client = new NexHealthApiClient({
          apiKey: config.apiKey,
          subdomain: config.subdomain,
          locationId: config.locationId,
          environment: config.environment,
        });

        await client.authenticate();
        await client.getProviders({ per_page: 1 });

        const responseTime = Date.now() - startMs;

        if (responseTime > 1000) {
          status = "degraded";
          message = `NexHealth (${config.subdomain}): elevated latency ${responseTime}ms`;
          degraded++;

          await ctx.runMutation(internal.health.mutations.recordHealthCheck, {
            orgId: config.orgId,
            service: "nexhealth",
            status,
            responseTime,
            details: message,
          });
          await ctx.runMutation(internal.health.mutations.recordAlert, {
            orgId: config.orgId,
            service: "nexhealth",
            severity: "warning",
            message: `NexHealth latency ${responseTime}ms for subdomain "${config.subdomain}" exceeds 1000ms threshold`,
          });
        } else {
          status = "healthy";
          message = `NexHealth (${config.subdomain}): OK ${responseTime}ms`;
          healthy++;

          await ctx.runMutation(internal.health.mutations.recordHealthCheck, {
            orgId: config.orgId,
            service: "nexhealth",
            status,
            responseTime,
            details: message,
          });
        }
      } catch (error) {
        const responseTime = Date.now() - startMs;
        message = getErrorMessage(error);
        down++;

        await ctx.runMutation(internal.health.mutations.recordHealthCheck, {
          orgId: config.orgId,
          service: "nexhealth",
          status: "down",
          responseTime,
          details: `NexHealth (${config.subdomain}): ${message}`,
        });

        await ctx.runMutation(internal.health.mutations.recordAlert, {
          orgId: config.orgId,
          service: "nexhealth",
          severity: "critical",
          message: `NexHealth connection failed for subdomain "${config.subdomain}": ${message}`,
        });
      }

      configsChecked++;
    }

    return { configsChecked, healthy, degraded, down };
  },
});
