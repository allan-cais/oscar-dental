"use client"

import { useState, useMemo } from "react"
import { format } from "date-fns"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/../convex/_generated/api"
import type { Id } from "@/../convex/_generated/dataModel"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
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
import { CalendarIcon, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// Generate 15-min time slots 7AM–6PM
const timeOptions: string[] = []
for (let h = 7; h < 18; h++) {
  for (let m = 0; m < 60; m += 15) {
    timeOptions.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`)
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

interface ScheduleAppointmentDialogProps {
  open: boolean
  onClose: () => void
  patientId: string
  patientName: string
}

export function ScheduleAppointmentDialog({
  open,
  onClose,
  patientId,
  patientName,
}: ScheduleAppointmentDialogProps) {
  const [providerId, setProviderId] = useState("")
  const [appointmentTypeId, setAppointmentTypeId] = useState("")
  const [operatoryId, setOperatoryId] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [startTime, setStartTime] = useState("09:00")
  const [duration, setDuration] = useState(60)
  const [notes, setNotes] = useState("")
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Fetch real data from Convex
  const providers = useQuery(api.providers.queries.list, {}) ?? []
  const operatories = useQuery(api.operatories.queries.list, {}) ?? []
  const appointmentTypes = useQuery(api.appointmentTypes.queries.list, {}) ?? []
  const practices = useQuery(api.practices.queries.list) ?? []

  const practiceId = practices[0]?._id as Id<"practices"> | undefined

  const activeProviders = useMemo(
    () => providers.filter((p: any) => p.isActive !== false),
    [providers]
  )
  const activeOperatories = useMemo(
    () => operatories.filter((o: any) => o.isActive !== false),
    [operatories]
  )
  const activeAppointmentTypes = useMemo(
    () => appointmentTypes.filter((t: any) => t.isActive !== false),
    [appointmentTypes]
  )

  const createAppointment = useMutation(api.scheduling.mutations.create)

  const endTime = addMinutesToTime(startTime, duration)

  function handleTypeChange(typeId: string) {
    setAppointmentTypeId(typeId)
    const apptType = appointmentTypes.find((t: any) => t._id === typeId) as any
    if (apptType?.duration) {
      setDuration(apptType.duration)
    }
  }

  function resetForm() {
    setProviderId("")
    setAppointmentTypeId("")
    setOperatoryId("")
    setSelectedDate(undefined)
    setStartTime("09:00")
    setDuration(60)
    setNotes("")
    setSubmitting(false)
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  async function handleCreate() {
    if (!practiceId) {
      toast.error("No practice found. Please configure a practice first.")
      return
    }
    if (!providerId) {
      toast.error("Please select a provider.")
      return
    }
    if (!selectedDate) {
      toast.error("Please select a date.")
      return
    }

    setSubmitting(true)
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd")

      await createAppointment({
        practiceId,
        patientId: patientId as Id<"patients">,
        providerId: providerId as Id<"providers">,
        operatoryId: operatoryId ? (operatoryId as Id<"operatories">) : undefined,
        appointmentTypeId: appointmentTypeId ? (appointmentTypeId as Id<"appointmentTypes">) : undefined,
        date: dateStr,
        startTime,
        endTime,
        duration,
        notes: notes || undefined,
      })

      toast.success("Appointment scheduled and syncing to PMS via NexHealth.")
      handleClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to schedule appointment"
      toast.error(message)
      setSubmitting(false)
    }
  }

  const canSubmit = !!providerId && !!selectedDate && !!practiceId

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule Appointment</DialogTitle>
          <DialogDescription>
            Schedule a new appointment for {patientName}. The appointment will sync to the PMS via NexHealth.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Provider */}
          <div className="grid gap-2">
            <Label>Provider *</Label>
            <Select value={providerId} onValueChange={setProviderId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {activeProviders.map((p: any) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.firstName} {p.lastName}
                    {p.specialty ? ` (${p.specialty})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Appointment Type */}
          <div className="grid gap-2">
            <Label>Appointment Type</Label>
            <Select value={appointmentTypeId} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type (optional)" />
              </SelectTrigger>
              <SelectContent>
                {activeAppointmentTypes.map((t: any) => (
                  <SelectItem key={t._id} value={t._id}>
                    {t.name}{t.duration ? ` - ${t.duration}min` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="grid gap-2">
            <Label>Date *</Label>
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
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
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

          {/* Duration override */}
          <div className="grid gap-2">
            <Label>Duration (minutes)</Label>
            <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[15, 30, 45, 60, 90, 120].map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Operatory */}
          <div className="grid gap-2">
            <Label>Operatory</Label>
            <Select value={operatoryId} onValueChange={setOperatoryId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select operatory (optional)" />
              </SelectTrigger>
              <SelectContent>
                {activeOperatories.map((o: any) => (
                  <SelectItem key={o._id} value={o._id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label htmlFor="schedule-notes">Notes</Label>
            <textarea
              id="schedule-notes"
              placeholder="Optional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!canSubmit || submitting}>
            {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Schedule Appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
