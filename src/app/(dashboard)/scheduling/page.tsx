"use client"

import { useState, useMemo } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { format, addDays, subDays } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { DataEmptyState } from "@/components/ui/data-empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  CalendarDaysIcon,
  DollarSignIcon,
  PercentIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { CalendarView, type DemoProvider } from "@/components/scheduling/calendar-view"
import type { DemoAppointment } from "@/components/scheduling/appointment-block"
import { NewAppointmentDialog } from "@/components/scheduling/new-appointment-dialog"
import { AppointmentDetailDialog } from "@/components/scheduling/appointment-detail-dialog"

// ---------------------------------------------------------------------------
// Provider color palette for providers without a color field
// ---------------------------------------------------------------------------
const PROVIDER_COLORS = [
  "#6366f1", "#059669", "#d946ef", "#f59e0b",
  "#3b82f6", "#ef4444", "#8b5cf6", "#14b8a6",
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SchedulingPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<"day" | "week">("day")
  const [calendarOpen, setCalendarOpen] = useState(false)

  // Dialog state
  const [newApptOpen, setNewApptOpen] = useState(false)
  const [newApptProvider, setNewApptProvider] = useState<string | undefined>()
  const [newApptTime, setNewApptTime] = useState<string | undefined>()
  const [detailAppt, setDetailAppt] = useState<DemoAppointment | null>(null)

  // Query providers and appointments from Convex
  const todayStr = format(selectedDate, "yyyy-MM-dd")
  const rawProviders = useQuery(api.providers.queries.list as any, {})
  const rawAppointments = useQuery(api.scheduling.queries.getByDate as any, { date: todayStr })

  // Map Convex provider docs to DemoProvider shape
  const providers: DemoProvider[] = useMemo(() => {
    if (!rawProviders) return []
    return (rawProviders as any[]).map((p: any, i: number) => ({
      id: p._id,
      firstName: p.firstName ?? "",
      lastName: p.lastName ?? "",
      type: p.type ?? p.specialty?.toLowerCase()?.includes("hygien") ? "hygienist" : "dentist",
      color: p.color ?? PROVIDER_COLORS[i % PROVIDER_COLORS.length],
    }))
  }, [rawProviders])

  // Map Convex appointment docs to DemoAppointment shape
  const appointments: DemoAppointment[] = useMemo(() => {
    if (!rawAppointments) return []
    return (rawAppointments as any[]).map((a: any) => ({
      id: a._id,
      patientName: a.patientName ?? "Unknown Patient",
      patientDob: a.patientDob ?? "",
      providerId: a.providerId ?? "",
      operatory: a.operatoryName ?? "Unassigned",
      date: a.date ?? todayStr,
      startTime: a.startTime ?? "08:00",
      endTime: a.endTime ?? "09:00",
      duration: a.duration ?? 60,
      status: a.status ?? "scheduled",
      category: a.category ?? "other",
      typeName: a.appointmentTypeName ?? "Appointment",
      productionAmount: a.productionAmount ?? 0,
      procedures: a.procedures ?? [],
      notes: a.notes,
    }))
  }, [rawAppointments, todayStr])

  // Loading state
  const isLoading = rawProviders === undefined || rawAppointments === undefined

  // Stats
  const todayAppointments = useMemo(
    () => appointments.filter((a) => a.date === todayStr),
    [appointments, todayStr]
  )
  const totalAppointments = todayAppointments.length
  const expectedProduction = todayAppointments.reduce(
    (sum, a) => sum + a.productionAmount,
    0
  )
  // Fill rate: scheduled hours / available hours (providers * 9 hours)
  const scheduledMinutes = todayAppointments.reduce(
    (sum, a) => sum + a.duration,
    0
  )
  const providerCount = providers.length || 1
  const availableMinutes = providerCount * 9 * 60
  const fillRate = Math.round((scheduledMinutes / availableMinutes) * 100)

  function handleNewAppointment(providerId: string, time: string) {
    setNewApptProvider(providerId)
    setNewApptTime(time)
    setNewApptOpen(true)
  }

  function handleViewAppointment(appointment: DemoAppointment) {
    setDetailAppt(appointment)
  }

  function handleDayClick(date: Date) {
    setSelectedDate(date)
    setViewMode("day")
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Scheduling</h1>
            <p className="text-sm text-muted-foreground">
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="py-3">
              <CardContent className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="py-0 overflow-hidden">
          <CardContent className="p-0">
            <Skeleton className="h-[600px] w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Scheduling</h1>
          <p className="text-sm text-muted-foreground">
            {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Date navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setSelectedDate(subDays(selectedDate, 1))}
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <CalendarIcon className="size-3.5" />
                  {format(selectedDate, "MMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => {
                    if (d) setSelectedDate(d)
                    setCalendarOpen(false)
                  }}
                />
              </PopoverContent>
            </Popover>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>

          {/* Today button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(new Date())}
          >
            Today
          </Button>

          {/* View mode toggle */}
          <div className="flex rounded-md border">
            <Button
              variant={viewMode === "day" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-r-none border-0"
              onClick={() => setViewMode("day")}
            >
              Day
            </Button>
            <Button
              variant={viewMode === "week" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-l-none border-0"
              onClick={() => setViewMode("week")}
            >
              Week
            </Button>
          </div>

          {/* New Appointment */}
          <Button
            size="sm"
            onClick={() => {
              setNewApptProvider(undefined)
              setNewApptTime(undefined)
              setNewApptOpen(true)
            }}
          >
            <PlusIcon className="size-4" />
            New Appointment
          </Button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="py-3">
          <CardContent className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-blue-100 text-blue-600">
              <CalendarDaysIcon className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Appointments</p>
              <p className="text-2xl font-bold">{totalAppointments}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-green-100 text-green-600">
              <DollarSignIcon className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Expected Production</p>
              <p className="text-2xl font-bold">
                ${expectedProduction.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-purple-100 text-purple-600">
              <PercentIcon className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fill Rate</p>
              <p className="text-2xl font-bold">{fillRate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card className="py-0 overflow-hidden">
        <CardContent className="p-0">
          <CalendarView
            date={selectedDate}
            viewMode={viewMode}
            appointments={appointments}
            providers={providers}
            onNewAppointment={handleNewAppointment}
            onViewAppointment={handleViewAppointment}
            onDayClick={handleDayClick}
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <NewAppointmentDialog
        open={newApptOpen}
        onClose={() => setNewApptOpen(false)}
        defaultProvider={newApptProvider}
        defaultDate={selectedDate}
        defaultTime={newApptTime}
        providers={providers}
      />
      <AppointmentDetailDialog
        appointment={detailAppt}
        open={detailAppt !== null}
        onClose={() => setDetailAppt(null)}
      />
    </div>
  )
}
