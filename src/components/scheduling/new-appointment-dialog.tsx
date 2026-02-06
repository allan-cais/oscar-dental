"use client"

import { useState } from "react"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DemoProvider } from "@/components/scheduling/calendar-view"

const appointmentTypes = [
  { id: "prophy", name: "Prophylaxis (Cleaning)", code: "D1110", duration: 60, category: "hygiene" },
  { id: "sealant", name: "Sealant", code: "D1351", duration: 30, category: "preventive" },
  { id: "composite", name: "Composite Filling", code: "D2391", duration: 60, category: "restorative" },
  { id: "crown", name: "Crown Prep", code: "D2740", duration: 90, category: "restorative" },
  { id: "rct", name: "Root Canal", code: "D3310", duration: 90, category: "endodontic" },
  { id: "extraction", name: "Extraction", code: "D7140", duration: 45, category: "surgical" },
  { id: "exam", name: "Periodic Exam", code: "D0120", duration: 30, category: "diagnostic" },
  { id: "xray", name: "Bitewing X-Rays", code: "D0274", duration: 15, category: "diagnostic" },
  { id: "emergency", name: "Emergency Exam", code: "D0140", duration: 30, category: "emergency" },
] as const

const operatories = [
  { id: "op1", name: "Operatory 1" },
  { id: "op2", name: "Operatory 2" },
  { id: "op3", name: "Operatory 3" },
  { id: "op4", name: "Operatory 4" },
  { id: "op5", name: "Hygiene Bay A" },
  { id: "op6", name: "Hygiene Bay B" },
]

const timeOptions: string[] = []
for (let h = 8; h < 17; h++) {
  for (let m = 0; m < 60; m += 15) {
    const hour = h.toString().padStart(2, "0")
    const min = m.toString().padStart(2, "0")
    timeOptions.push(`${hour}:${min}`)
  }
}

function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number)
  const period = h >= 12 ? "PM" : "AM"
  const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${displayHour}:${m.toString().padStart(2, "0")} ${period}`
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number)
  const totalMin = h * 60 + m + minutes
  const newH = Math.floor(totalMin / 60)
  const newM = totalMin % 60
  return `${newH.toString().padStart(2, "0")}:${newM.toString().padStart(2, "0")}`
}

interface NewAppointmentDialogProps {
  open: boolean
  onClose: () => void
  defaultProvider?: string
  defaultDate?: Date
  defaultTime?: string
  providers: DemoProvider[]
}

export function NewAppointmentDialog({
  open,
  onClose,
  defaultProvider,
  defaultDate,
  defaultTime,
  providers,
}: NewAppointmentDialogProps) {
  const [patientSearch, setPatientSearch] = useState("")
  const [provider, setProvider] = useState(defaultProvider ?? "")
  const [appointmentType, setAppointmentType] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    defaultDate ?? new Date()
  )
  const [startTime, setStartTime] = useState(defaultTime ?? "09:00")
  const [duration, setDuration] = useState(60)
  const [operatory, setOperatory] = useState("")
  const [notes, setNotes] = useState("")
  const [calendarOpen, setCalendarOpen] = useState(false)

  const endTime = addMinutesToTime(startTime, duration)

  function handleTypeChange(typeId: string) {
    setAppointmentType(typeId)
    const type = appointmentTypes.find((t) => t.id === typeId)
    if (type) {
      setDuration(type.duration)
    }
  }

  function handleCreate() {
    // In a real app, this would call a Convex mutation
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Appointment</DialogTitle>
          <DialogDescription>
            Schedule a new appointment for a patient.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Patient Search */}
          <div className="grid gap-2">
            <Label htmlFor="patient">Patient</Label>
            <Input
              id="patient"
              placeholder="Search by patient name..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
            />
          </div>

          {/* Provider */}
          <div className="grid gap-2">
            <Label>Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    Dr. {p.firstName} {p.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Appointment Type */}
          <div className="grid gap-2">
            <Label>Appointment Type</Label>
            <Select value={appointmentType} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {appointmentTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.code}) - {t.duration}min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="grid gap-2">
            <Label>Date</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 size-4" />
                  {selectedDate
                    ? format(selectedDate, "EEEE, MMMM d, yyyy")
                    : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => {
                    setSelectedDate(d)
                    setCalendarOpen(false)
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Start Time</Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((t) => (
                    <SelectItem key={t} value={t}>
                      {formatTime12(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>End Time</Label>
              <div className="flex items-center h-9 px-3 border rounded-md bg-muted/50 text-sm text-muted-foreground">
                {formatTime12(endTime)}
              </div>
            </div>
          </div>

          {/* Operatory */}
          <div className="grid gap-2">
            <Label>Operatory</Label>
            <Select value={operatory} onValueChange={setOperatory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select operatory" />
              </SelectTrigger>
              <SelectContent>
                {operatories.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              placeholder="Optional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Create Appointment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
