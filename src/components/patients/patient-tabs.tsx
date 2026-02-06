"use client"

import {
  Calendar,
  FileText,
  CreditCard,
  MessageSquare,
  Shield,
  AlertTriangle,
  Clock,
  DollarSign,
  User,
  CheckCircle2,
  XCircle,
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
import { Separator } from "@/components/ui/separator"
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
// Demo data (shown when Convex is not connected)
// ---------------------------------------------------------------------------

const demoAppointments = [
  { date: "2026-02-12", time: "09:00", provider: "Dr. Sarah Chen", type: "Hygiene Cleaning", status: "scheduled" as const, production: 250 },
  { date: "2026-02-20", time: "14:30", provider: "Dr. James Wilson", type: "Crown Prep", status: "confirmed" as const, production: 1200 },
  { date: "2026-01-15", time: "10:00", provider: "Dr. Sarah Chen", type: "Periodic Exam", status: "completed" as const, production: 150 },
  { date: "2025-12-03", time: "11:30", provider: "Dr. Sarah Chen", type: "Hygiene Cleaning", status: "completed" as const, production: 250 },
  { date: "2025-11-10", time: "09:00", provider: "Dr. James Wilson", type: "Filling - MOD", status: "completed" as const, production: 450 },
]

const demoClaims = [
  { claimNumber: "CLM-2026-0142", date: "2026-01-15", payer: "Delta Dental", status: "submitted" as const, charged: 150, paid: 0 },
  { claimNumber: "CLM-2025-0891", date: "2025-12-03", payer: "Delta Dental", status: "paid" as const, charged: 250, paid: 200 },
  { claimNumber: "CLM-2025-0756", date: "2025-11-10", payer: "Delta Dental", status: "paid" as const, charged: 450, paid: 360 },
  { claimNumber: "CLM-2025-0612", date: "2025-10-01", payer: "Delta Dental", status: "denied" as const, charged: 800, paid: 0 },
  { claimNumber: "CLM-2025-0611", date: "2025-10-01", payer: "Delta Dental", status: "appealed" as const, charged: 800, paid: 0 },
]

const demoPayments = [
  { date: "2026-01-15", type: "patient" as const, amount: 35, method: "card" as const, status: "completed" as const },
  { date: "2025-12-03", type: "insurance" as const, amount: 200, method: "insurance" as const, status: "completed" as const },
  { date: "2025-12-03", type: "patient" as const, amount: 50, method: "text_to_pay" as const, status: "completed" as const },
  { date: "2025-11-10", type: "insurance" as const, amount: 360, method: "insurance" as const, status: "completed" as const },
  { date: "2025-11-10", type: "patient" as const, amount: 90, method: "card" as const, status: "completed" as const },
]

// ---------------------------------------------------------------------------
// Tab: Overview
// ---------------------------------------------------------------------------

function OverviewTab({ patient }: { patient: PatientData | null }) {
  const nextRecallOverdue =
    patient?.nextRecallDate && new Date(patient.nextRecallDate) < new Date()

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
            {patient ? "Feb 12, 2026" : "---"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {patient ? (
            <div className="text-sm text-muted-foreground">
              <p>Dr. Sarah Chen</p>
              <p>Hygiene Cleaning - 9:00 AM</p>
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
          <CardTitle className="text-lg">
            {patient ? "2" : "---"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {patient ? `Total: ${formatCurrency(950)}` : "No data available"}
          </p>
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
            {patient?.lastVisitDate
              ? formatDate(patient.lastVisitDate)
              : "---"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {patient?.lastVisitDate ? "Periodic Exam" : "No visits on record"}
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

function AppointmentsTab({ patient }: { patient: PatientData | null }) {
  const today = new Date().toISOString().split("T")[0]
  const upcoming = demoAppointments.filter((a) => a.date >= today)
  const past = demoAppointments.filter((a) => a.date < today)

  if (!patient) {
    return (
      <EmptyState
        icon={Calendar}
        title="Appointments unavailable"
        description="Connect to the database to view appointment history."
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
                  <TableHead className="text-right">Production</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcoming.map((appt, i) => {
                  const statusCfg = appointmentStatusConfig[appt.status]
                  return (
                    <TableRow key={i}>
                      <TableCell>{formatDate(appt.date)}</TableCell>
                      <TableCell>{appt.time}</TableCell>
                      <TableCell>{appt.provider}</TableCell>
                      <TableCell>{appt.type}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("border-transparent", statusCfg?.className)}
                        >
                          {statusCfg?.label ?? appt.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(appt.production)}
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
                  <TableHead className="text-right">Production</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {past.map((appt, i) => {
                  const statusCfg = appointmentStatusConfig[appt.status]
                  return (
                    <TableRow key={i}>
                      <TableCell>{formatDate(appt.date)}</TableCell>
                      <TableCell>{appt.time}</TableCell>
                      <TableCell>{appt.provider}</TableCell>
                      <TableCell>{appt.type}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("border-transparent", statusCfg?.className)}
                        >
                          {statusCfg?.label ?? appt.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(appt.production)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground italic">
        Showing demo data. Live data will appear when Convex is connected.
      </p>
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

function ClaimsTab({ patient }: { patient: PatientData | null }) {
  if (!patient) {
    return (
      <EmptyState
        icon={FileText}
        title="Claims unavailable"
        description="Connect to the database to view claims history."
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
            {demoClaims.map((claim, i) => {
              const statusCfg = claimStatusConfig[claim.status]
              return (
                <TableRow key={i}>
                  <TableCell className="font-medium">{claim.claimNumber}</TableCell>
                  <TableCell>{formatDate(claim.date)}</TableCell>
                  <TableCell>{claim.payer}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("border-transparent", statusCfg?.className)}
                    >
                      {statusCfg?.label ?? claim.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(claim.charged)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(claim.paid)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground italic">
        Showing demo data. Live data will appear when Convex is connected.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab: Payments
// ---------------------------------------------------------------------------

const paymentTypeLabels: Record<string, string> = {
  insurance: "Insurance",
  patient: "Patient",
  text_to_pay: "Text-to-Pay",
  card_on_file: "Card on File",
  payment_plan: "Payment Plan",
  refund: "Refund",
}

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

      {/* Payment plan placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Plan</CardTitle>
          <CardDescription>No active payment plan</CardDescription>
        </CardHeader>
      </Card>

      {/* Payment history */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {demoPayments.map((payment, i) => {
              const statusCfg = paymentStatusConfig[payment.status]
              return (
                <TableRow key={i}>
                  <TableCell>{formatDate(payment.date)}</TableCell>
                  <TableCell>{paymentTypeLabels[payment.type] ?? payment.type}</TableCell>
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

      <p className="text-xs text-muted-foreground italic">
        Showing demo data. Live data will appear when Convex is connected.
      </p>
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

      {/* Communication history placeholder */}
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
  return (
    <Tabs defaultValue="overview">
      <TabsList className="w-full justify-start overflow-x-auto" variant="line">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="insurance">Insurance</TabsTrigger>
        <TabsTrigger value="appointments">Appointments</TabsTrigger>
        <TabsTrigger value="claims">Claims</TabsTrigger>
        <TabsTrigger value="payments">Payments</TabsTrigger>
        <TabsTrigger value="communications">Communications</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4">
        <OverviewTab patient={patient} />
      </TabsContent>

      <TabsContent value="insurance" className="mt-4">
        <InsuranceTab patient={patient} />
      </TabsContent>

      <TabsContent value="appointments" className="mt-4">
        <AppointmentsTab patient={patient} />
      </TabsContent>

      <TabsContent value="claims" className="mt-4">
        <ClaimsTab patient={patient} />
      </TabsContent>

      <TabsContent value="payments" className="mt-4">
        <PaymentsTab patient={patient} />
      </TabsContent>

      <TabsContent value="communications" className="mt-4">
        <CommunicationsTab patient={patient} />
      </TabsContent>
    </Tabs>
  )
}
