"use client"

import { useState, useMemo } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../../../convex/_generated/api"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  TrendingUp,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Brain,
  AlertTriangle,
  Mail,
  MessageSquare,
  Search,
  ArrowUpDown,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

type RequestStatus = "pending" | "sent" | "completed" | "opted_out"
type ExclusionReason = "Recent Complaint" | "Request Sent <30d" | "Opted Out" | "Low Predicted Score"
type SendMethod = "SMS" | "Email"

interface EligiblePatient {
  id: string
  name: string
  lastAppointment: string
  appointmentType: string
  provider: string
  phone: string
}

interface ExcludedPatient {
  id: string
  name: string
  lastAppointment: string
  reason: ExclusionReason
  details: string
}

interface RequestHistoryItem {
  id: string
  dateSent: string
  patient: string
  method: SendMethod
  delayHours: number
  status: RequestStatus
  reviewReceived: boolean
}

interface AIPrediction {
  id: string
  patient: string
  predictedScore: number
  actualRating: number | null
  actionTaken: "Sent Request" | "Internal Follow-up"
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_ELIGIBLE_PATIENTS: EligiblePatient[] = [
  { id: "e1", name: "Maria Gonzalez", lastAppointment: "2026-02-05", appointmentType: "Cleaning & Exam", provider: "Dr. Emily Park", phone: "(512) 555-0142" },
  { id: "e2", name: "James Thompson", lastAppointment: "2026-02-05", appointmentType: "Crown Prep", provider: "Dr. David Chen", phone: "(512) 555-0198" },
  { id: "e3", name: "Sarah Mitchell", lastAppointment: "2026-02-05", appointmentType: "Root Canal", provider: "Dr. Emily Park", phone: "(512) 555-0234" },
  { id: "e4", name: "Robert Kim", lastAppointment: "2026-02-05", appointmentType: "Filling", provider: "Dr. Lisa Wang", phone: "(512) 555-0311" },
  { id: "e5", name: "Jennifer Davis", lastAppointment: "2026-02-05", appointmentType: "Cleaning & Exam", provider: "Dr. David Chen", phone: "(512) 555-0427" },
  { id: "e6", name: "Michael Brown", lastAppointment: "2026-02-04", appointmentType: "Whitening", provider: "Dr. Emily Park", phone: "(512) 555-0563" },
  { id: "e7", name: "Amanda Wilson", lastAppointment: "2026-02-04", appointmentType: "Cleaning & Exam", provider: "Dr. Lisa Wang", phone: "(512) 555-0678" },
  { id: "e8", name: "Daniel Martinez", lastAppointment: "2026-02-04", appointmentType: "Extraction", provider: "Dr. David Chen", phone: "(512) 555-0745" },
  { id: "e9", name: "Emily Taylor", lastAppointment: "2026-02-04", appointmentType: "Implant Consult", provider: "Dr. Emily Park", phone: "(512) 555-0812" },
  { id: "e10", name: "Christopher Lee", lastAppointment: "2026-02-03", appointmentType: "Cleaning & Exam", provider: "Dr. Lisa Wang", phone: "(512) 555-0934" },
]

const MOCK_EXCLUDED_PATIENTS: ExcludedPatient[] = [
  { id: "x1", name: "Patricia Anderson", lastAppointment: "2026-02-04", reason: "Recent Complaint", details: "Filed complaint about billing on 01/28/2026" },
  { id: "x2", name: "William Johnson", lastAppointment: "2026-02-03", reason: "Request Sent <30d", details: "Review request sent on 01/15/2026" },
  { id: "x3", name: "Karen White", lastAppointment: "2026-02-05", reason: "Opted Out", details: "Patient opted out of all marketing communications" },
  { id: "x4", name: "Steven Harris", lastAppointment: "2026-02-02", reason: "Low Predicted Score", details: "AI predicted satisfaction score: 2.1/5" },
  { id: "x5", name: "Nancy Clark", lastAppointment: "2026-02-04", reason: "Request Sent <30d", details: "Review request sent on 01/22/2026" },
  { id: "x6", name: "Thomas Robinson", lastAppointment: "2026-02-01", reason: "Recent Complaint", details: "Complained about wait time on 02/01/2026" },
  { id: "x7", name: "Dorothy Lewis", lastAppointment: "2026-02-05", reason: "Opted Out", details: "Patient replied STOP on 12/10/2025" },
  { id: "x8", name: "Richard Walker", lastAppointment: "2026-02-03", reason: "Low Predicted Score", details: "AI predicted satisfaction score: 1.8/5" },
]

const MOCK_REQUEST_HISTORY: RequestHistoryItem[] = [
  { id: "r1", dateSent: "2026-02-05", patient: "Maria Gonzalez", method: "SMS", delayHours: 4, status: "pending", reviewReceived: false },
  { id: "r2", dateSent: "2026-02-05", patient: "James Thompson", method: "SMS", delayHours: 4, status: "sent", reviewReceived: false },
  { id: "r3", dateSent: "2026-02-04", patient: "Laura Chen", method: "Email", delayHours: 2, status: "completed", reviewReceived: true },
  { id: "r4", dateSent: "2026-02-04", patient: "David Nguyen", method: "SMS", delayHours: 4, status: "completed", reviewReceived: true },
  { id: "r5", dateSent: "2026-02-04", patient: "Jessica Moore", method: "SMS", delayHours: 6, status: "sent", reviewReceived: false },
  { id: "r6", dateSent: "2026-02-03", patient: "Brian Taylor", method: "Email", delayHours: 4, status: "completed", reviewReceived: false },
  { id: "r7", dateSent: "2026-02-03", patient: "Stephanie Adams", method: "SMS", delayHours: 4, status: "opted_out", reviewReceived: false },
  { id: "r8", dateSent: "2026-02-03", patient: "Kevin Wilson", method: "SMS", delayHours: 8, status: "completed", reviewReceived: true },
  { id: "r9", dateSent: "2026-02-02", patient: "Michelle Hall", method: "Email", delayHours: 4, status: "completed", reviewReceived: true },
  { id: "r10", dateSent: "2026-02-02", patient: "Andrew Scott", method: "SMS", delayHours: 4, status: "sent", reviewReceived: false },
  { id: "r11", dateSent: "2026-02-02", patient: "Rachel Green", method: "SMS", delayHours: 2, status: "completed", reviewReceived: false },
  { id: "r12", dateSent: "2026-02-01", patient: "Jason Miller", method: "Email", delayHours: 4, status: "completed", reviewReceived: true },
  { id: "r13", dateSent: "2026-02-01", patient: "Angela Baker", method: "SMS", delayHours: 4, status: "completed", reviewReceived: true },
  { id: "r14", dateSent: "2026-02-01", patient: "Mark Young", method: "SMS", delayHours: 6, status: "opted_out", reviewReceived: false },
  { id: "r15", dateSent: "2026-01-31", patient: "Samantha King", method: "Email", delayHours: 4, status: "completed", reviewReceived: false },
  { id: "r16", dateSent: "2026-01-31", patient: "Tyler Wright", method: "SMS", delayHours: 4, status: "completed", reviewReceived: true },
  { id: "r17", dateSent: "2026-01-30", patient: "Olivia Lopez", method: "SMS", delayHours: 4, status: "completed", reviewReceived: false },
  { id: "r18", dateSent: "2026-01-30", patient: "Ryan Hill", method: "Email", delayHours: 8, status: "completed", reviewReceived: true },
  { id: "r19", dateSent: "2026-01-29", patient: "Natalie Scott", method: "SMS", delayHours: 4, status: "sent", reviewReceived: false },
  { id: "r20", dateSent: "2026-01-29", patient: "Eric Hernandez", method: "SMS", delayHours: 2, status: "completed", reviewReceived: false },
  { id: "r21", dateSent: "2026-01-28", patient: "Megan Turner", method: "Email", delayHours: 4, status: "completed", reviewReceived: true },
]

const MOCK_AI_PREDICTIONS: AIPrediction[] = [
  { id: "p1", patient: "Maria Gonzalez", predictedScore: 4.7, actualRating: 5, actionTaken: "Sent Request" },
  { id: "p2", patient: "Steven Harris", predictedScore: 2.1, actualRating: null, actionTaken: "Internal Follow-up" },
  { id: "p3", patient: "Laura Chen", predictedScore: 4.3, actualRating: 4, actionTaken: "Sent Request" },
  { id: "p4", patient: "Richard Walker", predictedScore: 1.8, actualRating: null, actionTaken: "Internal Follow-up" },
  { id: "p5", patient: "David Nguyen", predictedScore: 4.5, actualRating: 5, actionTaken: "Sent Request" },
  { id: "p6", patient: "Jessica Moore", predictedScore: 3.9, actualRating: null, actionTaken: "Sent Request" },
]

const DEFAULT_SMS_TEMPLATE = `Hi {patient_name}, thank you for visiting Canopy Dental today! We'd love to hear about your experience. Would you mind leaving us a quick review? {review_link}

Your feedback helps us continue providing great care. Thank you!`

const FTC_FLAGGED_WORDS = [
  "discount", "coupon", "free", "gift", "reward", "incentive", "prize",
  "raffle", "drawing", "contest", "bonus", "compensation", "exchange",
  "offer", "deal", "promotion",
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusBadge(status: RequestStatus) {
  switch (status) {
    case "pending":
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Pending</Badge>
    case "sent":
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Sent</Badge>
    case "completed":
      return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Completed</Badge>
    case "opted_out":
      return <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Opted Out</Badge>
  }
}

function exclusionBadge(reason: ExclusionReason) {
  switch (reason) {
    case "Recent Complaint":
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">{reason}</Badge>
    case "Request Sent <30d":
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">{reason}</Badge>
    case "Opted Out":
      return <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">{reason}</Badge>
    case "Low Predicted Score":
      return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">{reason}</Badge>
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function checkFtcCompliance(text: string): { compliant: boolean; violations: string[] } {
  const lower = text.toLowerCase()
  const violations = FTC_FLAGGED_WORDS.filter((word) => lower.includes(word))
  return { compliant: violations.length === 0, violations }
}

function highlightViolations(text: string, violations: string[]): React.ReactNode[] {
  if (violations.length === 0) return [text]
  const regex = new RegExp(`(${violations.join("|")})`, "gi")
  const parts = text.split(regex)
  return parts.map((part, i) => {
    if (violations.some((v) => v.toLowerCase() === part.toLowerCase())) {
      return (
        <span key={i} className="rounded bg-red-200 px-0.5 text-red-900 dark:bg-red-800 dark:text-red-100">
          {part}
        </span>
      )
    }
    return <span key={i}>{part}</span>
  })
}

// ─── Page Component ──────────────────────────────────────────────────────────

export default function ReviewRequestsPage() {
  const [excludedExpanded, setExcludedExpanded] = useState(false)
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>("all")
  const [historySearch, setHistorySearch] = useState("")
  const [delayHours, setDelayHours] = useState("4")
  const [smsTemplate, setSmsTemplate] = useState(DEFAULT_SMS_TEMPLATE)
  const [aiFilterEnabled, setAiFilterEnabled] = useState(true)

  // Try Convex, fall back to mock data
  let convexError = false
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery(api.reviewRequests.queries.list, {})
  } catch {
    convexError = true
  }

  const ftcCheck = useMemo(() => checkFtcCompliance(smsTemplate), [smsTemplate])

  const filteredHistory = useMemo(() => {
    return MOCK_REQUEST_HISTORY.filter((item) => {
      const matchesStatus = historyStatusFilter === "all" || item.status === historyStatusFilter
      const matchesSearch =
        historySearch === "" ||
        item.patient.toLowerCase().includes(historySearch.toLowerCase())
      return matchesStatus && matchesSearch
    })
  }, [historyStatusFilter, historySearch])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Review Requests</h1>
        <p className="text-muted-foreground">
          Manage automated review requests, patient eligibility, and FTC-compliant messaging templates.
        </p>
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Send className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">16.2%</div>
            <p className="text-xs text-muted-foreground">Above 15% target</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Awaiting delivery</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Excluded Patients</CardTitle>
            <ShieldAlert className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Filtered this period</p>
          </CardContent>
        </Card>
      </div>

      {/* Eligible Patients */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Eligible Patients</CardTitle>
              <CardDescription>
                {MOCK_ELIGIBLE_PATIENTS.length} patients eligible for review requests today
              </CardDescription>
            </div>
            <Button>
              <Send className="mr-2 size-4" />
              Send All Eligible
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Last Appointment</TableHead>
                  <TableHead>Appointment Type</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Eligibility</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_ELIGIBLE_PATIENTS.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-medium">{patient.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(patient.lastAppointment)}
                    </TableCell>
                    <TableCell>{patient.appointmentType}</TableCell>
                    <TableCell>{patient.provider}</TableCell>
                    <TableCell className="text-muted-foreground">{patient.phone}</TableCell>
                    <TableCell>
                      <CheckCircle2 className="size-5 text-emerald-500" />
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        <Send className="mr-1 size-3" />
                        Send
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Excluded Patients (Collapsible) */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => setExcludedExpanded(!excludedExpanded)}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Excluded Patients</CardTitle>
              <CardDescription>
                {MOCK_EXCLUDED_PATIENTS.length} patients excluded from review requests
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm">
              {excludedExpanded ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {excludedExpanded && (
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient Name</TableHead>
                    <TableHead>Last Appointment</TableHead>
                    <TableHead>Exclusion Reason</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_EXCLUDED_PATIENTS.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium">{patient.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(patient.lastAppointment)}
                      </TableCell>
                      <TableCell>{exclusionBadge(patient.reason)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {patient.details}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Request History */}
      <Card>
        <CardHeader>
          <CardTitle>Request History</CardTitle>
          <CardDescription>
            Complete log of all review requests sent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by patient name..."
                className="pl-9"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
              />
            </div>
            <Select value={historyStatusFilter} onValueChange={setHistoryStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="opted_out">Opted Out</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date Sent</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Delay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Review Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No requests found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground">
                        {formatDate(item.dateSent)}
                      </TableCell>
                      <TableCell className="font-medium">{item.patient}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {item.method === "SMS" ? (
                            <MessageSquare className="size-3.5 text-muted-foreground" />
                          ) : (
                            <Mail className="size-3.5 text-muted-foreground" />
                          )}
                          {item.method}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.delayHours}h
                      </TableCell>
                      <TableCell>{statusBadge(item.status)}</TableCell>
                      <TableCell>
                        {item.reviewReceived ? (
                          <CheckCircle2 className="size-4 text-emerald-500" />
                        ) : (
                          <XCircle className="size-4 text-muted-foreground/40" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Showing {filteredHistory.length} of {MOCK_REQUEST_HISTORY.length} requests
          </p>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Request Settings</CardTitle>
          <CardDescription>
            Configure default timing, message templates, and compliance checks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Default Delay */}
          <div className="space-y-2">
            <Label htmlFor="delay">Default Send Delay</Label>
            <Select value={delayHours} onValueChange={setDelayHours}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {h} hour{h !== 1 ? "s" : ""} after appointment
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How long after the appointment before the review request is sent
            </p>
          </div>

          <Separator />

          {/* SMS Template */}
          <div className="space-y-2">
            <Label htmlFor="sms-template">SMS Template</Label>
            <Textarea
              id="sms-template"
              rows={5}
              value={smsTemplate}
              onChange={(e) => setSmsTemplate(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Available variables: {"{patient_name}"}, {"{practice_name}"}, {"{review_link}"}, {"{provider_name}"}
            </p>
          </div>

          {/* FTC Compliance Check */}
          <div className="space-y-2">
            <Label>FTC Compliance Check</Label>
            {ftcCheck.compliant ? (
              <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                <CheckCircle2 className="size-4 text-emerald-600" />
                <span className="text-sm text-emerald-800 dark:text-emerald-300">
                  Template is FTC compliant. No incentive language detected.
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
                  <AlertTriangle className="size-4 text-red-600" />
                  <span className="text-sm text-red-800 dark:text-red-300">
                    FTC violation detected: template contains incentive language.
                    Flagged words: {ftcCheck.violations.join(", ")}
                  </span>
                </div>
                <div className="rounded-md border p-3 text-sm">
                  <Label className="mb-2 block text-xs text-muted-foreground">Template Preview with Violations Highlighted</Label>
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {highlightViolations(smsTemplate, ftcCheck.violations)}
                  </p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div className="flex justify-end">
            <Button>Save Settings</Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Satisfaction Prediction */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="size-5" />
                AI Satisfaction Prediction
              </CardTitle>
              <CardDescription>
                Predict patient satisfaction before sending review requests
              </CardDescription>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={aiFilterEnabled}
              onClick={() => setAiFilterEnabled(!aiFilterEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                aiFilterEnabled ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`pointer-events-none block size-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                  aiFilterEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              {aiFilterEnabled
                ? "AI Filtering is enabled. Patients with predicted satisfaction score below 3.0 are automatically routed to internal follow-up instead of receiving review requests."
                : "AI Filtering is disabled. All eligible patients will receive review requests regardless of predicted satisfaction."}
            </p>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Predicted Score</TableHead>
                  <TableHead>Actual Rating</TableHead>
                  <TableHead>Action Taken</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_AI_PREDICTIONS.map((prediction) => (
                  <TableRow key={prediction.id}>
                    <TableCell className="font-medium">{prediction.patient}</TableCell>
                    <TableCell>
                      <span
                        className={`font-mono font-medium ${
                          prediction.predictedScore >= 4.0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : prediction.predictedScore >= 3.0
                              ? "text-yellow-600 dark:text-yellow-400"
                              : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {prediction.predictedScore.toFixed(1)}
                      </span>
                      <span className="text-muted-foreground">/5</span>
                    </TableCell>
                    <TableCell>
                      {prediction.actualRating ? (
                        <span className="font-mono font-medium">
                          {prediction.actualRating.toFixed(1)}/5
                        </span>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {prediction.actionTaken === "Sent Request" ? (
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                          Sent Request
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                          Internal Follow-up
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
