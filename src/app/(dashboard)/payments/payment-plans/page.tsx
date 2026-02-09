"use client"

import { useState, useMemo, Fragment } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import { format, addWeeks } from "date-fns"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import {
  MoreHorizontal,
  Plus,
  DollarSign,
  CalendarIcon,
  CreditCard,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Search,
  Receipt,
} from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────────────

type PlanStatus = "active" | "completed" | "defaulted" | "cancelled"
type InstallmentStatus = "paid" | "pending" | "overdue" | "failed" | "skipped"
type Cadence = "weekly" | "biweekly" | "monthly"

interface Installment {
  number?: number
  date?: string
  dueDate?: string
  amount: number
  status: InstallmentStatus
  paidDate?: string
  paidAt?: number
  paymentId?: string
}

interface PaymentPlan {
  _id: string
  patientName?: string
  patientId: string
  totalAmount: number
  remaining?: number
  remainingAmount?: number
  installmentAmount?: number
  installmentsPaid?: number
  installmentsTotal?: number
  cadence: Cadence
  nextPaymentDate?: string
  nextChargeDate?: string
  status: PlanStatus
  cardOnFile?: { last4: string; brand: string }
  installments: Installment[]
  createdAt: number | string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

function formatDateStr(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function cadenceLabel(c: Cadence): string {
  switch (c) {
    case "weekly":
      return "Weekly"
    case "biweekly":
      return "Biweekly"
    case "monthly":
      return "Monthly"
  }
}

function statusBadgeClass(status: PlanStatus): string {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
    case "completed":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
    case "defaulted":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
    case "cancelled":
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
  }
}

function installmentBadgeClass(status: InstallmentStatus): string {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
    case "pending":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
    case "overdue":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
    case "failed":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
    case "skipped":
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
  }
}

function generateInstallments(
  totalAmount: number,
  count: number,
  cadence: Cadence,
  startDate: Date
): Installment[] {
  const perInstallment = Math.round((totalAmount / count) * 100) / 100
  const installments: Installment[] = []

  for (let i = 0; i < count; i++) {
    let date: Date
    if (cadence === "weekly") {
      date = addWeeks(startDate, i)
    } else if (cadence === "biweekly") {
      date = addWeeks(startDate, i * 2)
    } else {
      date = new Date(startDate)
      date.setMonth(date.getMonth() + i)
    }

    // Adjust last installment for rounding
    const amount =
      i === count - 1 ? totalAmount - perInstallment * (count - 1) : perInstallment

    installments.push({
      date: format(date, "yyyy-MM-dd"),
      amount: Math.round(amount * 100) / 100,
      status: "pending",
    })
  }

  return installments
}

// Helper to normalize plan fields from Convex schema
function normalizePlan(raw: any): PaymentPlan {
  const installments = (raw.installments ?? []).map((inst: any) => ({
    ...inst,
    date: inst.date ?? inst.dueDate,
    status: inst.status ?? "pending",
  }))
  const paidInstallments = installments.filter((i: Installment) => i.status === "paid")
  const remaining = raw.remaining ?? raw.remainingAmount ?? 0
  return {
    ...raw,
    remaining,
    installments,
    installmentsPaid: raw.installmentsPaid ?? paidInstallments.length,
    installmentsTotal: raw.installmentsTotal ?? installments.length,
    nextPaymentDate: raw.nextPaymentDate ?? raw.nextChargeDate ?? "",
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function PaymentPlansPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    patientId: "",
    totalAmount: "",
    installments: "6",
    cadence: "monthly" as Cadence,
    startDate: undefined as Date | undefined,
    autoCharge: false,
  })

  // Query payment plans from Convex — returns { plans: [...], totalCount }
  const rawPlansResult = useQuery(api.paymentPlans.queries.list as any, {})
  const rawPlans = rawPlansResult ? (rawPlansResult as any).plans ?? rawPlansResult : undefined

  // Query patients for the create dialog
  const rawPatients = useQuery((api as any).patients.queries.list, {})

  let createPlan: ((args: any) => Promise<any>) | null = null
  let recordPayment: ((args: any) => Promise<any>) | null = null
  let cancelPlan: ((args: any) => Promise<any>) | null = null
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    createPlan = useMutation(api.paymentPlans.mutations.create as any)
    // eslint-disable-next-line react-hooks/rules-of-hooks
    recordPayment = useMutation(api.paymentPlans.mutations.recordPayment as any)
    // eslint-disable-next-line react-hooks/rules-of-hooks
    cancelPlan = useMutation(api.paymentPlans.mutations.cancel as any)
  } catch {
    // Mutations unavailable when Convex is not connected
  }

  // Loading state
  if (rawPlans === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Payment Plans</h1>
            <p className="text-muted-foreground">
              Configurable installment plans with automated recurring charges,
              payment reminders, and delinquency tracking.
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
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

  // Empty state
  if (rawPlans.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Payment Plans</h1>
            <p className="text-muted-foreground">
              Configurable installment plans with automated recurring charges,
              payment reminders, and delinquency tracking.
            </p>
          </div>
        </div>
        <DataEmptyState resource="payment plans" />
      </div>
    )
  }

  // Normalize plans from Convex schema shape
  const plans: PaymentPlan[] = (rawPlans as any[]).map(normalizePlan)
  const patients = Array.isArray(rawPatients)
    ? (rawPatients as any[]).map((p: any) => ({
        id: p._id,
        name: `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || "Unknown",
      }))
    : []

  const filtered = plans.filter((plan) => {
    const patientName = plan.patientName ?? ""
    const matchesSearch =
      search === "" ||
      patientName.toLowerCase().includes(search.toLowerCase())
    const matchesStatus =
      statusFilter === "all" || plan.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Stats computed from plans
  const activePlans = plans.filter((p) => p.status === "active")
  const outstanding = activePlans.reduce((sum, p) => sum + (p.remaining ?? 0), 0)
  const monthlyCollections = activePlans.reduce((sum, p) => {
    const installmentsTotal = p.installmentsTotal ?? p.installments.length
    if (installmentsTotal === 0) return sum
    const perInstallment = p.totalAmount / installmentsTotal
    if (p.cadence === "monthly") return sum + perInstallment
    if (p.cadence === "biweekly") return sum + perInstallment * 2
    if (p.cadence === "weekly") return sum + perInstallment * 4
    return sum
  }, 0)
  const totalPlans = plans.length
  const defaultedCount = plans.filter((p) => p.status === "defaulted").length
  const defaultRate = totalPlans > 0 ? (defaultedCount / totalPlans) * 100 : 0

  const stats = {
    active: activePlans.length,
    outstanding,
    monthly: monthlyCollections,
    defaultRate,
  }

  // Installment preview for create dialog
  const installmentPreview = (() => {
    const amount = parseFloat(createForm.totalAmount)
    const count = parseInt(createForm.installments)
    if (!amount || amount <= 0 || !count || !createForm.startDate) return []
    return generateInstallments(amount, count, createForm.cadence, createForm.startDate)
  })()

  async function handleCreate() {
    if (!createPlan) {
      setCreateOpen(false)
      resetForm()
      return
    }
    try {
      await createPlan({
        patientId: createForm.patientId,
        totalAmount: parseFloat(createForm.totalAmount),
        installments: parseInt(createForm.installments),
        cadence: createForm.cadence,
        startDate: createForm.startDate?.toISOString(),
        autoCharge: createForm.autoCharge,
      })
      setCreateOpen(false)
      resetForm()
    } catch (err) {
      console.error("Failed to create plan:", err)
    }
  }

  async function handleRecordPayment(planId: string) {
    if (!recordPayment) return
    try {
      await recordPayment({ planId })
    } catch (err) {
      console.error("Failed to record payment:", err)
    }
  }

  async function handleCancelPlan(planId: string) {
    if (!cancelPlan) return
    try {
      await cancelPlan({ planId })
    } catch (err) {
      console.error("Failed to cancel plan:", err)
    }
  }

  function resetForm() {
    setCreateForm({
      patientId: "",
      totalAmount: "",
      installments: "6",
      cadence: "monthly",
      startDate: undefined,
      autoCharge: false,
    })
  }

  function toggleExpand(planId: string) {
    setExpandedPlan(expandedPlan === planId ? null : planId)
  }

  const canCreate =
    createForm.patientId &&
    parseFloat(createForm.totalAmount) > 0 &&
    createForm.startDate

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment Plans</h1>
          <p className="text-muted-foreground">
            Configurable installment plans with automated recurring charges,
            payment reminders, and delinquency tracking.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              Create Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Payment Plan</DialogTitle>
              <DialogDescription>
                Set up a new installment plan for a patient. The schedule will be
                auto-generated based on the parameters you select.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Patient Select */}
              <div className="space-y-2">
                <Label htmlFor="patient">Patient</Label>
                <Select
                  value={createForm.patientId}
                  onValueChange={(value) =>
                    setCreateForm({ ...createForm, patientId: value, autoCharge: false })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount + Installments */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalAmount">Total Amount ($)</Label>
                  <Input
                    id="totalAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={createForm.totalAmount}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, totalAmount: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Number of Installments</Label>
                  <Select
                    value={createForm.installments}
                    onValueChange={(value) =>
                      setCreateForm({ ...createForm, installments: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 installments</SelectItem>
                      <SelectItem value="6">6 installments</SelectItem>
                      <SelectItem value="9">9 installments</SelectItem>
                      <SelectItem value="12">12 installments</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Cadence + Start Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cadence</Label>
                  <Select
                    value={createForm.cadence}
                    onValueChange={(value) =>
                      setCreateForm({ ...createForm, cadence: value as Cadence })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Biweekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 size-4" />
                        {createForm.startDate
                          ? format(createForm.startDate, "MMM d, yyyy")
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={createForm.startDate}
                        onSelect={(date) =>
                          setCreateForm({ ...createForm, startDate: date ?? undefined })
                        }
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Installment Preview */}
              {installmentPreview.length > 0 && (
                <div className="space-y-2">
                  <Separator />
                  <Label className="text-sm font-medium">
                    Installment Schedule Preview
                  </Label>
                  <div className="max-h-48 overflow-y-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">#</TableHead>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-right text-xs">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {installmentPreview.map((inst, i) => (
                          <TableRow key={i}>
                            <TableCell className="py-1.5 text-xs text-muted-foreground">
                              {i + 1}
                            </TableCell>
                            <TableCell className="py-1.5 text-xs">
                              {inst.date ? formatDateStr(inst.date) : "--"}
                            </TableCell>
                            <TableCell className="py-1.5 text-right text-xs">
                              {formatCurrency(inst.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm() }}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!canCreate}>
                Create Plan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
            <Receipt className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Currently active installment plans</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.outstanding)}</div>
            <p className="text-xs text-muted-foreground">Remaining balance across active plans</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Collections</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.monthly)}</div>
            <p className="text-xs text-muted-foreground">Estimated monthly revenue from plans</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Default Rate</CardTitle>
            <AlertTriangle className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.defaultRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Plans that have entered default</p>
          </CardContent>
        </Card>
      </div>

      {/* Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Plans</CardTitle>
          <CardDescription>
            {filtered.length} plan{filtered.length !== 1 && "s"} found
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
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="defaulted">Defaulted</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30px]"></TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead>Installments</TableHead>
                  <TableHead>Cadence</TableHead>
                  <TableHead>Next Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      No payment plans found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((plan) => {
                    const remaining = plan.remaining ?? 0
                    const installmentsPaid = plan.installmentsPaid ?? 0
                    const installmentsTotal = plan.installmentsTotal ?? plan.installments.length
                    const nextDate = plan.nextPaymentDate || plan.nextChargeDate || ""
                    const createdStr = typeof plan.createdAt === "number"
                      ? formatTimestamp(plan.createdAt)
                      : formatDateStr(plan.createdAt as string)

                    return (
                      <Fragment key={plan._id}>
                        {/* Main Row */}
                        <TableRow
                          className="cursor-pointer"
                          onClick={() => toggleExpand(plan._id)}
                        >
                          <TableCell className="px-2">
                            {expandedPlan === plan._id ? (
                              <ChevronDown className="size-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="size-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{plan.patientName ?? "Unknown"}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(plan.totalAmount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(remaining)}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {installmentsPaid}/{installmentsTotal}
                            </span>
                          </TableCell>
                          <TableCell>{cadenceLabel(plan.cadence)}</TableCell>
                          <TableCell>
                            {nextDate
                              ? formatDateStr(nextDate)
                              : <span className="text-muted-foreground">--</span>
                            }
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={statusBadgeClass(plan.status)}
                            >
                              {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="size-4" />
                                  <span className="sr-only">Actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleExpand(plan._id)
                                  }}
                                >
                                  View Details
                                </DropdownMenuItem>
                                {plan.status === "active" && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleRecordPayment(plan._id)
                                      }}
                                    >
                                      Record Payment
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleCancelPlan(plan._id)
                                      }}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      Cancel Plan
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>

                        {/* Expanded Row */}
                        {expandedPlan === plan._id && (
                          <TableRow key={`${plan._id}-expanded`}>
                            <TableCell colSpan={9} className="bg-muted/30 p-0">
                              <div className="p-4 space-y-4">
                                {/* Plan Summary */}
                                <div className="flex items-center gap-6 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Created:</span>{" "}
                                    {createdStr}
                                  </div>
                                  {plan.cardOnFile && (
                                    <div className="flex items-center gap-1.5">
                                      <CreditCard className="size-3.5 text-muted-foreground" />
                                      <span className="text-muted-foreground">Card:</span>{" "}
                                      {plan.cardOnFile.brand} ****{plan.cardOnFile.last4}
                                    </div>
                                  )}
                                  {!plan.cardOnFile && (
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <CreditCard className="size-3.5" />
                                      No card on file
                                    </div>
                                  )}
                                </div>

                                {/* Installment Schedule */}
                                <div>
                                  <h4 className="mb-2 text-sm font-medium">
                                    Installment Schedule
                                  </h4>
                                  <div className="rounded-md border bg-background">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead className="text-xs">#</TableHead>
                                          <TableHead className="text-xs">Due Date</TableHead>
                                          <TableHead className="text-right text-xs">Amount</TableHead>
                                          <TableHead className="text-xs">Status</TableHead>
                                          <TableHead className="text-xs">Paid Date</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {plan.installments.map((inst, i) => {
                                          const instDate = inst.date ?? inst.dueDate ?? ""
                                          const paidDateStr = inst.paidDate
                                            ? formatDateStr(inst.paidDate)
                                            : inst.paidAt
                                              ? formatTimestamp(inst.paidAt)
                                              : "--"
                                          return (
                                            <TableRow key={i}>
                                              <TableCell className="py-1.5 text-xs text-muted-foreground">
                                                {inst.number ?? i + 1}
                                              </TableCell>
                                              <TableCell className="py-1.5 text-xs">
                                                {instDate ? formatDateStr(instDate) : "--"}
                                              </TableCell>
                                              <TableCell className="py-1.5 text-right text-xs">
                                                {formatCurrency(inst.amount)}
                                              </TableCell>
                                              <TableCell className="py-1.5">
                                                <Badge
                                                  variant="secondary"
                                                  className={`text-xs ${installmentBadgeClass(inst.status)}`}
                                                >
                                                  {inst.status.charAt(0).toUpperCase() +
                                                    inst.status.slice(1)}
                                                </Badge>
                                              </TableCell>
                                              <TableCell className="py-1.5 text-xs text-muted-foreground">
                                                {paidDateStr}
                                              </TableCell>
                                            </TableRow>
                                          )
                                        })}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>

                                {/* Payment History Summary */}
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span>
                                    Total Paid:{" "}
                                    <span className="font-medium text-foreground">
                                      {formatCurrency(plan.totalAmount - remaining)}
                                    </span>
                                  </span>
                                  <span>
                                    Remaining:{" "}
                                    <span className="font-medium text-foreground">
                                      {formatCurrency(remaining)}
                                    </span>
                                  </span>
                                  <span>
                                    Progress:{" "}
                                    <span className="font-medium text-foreground">
                                      {installmentsTotal > 0
                                        ? Math.round(
                                            (installmentsPaid / installmentsTotal) * 100
                                          )
                                        : 0}
                                      %
                                    </span>
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
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
