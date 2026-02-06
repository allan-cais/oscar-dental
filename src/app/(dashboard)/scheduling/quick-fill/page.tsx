"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import type { Id } from "../../../../../convex/_generated/dataModel"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Users,
  Clock,
  CalendarCheck,
  TrendingUp,
  Phone,
  CalendarPlus,
  X,
  Search,
  Sparkles,
  Plus,
  ArrowRight,
  Star,
  DollarSign,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Urgency = "emergency" | "urgent" | "soon" | "routine"
type QueueStatus = "waiting" | "contacted" | "scheduled" | "expired" | "declined"

interface QuickFillItem {
  _id: string
  patientName: string
  appointmentType: string
  preferredDays: string[]
  preferredTimes: string[]
  urgency: Urgency
  priorityScore: number
  status: QueueStatus
  contactAttempts: number
  waitDays: number
  estimatedValue: number
  phone: string
}

interface OverdueHygiene {
  patientId: string
  patientName: string
  lastHygieneDate: string
  monthsOverdue: number
  phone: string
  insurance: string
  estimatedValue: number
}

interface UnscheduledTreatment {
  patientId: string
  patientName: string
  treatment: string
  planDate: string
  estimatedValue: number
  insuranceCoverage: string
}

interface AsapItem {
  patientId: string
  patientName: string
  reason: string
  dateAdded: string
  priority: string
  phone: string
}

interface AiSuggestion {
  patientName: string
  appointmentType: string
  score: number
  rationale: string
  estimatedValue: number
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_QUEUE: QuickFillItem[] = [
  { _id: "qf_1" as Id<"quickFillQueue">, patientName: "James Wilson", appointmentType: "Crown Prep", preferredDays: ["Monday", "Wednesday"], preferredTimes: ["Morning"], urgency: "urgent", priorityScore: 88, status: "waiting", contactAttempts: 0, waitDays: 3, estimatedValue: 1200, phone: "(555) 123-4567" },
  { _id: "qf_2" as Id<"quickFillQueue">, patientName: "Sarah Martinez", appointmentType: "Hygiene", preferredDays: ["Tuesday", "Thursday"], preferredTimes: ["Afternoon"], urgency: "routine", priorityScore: 52, status: "contacted", contactAttempts: 1, waitDays: 7, estimatedValue: 185, phone: "(555) 234-5678" },
  { _id: "qf_3" as Id<"quickFillQueue">, patientName: "Tom Baker", appointmentType: "Emergency Exam", preferredDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], preferredTimes: ["Morning", "Afternoon"], urgency: "emergency", priorityScore: 95, status: "waiting", contactAttempts: 0, waitDays: 1, estimatedValue: 250, phone: "(555) 456-7890" },
  { _id: "qf_4" as Id<"quickFillQueue">, patientName: "Lisa Park", appointmentType: "Filling #19", preferredDays: ["Wednesday", "Friday"], preferredTimes: ["Morning"], urgency: "soon", priorityScore: 65, status: "waiting", contactAttempts: 0, waitDays: 5, estimatedValue: 320, phone: "(555) 567-8901" },
  { _id: "qf_5" as Id<"quickFillQueue">, patientName: "Kevin Rodriguez", appointmentType: "Root Canal", preferredDays: ["Monday", "Thursday"], preferredTimes: ["Afternoon"], urgency: "urgent", priorityScore: 82, status: "contacted", contactAttempts: 2, waitDays: 4, estimatedValue: 950, phone: "(555) 678-9012" },
  { _id: "qf_6" as Id<"quickFillQueue">, patientName: "Nancy White", appointmentType: "Hygiene", preferredDays: ["Tuesday"], preferredTimes: ["Morning"], urgency: "routine", priorityScore: 35, status: "scheduled", contactAttempts: 1, waitDays: 12, estimatedValue: 185, phone: "(555) 789-0123" },
  { _id: "qf_7" as Id<"quickFillQueue">, patientName: "David Kim", appointmentType: "Crown Seat", preferredDays: ["Monday", "Wednesday"], preferredTimes: ["Afternoon"], urgency: "soon", priorityScore: 71, status: "waiting", contactAttempts: 0, waitDays: 6, estimatedValue: 450, phone: "(555) 890-1234" },
  { _id: "qf_8" as Id<"quickFillQueue">, patientName: "Patricia Martinez", appointmentType: "Extraction", preferredDays: ["Thursday", "Friday"], preferredTimes: ["Morning"], urgency: "urgent", priorityScore: 79, status: "contacted", contactAttempts: 1, waitDays: 2, estimatedValue: 350, phone: "(555) 901-2345" },
  { _id: "qf_9" as Id<"quickFillQueue">, patientName: "Robert Chen", appointmentType: "Hygiene", preferredDays: ["Monday", "Tuesday", "Wednesday"], preferredTimes: ["Morning", "Afternoon"], urgency: "routine", priorityScore: 42, status: "expired", contactAttempts: 3, waitDays: 21, estimatedValue: 185, phone: "(555) 012-3456" },
  { _id: "qf_10" as Id<"quickFillQueue">, patientName: "Jennifer Adams", appointmentType: "Veneer Consult", preferredDays: ["Friday"], preferredTimes: ["Afternoon"], urgency: "routine", priorityScore: 28, status: "declined", contactAttempts: 2, waitDays: 14, estimatedValue: 2500, phone: "(555) 345-6780" },
  { _id: "qf_11" as Id<"quickFillQueue">, patientName: "Michael Scott", appointmentType: "Composite Filling", preferredDays: ["Tuesday", "Thursday"], preferredTimes: ["Morning"], urgency: "soon", priorityScore: 58, status: "waiting", contactAttempts: 0, waitDays: 8, estimatedValue: 285, phone: "(555) 456-0987" },
  { _id: "qf_12" as Id<"quickFillQueue">, patientName: "Angela Davis", appointmentType: "Periodontal Scaling", preferredDays: ["Monday", "Wednesday", "Friday"], preferredTimes: ["Afternoon"], urgency: "urgent", priorityScore: 76, status: "waiting", contactAttempts: 0, waitDays: 3, estimatedValue: 425, phone: "(555) 567-1098" },
]

const MOCK_OVERDUE_HYGIENE: OverdueHygiene[] = [
  { patientId: "p1", patientName: "Robert Chen", lastHygieneDate: "2025-05-15", monthsOverdue: 8, phone: "(555) 345-6789", insurance: "Delta Dental", estimatedValue: 185 },
  { patientId: "p2", patientName: "Amanda Scott", lastHygieneDate: "2025-03-10", monthsOverdue: 10, phone: "(555) 456-7891", insurance: "MetLife", estimatedValue: 185 },
  { patientId: "p3", patientName: "Steven Wright", lastHygieneDate: "2025-07-22", monthsOverdue: 6, phone: "(555) 567-8902", insurance: "Cigna Dental", estimatedValue: 185 },
  { patientId: "p4", patientName: "Karen Young", lastHygieneDate: "2024-11-05", monthsOverdue: 14, phone: "(555) 678-9013", insurance: "Delta Dental", estimatedValue: 185 },
  { patientId: "p5", patientName: "Christopher Hall", lastHygieneDate: "2025-01-18", monthsOverdue: 12, phone: "(555) 789-0124", insurance: "Aetna", estimatedValue: 185 },
  { patientId: "p6", patientName: "Michelle Clark", lastHygieneDate: "2025-08-30", monthsOverdue: 5, phone: "(555) 890-1235", insurance: "United Healthcare", estimatedValue: 185 },
  { patientId: "p7", patientName: "Daniel Adams", lastHygieneDate: "2025-06-14", monthsOverdue: 7, phone: "(555) 901-2346", insurance: "Guardian", estimatedValue: 185 },
  { patientId: "p8", patientName: "Laura Bennett", lastHygieneDate: "2025-04-02", monthsOverdue: 9, phone: "(555) 012-3457", insurance: "Delta Dental", estimatedValue: 185 },
]

const MOCK_UNSCHEDULED_TX: UnscheduledTreatment[] = [
  { patientId: "p10", patientName: "Maria Garcia", treatment: "Root Canal #14", planDate: "2025-10-20", estimatedValue: 950, insuranceCoverage: "80%" },
  { patientId: "p11", patientName: "James Wilson", treatment: "Crown #30 (PFM)", planDate: "2025-11-05", estimatedValue: 1250, insuranceCoverage: "50%" },
  { patientId: "p12", patientName: "Thomas Lee", treatment: "Bridge #3-5", planDate: "2025-09-15", estimatedValue: 3750, insuranceCoverage: "50%" },
  { patientId: "p13", patientName: "Susan Brown", treatment: "Composite #19 MO", planDate: "2025-12-01", estimatedValue: 285, insuranceCoverage: "80%" },
  { patientId: "p14", patientName: "Linda Thompson", treatment: "Extraction #1", planDate: "2025-10-10", estimatedValue: 200, insuranceCoverage: "80%" },
  { patientId: "p15", patientName: "Richard Moore", treatment: "Implant Consult", planDate: "2025-11-20", estimatedValue: 4500, insuranceCoverage: "0%" },
]

const MOCK_ASAP: AsapItem[] = [
  { patientId: "p20", patientName: "Tom Baker", reason: "Broken tooth - pain", dateAdded: "2026-01-28", priority: "urgent", phone: "(555) 456-7890" },
  { patientId: "p21", patientName: "Angela Davis", reason: "Swelling lower left", dateAdded: "2026-01-30", priority: "urgent", phone: "(555) 567-1098" },
  { patientId: "p22", patientName: "Kevin Rodriguez", reason: "Lost filling #14", dateAdded: "2026-01-25", priority: "soon", phone: "(555) 678-9012" },
  { patientId: "p23", patientName: "Jennifer Adams", reason: "Tooth sensitivity", dateAdded: "2026-02-01", priority: "routine", phone: "(555) 345-6780" },
  { patientId: "p24", patientName: "Michael Scott", reason: "Chipped front tooth", dateAdded: "2026-02-03", priority: "soon", phone: "(555) 456-0987" },
]

const MOCK_AI_SUGGESTIONS: AiSuggestion[] = [
  { patientName: "James Wilson", appointmentType: "Crown Prep", score: 92, rationale: "High-value procedure ($1,200), patient has been waiting 3 days, preferred day matches open slot. Crown prep fits provider's specialty.", estimatedValue: 1200 },
  { patientName: "Tom Baker", appointmentType: "Emergency Exam", score: 85, rationale: "Urgent: broken tooth with pain reported. Patient is on ASAP list. Quick exam fills 30-min gap efficiently.", estimatedValue: 250 },
  { patientName: "Lisa Park", appointmentType: "Filling #19", score: 71, rationale: "Unscheduled treatment from Oct plan. Insurance coverage at 80%. Treatment fits time slot duration.", estimatedValue: 320 },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function priorityColor(score: number): string {
  if (score >= 80) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
  if (score >= 60) return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
  if (score >= 40) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
  return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
}

function urgencyBadge(urgency: Urgency) {
  const styles: Record<Urgency, string> = {
    emergency: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    urgent: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    soon: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    routine: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  }
  return styles[urgency]
}

function statusBadge(status: QueueStatus) {
  const styles: Record<QueueStatus, string> = {
    waiting: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    contacted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    scheduled: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    expired: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    declined: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  }
  return styles[status]
}

function asapPriorityBadge(priority: string) {
  if (priority === "urgent") return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
  if (priority === "soon") return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
  return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function QuickFillPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [addOpen, setAddOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResults, setAiResults] = useState<AiSuggestion[] | null>(null)
  const [overdueFilter, setOverdueFilter] = useState<string>("all")
  const [gapTab, setGapTab] = useState("overdue-hygiene")

  // Add to Queue form
  const [addForm, setAddForm] = useState({
    patientSearch: "",
    appointmentType: "",
    preferredDays: [] as string[],
    preferredTimes: [] as string[],
    urgency: "routine" as Urgency,
    notes: "",
  })

  // AI Suggest form
  const [aiForm, setAiForm] = useState({
    date: "",
    timeSlot: "",
    provider: "",
    operatory: "",
  })

  // Try Convex, fallback to mock
  let queue: QuickFillItem[] | undefined
  let convexError = false
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const result = useQuery(api.quickfill.queries.listQueue)
    queue = (result as QuickFillItem[] | undefined) ?? undefined
  } catch {
    convexError = true
    queue = MOCK_QUEUE
  }

  // Mutations (best-effort)
  let addToQueue: ((args: Record<string, unknown>) => Promise<unknown>) | null = null
  let removeFromQueue: ((args: Record<string, unknown>) => Promise<unknown>) | null = null
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    addToQueue = useMutation(api.quickfill.mutations.addToQueue)
    // eslint-disable-next-line react-hooks/rules-of-hooks
    removeFromQueue = useMutation(api.quickfill.mutations.removeFromQueue)
  } catch {
    // Mutations unavailable
  }

  const items = queue ?? MOCK_QUEUE

  // Stats
  const waitingCount = items.filter((i) => i.status === "waiting").length
  const avgWait = items.length > 0 ? Math.round(items.reduce((s, i) => s + i.waitDays, 0) / items.length) : 0
  const filledCount = items.filter((i) => i.status === "scheduled").length
  const totalActive = items.filter((i) => i.status !== "expired" && i.status !== "declined").length
  const fillRate = totalActive > 0 ? Math.round((filledCount / totalActive) * 100) : 0

  // Filtered queue
  const filteredQueue = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        search === "" ||
        item.patientName.toLowerCase().includes(search.toLowerCase()) ||
        item.appointmentType.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === "all" || item.status === statusFilter
      return matchesSearch && matchesStatus
    }).sort((a, b) => b.priorityScore - a.priorityScore)
  }, [items, search, statusFilter])

  // Filtered overdue hygiene
  const filteredOverdue = useMemo(() => {
    if (overdueFilter === "all") return MOCK_OVERDUE_HYGIENE
    const minMonths = parseInt(overdueFilter)
    return MOCK_OVERDUE_HYGIENE.filter((h) => h.monthsOverdue >= minMonths)
  }, [overdueFilter])

  function toggleDay(day: string) {
    setAddForm((prev) => ({
      ...prev,
      preferredDays: prev.preferredDays.includes(day)
        ? prev.preferredDays.filter((d) => d !== day)
        : [...prev.preferredDays, day],
    }))
  }

  function toggleTime(time: string) {
    setAddForm((prev) => ({
      ...prev,
      preferredTimes: prev.preferredTimes.includes(time)
        ? prev.preferredTimes.filter((t) => t !== time)
        : [...prev.preferredTimes, time],
    }))
  }

  async function handleAddToQueue() {
    if (addToQueue) {
      try {
        await addToQueue({
          patientName: addForm.patientSearch,
          appointmentType: addForm.appointmentType,
          preferredDays: addForm.preferredDays,
          preferredTimes: addForm.preferredTimes,
          urgency: addForm.urgency,
          notes: addForm.notes,
        })
      } catch (err) {
        console.error("Failed to add to queue:", err)
      }
    }
    setAddOpen(false)
    setAddForm({ patientSearch: "", appointmentType: "", preferredDays: [], preferredTimes: [], urgency: "routine", notes: "" })
  }

  function handleAiSuggest() {
    setAiLoading(true)
    setAiResults(null)
    // Simulate AI processing
    setTimeout(() => {
      setAiResults(MOCK_AI_SUGGESTIONS)
      setAiLoading(false)
    }, 1500)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quick Fill Queue</h1>
          <p className="text-muted-foreground">
            Manage patient waitlist and fill schedule gaps efficiently.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={aiOpen} onOpenChange={(open) => { setAiOpen(open); if (!open) { setAiResults(null); setAiLoading(false) } }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Sparkles className="mr-2 size-4" />
                AI Suggest for Open Slot
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>AI Slot Suggestion</DialogTitle>
                <DialogDescription>
                  Find the best patient to fill an open appointment slot.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={aiForm.date}
                      onChange={(e) => setAiForm({ ...aiForm, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Time Slot</Label>
                    <Select value={aiForm.timeSlot} onValueChange={(v) => setAiForm({ ...aiForm, timeSlot: v })}>
                      <SelectTrigger><SelectValue placeholder="Select time" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="08:00">8:00 AM</SelectItem>
                        <SelectItem value="09:00">9:00 AM</SelectItem>
                        <SelectItem value="10:00">10:00 AM</SelectItem>
                        <SelectItem value="11:00">11:00 AM</SelectItem>
                        <SelectItem value="13:00">1:00 PM</SelectItem>
                        <SelectItem value="14:00">2:00 PM</SelectItem>
                        <SelectItem value="15:00">3:00 PM</SelectItem>
                        <SelectItem value="16:00">4:00 PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Provider (optional)</Label>
                    <Select value={aiForm.provider} onValueChange={(v) => setAiForm({ ...aiForm, provider: v })}>
                      <SelectTrigger><SelectValue placeholder="Any provider" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any Provider</SelectItem>
                        <SelectItem value="dr-chen">Dr. Sarah Chen</SelectItem>
                        <SelectItem value="dr-torres">Dr. Michael Torres</SelectItem>
                        <SelectItem value="jessica-park">Jessica Park, RDH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Operatory (optional)</Label>
                    <Select value={aiForm.operatory} onValueChange={(v) => setAiForm({ ...aiForm, operatory: v })}>
                      <SelectTrigger><SelectValue placeholder="Any operatory" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any Operatory</SelectItem>
                        <SelectItem value="op1">Operatory 1</SelectItem>
                        <SelectItem value="op2">Operatory 2</SelectItem>
                        <SelectItem value="op3">Operatory 3</SelectItem>
                        <SelectItem value="hyg-a">Hygiene Bay A</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              {!aiResults && (
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAiOpen(false)}>Cancel</Button>
                  <Button onClick={handleAiSuggest} disabled={!aiForm.date || !aiForm.timeSlot || aiLoading}>
                    {aiLoading ? (
                      <>
                        <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-1 size-4" />
                        Get Suggestions
                      </>
                    )}
                  </Button>
                </DialogFooter>
              )}
              {aiResults && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Top 3 Recommended Patients</p>
                  {aiResults.map((suggestion, idx) => (
                    <Card key={idx} className="py-3">
                      <CardContent className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{suggestion.patientName}</span>
                              <Badge className={priorityColor(suggestion.score)}>
                                Score: {suggestion.score}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{suggestion.appointmentType}</p>
                          </div>
                          <div className="flex items-center gap-1 text-sm font-semibold text-emerald-600">
                            <DollarSign className="size-3.5" />
                            {suggestion.estimatedValue.toLocaleString()}
                          </div>
                        </div>
                        <div className="rounded-md bg-muted/50 p-2">
                          <p className="text-xs text-muted-foreground italic">{suggestion.rationale}</p>
                        </div>
                        <Button size="sm" className="w-full">
                          <CalendarPlus className="mr-1 size-3.5" />
                          Schedule This Patient
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </DialogContent>
          </Dialog>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" />
                Add to Queue
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Patient to Quick Fill Queue</DialogTitle>
                <DialogDescription>
                  Add a patient who wants to be seen sooner if an opening becomes available.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Patient Search</Label>
                  <Input
                    placeholder="Search by patient name..."
                    value={addForm.patientSearch}
                    onChange={(e) => setAddForm({ ...addForm, patientSearch: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Appointment Type</Label>
                  <Select value={addForm.appointmentType} onValueChange={(v) => setAddForm({ ...addForm, appointmentType: v })}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hygiene">Hygiene</SelectItem>
                      <SelectItem value="exam">Exam</SelectItem>
                      <SelectItem value="filling">Filling</SelectItem>
                      <SelectItem value="crown">Crown Prep</SelectItem>
                      <SelectItem value="root_canal">Root Canal</SelectItem>
                      <SelectItem value="extraction">Extraction</SelectItem>
                      <SelectItem value="emergency">Emergency Exam</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Preferred Days</Label>
                  <div className="flex flex-wrap gap-2">
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => (
                      <Button
                        key={day}
                        type="button"
                        variant={addForm.preferredDays.includes(day) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleDay(day)}
                      >
                        {day.slice(0, 3)}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Preferred Time Slots</Label>
                  <div className="flex flex-wrap gap-2">
                    {["Morning", "Afternoon", "Any"].map((time) => (
                      <Button
                        key={time}
                        type="button"
                        variant={addForm.preferredTimes.includes(time) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleTime(time)}
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Urgency</Label>
                  <Select
                    value={addForm.urgency}
                    onValueChange={(v) => setAddForm({ ...addForm, urgency: v as Urgency })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">Routine</SelectItem>
                      <SelectItem value="soon">Soon</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Any additional notes..."
                    value={addForm.notes}
                    onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleAddToQueue}
                  disabled={!addForm.patientSearch || !addForm.appointmentType}
                >
                  Add to Queue
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="py-3">
          <CardContent className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-blue-100 text-blue-600">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Patients Waiting</p>
              <p className="text-2xl font-bold">{waitingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-orange-100 text-orange-600">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Wait Time</p>
              <p className="text-2xl font-bold">{avgWait} <span className="text-sm font-normal text-muted-foreground">days</span></p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-100 text-emerald-600">
              <CalendarCheck className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Filled This Week</p>
              <p className="text-2xl font-bold">{filledCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-purple-100 text-purple-600">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fill Rate</p>
              <p className="text-2xl font-bold">{fillRate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Table */}
      <Card>
        <CardHeader>
          <CardTitle>Queue</CardTitle>
          <CardDescription>
            {filteredQueue.length} patient{filteredQueue.length !== 1 && "s"} in the quick fill queue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or appointment type..."
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
                <SelectItem value="waiting">Waiting</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Priority</TableHead>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Appointment Type</TableHead>
                  <TableHead>Preferred Days</TableHead>
                  <TableHead>Preferred Times</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead className="text-right">Wait (days)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Attempts</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQueue.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                      No patients in queue.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQueue.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell>
                        <Badge className={priorityColor(item.priorityScore)}>
                          {item.priorityScore}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{item.patientName}</TableCell>
                      <TableCell>{item.appointmentType}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {item.preferredDays.map((d) => d.slice(0, 3)).join(", ")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {item.preferredTimes.join(", ")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={urgencyBadge(item.urgency)}>
                          {item.urgency}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{item.waitDays}</TableCell>
                      <TableCell>
                        <Badge className={statusBadge(item.status)}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{item.contactAttempts}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon-xs" title="Contact">
                            <Phone className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-xs" title="Schedule">
                            <CalendarPlus className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-xs" title="Remove">
                            <X className="size-3.5" />
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

      {/* Gap Fill Toolbox */}
      <Card>
        <CardHeader>
          <CardTitle>Gap Fill Toolbox</CardTitle>
          <CardDescription>
            Find patients to fill open schedule gaps from multiple sources.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={gapTab} onValueChange={setGapTab}>
            <TabsList>
              <TabsTrigger value="overdue-hygiene">Overdue Hygiene</TabsTrigger>
              <TabsTrigger value="unscheduled-tx">Unscheduled Treatment</TabsTrigger>
              <TabsTrigger value="asap">ASAP List</TabsTrigger>
            </TabsList>

            {/* Overdue Hygiene Tab */}
            <TabsContent value="overdue-hygiene" className="mt-4">
              <div className="mb-4 flex items-center gap-3">
                <Label className="text-sm font-medium">Filter by overdue:</Label>
                <Select value={overdueFilter} onValueChange={setOverdueFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Overdue</SelectItem>
                    <SelectItem value="3">3+ Months</SelectItem>
                    <SelectItem value="6">6+ Months</SelectItem>
                    <SelectItem value="9">9+ Months</SelectItem>
                    <SelectItem value="12">12+ Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient Name</TableHead>
                      <TableHead>Last Hygiene Date</TableHead>
                      <TableHead className="text-right">Months Overdue</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Insurance</TableHead>
                      <TableHead className="text-right">Est. Value</TableHead>
                      <TableHead className="w-[140px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOverdue.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                          No overdue hygiene patients found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOverdue.map((patient) => (
                        <TableRow key={patient.patientId}>
                          <TableCell className="font-medium">{patient.patientName}</TableCell>
                          <TableCell className="text-muted-foreground">{patient.lastHygieneDate}</TableCell>
                          <TableCell className="text-right">
                            <Badge className={
                              patient.monthsOverdue >= 12 ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                              patient.monthsOverdue >= 6 ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" :
                              "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                            }>
                              {patient.monthsOverdue}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{patient.phone}</TableCell>
                          <TableCell>{patient.insurance}</TableCell>
                          <TableCell className="text-right font-medium">${patient.estimatedValue}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="xs">
                                <CalendarPlus className="mr-1 size-3" />
                                Schedule
                              </Button>
                              <Button variant="ghost" size="xs">
                                <Plus className="mr-1 size-3" />
                                QF
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Unscheduled Treatment Tab */}
            <TabsContent value="unscheduled-tx" className="mt-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient Name</TableHead>
                      <TableHead>Treatment Needed</TableHead>
                      <TableHead>Treatment Plan Date</TableHead>
                      <TableHead className="text-right">Est. Value</TableHead>
                      <TableHead>Insurance Coverage</TableHead>
                      <TableHead className="w-[140px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MOCK_UNSCHEDULED_TX.map((tx) => (
                      <TableRow key={tx.patientId}>
                        <TableCell className="font-medium">{tx.patientName}</TableCell>
                        <TableCell>{tx.treatment}</TableCell>
                        <TableCell className="text-muted-foreground">{tx.planDate}</TableCell>
                        <TableCell className="text-right font-medium">${tx.estimatedValue.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{tx.insuranceCoverage}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="xs">
                              <CalendarPlus className="mr-1 size-3" />
                              Schedule
                            </Button>
                            <Button variant="ghost" size="xs">
                              <Phone className="mr-1 size-3" />
                              Call
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* ASAP List Tab */}
            <TabsContent value="asap" className="mt-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient Name</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Date Added</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="w-[140px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MOCK_ASAP.map((item) => (
                      <TableRow key={item.patientId}>
                        <TableCell className="font-medium">{item.patientName}</TableCell>
                        <TableCell>{item.reason}</TableCell>
                        <TableCell className="text-muted-foreground">{item.dateAdded}</TableCell>
                        <TableCell>
                          <Badge className={asapPriorityBadge(item.priority)}>
                            {item.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{item.phone}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="xs">
                              <CalendarPlus className="mr-1 size-3" />
                              Schedule
                            </Button>
                            <Button variant="ghost" size="xs">
                              <Phone className="mr-1 size-3" />
                              Contact
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
