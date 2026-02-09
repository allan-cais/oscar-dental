import { NexHealthApiClient, NexHealthApiError } from "../nexhealth/client";
import {
  mapNexHealthPatientToPms,
  mapNexHealthAppointmentToPms,
  mapNexHealthProviderToPms,
  mapPmsAppointmentToNexHealth,
  mapOscarStatusToNexHealth,
  mapNexHealthAppointmentTypeToPms,
  mapNexHealthInsuranceCoverageToPms,
  mapNexHealthPatientRecallToPms,
  mapNexHealthFeeScheduleToPms,
  mapNexHealthProcedureToPms,
  mapNexHealthPaymentToPms,
  mapPmsPaymentToNexHealth,
  mapNexHealthAdjustmentToPms,
  mapPmsAdjustmentToNexHealth,
  mapNexHealthChargeToPms,
} from "../nexhealth/mappers";
import type {
  PmsAdapter,
  PmsAppointment,
  PmsAppointmentType,
  PmsAdjustment,
  PmsCapabilities,
  PmsCharge,
  PmsClaim,
  PmsFeeSchedule,
  PmsInsuranceCoverage,
  PmsPatient,
  PmsPayment,
  PmsProcedure,
  PmsProvider,
  PmsRecall,
} from "./interface";

export class NexHealthPmsAdapter implements PmsAdapter {
  private client: NexHealthApiClient;

  constructor(client: NexHealthApiClient) {
    this.client = client;
  }

  // ---------------------------------------------------------------------------
  // Patients
  // ---------------------------------------------------------------------------

  async getPatient(patientId: string): Promise<PmsPatient | null> {
    try {
      const response = await this.client.getPatient(Number(patientId));
      return mapNexHealthPatientToPms(response.data);
    } catch (error) {
      if (error instanceof NexHealthApiError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async listPatients(params: {
    limit?: number;
    offset?: number;
  }): Promise<PmsPatient[]> {
    const perPage = params.limit ?? 25;

    const response = await this.client.getPatients({
      per_page: perPage,
    });
    return response.data.map(mapNexHealthPatientToPms);
  }

  async searchPatients(query: string): Promise<PmsPatient[]> {
    const response = await this.client.getPatients({ per_page: 50 });
    const lowerQuery = query.toLowerCase();

    const filtered = response.data.filter((p) => {
      const firstName = p.first_name?.toLowerCase() ?? "";
      const lastName = p.last_name?.toLowerCase() ?? "";
      const email = p.email?.toLowerCase() ?? "";
      return (
        firstName.includes(lowerQuery) ||
        lastName.includes(lowerQuery) ||
        email.includes(lowerQuery)
      );
    });

    return filtered.map(mapNexHealthPatientToPms);
  }

  // ---------------------------------------------------------------------------
  // Appointments
  // ---------------------------------------------------------------------------

  async getAppointments(params: {
    date: string;
    providerId?: string;
  }): Promise<PmsAppointment[]> {
    const response = await this.client.getAppointments({
      start: params.date,
      end: params.date,
    });

    let mapped = response.data.map(mapNexHealthAppointmentToPms);

    if (params.providerId) {
      mapped = mapped.filter((a) => a.providerId === params.providerId);
    }

    return mapped;
  }

  async getAppointment(
    appointmentId: string
  ): Promise<PmsAppointment | null> {
    try {
      const response = await this.client.getAppointment(
        Number(appointmentId)
      );
      return mapNexHealthAppointmentToPms(response.data);
    } catch (error) {
      if (error instanceof NexHealthApiError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async createAppointment(
    data: Partial<PmsAppointment>
  ): Promise<PmsAppointment> {
    const nhData = mapPmsAppointmentToNexHealth(data as PmsAppointment);
    const response = await this.client.createAppointment(nhData as any);
    return mapNexHealthAppointmentToPms(response.data);
  }

  async updateAppointmentStatus(
    appointmentId: string,
    status: string
  ): Promise<void> {
    const mappedStatus = mapOscarStatusToNexHealth(status);
    await this.client.updateAppointment(Number(appointmentId), {
      status: { name: mappedStatus },
    } as any);
  }

  // ---------------------------------------------------------------------------
  // Providers
  // ---------------------------------------------------------------------------

  async listProviders(): Promise<PmsProvider[]> {
    const response = await this.client.getProviders({ per_page: 200 });
    return response.data.map(mapNexHealthProviderToPms);
  }

  // ---------------------------------------------------------------------------
  // Claims (not handled via NexHealth -- routed through Vyne Dental)
  // ---------------------------------------------------------------------------

  async getClaims(_params: {
    patientId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<PmsClaim[]> {
    return [];
  }

  // ---------------------------------------------------------------------------
  // Appointment Types
  // ---------------------------------------------------------------------------

  async listAppointmentTypes(): Promise<PmsAppointmentType[]> {
    const response = await this.client.getAppointmentTypes({ per_page: 200 });
    return response.data.map(mapNexHealthAppointmentTypeToPms);
  }

  // ---------------------------------------------------------------------------
  // Insurance Coverages
  // ---------------------------------------------------------------------------

  async getPatientInsuranceCoverages(
    patientId: string
  ): Promise<PmsInsuranceCoverage[]> {
    const response = await this.client.getPatientInsuranceCoverages(
      Number(patientId)
    );
    return response.data.map(mapNexHealthInsuranceCoverageToPms);
  }

  // ---------------------------------------------------------------------------
  // Recalls
  // ---------------------------------------------------------------------------

  async listRecalls(
    params?: { patientId?: string }
  ): Promise<PmsRecall[]> {
    const nhParams: { patient_id?: number; per_page?: number } = {
      per_page: 200,
    };
    if (params?.patientId) {
      nhParams.patient_id = Number(params.patientId);
    }
    const response = await this.client.getPatientRecalls(nhParams);
    return response.data.map(mapNexHealthPatientRecallToPms);
  }

  // ---------------------------------------------------------------------------
  // Fee Schedules
  // ---------------------------------------------------------------------------

  async listFeeSchedules(): Promise<PmsFeeSchedule[]> {
    const response = await this.client.getFeeSchedules({ per_page: 200 });
    return response.data.map(mapNexHealthFeeScheduleToPms);
  }

  // ---------------------------------------------------------------------------
  // Procedures
  // ---------------------------------------------------------------------------

  async listProcedures(
    params?: { patientId?: string; appointmentId?: string }
  ): Promise<PmsProcedure[]> {
    const nhParams: {
      patient_id?: number;
      appointment_id?: number;
      per_page?: number;
    } = { per_page: 200 };
    if (params?.patientId) {
      nhParams.patient_id = Number(params.patientId);
    }
    if (params?.appointmentId) {
      nhParams.appointment_id = Number(params.appointmentId);
    }
    const response = await this.client.getProcedures(nhParams);
    return response.data.map(mapNexHealthProcedureToPms);
  }

  // ---------------------------------------------------------------------------
  // Payments
  // ---------------------------------------------------------------------------

  async listPayments(
    params?: { patientId?: string; claimId?: string }
  ): Promise<PmsPayment[]> {
    const nhParams: {
      patient_id?: number;
      claim_id?: number;
      per_page?: number;
    } = { per_page: 200 };
    if (params?.patientId) {
      nhParams.patient_id = Number(params.patientId);
    }
    if (params?.claimId) {
      nhParams.claim_id = Number(params.claimId);
    }
    const response = await this.client.getPayments(nhParams);
    return response.data.map(mapNexHealthPaymentToPms);
  }

  async createPayment(data: Partial<PmsPayment>): Promise<PmsPayment> {
    const nhData = mapPmsPaymentToNexHealth(data as PmsPayment);
    const response = await this.client.createPayment(nhData as any);
    return mapNexHealthPaymentToPms(response.data);
  }

  // ---------------------------------------------------------------------------
  // Adjustments
  // ---------------------------------------------------------------------------

  async listAdjustments(
    params?: { patientId?: string }
  ): Promise<PmsAdjustment[]> {
    const nhParams: { patient_id?: number; per_page?: number } = {
      per_page: 200,
    };
    if (params?.patientId) {
      nhParams.patient_id = Number(params.patientId);
    }
    const response = await this.client.getAdjustments(nhParams);
    return response.data.map(mapNexHealthAdjustmentToPms);
  }

  async createAdjustment(
    data: Partial<PmsAdjustment>
  ): Promise<PmsAdjustment> {
    const nhData = mapPmsAdjustmentToNexHealth(data as PmsAdjustment);
    const response = await this.client.createAdjustment(nhData as any);
    return mapNexHealthAdjustmentToPms(response.data);
  }

  // ---------------------------------------------------------------------------
  // Charges
  // ---------------------------------------------------------------------------

  async listCharges(
    params?: { patientId?: string; claimId?: string }
  ): Promise<PmsCharge[]> {
    const nhParams: {
      patient_id?: number;
      claim_id?: number;
      per_page?: number;
    } = { per_page: 200 };
    if (params?.patientId) {
      nhParams.patient_id = Number(params.patientId);
    }
    if (params?.claimId) {
      nhParams.claim_id = Number(params.claimId);
    }
    const response = await this.client.getCharges(nhParams);
    return response.data.map(mapNexHealthChargeToPms);
  }

  // ---------------------------------------------------------------------------
  // Capabilities
  // ---------------------------------------------------------------------------

  getCapabilities(): PmsCapabilities {
    return {
      canReadPatients: true,
      canWritePatients: true,
      canReadAppointments: true,
      canWriteAppointments: true,
      canReadProviders: true,
      canReadOperatories: true,
      canReadAppointmentTypes: true,
      canWriteAppointmentTypes: true,
      canReadInsuranceCoverages: true,
      canReadRecalls: true,
      canReadFeeSchedules: true,
      canReadProcedures: true,
      canReadPayments: true,
      canWritePayments: true,
      canReadAdjustments: true,
      canWriteAdjustments: true,
      canReadCharges: true,
      canReadClaims: true,
    };
  }
}
