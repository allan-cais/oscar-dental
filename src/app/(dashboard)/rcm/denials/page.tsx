"use client"

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  DenialDetail,
  CATEGORY_COLORS,
  STATUS_COLORS,
  getSlaDisplay,
  type DenialData,
  type DenialCategory,
  type DenialStatus,
} from "@/components/rcm/denial-detail"
import {
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  FileText,
  CheckCircle,
  User,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Label maps
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<DenialCategory, string> = {
  eligibility: "Eligibility",
  coding: "Coding",
  documentation: "Documentation",
  authorization: "Authorization",
  timely_filing: "Timely Filing",
  duplicate: "Duplicate",
  other: "Other",
}

const STATUS_LABELS: Record<DenialStatus, string> = {
  new: "New",
  acknowledged: "Acknowledged",
  appealing: "Appealing",
  appealed: "Appealed",
  won: "Won",
  lost: "Lost",
  partial: "Partial",
  written_off: "Written Off",
}

// ---------------------------------------------------------------------------
// Demo data - 20 denials
// ---------------------------------------------------------------------------

const now = Date.now()
const hour = 60 * 60 * 1000

const DEMO_DENIALS: DenialData[] = [
  // 4 new (2 > 12h SLA, 1 at risk ~3h, 1 overdue)
  {
    id: "DEN-001",
    denialDate: "2026-02-04",
    patientName: "Sarah Thompson",
    patientDob: "1985-03-14",
    patientInsurance: "Delta Dental PPO",
    patientMemberId: "DD-9823741",
    payerId: "DD001",
    payerName: "Delta Dental",
    reasonCode: "CO-16",
    reasonDescription: "Claim/service lacks information or has submission/billing error(s)",
    category: "documentation",
    amount: 1250,
    status: "new",
    aiConfidence: 0.89,
    slaDeadline: now + 14 * hour,
    claimNumber: "CLM-2026-00412",
    claimProcedures: [
      { code: "D2740", description: "Crown - porcelain/ceramic", fee: 1100 },
      { code: "D0220", description: "Periapical radiograph", fee: 35 },
    ],
    claimTotalCharged: 1135,
    createdAt: now - 10 * hour,
  },
  {
    id: "DEN-002",
    denialDate: "2026-02-04",
    patientName: "Michael Rodriguez",
    patientDob: "1972-11-08",
    patientInsurance: "Cigna DPPO",
    patientMemberId: "CIG-4456221",
    payerId: "CIG001",
    payerName: "Cigna Dental",
    reasonCode: "CO-4",
    reasonDescription: "The procedure code is inconsistent with the modifier used or a required modifier is missing",
    category: "coding",
    amount: 890,
    status: "new",
    aiConfidence: 0.94,
    slaDeadline: now + 16 * hour,
    claimNumber: "CLM-2026-00398",
    claimProcedures: [
      { code: "D4341", description: "Periodontal scaling & root planing, 4+ teeth", fee: 350 },
      { code: "D4342", description: "Periodontal scaling & root planing, 1-3 teeth", fee: 250 },
    ],
    claimTotalCharged: 600,
    createdAt: now - 8 * hour,
  },
  {
    id: "DEN-003",
    denialDate: "2026-02-03",
    patientName: "Jennifer Martinez",
    patientDob: "1990-06-22",
    patientInsurance: "MetLife TDP",
    patientMemberId: "ML-7734519",
    payerId: "MET001",
    payerName: "MetLife",
    reasonCode: "PR-1",
    reasonDescription: "Deductible amount",
    category: "eligibility",
    amount: 175,
    status: "new",
    aiConfidence: 0.82,
    slaDeadline: now + 3 * hour + 15 * 60 * 1000,
    claimNumber: "CLM-2026-00385",
    claimProcedures: [
      { code: "D1110", description: "Prophylaxis - adult", fee: 135 },
      { code: "D0120", description: "Periodic oral evaluation", fee: 55 },
    ],
    claimTotalCharged: 190,
    createdAt: now - 20 * hour,
  },
  {
    id: "DEN-004",
    denialDate: "2026-02-02",
    patientName: "Robert Chang",
    patientDob: "1968-01-30",
    patientInsurance: "Aetna DMO",
    patientMemberId: "AET-1129043",
    payerId: "AET001",
    payerName: "Aetna",
    reasonCode: "CO-29",
    reasonDescription: "The time limit for filing has expired",
    category: "timely_filing",
    amount: 2340,
    status: "new",
    aiConfidence: 0.97,
    slaDeadline: now - 2 * hour,
    isEscalated: true,
    claimNumber: "CLM-2026-00301",
    claimProcedures: [
      { code: "D6010", description: "Surgical placement of implant body", fee: 2100 },
      { code: "D0330", description: "Panoramic radiograph", fee: 120 },
    ],
    claimTotalCharged: 2220,
    createdAt: now - 26 * hour,
  },

  // 3 acknowledged
  {
    id: "DEN-005",
    denialDate: "2026-01-30",
    patientName: "Lisa Patel",
    patientDob: "1995-09-12",
    patientInsurance: "Guardian DentalGuard",
    patientMemberId: "GDN-5567832",
    payerId: "GDN001",
    payerName: "Guardian",
    reasonCode: "CO-16",
    reasonDescription: "Claim/service lacks information or has submission/billing error(s)",
    category: "documentation",
    amount: 650,
    status: "acknowledged",
    aiConfidence: 0.91,
    assignedTo: "Maria Santos",
    claimNumber: "CLM-2026-00278",
    claimProcedures: [
      { code: "D2750", description: "Crown - porcelain fused to high noble metal", fee: 1200 },
    ],
    claimTotalCharged: 1200,
    createdAt: now - 5 * 24 * hour,
  },
  {
    id: "DEN-006",
    denialDate: "2026-01-29",
    patientName: "David Wilson",
    patientDob: "1980-04-05",
    patientInsurance: "BCBS of TX",
    patientMemberId: "BCB-9012384",
    payerId: "BCB001",
    payerName: "Blue Cross Blue Shield",
    reasonCode: "CO-45",
    reasonDescription: "Charge exceeds fee schedule/maximum allowable or contracted/legislated fee arrangement",
    category: "coding",
    amount: 420,
    status: "acknowledged",
    aiConfidence: 0.76,
    assignedTo: "Tom Richards",
    claimNumber: "CLM-2026-00265",
    claimProcedures: [
      { code: "D2391", description: "Resin composite - 1 surface, posterior", fee: 280 },
      { code: "D2392", description: "Resin composite - 2 surfaces, posterior", fee: 350 },
    ],
    claimTotalCharged: 630,
    createdAt: now - 6 * 24 * hour,
  },
  {
    id: "DEN-007",
    denialDate: "2026-01-28",
    patientName: "Angela Brooks",
    patientDob: "1958-12-18",
    patientInsurance: "United Concordia",
    patientMemberId: "UC-3345678",
    payerId: "UC001",
    payerName: "United Concordia",
    reasonCode: "CO-97",
    reasonDescription: "The benefit for this service is included in the payment/allowance for another service/procedure that has already been adjudicated",
    category: "duplicate",
    amount: 310,
    status: "acknowledged",
    aiConfidence: 0.88,
    assignedTo: "Maria Santos",
    claimNumber: "CLM-2026-00252",
    claimProcedures: [
      { code: "D0274", description: "Bitewings - four films", fee: 85 },
      { code: "D0120", description: "Periodic oral evaluation", fee: 55 },
    ],
    claimTotalCharged: 140,
    createdAt: now - 7 * 24 * hour,
  },

  // 4 appealing
  {
    id: "DEN-008",
    denialDate: "2026-01-25",
    patientName: "Karen Nguyen",
    patientDob: "1987-07-09",
    patientInsurance: "Delta Dental Premier",
    patientMemberId: "DD-6678432",
    payerId: "DD001",
    payerName: "Delta Dental",
    reasonCode: "CO-16",
    reasonDescription: "Claim/service lacks information or has submission/billing error(s)",
    category: "documentation",
    amount: 1800,
    status: "appealing",
    aiConfidence: 0.85,
    assignedTo: "Maria Santos",
    claimNumber: "CLM-2026-00198",
    claimProcedures: [
      { code: "D2740", description: "Crown - porcelain/ceramic", fee: 1100 },
      { code: "D2950", description: "Core buildup, including any pins", fee: 380 },
    ],
    claimTotalCharged: 1480,
    appealStatus: "Draft submitted",
    appealLetterSnippet: "We are writing to formally appeal the denial of claim CLM-2026-00198 for crown and core buildup procedures...",
    createdAt: now - 10 * 24 * hour,
  },
  {
    id: "DEN-009",
    denialDate: "2026-01-24",
    patientName: "James Cooper",
    patientDob: "1963-02-28",
    patientInsurance: "Cigna DPPO",
    patientMemberId: "CIG-7789012",
    payerId: "CIG001",
    payerName: "Cigna Dental",
    reasonCode: "CO-4",
    reasonDescription: "The procedure code is inconsistent with the modifier used or a required modifier is missing",
    category: "authorization",
    amount: 3200,
    status: "appealing",
    aiConfidence: 0.72,
    assignedTo: "Tom Richards",
    claimNumber: "CLM-2026-00185",
    claimProcedures: [
      { code: "D7210", description: "Surgical removal of erupted tooth", fee: 350 },
      { code: "D7240", description: "Removal of impacted tooth - completely bony", fee: 520 },
    ],
    claimTotalCharged: 870,
    appealStatus: "Under review",
    appealLetterSnippet: "Per the patient's plan benefits, surgical extraction procedures are covered when medically necessary...",
    createdAt: now - 11 * 24 * hour,
  },
  {
    id: "DEN-010",
    denialDate: "2026-01-22",
    patientName: "Maria Gonzalez",
    patientDob: "1992-10-15",
    patientInsurance: "MetLife TDP",
    patientMemberId: "ML-2234567",
    payerId: "MET001",
    payerName: "MetLife",
    reasonCode: "PR-1",
    reasonDescription: "Deductible amount",
    category: "eligibility",
    amount: 525,
    status: "appealing",
    aiConfidence: 0.68,
    assignedTo: "Maria Santos",
    claimNumber: "CLM-2026-00170",
    claimProcedures: [
      { code: "D4910", description: "Periodontal maintenance", fee: 175 },
      { code: "D0180", description: "Comprehensive periodontal eval", fee: 95 },
    ],
    claimTotalCharged: 270,
    appealStatus: "In review",
    createdAt: now - 13 * 24 * hour,
  },
  {
    id: "DEN-011",
    denialDate: "2026-01-20",
    patientName: "Thomas Wright",
    patientDob: "1975-05-03",
    patientInsurance: "Aetna DMO",
    patientMemberId: "AET-8890123",
    payerId: "AET001",
    payerName: "Aetna",
    reasonCode: "CO-16",
    reasonDescription: "Claim/service lacks information or has submission/billing error(s)",
    category: "documentation",
    amount: 980,
    status: "appealing",
    aiConfidence: 0.92,
    assignedTo: "Tom Richards",
    claimNumber: "CLM-2026-00155",
    claimProcedures: [
      { code: "D3310", description: "Endodontic therapy, anterior", fee: 750 },
      { code: "D0220", description: "Periapical radiograph", fee: 35 },
    ],
    claimTotalCharged: 785,
    appealStatus: "Pending payer review",
    appealLetterSnippet: "Enclosed please find the periapical radiograph and narrative supporting medical necessity for endodontic therapy...",
    createdAt: now - 15 * 24 * hour,
  },

  // 3 appealed (submitted)
  {
    id: "DEN-012",
    denialDate: "2026-01-15",
    patientName: "Patricia Kim",
    patientDob: "1970-08-21",
    patientInsurance: "Guardian DentalGuard",
    patientMemberId: "GDN-4456789",
    payerId: "GDN001",
    payerName: "Guardian",
    reasonCode: "CO-45",
    reasonDescription: "Charge exceeds fee schedule/maximum allowable",
    category: "coding",
    amount: 760,
    status: "appealed",
    aiConfidence: 0.81,
    assignedTo: "Maria Santos",
    claimNumber: "CLM-2026-00120",
    claimProcedures: [
      { code: "D2740", description: "Crown - porcelain/ceramic", fee: 1100 },
    ],
    claimTotalCharged: 1100,
    appealStatus: "Submitted to payer",
    createdAt: now - 20 * 24 * hour,
  },
  {
    id: "DEN-013",
    denialDate: "2026-01-12",
    patientName: "Steven Davis",
    patientDob: "1982-03-17",
    patientInsurance: "BCBS of TX",
    patientMemberId: "BCB-5567890",
    payerId: "BCB001",
    payerName: "Blue Cross Blue Shield",
    reasonCode: "CO-16",
    reasonDescription: "Claim/service lacks information or has submission/billing error(s)",
    category: "documentation",
    amount: 1450,
    status: "appealed",
    aiConfidence: 0.87,
    assignedTo: "Tom Richards",
    claimNumber: "CLM-2026-00098",
    claimProcedures: [
      { code: "D6058", description: "Abutment supported porcelain/ceramic crown", fee: 1200 },
      { code: "D6059", description: "Abutment supported porcelain fused to metal crown", fee: 950 },
    ],
    claimTotalCharged: 2150,
    appealStatus: "Awaiting payer decision",
    createdAt: now - 23 * 24 * hour,
  },
  {
    id: "DEN-014",
    denialDate: "2026-01-10",
    patientName: "Nancy Hall",
    patientDob: "1955-11-29",
    patientInsurance: "United Concordia",
    patientMemberId: "UC-6678901",
    payerId: "UC001",
    payerName: "United Concordia",
    reasonCode: "CO-4",
    reasonDescription: "The procedure code is inconsistent with the modifier used",
    category: "authorization",
    amount: 2100,
    status: "appealed",
    aiConfidence: 0.79,
    assignedTo: "Maria Santos",
    claimNumber: "CLM-2026-00082",
    claimProcedures: [
      { code: "D8080", description: "Comprehensive orthodontic treatment", fee: 5500 },
    ],
    claimTotalCharged: 5500,
    appealStatus: "Under external review",
    createdAt: now - 25 * 24 * hour,
  },

  // 3 won
  {
    id: "DEN-015",
    denialDate: "2026-01-05",
    patientName: "George Anderson",
    patientDob: "1960-06-14",
    patientInsurance: "Delta Dental PPO",
    patientMemberId: "DD-7789012",
    payerId: "DD001",
    payerName: "Delta Dental",
    reasonCode: "CO-16",
    reasonDescription: "Claim/service lacks information or has submission/billing error(s)",
    category: "documentation",
    amount: 1600,
    status: "won",
    aiConfidence: 0.93,
    assignedTo: "Maria Santos",
    claimNumber: "CLM-2025-01245",
    claimProcedures: [
      { code: "D2740", description: "Crown - porcelain/ceramic", fee: 1100 },
      { code: "D2950", description: "Core buildup", fee: 380 },
    ],
    claimTotalCharged: 1480,
    createdAt: now - 30 * 24 * hour,
  },
  {
    id: "DEN-016",
    denialDate: "2025-12-28",
    patientName: "Barbara Lee",
    patientDob: "1988-04-20",
    patientInsurance: "Cigna DPPO",
    patientMemberId: "CIG-8890123",
    payerId: "CIG001",
    payerName: "Cigna Dental",
    reasonCode: "CO-4",
    reasonDescription: "Procedure code inconsistent with modifier",
    category: "coding",
    amount: 450,
    status: "won",
    aiConfidence: 0.86,
    assignedTo: "Tom Richards",
    claimNumber: "CLM-2025-01198",
    claimProcedures: [
      { code: "D4341", description: "Periodontal scaling & root planing", fee: 350 },
    ],
    claimTotalCharged: 350,
    createdAt: now - 38 * 24 * hour,
  },
  {
    id: "DEN-017",
    denialDate: "2025-12-20",
    patientName: "Daniel Taylor",
    patientDob: "1978-09-05",
    patientInsurance: "MetLife TDP",
    patientMemberId: "ML-9901234",
    payerId: "MET001",
    payerName: "MetLife",
    reasonCode: "PR-1",
    reasonDescription: "Deductible amount",
    category: "eligibility",
    amount: 280,
    status: "won",
    aiConfidence: 0.74,
    assignedTo: "Maria Santos",
    claimNumber: "CLM-2025-01150",
    claimProcedures: [
      { code: "D1110", description: "Prophylaxis - adult", fee: 135 },
      { code: "D0274", description: "Bitewings - four films", fee: 85 },
    ],
    claimTotalCharged: 220,
    createdAt: now - 46 * 24 * hour,
  },

  // 2 lost
  {
    id: "DEN-018",
    denialDate: "2025-12-15",
    patientName: "Carol White",
    patientDob: "1965-12-01",
    patientInsurance: "Aetna DMO",
    patientMemberId: "AET-1012345",
    payerId: "AET001",
    payerName: "Aetna",
    reasonCode: "CO-29",
    reasonDescription: "The time limit for filing has expired",
    category: "timely_filing",
    amount: 1950,
    status: "lost",
    aiConfidence: 0.96,
    assignedTo: "Tom Richards",
    claimNumber: "CLM-2025-01085",
    claimProcedures: [
      { code: "D6010", description: "Surgical placement of implant body", fee: 2100 },
    ],
    claimTotalCharged: 2100,
    createdAt: now - 51 * 24 * hour,
  },
  {
    id: "DEN-019",
    denialDate: "2025-12-10",
    patientName: "Mark Johnson",
    patientDob: "1973-07-25",
    patientInsurance: "BCBS of TX",
    patientMemberId: "BCB-1123456",
    payerId: "BCB001",
    payerName: "Blue Cross Blue Shield",
    reasonCode: "CO-97",
    reasonDescription: "Already adjudicated — benefit included in another service",
    category: "duplicate",
    amount: 190,
    status: "lost",
    aiConfidence: 0.91,
    assignedTo: "Maria Santos",
    claimNumber: "CLM-2025-01042",
    claimProcedures: [
      { code: "D0120", description: "Periodic oral evaluation", fee: 55 },
    ],
    claimTotalCharged: 55,
    createdAt: now - 56 * 24 * hour,
  },

  // 1 partial
  {
    id: "DEN-020",
    denialDate: "2025-12-05",
    patientName: "Susan Clark",
    patientDob: "1983-02-14",
    patientInsurance: "Guardian DentalGuard",
    patientMemberId: "GDN-2234567",
    payerId: "GDN001",
    payerName: "Guardian",
    reasonCode: "CO-45",
    reasonDescription: "Charge exceeds fee schedule/maximum allowable",
    category: "coding",
    amount: 920,
    status: "partial",
    aiConfidence: 0.78,
    assignedTo: "Tom Richards",
    claimNumber: "CLM-2025-00998",
    claimProcedures: [
      { code: "D2750", description: "Crown - porcelain fused to high noble metal", fee: 1200 },
    ],
    claimTotalCharged: 1200,
    createdAt: now - 61 * 24 * hour,
  },
]

// ---------------------------------------------------------------------------
// Stats computation
// ---------------------------------------------------------------------------

function computeStats(denials: DenialData[]) {
  const total = denials.length
  const unacknowledged = denials.filter((d) => d.status === "new").length
  const appealed = denials.filter((d) =>
    ["appealing", "appealed", "won", "lost", "partial"].includes(d.status)
  ).length
  const appealRate = total > 0 ? Math.round((appealed / total) * 100) : 0
  const outcomes = denials.filter((d) =>
    ["won", "lost", "partial"].includes(d.status)
  )
  const wonOrPartial = outcomes.filter((d) =>
    ["won", "partial"].includes(d.status)
  ).length
  const appealSuccess =
    outcomes.length > 0 ? Math.round((wonOrPartial / outcomes.length) * 100) : 0

  // avg resolution: days between creation and now for resolved denials
  const resolved = denials.filter((d) =>
    ["won", "lost", "partial", "written_off"].includes(d.status)
  )
  const avgDays =
    resolved.length > 0
      ? Math.round(
          resolved.reduce(
            (sum, d) => sum + (now - d.createdAt) / (24 * hour),
            0
          ) / resolved.length
        )
      : 0

  return { total, unacknowledged, appealRate, appealSuccess, avgDays }
}

// ---------------------------------------------------------------------------
// Unique payers
// ---------------------------------------------------------------------------

function uniquePayers(denials: DenialData[]): string[] {
  return [...new Set(denials.map((d) => d.payerName))].sort()
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DenialsPage() {
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [payerFilter, setPayerFilter] = useState<string>("all")

  const stats = useMemo(() => computeStats(DEMO_DENIALS), [])
  const payers = useMemo(() => uniquePayers(DEMO_DENIALS), [])

  const filtered = useMemo(() => {
    return DEMO_DENIALS.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false
      if (categoryFilter !== "all" && d.category !== categoryFilter) return false
      if (payerFilter !== "all" && d.payerName !== payerFilter) return false
      return true
    })
  }, [statusFilter, categoryFilter, payerFilter])

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Denial Management</h1>
        <p className="text-muted-foreground">
          AI-powered denial analysis, categorization, and appeal generation.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="py-4">
          <CardContent className="flex items-center gap-3">
            <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900">
              <AlertTriangle className="size-5 text-red-600 dark:text-red-300" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Denials</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardContent className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-900">
              <Clock className="size-5 text-orange-600 dark:text-orange-300" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Unacknowledged</p>
              <p className={cn("text-2xl font-bold", stats.unacknowledged > 0 && "text-red-600")}>
                {stats.unacknowledged}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardContent className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
              <FileText className="size-5 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Appeal Rate</p>
              <p className="text-2xl font-bold">{stats.appealRate}%</p>
            </div>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardContent className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900">
              <CheckCircle className="size-5 text-green-600 dark:text-green-300" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Appeal Success</p>
              <p className="text-2xl font-bold">{stats.appealSuccess}%</p>
            </div>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardContent className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900">
              <TrendingUp className="size-5 text-purple-600 dark:text-purple-300" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Resolution</p>
              <p className="text-2xl font-bold">{stats.avgDays} days</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {(Object.keys(STATUS_LABELS) as DenialStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {(Object.keys(CATEGORY_LABELS) as DenialCategory[]).map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={payerFilter} onValueChange={setPayerFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Payers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payers</SelectItem>
            {payers.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(statusFilter !== "all" ||
          categoryFilter !== "all" ||
          payerFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter("all")
              setCategoryFilter("all")
              setPayerFilter("all")
            }}
          >
            Clear filters
          </Button>
        )}

        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} of {DEMO_DENIALS.length} denials
        </span>
      </div>

      {/* Denials table */}
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Denial Date</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Payer</TableHead>
              <TableHead>Reason Code</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((denial) => {
              const isExpanded = expandedRow === denial.id
              const sla = getSlaDisplay(denial)

              return (
                <DenialRow
                  key={denial.id}
                  denial={denial}
                  isExpanded={isExpanded}
                  sla={sla}
                  onToggle={() =>
                    setExpandedRow(isExpanded ? null : denial.id)
                  }
                />
              )
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="py-12 text-center text-muted-foreground">
                  No denials match the selected filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Table row (extracted for readability)
// ---------------------------------------------------------------------------

function DenialRow({
  denial,
  isExpanded,
  sla,
  onToggle,
}: {
  denial: DenialData
  isExpanded: boolean
  sla: { text: string; color: string; isPulsing: boolean }
  onToggle: () => void
}) {
  return (
    <>
      <TableRow
        className="cursor-pointer"
        onClick={onToggle}
      >
        <TableCell>
          {isExpanded ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
        </TableCell>
        <TableCell className="font-mono text-xs">{denial.denialDate}</TableCell>
        <TableCell className="font-medium">{denial.patientName}</TableCell>
        <TableCell className="text-sm">{denial.payerName}</TableCell>
        <TableCell className="font-mono text-xs">{denial.reasonCode}</TableCell>
        <TableCell>
          <Badge className={cn("border-0 text-xs", CATEGORY_COLORS[denial.category])}>
            {CATEGORY_LABELS[denial.category]}
          </Badge>
        </TableCell>
        <TableCell className="text-right font-medium tabular-nums">
          ${denial.amount.toLocaleString()}
        </TableCell>
        <TableCell>
          <Badge className={cn("border-0 text-xs", STATUS_COLORS[denial.status])}>
            {STATUS_LABELS[denial.status]}
          </Badge>
        </TableCell>
        <TableCell>
          <span className={cn("text-sm font-medium flex items-center gap-1", sla.color)}>
            {sla.isPulsing && (
              <span className="inline-block size-2 rounded-full bg-red-500 animate-pulse" />
            )}
            {sla.text}
          </span>
        </TableCell>
        <TableCell className="text-sm">
          {denial.assignedTo ?? (
            <span className="text-muted-foreground italic">Unassigned</span>
          )}
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <DenialActions denial={denial} />
        </TableCell>
      </TableRow>

      {/* Expandable detail */}
      {isExpanded && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={11} className="p-0 bg-muted/30">
            <DenialDetail denial={denial} />
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Actions column
// ---------------------------------------------------------------------------

const TEAM_MEMBERS = ["Maria Santos", "Tom Richards", "James Miller", "Emily Chen"]

function DenialActions({ denial }: { denial: DenialData }) {
  switch (denial.status) {
    case "new":
      return (
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="xs">
            Acknowledge
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="xs">
                <User className="size-3" />
                Assign
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {TEAM_MEMBERS.map((name) => (
                <DropdownMenuItem key={name}>{name}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )

    case "acknowledged":
      return (
        <div className="flex items-center gap-1.5">
          <Button size="xs" asChild>
            <a href={`/rcm/denials/${denial.id}/appeal`}>Create Appeal</a>
          </Button>
          <Button variant="destructive" size="xs">
            Escalate
          </Button>
        </div>
      )

    case "appealing":
    case "appealed":
      return (
        <Button variant="outline" size="xs" asChild>
          <a href={`/rcm/denials/${denial.id}/appeal`}>View Appeal</a>
        </Button>
      )

    case "won":
    case "lost":
    case "partial":
    case "written_off":
      return (
        <Button variant="ghost" size="xs" asChild>
          <a href={`/rcm/denials/${denial.id}/appeal`}>View Details</a>
        </Button>
      )

    default:
      return null
  }
}
