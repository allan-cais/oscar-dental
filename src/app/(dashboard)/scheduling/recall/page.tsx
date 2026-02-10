"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataEmptyState } from "@/components/ui/data-empty-state"
import {
  Users,
  AlertTriangle,
  DollarSign,
  Search,
  MessageSquare,
  Mail,
  Phone,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Send,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RecallType = "hygiene" | "perio" | "fluoride" | "xray"
type RecallStatus = "due" | "contacted" | "scheduled" | "completed" | "no_response"

interface RecallItem {
  _id: string
  patientName: string
  recallType: RecallType
  dueDate: string
  overdueDays: number
  lastOutreach: string | null
  outreachCount: number
  status: RecallStatus
  phone: string
  outreachHistory?: { date: string; method: string; result: string }[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function recallTypeBadge(type: RecallType): string {
  const styles: Record<RecallType, string> = {
    hygiene: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    perio: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    fluoride: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    xray: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  }
  return styles[type] ?? styles.hygiene
}

function recallStatusBadge(status: RecallStatus): string {
  const styles: Record<RecallStatus, string> = {
    due: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    contacted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    scheduled: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    completed: "bg-emerald-200 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-300",
    no_response: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  }
  return styles[status] ?? styles.due
}

function methodIcon(method: string) {
  if (method === "SMS") return <MessageSquare className="size-3.5" />
  if (method === "Email") return <Mail className="size-3.5" />
  return <Phone className="size-3.5" />
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function RecallManagementPage() {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [bucketFilter, setBucketFilter] = useState<string>("all")
  const [batchOpen, setBatchOpen] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [batchForm, setBatchForm] = useState({
    recallType: "all",
    method: "sms",
  })

  // Load from Convex
  const recallsData = useQuery(api.recall.queries.getDueList as any, {})

  // Mutations (best-effort)
  const sendOutreach = useMutation(api.recall.mutations.recordOutreach as any) as ((args: Record<string, unknown>) => Promise<unknown>) | null

  // getDueList returns { items, totalCount } — extract items array
  const rawItems = recallsData && typeof recallsData === "object" && "items" in (recallsData as any)
    ? (recallsData as any).items
    : recallsData
  const items = (rawItems as RecallItem[]) ?? []

  // Stats
  const totalDue = items.length
  const oneMonthOverdue = items.filter((r) => (r.overdueDays || 0) >= 30 && (r.overdueDays || 0) < 60).length
  const twoMonthOverdue = items.filter((r) => (r.overdueDays || 0) >= 60 && (r.overdueDays || 0) < 90).length
  const threeMonthOverdue = items.filter((r) => (r.overdueDays || 0) >= 90).length
  const revenueAtRisk = items.reduce((sum, r) => {
    if (r.status !== "scheduled" && r.status !== "completed") {
      const values: Record<RecallType, number> = { hygiene: 185, perio: 350, fluoride: 45, xray: 120 }
      return sum + (values[r.recallType] ?? 150)
    }
    return sum
  }, 0)

  // Bar chart data
  const bucketCounts = {
    "<1 month": items.filter((r) => (r.overdueDays || 0) < 30).length,
    "1 month": oneMonthOverdue,
    "2 months": twoMonthOverdue,
    "3+ months": threeMonthOverdue,
  }
  const maxBucketCount = Math.max(...Object.values(bucketCounts), 1)

  // Filtered recalls
  const filteredRecalls = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        search === "" || (item.patientName || "").toLowerCase().includes(search.toLowerCase())
      const matchesType = typeFilter === "all" || item.recallType === typeFilter
      const matchesStatus = statusFilter === "all" || item.status === statusFilter
      const days = item.overdueDays || 0
      const matchesBucket =
        bucketFilter === "all" ||
        (bucketFilter === "<1" && days < 30) ||
        (bucketFilter === "1" && days >= 30 && days < 60) ||
        (bucketFilter === "2" && days >= 60 && days < 90) ||
        (bucketFilter === "3+" && days >= 90)
      return matchesSearch && matchesType && matchesStatus && matchesBucket
    })
  }, [items, search, typeFilter, statusFilter, bucketFilter])

  // Batch outreach preview count
  const batchTargetCount = useMemo(() => {
    return items.filter((r) => {
      const matchesType = batchForm.recallType === "all" || r.recallType === batchForm.recallType
      return matchesType && (r.status === "due" || r.status === "contacted" || r.status === "no_response")
    }).length
  }, [items, batchForm.recallType])

  // Loading state — after all hooks
  if (recallsData === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Recall Management</h1>
            <p className="text-muted-foreground">Track and manage patient recall appointments.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="h-40 bg-muted animate-pulse rounded-lg" />
        <div className="h-80 bg-muted animate-pulse rounded-lg" />
      </div>
    )
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Recall Management</h1>
            <p className="text-muted-foreground">
              Track and manage patient recall appointments to maximize schedule utilization.
            </p>
          </div>
        </div>
        <DataEmptyState resource="recall records" message="No recall records found. Recall data will appear after syncing patient records from your PMS." />
      </div>
    )
  }

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recall Management</h1>
          <p className="text-muted-foreground">
            Track and manage patient recall appointments to maximize schedule utilization.
          </p>
        </div>
        <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
          <DialogTrigger asChild>
            <Button>
              <Send className="mr-2 size-4" />
              Batch Outreach
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Batch Outreach</DialogTitle>
              <DialogDescription>
                Send recall reminders to multiple patients at once.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Recall Type</Label>
                <Select value={batchForm.recallType} onValueChange={(v) => setBatchForm({ ...batchForm, recallType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="hygiene">Hygiene</SelectItem>
                    <SelectItem value="perio">Periodontal</SelectItem>
                    <SelectItem value="fluoride">Fluoride</SelectItem>
                    <SelectItem value="xray">X-Ray</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Outreach Method</Label>
                <Select value={batchForm.method} onValueChange={(v) => setBatchForm({ ...batchForm, method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone (Generate Call List)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-800 dark:text-blue-200">
                      Patients to contact:
                    </span>
                    <span className="text-lg font-bold text-blue-800 dark:text-blue-200">
                      {batchTargetCount}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBatchOpen(false)}>Cancel</Button>
              <Button onClick={() => setBatchOpen(false)} disabled={batchTargetCount === 0}>
                <Send className="mr-1 size-4" />
                Send {batchForm.method === "sms" ? "SMS" : batchForm.method === "email" ? "Email" : "Call List"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="py-3">
          <CardContent className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-blue-100 text-blue-600">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Due</p>
              <p className="text-2xl font-bold">{totalDue}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-yellow-100 text-yellow-600">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">1 Month Overdue</p>
              <p className="text-2xl font-bold">{oneMonthOverdue}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-orange-100 text-orange-600">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">2 Months Overdue</p>
              <p className="text-2xl font-bold">{twoMonthOverdue}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-red-100 text-red-600">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">3+ Months Overdue</p>
              <p className="text-2xl font-bold">{threeMonthOverdue}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-100 text-emerald-600">
              <DollarSign className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Revenue at Risk</p>
              <p className="text-2xl font-bold">${revenueAtRisk.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Distribution Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Overdue Distribution</CardTitle>
          <CardDescription>Patients grouped by how overdue their recall appointment is.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(bucketCounts).map(([label, count]) => {
              const barColor =
                label === "3+ months"
                  ? "bg-red-500"
                  : label === "2 months"
                    ? "bg-orange-500"
                    : label === "1 month"
                      ? "bg-yellow-500"
                      : "bg-blue-500"
              const widthPercent = maxBucketCount > 0 ? (count / maxBucketCount) * 100 : 0
              return (
                <div key={label} className="flex items-center gap-3">
                  <span className="w-24 text-sm text-muted-foreground text-right">{label}</span>
                  <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded-md transition-all duration-500 flex items-center justify-end pr-2`}
                      style={{ width: `${Math.max(widthPercent, count > 0 ? 8 : 0)}%` }}
                    >
                      {count > 0 && (
                        <span className="text-xs font-semibold text-white">{count}</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recall Due List Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recall Due List</CardTitle>
          <CardDescription>
            {filteredRecalls.length} patient{filteredRecalls.length !== 1 && "s"} with recalls due or overdue
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by patient name..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Recall Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="hygiene">Hygiene</SelectItem>
                <SelectItem value="perio">Periodontal</SelectItem>
                <SelectItem value="fluoride">Fluoride</SelectItem>
                <SelectItem value="xray">X-Ray</SelectItem>
              </SelectContent>
            </Select>
            <Select value={bucketFilter} onValueChange={setBucketFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Overdue Bucket" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Overdue</SelectItem>
                <SelectItem value="<1">Under 1 Month</SelectItem>
                <SelectItem value="1">1 Month</SelectItem>
                <SelectItem value="2">2 Months</SelectItem>
                <SelectItem value="3+">3+ Months</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="due">Due</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="no_response">No Response</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30px]"></TableHead>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Recall Type</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Overdue By</TableHead>
                  <TableHead>Last Outreach</TableHead>
                  <TableHead className="text-center">Attempts</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="w-[200px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecalls.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                      No recall patients found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecalls.map((item) => {
                    const isExpanded = expandedRows.has(item._id)
                    const hasHistory = item.outreachHistory && item.outreachHistory.length > 0
                    return (
                      <>
                        <TableRow key={item._id} className={hasHistory ? "cursor-pointer" : ""} onClick={() => hasHistory && toggleRow(item._id)}>
                          <TableCell className="px-2">
                            {hasHistory && (
                              isExpanded
                                ? <ChevronDown className="size-4 text-muted-foreground" />
                                : <ChevronRight className="size-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{item.patientName}</TableCell>
                          <TableCell>
                            <Badge className={recallTypeBadge(item.recallType)}>
                              {item.recallType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{item.dueDate}</TableCell>
                          <TableCell className="text-right">
                            <span className={
                              (item.overdueDays || 0) >= 90 ? "text-red-600 font-semibold" :
                              (item.overdueDays || 0) >= 60 ? "text-orange-600 font-semibold" :
                              (item.overdueDays || 0) >= 30 ? "text-yellow-600 font-semibold" :
                              "text-muted-foreground"
                            }>
                              {item.overdueDays || 0}d
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.lastOutreach ?? "Never"}
                          </TableCell>
                          <TableCell className="text-center">{item.outreachCount || 0}</TableCell>
                          <TableCell>
                            <Badge className={recallStatusBadge(item.status)}>
                              {item.status === "no_response" ? "no response" : item.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{item.phone}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon-xs" title="Send SMS">
                                <MessageSquare className="size-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon-xs" title="Send Email">
                                <Mail className="size-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon-xs" title="Call">
                                <Phone className="size-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon-xs" title="Schedule">
                                <CalendarPlus className="size-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon-xs" title="Mark Complete">
                                <CheckCircle2 className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && item.outreachHistory && item.outreachHistory.length > 0 && (
                          <TableRow key={`${item._id}-history`} className="bg-muted/30">
                            <TableCell colSpan={10} className="py-2 px-8">
                              <div className="space-y-1">
                                <p className="text-xs font-semibold text-muted-foreground mb-2">Outreach History</p>
                                {item.outreachHistory.map((entry, idx) => (
                                  <div key={idx} className="flex items-center gap-3 text-sm">
                                    <span className="text-muted-foreground w-24">{entry.date}</span>
                                    <div className="flex items-center gap-1.5 w-20">
                                      {methodIcon(entry.method)}
                                      <span>{entry.method}</span>
                                    </div>
                                    <span className="text-muted-foreground">{entry.result}</span>
                                  </div>
                                ))}
                              </div>
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
        </CardContent>
      </Card>
    </div>
  )
}
