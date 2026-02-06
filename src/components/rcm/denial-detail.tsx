"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  AlertTriangle,
  Clock,
  Shield,
  FileText,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DenialCategory =
  | "eligibility"
  | "coding"
  | "documentation"
  | "authorization"
  | "timely_filing"
  | "duplicate"
  | "other"

export type DenialStatus =
  | "new"
  | "acknowledged"
  | "appealing"
  | "appealed"
  | "won"
  | "lost"
  | "partial"
  | "written_off"

export interface DenialData {
  id: string
  denialDate: string
  patientName: string
  patientDob?: string
  patientInsurance?: string
  patientMemberId?: string
  payerId: string
  payerName: string
  reasonCode: string
  reasonDescription: string
  category: DenialCategory
  amount: number
  status: DenialStatus
  aiConfidence: number
  assignedTo?: string
  slaDeadline?: number
  isEscalated?: boolean
  claimNumber?: string
  claimProcedures?: { code: string; description: string; fee: number }[]
  claimTotalCharged?: number
  appealStatus?: string
  appealLetterSnippet?: string
  createdAt: number
}

// ---------------------------------------------------------------------------
// Color maps
// ---------------------------------------------------------------------------

export const CATEGORY_COLORS: Record<DenialCategory, string> = {
  eligibility: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  coding: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  documentation: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  authorization: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  timely_filing: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  duplicate: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  other: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
}

export const STATUS_COLORS: Record<DenialStatus, string> = {
  new: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  acknowledged: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  appealing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  appealed: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
  won: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  lost: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  partial: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  written_off: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
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
// Confidence bar
// ---------------------------------------------------------------------------

function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100)
  const color =
    pct >= 80
      ? "bg-green-500"
      : pct >= 60
        ? "bg-yellow-500"
        : "bg-red-500"

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums">{pct}%</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SLA helpers
// ---------------------------------------------------------------------------

export function getSlaDisplay(denial: DenialData): {
  text: string
  color: string
  isPulsing: boolean
} {
  if (denial.status !== "new" || !denial.slaDeadline) {
    return { text: "\u2014", color: "", isPulsing: false }
  }

  const now = Date.now()
  const remaining = denial.slaDeadline - now
  if (remaining <= 0) {
    return { text: "OVERDUE", color: "text-red-600", isPulsing: true }
  }

  const hours = Math.floor(remaining / (1000 * 60 * 60))
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
  const text = `${hours}h ${minutes}m left`

  if (hours < 6) {
    return { text, color: "text-yellow-600", isPulsing: false }
  }
  return { text, color: "text-green-600", isPulsing: false }
}

// ---------------------------------------------------------------------------
// DenialDetail component
// ---------------------------------------------------------------------------

interface DenialDetailProps {
  denial: DenialData
}

export function DenialDetail({ denial }: DenialDetailProps) {
  const sla = getSlaDisplay(denial)

  return (
    <div className="space-y-4 py-4 px-2">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Denial details */}
        <Card className="py-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="size-4 text-red-500" />
              Denial Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Reason Code</p>
              <p className="font-mono text-sm font-medium">{denial.reasonCode}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Description</p>
              <p className="text-sm">{denial.reasonDescription}</p>
            </div>
            <div className="flex gap-6">
              <div>
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="text-sm font-semibold">${denial.amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-sm">{denial.denialDate}</p>
              </div>
            </div>
            {denial.status === "new" && (
              <div>
                <p className="text-xs text-muted-foreground">SLA</p>
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  <span className={cn("text-sm font-medium", sla.color)}>
                    {sla.isPulsing && (
                      <span className="inline-block size-2 rounded-full bg-red-500 animate-pulse mr-1.5" />
                    )}
                    {sla.text}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Categorization */}
        <Card className="py-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Shield className="size-4 text-blue-500" />
              AI Categorization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className={cn("border-0", CATEGORY_COLORS[denial.category])}>
                {CATEGORY_LABELS[denial.category]}
              </Badge>
              <Badge className={cn("border-0", STATUS_COLORS[denial.status])}>
                {STATUS_LABELS[denial.status]}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">
                {CATEGORY_LABELS[denial.category]} Issue &mdash; Confidence
              </p>
              <ConfidenceBar confidence={denial.aiConfidence} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Payer</p>
              <p className="text-sm">{denial.payerName}</p>
            </div>
          </CardContent>
        </Card>

        {/* Linked Claim */}
        <Card className="py-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileText className="size-4 text-emerald-500" />
              Linked Claim
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {denial.claimNumber && (
              <div>
                <p className="text-xs text-muted-foreground">Claim #</p>
                <p className="text-sm font-mono">{denial.claimNumber}</p>
              </div>
            )}
            {denial.claimProcedures && denial.claimProcedures.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Procedures</p>
                <div className="space-y-1">
                  {denial.claimProcedures.map((proc) => (
                    <div
                      key={proc.code}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="font-mono">{proc.code}</span>
                      <span className="text-muted-foreground truncate max-w-[120px]">
                        {proc.description}
                      </span>
                      <span className="font-medium">${proc.fee.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {denial.claimTotalCharged != null && (
              <>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Charged</span>
                  <span className="font-semibold">
                    ${denial.claimTotalCharged.toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Appeal status if exists */}
      {denial.appealStatus && (
        <Card className="py-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Appeal Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Badge className={cn("border-0", STATUS_COLORS[denial.status])}>
              {denial.appealStatus}
            </Badge>
            {denial.appealLetterSnippet && (
              <p className="text-sm text-muted-foreground italic line-clamp-2">
                &ldquo;{denial.appealLetterSnippet}&rdquo;
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
