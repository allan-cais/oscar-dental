"use client"

import { useState, useMemo, Fragment } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import type { Id } from "../../../../../convex/_generated/dataModel"

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  Search,
  Settings2,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Pause,
  Play,
  DollarSign,
  Clock,
  AlertTriangle,
  Building2,
  FileText,
  MessageSquare,
  Mail,
  Phone,
  Send,
  Users,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type CollectionStep = "statement" | "sms" | "email" | "phone" | "final_notice" | "agency"
type SequenceStatus = "active" | "paused" | "completed" | "sent_to_agency"

interface StepHistoryEntry {
  step: CollectionStep
  date: string
  action: string
  result: string
}

interface CollectionSequence {
  convexId: Id<"collectionSequences">
  patientName: string
  patientPhone: string
  patientEmail: string
  balance: number
  currentStep: CollectionStep
  dayInStep: number
  daysActive: number
  contactAttempts: number
  lastAction: string
  nextActionDate: string
  status: SequenceStatus
  stepHistory: StepHistoryEntry[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_ORDER: CollectionStep[] = ["statement", "sms", "email", "phone", "final_notice", "agency"]

const STEP_CONFIG: Record<CollectionStep, { label: string; day: number; color: string; bgColor: string; icon: React.ElementType }> = {
  statement:    { label: "Statement",    day: 0,  color: "text-emerald-700 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900/40", icon: FileText },
  sms:          { label: "SMS",          day: 7,  color: "text-blue-700 dark:text-blue-400",       bgColor: "bg-blue-100 dark:bg-blue-900/40",       icon: MessageSquare },
  email:        { label: "Email",        day: 14, color: "text-indigo-700 dark:text-indigo-400",   bgColor: "bg-indigo-100 dark:bg-indigo-900/40",   icon: Mail },
  phone:        { label: "Phone Call",   day: 30, color: "text-amber-700 dark:text-amber-400",     bgColor: "bg-amber-100 dark:bg-amber-900/40",     icon: Phone },
  final_notice: { label: "Final Notice", day: 60, color: "text-orange-700 dark:text-orange-400",   bgColor: "bg-orange-100 dark:bg-orange-900/40",    icon: Send },
  agency:       { label: "Agency",       day: 90, color: "text-red-700 dark:text-red-400",         bgColor: "bg-red-100 dark:bg-red-900/40",          icon: Building2 },
}

// Map backend day numbers → frontend CollectionStep names
const STEP_DAY_TO_NAME: Record<number, CollectionStep> = {
  0: "statement",
  7: "sms",
  14: "email",
  30: "phone",
  60: "final_notice",
  90: "agency",
}

// Map backend day numbers → STEP_CONFIG array indices (for steps[] access)
const STEP_DAYS = [0, 7, 14, 30, 60, 90]

function statusBadge(status: SequenceStatus) {
  switch (status) {
    case "active":
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Active</Badge>
    case "paused":
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Paused</Badge>
    case "completed":
      return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Completed</Badge>
    case "sent_to_agency":
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Sent to Agency</Badge>
  }
}

function stepBadge(step: CollectionStep, dayInStep: number) {
  const cfg = STEP_CONFIG[step]
  return (
    <Badge className={`${cfg.bgColor} ${cfg.color}`}>
      {cfg.label} &middot; Day {cfg.day + dayInStep}
    </Badge>
  )
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

// ─── Mapping Layer ───────────────────────────────────────────────────────────

function mapConvexSequence(doc: any): CollectionSequence {
  const now = Date.now()
  const currentStepDay: number = doc.currentStep ?? 0
  const stepName = STEP_DAY_TO_NAME[currentStepDay] ?? "statement"

  // Compute days active from startedAt
  const daysActive = Math.max(0, Math.round((now - (doc.startedAt ?? doc.createdAt)) / (1000 * 60 * 60 * 24)))

  // Compute day within current step
  const dayInStep = Math.max(0, daysActive - currentStepDay)

  // Count contact attempts (non-pending steps)
  const steps: any[] = doc.steps ?? []
  const contactAttempts = steps.filter((s: any) => s.status === "sent" || s.status === "completed").length

  // Last action: find the most recent step with a sentAt
  const sentSteps = steps.filter((s: any) => s.sentAt).sort((a: any, b: any) => (b.sentAt ?? 0) - (a.sentAt ?? 0))
  const lastAction = sentSteps.length > 0 ? sentSteps[0].action : "Sequence started"

  // Next action date: estimate based on next step day offset
  const currentStepIndex = STEP_DAYS.indexOf(currentStepDay)
  let nextActionDate = "-"
  if (currentStepIndex >= 0 && currentStepIndex < STEP_DAYS.length - 1) {
    const nextStepDay = STEP_DAYS[currentStepIndex + 1]
    const nextDate = new Date((doc.startedAt ?? doc.createdAt) + nextStepDay * 24 * 60 * 60 * 1000)
    nextActionDate = nextDate.toISOString().split("T")[0]
  }

  // Map status: backend "paid" → "completed", backend "completed" at step 90 → "sent_to_agency"
  let mappedStatus: SequenceStatus = doc.status as SequenceStatus
  if (doc.status === "paid") {
    mappedStatus = "completed"
  } else if (doc.status === "completed" && currentStepDay === 90) {
    mappedStatus = "sent_to_agency"
  }

  // Build step history from steps[] array
  const stepHistory: StepHistoryEntry[] = steps
    .filter((s: any) => s.sentAt || s.status === "completed" || s.status === "sent")
    .map((s: any) => ({
      step: STEP_DAY_TO_NAME[s.day] ?? "statement",
      date: s.sentAt ? new Date(s.sentAt).toISOString().split("T")[0] : "-",
      action: s.action ?? "Unknown",
      result: s.response ?? (s.status === "skipped" ? "Skipped" : s.status === "sent" ? "Sent" : "Completed"),
    }))

  // Patient info from joined data
  const patient = doc.patient
  const patientName = patient
    ? `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() || "Unknown Patient"
    : "Unknown Patient"

  return {
    convexId: doc._id as Id<"collectionSequences">,
    patientName,
    patientPhone: patient?.phone ?? "N/A",
    patientEmail: patient?.email ?? "N/A",
    balance: doc.totalBalance ?? 0,
    currentStep: stepName,
    dayInStep,
    daysActive,
    contactAttempts,
    lastAction,
    nextActionDate,
    status: mappedStatus,
    stepHistory,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CollectionsPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [stepFilter, setStepFilter] = useState<string>("all")
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [configOpen, setConfigOpen] = useState(false)
  const [thresholds, setThresholds] = useState({
    minBalance: 100,
    delays: { statement: 0, sms: 7, email: 14, phone: 30, final_notice: 60, agency: 90 },
    autoEscalation: true,
  })

  // Convex queries
  const listResult = useQuery((api as any).collections.queries.list, {})
  const statsResult = useQuery((api as any).collections.queries.getStats, {})

  // Convex mutations
  const pauseMutation = useMutation((api as any).collections.mutations.pause)
  const resumeMutation = useMutation((api as any).collections.mutations.resume)
  const recordPaymentMutation = useMutation((api as any).collections.mutations.recordPayment)

  // Map backend data to frontend shape
  const sequences: CollectionSequence[] | undefined = useMemo(() => {
    if (!listResult) return undefined
    return (listResult.sequences ?? []).map(mapConvexSequence)
  }, [listResult])

  const isLoading = sequences === undefined

  const filtered = useMemo(() => {
    if (!sequences) return []
    return sequences.filter((seq) => {
      const matchesSearch =
        search === "" || seq.patientName.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === "all" || seq.status === statusFilter
      const matchesStep = stepFilter === "all" || seq.currentStep === stepFilter
      return matchesSearch && matchesStatus && matchesStep
    })
  }, [sequences, search, statusFilter, stepFilter])

  // Stats from Convex query
  const stats = useMemo(() => {
    if (!statsResult) {
      return { activeCount: 0, totalOutstanding: 0, avgDays: 0, agencyCount: 0 }
    }
    // Count agency = sequences at step 90 that are completed
    const agencyCount = sequences
      ? sequences.filter((s) => s.status === "sent_to_agency").length
      : 0
    return {
      activeCount: statsResult.totalActiveSequences ?? 0,
      totalOutstanding: statsResult.totalOutstandingBalance ?? 0,
      avgDays: statsResult.avgDaysToResolve ?? 0,
      agencyCount,
    }
  }, [statsResult, sequences])

  // Pipeline step counts from stats query
  const stepCounts = useMemo(() => {
    const counts: Record<CollectionStep, number> = {
      statement: 0, sms: 0, email: 0, phone: 0, final_notice: 0, agency: 0,
    }
    if (!statsResult?.stepCounts) return counts
    const rawCounts = statsResult.stepCounts as Record<string, number>
    for (const [dayStr, count] of Object.entries(rawCounts)) {
      const stepName = STEP_DAY_TO_NAME[Number(dayStr)]
      if (stepName) {
        counts[stepName] = count
      }
    }
    return counts
  }, [statsResult])

  async function handleTogglePause(seq: CollectionSequence) {
    try {
      if (seq.status === "paused") {
        await resumeMutation({ sequenceId: seq.convexId })
        toast.success("Sequence resumed")
      } else {
        await pauseMutation({ sequenceId: seq.convexId })
        toast.success("Sequence paused")
      }
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update sequence")
    }
  }

  async function handleRecordPayment(seq: CollectionSequence) {
    const input = window.prompt(`Record payment for ${seq.patientName}\nCurrent balance: ${formatCurrency(seq.balance)}\n\nEnter payment amount:`)
    if (!input) return
    const amount = parseFloat(input)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Invalid payment amount")
      return
    }
    try {
      const result = await recordPaymentMutation({ sequenceId: seq.convexId, amount })
      if ((result as any)?.status === "paid") {
        toast.success(`Payment of ${formatCurrency(amount)} recorded — balance paid in full`)
      } else {
        toast.success(`Payment of ${formatCurrency(amount)} recorded — new balance: ${formatCurrency((result as any)?.newBalance ?? 0)}`)
      }
    } catch (err: any) {
      toast.error(err.message ?? "Failed to record payment")
    }
  }

  function handleSaveThresholds() {
    setConfigOpen(false)
    toast.success("Collection thresholds updated")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Collections</h1>
          <p className="text-muted-foreground">
            Automated collections sequences with escalation rules, TCPA-compliant messaging, and aging-based prioritization.
          </p>
        </div>
        <Dialog open={configOpen} onOpenChange={setConfigOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Settings2 className="mr-2 size-4" />
              Configure Thresholds
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Collection Thresholds</DialogTitle>
              <DialogDescription>
                Configure minimum balances, step delays, and escalation behavior for automated collections.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="minBalance">Minimum Balance to Start Collections ($)</Label>
                <Input
                  id="minBalance"
                  type="number"
                  value={thresholds.minBalance}
                  onChange={(e) => setThresholds({ ...thresholds, minBalance: Number(e.target.value) })}
                />
              </div>
              <Separator />
              <div className="space-y-3">
                <Label className="text-sm font-medium">Step Delays (days)</Label>
                {STEP_ORDER.map((step) => (
                  <div key={step} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground w-32">{STEP_CONFIG[step].label}</span>
                    <Input
                      type="number"
                      className="w-24"
                      value={thresholds.delays[step]}
                      onChange={(e) =>
                        setThresholds({
                          ...thresholds,
                          delays: { ...thresholds.delays, [step]: Number(e.target.value) },
                        })
                      }
                    />
                    <span className="text-xs text-muted-foreground">days</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-Escalation</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically advance to next step when delay expires
                  </p>
                </div>
                <Button
                  variant={thresholds.autoEscalation ? "default" : "outline"}
                  size="sm"
                  onClick={() => setThresholds({ ...thresholds, autoEscalation: !thresholds.autoEscalation })}
                >
                  {thresholds.autoEscalation ? "Enabled" : "Disabled"}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfigOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveThresholds}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Sequences</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.activeCount}</div>
            )}
            <p className="text-xs text-muted-foreground">Patients in collection pipeline</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(stats.totalOutstanding)}</div>
            )}
            <p className="text-xs text-muted-foreground">Across all active sequences</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Days to Resolve</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold">{stats.avgDays}</div>
            )}
            <p className="text-xs text-muted-foreground">Average across resolved sequences</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sent to Agency</CardTitle>
            <AlertTriangle className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-8" />
            ) : (
              <div className="text-2xl font-bold">{stats.agencyCount}</div>
            )}
            <p className="text-xs text-muted-foreground">Accounts transferred externally</p>
          </CardContent>
        </Card>
      </div>

      {/* Collection Sequence Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Collection Pipeline</CardTitle>
          <CardDescription>Patient distribution across the 6-step collection workflow</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-0 overflow-x-auto pb-2">
            {STEP_ORDER.map((step, idx) => {
              const cfg = STEP_CONFIG[step]
              const Icon = cfg.icon
              const count = stepCounts[step]
              return (
                <div key={step} className="flex items-center">
                  <div
                    className={`flex flex-col items-center gap-1.5 rounded-lg border px-4 py-3 min-w-[120px] ${cfg.bgColor} border-transparent`}
                  >
                    <Icon className={`size-5 ${cfg.color}`} />
                    <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                    {isLoading ? (
                      <Skeleton className="h-7 w-6" />
                    ) : (
                      <span className={`text-lg font-bold ${cfg.color}`}>{count}</span>
                    )}
                    <span className="text-[10px] text-muted-foreground">Day {cfg.day}</span>
                  </div>
                  {idx < STEP_ORDER.length - 1 && (
                    <div className="flex items-center px-1">
                      <div className="h-px w-6 bg-border" />
                      <ChevronRight className="size-3 text-muted-foreground -ml-1" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Active Sequences Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Sequences</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${filtered.length} sequence${filtered.length !== 1 ? "s" : ""} matching current filters`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by patient name..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="sent_to_agency">Sent to Agency</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stepFilter} onValueChange={setStepFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Step" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Steps</SelectItem>
                {STEP_ORDER.map((step) => (
                  <SelectItem key={step} value={step}>{STEP_CONFIG[step].label}</SelectItem>
                ))}
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
                  <TableHead>Balance</TableHead>
                  <TableHead>Current Step</TableHead>
                  <TableHead>Days Active</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Action</TableHead>
                  <TableHead className="hidden lg:table-cell">Next Action</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="size-4" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="size-6" /></TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                      No collection sequences found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((seq) => (
                    <SequenceRow
                      key={seq.convexId}
                      sequence={seq}
                      isExpanded={expandedRow === seq.convexId}
                      onToggleExpand={() => setExpandedRow(expandedRow === seq.convexId ? null : seq.convexId)}
                      onTogglePause={() => handleTogglePause(seq)}
                      onRecordPayment={() => handleRecordPayment(seq)}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Sequence Row (inline, not a separate file) ──────────────────────────────

function SequenceRow({
  sequence: seq,
  isExpanded,
  onToggleExpand,
  onTogglePause,
  onRecordPayment,
}: {
  sequence: CollectionSequence
  isExpanded: boolean
  onToggleExpand: () => void
  onTogglePause: () => void
  onRecordPayment: () => void
}) {
  return (
    <Fragment>
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={onToggleExpand}>
        <TableCell>
          {isExpanded ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
        </TableCell>
        <TableCell className="font-medium">{seq.patientName}</TableCell>
        <TableCell className="font-mono">{formatCurrency(seq.balance)}</TableCell>
        <TableCell>{stepBadge(seq.currentStep, seq.dayInStep)}</TableCell>
        <TableCell>{seq.daysActive}</TableCell>
        <TableCell>{seq.contactAttempts}</TableCell>
        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
          {seq.lastAction}
        </TableCell>
        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
          {seq.nextActionDate}
        </TableCell>
        <TableCell>{statusBadge(seq.status)}</TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="size-8 p-0" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onTogglePause() }}>
                {seq.status === "paused" ? (
                  <>
                    <Play className="mr-2 size-4" />
                    Resume Sequence
                  </>
                ) : (
                  <>
                    <Pause className="mr-2 size-4" />
                    Pause Sequence
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRecordPayment() }}>
                <DollarSign className="mr-2 size-4" />
                Record Payment
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleExpand() }}>
                <FileText className="mr-2 size-4" />
                View History
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      {/* Expanded Detail Row */}
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={10} className="bg-muted/30 p-0">
            <div className="px-6 py-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                {/* Contact Info */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Contact Information</h4>
                  <div className="text-sm space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="size-3" />
                      {seq.patientPhone}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="size-3" />
                      {seq.patientEmail}
                    </div>
                  </div>
                </div>
                {/* Summary */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Summary</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>Balance: <span className="font-mono font-medium text-foreground">{formatCurrency(seq.balance)}</span></div>
                    <div>Total Attempts: {seq.contactAttempts}</div>
                    <div>Days Active: {seq.daysActive}</div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Step History Timeline */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Step History</h4>
                {seq.stepHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No steps executed yet.</p>
                ) : (
                  <div className="relative space-y-0">
                    {seq.stepHistory.map((entry, idx) => {
                      const cfg = STEP_CONFIG[entry.step]
                      const Icon = cfg.icon
                      return (
                        <div key={idx} className="flex gap-3 pb-3 last:pb-0">
                          <div className="flex flex-col items-center">
                            <div className={`flex size-7 items-center justify-center rounded-full ${cfg.bgColor}`}>
                              <Icon className={`size-3.5 ${cfg.color}`} />
                            </div>
                            {idx < seq.stepHistory.length - 1 && (
                              <div className="w-px flex-1 bg-border mt-1" />
                            )}
                          </div>
                          <div className="flex-1 pb-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm font-medium">{entry.action}</span>
                              <span className="text-xs text-muted-foreground">{entry.date}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{entry.result}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  )
}
