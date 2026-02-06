"use client"

import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Procedure {
  code: string
  description: string
  fee: number
  tooth?: string
  surface?: string
  quantity?: number
}

interface ScrubError {
  code: string
  message: string
  severity: "error" | "warning" | "info"
  field?: string
}

interface StatusEvent {
  status: string
  timestamp: string
  label: string
}

export interface ClaimDetailData {
  procedures: Procedure[]
  totalCharged: number
  totalPaid?: number
  adjustments?: number
  patientPortion?: number
  scrubErrors?: ScrubError[]
  statusHistory: StatusEvent[]
}

interface ClaimDetailProps {
  claim: ClaimDetailData
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

export function ClaimDetail({ claim }: ClaimDetailProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 bg-muted/30 rounded-lg">
      {/* Procedures Table */}
      <div className="lg:col-span-2 space-y-4">
        <h4 className="text-sm font-semibold">Procedures</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>CDT Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Fee</TableHead>
              <TableHead>Tooth</TableHead>
              <TableHead>Surface</TableHead>
              <TableHead className="text-right">Qty</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {claim.procedures.map((proc, i) => (
              <TableRow key={i}>
                <TableCell className="font-mono text-xs">{proc.code}</TableCell>
                <TableCell>{proc.description}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(proc.fee)}
                </TableCell>
                <TableCell>{proc.tooth ?? "-"}</TableCell>
                <TableCell>{proc.surface ?? "-"}</TableCell>
                <TableCell className="text-right">{proc.quantity ?? 1}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Totals */}
        <div className="flex gap-6 text-sm pt-2">
          <div>
            <span className="text-muted-foreground">Charged: </span>
            <span className="font-semibold">
              {formatCurrency(claim.totalCharged)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Paid: </span>
            <span className="font-semibold">
              {formatCurrency(claim.totalPaid ?? 0)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Adjustments: </span>
            <span className="font-semibold">
              {formatCurrency(claim.adjustments ?? 0)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Patient Portion: </span>
            <span className="font-semibold">
              {formatCurrency(claim.patientPortion ?? 0)}
            </span>
          </div>
        </div>

        {/* Scrub Results */}
        {claim.scrubErrors && claim.scrubErrors.length > 0 && (
          <div className="space-y-2 pt-2">
            <Separator />
            <h4 className="text-sm font-semibold pt-2">Scrub Results</h4>
            <div className="space-y-1.5">
              {claim.scrubErrors.map((error, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-2 rounded-md border p-2 text-sm",
                    error.severity === "error" &&
                      "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950",
                    error.severity === "warning" &&
                      "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950",
                    error.severity === "info" &&
                      "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950"
                  )}
                >
                  {error.severity === "error" ? (
                    <XCircle className="size-4 text-red-500 shrink-0 mt-0.5" />
                  ) : error.severity === "warning" ? (
                    <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle className="size-4 text-blue-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-mono text-xs font-medium">
                      {error.code}
                    </span>
                    <span className="ml-2">{error.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Status Timeline */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Status Timeline</h4>
        <div className="space-y-0">
          {claim.statusHistory.map((event, i) => (
            <div key={i} className="flex gap-3 pb-4 last:pb-0">
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center rounded-full bg-primary/10 p-1">
                  <Clock className="size-3 text-primary" />
                </div>
                {i < claim.statusHistory.length - 1 && (
                  <div className="w-px flex-1 bg-border mt-1" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs capitalize">
                    {event.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {event.timestamp}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
