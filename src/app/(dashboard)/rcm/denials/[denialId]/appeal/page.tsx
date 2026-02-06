"use client"

import { useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  CATEGORY_COLORS,
  type DenialCategory,
} from "@/components/rcm/denial-detail"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  Shield,
  Sparkles,
  User,
  XCircle,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Demo denial for the workspace
// ---------------------------------------------------------------------------

const DEMO_DENIAL = {
  id: "DEN-005",
  denialDate: "2026-01-30",
  patientName: "Lisa Patel",
  patientDob: "1995-09-12",
  patientInsurance: "Guardian DentalGuard",
  patientMemberId: "GDN-5567832",
  patientGroupNumber: "GRP-42010",
  payerId: "GDN001",
  payerName: "Guardian",
  reasonCode: "CO-16",
  reasonDescription:
    "Claim/service lacks information or has submission/billing error(s)",
  category: "documentation" as DenialCategory,
  amount: 650,
  aiConfidence: 0.91,
  claimNumber: "CLM-2026-00278",
  claimProcedures: [
    {
      code: "D2750",
      description: "Crown - porcelain fused to high noble metal",
      fee: 1200,
    },
    { code: "D2950", description: "Core buildup, including any pins", fee: 380 },
    { code: "D0220", description: "Periapical radiograph", fee: 35 },
  ],
  claimTotalCharged: 1615,
}

const CATEGORY_LABELS: Record<DenialCategory, string> = {
  eligibility: "Eligibility",
  coding: "Coding",
  documentation: "Documentation",
  authorization: "Authorization",
  timely_filing: "Timely Filing",
  duplicate: "Duplicate",
  other: "Other",
}

// ---------------------------------------------------------------------------
// AI-generated appeal letter content
// ---------------------------------------------------------------------------

const GENERATED_LETTER = `Dear Guardian Dental Claims Review Department,

Re: Appeal of Denied Claim CLM-2026-00278
Patient: Lisa Patel (DOB: 09/12/1995)
Member ID: GDN-5567832
Group: GRP-42010
Date of Service: 01/28/2026
Denial Reason: CO-16 — Claim lacks information or has submission/billing error(s)

I am writing to formally appeal the denial of the above-referenced claim for the following procedures performed on January 28, 2026:

  - D2750: Crown, porcelain fused to high noble metal — $1,200.00
  - D2950: Core buildup, including any pins — $380.00
  - D0220: Periapical radiograph — $35.00

Clinical Justification:
The patient presented with tooth #19 exhibiting significant structural compromise due to extensive carious destruction affecting the mesial, occlusal, and distal surfaces. A periapical radiograph (D0220) confirmed adequate root structure and no periapical pathology, supporting the viability of restorative treatment over extraction.

The core buildup (D2950) was clinically necessary as the remaining tooth structure was insufficient to retain a crown restoration. Per the ADA CDT coding guidelines, D2950 is separately reportable when performed as a distinct procedure to provide adequate retention for the indirect restoration.

The full-coverage crown (D2750) was indicated based on the extent of structural loss, which exceeded the capacity of a direct restoration to provide long-term function and fracture resistance. This is consistent with Guardian's own clinical criteria for crown coverage, which states that crowns are a covered benefit when "the tooth cannot be restored with a direct filling material."

Supporting Documentation Enclosed:
  1. Pre-operative periapical radiograph
  2. Clinical photographs showing extent of structural compromise
  3. Operative notes with detailed clinical findings
  4. ADA CDT 2026 coding reference for D2950/D2750 bundling clarification

Per your provider contract (effective 01/01/2026), Section 4.3, claims denied for insufficient documentation may be reconsidered upon submission of supporting clinical evidence within 180 days of the original denial date.

We respectfully request that this claim be reprocessed with the enclosed documentation. The total amount under appeal is $1,615.00. Please contact our office at (512) 555-0142 if additional information is needed.

Sincerely,
Dr. James Richardson, DDS
Canopy Dental
123 Main Street, Suite 200
Austin, TX 78701
NPI: 1234567890
Tax ID: 74-1234567`

// ---------------------------------------------------------------------------
// Lifecycle steps
// ---------------------------------------------------------------------------

type LifecycleStep = "draft" | "reviewed" | "submitted" | "outcome"

const LIFECYCLE_STEPS: { key: LifecycleStep; label: string }[] = [
  { key: "draft", label: "Draft" },
  { key: "reviewed", label: "Reviewed" },
  { key: "submitted", label: "Submitted" },
  { key: "outcome", label: "Outcome" },
]

function getStepIndex(step: LifecycleStep): number {
  return LIFECYCLE_STEPS.findIndex((s) => s.key === step)
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AppealWorkspacePage() {
  const params = useParams()
  const denialId = params.denialId as string

  const [currentStep, setCurrentStep] = useState<LifecycleStep>("draft")
  const [letterContent, setLetterContent] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationTime, setGenerationTime] = useState<number | null>(null)

  // Outcome fields
  const [outcome, setOutcome] = useState<string>("")
  const [recoveredAmount, setRecoveredAmount] = useState("")
  const [outcomeDate, setOutcomeDate] = useState("")
  const [outcomeNotes, setOutcomeNotes] = useState("")

  const currentStepIndex = getStepIndex(currentStep)
  const characterCount = letterContent.length

  const handleGenerate = useCallback(() => {
    setIsGenerating(true)
    setGenerationTime(null)

    const startTime = Date.now()
    setTimeout(() => {
      setLetterContent(GENERATED_LETTER)
      setIsGenerating(false)
      setGenerationTime((Date.now() - startTime) / 1000)
    }, 2000)
  }, [])

  const handleMarkReviewed = useCallback(() => {
    setCurrentStep("reviewed")
  }, [])

  const handleSubmit = useCallback(() => {
    setCurrentStep("submitted")
  }, [])

  const handleRecordOutcome = useCallback(() => {
    setCurrentStep("outcome")
  }, [])

  const denial = DEMO_DENIAL

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
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Appeal Workspace &mdash; {denialId}
          </h1>
          <p className="text-sm text-muted-foreground">
            Create, review, and submit appeals for denied claims
          </p>
        </div>
      </div>

      {/* Lifecycle bar */}
      <Card className="py-4">
        <CardContent>
          <div className="flex items-center justify-between">
            {LIFECYCLE_STEPS.map((step, idx) => {
              const stepIdx = idx
              const isCompleted = stepIdx < currentStepIndex
              const isCurrent = stepIdx === currentStepIndex
              const isFuture = stepIdx > currentStepIndex

              return (
                <div key={step.key} className="flex items-center flex-1 last:flex-initial">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
                        isCompleted &&
                          "border-green-500 bg-green-500 text-white",
                        isCurrent &&
                          "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
                        isFuture &&
                          "border-muted-foreground/30 text-muted-foreground/50"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle className="size-4" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        isCurrent && "text-blue-700 dark:text-blue-300",
                        isFuture && "text-muted-foreground/50",
                        isCompleted && "text-green-700 dark:text-green-300"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < LIFECYCLE_STEPS.length - 1 && (
                    <div
                      className={cn(
                        "flex-1 h-0.5 mx-3",
                        stepIdx < currentStepIndex
                          ? "bg-green-500"
                          : "bg-muted-foreground/20"
                      )}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left panel - 40% */}
        <div className="lg:col-span-2 space-y-4">
          {/* Denial summary */}
          <Card className="py-4">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertTriangle className="size-4 text-red-500" />
                Denial Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold">
                  {denial.reasonCode}
                </span>
                <Badge
                  className={cn(
                    "border-0 text-xs",
                    CATEGORY_COLORS[denial.category]
                  )}
                >
                  {CATEGORY_LABELS[denial.category]}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {denial.reasonDescription}
              </p>
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="font-semibold">
                    ${denial.amount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payer</p>
                  <p>{denial.payerName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Denial Date</p>
                  <p>{denial.denialDate}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Confidence</p>
                  <p>{Math.round(denial.aiConfidence * 100)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Patient card */}
          <Card className="py-4">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <User className="size-4 text-blue-500" />
                Patient
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{denial.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">DOB</span>
                <span>{denial.patientDob}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Insurance</span>
                <span>{denial.patientInsurance}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Member ID</span>
                <span className="font-mono text-xs">
                  {denial.patientMemberId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Group</span>
                <span className="font-mono text-xs">
                  {denial.patientGroupNumber}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Claim summary */}
          <Card className="py-4">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="size-4 text-emerald-500" />
                Claim Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <p className="text-xs text-muted-foreground">Claim #</p>
                <p className="font-mono font-medium">{denial.claimNumber}</p>
              </div>
              <div className="space-y-2">
                {denial.claimProcedures.map((proc) => (
                  <div
                    key={proc.code}
                    className="flex items-center justify-between text-sm border-b border-dashed pb-1.5 last:border-0"
                  >
                    <div>
                      <span className="font-mono text-xs font-medium">
                        {proc.code}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {proc.description}
                      </p>
                    </div>
                    <span className="font-medium tabular-nums">
                      ${proc.fee.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-semibold">
                <span>Total Charged</span>
                <span>${denial.claimTotalCharged.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right panel - 60% */}
        <div className="lg:col-span-3 space-y-4">
          {/* Appeal letter */}
          <Card className="py-4">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FileText className="size-4" />
                  Appeal Letter
                </CardTitle>
                {generationTime != null && (
                  <Badge className="border-0 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <CheckCircle className="size-3" />
                    Generated in {generationTime.toFixed(1)}s
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Generating appeal letter...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Generate with AI
                  </>
                )}
              </Button>

              <div className="relative">
                <Textarea
                  value={letterContent}
                  onChange={(e) => setLetterContent(e.target.value)}
                  placeholder="Appeal letter content will appear here after AI generation, or you can write manually..."
                  rows={20}
                  className="min-h-[500px] font-mono text-xs leading-relaxed resize-y"
                />
                <div className="absolute bottom-2 right-3 text-xs text-muted-foreground tabular-nums">
                  {characterCount.toLocaleString()} characters
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={!letterContent}>
                  Save Draft
                </Button>
                {currentStep === "draft" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!letterContent}
                    onClick={handleMarkReviewed}
                  >
                    <CheckCircle className="size-3.5" />
                    Mark as Reviewed
                  </Button>
                )}
                <Button
                  size="sm"
                  disabled={
                    !letterContent ||
                    currentStep === "draft" ||
                    currentStep === "submitted" ||
                    currentStep === "outcome"
                  }
                  onClick={handleSubmit}
                >
                  <ArrowRight className="size-3.5" />
                  Submit Appeal
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Outcome recording — only shown when submitted or later */}
          {(currentStep === "submitted" || currentStep === "outcome") && (
            <Card className="py-4">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Shield className="size-4 text-blue-500" />
                  Record Outcome
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="outcome">Outcome</Label>
                    <Select value={outcome} onValueChange={setOutcome}>
                      <SelectTrigger id="outcome">
                        <SelectValue placeholder="Select outcome" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="won">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle className="size-3 text-green-500" />
                            Won
                          </span>
                        </SelectItem>
                        <SelectItem value="lost">
                          <span className="flex items-center gap-1.5">
                            <XCircle className="size-3 text-red-500" />
                            Lost
                          </span>
                        </SelectItem>
                        <SelectItem value="partial">
                          <span className="flex items-center gap-1.5">
                            <Clock className="size-3 text-amber-500" />
                            Partial
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="recovered">Amount Recovered ($)</Label>
                    <Input
                      id="recovered"
                      type="number"
                      placeholder="0.00"
                      value={recoveredAmount}
                      onChange={(e) => setRecoveredAmount(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="outcomeDate">Outcome Date</Label>
                    <Input
                      id="outcomeDate"
                      type="date"
                      value={outcomeDate}
                      onChange={(e) => setOutcomeDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="outcomeNotes">Notes</Label>
                  <Textarea
                    id="outcomeNotes"
                    placeholder="Additional notes about the outcome..."
                    rows={3}
                    value={outcomeNotes}
                    onChange={(e) => setOutcomeNotes(e.target.value)}
                  />
                </div>

                <Button
                  disabled={!outcome || !recoveredAmount || currentStep === "outcome"}
                  onClick={handleRecordOutcome}
                >
                  {currentStep === "outcome" ? (
                    <>
                      <CheckCircle className="size-4" />
                      Outcome Recorded
                    </>
                  ) : (
                    "Record Outcome"
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
