"use client"

import { useState } from "react"
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  Shield,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { ScheduleAppointmentDialog } from "@/components/patients/schedule-appointment-dialog"

export interface PatientData {
  _id: string
  firstName: string
  lastName: string
  dateOfBirth: string
  gender?: string
  email?: string
  phone?: string
  address?: {
    street: string
    city: string
    state: string
    zip: string
  }
  primaryInsurance?: {
    payerId: string
    payerName: string
    memberId: string
    groupNumber?: string
    subscriberName?: string
    subscriberDob?: string
    relationship?: string
  }
  secondaryInsurance?: {
    payerId: string
    payerName: string
    memberId: string
    groupNumber?: string
    subscriberName?: string
    subscriberDob?: string
    relationship?: string
  }
  patientBalance?: number
  insuranceBalance?: number
  smsConsent?: boolean
  smsConsentTimestamp?: number
  smsConsentSource?: string
  smsOptOutTypes?: string[]
  emailConsent?: boolean
  preferredContactMethod?: "sms" | "email" | "phone"
  lastVisitDate?: string
  recallInterval?: number
  nextRecallDate?: string
  isActive: boolean
  matchStatus?: "matched" | "pending" | "ambiguous"
  lastSyncAt?: number
  createdAt: number
  updatedAt: number
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date()
  const dob = new Date(dateOfBirth)
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--
  }
  return age
}

function formatSyncTime(lastSyncAt: number): { text: string; isStale: boolean } {
  const now = Date.now()
  const diffMs = now - lastSyncAt
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffHours < 1) {
    return { text: "Last synced: just now", isStale: false }
  }
  if (diffHours < 24) {
    return {
      text: `Last synced: ${diffHours} hour${diffHours === 1 ? "" : "s"} ago`,
      isStale: false,
    }
  }
  return {
    text: `Last synced: ${diffDays} day${diffDays === 1 ? "" : "s"} ago`,
    isStale: true,
  }
}

const matchStatusConfig = {
  matched: { label: "Matched", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  pending: { label: "Pending Match", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  ambiguous: { label: "Ambiguous", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
}

function PatientHeaderSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <Skeleton className="size-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
            <div className="flex gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>
      <Separator className="my-4" />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
  )
}

interface PatientHeaderProps {
  patient: PatientData | null
}

export function PatientHeader({ patient }: PatientHeaderProps) {
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)

  if (!patient) {
    return <PatientHeaderSkeleton />
  }

  const age = calculateAge(patient.dateOfBirth)
  const initials = `${patient.firstName[0]}${patient.lastName[0]}`.toUpperCase()
  const matchConfig = patient.matchStatus
    ? matchStatusConfig[patient.matchStatus]
    : matchStatusConfig.pending
  const syncInfo = patient.lastSyncAt
    ? formatSyncTime(patient.lastSyncAt)
    : null

  return (
    <>
      <div className="rounded-xl border bg-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          {/* Left: Patient info */}
          <div className="flex items-start gap-4">
            <Avatar className="size-16">
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>

            <div className="space-y-1.5">
              {/* Name + age + gender */}
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">
                  {patient.firstName} {patient.lastName}
                </h1>
                <span className="text-muted-foreground text-sm">
                  {age} years old
                </span>
                {patient.gender && (
                  <Badge variant="secondary" className="capitalize">
                    {patient.gender}
                  </Badge>
                )}
              </div>

              {/* Contact row */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {patient.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="size-3.5" />
                    {patient.phone}
                  </span>
                )}
                {patient.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="size-3.5" />
                    {patient.email}
                  </span>
                )}
                {patient.address && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {patient.address.city}, {patient.address.state}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Match status + sync */}
          <div className="flex flex-col items-start gap-2 lg:items-end">
            <Badge
              variant="outline"
              className={cn("border-transparent", matchConfig.className)}
            >
              {matchConfig.label}
            </Badge>

            {syncInfo && (
              <span
                className={cn(
                  "flex items-center gap-1.5 text-xs",
                  syncInfo.isStale
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-muted-foreground"
                )}
              >
                {syncInfo.isStale ? (
                  <AlertTriangle className="size-3" />
                ) : (
                  <RefreshCw className="size-3" />
                )}
                {syncInfo.isStale ? "Data may be stale" : syncInfo.text}
              </span>
            )}
          </div>
        </div>

        <Separator className="my-4" />

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setScheduleDialogOpen(true)}>
            <Calendar className="size-4" />
            Schedule Appointment
          </Button>
          <Button variant="outline" size="sm">
            <Shield className="size-4" />
            Verify Eligibility
          </Button>
          <Button variant="outline" size="sm">
            <MessageSquare className="size-4" />
            Send Message
          </Button>
        </div>
      </div>

      <ScheduleAppointmentDialog
        open={scheduleDialogOpen}
        onClose={() => setScheduleDialogOpen(false)}
        patientId={patient._id}
        patientName={`${patient.firstName} ${patient.lastName}`}
      />
    </>
  )
}
