"use client"

import { useState, useMemo } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../../../convex/_generated/api"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  Search,
  FileCheck,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
  Send,
  CalendarClock,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MatchedERA {
  id: string
  checkNumber: string
  payer: string
  checkDate: string
  patient: string
  claimNumber: string
  charged: number
  paid: number
  adjustment: number
  remarkCodes: string[]
  matchDate: string
}

interface UnmatchedERA {
  id: string
  checkNumber: string
  payer: string
  checkDate: string
  patientName: string
  amountPaid: number
  remarkCodes: string[]
}

type ExceptionIssue = "Amount Mismatch" | "Partial Payment" | "Duplicate"

interface ExceptionERA {
  id: string
  checkNumber: string
  payer: string
  patient: string
  matchedClaim: string
  issue: ExceptionIssue
  eraAmount: number
  claimAmount: number
  difference: number
}

interface OverdueAlert {
  id: string
  patient: string
  balance: number
  nextAppointment: string
  daysUntil: number
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_MATCHED: MatchedERA[] = [
  { id: "m1", checkNumber: "CHK-990142", payer: "Delta Dental PPO", checkDate: "2026-01-28", patient: "Maria Gonzalez", claimNumber: "CLM-20260115-001", charged: 850.00, paid: 680.00, adjustment: 170.00, remarkCodes: ["CO-45"], matchDate: "2026-01-29" },
  { id: "m2", checkNumber: "CHK-990143", payer: "Cigna DPPO", checkDate: "2026-01-28", patient: "James Wilson", claimNumber: "CLM-20260116-002", charged: 1200.00, paid: 960.00, adjustment: 240.00, remarkCodes: ["CO-45", "PR-2"], matchDate: "2026-01-29" },
  { id: "m3", checkNumber: "CHK-990144", payer: "MetLife PDP", checkDate: "2026-01-27", patient: "Susan Chen", claimNumber: "CLM-20260114-003", charged: 425.00, paid: 340.00, adjustment: 85.00, remarkCodes: ["CO-45"], matchDate: "2026-01-28" },
  { id: "m4", checkNumber: "CHK-990145", payer: "Aetna DMO", checkDate: "2026-01-27", patient: "Robert Taylor", claimNumber: "CLM-20260113-004", charged: 2100.00, paid: 1680.00, adjustment: 420.00, remarkCodes: ["CO-45", "OA-23"], matchDate: "2026-01-28" },
  { id: "m5", checkNumber: "CHK-990146", payer: "Delta Dental PPO", checkDate: "2026-01-26", patient: "Emily Davis", claimNumber: "CLM-20260112-005", charged: 550.00, paid: 440.00, adjustment: 110.00, remarkCodes: ["CO-45"], matchDate: "2026-01-27" },
  { id: "m6", checkNumber: "CHK-990147", payer: "Guardian Dental", checkDate: "2026-01-26", patient: "Michael Brown", claimNumber: "CLM-20260111-006", charged: 975.00, paid: 780.00, adjustment: 195.00, remarkCodes: ["PR-1", "CO-45"], matchDate: "2026-01-27" },
  { id: "m7", checkNumber: "CHK-990148", payer: "United Concordia", checkDate: "2026-01-25", patient: "Jennifer Lee", claimNumber: "CLM-20260110-007", charged: 380.00, paid: 304.00, adjustment: 76.00, remarkCodes: ["CO-45"], matchDate: "2026-01-26" },
  { id: "m8", checkNumber: "CHK-990149", payer: "BlueCross BlueShield", checkDate: "2026-01-25", patient: "David Martinez", claimNumber: "CLM-20260109-008", charged: 1650.00, paid: 1320.00, adjustment: 330.00, remarkCodes: ["CO-45", "PR-2"], matchDate: "2026-01-26" },
  { id: "m9", checkNumber: "CHK-990150", payer: "Cigna DPPO", checkDate: "2026-01-24", patient: "Patricia Anderson", claimNumber: "CLM-20260108-009", charged: 725.00, paid: 580.00, adjustment: 145.00, remarkCodes: ["CO-45"], matchDate: "2026-01-25" },
  { id: "m10", checkNumber: "CHK-990151", payer: "MetLife PDP", checkDate: "2026-01-24", patient: "Daniel Thomas", claimNumber: "CLM-20260107-010", charged: 490.00, paid: 392.00, adjustment: 98.00, remarkCodes: ["CO-45"], matchDate: "2026-01-25" },
  { id: "m11", checkNumber: "CHK-990152", payer: "Aetna DMO", checkDate: "2026-01-23", patient: "Nancy Jackson", claimNumber: "CLM-20260106-011", charged: 1100.00, paid: 880.00, adjustment: 220.00, remarkCodes: ["CO-45", "OA-23"], matchDate: "2026-01-24" },
  { id: "m12", checkNumber: "CHK-990153", payer: "Delta Dental PPO", checkDate: "2026-01-23", patient: "Christopher White", claimNumber: "CLM-20260105-012", charged: 675.00, paid: 540.00, adjustment: 135.00, remarkCodes: ["CO-45"], matchDate: "2026-01-24" },
  { id: "m13", checkNumber: "CHK-990154", payer: "Guardian Dental", checkDate: "2026-01-22", patient: "Karen Harris", claimNumber: "CLM-20260104-013", charged: 320.00, paid: 256.00, adjustment: 64.00, remarkCodes: ["CO-45"], matchDate: "2026-01-23" },
  { id: "m14", checkNumber: "CHK-990155", payer: "BlueCross BlueShield", checkDate: "2026-01-22", patient: "Steven Clark", claimNumber: "CLM-20260103-014", charged: 1450.00, paid: 1160.00, adjustment: 290.00, remarkCodes: ["CO-45", "PR-1"], matchDate: "2026-01-23" },
  { id: "m15", checkNumber: "CHK-990156", payer: "United Concordia", checkDate: "2026-01-21", patient: "Lisa Robinson", claimNumber: "CLM-20260102-015", charged: 890.00, paid: 712.00, adjustment: 178.00, remarkCodes: ["CO-45"], matchDate: "2026-01-22" },
  { id: "m16", checkNumber: "CHK-990157", payer: "Cigna DPPO", checkDate: "2026-01-21", patient: "Mark Lewis", claimNumber: "CLM-20260101-016", charged: 560.00, paid: 448.00, adjustment: 112.00, remarkCodes: ["CO-45"], matchDate: "2026-01-22" },
  { id: "m17", checkNumber: "CHK-990158", payer: "MetLife PDP", checkDate: "2026-01-20", patient: "Amanda Walker", claimNumber: "CLM-20251231-017", charged: 1025.00, paid: 820.00, adjustment: 205.00, remarkCodes: ["CO-45", "PR-2"], matchDate: "2026-01-21" },
  { id: "m18", checkNumber: "CHK-990159", payer: "Aetna DMO", checkDate: "2026-01-20", patient: "Brian Hall", claimNumber: "CLM-20251230-018", charged: 750.00, paid: 600.00, adjustment: 150.00, remarkCodes: ["CO-45"], matchDate: "2026-01-21" },
  { id: "m19", checkNumber: "CHK-990160", payer: "Delta Dental PPO", checkDate: "2026-01-19", patient: "Stephanie Allen", claimNumber: "CLM-20251229-019", charged: 1375.00, paid: 1100.00, adjustment: 275.00, remarkCodes: ["CO-45", "OA-23"], matchDate: "2026-01-20" },
  { id: "m20", checkNumber: "CHK-990161", payer: "Guardian Dental", checkDate: "2026-01-19", patient: "Kevin Young", claimNumber: "CLM-20251228-020", charged: 440.00, paid: 352.00, adjustment: 88.00, remarkCodes: ["CO-45"], matchDate: "2026-01-20" },
  { id: "m21", checkNumber: "CHK-990162", payer: "BlueCross BlueShield", checkDate: "2026-01-18", patient: "Michelle King", claimNumber: "CLM-20251227-021", charged: 920.00, paid: 736.00, adjustment: 184.00, remarkCodes: ["CO-45"], matchDate: "2026-01-19" },
]

const MOCK_UNMATCHED: UnmatchedERA[] = [
  { id: "u1", checkNumber: "CHK-990170", payer: "Delta Dental PPO", checkDate: "2026-01-30", patientName: "Carlos Ramirez", amountPaid: 475.00, remarkCodes: ["CO-45", "PR-1"] },
  { id: "u2", checkNumber: "CHK-990171", payer: "Cigna DPPO", checkDate: "2026-01-30", patientName: "Angela Foster", amountPaid: 1120.00, remarkCodes: ["CO-45"] },
  { id: "u3", checkNumber: "CHK-990172", payer: "MetLife PDP", checkDate: "2026-01-29", patientName: "Raymond Cox", amountPaid: 325.00, remarkCodes: ["OA-23"] },
  { id: "u4", checkNumber: "CHK-990173", payer: "Aetna DMO", checkDate: "2026-01-29", patientName: "Diane Price", amountPaid: 890.00, remarkCodes: ["CO-45", "PR-2"] },
  { id: "u5", checkNumber: "CHK-990174", payer: "Guardian Dental", checkDate: "2026-01-28", patientName: "Wayne Bennett", amountPaid: 210.00, remarkCodes: ["CO-45"] },
]

const MOCK_EXCEPTIONS: ExceptionERA[] = [
  { id: "e1", checkNumber: "CHK-990180", payer: "Delta Dental PPO", patient: "Laura Mitchell", matchedClaim: "CLM-20260120-030", issue: "Amount Mismatch", eraAmount: 680.00, claimAmount: 750.00, difference: -70.00 },
  { id: "e2", checkNumber: "CHK-990181", payer: "Cigna DPPO", patient: "Thomas Perry", matchedClaim: "CLM-20260119-031", issue: "Partial Payment", eraAmount: 400.00, claimAmount: 960.00, difference: -560.00 },
  { id: "e3", checkNumber: "CHK-990182", payer: "BlueCross BlueShield", patient: "Sandra Long", matchedClaim: "CLM-20260118-032", issue: "Duplicate", eraAmount: 1320.00, claimAmount: 1320.00, difference: 0.00 },
  { id: "e4", checkNumber: "CHK-990183", payer: "MetLife PDP", patient: "Joseph Reed", matchedClaim: "CLM-20260117-033", issue: "Amount Mismatch", eraAmount: 285.00, claimAmount: 340.00, difference: -55.00 },
  { id: "e5", checkNumber: "CHK-990184", payer: "Aetna DMO", patient: "Betty Cook", matchedClaim: "CLM-20260116-034", issue: "Partial Payment", eraAmount: 550.00, claimAmount: 1680.00, difference: -1130.00 },
  { id: "e6", checkNumber: "CHK-990185", payer: "Guardian Dental", patient: "George Morgan", matchedClaim: "CLM-20260115-035", issue: "Amount Mismatch", eraAmount: 715.00, claimAmount: 780.00, difference: -65.00 },
  { id: "e7", checkNumber: "CHK-990186", payer: "United Concordia", patient: "Dorothy Bell", matchedClaim: "CLM-20260114-036", issue: "Duplicate", eraAmount: 304.00, claimAmount: 304.00, difference: 0.00 },
  { id: "e8", checkNumber: "CHK-990187", payer: "Delta Dental PPO", patient: "Frank Murphy", matchedClaim: "CLM-20260113-037", issue: "Partial Payment", eraAmount: 220.00, claimAmount: 540.00, difference: -320.00 },
]

const MOCK_OVERDUE: OverdueAlert[] = [
  { id: "o1", patient: "Maria Gonzalez", balance: 425.00, nextAppointment: "2026-02-10", daysUntil: 4 },
  { id: "o2", patient: "James Wilson", balance: 1250.00, nextAppointment: "2026-02-08", daysUntil: 2 },
  { id: "o3", patient: "Robert Taylor", balance: 780.00, nextAppointment: "2026-02-12", daysUntil: 6 },
  { id: "o4", patient: "Michael Brown", balance: 195.00, nextAppointment: "2026-02-07", daysUntil: 1 },
  { id: "o5", patient: "David Martinez", balance: 550.00, nextAppointment: "2026-02-15", daysUntil: 9 },
  { id: "o6", patient: "Patricia Anderson", balance: 340.00, nextAppointment: "2026-02-11", daysUntil: 5 },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function issueBadgeClasses(issue: ExceptionIssue): string {
  switch (issue) {
    case "Amount Mismatch":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
    case "Partial Payment":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
    case "Duplicate":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
  }
}

function alertBadge(daysUntil: number): { label: string; className: string } {
  if (daysUntil <= 2) return { label: "Urgent", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" }
  if (daysUntil <= 5) return { label: "Soon", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" }
  return { label: "Upcoming", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReconciliationPage() {
  const [activeTab, setActiveTab] = useState("matched")
  const [searchQuery, setSearchQuery] = useState("")

  // Search Claims dialog (for unmatched)
  const [searchClaimsOpen, setSearchClaimsOpen] = useState(false)
  const [searchClaimsTarget, setSearchClaimsTarget] = useState<UnmatchedERA | null>(null)
  const [claimSearchQuery, setClaimSearchQuery] = useState("")

  // Adjust dialog (for exceptions)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustTarget, setAdjustTarget] = useState<ExceptionERA | null>(null)
  const [adjustedAmount, setAdjustedAmount] = useState("")

  // Bulk selection for exceptions
  const [selectedExceptions, setSelectedExceptions] = useState<Set<string>>(new Set())

  // Try Convex query, fall back to mock data
  let convexError = false
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery(api.payments.queries.listReconciliation)
  } catch {
    convexError = true
  }

  // Always use mock data for now
  const matched = MOCK_MATCHED
  const unmatched = MOCK_UNMATCHED
  const exceptions = MOCK_EXCEPTIONS
  const overdue = MOCK_OVERDUE

  // Compute stats
  const totalERAs = matched.length + unmatched.length + exceptions.length
  const autoMatchRate = totalERAs > 0 ? Math.round((matched.length / totalERAs) * 100) : 0
  const matchedAmount = matched.reduce((sum, e) => sum + e.paid, 0)

  // Filter by search
  const filteredMatched = useMemo(() => {
    if (!searchQuery) return matched
    const q = searchQuery.toLowerCase()
    return matched.filter(
      (e) =>
        e.checkNumber.toLowerCase().includes(q) ||
        e.payer.toLowerCase().includes(q) ||
        e.patient.toLowerCase().includes(q) ||
        e.claimNumber.toLowerCase().includes(q)
    )
  }, [matched, searchQuery])

  const filteredUnmatched = useMemo(() => {
    if (!searchQuery) return unmatched
    const q = searchQuery.toLowerCase()
    return unmatched.filter(
      (e) =>
        e.checkNumber.toLowerCase().includes(q) ||
        e.payer.toLowerCase().includes(q) ||
        e.patientName.toLowerCase().includes(q)
    )
  }, [unmatched, searchQuery])

  const filteredExceptions = useMemo(() => {
    if (!searchQuery) return exceptions
    const q = searchQuery.toLowerCase()
    return exceptions.filter(
      (e) =>
        e.checkNumber.toLowerCase().includes(q) ||
        e.payer.toLowerCase().includes(q) ||
        e.patient.toLowerCase().includes(q) ||
        e.matchedClaim.toLowerCase().includes(q)
    )
  }, [exceptions, searchQuery])

  // Matched totals
  const totalCharged = filteredMatched.reduce((s, e) => s + e.charged, 0)
  const totalPaid = filteredMatched.reduce((s, e) => s + e.paid, 0)
  const totalAdjustment = filteredMatched.reduce((s, e) => s + e.adjustment, 0)

  // Exception selection
  function toggleException(id: string) {
    setSelectedExceptions((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllExceptions() {
    if (selectedExceptions.size === filteredExceptions.length) {
      setSelectedExceptions(new Set())
    } else {
      setSelectedExceptions(new Set(filteredExceptions.map((e) => e.id)))
    }
  }

  function handleBulkResolve() {
    toast.success(`Resolved ${selectedExceptions.size} exception(s)`)
    setSelectedExceptions(new Set())
  }

  function handleSearchClaims(era: UnmatchedERA) {
    setSearchClaimsTarget(era)
    setClaimSearchQuery("")
    setSearchClaimsOpen(true)
  }

  function handleManualMatch(era: UnmatchedERA) {
    toast.success(`Manual match created for ${era.patientName}`)
  }

  function handleDismiss(era: UnmatchedERA) {
    toast.info(`Dismissed ERA ${era.checkNumber}`)
  }

  function handleAcceptException(exc: ExceptionERA) {
    toast.success(`Accepted exception for ${exc.patient}`)
  }

  function handleRejectException(exc: ExceptionERA) {
    toast.info(`Rejected exception for ${exc.patient}`)
  }

  function handleOpenAdjust(exc: ExceptionERA) {
    setAdjustTarget(exc)
    setAdjustedAmount(exc.eraAmount.toFixed(2))
    setAdjustOpen(true)
  }

  function handleSubmitAdjust() {
    if (!adjustTarget) return
    toast.success(`Adjusted ${adjustTarget.patient} to ${formatCurrency(parseFloat(adjustedAmount))}`)
    setAdjustOpen(false)
    setAdjustTarget(null)
  }

  function handleSendReminder(alert: OverdueAlert) {
    toast.success(`Payment reminder sent to ${alert.patient}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ERA Reconciliation</h1>
        <p className="text-muted-foreground">
          Match electronic remittance advices (ERAs) to claims, resolve exceptions, and track outstanding balances.
        </p>
      </div>

      {convexError && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Convex backend is not connected. Displaying mock data for preview.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total ERAs</CardTitle>
            <FileCheck className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalERAs}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Auto-Match Rate</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{autoMatchRate}%</div>
            <p className="text-xs text-muted-foreground">Automatically reconciled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Matched Amount</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(matchedAmount)}</div>
            <p className="text-xs text-muted-foreground">Total payments matched</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Exceptions</CardTitle>
            <AlertTriangle className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{exceptions.length}</div>
            <p className="text-xs text-muted-foreground">Require review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Unmatched</CardTitle>
            <HelpCircle className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unmatched.length}</div>
            <p className="text-xs text-muted-foreground">Pending manual match</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by check #, payer, patient, or claim..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="matched">
            Matched ({matched.length})
          </TabsTrigger>
          <TabsTrigger value="unmatched">
            Unmatched ({unmatched.length})
          </TabsTrigger>
          <TabsTrigger value="exceptions">
            Exceptions ({exceptions.length})
          </TabsTrigger>
        </TabsList>

        {/* ---- Matched Tab ---- */}
        <TabsContent value="matched">
          <Card>
            <CardHeader>
              <CardTitle>Matched ERAs</CardTitle>
              <CardDescription>
                {filteredMatched.length} ERA{filteredMatched.length !== 1 ? "s" : ""} successfully matched to claims
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Check #</TableHead>
                      <TableHead>Payer</TableHead>
                      <TableHead>Check Date</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Claim #</TableHead>
                      <TableHead className="text-right">Charged</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Adjustment</TableHead>
                      <TableHead>Remark Codes</TableHead>
                      <TableHead>Match Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMatched.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                          No matched ERAs found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {filteredMatched.map((era) => (
                          <TableRow key={era.id} className="border-l-4 border-l-emerald-500">
                            <TableCell className="font-mono text-sm">{era.checkNumber}</TableCell>
                            <TableCell>{era.payer}</TableCell>
                            <TableCell>{formatDate(era.checkDate)}</TableCell>
                            <TableCell className="font-medium">{era.patient}</TableCell>
                            <TableCell className="font-mono text-sm">{era.claimNumber}</TableCell>
                            <TableCell className="text-right">{formatCurrency(era.charged)}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(era.paid)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{formatCurrency(era.adjustment)}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {era.remarkCodes.map((code) => (
                                  <Badge key={code} variant="outline" className="text-xs">
                                    {code}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>{formatDate(era.matchDate)}</TableCell>
                          </TableRow>
                        ))}
                        {/* Totals row */}
                        <TableRow className="bg-muted/50 font-medium">
                          <TableCell colSpan={5} className="text-right">
                            Totals
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(totalCharged)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(totalPaid)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(totalAdjustment)}</TableCell>
                          <TableCell colSpan={2} />
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Unmatched Tab ---- */}
        <TabsContent value="unmatched">
          <Card>
            <CardHeader>
              <CardTitle>Unmatched ERAs</CardTitle>
              <CardDescription>
                {filteredUnmatched.length} ERA{filteredUnmatched.length !== 1 ? "s" : ""} could not be automatically matched to claims
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Check #</TableHead>
                      <TableHead>Payer</TableHead>
                      <TableHead>Check Date</TableHead>
                      <TableHead>Patient Name</TableHead>
                      <TableHead className="text-right">Amount Paid</TableHead>
                      <TableHead>Remark Codes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUnmatched.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                          No unmatched ERAs found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUnmatched.map((era) => (
                        <TableRow key={era.id} className="border-l-4 border-l-amber-400">
                          <TableCell className="font-mono text-sm">{era.checkNumber}</TableCell>
                          <TableCell>{era.payer}</TableCell>
                          <TableCell>{formatDate(era.checkDate)}</TableCell>
                          <TableCell className="font-medium">{era.patientName}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(era.amountPaid)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {era.remarkCodes.map((code) => (
                                <Badge key={code} variant="outline" className="text-xs">
                                  {code}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSearchClaims(era)}
                              >
                                <Search className="mr-1 size-3" />
                                Search Claims
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleManualMatch(era)}
                              >
                                <SlidersHorizontal className="mr-1 size-3" />
                                Manual Match
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDismiss(era)}
                              >
                                <XCircle className="mr-1 size-3" />
                                Dismiss
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Exceptions Tab ---- */}
        <TabsContent value="exceptions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Exceptions</CardTitle>
                  <CardDescription>
                    {filteredExceptions.length} ERA{filteredExceptions.length !== 1 ? "s" : ""} matched but have issues requiring review
                  </CardDescription>
                </div>
                {selectedExceptions.size > 0 && (
                  <Button onClick={handleBulkResolve} size="sm">
                    <CheckCircle2 className="mr-2 size-4" />
                    Bulk Resolve ({selectedExceptions.size})
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <button
                          type="button"
                          className="flex size-4 items-center justify-center rounded border border-input bg-background"
                          onClick={toggleAllExceptions}
                          aria-label="Select all exceptions"
                        >
                          {selectedExceptions.size === filteredExceptions.length && filteredExceptions.length > 0 && (
                            <CheckCircle2 className="size-3 text-primary" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead>Check #</TableHead>
                      <TableHead>Payer</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Matched Claim</TableHead>
                      <TableHead>Issue</TableHead>
                      <TableHead className="text-right">ERA Amount</TableHead>
                      <TableHead className="text-right">Claim Amount</TableHead>
                      <TableHead className="text-right">Difference</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExceptions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                          No exceptions found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredExceptions.map((exc) => (
                        <TableRow key={exc.id} className="border-l-4 border-l-red-500">
                          <TableCell>
                            <button
                              type="button"
                              className="flex size-4 items-center justify-center rounded border border-input bg-background"
                              onClick={() => toggleException(exc.id)}
                              aria-label={`Select ${exc.patient}`}
                            >
                              {selectedExceptions.has(exc.id) && (
                                <CheckCircle2 className="size-3 text-primary" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{exc.checkNumber}</TableCell>
                          <TableCell>{exc.payer}</TableCell>
                          <TableCell className="font-medium">{exc.patient}</TableCell>
                          <TableCell className="font-mono text-sm">{exc.matchedClaim}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={issueBadgeClasses(exc.issue)}>
                              {exc.issue}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(exc.eraAmount)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(exc.claimAmount)}</TableCell>
                          <TableCell className="text-right">
                            <span className={exc.difference < 0 ? "text-red-600 dark:text-red-400" : exc.difference > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                              {exc.difference >= 0 ? "+" : ""}{formatCurrency(exc.difference)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAcceptException(exc)}
                              >
                                Accept
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRejectException(exc)}
                              >
                                Reject
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenAdjust(exc)}
                              >
                                Adjust
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Overdue Balance Alert Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarClock className="size-5 text-amber-600 dark:text-amber-400" />
            <div>
              <CardTitle>Overdue Balance Alerts</CardTitle>
              <CardDescription>
                Patients with outstanding balances and upcoming appointments
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Next Appointment</TableHead>
                  <TableHead>Days Until</TableHead>
                  <TableHead>Alert</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdue.map((alert) => {
                  const ab = alertBadge(alert.daysUntil)
                  return (
                    <TableRow key={alert.id}>
                      <TableCell className="font-medium">{alert.patient}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(alert.balance)}</TableCell>
                      <TableCell>{formatDate(alert.nextAppointment)}</TableCell>
                      <TableCell>{alert.daysUntil} day{alert.daysUntil !== 1 ? "s" : ""}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={ab.className}>
                          {ab.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendReminder(alert)}
                        >
                          <Send className="mr-1 size-3" />
                          Send Payment Reminder
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Search Claims Dialog */}
      <Dialog open={searchClaimsOpen} onOpenChange={setSearchClaimsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Search Claims</DialogTitle>
            <DialogDescription>
              Find a matching claim for ERA check {searchClaimsTarget?.checkNumber} - {searchClaimsTarget?.patientName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Patient Name</Label>
              <Input value={searchClaimsTarget?.patientName ?? ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Amount Paid</Label>
              <Input value={searchClaimsTarget ? formatCurrency(searchClaimsTarget.amountPaid) : ""} disabled />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="claim-search">Search by patient name, date, or amount</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="claim-search"
                  placeholder="Search claims..."
                  className="pl-9"
                  value={claimSearchQuery}
                  onChange={(e) => setClaimSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="rounded-md border p-4 text-center text-sm text-muted-foreground">
              {claimSearchQuery
                ? "No matching claims found. Try a different search term."
                : "Enter a search term to find matching claims."}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSearchClaimsOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Exception Dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Exception</DialogTitle>
            <DialogDescription>
              Adjust the reconciled amount for {adjustTarget?.patient} - {adjustTarget?.matchedClaim}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ERA Amount</Label>
                <Input value={adjustTarget ? formatCurrency(adjustTarget.eraAmount) : ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Claim Amount</Label>
                <Input value={adjustTarget ? formatCurrency(adjustTarget.claimAmount) : ""} disabled />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Issue</Label>
              <div>
                {adjustTarget && (
                  <Badge variant="secondary" className={issueBadgeClasses(adjustTarget.issue)}>
                    {adjustTarget.issue}
                  </Badge>
                )}
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="adjusted-amount">Adjusted Amount</Label>
              <Input
                id="adjusted-amount"
                type="number"
                step="0.01"
                min="0"
                value={adjustedAmount}
                onChange={(e) => setAdjustedAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitAdjust} disabled={!adjustedAmount}>
              Save Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
