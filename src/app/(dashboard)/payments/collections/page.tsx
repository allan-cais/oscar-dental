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
  id: string
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
  relatedClaims: string[]
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

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_SEQUENCES: CollectionSequence[] = [
  // Day 0 - Statement (3)
  {
    id: "seq_1", patientName: "Robert Thompson", patientPhone: "(555) 234-5678", patientEmail: "robert.t@email.com",
    balance: 425.00, currentStep: "statement", dayInStep: 0, daysActive: 0, contactAttempts: 1,
    lastAction: "Statement mailed", nextActionDate: "2026-02-13", status: "active",
    relatedClaims: ["CLM-2024-001"],
    stepHistory: [{ step: "statement", date: "2026-02-06", action: "Statement generated and mailed", result: "Delivered" }],
  },
  {
    id: "seq_2", patientName: "Maria Garcia", patientPhone: "(555) 345-6789", patientEmail: "maria.g@email.com",
    balance: 187.50, currentStep: "statement", dayInStep: 2, daysActive: 2, contactAttempts: 1,
    lastAction: "Statement mailed", nextActionDate: "2026-02-11", status: "active",
    relatedClaims: ["CLM-2024-015"],
    stepHistory: [{ step: "statement", date: "2026-02-04", action: "Statement generated and mailed", result: "Delivered" }],
  },
  {
    id: "seq_3", patientName: "James Wilson", patientPhone: "(555) 456-7890", patientEmail: "james.w@email.com",
    balance: 892.00, currentStep: "statement", dayInStep: 5, daysActive: 5, contactAttempts: 1,
    lastAction: "Statement mailed", nextActionDate: "2026-02-08", status: "active",
    relatedClaims: ["CLM-2024-022", "CLM-2024-023"],
    stepHistory: [{ step: "statement", date: "2026-02-01", action: "Statement generated and mailed", result: "Delivered" }],
  },
  // Day 7 - SMS (4)
  {
    id: "seq_4", patientName: "Patricia Johnson", patientPhone: "(555) 567-8901", patientEmail: "patricia.j@email.com",
    balance: 315.00, currentStep: "sms", dayInStep: 0, daysActive: 7, contactAttempts: 2,
    lastAction: "SMS reminder sent", nextActionDate: "2026-02-13", status: "active",
    relatedClaims: ["CLM-2024-030"],
    stepHistory: [
      { step: "statement", date: "2026-01-30", action: "Statement generated and mailed", result: "Delivered" },
      { step: "sms", date: "2026-02-06", action: "Payment reminder SMS sent", result: "Delivered" },
    ],
  },
  {
    id: "seq_5", patientName: "William Brown", patientPhone: "(555) 678-9012", patientEmail: "william.b@email.com",
    balance: 1250.00, currentStep: "sms", dayInStep: 3, daysActive: 10, contactAttempts: 2,
    lastAction: "SMS reminder sent", nextActionDate: "2026-02-10", status: "active",
    relatedClaims: ["CLM-2024-035", "CLM-2024-036"],
    stepHistory: [
      { step: "statement", date: "2026-01-27", action: "Statement generated and mailed", result: "Delivered" },
      { step: "sms", date: "2026-02-03", action: "Payment reminder SMS sent", result: "Delivered" },
    ],
  },
  {
    id: "seq_6", patientName: "Jennifer Davis", patientPhone: "(555) 789-0123", patientEmail: "jennifer.d@email.com",
    balance: 560.00, currentStep: "sms", dayInStep: 5, daysActive: 12, contactAttempts: 3,
    lastAction: "Follow-up SMS sent", nextActionDate: "2026-02-08", status: "active",
    relatedClaims: ["CLM-2024-040"],
    stepHistory: [
      { step: "statement", date: "2026-01-25", action: "Statement generated and mailed", result: "Delivered" },
      { step: "sms", date: "2026-02-01", action: "Payment reminder SMS sent", result: "Delivered" },
      { step: "sms", date: "2026-02-04", action: "Follow-up SMS sent", result: "Delivered" },
    ],
  },
  {
    id: "seq_7", patientName: "Charles Martinez", patientPhone: "(555) 890-1234", patientEmail: "charles.m@email.com",
    balance: 275.00, currentStep: "sms", dayInStep: 2, daysActive: 9, contactAttempts: 2,
    lastAction: "SMS reminder sent", nextActionDate: "2026-02-11", status: "paused",
    relatedClaims: ["CLM-2024-042"],
    stepHistory: [
      { step: "statement", date: "2026-01-28", action: "Statement generated and mailed", result: "Delivered" },
      { step: "sms", date: "2026-02-04", action: "Payment reminder SMS sent", result: "Delivered" },
    ],
  },
  // Day 14 - Email (3)
  {
    id: "seq_8", patientName: "Linda Anderson", patientPhone: "(555) 901-2345", patientEmail: "linda.a@email.com",
    balance: 743.00, currentStep: "email", dayInStep: 0, daysActive: 14, contactAttempts: 3,
    lastAction: "Collection email sent", nextActionDate: "2026-02-20", status: "active",
    relatedClaims: ["CLM-2024-050"],
    stepHistory: [
      { step: "statement", date: "2026-01-23", action: "Statement generated and mailed", result: "Delivered" },
      { step: "sms", date: "2026-01-30", action: "Payment reminder SMS sent", result: "Delivered" },
      { step: "email", date: "2026-02-06", action: "Collection email sent", result: "Opened" },
    ],
  },
  {
    id: "seq_9", patientName: "Richard Taylor", patientPhone: "(555) 012-3456", patientEmail: "richard.t@email.com",
    balance: 1100.00, currentStep: "email", dayInStep: 5, daysActive: 19, contactAttempts: 4,
    lastAction: "Follow-up email sent", nextActionDate: "2026-02-15", status: "active",
    relatedClaims: ["CLM-2024-055", "CLM-2024-056"],
    stepHistory: [
      { step: "statement", date: "2026-01-18", action: "Statement generated and mailed", result: "Delivered" },
      { step: "sms", date: "2026-01-25", action: "Payment reminder SMS sent", result: "Delivered" },
      { step: "email", date: "2026-02-01", action: "Collection email sent", result: "Opened" },
      { step: "email", date: "2026-02-04", action: "Follow-up email sent", result: "No response" },
    ],
  },
  {
    id: "seq_10", patientName: "Susan Thomas", patientPhone: "(555) 123-4567", patientEmail: "susan.t@email.com",
    balance: 389.00, currentStep: "email", dayInStep: 10, daysActive: 24, contactAttempts: 4,
    lastAction: "Second email sent", nextActionDate: "2026-02-10", status: "active",
    relatedClaims: ["CLM-2024-060"],
    stepHistory: [
      { step: "statement", date: "2026-01-13", action: "Statement generated and mailed", result: "Delivered" },
      { step: "sms", date: "2026-01-20", action: "Payment reminder SMS sent", result: "Failed - invalid number" },
      { step: "email", date: "2026-01-27", action: "Collection email sent", result: "Opened" },
      { step: "email", date: "2026-02-02", action: "Second collection email sent", result: "No response" },
    ],
  },
  // Day 30 - Phone Call (2)
  {
    id: "seq_11", patientName: "David Jackson", patientPhone: "(555) 234-5679", patientEmail: "david.j@email.com",
    balance: 2150.00, currentStep: "phone", dayInStep: 5, daysActive: 35, contactAttempts: 6,
    lastAction: "Left voicemail", nextActionDate: "2026-02-12", status: "active",
    relatedClaims: ["CLM-2024-065", "CLM-2024-066", "CLM-2024-067"],
    stepHistory: [
      { step: "statement", date: "2026-01-02", action: "Statement generated and mailed", result: "Delivered" },
      { step: "sms", date: "2026-01-09", action: "Payment reminder SMS sent", result: "Delivered" },
      { step: "email", date: "2026-01-16", action: "Collection email sent", result: "Bounced" },
      { step: "email", date: "2026-01-20", action: "Updated email and resent", result: "Opened" },
      { step: "phone", date: "2026-02-01", action: "Phone call - no answer", result: "Left voicemail" },
      { step: "phone", date: "2026-02-05", action: "Phone call - no answer", result: "Left voicemail" },
    ],
  },
  {
    id: "seq_12", patientName: "Karen White", patientPhone: "(555) 345-6780", patientEmail: "karen.w@email.com",
    balance: 975.00, currentStep: "phone", dayInStep: 12, daysActive: 42, contactAttempts: 7,
    lastAction: "Spoke with patient - promised payment", nextActionDate: "2026-02-15", status: "active",
    relatedClaims: ["CLM-2024-070"],
    stepHistory: [
      { step: "statement", date: "2025-12-26", action: "Statement generated and mailed", result: "Delivered" },
      { step: "sms", date: "2026-01-02", action: "Payment reminder SMS sent", result: "Delivered" },
      { step: "sms", date: "2026-01-05", action: "Follow-up SMS sent", result: "Delivered" },
      { step: "email", date: "2026-01-09", action: "Collection email sent", result: "Opened" },
      { step: "phone", date: "2026-01-25", action: "Phone call - no answer", result: "Left voicemail" },
      { step: "phone", date: "2026-01-30", action: "Phone call - spoke with patient", result: "Promised payment by Feb 15" },
      { step: "phone", date: "2026-02-05", action: "Follow-up call", result: "Confirmed payment coming" },
    ],
  },
  // Day 60 - Final Notice (2)
  {
    id: "seq_13", patientName: "Daniel Harris", patientPhone: "(555) 456-7891", patientEmail: "daniel.h@email.com",
    balance: 3200.00, currentStep: "final_notice", dayInStep: 8, daysActive: 68, contactAttempts: 9,
    lastAction: "Final notice mailed (certified)", nextActionDate: "2026-02-18", status: "active",
    relatedClaims: ["CLM-2024-075", "CLM-2024-076"],
    stepHistory: [
      { step: "statement", date: "2025-11-30", action: "Statement generated and mailed", result: "Delivered" },
      { step: "sms", date: "2025-12-07", action: "Payment reminder SMS sent", result: "Delivered" },
      { step: "email", date: "2025-12-14", action: "Collection email sent", result: "No response" },
      { step: "phone", date: "2025-12-30", action: "Phone call - no answer", result: "Left voicemail" },
      { step: "phone", date: "2026-01-05", action: "Phone call - disconnected", result: "Could not reach" },
      { step: "final_notice", date: "2026-01-29", action: "Final notice mailed via certified mail", result: "Pending delivery confirmation" },
    ],
  },
  {
    id: "seq_14", patientName: "Nancy Clark", patientPhone: "(555) 567-8902", patientEmail: "nancy.c@email.com",
    balance: 1450.00, currentStep: "final_notice", dayInStep: 3, daysActive: 63, contactAttempts: 8,
    lastAction: "Final notice email and letter sent", nextActionDate: "2026-02-25", status: "active",
    relatedClaims: ["CLM-2024-080"],
    stepHistory: [
      { step: "statement", date: "2025-12-05", action: "Statement generated and mailed", result: "Delivered" },
      { step: "sms", date: "2025-12-12", action: "Payment reminder SMS sent", result: "Opted out (STOP)" },
      { step: "email", date: "2025-12-19", action: "Collection email sent", result: "Opened" },
      { step: "phone", date: "2026-01-04", action: "Phone call - spoke with patient", result: "Disputed charges" },
      { step: "phone", date: "2026-01-10", action: "Phone call - provided itemized statement", result: "Patient reviewing" },
      { step: "final_notice", date: "2026-02-03", action: "Final notice with itemized breakdown", result: "Sent via email and certified mail" },
    ],
  },
  // Day 90 - Agency (1)
  {
    id: "seq_15", patientName: "George Lewis", patientPhone: "(555) 678-9013", patientEmail: "george.l@email.com",
    balance: 4800.00, currentStep: "agency", dayInStep: 5, daysActive: 95, contactAttempts: 12,
    lastAction: "Sent to ABC Collections Agency", nextActionDate: "2026-03-06", status: "sent_to_agency",
    relatedClaims: ["CLM-2024-085", "CLM-2024-086", "CLM-2024-087"],
    stepHistory: [
      { step: "statement", date: "2025-11-03", action: "Statement generated and mailed", result: "Delivered" },
      { step: "sms", date: "2025-11-10", action: "Payment reminder SMS sent", result: "Delivered" },
      { step: "email", date: "2025-11-17", action: "Collection email sent", result: "Bounced" },
      { step: "phone", date: "2025-12-03", action: "Phone call - no answer", result: "Left voicemail x3" },
      { step: "final_notice", date: "2025-12-31", action: "Final notice mailed certified", result: "Returned unclaimed" },
      { step: "agency", date: "2026-02-01", action: "Account transferred to ABC Collections Agency", result: "Agency acknowledged receipt" },
    ],
  },
  // Extra completed sequence
  {
    id: "seq_16", patientName: "Betty Robinson", patientPhone: "(555) 789-0124", patientEmail: "betty.r@email.com",
    balance: 0, currentStep: "sms", dayInStep: 3, daysActive: 10, contactAttempts: 2,
    lastAction: "Payment received in full", nextActionDate: "-", status: "completed",
    relatedClaims: ["CLM-2024-090"],
    stepHistory: [
      { step: "statement", date: "2026-01-27", action: "Statement generated and mailed", result: "Delivered" },
      { step: "sms", date: "2026-02-03", action: "Payment reminder SMS sent", result: "Delivered" },
      { step: "sms", date: "2026-02-05", action: "Patient paid in full via Text-to-Pay link", result: "Payment confirmed - $650.00" },
    ],
  },
]

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

  // Try Convex, fall back to mock
  let sequences: CollectionSequence[] | undefined
  let convexError = false
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const result = useQuery(api.collections.queries.listSequences)
    sequences = (result as CollectionSequence[] | undefined) ?? undefined
  } catch {
    convexError = true
    sequences = MOCK_SEQUENCES
  }

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

  // Compute stats
  const stats = useMemo(() => {
    const all = sequences ?? []
    const active = all.filter((s) => s.status === "active" || s.status === "paused")
    const totalOutstanding = all.filter((s) => s.status !== "completed").reduce((sum, s) => sum + s.balance, 0)
    const avgDays = active.length > 0
      ? Math.round(active.reduce((sum, s) => sum + s.daysActive, 0) / active.length)
      : 0
    const agencyCount = all.filter((s) => s.status === "sent_to_agency").length
    return { activeCount: active.length, totalOutstanding, avgDays, agencyCount }
  }, [sequences])

  // Count by step for timeline
  const stepCounts = useMemo(() => {
    const all = sequences ?? []
    const counts: Record<CollectionStep, number> = {
      statement: 0, sms: 0, email: 0, phone: 0, final_notice: 0, agency: 0,
    }
    all.filter((s) => s.status === "active" || s.status === "paused").forEach((s) => {
      counts[s.currentStep]++
    })
    return counts
  }, [sequences])

  function handleTogglePause(id: string) {
    toast.success("Sequence status updated")
  }

  function handleRecordPayment(id: string) {
    toast.success("Payment recorded successfully")
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Sequences</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCount}</div>
            <p className="text-xs text-muted-foreground">Patients in collection pipeline</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">Across all active sequences</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Days to Resolve</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgDays}</div>
            <p className="text-xs text-muted-foreground">Average across active sequences</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sent to Agency</CardTitle>
            <AlertTriangle className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.agencyCount}</div>
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
                    <span className={`text-lg font-bold ${cfg.color}`}>{count}</span>
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
            {filtered.length} sequence{filtered.length !== 1 && "s"} matching current filters
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
                {!sequences ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Loading collections...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                      No sequences found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((seq) => (
                    <SequenceRow
                      key={seq.id}
                      sequence={seq}
                      isExpanded={expandedRow === seq.id}
                      onToggleExpand={() => setExpandedRow(expandedRow === seq.id ? null : seq.id)}
                      onTogglePause={() => handleTogglePause(seq.id)}
                      onRecordPayment={() => handleRecordPayment(seq.id)}
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
    <>
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
                {/* Related Claims */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Related Claims</h4>
                  <div className="flex flex-wrap gap-1">
                    {seq.relatedClaims.map((claim) => (
                      <Badge key={claim} variant="outline" className="text-xs">
                        {claim}
                      </Badge>
                    ))}
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
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
