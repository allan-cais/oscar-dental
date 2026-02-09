"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"

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
  | "patient_suggest"
  | "satisfaction_prediction"
  | "cost_estimate"
  | "payer_alert"
  | "ar_prioritization"

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

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
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
  patient_suggest: {
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
  payer_alert: {
    label: "Payer Alert",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  ar_prioritization: {
    label: "A/R Prioritization",
    color: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
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

function mapToPendingAction(doc: any): PendingAction {
  return {
    id: doc._id,
    type: doc.actionType,
    description: doc.output ?? doc.input ?? "AI action",
    resource: `${doc.resourceType ?? "Resource"} #${doc.resourceId ?? "unknown"}`,
    confidence: Math.round((doc.confidence ?? 0) * 100),
    createdAt: doc.createdAt ?? doc._creationTime ?? Date.now(),
    reasoning: doc.explanation ?? "No reasoning provided.",
  }
}

function mapToHistoryAction(doc: any): HistoryAction {
  let outcome: Outcome = "approved"
  if (doc.status === "rejected") outcome = "rejected"
  else if (doc.status === "completed") outcome = "auto_approved"

  let timeToReview = "--"
  if (doc.status === "completed") {
    timeToReview = "< 1m"
  } else if (doc.approvedAt && doc.createdAt) {
    timeToReview = formatReviewTime(doc.approvedAt - doc.createdAt)
  } else if (doc.rejectedAt && doc.createdAt) {
    timeToReview = formatReviewTime(doc.rejectedAt - doc.createdAt)
  }

  return {
    id: doc._id,
    date: doc.updatedAt ?? doc.createdAt ?? doc._creationTime ?? Date.now(),
    type: doc.actionType,
    description: doc.output ?? doc.input ?? "AI action",
    confidence: Math.round((doc.confidence ?? 0) * 100),
    outcome,
    reviewedBy: doc.status === "completed" ? "Auto" : doc.approvedBy ?? doc.rejectedBy ?? "Staff",
    timeToReview,
  }
}

function formatReviewTime(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return `${hours}h`
}

function getTypeConfig(actionType: string) {
  return TYPE_CONFIG[actionType] ?? { label: actionType, color: "bg-gray-100 text-gray-800" }
}

// ---------------------------------------------------------------------------
// Static performance data (not seeded in DB yet)
// ---------------------------------------------------------------------------

const ACCURACY_BY_TYPE: { type: string; accuracy: number }[] = [
  { type: "denial_categorization", accuracy: 94 },
  { type: "appeal_letter", accuracy: 78 },
  { type: "review_response", accuracy: 91 },
  { type: "patient_suggest", accuracy: 85 },
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

const AVG_CONFIDENCE_BY_TYPE: { type: string; avgConfidence: number; totalActions: number }[] = [
  { type: "denial_categorization", avgConfidence: 91, totalActions: 98 },
  { type: "appeal_letter", avgConfidence: 79, totalActions: 54 },
  { type: "review_response", avgConfidence: 88, totalActions: 67 },
  { type: "patient_suggest", avgConfidence: 83, totalActions: 52 },
  { type: "satisfaction_prediction", avgConfidence: 76, totalActions: 38 },
  { type: "cost_estimate", avgConfidence: 86, totalActions: 33 },
]

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 w-24 rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 rounded bg-muted" />
              <div className="mt-1 h-3 w-20 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="rounded-md border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b px-4 py-3">
            <div className="h-5 w-28 rounded bg-muted" />
            <div className="h-4 flex-1 rounded bg-muted" />
            <div className="h-4 w-16 rounded bg-muted" />
            <div className="h-8 w-20 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AiActionsPage() {
  const [activeTab, setActiveTab] = useState("pending")

  // History filters
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string>("all")
  const [historyOutcomeFilter, setHistoryOutcomeFilter] = useState<string>("all")

  // Convex queries
  const rawPending = useQuery((api as any).aiActions.queries.listPending)
  const rawHistory = useQuery((api as any).aiActions.queries.listHistory, {
    ...(historyTypeFilter !== "all" ? { actionType: historyTypeFilter } : {}),
    ...(historyOutcomeFilter !== "all" ? { outcome: historyOutcomeFilter } : {}),
  })
  const stats = useQuery((api as any).aiActions.queries.getStats)

  // Convex mutations
  const approveMutation = useMutation((api as any).aiActions.mutations.approve)
  const rejectMutation = useMutation((api as any).aiActions.mutations.reject)

  // Map raw Convex docs to UI types
  const pendingActions: PendingAction[] = useMemo(
    () => (rawPending ?? []).map(mapToPendingAction),
    [rawPending]
  )

  const filteredHistory: HistoryAction[] = useMemo(
    () => (rawHistory ?? []).map(mapToHistoryAction),
    [rawHistory]
  )

  const isLoading = rawPending === undefined || stats === undefined

  const highConfidenceCount = pendingActions.filter((a) => a.confidence >= 90).length

  function handleApprove(id: string) {
    approveMutation({ aiActionId: id as any })
  }

  function handleReject(id: string) {
    rejectMutation({ aiActionId: id as any })
  }

  async function handleBulkApprove() {
    if (!rawPending) return
    const highConf = rawPending.filter((a: any) => (a.confidence ?? 0) * 100 >= 90)
    for (const a of highConf) {
      await approveMutation({ aiActionId: (a as any)._id as any })
    }
  }

  const maxMonthlyActions = Math.max(...MONTHLY_TREND.map((m) => m.actions))

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Actions</h1>
          <p className="text-muted-foreground">
            Monitor, review, and manage Oscar&apos;s AI-powered decisions across
            denial analysis, appeals, review responses, and patient outreach.
          </p>
        </div>
        <LoadingSkeleton />
      </div>
    )
  }

  const totalActions = stats?.totalActions ?? 0
  const approvedCount = stats?.approvedCount ?? 0
  const rejectedCount = stats?.rejectedCount ?? 0
  const approvalRate = stats?.approvalRate ?? 0
  const rejectionRate = totalActions > 0 ? Math.round((rejectedCount / totalActions) * 100 * 10) / 10 : 0

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
            <div className="text-2xl font-bold">{totalActions}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{approvedCount}</div>
            <p className="text-xs text-emerald-600/80">{approvalRate}% approval rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="size-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
            <p className="text-xs text-red-600/80">{rejectionRate}% rejection rate</p>
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
                ? `${totalActions > 0 ? ((pendingActions.length / totalActions) * 100).toFixed(1) : "0.0"}% awaiting review`
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
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Type</TableHead>
                    <TableHead className="w-auto">Description</TableHead>
                    <TableHead className="w-[140px]">Resource</TableHead>
                    <TableHead className="w-[100px]">Confidence</TableHead>
                    <TableHead className="w-[90px]">Created</TableHead>
                    <TableHead className="w-[200px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingActions.map((action) => {
                    const cfg = getTypeConfig(action.type)
                    return (
                      <TableRow key={action.id}>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cfg.color}
                          >
                            {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm line-clamp-2">{action.description}</span>
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
                    )
                  })}
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
                {Object.keys(TYPE_CONFIG).map((type) => (
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
                <SelectItem value="completed">Auto-Approved</SelectItem>
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
                  filteredHistory.map((item) => {
                    const cfg = getTypeConfig(item.type)
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(item.date)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cfg.color}
                          >
                            {cfg.label}
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
                    )
                  })
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
                  Oscar saved approximately {totalActions > 0 ? Math.round(totalActions * 0.14) : 47} hours this month
                </p>
                <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80">
                  Based on average manual processing time per action type across {totalActions} AI actions
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
                {ACCURACY_BY_TYPE.map((item) => {
                  const cfg = getTypeConfig(item.type)
                  return (
                    <div key={item.type} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span>{cfg.label}</span>
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
                  )
                })}
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
                    {AVG_CONFIDENCE_BY_TYPE.map((item) => {
                      const cfg = getTypeConfig(item.type)
                      return (
                        <TableRow key={item.type}>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={cfg.color}
                            >
                              {cfg.label}
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
                      )
                    })}
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
