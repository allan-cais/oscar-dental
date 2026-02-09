"use client"

import { useState, useMemo } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import {
  Users,
  CheckCircle2,
  Zap,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Search,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { DataEmptyState } from "@/components/ui/data-empty-state"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type MatchStatus = "pending" | "matched" | "rejected" | "merged"

interface MatchQueueItem {
  id: string
  _id?: string
  oscarPatient: {
    id: string
    firstName: string
    lastName: string
    dob: string
    phone?: string
    email?: string
    address?: string
    gender?: string
  }
  pmsPatient: {
    id: string
    pmsId: string
    firstName: string
    lastName: string
    dob: string
    phone?: string
    email?: string
    address?: string
    gender?: string
  }
  matchScore: number
  matchFields: string[]
  status: MatchStatus
  createdAt: number
  resolvedAt?: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(iso: string): string {
  try {
    const d = new Date(iso + "T00:00:00")
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

function scoreColor(score: number): string {
  if (score >= 0.9) return "bg-emerald-500"
  if (score >= 0.7) return "bg-amber-500"
  return "bg-red-500"
}

function scoreTextColor(score: number): string {
  if (score >= 0.9) return "text-emerald-700 dark:text-emerald-400"
  if (score >= 0.7) return "text-amber-700 dark:text-amber-400"
  return "text-red-700 dark:text-red-400"
}

function statusBadge(status: MatchStatus) {
  switch (status) {
    case "pending":
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
          Pending
        </Badge>
      )
    case "matched":
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
          Matched
        </Badge>
      )
    case "rejected":
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
          Rejected
        </Badge>
      )
    case "merged":
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
          Merged
        </Badge>
      )
  }
}

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  dob: "DOB",
  phone: "Phone",
  email: "Email",
  address: "Address",
}

// ---------------------------------------------------------------------------
// Comparison Detail
// ---------------------------------------------------------------------------
function ComparisonDetail({ item }: { item: MatchQueueItem }) {
  const fields: {
    label: string
    key: string
    oscar: string | undefined
    pms: string | undefined
  }[] = [
    {
      label: "First Name",
      key: "name",
      oscar: item.oscarPatient.firstName,
      pms: item.pmsPatient.firstName,
    },
    {
      label: "Last Name",
      key: "name",
      oscar: item.oscarPatient.lastName,
      pms: item.pmsPatient.lastName,
    },
    {
      label: "Date of Birth",
      key: "dob",
      oscar: formatDate(item.oscarPatient.dob),
      pms: formatDate(item.pmsPatient.dob),
    },
    {
      label: "Phone",
      key: "phone",
      oscar: item.oscarPatient.phone,
      pms: item.pmsPatient.phone,
    },
    {
      label: "Email",
      key: "email",
      oscar: item.oscarPatient.email,
      pms: item.pmsPatient.email,
    },
    {
      label: "Address",
      key: "address",
      oscar: item.oscarPatient.address,
      pms: item.pmsPatient.address,
    },
    {
      label: "Gender",
      key: "gender",
      oscar: item.oscarPatient.gender,
      pms: item.pmsPatient.gender,
    },
  ]

  return (
    <Card className="mx-4 mb-4 py-4">
      <CardContent className="p-0 px-4">
        <div className="grid grid-cols-[140px_1fr_1fr] gap-y-2 text-sm">
          <div className="font-medium text-muted-foreground pb-2">Field</div>
          <div className="font-medium pb-2">Oscar Patient</div>
          <div className="font-medium pb-2">PMS Patient ({item.pmsPatient.pmsId})</div>
          <Separator className="col-span-3" />
          {fields.map((field, i) => {
            const isDifferent = field.oscar !== field.pms
            return (
              <div key={i} className="contents">
                <div className="py-1.5 text-muted-foreground">{field.label}</div>
                <div
                  className={cn(
                    "py-1.5",
                    isDifferent && "bg-amber-50 dark:bg-amber-950/20 px-2 rounded"
                  )}
                >
                  {field.oscar || "-"}
                </div>
                <div
                  className={cn(
                    "py-1.5",
                    isDifferent && "bg-amber-50 dark:bg-amber-950/20 px-2 rounded"
                  )}
                >
                  {field.pms || "-"}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function PatientMatchQueuePage() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("all")
  const [search, setSearch] = useState("")

  // Load from Convex
  const matchQueueData = useQuery((api as any).patients.queries.listMatchQueue as any, {})

  // Loading state
  if (matchQueueData === undefined) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patient Match Queue</h1>
          <p className="text-sm text-muted-foreground">Review and resolve patient identity matches between Oscar and your PMS.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="h-80 bg-muted animate-pulse rounded-lg" />
      </div>
    )
  }

  const matchesRaw = (matchQueueData as any[]) ?? []
  const matches: MatchQueueItem[] = matchesRaw.map((m: any) => ({
    id: m._id || m.id,
    _id: m._id,
    oscarPatient: m.oscarPatient || { id: "", firstName: "", lastName: "", dob: "" },
    pmsPatient: m.pmsPatient || { id: "", pmsId: "", firstName: "", lastName: "", dob: "" },
    matchScore: m.matchScore || 0,
    matchFields: m.matchFields || [],
    status: m.status || "pending",
    createdAt: m.createdAt || m._creationTime || Date.now(),
    resolvedAt: m.resolvedAt,
  }))

  // Empty state
  if (matches.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patient Match Queue</h1>
          <p className="text-sm text-muted-foreground">Review and resolve patient identity matches between Oscar and your PMS.</p>
        </div>
        <DataEmptyState resource="patient matches" message="No patient matches to review. Matches will appear here after syncing patient data from your PMS." />
      </div>
    )
  }

  // Stats
  const stats = {
    pending: matches.filter((m) => m.status === "pending").length,
    resolvedToday: matches.filter(
      (m) =>
        m.resolvedAt &&
        new Date(m.resolvedAt).toDateString() === new Date().toDateString()
    ).length,
    autoMatchRate:
      matches.length > 0
        ? Math.round(
            (matches.filter((m) => m.matchScore >= 0.9).length / matches.length) *
              100
          )
        : 0,
  }

  // Filter
  const filtered = matches
    .filter((m) => {
      if (activeTab !== "all" && m.status !== activeTab) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          `${m.oscarPatient.firstName} ${m.oscarPatient.lastName}`
            .toLowerCase()
            .includes(q) ||
          `${m.pmsPatient.firstName} ${m.pmsPatient.lastName}`
            .toLowerCase()
            .includes(q) ||
          (m.pmsPatient.pmsId || "").toLowerCase().includes(q)
        )
      }
      return true
    })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Patient Match Queue
        </h1>
        <p className="text-sm text-muted-foreground">
          Review and resolve patient identity matches between Oscar and your PMS.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="py-4">
          <CardContent className="flex items-center gap-4 px-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Users className="size-5 text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Total Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex items-center gap-4 px-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle2 className="size-5 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.resolvedToday}</p>
              <p className="text-xs text-muted-foreground">Resolved Today</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex items-center gap-4 px-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Zap className="size-5 text-blue-700 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.autoMatchRate}%</p>
              <p className="text-xs text-muted-foreground">Auto-Match Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by patient name or PMS ID..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tabs + Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            All ({matches.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({matches.filter((m) => m.status === "pending").length})
          </TabsTrigger>
          <TabsTrigger value="matched">
            Matched ({matches.filter((m) => m.status === "matched").length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({matches.filter((m) => m.status === "rejected").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30px]"></TableHead>
                  <TableHead>Oscar Patient</TableHead>
                  <TableHead>PMS Patient</TableHead>
                  <TableHead>Match Score</TableHead>
                  <TableHead>Matched Fields</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-32 text-center text-muted-foreground"
                    >
                      No matches found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => {
                    const pct = Math.round((item.matchScore || 0) * 100)
                    const expanded = expandedId === item.id

                    return (
                      <>
                        <TableRow
                          key={item.id}
                          className="cursor-pointer"
                          onClick={() => setExpandedId(expanded ? null : item.id)}
                        >
                          <TableCell>
                            {expanded ? (
                              <ChevronDown className="size-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="size-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {item.oscarPatient.firstName} {item.oscarPatient.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                DOB: {formatDate(item.oscarPatient.dob)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {item.pmsPatient.firstName} {item.pmsPatient.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                DOB: {formatDate(item.pmsPatient.dob)} | {item.pmsPatient.pmsId}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={cn("h-full rounded-full transition-all", scoreColor(item.matchScore))}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className={cn("text-xs font-medium tabular-nums", scoreTextColor(item.matchScore))}>
                                {pct}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(item.matchFields || []).map((field) => (
                                <Badge key={field} variant="secondary" className="text-xs">
                                  {FIELD_LABELS[field] || field}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{statusBadge(item.status)}</TableCell>
                          <TableCell className="text-right">
                            {item.status === "pending" && (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="xs"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    // Would call Convex mutation here
                                  }}
                                >
                                  <Check className="size-3" />
                                  Confirm
                                </Button>
                                <Button
                                  size="xs"
                                  variant="destructive"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    // Would call Convex mutation here
                                  }}
                                >
                                  <X className="size-3" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                        {expanded && (
                          <TableRow key={`${item.id}-detail`}>
                            <TableCell colSpan={7} className="p-0 bg-muted/30">
                              <ComparisonDetail item={item} />
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
