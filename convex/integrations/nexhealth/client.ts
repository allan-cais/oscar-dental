import type {
  NexHealthAppointment,
  NexHealthAuthResponse,
  NexHealthConfig,
  NexHealthOperatory,
  NexHealthPaginatedResponse,
  NexHealthPatient,
  NexHealthProvider,
  NexHealthSingleResponse,
  NexHealthInstitution,
  NexHealthLocation,
  NexHealthProcedure,
  NexHealthInsuranceCoverage,
  NexHealthAppointmentType,
  NexHealthAvailableSlot,
  NexHealthWorkingHour,
  NexHealthAdjustment,
  NexHealthAdjustmentType,
  NexHealthFeeSchedule,
  NexHealthFeeScheduleProcedure,
  NexHealthPaymentPlan,
  NexHealthPaymentType,
  NexHealthGuarantorBalance,
  NexHealthInsuranceBalance,
  NexHealthCharge,
  NexHealthClaim,
  NexHealthInsurancePlan,
  NexHealthPayment,
  NexHealthClinicalNote,
  NexHealthDocumentType,
  NexHealthPatientAlert,
  NexHealthPatientDocument,
  NexHealthPatientRecall,
  NexHealthRecallType,
  NexHealthTreatmentPlan,
  NexHealthSyncStatus,
  NexHealthWebhookEndpoint,
  NexHealthWebhookSubscription,
  NexHealthOnboarding,
} from "./types";

const PRODUCTION_URL = "https://nexhealth.info";
const SANDBOX_URL = "https://nexhealth.info"; // Same base URL — sandbox vs prod is determined by API key

const TOKEN_TTL_MS = 50 * 60 * 1000; // 50 minutes (safety margin on 60-min expiry)

const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 200;
const BACKOFF_MULTIPLIER = 4;

export class NexHealthApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public responseBody?: string
  ) {
    super(message);
    this.name = "NexHealthApiError";
  }
}

export class NexHealthApiClient {
  private baseUrl: string;
  private apiKey: string;
  private subdomain: string;
  private locationId: string;
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(config: NexHealthConfig) {
    this.apiKey = config.apiKey;
    this.subdomain = config.subdomain;
    this.locationId = config.locationId;
    this.baseUrl =
      config.environment === "production" ? PRODUCTION_URL : SANDBOX_URL;
  }

  async authenticate(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
      return this.tokenCache.token;
    }

    const response = await fetch(`${this.baseUrl}/authenticates`, {
      method: "POST",
      headers: {
        "Nex-Api-Version": "v20240412",
        "Authorization": this.apiKey,
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => undefined);
      throw new NexHealthApiError(
        response.status,
        `Authentication failed: ${response.statusText}`,
        body
      );
    }

    const result: NexHealthAuthResponse = await response.json();
    this.tokenCache = {
      token: result.data.token,
      expiresAt: Date.now() + TOKEN_TTL_MS,
    };
    return this.tokenCache.token;
  }

  private async request<T>(
    method: string,
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
    body?: unknown
  ): Promise<T> {
    const token = await this.authenticate();

    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set("subdomain", this.subdomain);
    url.searchParams.set("location_id", this.locationId);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Nex-Api-Version": "v20240412",
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay =
          BACKOFF_BASE_MS * Math.pow(BACKOFF_MULTIPLIER, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const response = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (response.ok) {
        return (await response.json()) as T;
      }

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 5000;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      if (response.status >= 500) {
        const responseBody = await response.text().catch(() => undefined);
        lastError = new NexHealthApiError(
          response.status,
          `Server error: ${response.statusText}`,
          responseBody
        );
        continue;
      }

      // 4xx (non-429) — don't retry
      const responseBody = await response.text().catch(() => undefined);
      throw new NexHealthApiError(
        response.status,
        `Request failed: ${response.statusText}`,
        responseBody
      );
    }

    throw lastError ?? new Error("Request failed after retries");
  }

  // -------------------------------------------------------------------------
  // Patients
  // -------------------------------------------------------------------------

  getPatients(params?: {
    per_page?: number;
    start_cursor?: string;
    end_cursor?: string;
    updated_since?: string;
    sort?: string;
    include_deleted?: boolean;
    guarantor_id?: number;
    provider_id?: number;
  }): Promise<NexHealthPaginatedResponse<NexHealthPatient>> {
    return this.request("GET", "/patients", params);
  }

  getPatient(
    id: number
  ): Promise<NexHealthSingleResponse<NexHealthPatient>> {
    return this.request("GET", `/patients/${id}`);
  }

  createPatient(
    data: Partial<NexHealthPatient>
  ): Promise<NexHealthSingleResponse<NexHealthPatient>> {
    return this.request("POST", "/patients", undefined, { patient: data });
  }

  updatePatient(
    id: number,
    data: Partial<NexHealthPatient>
  ): Promise<NexHealthSingleResponse<NexHealthPatient>> {
    return this.request("PATCH", `/patients/${id}`, undefined, {
      patient: data,
    });
  }

  // -------------------------------------------------------------------------
  // Appointments
  // -------------------------------------------------------------------------

  getAppointments(params?: {
    start?: string;
    end?: string;
    per_page?: number;
    start_cursor?: string;
    end_cursor?: string;
    updated_since?: string;
    sort?: string;
    provider_id?: number;
    patient_id?: number;
    appointment_type_id?: number;
    guarantor_id?: number;
  }): Promise<NexHealthPaginatedResponse<NexHealthAppointment>> {
    return this.request("GET", "/appointments", params);
  }

  getAppointment(
    id: number
  ): Promise<NexHealthSingleResponse<NexHealthAppointment>> {
    return this.request("GET", `/appointments/${id}`);
  }

  createAppointment(
    data: Partial<NexHealthAppointment>
  ): Promise<NexHealthSingleResponse<NexHealthAppointment>> {
    return this.request("POST", "/appointments", undefined, {
      appt: data,
    });
  }

  updateAppointment(
    id: number,
    data: Partial<NexHealthAppointment>
  ): Promise<NexHealthSingleResponse<NexHealthAppointment>> {
    return this.request("PATCH", `/appointments/${id}`, undefined, {
      appt: data,
    });
  }

  // -------------------------------------------------------------------------
  // Providers
  // -------------------------------------------------------------------------

  getProviders(params?: {
    per_page?: number;
    start_cursor?: string;
    end_cursor?: string;
  }): Promise<NexHealthPaginatedResponse<NexHealthProvider>> {
    return this.request("GET", "/providers", params);
  }

  getProvider(
    id: number
  ): Promise<NexHealthSingleResponse<NexHealthProvider>> {
    return this.request("GET", `/providers/${id}`);
  }

  // -------------------------------------------------------------------------
  // Operatories
  // -------------------------------------------------------------------------

  getOperatories(params?: {
    per_page?: number;
    start_cursor?: string;
    end_cursor?: string;
  }): Promise<NexHealthPaginatedResponse<NexHealthOperatory>> {
    return this.request("GET", "/operatories", params);
  }

  getOperatory(
    id: number
  ): Promise<NexHealthSingleResponse<NexHealthOperatory>> {
    return this.request("GET", `/operatories/${id}`);
  }

  // -------------------------------------------------------------------------
  // Institutions
  // -------------------------------------------------------------------------

  getInstitutions(params?: {
    per_page?: number;
    start_cursor?: string;
    end_cursor?: string;
  }): Promise<NexHealthPaginatedResponse<NexHealthInstitution>> {
    return this.request("GET", "/institutions", params);
  }

  getInstitution(
    id: number
  ): Promise<NexHealthSingleResponse<NexHealthInstitution>> {
    return this.request("GET", `/institutions/${id}`);
  }

  // -------------------------------------------------------------------------
  // Locations
  // -------------------------------------------------------------------------

  getLocations(params?: {
    per_page?: number;
    start_cursor?: string;
    end_cursor?: string;
  }): Promise<NexHealthPaginatedResponse<NexHealthLocation>> {
    return this.request("GET", "/locations", params);
  }

  getLocation(
    id: number
  ): Promise<NexHealthSingleResponse<NexHealthLocation>> {
    return this.request("GET", `/locations/${id}`);
  }

  // -------------------------------------------------------------------------
  // Insurance Coverages (Patient)
  // -------------------------------------------------------------------------

  getPatientInsuranceCoverages(
    patientId: number,
    params?: {
      per_page?: number;
      start_cursor?: string;
      end_cursor?: string;
    }
  ): Promise<NexHealthPaginatedResponse<NexHealthInsuranceCoverage>> {
    return this.request(
      "GET",
      `/patients/${patientId}/insurance_coverages`,
      params
    );
  }

  // -------------------------------------------------------------------------
  // Procedures
  // -------------------------------------------------------------------------

  getProcedures(params?: {
    per_page?: number;
    start_cursor?: string;
    end_cursor?: string;
    patient_id?: number;
    appointment_id?: number;
    updated_since?: string;
    started_after?: string;
    started_before?: string;
    ended_after?: string;
    ended_before?: string;
    sort?: string;
  }): Promise<NexHealthPaginatedResponse<NexHealthProcedure>> {
    return this.request("GET", "/procedures", params);
  }

  getProcedure(
    id: number
  ): Promise<NexHealthSingleResponse<NexHealthProcedure>> {
    return this.request("GET", `/procedures/${id}`);
  }

  // -------------------------------------------------------------------------
  // Appointment Types
  // -------------------------------------------------------------------------

  getAppointmentTypes(params?: {
    per_page?: number;
    start_cursor?: string;
    end_cursor?: string;
  }): Promise<NexHealthPaginatedResponse<NexHealthAppointmentType>> {
    return this.request("GET", "/appointment_types", params);
  }

  getAppointmentType(
    id: number
  ): Promise<NexHealthSingleResponse<NexHealthAppointmentType>> {
    return this.request("GET", `/appointment_types/${id}`);
  }

  createAppointmentType(
    data: Partial<NexHealthAppointmentType>
  ): Promise<NexHealthSingleResponse<NexHealthAppointmentType>> {
    return this.request("POST", "/appointment_types", undefined, {
      appointment_type: data,
    });
  }

  updateAppointmentType(
    id: number,
    data: Partial<NexHealthAppointmentType>
  ): Promise<NexHealthSingleResponse<NexHealthAppointmentType>> {
    return this.request("PATCH", `/appointment_types/${id}`, undefined, {
      appointment_type: data,
    });
  }

  deleteAppointmentType(id: number): Promise<void> {
    return this.request("DELETE", `/appointment_types/${id}`);
  }

  // -------------------------------------------------------------------------
  // Available Slots
  // -------------------------------------------------------------------------

  getAvailableSlots(params: {
    start_date: string;
    end_date: string;
    provider_id?: number;
    appointment_type_id?: number;
    per_page?: number;
    start_cursor?: string;
    end_cursor?: string;
  }): Promise<NexHealthPaginatedResponse<NexHealthAvailableSlot>> {
    return this.request("GET", "/available_slots", params);
  }

  // -------------------------------------------------------------------------
  // Working Hours
  // -------------------------------------------------------------------------

  getWorkingHours(params?: {
    provider_id?: number;
    per_page?: number;
    start_cursor?: string;
    end_cursor?: string;
  }): Promise<NexHealthPaginatedResponse<NexHealthWorkingHour>> {
    return this.request("GET", "/working_hours", params);
  }

  getWorkingHour(
    id: number
  ): Promise<NexHealthSingleResponse<NexHealthWorkingHour>> {
    return this.request("GET", `/working_hours/${id}`);
  }

  createWorkingHour(
    data: Partial<NexHealthWorkingHour>
  ): Promise<NexHealthSingleResponse<NexHealthWorkingHour>> {
    return this.request("POST", "/working_hours", undefined, {
      working_hour: data,
    });
  }

  updateWorkingHour(
    id: number,
    data: Partial<NexHealthWorkingHour>
  ): Promise<NexHealthSingleResponse<NexHealthWorkingHour>> {
    return this.request("PATCH", `/working_hours/${id}`, undefined, {
      working_hour: data,
    });
  }

  deleteWorkingHour(id: number): Promise<void> {
    return this.request("DELETE", `/working_hours/${id}`);
  }

  // -------------------------------------------------------------------------
  // Adjustments
  // -------------------------------------------------------------------------

  getAdjustments(params?: {
    patient_id?: number;
    provider_id?: number;
    guarantor_id?: number;
    charge_id?: number;
    claim_id?: number;
    per_page?: number;
    start_cursor?: string;
    end_cursor?: string;
    updated_since?: string;
    include_deleted?: boolean;
    sort?: string;
  }): Promise<NexHealthPaginatedResponse<NexHealthAdjustment>> {
    return this.request("GET", "/adjustments", params);
  }

  createAdjustment(
    data: Partial<NexHealthAdjustment>
  ): Promise<NexHealthSingleResponse<NexHealthAdjustment>> {
    return this.request("POST", "/adjustments", undefined, {
      adjustment: data,
    });
  }

  getAdjustment(
    id: number
  ): Promise<NexHealthSingleResponse<NexHealthAdjustment>> {
    return this.request("GET", `/adjustments/${id}`);
  }

  // -------------------------------------------------------------------------
  // Adjustment Types
  // -------------------------------------------------------------------------

  getAdjustmentTypes(params?: {
    per_page?: number;
    start_cursor?: string;
    end_cursor?: string;
  }): Promise<NexHealthPaginatedResponse<NexHealthAdjustmentType>> {
    return this.request("GET", "/adjustment_types", params);
  }

  getAdjustmentType(
    id: number
  ): Promise<NexHealthSingleResponse<NexHealthAdjustmentType>> {
    return this.request("GET", `/adjustment_types/${id}`);
  }

  // -------------------------------------------------------------------------
  // Fee Schedules
  // -------------------------------------------------------------------------

  getFeeSchedules(params?: {
    per_page?: number;
    start_cursor?: string;
    end_cursor?: string;
  }): Promise<NexHealthPaginatedResponse<NexHealthFeeSchedule>> {
    return this.request("GET", "/fee_schedules", params);
  }

  getFeeSchedule(
    id: number
  ): Promise<NexHealthSingleResponse<NexHealthFeeSchedule>> {
    return this.request("GET", `/fee_schedules/${id}`);
  }

  getFeeScheduleProcedures(params?: {
    fee_schedule_id?: number;
    per_page?: number;
    start_cursor?: string;
    end_cursor?: string;
  }): Promise<NexHealthPaginatedResponse<NexHealthFeeScheduleProcedure>> {
    return this.request("GET", "/fee_schedule_procedures", params);
  }

  // -------------------------------------------------------------------------
  // Payment Plans
  // -------------------------------------------------------------------------

  getPaymentPlans(params?: {
    patient_id?: number;
    per_page?: number;
    start_cursor?: string;
    end_cursor?: string;
  }): Promise<NexHealthPaginatedResponse<NexHealthPaymentPlan>> {
    return this.request("GET", "/payment_plans", params);
  }

  getPaymentPlan(
    id: number
  ): Promise<NexHealthSingleResponse<NexHealthPaymentPlan>> {
    return this.request("GET", `/payment_plans/${id}`);
  }

  // -------------------------------------------------------------------------
  // Payment Types
  // -------------------------------------------------------------------------

  getPaymentTypes(params?: {
    per_page?: number;
    start_cursor?: string;
    end_cursor?: string;
  }): Promise<NexHealthPaginatedResponse<NexHealthPaymentType>> {
    return this.request("GET", "/payment_types", params);
  }

  getPaymentType(
    id: number
  ): Promise<NexHealthSingleResponse<NexHealthPaymentType>> {
    return this.request("GET", `/payment_types/${id}`);
  }

  // -------------------------------------------------------------------------
  // Guarantor Balances
  // -------------------------------------------------------------------------

  getGuarantorBalances(params?: {
    patient_id?: number;
    per_page?: number;
    start_cursor?: string;
    end_cursor?: string;
  }): Promise<NexHealthPaginatedResponse<NexHealthGuarantorBalance>> {
    return this.request("GET", "/guarantor_balances", params);
  }

  getGuarantorBalance(
    id: number
  ): Promise<NexHealthSingleResponse<NexHealthGuarantorBalance>> {
    return this.request("GET", `/guarantor_balances/${id}`);
  }

  // -------------------------------------------------------------------------
  // Insurance Balances
  // -------------------------------------------------------------------------

  getInsuranceBalances(params?: {
    patient_id?: number;
    per_page?: number;
    start_cursor?: string;
    end_cursor?: string;
  }): Promise<NexHealthPaginatedResponse<NexHealthInsuranceBalance>> {
    return this.request("GET", "/insurance_balances", params);
  }

  getInsuranceBalance(
    id: number
  ): Promise<NexHealthSingleResponse<NexHealthInsuranceBalance>> {
    return this.request("GET", `/insurance_balances/${id}`);
  }

  // -------------------------------------------------------------------------
  // Charges
  // -------------------------------------------------------------------------

  getCharges(params?: {
    patient_id?: number;
    provider_id?: number;
    procedure_id?: number;
    guarantor_id?: number;
    claim_id?: number;
    per_page?: number;
    start_cursor?: string;
    end_cursor?: string;
    updated_since?: string;
    include_deleted?: boolean;
    sort?: string;
  }): Promise<NexHealthPaginatedResponse<NexHealthCharge>> {
    return this.request("GET", "/charges", params);
  }

  getCharge(
    id: number
  ): Promise<NexHealthSingleResponse<NexHealthCharge>> {
    return this.request("GET", `/charges/${id}`);
  }

  // -------------------------------------------------------------------------
  // Claims
  // -------------------------------------------------------------------------

  getClaims(params?: {
    patient_id?: number;
    provider_id?: number;
    guarantor_id?: number;
    per_page?: number;
    start_cursor?: string;
    end_cursor?: string;
    updated_since?: string;
    sort?: string;
  }): Promise<NexHealthPaginatedResponse<NexHealthClaim>> {
    return this.request("GET", "/claims", params);
  }

  getClaim(
    id: number
  ): Promise<NexHealthSingleResponse<NexHealthClaim>> {
    return this.request("GET", `/claims/${id}`);
  }

  // -------------------------------------------------------------------------
  // Insurance Plans
  // -------------------------------------------------------------------------

  getInsurancePlans(params?: {
    per_page?: number;
    start_cursor?: string;
    end_cursor?: string;
  }): Promise<NexHealthPaginatedResponse<NexHealthInsurancePlan>> {
    return this.request("GET", "/insurance_plans", params);
  }

  getInsurancePlan(
    id: number
  ): Promise<NexHealthSingleResponse<NexHealthInsurancePlan>> {
    return this.request("GET", `/insurance_plans/${id}`);
  }

  // -------------------------------------------------------------------------
  // Insurance Coverages
  // -------------------------------------------------------------------------

  getInsuranceCoverages(params?: {
    patient_id?: number;
    per_page?: number;
    start_cursor?: string;
    end_cursor?: string;
  }): Promise<NexHealthPaginatedResponse<NexHealthInsuranceCoverage>> {
    return this.request("GET", "/insurance_coverages", params);
  }

  getInsuranceCoverage(
    id: number
  ): Promise<NexHealthSingleResponse<NexHealthInsuranceCoverage>> {
    return this.request("GET", `/insurance_coverages/${id}`);
  }

  // -------------------------------------------------------------------------
  // Payments
  // -------------------------------------------------------------------------

  getPayments(params?: {
    patient_id?: number;
    provider_id?: number;
    guarantor_id?: number;
    claim_id?: number;
    charge_id?: number;
    transaction_id?: string;
    per_page?: number;
    start_cursor?: string;
    end_cursor?: string;
    updated_since?: string;
    include_deleted?: boolean;
    sort?: string;
  }): Promise<NexHealthPaginatedResponse<NexHealthPayment>> {
    return this.request("GET", "/payments", params);
  }

  createPayment(
    data: Partial<NexHealthPayment>
  ): Promise<NexHealthSingleResponse<NexHealthPayment>> {
    return this.request("POST", "/payment_transactions", undefined, {
      payment_transaction: data,
    });
  }

  getPayment(
    id: number
  ): Promise<NexHealthSingleResponse<NexHealthPayment>> {
    return this.request("GET", `/payments/${id}`);
  }

  // -------------------------------------------------------------------------
  // Clinical Notes
  // -------------------------------------------------------------------------

  getClinicalNotes(params?: {
    patient_id?: number;
    per_page?: number;
    start_cursor?: string;
    end_cursor?: string;
  }): Promise<NexHealthPaginatedResponse<NexHealthClinicalNote>> {
    return this.request("GET", "/clinical_notes", params);
  }

  // -------------------------------------------------------------------------
  // Document Types
  // -------------------------------------------------------------------------

  getDocumentTypes(params?: {
    per_page?: number;
    start_cursor?: string;
    end_cursor?: string;
  }): Promise<NexHealthPaginatedResponse<NexHealthDocumentType>> {
    return this.request("GET", "/document_types", params);
  }

  getDocumentType(
    id: number
  ): Promise<NexHealthSingleResponse<NexHealthDocumentType>> {
    return this.request("GET", `/document_types/${id}`);
  }

  // -------------------------------------------------------------------------
  // Patient Alerts
  // -------------------------------------------------------------------------

  createPatientAlert(
    patientId: number,
    data: Partial<NexHealthPatientAlert>
  ): Promise<NexHealthSingleResponse<NexHealthPatientAlert>> {
    return this.request(
      "POST",
      `/patients/${patientId}/alerts`,
      undefined,
      { alert: data }
    );
  }

  getPatientAlerts(
    patientId: number,
    params?: {
      per_page?: number;
      start_cursor?: string;
      end_cursor?: string;
    }
  ): Promise<NexHealthPaginatedResponse<NexHealthPatientAlert>> {
    return this.request("GET", `/patients/${patientId}/alerts`, params);
  }

  getPatientAlert(
    patientId: number,
    alertId: number
  ): Promise<NexHealthSingleResponse<NexHealthPatientAlert>> {
    return this.request("GET", `/patients/${patientId}/alerts/${alertId}`);
  }

  updatePatientAlert(
    patientId: number,
    alertId: number,
    data: Partial<NexHealthPatientAlert>
  ): Promise<NexHealthSingleResponse<NexHealthPatientAlert>> {
    return this.request(
      "PATCH",
      `/patients/${patientId}/alerts/${alertId}`,
      undefined,
      { alert: data }
    );
  }

  // -------------------------------------------------------------------------
  // Patient Documents
  // -------------------------------------------------------------------------

  getPatientDocuments(
    patientId: number,
    params?: {
      per_page?: number;
      start_cursor?: string;
      end_cursor?: string;
    }
  ): Promise<NexHealthPaginatedResponse<NexHealthPatientDocument>> {
    return this.request("GET", `/patients/${patientId}/documents`, params);
  }

  createPatientDocument(
    patientId: number,
    data: Partial<NexHealthPatientDocument>
  ): Promise<NexHealthSingleResponse<NexHealthPatientDocument>> {
    return this.request(
      "POST",
      `/patients/${patientId}/documents`,
      undefined,
      { document: data }
    );
  }

  // -------------------------------------------------------------------------
  // Patient Recalls
  // -------------------------------------------------------------------------

  getPatientRecalls(params?: {
    patient_id?: number;
    per_page?: number;
    start_cursor?: string;
    end_cursor?: string;
  }): Promise<NexHealthPaginatedResponse<NexHealthPatientRecall>> {
    return this.request("GET", "/patient_recalls", params);
  }

  getPatientRecall(
    id: number
  ): Promise<NexHealthSingleResponse<NexHealthPatientRecall>> {
    return this.request("GET", `/patient_recalls/${id}`);
  }

  // -------------------------------------------------------------------------
  // Recall Types
  // -------------------------------------------------------------------------

  getRecallTypes(params?: {
    per_page?: number;
    start_cursor?: string;
    end_cursor?: string;
  }): Promise<NexHealthPaginatedResponse<NexHealthRecallType>> {
    return this.request("GET", "/recall_types", params);
  }

  getRecallType(
    id: number
  ): Promise<NexHealthSingleResponse<NexHealthRecallType>> {
    return this.request("GET", `/recall_types/${id}`);
  }

  // -------------------------------------------------------------------------
  // Treatment Plans
  // -------------------------------------------------------------------------

  getTreatmentPlans(params?: {
    patient_id?: number;
    per_page?: number;
    start_cursor?: string;
    end_cursor?: string;
    updated_since?: string;
    sort?: string;
  }): Promise<NexHealthPaginatedResponse<NexHealthTreatmentPlan>> {
    return this.request("GET", "/treatment_plans", params);
  }

  getTreatmentPlan(
    id: number
  ): Promise<NexHealthSingleResponse<NexHealthTreatmentPlan>> {
    return this.request("GET", `/treatment_plans/${id}`);
  }

  // -------------------------------------------------------------------------
  // Sync Status
  // -------------------------------------------------------------------------

  getSyncStatus(): Promise<NexHealthSingleResponse<NexHealthSyncStatus>> {
    return this.request("GET", "/sync_status");
  }

  // -------------------------------------------------------------------------
  // Webhook Endpoints
  // -------------------------------------------------------------------------

  getWebhookEndpoints(params?: {
    per_page?: number;
    start_cursor?: string;
    end_cursor?: string;
  }): Promise<NexHealthPaginatedResponse<NexHealthWebhookEndpoint>> {
    return this.request("GET", "/webhook_endpoints", params);
  }

  createWebhookEndpoint(
    data: Partial<NexHealthWebhookEndpoint>
  ): Promise<NexHealthSingleResponse<NexHealthWebhookEndpoint>> {
    return this.request("POST", "/webhook_endpoints", undefined, {
      webhook_endpoint: data,
    });
  }

  updateWebhookEndpoint(
    id: number,
    data: Partial<NexHealthWebhookEndpoint>
  ): Promise<NexHealthSingleResponse<NexHealthWebhookEndpoint>> {
    return this.request("PATCH", `/webhook_endpoints/${id}`, undefined, {
      webhook_endpoint: data,
    });
  }

  deleteWebhookEndpoint(id: number): Promise<void> {
    return this.request("DELETE", `/webhook_endpoints/${id}`);
  }

  // -------------------------------------------------------------------------
  // Webhook Subscriptions
  // -------------------------------------------------------------------------

  getWebhookSubscriptions(
    endpointId: number,
    params?: {
      per_page?: number;
      start_cursor?: string;
      end_cursor?: string;
    }
  ): Promise<NexHealthPaginatedResponse<NexHealthWebhookSubscription>> {
    return this.request(
      "GET",
      `/webhook_endpoints/${endpointId}/subscriptions`,
      params
    );
  }

  createWebhookSubscription(
    endpointId: number,
    data: Partial<NexHealthWebhookSubscription>
  ): Promise<NexHealthSingleResponse<NexHealthWebhookSubscription>> {
    return this.request(
      "POST",
      `/webhook_endpoints/${endpointId}/subscriptions`,
      undefined,
      { webhook_subscription: data }
    );
  }

  updateWebhookSubscription(
    endpointId: number,
    subId: number,
    data: Partial<NexHealthWebhookSubscription>
  ): Promise<NexHealthSingleResponse<NexHealthWebhookSubscription>> {
    return this.request(
      "PATCH",
      `/webhook_endpoints/${endpointId}/subscriptions/${subId}`,
      undefined,
      { webhook_subscription: data }
    );
  }

  deleteWebhookSubscription(
    endpointId: number,
    subId: number
  ): Promise<void> {
    return this.request(
      "DELETE",
      `/webhook_endpoints/${endpointId}/subscriptions/${subId}`
    );
  }

  // -------------------------------------------------------------------------
  // Onboardings
  // -------------------------------------------------------------------------

  getOnboardings(params?: {
    per_page?: number;
    start_cursor?: string;
    end_cursor?: string;
  }): Promise<NexHealthPaginatedResponse<NexHealthOnboarding>> {
    return this.request("GET", "/onboardings", params);
  }

  createOnboarding(
    data: Partial<NexHealthOnboarding>
  ): Promise<NexHealthSingleResponse<NexHealthOnboarding>> {
    return this.request("POST", "/onboardings", undefined, {
      onboarding: data,
    });
  }

  getOnboarding(
    hashId: string
  ): Promise<NexHealthSingleResponse<NexHealthOnboarding>> {
    return this.request("GET", `/onboardings/${hashId}`);
  }
}
