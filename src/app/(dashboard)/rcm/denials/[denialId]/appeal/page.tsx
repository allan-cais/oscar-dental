"use client"

import React, { useState, useCallback } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../../../../convex/_generated/api"
import type { Id } from "../../../../../../../convex/_generated/dataModel"
import { toast } from "sonner"
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
  Plus,
  Shield,
  Sparkles,
  User,
  XCircle,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Category labels
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

function deriveLifecycleStep(appealStatus: string | undefined): LifecycleStep {
  if (!appealStatus) return "draft"
  switch (appealStatus) {
    case "draft":
      return "draft"
    case "reviewed":
      return "reviewed"
    case "submitted":
      return "submitted"
    case "won":
    case "lost":
    case "partial":
      return "outcome"
    default:
      return "draft"
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AppealWorkspacePage({
  params,
}: {
  params: Promise<{ denialId: string }>
}) {
  const { denialId } = React.use(params)

  // Queries
  const denial = useQuery(
    (api as any).denials.queries.getById,
    { denialId: denialId as Id<"denials"> }
  )
  const appeal = useQuery(
    (api as any).appeals.queries.getByDenial,
    { denialId: denialId as Id<"denials"> }
  )
  const patient = useQuery(
    api.patients.queries.getById,
    denial ? { patientId: (denial as any).patientId } : "skip"
  )
  const claim = useQuery(
    (api as any).claims.queries.getById,
    denial ? { claimId: (denial as any).claimId } : "skip"
  )

  // Mutations
  const createAppeal = useMutation((api as any).appeals.mutations.create)
  const generateLetter = useMutation((api as any).appeals.mutations.generateLetter)
  const updateLetterMutation = useMutation((api as any).appeals.mutations.updateLetter)
  const submitAppeal = useMutation((api as any).appeals.mutations.submit)
  const recordOutcomeMutation = useMutation((api as any).appeals.mutations.recordOutcome)

  // Local state
  const [letterContent, setLetterContent] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationTime, setGenerationTime] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [letterInitialized, setLetterInitialized] = useState(false)

  // Outcome fields
  const [outcome, setOutcome] = useState<string>("")
  const [recoveredAmount, setRecoveredAmount] = useState("")
  const [outcomeDate, setOutcomeDate] = useState("")
  const [outcomeNotes, setOutcomeNotes] = useState("")

  // Sync letter content from appeal when it loads
  if (appeal && (appeal as any).letterContent && !letterInitialized) {
    setLetterContent((appeal as any).letterContent)
    setLetterInitialized(true)
  }

  const currentStep = deriveLifecycleStep(appeal ? (appeal as any).status : undefined)
  const currentStepIndex = getStepIndex(currentStep)
  const characterCount = letterContent.length

  // --- Handlers ---

  const handleCreateAppeal = useCallback(async () => {
    if (!denial) return
    try {
      await createAppeal({
        denialId: denialId as Id<"denials">,
        claimId: (denial as any).claimId,
        patientId: (denial as any).patientId,
      })
      toast.success("Appeal created")
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create appeal")
    }
  }, [denial, denialId, createAppeal])

  const handleGenerate = useCallback(async () => {
    if (!appeal) return
    setIsGenerating(true)
    setGenerationTime(null)
    try {
      const startTime = Date.now()
      const result = await generateLetter({ appealId: (appeal as any)._id })
      setLetterContent((result as any).letterContent)
      setGenerationTime((Date.now() - startTime) / 1000)
      setLetterInitialized(true)
      toast.success("Appeal letter generated")
    } catch (err: any) {
      toast.error(err.message ?? "Failed to generate letter")
    } finally {
      setIsGenerating(false)
    }
  }, [appeal, generateLetter])

  const handleSaveDraft = useCallback(async () => {
    if (!appeal || !letterContent) return
    try {
      await updateLetterMutation({
        appealId: (appeal as any)._id,
        content: letterContent,
      })
      toast.success("Draft saved")
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save draft")
    }
  }, [appeal, letterContent, updateLetterMutation])

  const handleMarkReviewed = useCallback(async () => {
    if (!appeal || !letterContent) return
    try {
      await updateLetterMutation({
        appealId: (appeal as any)._id,
        content: letterContent,
      })
      toast.success("Letter saved and marked as reviewed")
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save letter")
    }
  }, [appeal, letterContent, updateLetterMutation])

  const handleSubmit = useCallback(async () => {
    if (!appeal) return
    setIsSubmitting(true)
    try {
      await submitAppeal({ appealId: (appeal as any)._id })
      toast.success("Appeal submitted successfully")
    } catch (err: any) {
      toast.error(err.message ?? "Failed to submit appeal")
    } finally {
      setIsSubmitting(false)
    }
  }, [appeal, submitAppeal])

  const handleRecordOutcome = useCallback(async () => {
    if (!appeal || !outcome || !recoveredAmount) return
    try {
      await recordOutcomeMutation({
        appealId: (appeal as any)._id,
        outcome: outcome as "won" | "lost" | "partial",
        outcomeAmount: parseFloat(recoveredAmount),
        outcomeDate: outcomeDate || undefined,
        outcomeNotes: outcomeNotes || undefined,
      })
      toast.success("Outcome recorded")
    } catch (err: any) {
      toast.error(err.message ?? "Failed to record outcome")
    }
  }, [appeal, outcome, recoveredAmount, outcomeDate, outcomeNotes, recordOutcomeMutation])

  // --- Loading state ---

  if (denial === undefined) {
    return (
      <div className="space-y-6">
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
              Appeal Workspace
            </h1>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="py-4">
                <CardContent>
                  <div className="h-32 animate-pulse rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="lg:col-span-3">
            <Card className="py-4">
              <CardContent>
                <div className="h-96 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (denial === null) {
    return (
      <div className="space-y-6">
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
              Appeal Workspace
            </h1>
            <p className="text-sm text-muted-foreground">Denial not found</p>
          </div>
        </div>
      </div>
    )
  }

  const d = denial as any
  const patientName = patient
    ? `${(patient as any).firstName} ${(patient as any).lastName}`
    : "Loading..."
  const patientDob = patient ? (patient as any).dateOfBirth ?? "" : ""
  const claimData = claim as any
  const procedures: Array<{ code: string; description: string; fee: number }> =
    claimData?.procedures ?? []
  const totalCharged = claimData?.totalCharged ?? 0
  const claimNumber = claimData?.claimNumber ?? d.claimId

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
            Appeal Workspace &mdash; {d.reasonCode}
          </h1>
          <p className="text-sm text-muted-foreground">
            Create, review, and submit appeals for denied claims
          </p>
        </div>
      </div>

      {/* No appeal yet — show create button */}
      {appeal === null && (
        <Card className="py-4">
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <p className="text-muted-foreground text-sm">
              No appeal has been created for this denial yet.
            </p>
            <Button onClick={handleCreateAppeal}>
              <Plus className="size-4" />
              Create Appeal
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Appeal exists — show full workspace */}
      {appeal && (
        <>
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
                      {d.reasonCode}
                    </span>
                    {d.category && (
                      <Badge
                        className={cn(
                          "border-0 text-xs",
                          CATEGORY_COLORS[d.category as DenialCategory]
                        )}
                      >
                        {CATEGORY_LABELS[d.category as DenialCategory]}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {d.reasonDescription}
                  </p>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Amount</p>
                      <p className="font-semibold">
                        ${(d.amount ?? 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Payer</p>
                      <p>{d.payerName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Denial Date</p>
                      <p>{d.denialDate}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Confidence</p>
                      <p>{d.aiConfidence ? `${Math.round(d.aiConfidence * 100)}%` : "N/A"}</p>
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
                    <span className="font-medium">{patientName}</span>
                  </div>
                  {patientDob && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">DOB</span>
                      <span>{patientDob}</span>
                    </div>
                  )}
                  {patient && (patient as any).insuranceName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Insurance</span>
                      <span>{(patient as any).insuranceName}</span>
                    </div>
                  )}
                  {patient && (patient as any).insuranceMemberId && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Member ID</span>
                      <span className="font-mono text-xs">
                        {(patient as any).insuranceMemberId}
                      </span>
                    </div>
                  )}
                  {patient && (patient as any).insuranceGroupNumber && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Group</span>
                      <span className="font-mono text-xs">
                        {(patient as any).insuranceGroupNumber}
                      </span>
                    </div>
                  )}
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
                    <p className="font-mono font-medium">{claimNumber}</p>
                  </div>
                  {procedures.length > 0 ? (
                    <div className="space-y-2">
                      {procedures.map((proc) => (
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
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No procedure details available
                    </p>
                  )}
                  {totalCharged > 0 && (
                    <>
                      <Separator />
                      <div className="flex justify-between text-sm font-semibold">
                        <span>Total Charged</span>
                        <span>${totalCharged.toLocaleString()}</span>
                      </div>
                    </>
                  )}
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
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!letterContent}
                      onClick={handleSaveDraft}
                    >
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
                        isSubmitting ||
                        currentStep === "draft" ||
                        currentStep === "submitted" ||
                        currentStep === "outcome"
                      }
                      onClick={handleSubmit}
                    >
                      {isSubmitting ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <ArrowRight className="size-3.5" />
                      )}
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
        </>
      )}
    </div>
  )
}
