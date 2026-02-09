"use client"

import { useState, useMemo } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import { DataEmptyState } from "@/components/ui/data-empty-state"

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
// Build reconciliation data from raw Convex queries
// ---------------------------------------------------------------------------

function buildReconciliationData(
  rawPayments: any[],
  rawClaims: any[]
): {
  matched: MatchedERA[]
  unmatched: UnmatchedERA[]
  exceptions: ExceptionERA[]
  overdue: OverdueAlert[]
} {
  const matched: MatchedERA[] = []
  const unmatched: UnmatchedERA[] = []
  const exceptions: ExceptionERA[] = []

  // Index claims by pmsClaimId for cross-referencing
  const claimsByPmsId = new Map<string, any>()
  for (const claim of rawClaims) {
    if (claim.pmsClaimId) {
      claimsByPmsId.set(claim.pmsClaimId, claim)
    }
  }

  // Process payments: try to match each payment to a claim
  for (const payment of rawPayments) {
    const pmsClaimId = payment.pmsClaimId
    const matchedClaim = pmsClaimId ? claimsByPmsId.get(pmsClaimId) : null

    const paymentId = payment._id ?? payment.pmsPaymentId ?? `pay-${Math.random().toString(36).slice(2, 8)}`
    const checkNumber = payment.pmsPaymentId ?? paymentId
    const payer = payment.paymentMethod ?? "Insurance"
    const checkDate = payment.date ?? new Date(payment.createdAt).toISOString().split("T")[0]
    const patientId = payment.pmsPatientId ?? "unknown"

    if (matchedClaim) {
      const charged = matchedClaim.totalAmount ?? 0
      const paid = payment.amount ?? 0
      const adjustment = charged - paid

      // Check for discrepancies
      if (Math.abs(adjustment) > charged * 0.5 && paid < charged * 0.6 && charged > 0) {
        // Partial payment exception
        exceptions.push({
          id: paymentId,
          checkNumber: String(checkNumber),
          payer,
          patient: patientId,
          matchedClaim: matchedClaim.pmsClaimId ?? matchedClaim._id ?? "",
          issue: "Partial Payment",
          eraAmount: paid,
          claimAmount: charged,
          difference: paid - charged,
        })
      } else if (adjustment < 0 && Math.abs(adjustment) > 1) {
        // Overpayment or mismatch
        exceptions.push({
          id: paymentId,
          checkNumber: String(checkNumber),
          payer,
          patient: patientId,
          matchedClaim: matchedClaim.pmsClaimId ?? matchedClaim._id ?? "",
          issue: "Amount Mismatch",
          eraAmount: paid,
          claimAmount: charged,
          difference: paid - charged,
        })
      } else {
        // Normal match
        matched.push({
          id: paymentId,
          checkNumber: String(checkNumber),
          payer,
          checkDate,
          patient: patientId,
          claimNumber: matchedClaim.pmsClaimId ?? matchedClaim._id ?? "",
          charged,
          paid,
          adjustment: Math.max(0, adjustment),
          remarkCodes: adjustment > 0 ? ["CO-45"] : [],
          matchDate: checkDate,
        })
      }
    } else {
      // Unmatched
      unmatched.push({
        id: paymentId,
        checkNumber: String(checkNumber),
        payer,
        checkDate,
        patientName: patientId,
        amountPaid: payment.amount ?? 0,
        remarkCodes: [],
      })
    }
  }

  // Overdue alerts: claims submitted but not paid, older than 30 days
  const now = Date.now()
  const overdue: OverdueAlert[] = rawClaims
    .filter((c: any) => {
      const status = c.status ?? ""
      return status !== "paid" && c.submittedDate
    })
    .slice(0, 10)
    .map((c: any, i: number) => {
      const submittedTs = new Date(c.submittedDate).getTime()
      const daysSinceSubmit = Math.floor((now - submittedTs) / (1000 * 60 * 60 * 24))
      return {
        id: c._id ?? `overdue-${i}`,
        patient: c.pmsPatientId ?? "Unknown",
        balance: c.totalAmount - (c.paidAmount ?? 0),
        nextAppointment: "",
        daysUntil: Math.max(0, 30 - daysSinceSubmit),
      }
    })
    .filter((a: OverdueAlert) => a.balance > 0)

  return { matched, unmatched, exceptions, overdue }
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

  // Fetch payments and claims from Convex
  const rawPayments = useQuery((api as any).pmsPayments.queries.list, {})
  const rawClaims = useQuery((api as any).pmsClaims.queries.list, {})

  // Loading state
  if (rawPayments === undefined || rawClaims === undefined) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ERA Reconciliation</h1>
          <p className="text-muted-foreground">
            Match electronic remittance advices (ERAs) to claims, resolve exceptions, and track outstanding balances.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  // Empty state — no payments AND no claims
  if (rawPayments.length === 0 && rawClaims.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ERA Reconciliation</h1>
          <p className="text-muted-foreground">
            Match electronic remittance advices (ERAs) to claims, resolve exceptions, and track outstanding balances.
          </p>
        </div>
        <DataEmptyState resource="payments or claims" />
      </div>
    )
  }

  // Build reconciliation data from raw queries
  const { matched, unmatched, exceptions, overdue } = buildReconciliationData(
    rawPayments as any[],
    rawClaims as any[]
  )

  // Compute stats
  const totalERAs = matched.length + unmatched.length + exceptions.length
  const autoMatchRate = totalERAs > 0 ? Math.round((matched.length / totalERAs) * 100) : 0
  const matchedAmount = matched.reduce((sum, e) => sum + e.paid, 0)

  // Filter by search
  const filteredMatched = searchQuery
    ? matched.filter(
        (e) =>
          e.checkNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.payer.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.patient.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.claimNumber.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : matched

  const filteredUnmatched = searchQuery
    ? unmatched.filter(
        (e) =>
          e.checkNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.payer.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.patientName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : unmatched

  const filteredExceptions = searchQuery
    ? exceptions.filter(
        (e) =>
          e.checkNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.payer.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.patient.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.matchedClaim.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : exceptions

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

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total ERAs</CardTitle>
            <FileCheck className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalERAs}</div>
            <p className="text-xs text-muted-foreground">From synced payments</p>
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
      {overdue.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarClock className="size-5 text-amber-600 dark:text-amber-400" />
              <div>
                <CardTitle>Overdue Balance Alerts</CardTitle>
                <CardDescription>
                  Claims with outstanding balances requiring follow-up
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
                    <TableHead>Days Until Follow-up</TableHead>
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
      )}

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
