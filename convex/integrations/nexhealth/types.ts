// NexHealth Synchronizer API Types
// Matches NexHealth REST API v20240412 response shapes

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export interface NexHealthAuthResponse {
  code: boolean;
  description: string;
  data: {
    token: string;
  };
}

// ---------------------------------------------------------------------------
// Core Resources
// ---------------------------------------------------------------------------
export interface NexHealthPatient {
  id: number;
  email?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  name?: string;
  created_at?: string;
  updated_at?: string;
  institution_id?: number;
  foreign_id?: string;
  foreign_id_type?: string;
  bio?: {
    city?: string;
    state?: string;
    gender?: string;
    zip_code?: string;
    new_patient?: boolean;
    non_patient?: boolean;
    phone_number?: string;
    date_of_birth?: string;
    address_line_1?: string;
    address_line_2?: string;
    street_address?: string;
    cell_phone_number?: string;
    home_phone_number?: string;
    work_phone_number?: string;
    verified_mobile?: string;
  };
  inactive: boolean;
  last_sync_time?: string;
  guarantor_id?: number;
  unsubscribe_sms?: boolean;
  billing_type?: string;
  chart_id?: string;
  preferred_language?: string;
  preferred_locale?: string;
  location_ids?: number[];
  provider_id?: number;
}

export interface NexHealthAppointment {
  id: number;
  patient_id: number;
  provider_id: number;
  provider_name?: string;
  operatory_id?: number;
  location_id: number;
  institution_id?: number;
  appointment_type_id?: number;
  start_time: string;
  end_time?: string;
  note?: string;
  confirmed?: boolean;
  patient_missed?: boolean;
  unavailable?: boolean;
  cancelled?: boolean;
  cancelled_at?: string;
  timezone?: string;
  timezone_offset?: string;
  checkin_at?: string;
  checked_out?: boolean;
  checked_out_at?: string;
  confirmed_at?: string;
  patient_confirmed?: boolean;
  patient_confirmed_at?: string;
  sooner_if_possible?: boolean;
  is_guardian?: boolean;
  is_new_clients_patient?: boolean;
  is_past_patient?: boolean;
  created_by_user_id?: number;
  referrer?: string;
  foreign_id?: string;
  foreign_id_type?: string;
  deleted?: boolean;
  misc?: Record<string, unknown>;
  last_sync_time?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NexHealthProvider {
  id: number;
  email?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  name?: string;
  npi?: string;
  inactive: boolean;
  provider_type?: string;
  specialty?: string;
  foreign_id?: string;
  foreign_id_type?: string;
  institution_id?: number;
  bio?: Record<string, unknown>;
  display_name?: string;
  tin?: string;
  state_license?: string;
  specialty_code?: string;
  nexhealth_specialty?: string;
  profile_url?: string;
  created_at?: string;
  updated_at?: string;
  last_sync_time?: string;
}

export interface NexHealthOperatory {
  id: number;
  name: string;
  short_name?: string;
  inactive: boolean;
  foreign_id?: string;
}

// ---------------------------------------------------------------------------
// Practice Overview
// ---------------------------------------------------------------------------
export interface NexHealthInstitution {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  subdomain?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NexHealthLocation {
  id: number;
  name: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  timezone?: string;
  institution_id?: number;
  foreign_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NexHealthProcedure {
  id: number;
  code: string;
  description?: string;
  fee?: number;
  tooth?: string;
  surface?: string;
  provider_id?: number;
  patient_id?: number;
  appointment_id?: number;
  status?: string;
  completed_at?: string;
  foreign_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NexHealthInsuranceCoverage {
  id: number;
  patient_id: number;
  // v20240412 field names
  plan_id?: number;
  subscriber_num?: string;
  subscription_relation?: string; // "employee" | "self" | "spouse" | "child"
  priority?: number; // 0 = primary, 1 = secondary
  effective_date?: string;
  expiration_date?: string;
  insurance_type?: string; // "dental" | "medical" | "vision"
  active?: boolean;
  // Legacy field names (pre-v20240412, kept for compatibility)
  insurance_plan_id?: number;
  member_id?: string;
  group_number?: string;
  subscriber_name?: string;
  subscriber_dob?: string;
  relationship?: string;
  rank?: string;
  termination_date?: string;
  foreign_id?: string;
  created_at?: string;
  updated_at?: string;
}

// ---------------------------------------------------------------------------
// Scheduling
// ---------------------------------------------------------------------------
export interface NexHealthAppointmentType {
  id: number;
  name: string;
  duration?: number;
  color?: string;
  description?: string;
  is_active?: boolean;
  foreign_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NexHealthAvailableSlot {
  time: string; // ISO 8601
  provider_id: number;
  operatory_id?: number;
  duration: number;
  appointment_type_id?: number;
}

export interface NexHealthWorkingHour {
  id: number;
  provider_id: number;
  day_of_week: number; // 0=Sunday, 6=Saturday
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  location_id?: number;
  is_active?: boolean;
  foreign_id?: string;
  created_at?: string;
  updated_at?: string;
}

// ---------------------------------------------------------------------------
// Practice Financials
// ---------------------------------------------------------------------------
export interface NexHealthPrice {
  amount: string;
  currency: string;
}

export interface NexHealthAdjustment {
  id: number;
  foreign_id?: string;
  location_id?: number;
  patient_id: number;
  guarantor_id?: number;
  provider_id?: number;
  updated_at?: string;
  description?: string;
  deleted_at?: string;
  adjustment_amount?: NexHealthPrice;
  adjusted_at?: string;
  transaction_id?: string;
  charge_id?: number;
  claim_id?: number;
  adjustment_type_id?: number;
}

export interface NexHealthAdjustmentType {
  id: number;
  name: string;
  description?: string;
  is_credit?: boolean;
  foreign_id?: string;
}

export interface NexHealthFeeSchedule {
  id: number;
  name: string;
  description?: string;
  is_default?: boolean;
  foreign_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NexHealthFeeScheduleProcedure {
  id: number;
  fee_schedule_id: number;
  procedure_code: string;
  fee: number;
  description?: string;
  foreign_id?: string;
}

export interface NexHealthPaymentPlan {
  id: number;
  patient_id: number;
  total_amount: number;
  remaining_amount?: number;
  installment_amount?: number;
  frequency?: string;
  start_date?: string;
  status?: string;
  foreign_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NexHealthPaymentType {
  id: number;
  name: string;
  description?: string;
  foreign_id?: string;
}

export interface NexHealthGuarantorBalance {
  id: number;
  patient_id: number;
  balance: number;
  last_payment_date?: string;
  last_payment_amount?: number;
  foreign_id?: string;
  updated_at?: string;
}

export interface NexHealthInsuranceBalance {
  id: number;
  patient_id?: number;
  insurance_plan_id?: number;
  balance: number;
  foreign_id?: string;
  updated_at?: string;
}

export interface NexHealthCharge {
  id: number;
  foreign_id?: string;
  location_id?: number;
  patient_id: number;
  guarantor_id?: number;
  provider_id?: number;
  fee?: NexHealthPrice;
  charged_at?: string;
  procedure_id?: number;
  claim_ids?: number[];
  payment_estimate_total?: NexHealthPrice;
  write_off_estimate_total?: NexHealthPrice;
  write_off_total?: NexHealthPrice;
  description?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface NexHealthClaim {
  id: number;
  location_id?: number;
  patient_id: number;
  provider_id?: number;
  guarantor_id?: number;
  subscription_id?: number;
  status?: string;
  finalized_at?: string;
  sent_at?: string;
  note?: string;
  payment_estimate_total?: NexHealthPrice;
  write_off_estimate_total?: NexHealthPrice;
  write_off_total?: NexHealthPrice;
  deleted_at?: string;
  foreign_id?: string;
  updated_at?: string;
  created_at?: string;
}

export interface NexHealthInsurancePlan {
  id: number;
  name: string;
  payer_id?: string;
  address?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country_code?: string;
  group_num?: string;
  employer_name?: string;
  foreign_id?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface NexHealthPayment {
  id: number;
  foreign_id?: string;
  location_id?: number;
  patient_id: number;
  guarantor_id?: number;
  provider_id?: number;
  updated_at?: string;
  description?: string;
  deleted_at?: string;
  payment_amount?: NexHealthPrice;
  paid_at?: string;
  transaction_id?: string;
  charge_id?: number;
  claim_id?: number;
  payment_type_id?: number;
  payment_plan_id?: number;
}

// ---------------------------------------------------------------------------
// Patient Communication
// ---------------------------------------------------------------------------
export interface NexHealthClinicalNote {
  id: number;
  patient_id: number;
  procedure_id?: number;
  entered_at?: string;
  content?: string;
  signed?: boolean;
  completed?: boolean;
}

export interface NexHealthDocumentType {
  id: number;
  name: string;
  description?: string;
  foreign_id?: string;
}

export interface NexHealthPatientAlert {
  id: number;
  patient_id: number;
  message: string;
  alert_type?: string;
  is_active?: boolean;
  foreign_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NexHealthPatientDocument {
  id: number;
  patient_id: number;
  document_type_id?: number;
  name: string;
  url?: string;
  foreign_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NexHealthPatientRecall {
  id: number;
  patient_id: number;
  recall_type_id?: number;
  due_date: string;
  status?: string;
  completed_date?: string;
  foreign_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NexHealthRecallType {
  id: number;
  name: string;
  interval_months?: number;
  description?: string;
  foreign_id?: string;
}

export interface NexHealthTreatmentPlan {
  id: number;
  patient_id: number;
  provider_id?: number;
  name?: string;
  status?: string;
  total_fee?: number;
  procedures?: Array<{
    code: string;
    description?: string;
    fee?: number;
    tooth?: string;
    surface?: string;
    status?: string;
  }>;
  foreign_id?: string;
  created_at?: string;
  updated_at?: string;
}

// ---------------------------------------------------------------------------
// Webhook Events
// ---------------------------------------------------------------------------
export interface NexHealthWebhookEvent {
  id: string;
  type: string; // e.g. "patient.created", "appointment.updated"
  data: Record<string, unknown>;
  resource_id: number;
  subdomain: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// NexHealth API (STUB types)
// ---------------------------------------------------------------------------
export interface NexHealthSyncStatus {
  status: string;
  last_sync_at?: string;
  records_synced?: number;
  errors?: string[];
}

export interface NexHealthWebhookEndpoint {
  id: number;
  url: string;
  is_active?: boolean;
  events?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface NexHealthWebhookSubscription {
  id: number;
  webhook_endpoint_id: number;
  event_type: string;
  is_active?: boolean;
  created_at?: string;
}

export interface NexHealthOnboarding {
  id: number;
  hash_id?: string;
  status?: string;
  institution_id?: number;
  location_id?: number;
  pms_type?: string;
  created_at?: string;
  updated_at?: string;
}

// ---------------------------------------------------------------------------
// API Response Wrappers
// ---------------------------------------------------------------------------
export interface NexHealthPageInfo {
  has_previous_page: boolean;
  has_next_page: boolean;
  start_cursor: string;
  end_cursor: string;
}

export interface NexHealthPaginatedResponse<T> {
  code: boolean;
  description: string | string[] | null;
  error: string[] | null;
  data: T[];
  count?: number;
  page_info?: NexHealthPageInfo;
}

export interface NexHealthSingleResponse<T> {
  code: boolean;
  description: string | string[] | null;
  error: string[] | null;
  data: T;
}

// ---------------------------------------------------------------------------
// Internal Config (passed to client constructor)
// ---------------------------------------------------------------------------
export interface NexHealthConfig {
  apiKey: string;
  subdomain: string;
  locationId: string;
  environment: "sandbox" | "production";
}
