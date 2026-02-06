// PMS (Practice Management System) Adapter Interface
// Supports OpenDental (full read/write), Eaglesoft & Dentrix (read-only via Koalla)

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

export interface PmsAdapter {
  // Patient operations
  getPatient(patientId: string): Promise<PmsPatient | null>;
  listPatients(params: { limit?: number; offset?: number }): Promise<PmsPatient[]>;
  searchPatients(query: string): Promise<PmsPatient[]>;

  // Appointment operations
  getAppointments(params: {
    date: string;
    providerId?: string;
  }): Promise<PmsAppointment[]>;
  getAppointment(appointmentId: string): Promise<PmsAppointment | null>;
  createAppointment(data: Partial<PmsAppointment>): Promise<PmsAppointment>;
  updateAppointmentStatus(
    appointmentId: string,
    status: string
  ): Promise<void>;

  // Provider operations
  listProviders(): Promise<PmsProvider[]>;

  // Claim operations (read)
  getClaims(params: {
    patientId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<PmsClaim[]>;

  // Write capability check
  // OpenDental: true, Eaglesoft/Dentrix via Koalla: false
  isWriteEnabled(): boolean;

  // PMS type identifier
  getPmsType(): "opendental" | "eaglesoft" | "dentrix";
}
