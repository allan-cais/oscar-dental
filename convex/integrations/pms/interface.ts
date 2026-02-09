// PMS (Practice Management System) Adapter Interface -- via NexHealth Synchronizer
// Oscar connects to all PMS systems (OpenDental, Eaglesoft, Dentrix) exclusively
// through NexHealth. There are NO direct PMS connections. All three PMS systems
// have identical capabilities because NexHealth handles the translation layer.

export interface PmsPatient {
  pmsPatientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date
  gender?: string;
  email?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  primaryInsurance?: {
    payerId: string;
    payerName: string;
    memberId: string;
    groupNumber?: string;
    subscriberName?: string;
    subscriberDob?: string;
    relationship?: string;
  };
  patientBalance?: number;
  insuranceBalance?: number;
  isActive: boolean;
  lastVisitDate?: string;
  nextRecallDate?: string;
}

export interface PmsAppointment {
  pmsAppointmentId: string;
  patientId: string;
  providerId: string;
  operatoryId?: string;
  date: string; // ISO date
  startTime: string; // HH:mm
  endTime?: string;
  duration: number; // minutes
  status: string;
  procedures?: Array<{
    code: string;
    description: string;
    fee: number;
    tooth?: string;
    surface?: string;
  }>;
  notes?: string;
  productionAmount?: number;
}

export interface PmsProvider {
  pmsProviderId: string;
  firstName: string;
  lastName: string;
  npi?: string;
  type: "dentist" | "hygienist" | "specialist" | "assistant";
  specialty?: string;
  isActive: boolean;
}

export interface PmsClaim {
  pmsClaimId: string;
  patientId: string;
  payerId: string;
  payerName: string;
  procedures: Array<{
    code: string;
    description: string;
    fee: number;
    tooth?: string;
    surface?: string;
  }>;
  totalCharged: number;
  status: string;
  submittedDate?: string;
}

export interface PmsAppointmentType {
  pmsAppointmentTypeId: string;
  name: string;
  duration: number;
  color?: string;
  isActive: boolean;
}

export interface PmsInsuranceCoverage {
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
}

export interface PmsRecall {
  pmsRecallId: string;
  patientId: string;
  recallTypeId?: string;
  dueDate: string;
  status?: string;
  completedDate?: string;
}

export interface PmsFeeSchedule {
  pmsFeeScheduleId: string;
  name: string;
  description?: string;
  isDefault: boolean;
}

export interface PmsProcedure {
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
}

export interface PmsPayment {
  pmsPaymentId: string;
  patientId: string;
  amount: number;
  paymentTypeId?: number;
  paymentMethod?: string;
  date?: string;
  note?: string;
  claimId?: string;
}

export interface PmsAdjustment {
  pmsAdjustmentId: string;
  patientId: string;
  providerId?: string;
  amount: number;
  adjustmentTypeId?: number;
  description?: string;
  date?: string;
}

export interface PmsCharge {
  pmsChargeId: string;
  patientId: string;
  providerId?: string;
  amount: number;
  procedureCode?: string;
  description?: string;
  date?: string;
  status?: string;
  claimId?: string;
}

export interface PmsCapabilities {
  // All capabilities available via NexHealth -- not dependent on PMS type
  canReadPatients: boolean;
  canWritePatients: boolean;
  canReadAppointments: boolean;
  canWriteAppointments: boolean;
  canReadProviders: boolean;
  canReadOperatories: boolean;
  canReadAppointmentTypes: boolean;
  canWriteAppointmentTypes: boolean;
  canReadInsuranceCoverages: boolean;
  canReadRecalls: boolean;
  canReadFeeSchedules: boolean;
  canReadProcedures: boolean;
  canReadPayments: boolean;
  canWritePayments: boolean;
  canReadAdjustments: boolean;
  canWriteAdjustments: boolean;
  canReadCharges: boolean;
  canReadClaims: boolean;
}

export interface PmsAdapter {
  // Patient operations
  getPatient(patientId: string): Promise<PmsPatient | null>;
  listPatients(params: { limit?: number; offset?: number }): Promise<PmsPatient[]>;
  searchPatients(query: string): Promise<PmsPatient[]>;

  // Appointment operations
  getAppointments(params: { date: string; providerId?: string }): Promise<PmsAppointment[]>;
  getAppointment(appointmentId: string): Promise<PmsAppointment | null>;
  createAppointment(data: Partial<PmsAppointment>): Promise<PmsAppointment>;
  updateAppointmentStatus(appointmentId: string, status: string): Promise<void>;

  // Provider operations
  listProviders(): Promise<PmsProvider[]>;

  // Claim operations (read)
  getClaims(params: {
    patientId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<PmsClaim[]>;

  // Appointment type operations
  listAppointmentTypes(): Promise<PmsAppointmentType[]>;

  // Insurance coverage operations
  getPatientInsuranceCoverages(patientId: string): Promise<PmsInsuranceCoverage[]>;

  // Recall operations
  listRecalls(params?: { patientId?: string }): Promise<PmsRecall[]>;

  // Fee schedule operations
  listFeeSchedules(): Promise<PmsFeeSchedule[]>;

  // Procedure operations
  listProcedures(params?: { patientId?: string; appointmentId?: string }): Promise<PmsProcedure[]>;

  // Payment operations
  listPayments(params?: { patientId?: string; claimId?: string }): Promise<PmsPayment[]>;
  createPayment(data: Partial<PmsPayment>): Promise<PmsPayment>;

  // Adjustment operations
  listAdjustments(params?: { patientId?: string }): Promise<PmsAdjustment[]>;
  createAdjustment(data: Partial<PmsAdjustment>): Promise<PmsAdjustment>;

  // Charge operations
  listCharges(params?: { patientId?: string; claimId?: string }): Promise<PmsCharge[]>;

  // Capability check -- what NexHealth supports, not PMS-type dependent
  getCapabilities(): PmsCapabilities;
}
