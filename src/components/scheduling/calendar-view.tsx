"use client"

import { useMemo } from "react"
import { format, addDays, startOfWeek, isSameDay, parseISO } from "date-fns"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import {
  AppointmentBlock,
  type DemoAppointment,
} from "@/components/scheduling/appointment-block"

export interface DemoProvider {
  id: string
  firstName: string
  lastName: string
  type: "dentist" | "hygienist" | "specialist" | "assistant"
  color: string
}

interface CalendarViewProps {
  date: Date
  viewMode: "day" | "week"
  appointments: DemoAppointment[]
  providers: DemoProvider[]
  onNewAppointment: (providerId: string, time: string) => void
  onViewAppointment: (appointment: DemoAppointment) => void
  onDayClick?: (date: Date) => void
}

const HOUR_HEIGHT = 80 // px per hour
const START_HOUR = 8
const END_HOUR = 17
const TOTAL_HOURS = END_HOUR - START_HOUR

const timeSlots: string[] = []
for (let h = START_HOUR; h < END_HOUR; h++) {
  timeSlots.push(`${h}:00`)
  timeSlots.push(`${h}:30`)
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

function formatTimeLabel(slot: string): string {
  const [h, m] = slot.split(":").map(Number)
  const period = h >= 12 ? "PM" : "AM"
  const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${displayHour}:${m.toString().padStart(2, "0")} ${period}`
}

function DayView({
  date,
  appointments,
  providers,
  onNewAppointment,
  onViewAppointment,
}: Omit<CalendarViewProps, "viewMode" | "onDayClick">) {
  const dateStr = format(date, "yyyy-MM-dd")
  const dayAppointments = useMemo(
    () => appointments.filter((a) => a.date === dateStr),
    [appointments, dateStr]
  )

  const appointmentsByProvider = useMemo(() => {
    const map: Record<string, DemoAppointment[]> = {}
    for (const p of providers) {
      map[p.id] = dayAppointments.filter((a) => a.providerId === p.id)
    }
    return map
  }, [dayAppointments, providers])

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[700px]"
        style={{
          gridTemplateColumns: `64px repeat(${providers.length}, minmax(160px, 1fr))`,
        }}
      >
        {/* Header row */}
        <div className="sticky top-0 z-10 bg-background border-b border-r h-14" />
        {providers.map((provider) => (
          <div
            key={provider.id}
            className="sticky top-0 z-10 bg-background border-b flex items-center gap-2 px-3 h-14"
          >
            <Avatar size="sm">
              <AvatarFallback
                className="text-[10px] text-white"
                style={{ backgroundColor: provider.color }}
              >
                {provider.firstName[0]}
                {provider.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">
                Dr. {provider.lastName}
              </div>
              <div className="text-xs text-muted-foreground capitalize">
                {provider.type}
              </div>
            </div>
          </div>
        ))}

        {/* Time grid */}
        <div className="relative border-r">
          {timeSlots.map((slot) => {
            const isHour = slot.endsWith(":00")
            return (
              <div
                key={slot}
                className={cn(
                  "flex items-start justify-end pr-2 text-xs text-muted-foreground",
                  isHour ? "font-medium" : "opacity-0"
                )}
                style={{ height: HOUR_HEIGHT / 2 }}
              >
                <span className="-mt-2">{isHour ? formatTimeLabel(slot) : ""}</span>
              </div>
            )
          })}
        </div>

        {/* Provider columns */}
        {providers.map((provider) => (
          <div key={provider.id} className="relative border-r last:border-r-0">
            {/* Grid lines */}
            {timeSlots.map((slot) => {
              const isHour = slot.endsWith(":00")
              return (
                <div
                  key={slot}
                  className={cn(
                    "border-b cursor-pointer hover:bg-accent/50 transition-colors",
                    isHour ? "border-border" : "border-border/40"
                  )}
                  style={{ height: HOUR_HEIGHT / 2 }}
                  onClick={() => {
                    const [h, m] = slot.split(":").map(Number)
                    const time = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
                    onNewAppointment(provider.id, time)
                  }}
                />
              )
            })}

            {/* Appointment blocks */}
            {(appointmentsByProvider[provider.id] ?? []).map((appt) => {
              const startMin = timeToMinutes(appt.startTime) - START_HOUR * 60
              const durationMin = appt.duration
              const top = (startMin / 60) * HOUR_HEIGHT
              const height = (durationMin / 60) * HOUR_HEIGHT

              return (
                <div
                  key={appt.id}
                  className="absolute left-0 right-0"
                  style={{ top, height }}
                >
                  <AppointmentBlock
                    appointment={appt}
                    onClick={onViewAppointment}
                  />
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function WeekView({
  date,
  appointments,
  providers,
  onDayClick,
}: Pick<CalendarViewProps, "date" | "appointments" | "providers" | "onDayClick">) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const dayData = useMemo(() => {
    return days.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd")
      const dayAppts = appointments.filter((a) => a.date === dateStr)

      const byProvider: Record<
        string,
        { count: number; production: number }
      > = {}
      for (const p of providers) {
        const provAppts = dayAppts.filter((a) => a.providerId === p.id)
        byProvider[p.id] = {
          count: provAppts.length,
          production: provAppts.reduce(
            (sum, a) => sum + a.productionAmount,
            0
          ),
        }
      }

      return {
        date: day,
        dateStr,
        totalCount: dayAppts.length,
        totalProduction: dayAppts.reduce(
          (sum, a) => sum + a.productionAmount,
          0
        ),
        byProvider,
      }
    })
  }, [days, appointments, providers])

  const today = new Date()

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[700px]"
        style={{
          gridTemplateColumns: `repeat(7, minmax(100px, 1fr))`,
        }}
      >
        {dayData.map((d) => {
          const isToday = isSameDay(d.date, today)
          return (
            <button
              type="button"
              key={d.dateStr}
              className={cn(
                "border p-3 min-h-[200px] text-left cursor-pointer hover:bg-accent/30 transition-colors",
                isToday && "bg-accent/20"
              )}
              onClick={() => onDayClick?.(d.date)}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs text-muted-foreground">
                    {format(d.date, "EEE")}
                  </div>
                  <div
                    className={cn(
                      "text-lg font-semibold",
                      isToday && "text-primary"
                    )}
                  >
                    {format(d.date, "d")}
                  </div>
                </div>
                {d.totalCount > 0 && (
                  <div className="text-right">
                    <div className="text-xs font-medium">
                      {d.totalCount} appts
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ${d.totalProduction.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                {providers.map((p) => {
                  const data = d.byProvider[p.id]
                  if (!data || data.count === 0) return null
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <div
                        className="size-2 rounded-full shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="truncate text-muted-foreground">
                        {p.lastName}
                      </span>
                      <span className="font-medium ml-auto">
                        {data.count}
                      </span>
                      <span className="text-muted-foreground">
                        ${data.production.toLocaleString()}
                      </span>
                    </div>
                  )
                })}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function CalendarView({
  date,
  viewMode,
  appointments,
  providers,
  onNewAppointment,
  onViewAppointment,
  onDayClick,
}: CalendarViewProps) {
  if (viewMode === "week") {
    return (
      <WeekView
        date={date}
        appointments={appointments}
        providers={providers}
        onDayClick={onDayClick}
      />
    )
  }

  return (
    <DayView
      date={date}
      appointments={appointments}
      providers={providers}
      onNewAppointment={onNewAppointment}
      onViewAppointment={onViewAppointment}
    />
  )
}
