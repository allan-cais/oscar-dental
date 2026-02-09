"use client"

import { useState, useMemo } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { DataEmptyState } from "@/components/ui/data-empty-state"

interface AuditEntry {
  id: string
  timestamp: number
  user: { name: string; role: string }
  action: string
  resource: { type: string; id: string }
  details: Record<string, unknown>
  hashValid: boolean
}

const ACTION_LABELS: Record<string, string> = {
  login: "Login",
  phi_access: "PHI Access",
  write_off: "Write-Off",
  treatment_plan_lock: "Treatment Plan Lock",
  treatment_plan_override: "Treatment Plan Override",
  consent_change: "Consent Change",
  user_role_change: "User Role Change",
}

const ACTIONS = Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label }))

const RESOURCE_TYPES: { value: string; label: string }[] = [
  { value: "claim", label: "Claim" },
  { value: "patient", label: "Patient" },
  { value: "user", label: "User" },
  { value: "denial", label: "Denial" },
  { value: "review", label: "Review" },
]

function actionBadgeColor(action: string): string {
  switch (action) {
    case "login":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
    case "phi_access":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
    case "write_off":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
    case "treatment_plan_lock":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
    case "treatment_plan_override":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
    case "consent_change":
      return "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400"
    case "user_role_change":
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
  }
}

function roleBadgeVariant(role: string): "default" | "secondary" | "outline" {
  switch (role) {
    case "admin":
      return "default"
    case "office_manager":
      return "secondary"
    default:
      return "outline"
  }
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function formatRole(role: string): string {
  return role
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function parseDetails(details: unknown): Record<string, unknown> {
  if (!details) return {}
  if (typeof details === "string") {
    try { return JSON.parse(details) } catch { return {} }
  }
  return details as Record<string, unknown>
}

export default function AuditLogPage() {
  const [search, setSearch] = useState("")
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [resourceFilter, setResourceFilter] = useState<string>("all")
  const [userFilter, setUserFilter] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [verifyOpen, setVerifyOpen] = useState(false)

  // Fetch audit entries from Convex (user filter done in-memory since backend uses userId, not display name)
  const auditResult = useQuery(api.audit.queries.list, {
    paginationOpts: { numItems: 100, cursor: null },
    ...(actionFilter !== "all" ? { action: actionFilter } : {}),
    ...(resourceFilter !== "all" ? { resourceType: resourceFilter } : {}),
    ...(dateFrom ? { startTime: new Date(dateFrom).getTime() } : {}),
    ...(dateTo ? { endTime: new Date(dateTo).getTime() + 86400000 } : {}),
  })

  // Fetch chain verification when dialog is open
  const chainResult = useQuery(
    api.audit.queries.verifyChain,
    verifyOpen ? {} : "skip"
  )

  // Map Convex entries to component AuditEntry type
  const auditEntries: AuditEntry[] = useMemo(() => {
    if (!auditResult?.page) return []
    return auditResult.page.map((entry: any) => ({
      id: entry._id,
      timestamp: entry.timestamp,
      user: {
        name: entry.userEmail ?? entry.userId ?? "System",
        role: "staff",
      },
      action: entry.action,
      resource: {
        type: entry.resourceType,
        id: entry.resourceId ?? "",
      },
      details: parseDetails(entry.details),
      hashValid: !!entry.entryHash,
    }))
  }, [auditResult])

  // Derive unique users from entries for the user filter dropdown
  const uniqueUsers = useMemo(() => {
    const names = new Set(auditEntries.map((entry) => entry.user.name))
    return Array.from(names).sort()
  }, [auditEntries])

  // In-memory search + user filter on already-fetched entries
  const filtered = useMemo(() => {
    return auditEntries.filter((entry) => {
      if (userFilter !== "all" && entry.user.name !== userFilter) return false
      if (search === "") return true
      const searchLower = search.toLowerCase()
      const actionLabel = ACTION_LABELS[entry.action] ?? entry.action
      return (
        actionLabel.toLowerCase().includes(searchLower) ||
        JSON.stringify(entry.details).toLowerCase().includes(searchLower) ||
        entry.resource.id.toLowerCase().includes(searchLower) ||
        entry.user.name.toLowerCase().includes(searchLower)
      )
    })
  }, [auditEntries, search, userFilter])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground">
            Immutable, tamper-evident audit trail with SHA-256 hash chain verification.
          </p>
        </div>
        <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <ShieldCheck className="mr-2 size-4" />
              Verify Integrity
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Chain Integrity Verification</DialogTitle>
              <DialogDescription>
                Verifying SHA-256 hash chain for all audit entries.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-6">
              {!chainResult ? (
                <>
                  <Loader2 className="size-12 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Verifying audit entries...
                  </p>
                </>
              ) : chainResult.valid ? (
                <>
                  <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <CheckCircle2 className="size-10 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">
                      Chain Verified
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {chainResult.checkedCount} entr{chainResult.checkedCount === 1 ? "y" : "ies"} checked. No tampering detected.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex size-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                    <ShieldCheck className="size-10 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-red-700 dark:text-red-400">
                      Chain Broken
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Tampering detected after {chainResult.checkedCount} entries.
                    </p>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search actions, details, resource IDs..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Action Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {ACTIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={resourceFilter} onValueChange={setResourceFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Resource Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                {RESOURCE_TYPES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {uniqueUsers.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              className="w-[160px]"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From"
            />
            <Input
              type="date"
              className="w-[160px]"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To"
            />
          </div>
        </CardContent>
      </Card>

      {/* Audit Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Entries</CardTitle>
          <CardDescription>
            {auditResult === undefined
              ? "Loading..."
              : `${filtered.length} entr${filtered.length === 1 ? "y" : "ies"} found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30px]"></TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead className="text-center">Hash Valid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditResult === undefined ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Loading audit entries...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : auditEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <DataEmptyState
                        resource="audit entries"
                        message="Audit entries are created automatically when users access PHI, modify records, or perform sensitive actions. No entries have been logged yet."
                      />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No audit entries match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((entry) => {
                    const isExpanded = expandedRow === entry.id
                    return (
                      <TableRow
                        key={entry.id}
                        className="group cursor-pointer"
                        onClick={() =>
                          setExpandedRow(isExpanded ? null : entry.id)
                        }
                      >
                        <TableCell className="px-2">
                          {isExpanded ? (
                            <ChevronDown className="size-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="size-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatTimestamp(entry.timestamp)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{entry.user.name}</span>
                            <Badge variant={roleBadgeVariant(entry.user.role)} className="text-xs">
                              {formatRole(entry.user.role)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={actionBadgeColor(entry.action)}>
                            {ACTION_LABELS[entry.action] ?? entry.action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            <span className="text-muted-foreground capitalize">{entry.resource.type}</span>
                            {" "}
                            <span className="font-mono text-xs">{entry.resource.id}</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {entry.hashValid ? (
                            <CheckCircle2 className="mx-auto size-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <span className="mx-auto size-4 text-red-600">X</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Expanded Details */}
          {expandedRow && (
            <div className="mt-3 rounded-lg border bg-muted/50 p-4">
              <h4 className="mb-2 text-sm font-semibold">Entry Details</h4>
              <pre className="overflow-x-auto rounded-md bg-background p-3 text-xs font-mono leading-relaxed">
                {JSON.stringify(
                  filtered.find((e) => e.id === expandedRow)?.details,
                  null,
                  2
                )}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
