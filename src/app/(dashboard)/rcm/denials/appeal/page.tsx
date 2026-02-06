"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { Id } from "../../../../../../convex/_generated/dataModel"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  CATEGORY_COLORS,
  STATUS_COLORS,
  type DenialCategory,
  type DenialStatus,
} from "@/components/rcm/denial-detail"
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  Send,
  Shield,
  TrendingDown,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Label maps
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<DenialCategory, string> = {
  eligibility: "Eligibility",
  coding: "Coding",
  documentation: "Documentation",
  authorization: "Authorization",
  timely_filing: "Timely Filing",
  duplicate: "Duplicate",
  other: "Other",
}

const STATUS_LABELS: Record<DenialStatus, string> = {
  new: "New",
  acknowledged: "Acknowledged",
  appealing: "Appealing",
  appealed: "Appealed",
  won: "Won",
  lost: "Lost",
  partial: "Partial",
  written_off: "Written Off",
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_DENIAL_DETAIL = {
  _id: "mock_denial_1" as Id<"denials">,
  id: "DEN-008",
  patientName: "Karen Nguyen",
  patientDob: "1987-07-09",
  patientInsurance: "Delta Dental Premier",
  patientMemberId: "DD-6678432",
  payerId: "DD001",
  payerName: "Delta Dental",
  reasonCode: "CO-16",
  reasonDescription:
    "Claim/service lacks information or has submission/billing error(s). The submitted documentation does not support medical necessity for the crown procedure.",
  category: "documentation" as DenialCategory,
  amount: 1800.0,
  status: "appealing" as DenialStatus,
  denialDate: "2026-01-25",
  aiCategorization:
    "Documentation deficiency - Missing narrative and radiographic evidence supporting medical necessity for crown D2740. The payer requires a written narrative describing the clinical condition and pre-operative radiographs.",
  aiConfidence: 0.89,
  aiSuggestedAction:
    "Submit appeal with periapical radiograph, clinical photographs showing fractured cusp, and a narrative describing the extent of decay and structural compromise. Reference ADA CDT guidelines for D2740 medical necessity criteria.",
  claimNumber: "CLM-2026-00198",
  claimDateOfService: "2026-01-18",
  claimProvider: "Dr. Emily Park, DDS",
  claimProcedures: [
    {
      code: "D2740",
      description: "Crown - porcelain/ceramic",
      fee: 1100,
      dateOfService: "2026-01-18",
    },
    {
      code: "D2950",
      description: "Core buildup, including any pins",
      fee: 380,
      dateOfService: "2026-01-18",
    },
    {
      code: "D0220",
      description: "Periapical radiograph",
      fee: 35,
      dateOfService: "2026-01-18",
    },
  ],
  claimTotalCharged: 1515,
  assignedTo: "Maria Santos",
  createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
}

const MOCK_PAYER_STATS = {
  payerName: "Delta Dental",
  totalDenials: 42,
  denialRate: 8.3,
  avgDaysToPay: 28,
  topDenialReasons: [
    { code: "CO-16", description: "Missing information", count: 18 },
    { code: "CO-4", description: "Modifier mismatch", count: 12 },
    { code: "PR-1", description: "Deductible", count: 7 },
  ],
  appealSuccessRate: 72,
}

const MOCK_APPEAL = {
  _id: "mock_appeal_1" as Id<"appeals">,
  denialId: "mock_denial_1" as Id<"denials">,
  status: "draft" as "draft" | "reviewed" | "submitted",
  letterContent: `Dear Delta Dental Claims Department,

RE: Appeal of Claim Denial
Claim Number: CLM-2026-00198
Patient: Karen Nguyen (DOB: 07/09/1987)
Member ID: DD-6678432
Date of Service: 01/18/2026
Denied Amount: $1,800.00
Denial Reason: CO-16 - Claim/service lacks information

We are writing to formally appeal the denial of the above-referenced claim for crown (D2740) and core buildup (D2950) procedures performed on tooth #14.

CLINICAL JUSTIFICATION:

The patient presented on 01/18/2026 with a fractured mesiolingual cusp on tooth #14. Clinical examination revealed:
- Existing large MOD amalgam restoration with recurrent decay
- Fractured mesiolingual cusp extending below the gingival margin
- Remaining tooth structure insufficient to support a direct restoration
- Periapical radiograph confirmed no periapical pathology; tooth is vital

Per ADA CDT guidelines, a crown (D2740) is indicated when the remaining tooth structure is insufficient to retain a direct restoration. The core buildup (D2950) was necessary due to the extent of tooth structure loss following removal of the existing restoration and carious tissue.

ENCLOSED SUPPORTING DOCUMENTATION:
1. Pre-operative periapical radiograph (tooth #14)
2. Clinical photographs showing fractured cusp and extent of decay
3. Narrative of clinical findings and treatment rationale
4. Copy of patient's treatment plan with signed consent

We respectfully request reconsideration of this denial. The procedures performed were clinically necessary and consistent with the standard of care for the diagnosed condition.

Should you require any additional information, please contact our office at (512) 555-0142.

Sincerely,

Dr. Emily Park, DDS
Canopy Dental
License #: TX-48291`,
  aiGeneratedAt: Date.now() - 3600000,
  createdAt: Date.now() - 7200000,
  updatedAt: Date.now() - 3600000,
}

const MOCK_TIMELINE = [
  {
    date: Date.now() - 10 * 24 * 60 * 60 * 1000,
    event: "Denial received",
    description: "Claim CLM-2026-00198 denied by Delta Dental with reason code CO-16",
    type: "denial" as const,
  },
  {
    date: Date.now() - 10 * 24 * 60 * 60 * 1000 + 45000,
    event: "AI categorized",
    description: "Automatically categorized as Documentation issue with 89% confidence",
    type: "ai" as const,
  },
  {
    date: Date.now() - 9 * 24 * 60 * 60 * 1000,
    event: "Acknowledged",
    description: "Denial acknowledged by Maria Santos",
    type: "action" as const,
  },
  {
    date: Date.now() - 8 * 24 * 60 * 60 * 1000,
    event: "Assigned to Maria Santos",
    description: "Routed to billing team for appeal preparation",
    type: "action" as const,
  },
  {
    date: Date.now() - 7 * 24 * 60 * 60 * 1000,
    event: "Appeal letter generated",
    description: "AI-drafted appeal letter based on denial reason and claim context",
    type: "ai" as const,
  },
  {
    date: Date.now() - 6 * 24 * 60 * 60 * 1000,
    event: "Appeal in progress",
    description: "Status changed to Appealing - letter under review",
    type: "action" as const,
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const TIMELINE_ICONS: Record<string, typeof AlertTriangle> = {
  denial: AlertTriangle,
  ai: Bot,
  action: CheckCircle,
}

const TIMELINE_COLORS: Record<string, string> = {
  denial: "text-red-500",
  ai: "text-blue-500",
  action: "text-green-500",
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AppealWorkspacePage() {
  const denial = MOCK_DENIAL_DETAIL
  const payerStats = MOCK_PAYER_STATS

  const [appealStatus, setAppealStatus] = useState<"draft" | "reviewed" | "submitted">(
    MOCK_APPEAL.status
  )
  const [letterContent, setLetterContent] = useState(MOCK_APPEAL.letterContent)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [timeline, setTimeline] = useState(MOCK_TIMELINE)

  function handleGenerateLetter() {
    setIsGenerating(true)
    // Simulate AI generation delay
    setTimeout(() => {
      setLetterContent(MOCK_APPEAL.letterContent)
      setIsGenerating(false)
      setTimeline((prev) => [
        ...prev,
        {
          date: Date.now(),
          event: "Appeal letter regenerated",
          description: "AI re-drafted appeal letter with updated context",
          type: "ai" as const,
        },
      ])
    }, 2000)
  }

  function handleMarkReviewed() {
    setAppealStatus("reviewed")
    setTimeline((prev) => [
      ...prev,
      {
        date: Date.now(),
        event: "Letter marked as reviewed",
        description: "Appeal letter reviewed and approved for submission",
        type: "action" as const,
      },
    ])
  }

  function handleSubmitAppeal() {
    setIsSubmitting(true)
    setTimeout(() => {
      setAppealStatus("submitted")
      setIsSubmitting(false)
      setTimeline((prev) => [
        ...prev,
        {
          date: Date.now(),
          event: "Appeal submitted",
          description: "Appeal letter submitted to Delta Dental via Vyne Dental",
          type: "action" as const,
        },
      ])
    }, 1500)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <a href="/rcm/denials">
            <ArrowLeft className="size-4" />
            Back to Denials
          </a>
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Appeal Workspace</h1>
            <Badge className={cn("border-0", STATUS_COLORS[denial.status])}>
              {STATUS_LABELS[denial.status]}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {denial.id} &mdash; {denial.patientName} &mdash; {denial.payerName} &mdash;{" "}
            ${denial.amount.toLocaleString()}
          </p>
        </div>
        <AppealStatusBadge status={appealStatus} />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column - Context (2/5 width) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Denial details card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertTriangle className="size-4 text-red-500" />
                Denial Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Patient</p>
                  <p className="text-sm font-medium">{denial.patientName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">DOB</p>
                  <p className="text-sm">{denial.patientDob}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Insurance</p>
                  <p className="text-sm">{denial.patientInsurance}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Member ID</p>
                  <p className="text-sm font-mono">{denial.patientMemberId}</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-xs text-muted-foreground">Reason Code</p>
                <p className="text-sm font-mono font-medium">{denial.reasonCode}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="text-sm">{denial.reasonDescription}</p>
              </div>

              <div className="flex gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="text-sm font-semibold">${denial.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Denial Date</p>
                  <p className="text-sm">{formatShortDate(denial.denialDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <Badge className={cn("border-0 text-xs", CATEGORY_COLORS[denial.category])}>
                    {CATEGORY_LABELS[denial.category]}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Categorization card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Shield className="size-4 text-blue-500" />
                AI Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Categorization</p>
                <p className="text-sm">{denial.aiCategorization}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Confidence</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        denial.aiConfidence >= 0.8
                          ? "bg-green-500"
                          : denial.aiConfidence >= 0.6
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      )}
                      style={{ width: `${Math.round(denial.aiConfidence * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium tabular-nums">
                    {Math.round(denial.aiConfidence * 100)}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Suggested Action</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {denial.aiSuggestedAction}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Original claim details card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="size-4 text-emerald-500" />
                Original Claim
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Claim #</p>
                  <p className="text-sm font-mono">{denial.claimNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date of Service</p>
                  <p className="text-sm">{formatShortDate(denial.claimDateOfService)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Provider</p>
                  <p className="text-sm">{denial.claimProvider}</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-xs text-muted-foreground mb-2">Procedures</p>
                <div className="space-y-2">
                  {denial.claimProcedures.map((proc) => (
                    <div
                      key={proc.code}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">{proc.code}</span>
                        <span className="text-muted-foreground">{proc.description}</span>
                      </div>
                      <span className="font-medium">${proc.fee.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Charged</span>
                <span className="font-semibold">
                  ${denial.claimTotalCharged.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Payer behavior card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingDown className="size-4 text-purple-500" />
                Payer Behavior &mdash; {payerStats.payerName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Denial Rate</p>
                  <p className="text-lg font-bold">{payerStats.denialRate}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Days to Pay</p>
                  <p className="text-lg font-bold">{payerStats.avgDaysToPay}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Appeal Success</p>
                  <p className="text-lg font-bold text-green-600">
                    {payerStats.appealSuccessRate}%
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Top Denial Reasons ({payerStats.totalDenials} total)
                </p>
                <div className="space-y-1.5">
                  {payerStats.topDenialReasons.map((reason) => (
                    <div
                      key={reason.code}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{reason.code}</span>
                        <span className="text-muted-foreground">{reason.description}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs h-5 px-1.5">
                        {reason.count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Appeal workspace (3/5 width) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Appeal letter workspace */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FileText className="size-4" />
                  Appeal Letter
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateLetter}
                    disabled={isGenerating || appealStatus === "submitted"}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Bot className="size-4" />
                        {letterContent ? "Regenerate" : "Generate"} Appeal Letter
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                  <Loader2 className="size-8 animate-spin text-blue-500" />
                  <p className="text-sm">AI is analyzing the denial and generating appeal letter...</p>
                  <p className="text-xs">
                    Using denial reason, claim history, and payer-specific patterns
                  </p>
                </div>
              ) : (
                <>
                  <Textarea
                    value={letterContent}
                    onChange={(e) => setLetterContent(e.target.value)}
                    disabled={appealStatus === "submitted"}
                    className="min-h-[500px] font-mono text-sm leading-relaxed"
                    placeholder="Click 'Generate Appeal Letter' to create an AI-drafted letter based on the denial context..."
                  />
                  {letterContent && (
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {letterContent.length.toLocaleString()} characters &mdash; Last AI
                        generation:{" "}
                        {formatDate(MOCK_APPEAL.aiGeneratedAt)}
                      </p>
                      <div className="flex items-center gap-2">
                        {appealStatus === "draft" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleMarkReviewed}
                          >
                            <CheckCircle className="size-4" />
                            Mark as Reviewed
                          </Button>
                        )}
                        {appealStatus !== "submitted" && (
                          <Button
                            size="sm"
                            onClick={handleSubmitAppeal}
                            disabled={
                              isSubmitting || appealStatus === "draft"
                            }
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="size-4 animate-spin" />
                                Submitting...
                              </>
                            ) : (
                              <>
                                <Send className="size-4" />
                                Submit Appeal
                              </>
                            )}
                          </Button>
                        )}
                        {appealStatus === "submitted" && (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-0">
                            <CheckCircle className="size-3 mr-1" />
                            Submitted
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Appeal status workflow */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Appeal Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AppealStep
                  label="Draft"
                  isActive={appealStatus === "draft"}
                  isCompleted={
                    appealStatus === "reviewed" || appealStatus === "submitted"
                  }
                />
                <StepConnector
                  isCompleted={
                    appealStatus === "reviewed" || appealStatus === "submitted"
                  }
                />
                <AppealStep
                  label="Reviewed"
                  isActive={appealStatus === "reviewed"}
                  isCompleted={appealStatus === "submitted"}
                />
                <StepConnector isCompleted={appealStatus === "submitted"} />
                <AppealStep
                  label="Submitted"
                  isActive={appealStatus === "submitted"}
                  isCompleted={false}
                />
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="size-4" />
                Appeal Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {[...timeline].reverse().map((entry, idx) => {
                  const Icon = TIMELINE_ICONS[entry.type] ?? CheckCircle
                  const color = TIMELINE_COLORS[entry.type] ?? "text-gray-500"
                  const isLast = idx === timeline.length - 1

                  return (
                    <div key={idx} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={cn(
                            "flex size-7 items-center justify-center rounded-full border-2 bg-background",
                            idx === 0
                              ? "border-blue-500"
                              : "border-muted"
                          )}
                        >
                          <Icon className={cn("size-3.5", color)} />
                        </div>
                        {!isLast && (
                          <div className="w-px flex-1 bg-border min-h-[24px]" />
                        )}
                      </div>
                      <div className={cn("pb-4", isLast && "pb-0")}>
                        <p className="text-sm font-medium">{entry.event}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(entry.date)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function AppealStatusBadge({ status }: { status: "draft" | "reviewed" | "submitted" }) {
  const config = {
    draft: {
      label: "Draft",
      className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    },
    reviewed: {
      label: "Reviewed",
      className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    },
    submitted: {
      label: "Submitted",
      className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    },
  }

  const c = config[status]
  return (
    <Badge className={cn("border-0 text-xs", c.className)}>
      Appeal: {c.label}
    </Badge>
  )
}

function AppealStep({
  label,
  isActive,
  isCompleted,
}: {
  label: string
  isActive: boolean
  isCompleted: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
        isActive && "border-blue-500 bg-blue-50 dark:bg-blue-950",
        isCompleted && "border-green-500 bg-green-50 dark:bg-green-950",
        !isActive && !isCompleted && "border-muted bg-muted/30"
      )}
    >
      {isCompleted ? (
        <CheckCircle className="size-4 text-green-500" />
      ) : isActive ? (
        <div className="size-4 rounded-full border-2 border-blue-500 flex items-center justify-center">
          <div className="size-2 rounded-full bg-blue-500" />
        </div>
      ) : (
        <div className="size-4 rounded-full border-2 border-muted-foreground/30" />
      )}
      <span
        className={cn(
          "font-medium",
          isCompleted && "text-green-700 dark:text-green-300",
          isActive && "text-blue-700 dark:text-blue-300",
          !isActive && !isCompleted && "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </div>
  )
}

function StepConnector({ isCompleted }: { isCompleted: boolean }) {
  return (
    <div
      className={cn(
        "h-0.5 w-8 flex-shrink-0",
        isCompleted ? "bg-green-500" : "bg-muted"
      )}
    />
  )
}
