"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/../convex/_generated/api"
import type { Id } from "@/../convex/_generated/dataModel"
import { toast } from "sonner"
import {
  Calendar,
  FileText,
  FileText as FileTextIcon,
  CreditCard,
  MessageSquare,
  Shield,
  AlertTriangle,
  Clock,
  DollarSign,
  CheckCircle2,
  XCircle,
  Bell,
  Plus,
} from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { PatientData } from "./patient-header"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PatientTabsProps {
  patientId: string
  patient: PatientData | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function EmptyState({ icon: Icon, title, description }: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 rounded-full bg-muted p-3">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab: Overview
// ---------------------------------------------------------------------------

function OverviewTab({ patient, patientId }: { patient: PatientData | null; patientId: Id<"patients"> }) {
  const nextRecallOverdue =
    patient?.nextRecallDate && new Date(patient.nextRecallDate) < new Date()

  // Query real appointments for this patient
  const appointments = useQuery(
    api.scheduling.queries.getByPatient as any,
    patient ? { patientId } : "skip"
  ) as any[] | undefined

  // Query providers so we can resolve provider names
  const providers = useQuery(api.providers.queries.list as any, {}) as any[] | undefined
  const providerMap = new Map<string, string>()
  if (providers) {
    for (const p of providers) {
      providerMap.set(p._id, `Dr. ${p.lastName}`)
    }
  }

  // Find next upcoming appointment
  const today = new Date().toISOString().split("T")[0]
  const nextAppt = appointments
    ?.filter((a: any) => a.date >= today && a.status !== "cancelled" && a.status !== "no_show")
    .sort((a: any, b: any) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))[0]

  // Find last completed visit
  const lastVisit = appointments
    ?.filter((a: any) => a.date < today || a.status === "completed")
    .sort((a: any, b: any) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime))[0]

  // Format time from "HH:mm" to "9:00 AM" style
  function formatTime(time: string): string {
    const [h, m] = time.split(":").map(Number)
    const period = h >= 12 ? "PM" : "AM"
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${hour12}:${String(m).padStart(2, "0")} ${period}`
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Next Appointment */}
      <Card>
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            Next Appointment
          </CardDescription>
          <CardTitle className="text-lg">
            {!patient ? "---" : nextAppt ? formatDate(nextAppt.date) : "---"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {nextAppt ? (
            <div className="text-sm text-muted-foreground">
              <p>{providerMap.get(nextAppt.providerId) ?? "Provider"}</p>
              <p>{nextAppt.appointmentType ?? "Appointment"} - {formatTime(nextAppt.startTime)}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">None scheduled</p>
          )}
        </CardContent>
      </Card>

      {/* Open Claims */}
      <Card>
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <FileText className="size-3.5" />
            Open Claims
          </CardDescription>
          <CardTitle className="text-lg">---</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No data available</p>
        </CardContent>
      </Card>

      {/* Balance */}
      <Card>
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <DollarSign className="size-3.5" />
            Balance
          </CardDescription>
          <CardTitle className="text-lg">
            {patient
              ? formatCurrency(
                  (patient.patientBalance ?? 0) + (patient.insuranceBalance ?? 0)
                )
              : "---"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {patient ? (
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Patient: {formatCurrency(patient.patientBalance ?? 0)}</p>
              <p>Insurance: {formatCurrency(patient.insuranceBalance ?? 0)}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data available</p>
          )}
        </CardContent>
      </Card>

      {/* Last Visit */}
      <Card>
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <Clock className="size-3.5" />
            Last Visit
          </CardDescription>
          <CardTitle className="text-lg">
            {lastVisit ? formatDate(lastVisit.date) : patient?.lastVisitDate ? formatDate(patient.lastVisitDate) : "---"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {lastVisit
              ? `${providerMap.get(lastVisit.providerId) ?? "Provider"} - ${lastVisit.appointmentType ?? "Visit"}`
              : "No visits on record"}
          </p>
        </CardContent>
      </Card>

      {/* Recall Status */}
      <Card>
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            Recall Status
          </CardDescription>
          <CardTitle className="flex items-center gap-2 text-lg">
            {patient?.nextRecallDate
              ? formatDate(patient.nextRecallDate)
              : "---"}
            {nextRecallOverdue && (
              <Badge
                variant="outline"
                className="border-transparent bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              >
                Overdue
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {patient?.recallInterval
              ? `Every ${patient.recallInterval} months`
              : "No recall interval set"}
          </p>
        </CardContent>
      </Card>

      {/* Insurance Summary */}
      <Card>
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <Shield className="size-3.5" />
            Insurance Summary
          </CardDescription>
          <CardTitle className="text-lg">
            {patient?.primaryInsurance?.payerName ?? "---"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {patient?.primaryInsurance
              ? `Member ID: ${patient.primaryInsurance.memberId}`
              : "No insurance on file"}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab: Insurance
// ---------------------------------------------------------------------------

function InsuranceCard({
  title,
  insurance,
}: {
  title: string
  insurance?: PatientData["primaryInsurance"]
}) {
  if (!insurance) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>No {title.toLowerCase()} on file</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{insurance.payerName}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Payer ID</dt>
            <dd className="text-sm">{insurance.payerId}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Member ID</dt>
            <dd className="text-sm">{insurance.memberId}</dd>
          </div>
          {insurance.groupNumber && (
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Group Number</dt>
              <dd className="text-sm">{insurance.groupNumber}</dd>
            </div>
          )}
          {insurance.subscriberName && (
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Subscriber</dt>
              <dd className="text-sm">{insurance.subscriberName}</dd>
            </div>
          )}
          {insurance.relationship && (
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Relationship</dt>
              <dd className="text-sm capitalize">{insurance.relationship}</dd>
            </div>
          )}
          {insurance.subscriberDob && (
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Subscriber DOB</dt>
              <dd className="text-sm">{formatDate(insurance.subscriberDob)}</dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  )
}

function InsuranceTab({ patient }: { patient: PatientData | null }) {
  if (!patient) {
    return (
      <EmptyState
        icon={Shield}
        title="Insurance information unavailable"
        description="Connect to the database to view insurance details."
      />
    )
  }

  return (
    <div className="space-y-4">
      <InsuranceCard title="Primary Insurance" insurance={patient.primaryInsurance} />
      <InsuranceCard title="Secondary Insurance" insurance={patient.secondaryInsurance} />

      {/* Eligibility status */}
      <Card>
        <CardHeader>
          <CardTitle>Eligibility Verification</CardTitle>
          <CardDescription>Last verified status from payer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            >
              Active
            </Badge>
            <span className="text-sm text-muted-foreground">
              Last verified: Jan 14, 2026
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Benefits breakdown */}
      {patient.primaryInsurance && (
        <Card>
          <CardHeader>
            <CardTitle>Benefits Breakdown</CardTitle>
            <CardDescription>Annual benefits summary</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Annual Maximum</dt>
                <dd className="text-sm font-medium">{formatCurrency(1500)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Deductible</dt>
                <dd className="text-sm font-medium">{formatCurrency(50)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Preventive</dt>
                <dd className="text-sm font-medium">100%</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Basic</dt>
                <dd className="text-sm font-medium">80%</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Major</dt>
                <dd className="text-sm font-medium">50%</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Annual Used</dt>
                <dd className="text-sm font-medium">{formatCurrency(560)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Remaining</dt>
                <dd className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(940)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Deductible Met</dt>
                <dd className="text-sm font-medium">{formatCurrency(50)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab: Appointments
// ---------------------------------------------------------------------------

const appointmentStatusConfig: Record<string, { label: string; className: string }> = {
  scheduled: { label: "Scheduled", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  confirmed: { label: "Confirmed", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  checked_in: { label: "Checked In", className: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
  in_progress: { label: "In Progress", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  completed: { label: "Completed", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  no_show: { label: "No Show", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
}

function AppointmentsTab({ patient, patientId }: { patient: PatientData | null; patientId: Id<"patients"> }) {
  const appointments = useQuery(
    api.scheduling.queries.getByPatient as any,
    patient ? { patientId } : "skip"
  ) as any[] | undefined

  // Query providers for name resolution
  const providers = useQuery(api.providers.queries.list as any, {}) as any[] | undefined
  const providerMap = new Map<string, string>()
  if (providers) {
    for (const p of providers) {
      providerMap.set(p._id, `Dr. ${p.lastName}`)
    }
  }

  const today = new Date().toISOString().split("T")[0]
  const upcoming = appointments?.filter((a: any) => a.date >= today) ?? []
  const past = appointments?.filter((a: any) => a.date < today) ?? []

  if (!patient) {
    return (
      <EmptyState
        icon={Calendar}
        title="Appointments unavailable"
        description="Connect to the database to view appointment history."
      />
    )
  }

  if (appointments !== undefined && appointments.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="No appointments"
        description="No appointment records found for this patient. Appointments will appear here after syncing from the PMS."
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Upcoming */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Upcoming
        </h3>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming appointments</p>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcoming.map((appt: any) => {
                  const statusCfg = appointmentStatusConfig[appt.status]
                  return (
                    <TableRow key={appt._id}>
                      <TableCell>{formatDate(appt.date)}</TableCell>
                      <TableCell>{appt.startTime}</TableCell>
                      <TableCell>{providerMap.get(appt.providerId) ?? "Provider"}</TableCell>
                      <TableCell>{appt.appointmentType ?? "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("border-transparent", statusCfg?.className)}
                        >
                          {statusCfg?.label ?? appt.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {appt.duration} min
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Past */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Past
        </h3>
        {past.length === 0 ? (
          <p className="text-sm text-muted-foreground">No past appointments</p>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {past.map((appt: any) => {
                  const statusCfg = appointmentStatusConfig[appt.status]
                  return (
                    <TableRow key={appt._id}>
                      <TableCell>{formatDate(appt.date)}</TableCell>
                      <TableCell>{appt.startTime}</TableCell>
                      <TableCell>{providerMap.get(appt.providerId) ?? "Provider"}</TableCell>
                      <TableCell>{appt.appointmentType ?? "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("border-transparent", statusCfg?.className)}
                        >
                          {statusCfg?.label ?? appt.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {appt.duration} min
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab: Claims
// ---------------------------------------------------------------------------

const claimStatusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
  submitted: { label: "Submitted", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  accepted: { label: "Accepted", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  paid: { label: "Paid", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
  denied: { label: "Denied", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  appealed: { label: "Appealed", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  scrubbing: { label: "Scrubbing", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  scrub_failed: { label: "Scrub Failed", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  ready: { label: "Ready", className: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
}

function ClaimsTab({ patient, patientId }: { patient: PatientData | null; patientId: Id<"patients"> }) {
  const claims = useQuery(
    api.claims.queries.getByPatient as any,
    patient ? { patientId } : "skip"
  ) as any[] | undefined

  if (!patient) {
    return (
      <EmptyState
        icon={FileText}
        title="Claims unavailable"
        description="Connect to the database to view claims history."
      />
    )
  }

  if (claims === undefined) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded" />
        ))}
      </div>
    )
  }

  if (claims.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No claims found"
        description="No claims have been created for this patient yet. Claims are generated when appointments are completed."
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Claim #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Payer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Charged</TableHead>
              <TableHead className="text-right">Paid</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {claims.map((claim: any) => {
              const statusCfg = claimStatusConfig[claim.status]
              return (
                <TableRow key={claim._id}>
                  <TableCell className="font-medium">
                    {claim.claimNumber || `CLM-${String(claim._id).slice(0, 8).toUpperCase()}`}
                  </TableCell>
                  <TableCell>
                    {claim.createdAt ? new Date(claim.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                  </TableCell>
                  <TableCell>{claim.payerName}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("border-transparent", statusCfg?.className)}
                    >
                      {statusCfg?.label ?? claim.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(claim.totalCharged ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(claim.totalPaid ?? 0)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab: Payments
// ---------------------------------------------------------------------------

const paymentMethodLabels: Record<string, string> = {
  card: "Credit Card",
  check: "Check",
  cash: "Cash",
  ach: "ACH",
  insurance: "Insurance",
}

const paymentStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  processing: { label: "Processing", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  completed: { label: "Completed", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  failed: { label: "Failed", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  refunded: { label: "Refunded", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
}

function PaymentsTab({ patient }: { patient: PatientData | null }) {
  // Fetch PMS payments filtered by patient's pmsPatientId (NexHealth sandbox returns empty; will populate in production)
  const pmsPatientId = (patient as any)?.pmsPatientId
  const payments = useQuery(
    (api as any).pmsPayments.queries.list,
    pmsPatientId ? { patientId: pmsPatientId } : "skip"
  ) as any[] | undefined

  if (!patient) {
    return (
      <EmptyState
        icon={CreditCard}
        title="Payments unavailable"
        description="Connect to the database to view payment history."
      />
    )
  }

  const patientBal = patient.patientBalance ?? 0
  const insuranceBal = patient.insuranceBalance ?? 0

  // Map Convex payment docs to the UI shape
  const mappedPayments = (payments ?? []).map((doc: any) => ({
    id: doc._id,
    date: doc.date ?? new Date(doc.createdAt).toISOString().split("T")[0],
    description: doc.note ?? "Payment",
    amount: doc.amount / 100,
    method: doc.paymentMethod ?? "unknown",
    status: "completed" as const,
  }))

  return (
    <div className="space-y-4">
      {/* Balance summary */}
      <Card>
        <CardHeader>
          <CardTitle>Balance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Patient Balance</p>
              <p className="text-xl font-bold">{formatCurrency(patientBal)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Insurance Balance</p>
              <p className="text-xl font-bold">{formatCurrency(insuranceBal)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Outstanding</p>
              <p className="text-xl font-bold">
                {formatCurrency(patientBal + insuranceBal)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TODO: Wire payment plan to Convex query (paymentPlans.queries.getByPatient) — requires Stripe integration for active plan details */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Plan</CardTitle>
          <CardDescription>No active payment plan</CardDescription>
        </CardHeader>
      </Card>

      {/* Payment history */}
      {payments === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : mappedPayments.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={CreditCard}
              title="No payment history"
              description="Payment records will appear here after syncing from the PMS."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappedPayments.map((payment) => {
                const statusCfg = paymentStatusConfig[payment.status]
                return (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.date)}</TableCell>
                    <TableCell>{payment.description}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>
                      {paymentMethodLabels[payment.method] ?? payment.method}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("border-transparent", statusCfg?.className)}
                      >
                        {statusCfg?.label ?? payment.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab: Communications
// ---------------------------------------------------------------------------

function ConsentCard({
  channel,
  consented,
  timestamp,
}: {
  channel: string
  consented?: boolean
  timestamp?: number
}) {
  const isConsented = consented === true

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{channel} Consent</CardTitle>
          {isConsented ? (
            <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <XCircle className="size-5 text-muted-foreground" />
          )}
        </div>
        <CardDescription>
          {isConsented ? "Consent given" : "Not consented"}
        </CardDescription>
      </CardHeader>
      {timestamp && (
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Consented on{" "}
            {new Date(timestamp).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </CardContent>
      )}
    </Card>
  )
}

function CommunicationsTab({ patient }: { patient: PatientData | null }) {
  if (!patient) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Communications unavailable"
        description="Connect to the database to view communication preferences."
      />
    )
  }

  const preferredMethodLabels: Record<string, string> = {
    sms: "SMS / Text",
    email: "Email",
    phone: "Phone Call",
  }

  return (
    <div className="space-y-4">
      {/* Consent cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <ConsentCard
          channel="SMS"
          consented={patient.smsConsent}
          timestamp={patient.smsConsentTimestamp}
        />
        <ConsentCard
          channel="Email"
          consented={patient.emailConsent}
        />
      </div>

      {/* Preferred contact + opt-out */}
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                Preferred Contact Method
              </dt>
              <dd className="text-sm">
                {patient.preferredContactMethod
                  ? preferredMethodLabels[patient.preferredContactMethod] ?? patient.preferredContactMethod
                  : "Not specified"}
              </dd>
            </div>
            {patient.smsOptOutTypes && patient.smsOptOutTypes.length > 0 && (
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  Opted Out Of
                </dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {patient.smsOptOutTypes.map((type) => (
                    <Badge key={type} variant="secondary" className="capitalize">
                      {type}
                    </Badge>
                  ))}
                </dd>
              </div>
            )}
            {patient.smsConsentSource && (
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  Consent Source
                </dt>
                <dd className="text-sm capitalize">{patient.smsConsentSource}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* TODO: Wire communication history to a messages/communications Convex table — requires Twilio integration for SMS logs and email service for email logs */}
      <Card>
        <CardHeader>
          <CardTitle>Communication History</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={MessageSquare}
            title="No messages yet"
            description="Communication history will appear here once messages are sent."
          />
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PatientTabs({ patientId, patient }: PatientTabsProps) {
  // Alerts state
  const alerts = useQuery((api as any).patientAlerts.queries.listByPatient, { patientId: patientId as any })
  const createAlert = useMutation((api as any).patientAlerts.mutations.create)
  const deactivateAlert = useMutation((api as any).patientAlerts.mutations.deactivate)
  const [alertDialogOpen, setAlertDialogOpen] = useState(false)
  const [newAlertMessage, setNewAlertMessage] = useState("")
  const [newAlertType, setNewAlertType] = useState("general")

  // Documents state
  const documents = useQuery((api as any).patientDocuments.queries.listByPatient, { patientId: patientId as any })
  const createDocument = useMutation((api as any).patientDocuments.mutations.create)
  const [docDialogOpen, setDocDialogOpen] = useState(false)
  const [newDocName, setNewDocName] = useState("")
  const [newDocType, setNewDocType] = useState("other")
  const [newDocUrl, setNewDocUrl] = useState("")

  return (
    <Tabs defaultValue="overview">
      <TabsList className="w-full justify-start overflow-x-auto" variant="line">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="insurance">Insurance</TabsTrigger>
        <TabsTrigger value="appointments">Appointments</TabsTrigger>
        <TabsTrigger value="claims">Claims</TabsTrigger>
        <TabsTrigger value="payments">Payments</TabsTrigger>
        <TabsTrigger value="communications">Communications</TabsTrigger>
        <TabsTrigger value="alerts">
          <Bell className="mr-1.5 size-4" />
          Alerts
        </TabsTrigger>
        <TabsTrigger value="documents">
          <FileTextIcon className="mr-1.5 size-4" />
          Documents
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4">
        <OverviewTab patient={patient} patientId={patientId as Id<"patients">} />
      </TabsContent>

      <TabsContent value="insurance" className="mt-4">
        <InsuranceTab patient={patient} />
      </TabsContent>

      <TabsContent value="appointments" className="mt-4">
        <AppointmentsTab patient={patient} patientId={patientId as Id<"patients">} />
      </TabsContent>

      <TabsContent value="claims" className="mt-4">
        <ClaimsTab patient={patient} patientId={patientId as Id<"patients">} />
      </TabsContent>

      <TabsContent value="payments" className="mt-4">
        <PaymentsTab patient={patient} />
      </TabsContent>

      <TabsContent value="communications" className="mt-4">
        <CommunicationsTab patient={patient} />
      </TabsContent>

      <TabsContent value="alerts" className="mt-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Patient Alerts</CardTitle>
              <CardDescription>Alerts synced to PMS via NexHealth</CardDescription>
            </div>
            <Button size="sm" onClick={() => setAlertDialogOpen(true)}>
              <Plus className="mr-1.5 size-4" />
              New Alert
            </Button>
          </CardHeader>
          <CardContent>
            {!alerts || alerts.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="No alerts"
                description="Create an alert to flag important patient information."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Message</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert: any) => (
                    <TableRow key={alert._id}>
                      <TableCell className="max-w-xs truncate">{alert.message}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{alert.alertType || "general"}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(new Date(alert.createdAt).toISOString())}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          alert.isActive
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : "bg-gray-100 text-gray-600 border-gray-200"
                        )}>
                          {alert.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {alert.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={async () => {
                              try {
                                await deactivateAlert({ alertId: alert._id })
                                toast.success("Alert deactivated")
                              } catch {
                                toast.error("Failed to deactivate alert")
                              }
                            }}
                          >
                            Deactivate
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New Patient Alert</DialogTitle>
              <DialogDescription>Create an alert that will sync to the PMS.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Alert Type</Label>
                <Select value={newAlertType} onValueChange={setNewAlertType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="medical">Medical</SelectItem>
                    <SelectItem value="allergy">Allergy</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="scheduling">Scheduling</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={newAlertMessage}
                  onChange={(e) => setNewAlertMessage(e.target.value)}
                  placeholder="Enter alert message..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAlertDialogOpen(false)}>Cancel</Button>
              <Button
                disabled={!newAlertMessage.trim()}
                onClick={async () => {
                  try {
                    await createAlert({
                      patientId: patientId as any,
                      message: newAlertMessage.trim(),
                      alertType: newAlertType,
                    })
                    toast.success("Alert created and syncing to PMS")
                    setNewAlertMessage("")
                    setNewAlertType("general")
                    setAlertDialogOpen(false)
                  } catch {
                    toast.error("Failed to create alert")
                  }
                }}
              >
                Create Alert
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TabsContent>

      <TabsContent value="documents" className="mt-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Patient Documents</CardTitle>
              <CardDescription>Document records synced to PMS via NexHealth</CardDescription>
            </div>
            <Button size="sm" onClick={() => setDocDialogOpen(true)}>
              <Plus className="mr-1.5 size-4" />
              Add Document
            </Button>
          </CardHeader>
          <CardContent>
            {!documents || documents.length === 0 ? (
              <EmptyState
                icon={FileTextIcon}
                title="No documents"
                description="Add a document record for this patient."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc: any) => (
                    <TableRow key={doc._id}>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{doc.documentType || "other"}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(new Date(doc.createdAt).toISOString())}
                      </TableCell>
                      <TableCell>
                        {doc.url ? (
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                            View
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={docDialogOpen} onOpenChange={setDocDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Document</DialogTitle>
              <DialogDescription>Add a document record that will sync to the PMS. No file upload — metadata only.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Document Name</Label>
                <Input
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="e.g. Panoramic X-ray 2026-01"
                />
              </div>
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select value={newDocType} onValueChange={setNewDocType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="xray">X-Ray</SelectItem>
                    <SelectItem value="lab_result">Lab Result</SelectItem>
                    <SelectItem value="consent">Consent Form</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="insurance">Insurance Document</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>URL (optional)</Label>
                <Input
                  value={newDocUrl}
                  onChange={(e) => setNewDocUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDocDialogOpen(false)}>Cancel</Button>
              <Button
                disabled={!newDocName.trim()}
                onClick={async () => {
                  try {
                    await createDocument({
                      patientId: patientId as any,
                      name: newDocName.trim(),
                      documentType: newDocType,
                      url: newDocUrl.trim() || undefined,
                    })
                    toast.success("Document added and syncing to PMS")
                    setNewDocName("")
                    setNewDocType("other")
                    setNewDocUrl("")
                    setDocDialogOpen(false)
                  } catch {
                    toast.error("Failed to add document")
                  }
                }}
              >
                Add Document
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TabsContent>
    </Tabs>
  )
}
