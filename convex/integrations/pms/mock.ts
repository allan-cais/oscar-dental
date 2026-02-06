import type {
  PmsAdapter,
  PmsPatient,
  PmsAppointment,
  PmsProvider,
  PmsClaim,
} from "./interface";

// ---------------------------------------------------------------------------
// Simulated latency
// ---------------------------------------------------------------------------
function delay(min = 50, max = 200): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((r) => setTimeout(r, ms));
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

// ---------------------------------------------------------------------------
// Realistic seed data
// ---------------------------------------------------------------------------
const MOCK_PATIENTS: PmsPatient[] = [
  {
    pmsPatientId: "PAT-001",
    firstName: "Maria",
    lastName: "Gonzalez",
    dateOfBirth: "1985-03-14",
    gender: "female",
    email: "maria.gonzalez@email.com",
    phone: "5125551001",
    address: { street: "1201 S Lamar Blvd", city: "Austin", state: "TX", zip: "78704" },
    primaryInsurance: {
      payerId: "CIG01",
      payerName: "Cigna Dental",
      memberId: "CIG-8834521",
      groupNumber: "GRP-4420",
      subscriberName: "Maria Gonzalez",
      relationship: "self",
    },
    patientBalance: 125.0,
    insuranceBalance: 340.0,
    isActive: true,
    lastVisitDate: "2025-12-10",
    nextRecallDate: "2026-06-10",
  },
  {
    pmsPatientId: "PAT-002",
    firstName: "James",
    lastName: "Mitchell",
    dateOfBirth: "1972-08-22",
    gender: "male",
    email: "james.mitchell@email.com",
    phone: "5125551002",
    address: { street: "4502 W Gate Blvd", city: "Austin", state: "TX", zip: "78745" },
    primaryInsurance: {
      payerId: "DELTA01",
      payerName: "Delta Dental Premier",
      memberId: "DDT-7721445",
      groupNumber: "GRP-8811",
      subscriberName: "James Mitchell",
      relationship: "self",
    },
    patientBalance: 0,
    insuranceBalance: 0,
    isActive: true,
    lastVisitDate: "2026-01-08",
    nextRecallDate: "2026-07-08",
  },
  {
    pmsPatientId: "PAT-003",
    firstName: "Sarah",
    lastName: "Chen",
    dateOfBirth: "1990-11-05",
    gender: "female",
    email: "sarah.chen@email.com",
    phone: "5125551003",
    address: { street: "8900 Shoal Creek Blvd", city: "Austin", state: "TX", zip: "78757" },
    primaryInsurance: {
      payerId: "AETNA01",
      payerName: "Aetna Dental",
      memberId: "AET-3349021",
      groupNumber: "GRP-2290",
      subscriberName: "David Chen",
      subscriberDob: "1988-04-18",
      relationship: "spouse",
    },
    patientBalance: 450.0,
    insuranceBalance: 1200.0,
    isActive: true,
    lastVisitDate: "2025-11-15",
    nextRecallDate: "2026-05-15",
  },
  {
    pmsPatientId: "PAT-004",
    firstName: "Robert",
    lastName: "Williams",
    dateOfBirth: "1965-01-30",
    gender: "male",
    phone: "5125551004",
    address: { street: "2210 S 1st St", city: "Austin", state: "TX", zip: "78704" },
    patientBalance: 75.0,
    insuranceBalance: 0,
    isActive: true,
    lastVisitDate: "2025-09-20",
    nextRecallDate: "2026-03-20",
  },
  {
    pmsPatientId: "PAT-005",
    firstName: "Emily",
    lastName: "Patel",
    dateOfBirth: "1998-06-12",
    gender: "female",
    email: "emily.patel@email.com",
    phone: "5125551005",
    address: { street: "6700 Burnet Rd", city: "Austin", state: "TX", zip: "78757" },
    primaryInsurance: {
      payerId: "METLIFE01",
      payerName: "MetLife Dental",
      memberId: "MET-5567332",
      groupNumber: "GRP-7700",
      subscriberName: "Raj Patel",
      subscriberDob: "1970-02-28",
      relationship: "child",
    },
    patientBalance: 0,
    insuranceBalance: 250.0,
    isActive: true,
    lastVisitDate: "2026-01-20",
    nextRecallDate: "2026-07-20",
  },
  {
    pmsPatientId: "PAT-006",
    firstName: "Michael",
    lastName: "Johnson",
    dateOfBirth: "1955-09-17",
    gender: "male",
    email: "mjohnson@email.com",
    phone: "5125551006",
    address: { street: "3400 N Hills Dr", city: "Austin", state: "TX", zip: "78731" },
    primaryInsurance: {
      payerId: "UHC01",
      payerName: "United Healthcare Dental",
      memberId: "UHC-9928174",
      groupNumber: "GRP-3311",
      subscriberName: "Michael Johnson",
      relationship: "self",
    },
    patientBalance: 1800.0,
    insuranceBalance: 2400.0,
    isActive: true,
    lastVisitDate: "2025-10-05",
    nextRecallDate: "2026-04-05",
  },
  {
    pmsPatientId: "PAT-007",
    firstName: "Ashley",
    lastName: "Rodriguez",
    dateOfBirth: "1982-12-01",
    gender: "female",
    email: "ashley.r@email.com",
    phone: "5125551007",
    address: { street: "1100 S Congress Ave", city: "Austin", state: "TX", zip: "78704" },
    primaryInsurance: {
      payerId: "BCBS01",
      payerName: "Blue Cross Blue Shield TX",
      memberId: "BCB-4412887",
      groupNumber: "GRP-5566",
      subscriberName: "Ashley Rodriguez",
      relationship: "self",
    },
    patientBalance: 200.0,
    insuranceBalance: 0,
    isActive: true,
    lastVisitDate: "2026-01-25",
    nextRecallDate: "2026-07-25",
  },
  {
    pmsPatientId: "PAT-008",
    firstName: "David",
    lastName: "Kim",
    dateOfBirth: "1979-04-08",
    gender: "male",
    email: "dkim@email.com",
    phone: "5125551008",
    address: { street: "5501 E Riverside Dr", city: "Austin", state: "TX", zip: "78741" },
    primaryInsurance: {
      payerId: "GUARDIAN01",
      payerName: "Guardian Dental",
      memberId: "GRD-7789023",
      groupNumber: "GRP-1100",
      subscriberName: "David Kim",
      relationship: "self",
    },
    patientBalance: 0,
    insuranceBalance: 680.0,
    isActive: true,
    lastVisitDate: "2025-12-18",
    nextRecallDate: "2026-06-18",
  },
  {
    pmsPatientId: "PAT-009",
    firstName: "Jennifer",
    lastName: "Thompson",
    dateOfBirth: "1988-07-25",
    gender: "female",
    email: "jthompson@email.com",
    phone: "5125551009",
    address: { street: "9500 N Capital of TX Hwy", city: "Austin", state: "TX", zip: "78759" },
    primaryInsurance: {
      payerId: "HUMANA01",
      payerName: "Humana Dental",
      memberId: "HUM-6634298",
      groupNumber: "GRP-9944",
      subscriberName: "Jennifer Thompson",
      relationship: "self",
    },
    patientBalance: 50.0,
    insuranceBalance: 150.0,
    isActive: true,
    lastVisitDate: "2026-01-15",
    nextRecallDate: "2026-04-15",
  },
  {
    pmsPatientId: "PAT-010",
    firstName: "Carlos",
    lastName: "Martinez",
    dateOfBirth: "1975-02-14",
    gender: "male",
    phone: "5125551010",
    address: { street: "7200 Cameron Rd", city: "Austin", state: "TX", zip: "78752" },
    primaryInsurance: {
      payerId: "DELTA01",
      payerName: "Delta Dental PPO",
      memberId: "DDT-1198234",
      groupNumber: "GRP-6633",
      subscriberName: "Carlos Martinez",
      relationship: "self",
    },
    patientBalance: 325.0,
    insuranceBalance: 900.0,
    isActive: true,
    lastVisitDate: "2025-11-01",
    nextRecallDate: "2026-05-01",
  },
];

const MOCK_PROVIDERS: PmsProvider[] = [
  {
    pmsProviderId: "PROV-001",
    firstName: "Amanda",
    lastName: "Hartwell",
    npi: "1234567890",
    type: "dentist",
    specialty: "General Dentistry",
    isActive: true,
  },
  {
    pmsProviderId: "PROV-002",
    firstName: "Brian",
    lastName: "Okafor",
    npi: "2345678901",
    type: "dentist",
    specialty: "General Dentistry",
    isActive: true,
  },
  {
    pmsProviderId: "PROV-003",
    firstName: "Lisa",
    lastName: "Nguyen",
    npi: "3456789012",
    type: "hygienist",
    isActive: true,
  },
  {
    pmsProviderId: "PROV-004",
    firstName: "Rachel",
    lastName: "Foster",
    npi: "4567890123",
    type: "hygienist",
    isActive: true,
  },
  {
    pmsProviderId: "PROV-005",
    firstName: "Mark",
    lastName: "Petersen",
    npi: "5678901234",
    type: "specialist",
    specialty: "Oral Surgery",
    isActive: true,
  },
];

// Realistic dental procedures pool for appointment generation
const PROCEDURE_POOLS = {
  hygiene: [
    { code: "D0120", description: "Periodic oral evaluation", fee: 65 },
    { code: "D0274", description: "Bitewings - four films", fee: 75 },
    { code: "D1110", description: "Prophylaxis - adult", fee: 120 },
    { code: "D1206", description: "Topical fluoride varnish", fee: 40 },
  ],
  restorative: [
    { code: "D2140", description: "Amalgam - one surface, primary", fee: 185 },
    { code: "D2150", description: "Amalgam - two surfaces, primary", fee: 225 },
    { code: "D2330", description: "Resin composite - one surface, anterior", fee: 210 },
    { code: "D2331", description: "Resin composite - two surfaces, anterior", fee: 270 },
    { code: "D2391", description: "Resin composite - one surface, posterior", fee: 230 },
    { code: "D2392", description: "Resin composite - two surfaces, posterior", fee: 295 },
    { code: "D2740", description: "Crown - porcelain/ceramic substrate", fee: 1250 },
    { code: "D2750", description: "Crown - porcelain fused to high noble metal", fee: 1350 },
  ],
  surgical: [
    { code: "D7140", description: "Extraction, erupted tooth", fee: 225 },
    { code: "D7210", description: "Surgical removal of erupted tooth", fee: 375 },
    { code: "D7240", description: "Removal of impacted tooth - completely bony", fee: 525 },
  ],
  endodontic: [
    { code: "D3310", description: "Root canal - anterior", fee: 850 },
    { code: "D3320", description: "Root canal - premolar", fee: 975 },
    { code: "D3330", description: "Root canal - molar", fee: 1200 },
  ],
  diagnostic: [
    { code: "D0150", description: "Comprehensive oral evaluation - new patient", fee: 95 },
    { code: "D0210", description: "Intraoral complete series", fee: 175 },
    { code: "D0330", description: "Panoramic radiograph", fee: 130 },
  ],
  preventive: [
    { code: "D1351", description: "Sealant - per tooth", fee: 55 },
    { code: "D4341", description: "Periodontal scaling and root planing, per quadrant", fee: 275 },
    { code: "D4910", description: "Periodontal maintenance", fee: 175 },
  ],
};

function generateAppointmentsForDate(date: string): PmsAppointment[] {
  const appointments: PmsAppointment[] = [];
  const slots = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
    "11:00", "11:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00",
  ];
  const statuses = ["scheduled", "confirmed", "completed", "checked_in", "in_progress"];
  const teeth = ["2", "3", "4", "5", "12", "13", "14", "15", "18", "19", "20", "29", "30", "31"];
  const surfaces = ["M", "O", "D", "B", "L", "MO", "DO", "MOD", "OB"];

  // Generate 8-12 appointments per day
  const count = 8 + Math.floor(Math.random() * 5);
  const usedSlots = new Set<string>();

  for (let i = 0; i < count; i++) {
    let slot: string;
    do {
      slot = slots[Math.floor(Math.random() * slots.length)];
    } while (usedSlots.has(slot));
    usedSlots.add(slot);

    const patient = MOCK_PATIENTS[Math.floor(Math.random() * MOCK_PATIENTS.length)];
    const provider = MOCK_PROVIDERS[Math.floor(Math.random() * 3)]; // first 3 are doctors/hygienists
    const categoryKeys = Object.keys(PROCEDURE_POOLS) as Array<keyof typeof PROCEDURE_POOLS>;
    const category = categoryKeys[Math.floor(Math.random() * categoryKeys.length)];
    const pool = PROCEDURE_POOLS[category];

    // Pick 1-3 procedures
    const procCount = 1 + Math.floor(Math.random() * 3);
    const procs = [];
    const usedProcs = new Set<number>();
    for (let p = 0; p < Math.min(procCount, pool.length); p++) {
      let idx: number;
      do {
        idx = Math.floor(Math.random() * pool.length);
      } while (usedProcs.has(idx));
      usedProcs.add(idx);
      procs.push({
        ...pool[idx],
        tooth: category !== "hygiene" ? teeth[Math.floor(Math.random() * teeth.length)] : undefined,
        surface: category === "restorative" ? surfaces[Math.floor(Math.random() * surfaces.length)] : undefined,
      });
    }

    const duration = category === "hygiene" ? 60 : category === "endodontic" ? 90 : category === "surgical" ? 45 : 30;
    const [h, m] = slot.split(":").map(Number);
    const endH = h + Math.floor((m + duration) / 60);
    const endM = (m + duration) % 60;
    const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    const production = procs.reduce((sum, p) => sum + p.fee, 0);

    appointments.push({
      pmsAppointmentId: `APT-${date.replace(/-/g, "")}-${String(i + 1).padStart(3, "0")}`,
      patientId: patient.pmsPatientId,
      providerId: provider.pmsProviderId,
      date,
      startTime: slot,
      endTime,
      duration,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      procedures: procs,
      productionAmount: production,
    });
  }

  return appointments.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

// ---------------------------------------------------------------------------
// Mock implementation
// ---------------------------------------------------------------------------
export class MockPmsAdapter implements PmsAdapter {
  private pmsType: "opendental" | "eaglesoft" | "dentrix";
  private appointmentStore: Map<string, PmsAppointment> = new Map();

  constructor(pmsType: "opendental" | "eaglesoft" | "dentrix" = "opendental") {
    this.pmsType = pmsType;
  }

  async getPatient(patientId: string): Promise<PmsPatient | null> {
    await delay();
    return MOCK_PATIENTS.find((p) => p.pmsPatientId === patientId) ?? null;
  }

  async listPatients(params: { limit?: number; offset?: number }): Promise<PmsPatient[]> {
    await delay(80, 180);
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 25;
    return MOCK_PATIENTS.slice(offset, offset + limit);
  }

  async searchPatients(query: string): Promise<PmsPatient[]> {
    await delay(60, 150);
    const q = query.toLowerCase();
    return MOCK_PATIENTS.filter(
      (p) =>
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.pmsPatientId.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.phone?.includes(q)
    );
  }

  async getAppointments(params: { date: string; providerId?: string }): Promise<PmsAppointment[]> {
    await delay(80, 200);
    const appointments = generateAppointmentsForDate(params.date);
    if (params.providerId) {
      return appointments.filter((a) => a.providerId === params.providerId);
    }
    return appointments;
  }

  async getAppointment(appointmentId: string): Promise<PmsAppointment | null> {
    await delay();
    return this.appointmentStore.get(appointmentId) ?? null;
  }

  async createAppointment(data: Partial<PmsAppointment>): Promise<PmsAppointment> {
    if (!this.isWriteEnabled()) {
      throw new Error(
        `Write operations not available for ${this.pmsType}. Use HITL fallback workflow.`
      );
    }
    await delay(100, 250);
    const appointment: PmsAppointment = {
      pmsAppointmentId: `APT-${randomId()}`,
      patientId: data.patientId ?? "",
      providerId: data.providerId ?? "",
      date: data.date ?? new Date().toISOString().split("T")[0],
      startTime: data.startTime ?? "09:00",
      endTime: data.endTime,
      duration: data.duration ?? 30,
      status: "scheduled",
      procedures: data.procedures,
      notes: data.notes,
      productionAmount: data.procedures?.reduce((s, p) => s + p.fee, 0),
    };
    this.appointmentStore.set(appointment.pmsAppointmentId, appointment);
    return appointment;
  }

  async updateAppointmentStatus(appointmentId: string, status: string): Promise<void> {
    if (!this.isWriteEnabled()) {
      throw new Error(
        `Write operations not available for ${this.pmsType}. Use HITL fallback workflow.`
      );
    }
    await delay(60, 150);
    const existing = this.appointmentStore.get(appointmentId);
    if (existing) {
      existing.status = status;
    }
  }

  async listProviders(): Promise<PmsProvider[]> {
    await delay(50, 120);
    return [...MOCK_PROVIDERS];
  }

  async getClaims(params: {
    patientId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<PmsClaim[]> {
    await delay(100, 200);
    const claims: PmsClaim[] = [
      {
        pmsClaimId: "CLM-20260115-001",
        patientId: "PAT-001",
        payerId: "CIG01",
        payerName: "Cigna Dental",
        procedures: [
          { code: "D0120", description: "Periodic oral evaluation", fee: 65 },
          { code: "D0274", description: "Bitewings - four films", fee: 75 },
          { code: "D1110", description: "Prophylaxis - adult", fee: 120 },
        ],
        totalCharged: 260,
        status: "submitted",
        submittedDate: "2026-01-16",
      },
      {
        pmsClaimId: "CLM-20260108-001",
        patientId: "PAT-002",
        payerId: "DELTA01",
        payerName: "Delta Dental Premier",
        procedures: [
          { code: "D2391", description: "Resin composite - one surface, posterior", fee: 230 },
          { code: "D2392", description: "Resin composite - two surfaces, posterior", fee: 295 },
        ],
        totalCharged: 525,
        status: "accepted",
        submittedDate: "2026-01-09",
      },
      {
        pmsClaimId: "CLM-20251210-001",
        patientId: "PAT-003",
        payerId: "AETNA01",
        payerName: "Aetna Dental",
        procedures: [
          { code: "D2750", description: "Crown - porcelain fused to high noble metal", fee: 1350 },
          { code: "D2950", description: "Core buildup", fee: 325 },
        ],
        totalCharged: 1675,
        status: "denied",
        submittedDate: "2025-12-11",
      },
      {
        pmsClaimId: "CLM-20260120-001",
        patientId: "PAT-005",
        payerId: "METLIFE01",
        payerName: "MetLife Dental",
        procedures: [
          { code: "D0150", description: "Comprehensive oral evaluation - new patient", fee: 95 },
          { code: "D0210", description: "Intraoral complete series", fee: 175 },
          { code: "D1110", description: "Prophylaxis - adult", fee: 120 },
        ],
        totalCharged: 390,
        status: "paid",
        submittedDate: "2026-01-21",
      },
    ];

    return claims.filter((c) => {
      if (params.patientId && c.patientId !== params.patientId) return false;
      if (params.status && c.status !== params.status) return false;
      return true;
    });
  }

  isWriteEnabled(): boolean {
    return this.pmsType === "opendental";
  }

  getPmsType(): "opendental" | "eaglesoft" | "dentrix" {
    return this.pmsType;
  }
}
