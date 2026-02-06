"use client"

import { useState, useMemo } from "react"

import { Button } from "@/components/ui/button"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Bot,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  TrendingUp,
  BarChart3,
  Timer,
  Filter,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionType =
  | "denial_categorization"
  | "appeal_letter"
  | "review_response"
  | "patient_suggestion"
  | "satisfaction_prediction"
  | "cost_estimate"

type Outcome = "approved" | "rejected" | "auto_approved"

interface PendingAction {
  id: string
  type: ActionType
  description: string
  resource: string
  confidence: number
  createdAt: number
  reasoning: string
}

interface HistoryAction {
  id: string
  date: number
  type: ActionType
  description: string
  confidence: number
  outcome: Outcome
  reviewedBy: string
  timeToReview: string
}

// ---------------------------------------------------------------------------
// Type badge config
// ---------------------------------------------------------------------------

const TYPE_CONFIG: Record<ActionType, { label: string; color: string }> = {
  denial_categorization: {
    label: "Denial Categorization",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  appeal_letter: {
    label: "Appeal Letter",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  },
  review_response: {
    label: "Review Response",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  patient_suggestion: {
    label: "Patient Suggestion",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  },
  satisfaction_prediction: {
    label: "Satisfaction Prediction",
    color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
  },
  cost_estimate: {
    label: "Cost Estimate",
    color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  },
}

const OUTCOME_CONFIG: Record<Outcome, { label: string; color: string }> = {
  approved: {
    label: "Approved",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  auto_approved: {
    label: "Auto-Approved",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function confidenceColor(confidence: number): string {
  if (confidence >= 90) return "text-emerald-600 dark:text-emerald-400"
  if (confidence >= 70) return "text-yellow-600 dark:text-yellow-400"
  return "text-red-600 dark:text-red-400"
}

// ---------------------------------------------------------------------------
// Mock data: Pending actions (22 items)
// ---------------------------------------------------------------------------

const MOCK_PENDING: PendingAction[] = [
  { id: "pa-1", type: "denial_categorization", description: "Categorized as 'Missing Pre-Auth' — denial code CO-197 on D2740 porcelain crown", resource: "Claim #CLM-2026-4471", confidence: 96, createdAt: Date.now() - 12 * 60000, reasoning: "Oscar matched denial code CO-197 against payer Cigna's pre-authorization requirements for D2740. Historical data shows 94% of CO-197 denials for this code are due to missing pre-auth documentation." },
  { id: "pa-2", type: "appeal_letter", description: "Generated appeal for medical necessity of D4341 periodontal scaling", resource: "Denial #DEN-1192", confidence: 82, createdAt: Date.now() - 25 * 60000, reasoning: "Oscar drafted this appeal using the patient's perio charting (6mm+ pockets in quadrants 1,3), radiographic bone loss evidence, and Cigna's medical necessity criteria for D4341. Similar appeals have a 78% success rate with this payer." },
  { id: "pa-3", type: "review_response", description: "Drafted response to 3-star Google review mentioning long wait time", resource: "Review by Mark T.", confidence: 91, createdAt: Date.now() - 35 * 60000, reasoning: "Oscar detected the primary concern as wait time dissatisfaction. The response acknowledges the concern, mentions your new scheduling system, and invites the patient to call directly. Tone: empathetic and professional." },
  { id: "pa-4", type: "patient_suggestion", description: "Suggested recall appointment for patient overdue by 8 months", resource: "Patient: Linda Garza", confidence: 88, createdAt: Date.now() - 42 * 60000, reasoning: "Linda Garza's last hygiene visit was June 2025. She has a history of consistent 6-month recalls. Her insurance resets in February and she has unused preventive benefits. Text message recall has worked for her previously." },
  { id: "pa-5", type: "denial_categorization", description: "Categorized as 'Frequency Limitation' — denial code N362 on D0274 bitewings", resource: "Claim #CLM-2026-4523", confidence: 98, createdAt: Date.now() - 48 * 60000, reasoning: "Delta Dental allows D0274 once per 12 months. Patient's last bitewings were taken 8 months ago. This denial is consistent with the payer's frequency limitation policy. No appeal is recommended." },
  { id: "pa-6", type: "cost_estimate", description: "Estimated patient responsibility of $1,240 for treatment plan (crown + buildup)", resource: "Patient: James Whitfield", confidence: 87, createdAt: Date.now() - 55 * 60000, reasoning: "Based on James Whitfield's MetLife plan (PPO, 50% major coverage, $1,500 annual max with $780 remaining), Oscar calculated the estimated patient portion for D2740 + D2950. Estimate accounts for in-network fee schedule." },
  { id: "pa-7", type: "satisfaction_prediction", description: "Flagged patient as high churn risk after 2 missed appointments", resource: "Patient: Robert Nguyen", confidence: 72, createdAt: Date.now() - 63 * 60000, reasoning: "Robert Nguyen has missed 2 consecutive appointments (Nov 2025, Jan 2026) and has not responded to the last 3 text reminders. Patients with this pattern have a 68% likelihood of not returning within 12 months." },
  { id: "pa-8", type: "appeal_letter", description: "Generated appeal for bundling denial on D2950 core buildup with D2740", resource: "Denial #DEN-1205", confidence: 76, createdAt: Date.now() - 78 * 60000, reasoning: "Aetna bundled D2950 into D2740. Oscar's appeal cites ADA coding guidelines that D2950 is a separate restorative procedure when documented with distinct tooth structure loss. Success rate for this appeal type: 62%." },
  { id: "pa-9", type: "review_response", description: "Drafted response to 5-star Google review praising Dr. Park's gentle care", resource: "Review by Sarah K.", confidence: 95, createdAt: Date.now() - 90 * 60000, reasoning: "Positive review response thanking the patient by name, acknowledging Dr. Park specifically, and reinforcing the practice's commitment to comfortable care. No sensitivity issues detected." },
  { id: "pa-10", type: "denial_categorization", description: "Categorized as 'Coordination of Benefits' — denial code N30 on D1110 prophylaxis", resource: "Claim #CLM-2026-4489", confidence: 55, createdAt: Date.now() - 100 * 60000, reasoning: "Oscar detected possible dual coverage. Denial code N30 suggests the secondary payer requires primary EOB. However, the patient's file only shows one active plan. Manual verification recommended — confidence is low due to conflicting data." },
  { id: "pa-11", type: "patient_suggestion", description: "Recommended Quick Fill slot for cancelled 10AM hygiene appointment", resource: "Schedule: Feb 7, 10:00 AM", confidence: 93, createdAt: Date.now() - 115 * 60000, reasoning: "Oscar identified 3 patients on the Quick Fill list who prefer morning appointments and are due for hygiene. Top candidate: Maria Santos (overdue 2 months, confirmed text preference, 90% show rate)." },
  { id: "pa-12", type: "cost_estimate", description: "Estimated insurance payment of $890 for submitted implant claim D6010", resource: "Claim #CLM-2026-4501", confidence: 65, createdAt: Date.now() - 130 * 60000, reasoning: "Patient has BCBS PPO with 50% implant coverage. However, Oscar could not confirm whether the plan has a separate implant rider or waiting period. Estimate is based on standard PPO fee schedule. Manual benefit verification recommended." },
  { id: "pa-13", type: "review_response", description: "Drafted response to 2-star review about billing confusion", resource: "Review by David L.", confidence: 78, createdAt: Date.now() - 145 * 60000, reasoning: "Oscar detected billing frustration as the primary theme. The response apologizes for confusion, offers to review the account personally, and provides direct contact info for the billing coordinator. Avoids disclosing PHI." },
  { id: "pa-14", type: "denial_categorization", description: "Categorized as 'Invalid CDT Code' — rejection on D9999 (custom code)", resource: "Claim #CLM-2026-4512", confidence: 91, createdAt: Date.now() - 160 * 60000, reasoning: "D9999 is an unspecified procedure code. United Healthcare rejected the claim because the narrative was insufficient. Oscar recommends resubmitting with a valid CDT code and detailed narrative per UHC guidelines." },
  { id: "pa-15", type: "appeal_letter", description: "Generated appeal for downcoded D2740 to D2751 by Cigna", resource: "Denial #DEN-1218", confidence: 84, createdAt: Date.now() - 175 * 60000, reasoning: "Cigna downcoded porcelain-fused-to-metal crown (D2740) to base metal (D2751). Oscar's appeal includes clinical documentation, material selection rationale, and ADA guidelines supporting the original code. Historical success: 71%." },
  { id: "pa-16", type: "satisfaction_prediction", description: "Predicted high satisfaction for patient after successful emergency visit", resource: "Patient: Angela Torres", confidence: 89, createdAt: Date.now() - 190 * 60000, reasoning: "Angela Torres was seen as emergency same-day for tooth pain. Treatment was completed in one visit, wait time was under 15 minutes, and she expressed verbal thanks to staff. Patients in this scenario have 91% positive review likelihood." },
  { id: "pa-17", type: "patient_suggestion", description: "Suggested treatment plan follow-up for unscheduled recommended fillings", resource: "Patient: Kevin Park", confidence: 77, createdAt: Date.now() - 210 * 60000, reasoning: "Kevin Park has 3 unscheduled restorative procedures (D2391 x2, D2392) from his October exam. His insurance renews in January with full benefits available. A follow-up message could recover ~$1,100 in production." },
  { id: "pa-18", type: "cost_estimate", description: "Estimated out-of-pocket for orthodontic consult and records", resource: "Patient: Maya Chen", confidence: 92, createdAt: Date.now() - 230 * 60000, reasoning: "Maya Chen's Delta Dental plan includes ortho benefits ($1,500 lifetime max). Consult D8660 is typically covered at 100%. Records D0340 + D0322 estimated at $85 patient portion based on fee schedule." },
  { id: "pa-19", type: "denial_categorization", description: "Categorized as 'Timely Filing' — denial code N29 on D7210 surgical extraction", resource: "Claim #CLM-2025-4398", confidence: 94, createdAt: Date.now() - 250 * 60000, reasoning: "Claim was submitted 128 days after DOS. Aetna's timely filing limit is 90 days. Oscar recommends checking if there's a valid reason for late submission (e.g., prior claim dependency) to support an appeal." },
  { id: "pa-20", type: "review_response", description: "Drafted response to 4-star review mentioning excellent hygienist but dated decor", resource: "Review by Jennifer M.", confidence: 90, createdAt: Date.now() - 270 * 60000, reasoning: "Mixed review with strong clinical praise and minor facility concern. Response thanks the patient, highlights the hygienist by first name (Lisa), and acknowledges upcoming office improvements planned for Q2." },
  { id: "pa-21", type: "appeal_letter", description: "Generated appeal for denied panoramic radiograph D0330 for new patient", resource: "Denial #DEN-1225", confidence: 69, createdAt: Date.now() - 290 * 60000, reasoning: "MetLife denied D0330 citing it was not medically necessary. Oscar's appeal includes the new-patient comprehensive exam rationale and ADA diagnostic imaging guidelines. However, the patient had a pano at a previous dentist 10 months ago, which weakens the case." },
  { id: "pa-22", type: "satisfaction_prediction", description: "Flagged patient at risk of negative review after extended treatment delay", resource: "Patient: Brian Walsh", confidence: 61, createdAt: Date.now() - 310 * 60000, reasoning: "Brian Walsh's crown (D2740) was seated 3 weeks after prep due to lab delay. He called twice about the wait. Patients experiencing lab delays over 14 days have a 35% negative review rate. Consider proactive outreach." },
]

// ---------------------------------------------------------------------------
// Mock data: History actions (50+ items)
// ---------------------------------------------------------------------------

const REVIEWERS = ["Sarah Johnson", "Mike Chen", "Dr. Emily Park", "Lisa Rodriguez", "Auto"]

function generateHistoryActions(): HistoryAction[] {
  const items: HistoryAction[] = []
  const types: ActionType[] = ["denial_categorization", "appeal_letter", "review_response", "patient_suggestion", "satisfaction_prediction", "cost_estimate"]
  const descriptions: Record<ActionType, string[]> = {
    denial_categorization: [
      "Categorized denial CO-197 on D2740 as 'Missing Pre-Auth'",
      "Categorized denial N362 on D0274 as 'Frequency Limitation'",
      "Categorized denial N30 on D1110 as 'Coordination of Benefits'",
      "Categorized denial CO-4 on D4341 as 'Coding Error'",
      "Categorized denial N29 on D7210 as 'Timely Filing'",
      "Categorized denial PR-204 on D2950 as 'Bundling'",
      "Categorized denial CO-16 on D0220 as 'Missing Info'",
      "Categorized denial N519 on D6010 as 'Missing Narrative'",
    ],
    appeal_letter: [
      "Generated appeal for medical necessity of D4341 scaling",
      "Generated appeal for downcoded D2740 to D2751",
      "Generated appeal for bundled D2950 with D2740",
      "Generated appeal for denied D0330 panoramic radiograph",
      "Generated appeal for timely filing exception on D7210",
      "Generated appeal for frequency override on D0274",
    ],
    review_response: [
      "Drafted response to 3-star review about wait times",
      "Drafted response to 5-star review praising Dr. Park",
      "Drafted response to 2-star review about billing issue",
      "Drafted response to 4-star review mentioning hygienist",
      "Drafted response to 1-star review about scheduling mix-up",
      "Drafted response to 5-star review thanking front desk staff",
    ],
    patient_suggestion: [
      "Suggested recall for patient overdue 6+ months",
      "Recommended Quick Fill candidate for open slot",
      "Suggested treatment follow-up for unscheduled procedures",
      "Recommended recare sequence for perio maintenance patient",
      "Suggested birthday outreach for inactive patient",
    ],
    satisfaction_prediction: [
      "Predicted high satisfaction after same-day emergency care",
      "Flagged churn risk after 2 missed appointments",
      "Predicted positive review after successful implant placement",
      "Flagged dissatisfaction risk due to billing dispute",
      "Predicted high NPS score after Invisalign completion",
    ],
    cost_estimate: [
      "Estimated patient portion for crown + buildup treatment plan",
      "Estimated insurance payment for implant claim",
      "Estimated out-of-pocket for ortho consult and records",
      "Estimated copay for 4 quadrants of SRP",
      "Estimated patient balance for bridge treatment D6750",
      "Estimated out-of-pocket for wisdom teeth extraction",
    ],
  }
  const resources: Record<ActionType, string[]> = {
    denial_categorization: ["Claim #CLM-2026-4471", "Claim #CLM-2026-4523", "Claim #CLM-2026-4489", "Claim #CLM-2026-4501", "Claim #CLM-2025-4398", "Claim #CLM-2026-4534", "Claim #CLM-2026-4412", "Claim #CLM-2026-4456"],
    appeal_letter: ["Denial #DEN-1192", "Denial #DEN-1205", "Denial #DEN-1218", "Denial #DEN-1225", "Denial #DEN-1187", "Denial #DEN-1231"],
    review_response: ["Review by Mark T.", "Review by Sarah K.", "Review by David L.", "Review by Jennifer M.", "Review by Tom R.", "Review by Amy W."],
    patient_suggestion: ["Patient: Linda Garza", "Patient: Kevin Park", "Patient: Maria Santos", "Patient: Paul Davis", "Patient: Nancy Liu"],
    satisfaction_prediction: ["Patient: Angela Torres", "Patient: Robert Nguyen", "Patient: Brian Walsh", "Patient: Carol Martinez", "Patient: Donna Kim"],
    cost_estimate: ["Patient: James Whitfield", "Patient: Maya Chen", "Patient: Steve Brown", "Patient: Rachel Green", "Patient: Patient: Tony Russo", "Patient: Samantha Lee"],
  }

  for (let i = 0; i < 55; i++) {
    const type = types[i % types.length]
    const descs = descriptions[type]
    const res = resources[type]
    const daysAgo = Math.floor(i / 2) + 1
    const isAuto = i % 7 === 0
    const outcome: Outcome = isAuto ? "auto_approved" : i % 5 === 3 ? "rejected" : "approved"
    const reviewTimes = ["2m", "5m", "12m", "18m", "32m", "1h", "2h", "4h", "< 1m"]

    items.push({
      id: `ha-${i + 1}`,
      date: Date.now() - daysAgo * 86400000 - Math.random() * 43200000,
      type,
      description: descs[i % descs.length],
      confidence: Math.floor(60 + Math.random() * 38),
      outcome,
      reviewedBy: isAuto ? "Auto" : REVIEWERS[i % (REVIEWERS.length - 1)],
      timeToReview: isAuto ? "< 1m" : reviewTimes[i % (reviewTimes.length - 1)],
    })
  }

  return items.sort((a, b) => b.date - a.date)
}

const MOCK_HISTORY = generateHistoryActions()

// ---------------------------------------------------------------------------
// Mock data: Performance
// ---------------------------------------------------------------------------

const ACCURACY_BY_TYPE: { type: ActionType; accuracy: number }[] = [
  { type: "denial_categorization", accuracy: 94 },
  { type: "appeal_letter", accuracy: 78 },
  { type: "review_response", accuracy: 91 },
  { type: "patient_suggestion", accuracy: 85 },
  { type: "cost_estimate", accuracy: 88 },
]

const MONTHLY_TREND = [
  { month: "Sep 2025", actions: 187, approvalRate: 79 },
  { month: "Oct 2025", actions: 214, approvalRate: 81 },
  { month: "Nov 2025", actions: 248, approvalRate: 83 },
  { month: "Dec 2025", actions: 271, approvalRate: 82 },
  { month: "Jan 2026", actions: 312, approvalRate: 85 },
  { month: "Feb 2026", actions: 342, approvalRate: 84 },
]

const AVG_CONFIDENCE_BY_TYPE: { type: ActionType; avgConfidence: number; totalActions: number }[] = [
  { type: "denial_categorization", avgConfidence: 91, totalActions: 98 },
  { type: "appeal_letter", avgConfidence: 79, totalActions: 54 },
  { type: "review_response", avgConfidence: 88, totalActions: 67 },
  { type: "patient_suggestion", avgConfidence: 83, totalActions: 52 },
  { type: "satisfaction_prediction", avgConfidence: 76, totalActions: 38 },
  { type: "cost_estimate", avgConfidence: 86, totalActions: 33 },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AiActionsPage() {
  const [pendingActions, setPendingActions] = useState<PendingAction[]>(MOCK_PENDING)
  const [activeTab, setActiveTab] = useState("pending")

  // History filters
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string>("all")
  const [historyOutcomeFilter, setHistoryOutcomeFilter] = useState<string>("all")

  const highConfidenceCount = pendingActions.filter((a) => a.confidence >= 90).length

  const filteredHistory = useMemo(() => {
    return MOCK_HISTORY.filter((item) => {
      const matchesType = historyTypeFilter === "all" || item.type === historyTypeFilter
      const matchesOutcome = historyOutcomeFilter === "all" || item.outcome === historyOutcomeFilter
      return matchesType && matchesOutcome
    })
  }, [historyTypeFilter, historyOutcomeFilter])

  function handleApprove(id: string) {
    setPendingActions((prev) => prev.filter((a) => a.id !== id))
  }

  function handleReject(id: string) {
    setPendingActions((prev) => prev.filter((a) => a.id !== id))
  }

  function handleBulkApprove() {
    setPendingActions((prev) => prev.filter((a) => a.confidence < 90))
  }

  const maxMonthlyActions = Math.max(...MONTHLY_TREND.map((m) => m.actions))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Actions</h1>
        <p className="text-muted-foreground">
          Monitor, review, and manage Oscar&apos;s AI-powered decisions across
          denial analysis, appeals, review responses, and patient outreach.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total AI Actions</CardTitle>
            <Bot className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">342</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">289</div>
            <p className="text-xs text-emerald-600/80">84.5% approval rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="size-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">31</div>
            <p className="text-xs text-red-600/80">9.1% rejection rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="size-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingActions.length}</div>
            <p className="text-xs text-yellow-600/80">
              {pendingActions.length > 0
                ? `${((pendingActions.length / 342) * 100).toFixed(1)}% awaiting review`
                : "All caught up"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending Review
            {pendingActions.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
              >
                {pendingActions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">Action History</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* ---------------------------------------------------------------- */}
        {/* Tab 1: Pending Review                                            */}
        {/* ---------------------------------------------------------------- */}
        <TabsContent value="pending" className="space-y-4">
          {pendingActions.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {highConfidenceCount} action{highConfidenceCount !== 1 ? "s" : ""} with
                {" "}&ge;90% confidence
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkApprove}
                disabled={highConfidenceCount === 0}
              >
                <Sparkles className="mr-2 size-4" />
                Bulk Approve High Confidence ({highConfidenceCount})
              </Button>
            </div>
          )}

          {pendingActions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="mb-4 size-12 text-emerald-500" />
                <h3 className="text-lg font-semibold">All Caught Up</h3>
                <p className="text-sm text-muted-foreground">
                  No AI actions are pending review.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[160px]">Resource</TableHead>
                    <TableHead className="w-[100px]">Confidence</TableHead>
                    <TableHead className="w-[90px]">Created</TableHead>
                    <TableHead className="w-[200px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingActions.map((action) => (
                    <TableRow key={action.id}>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={TYPE_CONFIG[action.type].color}
                        >
                          {TYPE_CONFIG[action.type].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <span className="text-sm">{action.description}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {action.resource}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm font-semibold ${confidenceColor(action.confidence)}`}>
                          {action.confidence}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {timeAgo(action.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950"
                            onClick={() => handleApprove(action.id)}
                          >
                            <ThumbsUp className="mr-1 size-3.5" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                            onClick={() => handleReject(action.id)}
                          >
                            <ThumbsDown className="mr-1 size-3.5" />
                            Reject
                          </Button>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8">
                                <HelpCircle className="size-3.5" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                              <PopoverHeader>
                                <PopoverTitle>Why did Oscar suggest this?</PopoverTitle>
                                <PopoverDescription className="mt-2">
                                  {action.reasoning}
                                </PopoverDescription>
                              </PopoverHeader>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ---------------------------------------------------------------- */}
        {/* Tab 2: Action History                                            */}
        {/* ---------------------------------------------------------------- */}
        <TabsContent value="history" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filter by:</span>
            </div>
            <Select value={historyTypeFilter} onValueChange={setHistoryTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Action type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {(Object.keys(TYPE_CONFIG) as ActionType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    {TYPE_CONFIG[type].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={historyOutcomeFilter} onValueChange={setHistoryOutcomeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outcomes</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="auto_approved">Auto-Approved</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {filteredHistory.length} result{filteredHistory.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead className="w-[180px]">Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px]">Confidence</TableHead>
                  <TableHead className="w-[120px]">Outcome</TableHead>
                  <TableHead className="w-[130px]">Reviewed By</TableHead>
                  <TableHead className="w-[100px]">Review Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No actions match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(item.date)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={TYPE_CONFIG[item.type].color}
                        >
                          {TYPE_CONFIG[item.type].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{item.description}</TableCell>
                      <TableCell>
                        <span className={`text-sm font-semibold ${confidenceColor(item.confidence)}`}>
                          {item.confidence}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={OUTCOME_CONFIG[item.outcome].color}>
                          {OUTCOME_CONFIG[item.outcome].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.reviewedBy}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.timeToReview}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ---------------------------------------------------------------- */}
        {/* Tab 3: Performance                                               */}
        {/* ---------------------------------------------------------------- */}
        <TabsContent value="performance" className="space-y-6">
          {/* Time savings callout */}
          <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                <Timer className="size-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-lg font-semibold text-emerald-800 dark:text-emerald-200">
                  Oscar saved approximately 47 hours this month
                </p>
                <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80">
                  Based on average manual processing time per action type across 342 AI actions
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Accuracy by Type */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="size-5" />
                  Accuracy by Action Type
                </CardTitle>
                <CardDescription>
                  Percentage of AI actions validated as correct by human reviewers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {ACCURACY_BY_TYPE.map((item) => (
                  <div key={item.type} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span>{TYPE_CONFIG[item.type].label}</span>
                      <span className="font-semibold">{item.accuracy}%</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-muted">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          item.accuracy >= 90
                            ? "bg-emerald-500"
                            : item.accuracy >= 80
                              ? "bg-yellow-500"
                              : "bg-orange-500"
                        }`}
                        style={{ width: `${item.accuracy}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Monthly Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="size-5" />
                  Monthly Trend
                </CardTitle>
                <CardDescription>
                  AI actions per month with approval rate overlay
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {MONTHLY_TREND.map((month) => (
                    <div key={month.month} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="w-20 text-muted-foreground">{month.month.slice(0, 3)}</span>
                        <span className="flex-1 text-right text-xs text-muted-foreground">
                          {month.actions} actions
                        </span>
                        <span className="ml-3 w-16 text-right text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          {month.approvalRate}% approved
                        </span>
                      </div>
                      <div className="relative h-6 w-full rounded bg-muted">
                        <div
                          className="h-6 rounded bg-blue-500/80 transition-all dark:bg-blue-400/60"
                          style={{ width: `${(month.actions / maxMonthlyActions) * 100}%` }}
                        />
                        <div
                          className="absolute inset-y-0 left-0 h-6 rounded bg-emerald-500/30 dark:bg-emerald-400/20"
                          style={{ width: `${(month.actions / maxMonthlyActions) * (month.approvalRate / 100) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <div className="size-3 rounded bg-blue-500/80 dark:bg-blue-400/60" />
                      Total Actions
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="size-3 rounded bg-emerald-500/30 dark:bg-emerald-400/20" />
                      Approved
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Average Confidence by Type */}
          <Card>
            <CardHeader>
              <CardTitle>Average Confidence by Action Type</CardTitle>
              <CardDescription>
                Mean confidence scores and action volume across all AI decision types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action Type</TableHead>
                      <TableHead className="w-[140px]">Avg. Confidence</TableHead>
                      <TableHead className="w-[130px]">Total Actions</TableHead>
                      <TableHead className="w-[200px]">Distribution</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {AVG_CONFIDENCE_BY_TYPE.map((item) => (
                      <TableRow key={item.type}>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={TYPE_CONFIG[item.type].color}
                          >
                            {TYPE_CONFIG[item.type].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`font-semibold ${confidenceColor(item.avgConfidence)}`}>
                            {item.avgConfidence}%
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.totalActions}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 rounded-full bg-muted">
                              <div
                                className={`h-2 rounded-full ${
                                  item.avgConfidence >= 90
                                    ? "bg-emerald-500"
                                    : item.avgConfidence >= 80
                                      ? "bg-yellow-500"
                                      : "bg-orange-500"
                                }`}
                                style={{ width: `${item.avgConfidence}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
