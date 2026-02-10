"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../../convex/_generated/api"

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
import { DataEmptyState } from "@/components/ui/data-empty-state"
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

interface AiSuggestion {
  patientName: string
  appointmentType: string
  score: number
  rationale: string
  estimatedValue: number
}

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

  // Load from Convex
  const queueData = useQuery(api.quickfill.queries.list as any, {})
  const gapFillData = useQuery(api.quickfill.queries.getGapFillToolbox as any, {})

  // Mutations — always call hooks unconditionally
  const addToQueue = useMutation(api.quickfill.mutations.addToQueue as any) as ((args: Record<string, unknown>) => Promise<unknown>) | null
  const removeFromQueue = useMutation(api.quickfill.mutations.removeFromQueue as any) as ((args: Record<string, unknown>) => Promise<unknown>) | null

  // list returns { items, totalCount } — extract items array
  const rawQueue = queueData && typeof queueData === "object" && "items" in (queueData as any)
    ? (queueData as any).items
    : queueData
  const items = (rawQueue as QuickFillItem[]) ?? []
  // getGapFillToolbox returns { overdueHygiene, unscheduledTreatment, asapList }
  const overdueHygiene = (gapFillData as any)?.overdueHygiene ?? []
  const unscheduledTx = (gapFillData as any)?.unscheduledTreatment ?? []
  const asapItems = (gapFillData as any)?.asapList ?? []

  // Stats
  const waitingCount = items.filter((i) => i.status === "waiting").length
  const avgWait = items.length > 0 ? Math.round(items.reduce((s, i) => s + (i.waitDays || 0), 0) / items.length) : 0
  const filledCount = items.filter((i) => i.status === "scheduled").length
  const totalActive = items.filter((i) => i.status !== "expired" && i.status !== "declined").length
  const fillRate = totalActive > 0 ? Math.round((filledCount / totalActive) * 100) : 0

  // Filtered queue
  const filteredQueue = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        search === "" ||
        (item.patientName || "").toLowerCase().includes(search.toLowerCase()) ||
        (item.appointmentType || "").toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === "all" || item.status === statusFilter
      return matchesSearch && matchesStatus
    }).sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))
  }, [items, search, statusFilter])

  // Filtered overdue hygiene
  const filteredOverdue = useMemo(() => {
    if (overdueFilter === "all") return overdueHygiene
    const minMonths = parseInt(overdueFilter)
    return overdueHygiene.filter((h: any) => (h.monthsOverdue || 0) >= minMonths)
  }, [overdueHygiene, overdueFilter])

  // Loading state — after all hooks
  if (queueData === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Quick Fill Queue</h1>
            <p className="text-muted-foreground">Manage patient waitlist and fill schedule gaps efficiently.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="h-60 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

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
    // Simulate AI processing - will be replaced with real Convex action
    setTimeout(() => {
      setAiResults([])
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
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Operatory (optional)</Label>
                    <Select value={aiForm.operatory} onValueChange={(v) => setAiForm({ ...aiForm, operatory: v })}>
                      <SelectTrigger><SelectValue placeholder="Any operatory" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any Operatory</SelectItem>
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
                  {aiResults.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">No AI suggestions available yet. Connect the AI integration to enable this feature.</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-muted-foreground">Top Recommended Patients</p>
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
                    </>
                  )}
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

          {items.length === 0 ? (
            <DataEmptyState resource="quick fill entries" message="No patients are in the quick fill queue yet. Add patients who want to be seen sooner." />
          ) : (
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
                        No patients match your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredQueue.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell>
                          <Badge className={priorityColor(item.priorityScore || 0)}>
                            {item.priorityScore || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{item.patientName}</TableCell>
                        <TableCell>{item.appointmentType}</TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {(item.preferredDays || []).map((d: string) => d.slice(0, 3)).join(", ")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {(item.preferredTimes || []).join(", ")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={urgencyBadge(item.urgency || "routine")}>
                            {item.urgency || "routine"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{item.waitDays || 0}</TableCell>
                        <TableCell>
                          <Badge className={statusBadge(item.status || "waiting")}>
                            {item.status || "waiting"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{item.contactAttempts || 0}</TableCell>
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
          )}
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
              {overdueHygiene.length === 0 ? (
                <DataEmptyState resource="overdue hygiene patients" message="No overdue hygiene patients found. Data will appear after syncing patient records." />
              ) : (
                <>
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
                          filteredOverdue.map((patient: any) => (
                            <TableRow key={patient.patientId || patient._id}>
                              <TableCell className="font-medium">{patient.patientName}</TableCell>
                              <TableCell className="text-muted-foreground">{patient.lastHygieneDate}</TableCell>
                              <TableCell className="text-right">
                                <Badge className={
                                  (patient.monthsOverdue || 0) >= 12 ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                                  (patient.monthsOverdue || 0) >= 6 ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" :
                                  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                }>
                                  {patient.monthsOverdue || 0}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{patient.phone}</TableCell>
                              <TableCell>{patient.insurance}</TableCell>
                              <TableCell className="text-right font-medium">${patient.estimatedValue || 0}</TableCell>
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
                </>
              )}
            </TabsContent>

            {/* Unscheduled Treatment Tab */}
            <TabsContent value="unscheduled-tx" className="mt-4">
              {unscheduledTx.length === 0 ? (
                <DataEmptyState resource="unscheduled treatments" message="No unscheduled treatments found. Data will appear after syncing treatment plans." />
              ) : (
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
                      {unscheduledTx.map((tx: any) => (
                        <TableRow key={tx.patientId || tx._id}>
                          <TableCell className="font-medium">{tx.patientName}</TableCell>
                          <TableCell>{tx.treatment}</TableCell>
                          <TableCell className="text-muted-foreground">{tx.planDate}</TableCell>
                          <TableCell className="text-right font-medium">${(tx.estimatedValue || 0).toLocaleString()}</TableCell>
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
              )}
            </TabsContent>

            {/* ASAP List Tab */}
            <TabsContent value="asap" className="mt-4">
              {asapItems.length === 0 ? (
                <DataEmptyState resource="ASAP patients" message="No patients on the ASAP list. Patients flagged for urgent scheduling will appear here." />
              ) : (
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
                      {asapItems.map((item: any) => (
                        <TableRow key={item.patientId || item._id}>
                          <TableCell className="font-medium">{item.patientName}</TableCell>
                          <TableCell>{item.reason}</TableCell>
                          <TableCell className="text-muted-foreground">{item.dateAdded}</TableCell>
                          <TableCell>
                            <Badge className={asapPriorityBadge(item.priority || "routine")}>
                              {item.priority || "routine"}
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
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
