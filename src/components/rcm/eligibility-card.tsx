"use client"

import { Shield, CheckCircle, Clock, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

export interface EligibilityBenefits {
  annualMaximum: number
  annualUsed: number
  annualRemaining: number
  deductible: number
  deductibleMet: number
  preventiveCoverage: number
  basicCoverage: number
  majorCoverage: number
  waitingPeriods: string[]
}

export interface EligibilityResultData {
  status: "active" | "inactive" | "error" | "pending"
  payerName: string
  memberId: string
  groupNumber: string
  benefits: EligibilityBenefits
  costEstimate: number
  costEstimateVariance: number
  cachedUntil: string
  verificationMethod: "Real-time" | "Batch"
  patientName?: string
}

function CoverageBar({ label, percentage }: { label: string; percentage: number }) {
  const color =
    percentage >= 80
      ? "bg-emerald-500"
      : percentage >= 50
        ? "bg-amber-500"
        : "bg-red-500"

  const textColor =
    percentage >= 80
      ? "text-emerald-700"
      : percentage >= 50
        ? "text-amber-700"
        : "text-red-700"

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground w-24 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={`text-sm font-semibold w-12 text-right ${textColor}`}>
        {percentage}%
      </span>
    </div>
  )
}

function StatusBadge({ status }: { status: EligibilityResultData["status"] }) {
  switch (status) {
    case "active":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
          <CheckCircle className="size-3" />
          Active
        </Badge>
      )
    case "inactive":
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200">
          <AlertTriangle className="size-3" />
          Inactive
        </Badge>
      )
    case "error":
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200">
          <AlertTriangle className="size-3" />
          Error
        </Badge>
      )
    case "pending":
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
          <Clock className="size-3" />
          Pending
        </Badge>
      )
  }
}

export function EligibilityCard({
  data,
}: {
  data: EligibilityResultData | null
}) {
  if (!data) {
    return <EligibilityCardSkeleton />
  }

  const { benefits } = data
  const deductibleFullyMet = benefits.deductibleMet >= benefits.deductible

  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="size-5 text-primary" />
            <CardTitle className="text-base">Eligibility Result</CardTitle>
          </div>
          <StatusBadge status={data.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payer & member info */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Payer</span>
            <p className="font-medium">{data.payerName}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Member ID</span>
            <p className="font-medium">{data.memberId}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Group #</span>
            <p className="font-medium">{data.groupNumber}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Method</span>
            <p>
              <Badge variant="outline" className="text-xs">
                {data.verificationMethod}
              </Badge>
            </p>
          </div>
        </div>

        <Separator />

        {/* Benefits breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Benefits</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-muted-foreground text-xs">Annual Maximum</p>
              <p className="text-lg font-bold">
                ${benefits.annualMaximum.toLocaleString()}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-muted-foreground text-xs">Used</p>
              <p className="text-lg font-bold">
                ${benefits.annualUsed.toLocaleString()}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-muted-foreground text-xs">Remaining</p>
              <p className="text-lg font-bold text-emerald-600">
                ${benefits.annualRemaining.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Deductible */}
          <div className="flex items-center justify-between text-sm bg-muted/50 rounded-lg p-3">
            <div>
              <span className="text-muted-foreground">Deductible: </span>
              <span className="font-medium">${benefits.deductible}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Met: </span>
              <span className="font-medium">${benefits.deductibleMet}</span>
              {deductibleFullyMet && (
                <CheckCircle className="size-4 text-emerald-500" />
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Coverage percentages */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Coverage</h4>
          <CoverageBar label="Preventive" percentage={benefits.preventiveCoverage} />
          <CoverageBar label="Basic" percentage={benefits.basicCoverage} />
          <CoverageBar label="Major" percentage={benefits.majorCoverage} />
        </div>

        <Separator />

        {/* Waiting Periods */}
        <div className="text-sm">
          <span className="text-muted-foreground">Waiting Periods: </span>
          <span className="font-medium">
            {benefits.waitingPeriods.length === 0
              ? "None"
              : benefits.waitingPeriods.join(", ")}
          </span>
        </div>

        {/* Cost Estimate */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">
            Patient Cost Estimate
          </p>
          <p className="text-2xl font-bold text-primary">
            ${data.costEstimate}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              (+/- ${data.costEstimateVariance})
            </span>
          </p>
        </div>

        {/* Cache info */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3" />
          <span>Cached until: {data.cachedUntil}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function EligibilityCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="size-5 rounded-full" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-3 w-16 mb-1" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
        <Separator />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-10 rounded-lg" />
        <Separator />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
        <Skeleton className="h-20 rounded-lg" />
      </CardContent>
    </Card>
  )
}
