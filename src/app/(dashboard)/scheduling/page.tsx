"use client"

import { useState, useMemo } from "react"
import { format, addDays, subDays } from "date-fns"
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
// Demo data
// ---------------------------------------------------------------------------

const demoProviders: DemoProvider[] = [
  { id: "prov-1", firstName: "Sarah", lastName: "Chen", type: "dentist", color: "#6366f1" },
  { id: "prov-2", firstName: "Michael", lastName: "Torres", type: "dentist", color: "#059669" },
  { id: "prov-3", firstName: "Jessica", lastName: "Park", type: "hygienist", color: "#d946ef" },
  { id: "prov-4", firstName: "Emily", lastName: "Davis", type: "hygienist", color: "#f59e0b" },
]

function makeTodayStr(): string {
  return format(new Date(), "yyyy-MM-dd")
}

function generateDemoAppointments(): DemoAppointment[] {
  const today = makeTodayStr()
  return [
    // Dr. Chen
    {
      id: "apt-1",
      patientName: "Robert Johnson",
      patientDob: "1985-03-15",
      providerId: "prov-1",
      operatory: "Operatory 1",
      date: today,
      startTime: "08:00",
      endTime: "09:00",
      duration: 60,
      status: "confirmed",
      category: "diagnostic",
      typeName: "Periodic Exam",
      productionAmount: 85,
      procedures: [
        { code: "D0120", description: "Periodic Oral Evaluation", fee: 55 },
        { code: "D0274", description: "Bitewing X-Rays (4 films)", fee: 30 },
      ],
      notes: "Patient due for FMX next visit",
    },
    {
      id: "apt-2",
      patientName: "Maria Garcia",
      patientDob: "1992-07-22",
      providerId: "prov-1",
      operatory: "Operatory 1",
      date: today,
      startTime: "09:30",
      endTime: "11:00",
      duration: 90,
      status: "scheduled",
      category: "restorative",
      typeName: "Crown Prep",
      productionAmount: 1250,
      procedures: [
        { code: "D2740", description: "Crown - Porcelain/Ceramic", fee: 1250, tooth: "14" },
      ],
    },
    {
      id: "apt-3",
      patientName: "James Wilson",
      patientDob: "1978-11-03",
      providerId: "prov-1",
      operatory: "Operatory 2",
      date: today,
      startTime: "11:30",
      endTime: "12:30",
      duration: 60,
      status: "checked_in",
      category: "restorative",
      typeName: "Composite Filling",
      productionAmount: 285,
      procedures: [
        { code: "D2391", description: "Resin Composite - 1 Surface, Posterior", fee: 195, tooth: "19", surface: "MO" },
        { code: "D2391", description: "Resin Composite - 1 Surface, Posterior", fee: 90, tooth: "30", surface: "O" },
      ],
      notes: "Patient anxious - offer nitrous",
    },
    {
      id: "apt-4",
      patientName: "Linda Thompson",
      patientDob: "1965-05-18",
      providerId: "prov-1",
      operatory: "Operatory 1",
      date: today,
      startTime: "14:00",
      endTime: "15:30",
      duration: 90,
      status: "scheduled",
      category: "surgical",
      typeName: "Extraction",
      productionAmount: 350,
      procedures: [
        { code: "D7140", description: "Extraction, Erupted Tooth", fee: 200, tooth: "1" },
        { code: "D7140", description: "Extraction, Erupted Tooth", fee: 150, tooth: "16" },
      ],
    },
    // Dr. Torres
    {
      id: "apt-5",
      patientName: "David Kim",
      patientDob: "1990-01-29",
      providerId: "prov-2",
      operatory: "Operatory 3",
      date: today,
      startTime: "08:00",
      endTime: "09:30",
      duration: 90,
      status: "in_progress",
      category: "endodontic",
      typeName: "Root Canal",
      productionAmount: 950,
      procedures: [
        { code: "D3310", description: "Endodontic Therapy, Anterior", fee: 950, tooth: "8" },
      ],
    },
    {
      id: "apt-6",
      patientName: "Susan Brown",
      patientDob: "1988-09-12",
      providerId: "prov-2",
      operatory: "Operatory 3",
      date: today,
      startTime: "10:00",
      endTime: "11:00",
      duration: 60,
      status: "confirmed",
      category: "restorative",
      typeName: "Composite Filling",
      productionAmount: 195,
      procedures: [
        { code: "D2391", description: "Resin Composite - 1 Surface, Posterior", fee: 195, tooth: "3", surface: "DO" },
      ],
    },
    {
      id: "apt-7",
      patientName: "Thomas Lee",
      patientDob: "1955-12-08",
      providerId: "prov-2",
      operatory: "Operatory 4",
      date: today,
      startTime: "13:00",
      endTime: "14:30",
      duration: 90,
      status: "scheduled",
      category: "restorative",
      typeName: "Crown Prep",
      productionAmount: 1250,
      procedures: [
        { code: "D2740", description: "Crown - Porcelain/Ceramic", fee: 1250, tooth: "30" },
      ],
      notes: "Insurance pre-auth approved",
    },
    {
      id: "apt-8",
      patientName: "Nancy White",
      patientDob: "1972-04-25",
      providerId: "prov-2",
      operatory: "Operatory 3",
      date: today,
      startTime: "15:00",
      endTime: "15:30",
      duration: 30,
      status: "scheduled",
      category: "emergency",
      typeName: "Emergency Exam",
      productionAmount: 95,
      procedures: [
        { code: "D0140", description: "Limited Oral Evaluation - Problem Focused", fee: 65 },
        { code: "D0220", description: "Periapical Radiograph", fee: 30 },
      ],
      notes: "Patient called with severe pain UL",
    },
    // Jessica Park (Hygienist)
    {
      id: "apt-9",
      patientName: "Patricia Martinez",
      patientDob: "1995-06-14",
      providerId: "prov-3",
      operatory: "Hygiene Bay A",
      date: today,
      startTime: "08:00",
      endTime: "09:00",
      duration: 60,
      status: "completed",
      category: "hygiene",
      typeName: "Prophylaxis",
      productionAmount: 135,
      procedures: [
        { code: "D1110", description: "Prophylaxis - Adult", fee: 100 },
        { code: "D1206", description: "Fluoride Varnish", fee: 35 },
      ],
    },
    {
      id: "apt-10",
      patientName: "Christopher Hall",
      patientDob: "1982-08-30",
      providerId: "prov-3",
      operatory: "Hygiene Bay A",
      date: today,
      startTime: "09:30",
      endTime: "10:30",
      duration: 60,
      status: "confirmed",
      category: "hygiene",
      typeName: "Prophylaxis",
      productionAmount: 135,
      procedures: [
        { code: "D1110", description: "Prophylaxis - Adult", fee: 100 },
        { code: "D1206", description: "Fluoride Varnish", fee: 35 },
      ],
    },
    {
      id: "apt-11",
      patientName: "Amanda Scott",
      patientDob: "2000-02-17",
      providerId: "prov-3",
      operatory: "Hygiene Bay A",
      date: today,
      startTime: "11:00",
      endTime: "12:00",
      duration: 60,
      status: "scheduled",
      category: "hygiene",
      typeName: "Prophylaxis",
      productionAmount: 100,
      procedures: [
        { code: "D1110", description: "Prophylaxis - Adult", fee: 100 },
      ],
    },
    {
      id: "apt-12",
      patientName: "Daniel Adams",
      patientDob: "1968-10-05",
      providerId: "prov-3",
      operatory: "Hygiene Bay A",
      date: today,
      startTime: "13:00",
      endTime: "14:00",
      duration: 60,
      status: "scheduled",
      category: "preventive",
      typeName: "Sealant",
      productionAmount: 180,
      procedures: [
        { code: "D1351", description: "Sealant - Per Tooth", fee: 45, tooth: "3" },
        { code: "D1351", description: "Sealant - Per Tooth", fee: 45, tooth: "14" },
        { code: "D1351", description: "Sealant - Per Tooth", fee: 45, tooth: "19" },
        { code: "D1351", description: "Sealant - Per Tooth", fee: 45, tooth: "30" },
      ],
    },
    // Emily Davis (Hygienist)
    {
      id: "apt-13",
      patientName: "Karen Young",
      patientDob: "1975-01-20",
      providerId: "prov-4",
      operatory: "Hygiene Bay B",
      date: today,
      startTime: "08:30",
      endTime: "09:30",
      duration: 60,
      status: "checked_in",
      category: "hygiene",
      typeName: "Prophylaxis",
      productionAmount: 135,
      procedures: [
        { code: "D1110", description: "Prophylaxis - Adult", fee: 100 },
        { code: "D1206", description: "Fluoride Varnish", fee: 35 },
      ],
    },
    {
      id: "apt-14",
      patientName: "Steven Wright",
      patientDob: "1998-11-11",
      providerId: "prov-4",
      operatory: "Hygiene Bay B",
      date: today,
      startTime: "10:00",
      endTime: "11:00",
      duration: 60,
      status: "scheduled",
      category: "hygiene",
      typeName: "Prophylaxis",
      productionAmount: 100,
      procedures: [
        { code: "D1110", description: "Prophylaxis - Adult", fee: 100 },
      ],
    },
    {
      id: "apt-15",
      patientName: "Michelle Clark",
      patientDob: "1983-04-02",
      providerId: "prov-4",
      operatory: "Hygiene Bay B",
      date: today,
      startTime: "14:00",
      endTime: "15:00",
      duration: 60,
      status: "scheduled",
      category: "hygiene",
      typeName: "Prophylaxis",
      productionAmount: 135,
      procedures: [
        { code: "D1110", description: "Prophylaxis - Adult", fee: 100 },
        { code: "D1206", description: "Fluoride Varnish", fee: 35 },
      ],
      notes: "Pt has periodontal concerns - evaluate for SRP",
    },
  ]
}

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

  const appointments = useMemo(() => generateDemoAppointments(), [])

  // Stats
  const todayStr = format(selectedDate, "yyyy-MM-dd")
  const todayAppointments = useMemo(
    () => appointments.filter((a) => a.date === todayStr),
    [appointments, todayStr]
  )
  const totalAppointments = todayAppointments.length
  const expectedProduction = todayAppointments.reduce(
    (sum, a) => sum + a.productionAmount,
    0
  )
  // Fill rate: scheduled hours / available hours (4 providers * 9 hours)
  const scheduledMinutes = todayAppointments.reduce(
    (sum, a) => sum + a.duration,
    0
  )
  const availableMinutes = demoProviders.length * 9 * 60
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
            providers={demoProviders}
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
        providers={demoProviders}
      />
      <AppointmentDetailDialog
        appointment={detailAppt}
        open={detailAppt !== null}
        onClose={() => setDetailAppt(null)}
      />
    </div>
  )
}
