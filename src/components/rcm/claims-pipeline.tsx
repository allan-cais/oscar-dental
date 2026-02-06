"use client"

import { cn } from "@/lib/utils"
import { ArrowRight } from "lucide-react"

export type ClaimStatus =
  | "draft"
  | "scrubbing"
  | "scrub_failed"
  | "ready"
  | "submitted"
  | "accepted"
  | "paid"
  | "denied"
  | "appealed"

interface PipelineStep {
  status: ClaimStatus
  label: string
  count: number
  color: string
  bgColor: string
  ringColor: string
}

interface ClaimsPipelineProps {
  counts: Record<ClaimStatus, number>
  activeStatus: ClaimStatus | null
  onStatusClick: (status: ClaimStatus | null) => void
}

const PIPELINE_STEPS: Omit<PipelineStep, "count">[] = [
  {
    status: "draft",
    label: "Draft",
    color: "bg-slate-500",
    bgColor: "bg-slate-100 dark:bg-slate-900",
    ringColor: "ring-slate-500",
  },
  {
    status: "scrubbing",
    label: "Scrubbing",
    color: "bg-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    ringColor: "ring-blue-500",
  },
  {
    status: "scrub_failed",
    label: "Scrub Failed",
    color: "bg-red-500",
    bgColor: "bg-red-50 dark:bg-red-950",
    ringColor: "ring-red-500",
  },
  {
    status: "ready",
    label: "Ready",
    color: "bg-emerald-500",
    bgColor: "bg-emerald-50 dark:bg-emerald-950",
    ringColor: "ring-emerald-500",
  },
  {
    status: "submitted",
    label: "Submitted",
    color: "bg-sky-500",
    bgColor: "bg-sky-50 dark:bg-sky-950",
    ringColor: "ring-sky-500",
  },
  {
    status: "accepted",
    label: "Accepted",
    color: "bg-green-500",
    bgColor: "bg-green-50 dark:bg-green-950",
    ringColor: "ring-green-500",
  },
  {
    status: "paid",
    label: "Paid",
    color: "bg-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950",
    ringColor: "ring-emerald-600",
  },
  {
    status: "denied",
    label: "Denied",
    color: "bg-red-600",
    bgColor: "bg-red-50 dark:bg-red-950",
    ringColor: "ring-red-600",
  },
  {
    status: "appealed",
    label: "Appealed",
    color: "bg-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-950",
    ringColor: "ring-amber-500",
  },
]

export function ClaimsPipeline({
  counts,
  activeStatus,
  onStatusClick,
}: ClaimsPipelineProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2 px-1">
      {PIPELINE_STEPS.map((step, index) => {
        const count = counts[step.status] ?? 0
        const isActive = activeStatus === step.status

        return (
          <div key={step.status} className="flex items-center shrink-0">
            <button
              onClick={() =>
                onStatusClick(isActive ? null : step.status)
              }
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg px-3 py-2 transition-all cursor-pointer",
                "hover:bg-muted/50",
                isActive && "ring-2 ring-offset-2 ring-offset-background",
                isActive && step.ringColor
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center rounded-full text-white text-xs font-bold min-w-[2rem] h-8 w-8",
                  step.color
                )}
              >
                {count}
              </div>
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                {step.label}
              </span>
            </button>
            {index < PIPELINE_STEPS.length - 1 && (
              <ArrowRight className="size-4 text-muted-foreground/40 shrink-0 mx-0.5" />
            )}
          </div>
        )
      })}
    </div>
  )
}
