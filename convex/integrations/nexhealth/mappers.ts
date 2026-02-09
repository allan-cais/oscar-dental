import type {
  NexHealthPrice,
  NexHealthPatient,
  NexHealthAppointment,
  NexHealthProvider,
  NexHealthAppointmentType,
  NexHealthInsuranceCoverage,
  NexHealthPatientRecall,
  NexHealthFeeSchedule,
  NexHealthProcedure,
  NexHealthAdjustment,
  NexHealthCharge,
  NexHealthClaim,
  NexHealthPayment,
  NexHealthTreatmentPlan,
  NexHealthWorkingHour,
  NexHealthGuarantorBalance,
  NexHealthInsuranceBalance,
  NexHealthInsurancePlan,
} from "./types";
import type {
  PmsPatient,
  PmsAppointment,
  PmsProvider,
} from "../pms/interface";

/** Extract numeric amount from a NexHealthPrice object, defaulting to 0. */
function priceToNumber(price?: NexHealthPrice): number {
  if (!price?.amount) return 0;
  const n = parseFloat(price.amount);
  return isNaN(n) ? 0 : n;
}

// ---------------------------------------------------------------------------
// Status Mappings
// ---------------------------------------------------------------------------

const oscarToNexHealthStatus: Record<string, string> = {
  scheduled: "Created",
  confirmed: "Confirmed",
  checked_in: "Checked In",
  in_progress: "In Treatment",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

export function mapOscarStatusToNexHealth(oscarStatus: string): string {
  return oscarToNexHealthStatus[oscarStatus] ?? "Created";
}

// ---------------------------------------------------------------------------
// Patient Mappers
// ---------------------------------------------------------------------------

export function mapNexHealthPatientToPms(
  nhPatient: NexHealthPatient
): PmsPatient {
  const bio = nhPatient.bio;
  const phone = bio?.cell_phone_number ?? bio?.phone_number ?? bio?.home_phone_number;

  return {
    pmsPatientId: String(nhPatient.id),
    firstName: nhPatient.first_name,
    lastName: nhPatient.last_name,
    dateOfBirth: bio?.date_of_birth ?? "",
    gender: bio?.gender,
    email: nhPatient.email,
    phone,
    address: bio?.address_line_1
      ? {
          street: [bio.address_line_1, bio.address_line_2].filter(Boolean).join(", "),
          city: bio.city ?? "",
          state: bio.state ?? "",
          zip: bio.zip_code ?? "",
        }
      : undefined,
    isActive: !nhPatient.inactive,
  };
}

// ---------------------------------------------------------------------------
// Appointment Mappers
// ---------------------------------------------------------------------------

function extractDate(isoString: string): string {
  return isoString.slice(0, 10);
}

function extractTime(isoString: string): string {
  const date = new Date(isoString);
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function computeDuration(startIso: string, endIso: string): number {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  return Math.round(ms / 60000);
}

/** Derive Oscar appointment status from v20240412 boolean flags. */
function deriveAppointmentStatus(nhAppt: NexHealthAppointment): string {
  if (nhAppt.cancelled) return "cancelled";
  if (nhAppt.patient_missed) return "no_show";
  if (nhAppt.checked_out) return "completed";
  if (nhAppt.checkin_at) return "checked_in";
  if (nhAppt.confirmed) return "confirmed";
  return "scheduled";
}

export function mapNexHealthAppointmentToPms(
  nhAppt: NexHealthAppointment
): PmsAppointment {
  let duration = 30;
  let endTime: string | undefined;

  if (nhAppt.end_time) {
    endTime = extractTime(nhAppt.end_time);
    duration = computeDuration(nhAppt.start_time, nhAppt.end_time);
  }

  return {
    pmsAppointmentId: String(nhAppt.id),
    patientId: String(nhAppt.patient_id),
    providerId: String(nhAppt.provider_id),
    operatoryId: nhAppt.operatory_id != null
      ? String(nhAppt.operatory_id)
      : undefined,
    date: extractDate(nhAppt.start_time),
    startTime: extractTime(nhAppt.start_time),
    endTime,
    duration,
    status: deriveAppointmentStatus(nhAppt),
    notes: nhAppt.note,
  };
}

export function mapPmsAppointmentToNexHealth(
  pmsAppt: PmsAppointment
): Record<string, unknown> {
  const startTime = pmsAppt.date && pmsAppt.startTime
    ? `${pmsAppt.date}T${pmsAppt.startTime}:00Z`
    : undefined;

  return {
    patient_id: Number(pmsAppt.patientId),
    provider_id: Number(pmsAppt.providerId),
    operatory_id: pmsAppt.operatoryId
      ? Number(pmsAppt.operatoryId)
      : undefined,
    start_time: startTime,
    duration: pmsAppt.duration,
    note: pmsAppt.notes,
  };
}

// ---------------------------------------------------------------------------
// Provider Mapper
// ---------------------------------------------------------------------------

const providerTypeMap: Record<string, PmsProvider["type"]> = {
  doctor: "dentist",
  dentist: "dentist",
  hygienist: "hygienist",
  specialist: "specialist",
};

export function mapNexHealthProviderToPms(
  nhProvider: NexHealthProvider
): PmsProvider {
  const rawType = (nhProvider.provider_type ?? "").toLowerCase();
  const mappedType: PmsProvider["type"] = providerTypeMap[rawType] ?? "assistant";

  return {
    pmsProviderId: String(nhProvider.id),
    firstName: nhProvider.first_name,
    lastName: nhProvider.last_name,
    npi: nhProvider.npi,
    type: mappedType,
    specialty: nhProvider.specialty,
    isActive: !nhProvider.inactive,
  };
}

// ---------------------------------------------------------------------------
// Appointment Type Mapper
// ---------------------------------------------------------------------------

export function mapNexHealthAppointmentTypeToPms(nhType: NexHealthAppointmentType): {
  pmsAppointmentTypeId: string;
  name: string;
  duration: number;
  color?: string;
  isActive: boolean;
} {
  return {
    pmsAppointmentTypeId: String(nhType.id),
    name: nhType.name,
    duration: nhType.duration ?? 30,
    color: nhType.color,
    isActive: nhType.is_active !== false,
  };
}

// ---------------------------------------------------------------------------
// Insurance Coverage Mapper
// ---------------------------------------------------------------------------

export function mapNexHealthInsuranceCoverageToPms(nhCoverage: NexHealthInsuranceCoverage): {
  pmsInsuranceCoverageId: string;
  patientId: string;
  insurancePlanId?: string;
  memberId?: string;
  groupNumber?: string;
  subscriberName?: string;
  subscriberDob?: string;
  relationship?: string;
  rank?: string;
  effectiveDate?: string;
  terminationDate?: string;
} {
  // v20240412 uses plan_id, subscriber_num, subscription_relation, priority, expiration_date
  // Fall back to legacy field names for pre-v20240412 responses
  const planId = nhCoverage.plan_id ?? nhCoverage.insurance_plan_id;
  const memberId = nhCoverage.subscriber_num ?? nhCoverage.member_id;
  const relationship = nhCoverage.subscription_relation ?? nhCoverage.relationship;
  const terminationDate = nhCoverage.expiration_date ?? nhCoverage.termination_date;

  // priority 0 = primary, 1 = secondary; legacy uses rank string
  let rank = nhCoverage.rank;
  if (rank == null && nhCoverage.priority != null) {
    rank = nhCoverage.priority === 0 ? "primary" : "secondary";
  }

  return {
    pmsInsuranceCoverageId: String(nhCoverage.id),
    patientId: String(nhCoverage.patient_id),
    insurancePlanId: planId != null ? String(planId) : undefined,
    memberId,
    groupNumber: nhCoverage.group_number,
    subscriberName: nhCoverage.subscriber_name,
    subscriberDob: nhCoverage.subscriber_dob,
    relationship,
    rank,
    effectiveDate: nhCoverage.effective_date,
    terminationDate: terminationDate,
  };
}

// ---------------------------------------------------------------------------
// Patient Recall Mapper
// ---------------------------------------------------------------------------

export function mapNexHealthPatientRecallToPms(nhRecall: NexHealthPatientRecall): {
  pmsRecallId: string;
  patientId: string;
  recallTypeId?: string;
  dueDate: string;
  status?: string;
  completedDate?: string;
} {
  return {
    pmsRecallId: String(nhRecall.id),
    patientId: String(nhRecall.patient_id),
    recallTypeId: nhRecall.recall_type_id != null ? String(nhRecall.recall_type_id) : undefined,
    dueDate: nhRecall.due_date,
    status: nhRecall.status,
    completedDate: nhRecall.completed_date,
  };
}

// ---------------------------------------------------------------------------
// Fee Schedule Mapper
// ---------------------------------------------------------------------------

export function mapNexHealthFeeScheduleToPms(nhFeeSchedule: NexHealthFeeSchedule): {
  pmsFeeScheduleId: string;
  name: string;
  description?: string;
  isDefault: boolean;
} {
  return {
    pmsFeeScheduleId: String(nhFeeSchedule.id),
    name: nhFeeSchedule.name,
    description: nhFeeSchedule.description,
    isDefault: nhFeeSchedule.is_default === true,
  };
}

// ---------------------------------------------------------------------------
// Procedure Mapper
// ---------------------------------------------------------------------------

export function mapNexHealthProcedureToPms(nhProcedure: NexHealthProcedure): {
  pmsProcedureId: string;
  code: string;
  description?: string;
  fee?: number;
  tooth?: string;
  surface?: string;
  providerId?: string;
  patientId?: string;
  appointmentId?: string;
  status?: string;
  completedAt?: string;
  foreignId?: string;
} {
  return {
    pmsProcedureId: String(nhProcedure.id),
    code: nhProcedure.code,
    description: nhProcedure.description,
    fee: nhProcedure.fee,
    tooth: nhProcedure.tooth,
    surface: nhProcedure.surface,
    providerId: nhProcedure.provider_id != null ? String(nhProcedure.provider_id) : undefined,
    patientId: nhProcedure.patient_id != null ? String(nhProcedure.patient_id) : undefined,
    appointmentId: nhProcedure.appointment_id != null ? String(nhProcedure.appointment_id) : undefined,
    status: nhProcedure.status,
    completedAt: nhProcedure.completed_at,
    foreignId: nhProcedure.foreign_id,
  };
}

// ---------------------------------------------------------------------------
// Adjustment Mapper
// ---------------------------------------------------------------------------

export function mapNexHealthAdjustmentToPms(nhAdjustment: NexHealthAdjustment): {
  pmsAdjustmentId: string;
  patientId: string;
  providerId?: string;
  amount: number;
  adjustmentTypeId?: number;
  description?: string;
  date?: string;
  foreignId?: string;
} {
  return {
    pmsAdjustmentId: String(nhAdjustment.id),
    patientId: String(nhAdjustment.patient_id),
    providerId: nhAdjustment.provider_id != null ? String(nhAdjustment.provider_id) : undefined,
    amount: priceToNumber(nhAdjustment.adjustment_amount),
    adjustmentTypeId: nhAdjustment.adjustment_type_id ?? undefined,
    description: nhAdjustment.description,
    date: nhAdjustment.adjusted_at,
    foreignId: nhAdjustment.foreign_id,
  };
}

export function mapPmsAdjustmentToNexHealth(adj: {
  patientId: string;
  providerId?: string;
  amount: number;
  adjustmentTypeId?: number;
  description?: string;
  date?: string;
}): Record<string, unknown> {
  return {
    patient_id: Number(adj.patientId),
    provider_id: adj.providerId ? Number(adj.providerId) : undefined,
    adjustment_amount: { amount: String(adj.amount), currency: "USD" },
    adjustment_type_id: adj.adjustmentTypeId,
    description: adj.description,
    adjusted_at: adj.date,
  };
}

// ---------------------------------------------------------------------------
// Charge Mapper
// ---------------------------------------------------------------------------

export function mapNexHealthChargeToPms(nhCharge: NexHealthCharge): {
  pmsChargeId: string;
  patientId: string;
  providerId?: string;
  amount: number;
  procedureCode?: string;
  description?: string;
  date?: string;
  status?: string;
  claimId?: string;
  foreignId?: string;
} {
  return {
    pmsChargeId: String(nhCharge.id),
    patientId: String(nhCharge.patient_id),
    providerId: nhCharge.provider_id != null ? String(nhCharge.provider_id) : undefined,
    amount: priceToNumber(nhCharge.fee),
    procedureCode: nhCharge.procedure_id != null ? String(nhCharge.procedure_id) : undefined,
    description: nhCharge.description,
    date: nhCharge.charged_at,
    status: nhCharge.deleted_at ? "deleted" : "active",
    claimId: nhCharge.claim_ids?.[0] != null ? String(nhCharge.claim_ids[0]) : undefined,
    foreignId: nhCharge.foreign_id,
  };
}

// ---------------------------------------------------------------------------
// Claim Mapper (NexHealth Claims)
// ---------------------------------------------------------------------------

export function mapNexHealthClaimToPms(nhClaim: NexHealthClaim): {
  pmsClaimId: string;
  patientId: string;
  insurancePlanId?: number;
  totalAmount: number;
  paidAmount?: number;
  status?: string;
  submittedDate?: string;
  foreignId?: string;
} {
  return {
    pmsClaimId: String(nhClaim.id),
    patientId: String(nhClaim.patient_id),
    insurancePlanId: nhClaim.subscription_id ?? undefined,
    totalAmount: priceToNumber(nhClaim.payment_estimate_total),
    paidAmount: priceToNumber(nhClaim.write_off_total),
    status: nhClaim.status,
    submittedDate: nhClaim.sent_at,
    foreignId: nhClaim.foreign_id,
  };
}

// ---------------------------------------------------------------------------
// Payment Mapper
// ---------------------------------------------------------------------------

export function mapNexHealthPaymentToPms(nhPayment: NexHealthPayment): {
  pmsPaymentId: string;
  patientId: string;
  amount: number;
  paymentTypeId?: number;
  paymentMethod?: string;
  date?: string;
  note?: string;
  claimId?: string;
  foreignId?: string;
} {
  return {
    pmsPaymentId: String(nhPayment.id),
    patientId: String(nhPayment.patient_id),
    amount: priceToNumber(nhPayment.payment_amount),
    paymentTypeId: nhPayment.payment_type_id ?? undefined,
    paymentMethod: undefined,
    date: nhPayment.paid_at,
    note: nhPayment.description,
    claimId: nhPayment.claim_id != null ? String(nhPayment.claim_id) : undefined,
    foreignId: nhPayment.foreign_id,
  };
}

export function mapPmsPaymentToNexHealth(pmt: {
  patientId: string;
  amount: number;
  paymentTypeId?: number;
  paymentMethod?: string;
  date?: string;
  note?: string;
  claimId?: string;
}): Record<string, unknown> {
  return {
    patient_id: Number(pmt.patientId),
    payment_amount: { amount: String(pmt.amount), currency: "USD" },
    payment_type_id: pmt.paymentTypeId,
    paid_at: pmt.date,
    description: pmt.note,
    claim_id: pmt.claimId ? Number(pmt.claimId) : undefined,
  };
}

// ---------------------------------------------------------------------------
// Treatment Plan Mapper
// ---------------------------------------------------------------------------

export function mapNexHealthTreatmentPlanToPms(nhPlan: NexHealthTreatmentPlan): {
  pmsTreatmentPlanId: string;
  patientId: string;
  providerId?: string;
  name?: string;
  status?: string;
  totalFee?: number;
  procedures?: Array<{
    code: string;
    description?: string;
    fee?: number;
    tooth?: string;
    surface?: string;
    status?: string;
  }>;
  foreignId?: string;
} {
  return {
    pmsTreatmentPlanId: String(nhPlan.id),
    patientId: String(nhPlan.patient_id),
    providerId: nhPlan.provider_id != null ? String(nhPlan.provider_id) : undefined,
    name: nhPlan.name,
    status: nhPlan.status,
    totalFee: nhPlan.total_fee,
    procedures: nhPlan.procedures,
    foreignId: nhPlan.foreign_id,
  };
}

// ---------------------------------------------------------------------------
// Working Hour Mapper
// ---------------------------------------------------------------------------

export function mapNexHealthWorkingHourToPms(nhHour: NexHealthWorkingHour): {
  pmsWorkingHourId: string;
  providerId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  locationId?: number;
  isActive: boolean;
  foreignId?: string;
} {
  return {
    pmsWorkingHourId: String(nhHour.id),
    providerId: String(nhHour.provider_id),
    dayOfWeek: nhHour.day_of_week,
    startTime: nhHour.start_time,
    endTime: nhHour.end_time,
    locationId: nhHour.location_id != null ? Number(nhHour.location_id) : undefined,
    isActive: nhHour.is_active !== false,
    foreignId: nhHour.foreign_id,
  };
}

// ---------------------------------------------------------------------------
// Guarantor Balance Mapper
// ---------------------------------------------------------------------------

export function mapNexHealthGuarantorBalanceToPms(nhBalance: NexHealthGuarantorBalance): {
  pmsGuarantorBalanceId: string;
  patientId: string;
  balance: number;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  foreignId?: string;
} {
  return {
    pmsGuarantorBalanceId: String(nhBalance.id),
    patientId: String(nhBalance.patient_id),
    balance: nhBalance.balance,
    lastPaymentDate: nhBalance.last_payment_date,
    lastPaymentAmount: nhBalance.last_payment_amount,
    foreignId: nhBalance.foreign_id,
  };
}

// ---------------------------------------------------------------------------
// Insurance Balance Mapper
// ---------------------------------------------------------------------------

export function mapNexHealthInsuranceBalanceToPms(nhBalance: NexHealthInsuranceBalance): {
  pmsInsuranceBalanceId: string;
  patientId?: string;
  insurancePlanId?: number;
  balance: number;
  foreignId?: string;
} {
  return {
    pmsInsuranceBalanceId: String(nhBalance.id),
    patientId: nhBalance.patient_id != null ? String(nhBalance.patient_id) : undefined,
    insurancePlanId: nhBalance.insurance_plan_id ?? undefined,
    balance: nhBalance.balance,
    foreignId: nhBalance.foreign_id,
  };
}

// ---------------------------------------------------------------------------
// Insurance Plan Mapper
// ---------------------------------------------------------------------------

export function mapNexHealthInsurancePlanToPms(nhPlan: NexHealthInsurancePlan): {
  pmsInsurancePlanId: string;
  name: string;
  payerName?: string;
  payerId?: string;
  groupNumber?: string;
  employerName?: string;
  foreignId?: string;
} {
  return {
    pmsInsurancePlanId: String(nhPlan.id),
    name: nhPlan.name,
    payerName: nhPlan.name,
    payerId: nhPlan.payer_id,
    groupNumber: nhPlan.group_num,
    employerName: nhPlan.employer_name,
    foreignId: nhPlan.foreign_id,
  };
}
