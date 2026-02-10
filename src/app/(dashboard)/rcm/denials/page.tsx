"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import type { Id } from "../../../../../convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
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
// Page
// ---------------------------------------------------------------------------

export default function DenialsPage() {
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [payerFilter, setPayerFilter] = useState<string>("all")

  // Convex queries
  const denialsResult = useQuery(api.denials.queries.list, {})
  const denials = denialsResult?.denials ?? []
  const statsResult = useQuery((api as any).denials.queries.getStats)
  const patientsResult = useQuery(api.patients.queries.list, { limit: 1000, status: "all" as const })

  // Build patient name lookup map (keyed by both _id and pmsPatientId)
  const patientMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of (patientsResult?.patients ?? [])) {
      const name = `${(p as any).firstName ?? ""} ${(p as any).lastName ?? ""}`.trim()
      if (name) {
        map.set((p as any)._id, name)
        if ((p as any).pmsPatientId) {
          map.set((p as any).pmsPatientId, name)
        }
      }
    }
    return map
  }, [patientsResult])

  // Map Convex denial records to DenialData shape for existing components
  const mappedDenials: DenialData[] = useMemo(() => {
    return denials.map((d: any) => ({
      id: d._id,
      denialDate: d.denialDate ?? "",
      patientName: patientMap.get(d.patientId) ?? "Unknown",
      payerId: d.payerId ?? "",
      payerName: d.payerName ?? "",
      reasonCode: d.reasonCode ?? "",
      reasonDescription: d.reasonDescription ?? "",
      category: d.category ?? "other",
      amount: d.amount ?? 0,
      status: d.status,
      aiConfidence: d.aiConfidence ?? 0,
      assignedTo: d.assignedTo ? "Assigned" : undefined,
      slaDeadline: d.slaDeadline,
      isEscalated: d.isEscalated,
      claimNumber: d.claimId ? `CLM-${String(d.claimId).slice(-6)}` : undefined,
      claimProcedures: [],
      claimTotalCharged: d.amount ?? 0,
      createdAt: d.createdAt ?? 0,
    }))
  }, [denials, patientMap])

  // Compute stats from backend query
  const stats = useMemo(() => {
    const totalDenials = statsResult?.totalDenials ?? 0
    const unacknowledged = statsResult?.statusCounts?.new ?? 0
    const appealed = (statsResult?.statusCounts?.appealing ?? 0) +
      (statsResult?.statusCounts?.appealed ?? 0) +
      (statsResult?.statusCounts?.won ?? 0) +
      (statsResult?.statusCounts?.lost ?? 0) +
      (statsResult?.statusCounts?.partial ?? 0)
    const appealRate = totalDenials > 0 ? Math.round((appealed / totalDenials) * 100) : 0
    const appealSuccess = statsResult?.appealSuccessRate ?? 0

    // Compute avg resolution days from resolved denials in the current data
    const resolved = mappedDenials.filter((d) =>
      ["won", "lost", "partial", "written_off"].includes(d.status)
    )
    const now = Date.now()
    const avgDays = resolved.length > 0
      ? Math.round(
          resolved.reduce((sum, d) => sum + (now - d.createdAt) / (24 * 60 * 60 * 1000), 0) / resolved.length
        )
      : 0

    return { total: totalDenials, unacknowledged, appealRate, appealSuccess, avgDays }
  }, [statsResult, mappedDenials])

  // Unique payers from fetched denials
  const payers = useMemo(() => {
    return [...new Set(mappedDenials.map((d) => d.payerName))].sort()
  }, [mappedDenials])

  // Client-side filtering
  const filtered = useMemo(() => {
    return mappedDenials.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false
      if (categoryFilter !== "all" && d.category !== categoryFilter) return false
      if (payerFilter !== "all" && d.payerName !== payerFilter) return false
      return true
    })
  }, [mappedDenials, statusFilter, categoryFilter, payerFilter])

  // Mutations
  const acknowledgeMutation = useMutation((api as any).denials.mutations.acknowledge)
  const escalateMutation = useMutation((api as any).denials.mutations.escalate)

  async function handleAcknowledge(denialId: string) {
    try {
      await acknowledgeMutation({ denialId: denialId as Id<"denials"> })
      toast.success("Denial acknowledged")
    } catch (err: any) {
      toast.error(err.message ?? "Failed to acknowledge denial")
    }
  }

  async function handleEscalate(denialId: string) {
    try {
      await escalateMutation({ denialId: denialId as Id<"denials"> })
      toast.success("Denial escalated to office manager")
    } catch (err: any) {
      toast.error(err.message ?? "Failed to escalate denial")
    }
  }

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
          {filtered.length} of {mappedDenials.length} denials
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
                  onAcknowledge={handleAcknowledge}
                  onEscalate={handleEscalate}
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
  onAcknowledge,
  onEscalate,
}: {
  denial: DenialData
  isExpanded: boolean
  sla: { text: string; color: string; isPulsing: boolean }
  onToggle: () => void
  onAcknowledge: (id: string) => void
  onEscalate: (id: string) => void
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
          <DenialActions denial={denial} onAcknowledge={onAcknowledge} onEscalate={onEscalate} />
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

function DenialActions({
  denial,
  onAcknowledge,
  onEscalate,
}: {
  denial: DenialData
  onAcknowledge: (id: string) => void
  onEscalate: (id: string) => void
}) {
  switch (denial.status) {
    case "new":
      return (
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="xs" onClick={() => onAcknowledge(denial.id)}>
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
          <Button variant="destructive" size="xs" onClick={() => onEscalate(denial.id)}>
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
