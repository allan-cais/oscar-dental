"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import type { Id } from "../../../../../convex/_generated/dataModel"
import { format, addDays, addWeeks } from "date-fns"

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
type InstallmentStatus = "paid" | "pending" | "overdue" | "failed"
type Cadence = "weekly" | "biweekly" | "monthly"

interface Installment {
  date: string
  amount: number
  status: InstallmentStatus
  paidDate?: string
}

interface PaymentPlan {
  _id: string
  patientName: string
  patientId: string
  totalAmount: number
  remaining: number
  installmentsPaid: number
  installmentsTotal: number
  cadence: Cadence
  nextPaymentDate: string
  status: PlanStatus
  cardOnFile?: { last4: string; brand: string }
  installments: Installment[]
  createdAt: string
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

// ─── Mock Patients ──────────────────────────────────────────────────────────

const MOCK_PATIENTS = [
  { id: "pat_1", name: "Maria Garcia" },
  { id: "pat_2", name: "James Wilson" },
  { id: "pat_3", name: "Robert Chen" },
  { id: "pat_4", name: "Emily Thompson" },
  { id: "pat_5", name: "David Martinez" },
  { id: "pat_6", name: "Sarah Kim" },
  { id: "pat_7", name: "Michael Brown" },
  { id: "pat_8", name: "Jennifer Lee" },
  { id: "pat_9", name: "Christopher Davis" },
  { id: "pat_10", name: "Amanda Patel" },
]

// ─── Mock Plans ─────────────────────────────────────────────────────────────

const MOCK_PLANS: PaymentPlan[] = [
  {
    _id: "plan_1",
    patientName: "Maria Garcia",
    patientId: "pat_1",
    totalAmount: 3600,
    remaining: 2400,
    installmentsPaid: 4,
    installmentsTotal: 12,
    cadence: "monthly",
    nextPaymentDate: "2026-03-01",
    status: "active",
    cardOnFile: { last4: "4242", brand: "Visa" },
    createdAt: "2025-11-01",
    installments: [
      { date: "2025-11-01", amount: 300, status: "paid", paidDate: "2025-11-01" },
      { date: "2025-12-01", amount: 300, status: "paid", paidDate: "2025-12-01" },
      { date: "2026-01-01", amount: 300, status: "paid", paidDate: "2026-01-02" },
      { date: "2026-02-01", amount: 300, status: "paid", paidDate: "2026-02-01" },
      { date: "2026-03-01", amount: 300, status: "pending" },
      { date: "2026-04-01", amount: 300, status: "pending" },
      { date: "2026-05-01", amount: 300, status: "pending" },
      { date: "2026-06-01", amount: 300, status: "pending" },
      { date: "2026-07-01", amount: 300, status: "pending" },
      { date: "2026-08-01", amount: 300, status: "pending" },
      { date: "2026-09-01", amount: 300, status: "pending" },
      { date: "2026-10-01", amount: 300, status: "pending" },
    ],
  },
  {
    _id: "plan_2",
    patientName: "James Wilson",
    patientId: "pat_2",
    totalAmount: 1500,
    remaining: 750,
    installmentsPaid: 3,
    installmentsTotal: 6,
    cadence: "monthly",
    nextPaymentDate: "2026-03-15",
    status: "active",
    cardOnFile: { last4: "8910", brand: "Mastercard" },
    createdAt: "2025-09-15",
    installments: [
      { date: "2025-09-15", amount: 250, status: "paid", paidDate: "2025-09-15" },
      { date: "2025-10-15", amount: 250, status: "paid", paidDate: "2025-10-15" },
      { date: "2025-11-15", amount: 250, status: "paid", paidDate: "2025-11-16" },
      { date: "2025-12-15", amount: 250, status: "pending" },
      { date: "2026-01-15", amount: 250, status: "pending" },
      { date: "2026-02-15", amount: 250, status: "pending" },
    ],
  },
  {
    _id: "plan_3",
    patientName: "Robert Chen",
    patientId: "pat_3",
    totalAmount: 4800,
    remaining: 4000,
    installmentsPaid: 2,
    installmentsTotal: 12,
    cadence: "biweekly",
    nextPaymentDate: "2026-02-14",
    status: "active",
    createdAt: "2026-01-03",
    installments: [
      { date: "2026-01-03", amount: 400, status: "paid", paidDate: "2026-01-03" },
      { date: "2026-01-17", amount: 400, status: "paid", paidDate: "2026-01-17" },
      { date: "2026-01-31", amount: 400, status: "overdue" },
      { date: "2026-02-14", amount: 400, status: "pending" },
      { date: "2026-02-28", amount: 400, status: "pending" },
      { date: "2026-03-14", amount: 400, status: "pending" },
      { date: "2026-03-28", amount: 400, status: "pending" },
      { date: "2026-04-11", amount: 400, status: "pending" },
      { date: "2026-04-25", amount: 400, status: "pending" },
      { date: "2026-05-09", amount: 400, status: "pending" },
      { date: "2026-05-23", amount: 400, status: "pending" },
      { date: "2026-06-06", amount: 400, status: "pending" },
    ],
  },
  {
    _id: "plan_4",
    patientName: "Emily Thompson",
    patientId: "pat_4",
    totalAmount: 900,
    remaining: 600,
    installmentsPaid: 1,
    installmentsTotal: 3,
    cadence: "monthly",
    nextPaymentDate: "2026-02-20",
    status: "active",
    cardOnFile: { last4: "3456", brand: "Amex" },
    createdAt: "2026-01-20",
    installments: [
      { date: "2026-01-20", amount: 300, status: "paid", paidDate: "2026-01-20" },
      { date: "2026-02-20", amount: 300, status: "pending" },
      { date: "2026-03-20", amount: 300, status: "pending" },
    ],
  },
  {
    _id: "plan_5",
    patientName: "David Martinez",
    patientId: "pat_5",
    totalAmount: 2400,
    remaining: 1600,
    installmentsPaid: 2,
    installmentsTotal: 6,
    cadence: "biweekly",
    nextPaymentDate: "2026-02-08",
    status: "active",
    createdAt: "2025-12-14",
    installments: [
      { date: "2025-12-14", amount: 400, status: "paid", paidDate: "2025-12-14" },
      { date: "2025-12-28", amount: 400, status: "paid", paidDate: "2025-12-29" },
      { date: "2026-01-11", amount: 400, status: "overdue" },
      { date: "2026-01-25", amount: 400, status: "pending" },
      { date: "2026-02-08", amount: 400, status: "pending" },
      { date: "2026-02-22", amount: 400, status: "pending" },
    ],
  },
  {
    _id: "plan_6",
    patientName: "Sarah Kim",
    patientId: "pat_6",
    totalAmount: 5000,
    remaining: 2500,
    installmentsPaid: 5,
    installmentsTotal: 10,
    cadence: "weekly",
    nextPaymentDate: "2026-02-10",
    status: "active",
    cardOnFile: { last4: "7890", brand: "Visa" },
    createdAt: "2026-01-06",
    installments: [
      { date: "2026-01-06", amount: 500, status: "paid", paidDate: "2026-01-06" },
      { date: "2026-01-13", amount: 500, status: "paid", paidDate: "2026-01-13" },
      { date: "2026-01-20", amount: 500, status: "paid", paidDate: "2026-01-20" },
      { date: "2026-01-27", amount: 500, status: "paid", paidDate: "2026-01-27" },
      { date: "2026-02-03", amount: 500, status: "paid", paidDate: "2026-02-03" },
      { date: "2026-02-10", amount: 500, status: "pending" },
      { date: "2026-02-17", amount: 500, status: "pending" },
      { date: "2026-02-24", amount: 500, status: "pending" },
      { date: "2026-03-03", amount: 500, status: "pending" },
      { date: "2026-03-10", amount: 500, status: "pending" },
    ],
  },
  {
    _id: "plan_7",
    patientName: "Michael Brown",
    patientId: "pat_7",
    totalAmount: 1800,
    remaining: 0,
    installmentsPaid: 6,
    installmentsTotal: 6,
    cadence: "monthly",
    nextPaymentDate: "",
    status: "completed",
    cardOnFile: { last4: "1234", brand: "Visa" },
    createdAt: "2025-07-01",
    installments: [
      { date: "2025-07-01", amount: 300, status: "paid", paidDate: "2025-07-01" },
      { date: "2025-08-01", amount: 300, status: "paid", paidDate: "2025-08-01" },
      { date: "2025-09-01", amount: 300, status: "paid", paidDate: "2025-09-02" },
      { date: "2025-10-01", amount: 300, status: "paid", paidDate: "2025-10-01" },
      { date: "2025-11-01", amount: 300, status: "paid", paidDate: "2025-11-01" },
      { date: "2025-12-01", amount: 300, status: "paid", paidDate: "2025-12-01" },
    ],
  },
  {
    _id: "plan_8",
    patientName: "Jennifer Lee",
    patientId: "pat_8",
    totalAmount: 2000,
    remaining: 0,
    installmentsPaid: 9,
    installmentsTotal: 9,
    cadence: "monthly",
    nextPaymentDate: "",
    status: "completed",
    createdAt: "2025-04-15",
    installments: [
      { date: "2025-04-15", amount: 222.22, status: "paid", paidDate: "2025-04-15" },
      { date: "2025-05-15", amount: 222.22, status: "paid", paidDate: "2025-05-15" },
      { date: "2025-06-15", amount: 222.22, status: "paid", paidDate: "2025-06-16" },
      { date: "2025-07-15", amount: 222.22, status: "paid", paidDate: "2025-07-15" },
      { date: "2025-08-15", amount: 222.22, status: "paid", paidDate: "2025-08-15" },
      { date: "2025-09-15", amount: 222.22, status: "paid", paidDate: "2025-09-15" },
      { date: "2025-10-15", amount: 222.22, status: "paid", paidDate: "2025-10-15" },
      { date: "2025-11-15", amount: 222.22, status: "paid", paidDate: "2025-11-15" },
      { date: "2025-12-15", amount: 222.24, status: "paid", paidDate: "2025-12-15" },
    ],
  },
  {
    _id: "plan_9",
    patientName: "Christopher Davis",
    patientId: "pat_9",
    totalAmount: 3200,
    remaining: 2400,
    installmentsPaid: 2,
    installmentsTotal: 8,
    cadence: "monthly",
    nextPaymentDate: "",
    status: "defaulted",
    createdAt: "2025-08-01",
    installments: [
      { date: "2025-08-01", amount: 400, status: "paid", paidDate: "2025-08-01" },
      { date: "2025-09-01", amount: 400, status: "paid", paidDate: "2025-09-03" },
      { date: "2025-10-01", amount: 400, status: "failed" },
      { date: "2025-11-01", amount: 400, status: "failed" },
      { date: "2025-12-01", amount: 400, status: "failed" },
      { date: "2026-01-01", amount: 400, status: "pending" },
      { date: "2026-02-01", amount: 400, status: "pending" },
      { date: "2026-03-01", amount: 400, status: "pending" },
    ],
  },
  {
    _id: "plan_10",
    patientName: "Amanda Patel",
    patientId: "pat_10",
    totalAmount: 750,
    remaining: 500,
    installmentsPaid: 1,
    installmentsTotal: 3,
    cadence: "monthly",
    nextPaymentDate: "",
    status: "cancelled",
    createdAt: "2026-01-01",
    installments: [
      { date: "2026-01-01", amount: 250, status: "paid", paidDate: "2026-01-01" },
      { date: "2026-02-01", amount: 250, status: "pending" },
      { date: "2026-03-01", amount: 250, status: "pending" },
    ],
  },
  {
    _id: "plan_11",
    patientName: "Jennifer Lee",
    patientId: "pat_8",
    totalAmount: 1200,
    remaining: 800,
    installmentsPaid: 2,
    installmentsTotal: 6,
    cadence: "biweekly",
    nextPaymentDate: "2026-02-21",
    status: "active",
    cardOnFile: { last4: "5678", brand: "Mastercard" },
    createdAt: "2026-01-10",
    installments: [
      { date: "2026-01-10", amount: 200, status: "paid", paidDate: "2026-01-10" },
      { date: "2026-01-24", amount: 200, status: "paid", paidDate: "2026-01-24" },
      { date: "2026-02-07", amount: 200, status: "overdue" },
      { date: "2026-02-21", amount: 200, status: "pending" },
      { date: "2026-03-07", amount: 200, status: "pending" },
      { date: "2026-03-21", amount: 200, status: "pending" },
    ],
  },
]

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

  // Try Convex query, fall back to mock data
  let plans: PaymentPlan[] | undefined
  let convexError = false
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const result = useQuery(api.payments.queries.listPlans)
    plans = (result as PaymentPlan[] | undefined) ?? undefined
  } catch {
    convexError = true
    plans = MOCK_PLANS
  }

  let createPlan: ((args: any) => Promise<any>) | null = null
  let recordPayment: ((args: any) => Promise<any>) | null = null
  let cancelPlan: ((args: any) => Promise<any>) | null = null
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    createPlan = useMutation(api.payments.mutations.createPlan)
    // eslint-disable-next-line react-hooks/rules-of-hooks
    recordPayment = useMutation(api.payments.mutations.recordPayment)
    // eslint-disable-next-line react-hooks/rules-of-hooks
    cancelPlan = useMutation(api.payments.mutations.cancelPlan)
  } catch {
    // Mutations unavailable when Convex is not connected
  }

  const filtered = useMemo(() => {
    if (!plans) return []
    return plans.filter((plan) => {
      const matchesSearch =
        search === "" ||
        plan.patientName.toLowerCase().includes(search.toLowerCase())
      const matchesStatus =
        statusFilter === "all" || plan.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [plans, search, statusFilter])

  // Stats computed from plans
  const stats = useMemo(() => {
    if (!plans) return { active: 0, outstanding: 0, monthly: 0, defaultRate: 0 }
    const activePlans = plans.filter((p) => p.status === "active")
    const outstanding = activePlans.reduce((sum, p) => sum + p.remaining, 0)
    const monthlyCollections = activePlans.reduce((sum, p) => {
      if (p.cadence === "monthly") return sum + (p.totalAmount / p.installmentsTotal)
      if (p.cadence === "biweekly") return sum + (p.totalAmount / p.installmentsTotal) * 2
      if (p.cadence === "weekly") return sum + (p.totalAmount / p.installmentsTotal) * 4
      return sum
    }, 0)
    const totalPlans = plans.length
    const defaultedCount = plans.filter((p) => p.status === "defaulted").length
    const defaultRate = totalPlans > 0 ? (defaultedCount / totalPlans) * 100 : 0

    return {
      active: activePlans.length,
      outstanding,
      monthly: monthlyCollections,
      defaultRate,
    }
  }, [plans])

  // Installment preview for create dialog
  const installmentPreview = useMemo(() => {
    const amount = parseFloat(createForm.totalAmount)
    const count = parseInt(createForm.installments)
    if (!amount || amount <= 0 || !count || !createForm.startDate) return []
    return generateInstallments(amount, count, createForm.cadence, createForm.startDate)
  }, [createForm.totalAmount, createForm.installments, createForm.cadence, createForm.startDate])

  const selectedPatient = MOCK_PATIENTS.find((p) => p.id === createForm.patientId)
  // Check if selected patient has a card on file (mock: some patients do)
  const patientCards: Record<string, { last4: string; brand: string }> = {
    pat_1: { last4: "4242", brand: "Visa" },
    pat_4: { last4: "3456", brand: "Amex" },
    pat_6: { last4: "7890", brand: "Visa" },
    pat_8: { last4: "5678", brand: "Mastercard" },
  }
  const selectedPatientCard = createForm.patientId
    ? patientCards[createForm.patientId]
    : undefined

  async function handleCreate() {
    if (!createPlan) {
      // Demo mode — just close
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
                    {MOCK_PATIENTS.map((p) => (
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

              {/* Card on File */}
              {selectedPatientCard && (
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <CreditCard className="size-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {selectedPatientCard.brand} ending in {selectedPatientCard.last4}
                    </p>
                    <p className="text-xs text-muted-foreground">Card on file</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={createForm.autoCharge}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, autoCharge: e.target.checked })
                      }
                      className="rounded border-gray-300"
                    />
                    Auto-charge
                  </label>
                </div>
              )}

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
                              {formatDateStr(inst.date)}
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

      {/* Convex Warning */}
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
                {!plans ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Loading payment plans...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      No payment plans found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((plan) => (
                    <>
                      {/* Main Row */}
                      <TableRow
                        key={plan._id}
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
                        <TableCell className="font-medium">{plan.patientName}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(plan.totalAmount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(plan.remaining)}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {plan.installmentsPaid}/{plan.installmentsTotal}
                          </span>
                        </TableCell>
                        <TableCell>{cadenceLabel(plan.cadence)}</TableCell>
                        <TableCell>
                          {plan.nextPaymentDate
                            ? formatDateStr(plan.nextPaymentDate)
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
                                  {formatDateStr(plan.createdAt)}
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
                                      {plan.installments.map((inst, i) => (
                                        <TableRow key={i}>
                                          <TableCell className="py-1.5 text-xs text-muted-foreground">
                                            {i + 1}
                                          </TableCell>
                                          <TableCell className="py-1.5 text-xs">
                                            {formatDateStr(inst.date)}
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
                                            {inst.paidDate
                                              ? formatDateStr(inst.paidDate)
                                              : "--"}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>

                              {/* Payment History Summary */}
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>
                                  Total Paid:{" "}
                                  <span className="font-medium text-foreground">
                                    {formatCurrency(plan.totalAmount - plan.remaining)}
                                  </span>
                                </span>
                                <span>
                                  Remaining:{" "}
                                  <span className="font-medium text-foreground">
                                    {formatCurrency(plan.remaining)}
                                  </span>
                                </span>
                                <span>
                                  Progress:{" "}
                                  <span className="font-medium text-foreground">
                                    {plan.installmentsTotal > 0
                                      ? Math.round(
                                          (plan.installmentsPaid / plan.installmentsTotal) * 100
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
                    </>
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
