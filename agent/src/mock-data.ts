/**
 * Oscar Agent — Mock Data
 * Demo data for agent tools when no live Convex backend is connected.
 * Matches Oscar's existing seed data patterns.
 */

// ── Patients ─────────────────────────────────────────────────────────────────

export interface MockPatient {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: string
  phone: string
  email: string
  primaryPayer: string
  memberId: string
  status: "active" | "inactive" | "new"
  lastVisit: string
  nextAppointment?: string
  outstandingBalance: number
  notes?: string
}

export const MOCK_PATIENTS: MockPatient[] = [
  {
    id: "PAT-1001",
    firstName: "Lisa",
    lastName: "Patel",
    dateOfBirth: "1985-03-14",
    phone: "(512) 555-0142",
    email: "lisa.patel@email.com",
    primaryPayer: "Delta Dental PPO",
    memberId: "DD-9847231",
    status: "active",
    lastVisit: "2026-01-22",
    nextAppointment: "2026-02-10T09:00:00",
    outstandingBalance: 245.00,
    notes: "Crown prep D2740 in progress. Follow-up needed.",
  },
  {
    id: "PAT-1002",
    firstName: "Marcus",
    lastName: "Johnson",
    dateOfBirth: "1978-11-02",
    phone: "(512) 555-0287",
    email: "marcus.j@email.com",
    primaryPayer: "Cigna DPPO",
    memberId: "CIG-3382910",
    status: "active",
    lastVisit: "2026-01-28",
    nextAppointment: "2026-02-12T14:00:00",
    outstandingBalance: 0,
    notes: "Perio maintenance. 4mm pockets UR quad.",
  },
  {
    id: "PAT-1003",
    firstName: "Sarah",
    lastName: "Chen",
    dateOfBirth: "1992-07-19",
    phone: "(512) 555-0391",
    email: "schen92@email.com",
    primaryPayer: "MetLife PDP",
    memberId: "ML-5521847",
    status: "active",
    lastVisit: "2026-02-03",
    outstandingBalance: 125.50,
    notes: "Wisdom teeth extraction consult completed. Surgery scheduled.",
  },
  {
    id: "PAT-1004",
    firstName: "Robert",
    lastName: "Williams",
    dateOfBirth: "1965-01-30",
    phone: "(512) 555-0463",
    email: "rwilliams@email.com",
    primaryPayer: "Guardian DentalGuard",
    memberId: "GRD-7734201",
    status: "active",
    lastVisit: "2025-12-15",
    nextAppointment: "2026-02-14T10:30:00",
    outstandingBalance: 1890.00,
    notes: "Implant case. D6010 placement completed, waiting for osseointegration.",
  },
  {
    id: "PAT-1005",
    firstName: "Maria",
    lastName: "Santos",
    dateOfBirth: "1990-05-22",
    phone: "(512) 555-0578",
    email: "maria.santos@email.com",
    primaryPayer: "Delta Dental PPO",
    memberId: "DD-1123897",
    status: "active",
    lastVisit: "2026-02-05",
    nextAppointment: "2026-02-07T11:00:00",
    outstandingBalance: 0,
    notes: "Routine prophylaxis. Due for FMX.",
  },
  {
    id: "PAT-1006",
    firstName: "James",
    lastName: "Thompson",
    dateOfBirth: "1955-09-08",
    phone: "(512) 555-0692",
    email: "jthompson55@email.com",
    primaryPayer: "Aetna DMO",
    memberId: "AET-4456782",
    status: "active",
    lastVisit: "2026-01-10",
    outstandingBalance: 3240.00,
    notes: "Full mouth rehabilitation case. Multiple crowns pending. High A/R.",
  },
  {
    id: "PAT-1007",
    firstName: "Emily",
    lastName: "Rodriguez",
    dateOfBirth: "2001-12-03",
    phone: "(512) 555-0801",
    email: "emily.rod@email.com",
    primaryPayer: "United Concordia",
    memberId: "UC-8891234",
    status: "new",
    lastVisit: "2026-02-04",
    nextAppointment: "2026-02-11T15:30:00",
    outstandingBalance: 75.00,
    notes: "New patient. Comprehensive exam and prophy completed. Treatment plan presented.",
  },
]

// ── Claims ───────────────────────────────────────────────────────────────────

export interface MockClaim {
  id: string
  patientId: string
  patientName: string
  payer: string
  procedureCodes: string[]
  procedureDescriptions: string[]
  totalCharge: number
  status: "draft" | "scrubbed" | "submitted" | "pending" | "paid" | "denied" | "appealed"
  submittedDate?: string
  paidAmount?: number
  denialCode?: string
  denialReason?: string
  daysInAr?: number
}

export const MOCK_CLAIMS: MockClaim[] = [
  {
    id: "CLM-9823",
    patientId: "PAT-1001",
    patientName: "Lisa Patel",
    payer: "Delta Dental PPO",
    procedureCodes: ["D2740"],
    procedureDescriptions: ["Crown — porcelain/ceramic substrate"],
    totalCharge: 1250.00,
    status: "denied",
    submittedDate: "2026-01-15",
    denialCode: "N512",
    denialReason: "Missing pre-authorization. Prior approval required for crown procedures.",
    daysInAr: 22,
  },
  {
    id: "CLM-9845",
    patientId: "PAT-1002",
    patientName: "Marcus Johnson",
    payer: "Cigna DPPO",
    procedureCodes: ["D4910"],
    procedureDescriptions: ["Periodontal maintenance"],
    totalCharge: 185.00,
    status: "submitted",
    submittedDate: "2026-01-30",
    daysInAr: 7,
  },
  {
    id: "CLM-9801",
    patientId: "PAT-1004",
    patientName: "Robert Williams",
    payer: "Guardian DentalGuard",
    procedureCodes: ["D6010", "D6065"],
    procedureDescriptions: ["Surgical placement of implant body", "Implant abutment — porcelain/ceramic"],
    totalCharge: 4200.00,
    status: "pending",
    submittedDate: "2026-01-02",
    daysInAr: 35,
  },
  {
    id: "CLM-9856",
    patientId: "PAT-1003",
    patientName: "Sarah Chen",
    payer: "MetLife PDP",
    procedureCodes: ["D7240"],
    procedureDescriptions: ["Removal of impacted tooth — completely bony"],
    totalCharge: 450.00,
    status: "scrubbed",
  },
  {
    id: "CLM-9790",
    patientId: "PAT-1006",
    patientName: "James Thompson",
    payer: "Aetna DMO",
    procedureCodes: ["D2750", "D2751", "D2752"],
    procedureDescriptions: ["Crown — porcelain fused to high noble metal", "Crown — porcelain fused to predominantly base metal", "Crown — porcelain fused to noble metal"],
    totalCharge: 3600.00,
    status: "denied",
    submittedDate: "2025-12-20",
    denialCode: "N323",
    denialReason: "Frequency limitation. Maximum benefit for crowns reached within benefit period.",
    daysInAr: 48,
  },
  {
    id: "CLM-8102",
    patientId: "PAT-1005",
    patientName: "Maria Santos",
    payer: "Delta Dental PPO",
    procedureCodes: ["D0150", "D1110", "D0274"],
    procedureDescriptions: ["Comprehensive oral evaluation", "Prophylaxis — adult", "Bitewings — four radiographic images"],
    totalCharge: 295.00,
    status: "paid",
    submittedDate: "2025-12-01",
    paidAmount: 248.00,
    daysInAr: 0,
  },
]

// ── Appointments ─────────────────────────────────────────────────────────────

export interface MockAppointment {
  id: string
  patientId: string
  patientName: string
  providerId: string
  providerName: string
  operatory: string
  date: string
  startTime: string
  endTime: string
  type: string
  status: "scheduled" | "confirmed" | "checked_in" | "in_progress" | "completed" | "cancelled" | "no_show"
  procedureCodes?: string[]
  notes?: string
}

export const MOCK_APPOINTMENTS: MockAppointment[] = [
  {
    id: "APT-5001",
    patientId: "PAT-1001",
    patientName: "Lisa Patel",
    providerId: "PROV-01",
    providerName: "Dr. Sarah Mitchell",
    operatory: "Op 1",
    date: "2026-02-10",
    startTime: "09:00",
    endTime: "10:00",
    type: "Crown Seat",
    status: "confirmed",
    procedureCodes: ["D2740"],
    notes: "Crown delivery — check occlusion and contacts",
  },
  {
    id: "APT-5002",
    patientId: "PAT-1005",
    patientName: "Maria Santos",
    providerId: "PROV-02",
    providerName: "Dr. James Park",
    operatory: "Op 3",
    date: "2026-02-07",
    startTime: "11:00",
    endTime: "11:30",
    type: "Prophy",
    status: "scheduled",
    procedureCodes: ["D1110"],
  },
  {
    id: "APT-5003",
    patientId: "PAT-1002",
    patientName: "Marcus Johnson",
    providerId: "PROV-02",
    providerName: "Dr. James Park",
    operatory: "Op 2",
    date: "2026-02-12",
    startTime: "14:00",
    endTime: "15:00",
    type: "Perio Maintenance",
    status: "scheduled",
    procedureCodes: ["D4910"],
  },
  {
    id: "APT-5004",
    patientId: "PAT-1004",
    patientName: "Robert Williams",
    providerId: "PROV-01",
    providerName: "Dr. Sarah Mitchell",
    operatory: "Op 1",
    date: "2026-02-14",
    startTime: "10:30",
    endTime: "12:00",
    type: "Implant Follow-up",
    status: "scheduled",
    procedureCodes: ["D6010"],
    notes: "6-month post-placement check. Evaluate osseointegration.",
  },
  {
    id: "APT-5005",
    patientId: "PAT-1007",
    patientName: "Emily Rodriguez",
    providerId: "PROV-01",
    providerName: "Dr. Sarah Mitchell",
    operatory: "Op 2",
    date: "2026-02-11",
    startTime: "15:30",
    endTime: "16:30",
    type: "Treatment Plan Review",
    status: "confirmed",
    notes: "Review treatment plan. Discuss options for #14 and #19.",
  },
]

// ── Open Slots ───────────────────────────────────────────────────────────────

export interface MockOpenSlot {
  date: string
  startTime: string
  endTime: string
  providerId: string
  providerName: string
  operatory: string
  duration: number // minutes
}

export const MOCK_OPEN_SLOTS: MockOpenSlot[] = [
  { date: "2026-02-07", startTime: "08:00", endTime: "09:00", providerId: "PROV-01", providerName: "Dr. Sarah Mitchell", operatory: "Op 1", duration: 60 },
  { date: "2026-02-07", startTime: "14:00", endTime: "15:00", providerId: "PROV-01", providerName: "Dr. Sarah Mitchell", operatory: "Op 1", duration: 60 },
  { date: "2026-02-07", startTime: "15:30", endTime: "16:30", providerId: "PROV-02", providerName: "Dr. James Park", operatory: "Op 3", duration: 60 },
  { date: "2026-02-10", startTime: "11:00", endTime: "12:00", providerId: "PROV-02", providerName: "Dr. James Park", operatory: "Op 2", duration: 60 },
  { date: "2026-02-10", startTime: "13:00", endTime: "13:30", providerId: "PROV-01", providerName: "Dr. Sarah Mitchell", operatory: "Op 1", duration: 30 },
  { date: "2026-02-11", startTime: "08:00", endTime: "09:30", providerId: "PROV-02", providerName: "Dr. James Park", operatory: "Op 3", duration: 90 },
  { date: "2026-02-12", startTime: "10:00", endTime: "11:00", providerId: "PROV-01", providerName: "Dr. Sarah Mitchell", operatory: "Op 2", duration: 60 },
]

// ── Denials ──────────────────────────────────────────────────────────────────

export interface MockDenial {
  id: string
  claimId: string
  patientId: string
  patientName: string
  payer: string
  denialCode: string
  denialReason: string
  denialCategory: "missing_info" | "pre_auth" | "frequency" | "not_covered" | "coding_error" | "timely_filing"
  claimAmount: number
  deniedDate: string
  appealDeadline: string
  status: "new" | "under_review" | "appealing" | "resolved" | "written_off"
  assignedTo?: string
  aiSuggestedAction?: string
  procedureCodes: string[]
}

export const MOCK_DENIALS: MockDenial[] = [
  {
    id: "DEN-301",
    claimId: "CLM-9823",
    patientId: "PAT-1001",
    patientName: "Lisa Patel",
    payer: "Delta Dental PPO",
    denialCode: "N512",
    denialReason: "Missing pre-authorization. Prior approval required for crown procedures.",
    denialCategory: "pre_auth",
    claimAmount: 1250.00,
    deniedDate: "2026-01-20",
    appealDeadline: "2026-02-19",
    status: "new",
    aiSuggestedAction: "Submit retroactive pre-authorization with clinical notes and radiographs. High success rate (78%) for this denial type with Delta Dental.",
    procedureCodes: ["D2740"],
  },
  {
    id: "DEN-298",
    claimId: "CLM-9790",
    patientId: "PAT-1006",
    patientName: "James Thompson",
    payer: "Aetna DMO",
    denialCode: "N323",
    denialReason: "Frequency limitation. Maximum benefit for crowns reached within benefit period.",
    denialCategory: "frequency",
    claimAmount: 3600.00,
    deniedDate: "2026-01-08",
    appealDeadline: "2026-03-08",
    status: "under_review",
    assignedTo: "Mike Chen",
    aiSuggestedAction: "Appeal with documentation of medical necessity — multiple crowns required due to extensive decay. Include perio charting and intraoral photos.",
    procedureCodes: ["D2750", "D2751", "D2752"],
  },
  {
    id: "DEN-305",
    claimId: "CLM-9867",
    patientId: "PAT-1002",
    patientName: "Marcus Johnson",
    payer: "Cigna DPPO",
    denialCode: "N216",
    denialReason: "Service not covered under current plan. Periodontal maintenance requires prior history of active treatment.",
    denialCategory: "not_covered",
    claimAmount: 185.00,
    deniedDate: "2026-02-01",
    appealDeadline: "2026-04-01",
    status: "new",
    aiSuggestedAction: "Submit appeal with perio charting history showing D4341/D4342 scaling and root planing within past 24 months. Include ADA statement on medical necessity of perio maintenance.",
    procedureCodes: ["D4910"],
  },
]

// ── A/R Summary ──────────────────────────────────────────────────────────────

export interface ArBucket {
  range: string
  claimCount: number
  totalAmount: number
  percentOfTotal: number
}

export interface MockArSummary {
  totalOutstanding: number
  totalClaims: number
  averageDaysInAr: number
  insuranceBuckets: ArBucket[]
  patientBuckets: ArBucket[]
  topPayers: { payer: string; amount: number; avgDays: number; denialRate: number }[]
}

export const MOCK_AR_SUMMARY: MockArSummary = {
  totalOutstanding: 48750.00,
  totalClaims: 127,
  averageDaysInAr: 28,
  insuranceBuckets: [
    { range: "0–30 days", claimCount: 68, totalAmount: 22400.00, percentOfTotal: 46 },
    { range: "31–60 days", claimCount: 34, totalAmount: 14200.00, percentOfTotal: 29 },
    { range: "61–90 days", claimCount: 18, totalAmount: 8150.00, percentOfTotal: 17 },
    { range: "90+ days", claimCount: 7, totalAmount: 4000.00, percentOfTotal: 8 },
  ],
  patientBuckets: [
    { range: "0–30 days", claimCount: 45, totalAmount: 8200.00, percentOfTotal: 52 },
    { range: "31–60 days", claimCount: 22, totalAmount: 4100.00, percentOfTotal: 26 },
    { range: "61–90 days", claimCount: 11, totalAmount: 2300.00, percentOfTotal: 15 },
    { range: "90+ days", claimCount: 5, totalAmount: 1100.00, percentOfTotal: 7 },
  ],
  topPayers: [
    { payer: "Delta Dental PPO", amount: 14500.00, avgDays: 22, denialRate: 4.2 },
    { payer: "Cigna DPPO", amount: 9800.00, avgDays: 31, denialRate: 6.1 },
    { payer: "Guardian DentalGuard", amount: 8200.00, avgDays: 38, denialRate: 3.8 },
    { payer: "Aetna DMO", amount: 7100.00, avgDays: 42, denialRate: 8.5 },
    { payer: "MetLife PDP", amount: 5400.00, avgDays: 25, denialRate: 2.9 },
    { payer: "United Concordia", amount: 3750.00, avgDays: 20, denialRate: 3.2 },
  ],
}

// ── Eligibility Results ──────────────────────────────────────────────────────

export interface MockEligibilityResult {
  patientId: string
  patientName: string
  payer: string
  memberId: string
  status: "active" | "inactive" | "pending"
  effectiveDate: string
  terminationDate?: string
  planType: string
  deductible: { annual: number; remaining: number }
  maximums: { annual: number; remaining: number }
  coverageLevels: {
    preventive: number
    basic: number
    major: number
    orthodontic?: number
  }
  waitingPeriods?: string[]
  verifiedAt: string
}

export const MOCK_ELIGIBILITY_RESULTS: Record<string, MockEligibilityResult> = {
  "PAT-1001": {
    patientId: "PAT-1001",
    patientName: "Lisa Patel",
    payer: "Delta Dental PPO",
    memberId: "DD-9847231",
    status: "active",
    effectiveDate: "2025-01-01",
    planType: "PPO",
    deductible: { annual: 50, remaining: 0 },
    maximums: { annual: 2000, remaining: 750 },
    coverageLevels: { preventive: 100, basic: 80, major: 50 },
    verifiedAt: "2026-02-05T14:30:00Z",
  },
  "PAT-1002": {
    patientId: "PAT-1002",
    patientName: "Marcus Johnson",
    payer: "Cigna DPPO",
    memberId: "CIG-3382910",
    status: "active",
    effectiveDate: "2025-06-01",
    planType: "DPPO",
    deductible: { annual: 75, remaining: 75 },
    maximums: { annual: 1500, remaining: 1315 },
    coverageLevels: { preventive: 100, basic: 80, major: 50, orthodontic: 50 },
    waitingPeriods: ["Major services: 12 months from effective date"],
    verifiedAt: "2026-02-03T09:15:00Z",
  },
  "PAT-1004": {
    patientId: "PAT-1004",
    patientName: "Robert Williams",
    payer: "Guardian DentalGuard",
    memberId: "GRD-7734201",
    status: "active",
    effectiveDate: "2024-01-01",
    planType: "PPO Plus",
    deductible: { annual: 100, remaining: 0 },
    maximums: { annual: 3000, remaining: 800 },
    coverageLevels: { preventive: 100, basic: 80, major: 60 },
    verifiedAt: "2026-01-28T11:00:00Z",
  },
}
