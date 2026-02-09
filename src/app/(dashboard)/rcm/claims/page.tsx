"use client"

import { Fragment, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/../convex/_generated/api"
import { DataEmptyState } from "@/components/ui/data-empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  ClaimsPipeline,
  type ClaimStatus,
} from "@/components/rcm/claims-pipeline"
import {
  ClaimDetail,
} from "@/components/rcm/claim-detail"
import { cn } from "@/lib/utils"
import {
  FileText,
  CheckCircle,
  DollarSign,
  Clock,
  ChevronDown,
  ChevronRight,
  Eye,
  RotateCw,
  Send,
  Search,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

function buildStatusHistory(claim: any): { status: string; timestamp: string; label: string }[] {
  const history: { status: string; timestamp: string; label: string }[] = []
  const fmt = (ts: number) =>
    new Date(ts).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })

  if (claim.createdAt) history.push({ status: "draft", timestamp: fmt(claim.createdAt), label: "Created" })
  if (claim.scrubPassedAt) history.push({ status: "ready", timestamp: fmt(claim.scrubPassedAt), label: "Scrub Passed" })
  if (claim.submittedAt) history.push({ status: "submitted", timestamp: fmt(claim.submittedAt), label: "Submitted" })
  if (claim.acceptedAt) history.push({ status: "accepted", timestamp: fmt(claim.acceptedAt), label: "Accepted" })
  if (claim.paidAt) history.push({ status: "paid", timestamp: fmt(claim.paidAt), label: "Paid" })
  if (claim.status === "denied") history.push({ status: "denied", timestamp: claim.updatedAt ? fmt(claim.updatedAt) : "\u2014", label: "Denied" })
  if (claim.status === "appealed") history.push({ status: "appealed", timestamp: claim.updatedAt ? fmt(claim.updatedAt) : "\u2014", label: "Appeal Submitted" })
  if (claim.status === "scrub_failed") history.push({ status: "scrub_failed", timestamp: claim.updatedAt ? fmt(claim.updatedAt) : "\u2014", label: `Scrub Failed (${(claim.scrubErrors?.length ?? 0)} issues)` })

  return history
}

const STATUS_BADGE_STYLES: Record<
  ClaimStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; className: string }
> = {
  draft: { variant: "secondary", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  scrubbing: { variant: "secondary", className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  scrub_failed: { variant: "destructive", className: "" },
  ready: { variant: "secondary", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
  submitted: { variant: "secondary", className: "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300" },
  accepted: { variant: "secondary", className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  paid: { variant: "secondary", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" },
  denied: { variant: "destructive", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  appealed: { variant: "secondary", className: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
}

const STATUS_LABELS: Record<ClaimStatus, string> = {
  draft: "Draft",
  scrubbing: "Scrubbing",
  scrub_failed: "Scrub Failed",
  ready: "Ready",
  submitted: "Submitted",
  accepted: "Accepted",
  paid: "Paid",
  denied: "Denied",
  appealed: "Appealed",
}

const AGE_BUCKETS = ["0-30", "31-60", "61-90", "91-120", "120+"]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ClaimsPage() {
  const router = useRouter()
  const [activeStatus, setActiveStatus] = useState<ClaimStatus | null>(null)
  const [payerFilter, setPayerFilter] = useState<string>("all")
  const [ageBucketFilter, setAgeBucketFilter] = useState<string>("all")
  const [expandedClaim, setExpandedClaim] = useState<string | null>(null)

  // Queries
  const statsResult = useQuery((api as any).claims.queries.getStats, {})
  const claimsResult = useQuery((api as any).claims.queries.list, {
    status: activeStatus ?? undefined,
    ageBucket: ageBucketFilter !== "all" ? (ageBucketFilter as any) : undefined,
  })
  // Unfiltered list for pipeline counts and payer extraction
  const allClaimsResult = useQuery((api as any).claims.queries.list, {})
  // Patient name resolution
  const patientsResult = useQuery(api.patients.queries.list, { limit: 500 })

  // Mutations
  const scrubClaim = useMutation((api as any).claims.mutations.scrub)
  const submitClaim = useMutation((api as any).claims.mutations.submit)

  // Build patient name map
  const patientMap = new Map<string, string>()
  if (patientsResult?.patients) {
    for (const p of patientsResult.patients) {
      patientMap.set(p._id, `${p.firstName} ${p.lastName}`)
    }
  }

  // Loading state
  const isLoading = statsResult === undefined || claimsResult === undefined || patientsResult === undefined

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Claims Tracker</h1>
          <p className="text-muted-foreground">Claims scrubbing, submission tracking, and revenue cycle pipeline.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="h-16 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-0">
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Extract data from query results
  const claims = claimsResult.claims ?? []
  const totalClaims = statsResult.totalClaims
  const cleanRate = statsResult.cleanClaimRate
  const avgDaysToSubmit = statsResult.avgAgeInDays

  // Compute outstanding from all claims
  const allClaims = allClaimsResult?.claims ?? []
  const totalOutstanding = allClaims.reduce((sum: number, c: any) => {
    if (["draft", "scrubbing", "scrub_failed", "ready", "submitted", "accepted", "rejected", "appealed"].includes(c.status)) {
      return sum + (c.totalCharged ?? 0) - (c.totalPaid ?? 0) - (c.adjustments ?? 0)
    }
    return sum
  }, 0)

  // Pipeline counts from stats
  const pipelineCounts: Record<ClaimStatus, number> = {
    draft: 0, scrubbing: 0, scrub_failed: 0, ready: 0,
    submitted: 0, accepted: 0, paid: 0, denied: 0, appealed: 0,
  }
  if (statsResult.statusCounts) {
    for (const [status, count] of Object.entries(statsResult.statusCounts)) {
      if (status in pipelineCounts) {
        pipelineCounts[status as ClaimStatus] = count as number
      }
    }
  }

  // Extract unique payers for filter
  const uniquePayers = Array.from(
    new Set(allClaims.map((c: any) => c.payerName as string).filter(Boolean))
  ).sort() as string[]

  // Apply client-side payer name filter (backend indexes by payerId, not payerName)
  const filteredClaims = payerFilter !== "all"
    ? claims.filter((c: any) => c.payerName === payerFilter)
    : claims

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Claims Tracker</h1>
        <p className="text-muted-foreground">
          Claims scrubbing, submission tracking, and revenue cycle pipeline.
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="size-4" />
              Total Claims
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClaims}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="size-4" />
              Clean Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cleanRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="size-4" />
              Avg Days to Submit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgDaysToSubmit}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="size-4" />
              Total Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalOutstanding)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Claims Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ClaimsPipeline
            counts={pipelineCounts}
            activeStatus={activeStatus}
            onStatusClick={setActiveStatus}
          />
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={payerFilter} onValueChange={setPayerFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Payers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payers</SelectItem>
            {uniquePayers.map((p: string) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={ageBucketFilter} onValueChange={setAgeBucketFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Ages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ages</SelectItem>
            {AGE_BUCKETS.map((b) => (
              <SelectItem key={b} value={b}>
                {b} days
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(activeStatus || payerFilter !== "all" || ageBucketFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setActiveStatus(null)
              setPayerFilter("all")
              setAgeBucketFilter("all")
            }}
          >
            Clear Filters
          </Button>
        )}

        <span className="self-center text-sm text-muted-foreground ml-auto">
          {filteredClaims.length} of {totalClaims} claims
        </span>
      </div>

      {/* Claims Table */}
      <Card>
        <CardContent className="p-0">
          {filteredClaims.length === 0 && !activeStatus && payerFilter === "all" && ageBucketFilter === "all" ? (
            <DataEmptyState
              resource="claims"
              message="Claims will appear here once they are created through the scrubbing pipeline or synced from your PMS."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]" />
                  <TableHead>Claim #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Payer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Procedures</TableHead>
                  <TableHead className="text-right">Charged</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Age</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClaims.map((claim: any) => {
                  const isExpanded = expandedClaim === claim._id
                  const badgeStyle = STATUS_BADGE_STYLES[claim.status as ClaimStatus]

                  return (
                    <Fragment key={claim._id}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() =>
                          setExpandedClaim(isExpanded ? null : claim._id)
                        }
                      >
                        <TableCell>
                          {isExpanded ? (
                            <ChevronDown className="size-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="size-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {claim.claimNumber ?? claim._id.slice(-8)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {patientMap.get(claim.patientId) ?? "Unknown Patient"}
                        </TableCell>
                        <TableCell>{claim.payerName}</TableCell>
                        <TableCell>
                          {badgeStyle && (
                            <Badge
                              variant={badgeStyle.variant}
                              className={badgeStyle.className}
                            >
                              {STATUS_LABELS[claim.status as ClaimStatus]}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {claim.procedures?.length ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(claim.totalCharged ?? 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(claim.totalPaid ?? 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={cn(
                              (claim.ageInDays ?? 0) > 60 && "text-red-600 font-semibold",
                              (claim.ageInDays ?? 0) > 30 &&
                                (claim.ageInDays ?? 0) <= 60 &&
                                "text-amber-600 font-medium"
                            )}
                          >
                            {claim.ageInDays ?? 0}d
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {claim.submittedAt
                            ? new Date(claim.submittedAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                              })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div
                            className="flex gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {claim.status === "draft" && (
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => scrubClaim({ claimId: claim._id })}
                              >
                                Scrub
                              </Button>
                            )}
                            {claim.status === "scrub_failed" && (
                              <>
                                <Button size="xs" variant="outline" onClick={(e) => { e.stopPropagation(); setExpandedClaim(expandedClaim === claim._id ? null : claim._id) }}>
                                  <Eye className="size-3" />
                                  Errors
                                </Button>
                                <Button
                                  size="xs"
                                  variant="outline"
                                  onClick={() => scrubClaim({ claimId: claim._id })}
                                >
                                  <RotateCw className="size-3" />
                                  Re-scrub
                                </Button>
                              </>
                            )}
                            {claim.status === "ready" && (
                              <Button
                                size="xs"
                                onClick={() => submitClaim({ claimId: claim._id })}
                              >
                                <Send className="size-3" />
                                Submit
                              </Button>
                            )}
                            {claim.status === "submitted" && (
                              <Button size="xs" variant="outline" onClick={(e) => { e.stopPropagation(); toast.info("Awaiting payer response — status updates automatically via NexHealth sync") }}>
                                <Search className="size-3" />
                                Check
                              </Button>
                            )}
                            {claim.status === "denied" && (
                              <Button size="xs" variant="destructive" onClick={(e) => { e.stopPropagation(); router.push("/rcm/denials") }}>
                                View Denial
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={11} className="p-4">
                            <ClaimDetail
                              claim={{
                                procedures: claim.procedures ?? [],
                                totalCharged: claim.totalCharged ?? 0,
                                totalPaid: claim.totalPaid ?? 0,
                                adjustments: claim.adjustments ?? 0,
                                patientPortion: claim.patientPortion ?? 0,
                                scrubErrors: claim.scrubErrors,
                                statusHistory: buildStatusHistory(claim),
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })}
                {filteredClaims.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={11}
                      className="text-center text-muted-foreground py-8"
                    >
                      No claims match the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
