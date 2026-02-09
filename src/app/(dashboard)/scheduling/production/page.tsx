"use client"

import { useState, useMemo } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  DollarSign,
  TrendingUp,
  Target,
  CalendarDays,
  Settings2,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function getPerformanceColor(pct: number): string {
  if (pct >= 90) return "bg-emerald-500"
  if (pct >= 70) return "bg-yellow-500"
  if (pct >= 50) return "bg-orange-500"
  return "bg-red-500"
}

function getPerformanceTextColor(pct: number): string {
  if (pct >= 90) return "text-emerald-600 dark:text-emerald-400"
  if (pct >= 70) return "text-yellow-600 dark:text-yellow-400"
  if (pct >= 50) return "text-orange-600 dark:text-orange-400"
  return "text-red-600 dark:text-red-400"
}

function getHeatmapColor(pct: number): string {
  if (pct >= 100) return "bg-emerald-600 text-white"
  if (pct >= 90) return "bg-emerald-400 text-white"
  if (pct >= 70) return "bg-yellow-400 text-yellow-900"
  if (pct >= 50) return "bg-orange-400 text-white"
  if (pct > 0) return "bg-red-400 text-white"
  return "bg-muted text-muted-foreground"
}

function getStatusBadge(
  pct: number,
  timeProgress: number
): { label: string; variant: "default" | "secondary" | "outline"; className: string } {
  if (pct >= timeProgress) {
    return {
      label: "On Track",
      variant: "default" as const,
      className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    }
  }
  if (pct >= timeProgress * 0.7) {
    return {
      label: "Behind",
      variant: "secondary" as const,
      className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    }
  }
  return {
    label: "At Risk",
    variant: "secondary" as const,
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  }
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function ProductionGoalsPage() {
  const [goalsOpen, setGoalsOpen] = useState(false)
  const [dailyGoalInput, setDailyGoalInput] = useState("8500")
  const [monthlyGoalInput, setMonthlyGoalInput] = useState("170000")
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [calendarMonth, setCalendarMonth] = useState(1) // 0-indexed: 1 = February

  // Load procedures and providers from Convex
  const procedures = useQuery((api as any).procedures.queries.list as any, {})
  const providers = useQuery(api.providers.queries.list as any, {})
  const appointments = useQuery(api.scheduling.queries.list as any, {})

  const isLoading = procedures === undefined || providers === undefined

  // Compute production from procedures data
  const now = new Date()
  const todayDate = startOfDay(now)
  const dailyGoal = parseInt(dailyGoalInput) || 8500
  const monthlyGoal = parseInt(monthlyGoalInput) || 170000

  // Procedures are expected to have: fee (number), completedAt (timestamp), pmsProviderId (string)
  const proceduresList = (procedures as any[]) ?? []

  // Today's production
  const todayProcedures = proceduresList.filter((p: any) => {
    if (!p.completedAt) return false
    return isSameDay(new Date(p.completedAt), todayDate)
  })
  const actualProduction = todayProcedures.reduce((sum: number, p: any) => sum + (p.fee || 0), 0)

  // Total scheduled production today (from appointments if available)
  const appointmentsList = (appointments as any[]) ?? []
  const todayAppointments = appointmentsList.filter((a: any) => {
    if (!a.date) return false
    const d = typeof a.date === "string" ? new Date(a.date) : new Date(a.date)
    return isSameDay(d, todayDate)
  })
  const completedAppointments = todayAppointments.filter((a: any) => a.status === "completed").length
  const totalAppointments = todayAppointments.length
  const scheduledProduction = todayAppointments.reduce((sum: number, a: any) => sum + (a.estimatedValue || a.fee || 0), 0) || actualProduction

  const today = {
    date: todayDate.toISOString().slice(0, 10),
    dailyGoal,
    actualProduction,
    scheduledProduction: scheduledProduction > actualProduction ? scheduledProduction : actualProduction + 2000,
    completedAppointments,
    totalAppointments,
  }

  // Provider breakdown from procedures
  const providersList = (providers as any[]) ?? []
  const providerBreakdown = providersList.map((prov: any) => {
    const provProcedures = todayProcedures.filter((p: any) =>
      p.pmsProviderId === prov._id || p.pmsProviderId === prov.pmsProviderId || p.providerId === prov._id
    )
    const completed = provProcedures.reduce((sum: number, p: any) => sum + (p.fee || 0), 0)
    const provAppts = todayAppointments.filter((a: any) =>
      a.providerId === prov._id || a.pmsProviderId === prov.pmsProviderId
    )
    const scheduled = provAppts.reduce((sum: number, a: any) => sum + (a.estimatedValue || a.fee || 0), 0) || completed
    return {
      providerId: prov._id,
      name: prov.name || `${prov.firstName || ""} ${prov.lastName || ""}`.trim() || "Unknown Provider",
      scheduled: scheduled > completed ? scheduled : completed + 500,
      completed,
      appointmentCount: provAppts.filter((a: any) => a.status === "completed").length,
      totalScheduled: provAppts.length,
    }
  }).filter((p: any) => p.scheduled > 0 || p.completed > 0)

  // Weekly: compute from procedures for last 7 days
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const weekly = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayDate)
    const dayOfWeek = todayDate.getDay()
    // Start from Monday of this week
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    d.setDate(d.getDate() + mondayOffset + i)
    const dayProc = proceduresList.filter((p: any) => {
      if (!p.completedAt) return false
      return isSameDay(new Date(p.completedAt), d)
    })
    const actual = dayProc.reduce((sum: number, p: any) => sum + (p.fee || 0), 0)
    const isSat = d.getDay() === 6
    const isSun = d.getDay() === 0
    return {
      date: d.toISOString().slice(0, 10),
      day: weekDays[d.getDay()],
      goal: isSun ? 0 : isSat ? 4000 : dailyGoal,
      actual,
    }
  })

  // Monthly: compute from procedures for current month
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(currentYear, currentMonth, i + 1)
    const dayOfWeek = d.getDay()
    const isWorkday = dayOfWeek >= 1 && dayOfWeek <= 5
    const isSaturday = dayOfWeek === 6
    const goal = isWorkday ? dailyGoal : isSaturday ? 4000 : 0
    const dayProc = proceduresList.filter((p: any) => {
      if (!p.completedAt) return false
      return isSameDay(new Date(p.completedAt), d)
    })
    const actual = dayProc.reduce((sum: number, p: any) => sum + (p.fee || 0), 0)
    return { date: d.toISOString().slice(0, 10), goal, actual }
  })

  const monthlyActual = monthDays.reduce((sum, d) => sum + d.actual, 0)
  const daysCompleted = monthDays.filter((d) => d.actual > 0).length
  const totalWorkDays = monthDays.filter((d) => d.goal > 0).length
  const projectedTotal = daysCompleted > 0 ? Math.round((monthlyActual / daysCompleted) * totalWorkDays) : 0
  const monthly = {
    monthlyGoal: monthlyGoal,
    monthlyActual,
    daysCompleted,
    totalWorkDays,
    projectedTotal,
    days: monthDays,
  }

  // Derived values
  const dailyPct = today.dailyGoal > 0 ? Math.round((today.actualProduction / today.dailyGoal) * 100) : 0
  const remaining = today.dailyGoal - today.actualProduction
  const monthlyPct = monthly.monthlyGoal > 0 ? Math.round(
    (monthly.monthlyActual / monthly.monthlyGoal) * 100
  ) : 0
  // Assume 8 hours workday, currently 2pm-ish = 60% through the day
  const timeOfDayProgress = 60

  // Selected day detail — useMemo MUST be before any early return
  const selectedDayData = useMemo(() => {
    if (selectedDay === null) return null
    return monthly.days[selectedDay] ?? null
  }, [selectedDay, monthly.days])

  // Calendar grid computation — useMemo MUST be before any early return
  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(currentYear, currentMonth, 1)
    const firstDayOfWeek = firstOfMonth.getDay()
    const cells: (
      | { type: "blank" }
      | { type: "day"; index: number; date: string; goal: number; actual: number }
    )[] = []
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ type: "blank" })
    }
    for (let i = 0; i < daysInMonth; i++) {
      const d = monthly.days[i]
      cells.push({
        type: "day",
        index: i,
        date: d.date,
        goal: d.goal,
        actual: d.actual,
      })
    }
    return cells
  }, [monthly.days, currentYear, currentMonth, daysInMonth])

  const monthName = new Date(currentYear, currentMonth, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" })

  // Loading state — AFTER all hooks to respect React rules of hooks
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Production Goals</h1>
            <p className="text-muted-foreground">Track daily and monthly production against targets.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="h-40 bg-muted animate-pulse rounded-lg" />
        <div className="h-60 bg-muted animate-pulse rounded-lg" />
        <div className="h-40 bg-muted animate-pulse rounded-lg" />
        <div className="h-80 bg-muted animate-pulse rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Production Goals
          </h1>
          <p className="text-muted-foreground">
            Track daily and monthly production against targets.
          </p>
        </div>
        <Dialog open={goalsOpen} onOpenChange={setGoalsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Settings2 className="mr-2 size-4" />
              Set Goals
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Production Goals</DialogTitle>
              <DialogDescription>
                Configure daily and monthly production targets for your
                practice.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="dailyGoal">Daily Goal ($)</Label>
                <Input
                  id="dailyGoal"
                  type="number"
                  value={dailyGoalInput}
                  onChange={(e) => setDailyGoalInput(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthlyGoal">Monthly Goal ($)</Label>
                <Input
                  id="monthlyGoal"
                  type="number"
                  value={monthlyGoalInput}
                  onChange={(e) => setMonthlyGoalInput(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input id="startDate" type="date" defaultValue="2026-02-01" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input id="endDate" type="date" defaultValue="2026-02-28" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setGoalsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setGoalsOpen(false)}>
                Apply to Range
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Daily Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Card className="py-3">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Target className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Today&apos;s Goal</p>
              <p className="text-xl font-bold">
                {formatCurrency(today.dailyGoal)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="py-3">
          <CardContent className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-lg",
                dailyPct >= 70
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-orange-100 text-orange-600"
              )}
            >
              <DollarSign className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Actual So Far</p>
              <p className="text-xl font-bold">
                {formatCurrency(today.actualProduction)}
              </p>
              <p
                className={cn(
                  "text-xs font-medium",
                  getPerformanceTextColor(dailyPct)
                )}
              >
                {dailyPct}% of goal
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="py-3">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Remaining</p>
              <p className="text-xl font-bold">
                {formatCurrency(remaining > 0 ? remaining : 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="py-3">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <CalendarDays className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Monthly Goal</p>
              <p className="text-xl font-bold">
                {formatCurrency(monthly.monthlyGoal)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 py-3 lg:col-span-1">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <Users className="size-5" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Monthly Actual</p>
              <p className="text-xl font-bold">
                {formatCurrency(monthly.monthlyActual)}
              </p>
              <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    getPerformanceColor(monthlyPct)
                  )}
                  style={{ width: `${Math.min(monthlyPct, 100)}%` }}
                />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {monthlyPct}% &middot; Projected{" "}
                {formatCurrency(monthly.projectedTotal)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Production Gauge */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Daily Production Progress</CardTitle>
          <CardDescription>
            {today.completedAppointments} of {today.totalAppointments}{" "}
            appointments completed &middot; Scheduled:{" "}
            {formatCurrency(today.scheduledProduction)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Gauge bar */}
            <div className="relative h-10 w-full overflow-hidden rounded-lg bg-muted">
              {/* Actual production fill */}
              <div
                className={cn(
                  "absolute inset-y-0 left-0 rounded-lg transition-all duration-500",
                  getPerformanceColor(dailyPct)
                )}
                style={{
                  width: `${Math.min((today.actualProduction / (today.dailyGoal || 1)) * 100, 100)}%`,
                }}
              />
              {/* Scheduled production indicator (lighter overlay) */}
              {today.scheduledProduction > today.actualProduction && (
                <div
                  className="absolute inset-y-0 rounded-r-lg bg-emerald-200/40 dark:bg-emerald-800/30"
                  style={{
                    left: `${Math.min((today.actualProduction / (today.dailyGoal || 1)) * 100, 100)}%`,
                    width: `${Math.min(
                      ((today.scheduledProduction - today.actualProduction) /
                        (today.dailyGoal || 1)) *
                        100,
                      100 -
                        Math.min(
                          (today.actualProduction / (today.dailyGoal || 1)) * 100,
                          100
                        )
                    )}%`,
                  }}
                />
              )}
              {/* 100% goal marker */}
              <div className="absolute inset-y-0 right-0 w-0.5 bg-foreground/30" />
              {/* Amount labels */}
              <div className="absolute inset-0 flex items-center justify-between px-3">
                <span className="text-sm font-semibold text-white drop-shadow-sm">
                  {formatCurrency(today.actualProduction)}
                </span>
                <span className="text-sm font-medium text-foreground/60">
                  {formatCurrency(today.dailyGoal)}
                </span>
              </div>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className={cn("size-2.5 rounded-full", getPerformanceColor(dailyPct))} />
                Completed
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-full bg-emerald-200/60" />
                Scheduled (remaining)
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-full bg-muted-foreground/30" />
                Goal
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Provider Breakdown</CardTitle>
          <CardDescription>
            Individual provider performance for today
          </CardDescription>
        </CardHeader>
        <CardContent>
          {providerBreakdown.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No provider production data for today.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead className="text-right">Scheduled</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right">% of Daily Goal</TableHead>
                    <TableHead className="text-center">Appointments</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providerBreakdown.map((provider: any) => {
                    const providerPct = Math.round(
                      (provider.completed / (today.dailyGoal || 1)) * 100
                    )
                    const providerScheduledPct = Math.round(
                      (provider.scheduled / (today.dailyGoal || 1)) * 100
                    )
                    const status = getStatusBadge(
                      provider.scheduled > 0 ? (provider.completed / provider.scheduled) * 100 : 0,
                      timeOfDayProgress
                    )
                    return (
                      <TableRow key={provider.providerId}>
                        <TableCell className="font-medium">
                          {provider.name}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(provider.scheduled)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(provider.completed)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={getPerformanceTextColor(providerPct)}>
                            {providerPct}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {provider.appointmentCount} / {provider.totalScheduled}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 rounded-full bg-muted">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  getPerformanceColor(
                                    provider.scheduled > 0 ? (provider.completed / provider.scheduled) * 100 : 0
                                  )
                                )}
                                style={{
                                  width: `${Math.min(providerScheduledPct > 0 ? (provider.completed / provider.scheduled) * 100 : 0, 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={status.variant}
                            className={status.className}
                          >
                            {status.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly Trend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Weekly Trend</CardTitle>
          <CardDescription>
            Daily production vs. goal for this week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2">
            {weekly.map((day) => {
              const maxVal = Math.max(
                ...weekly.map((d) => Math.max(d.goal, d.actual)),
                1
              )
              const goalHeight = day.goal > 0 ? (day.goal / maxVal) * 160 : 0
              const actualHeight =
                day.actual > 0 ? (day.actual / maxVal) * 160 : 0
              const dayPct =
                day.goal > 0
                  ? Math.round((day.actual / day.goal) * 100)
                  : 0

              return (
                <div
                  key={day.date}
                  className="flex flex-1 flex-col items-center gap-1"
                >
                  {/* Amount labels */}
                  {day.actual > 0 && (
                    <span
                      className={cn(
                        "text-xs font-medium",
                        getPerformanceTextColor(dayPct)
                      )}
                    >
                      {formatCurrency(day.actual)}
                    </span>
                  )}
                  {/* Bar container */}
                  <div
                    className="relative w-full max-w-[60px]"
                    style={{ height: `${Math.max(goalHeight, 20)}px` }}
                  >
                    {/* Goal outline */}
                    {day.goal > 0 && (
                      <div
                        className="absolute inset-x-0 bottom-0 rounded-t-md border-2 border-dashed border-muted-foreground/30"
                        style={{ height: `${goalHeight}px` }}
                      />
                    )}
                    {/* Actual fill */}
                    {day.actual > 0 && (
                      <div
                        className={cn(
                          "absolute inset-x-1 bottom-0 rounded-t-md transition-all",
                          getPerformanceColor(dayPct)
                        )}
                        style={{ height: `${actualHeight}px` }}
                      />
                    )}
                  </div>
                  {/* Day label */}
                  <span
                    className={cn(
                      "text-xs font-medium",
                      day.date === today.date
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {day.day}
                  </span>
                  {day.date === today.date && (
                    <div className="size-1.5 rounded-full bg-blue-500" />
                  )}
                </div>
              )
            })}
          </div>
          {/* Legend */}
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-full bg-emerald-500" />
              Actual Production
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded border-2 border-dashed border-muted-foreground/30" />
              Goal
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Calendar Heatmap */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                Monthly Production Heatmap
              </CardTitle>
              <CardDescription>
                {monthName} &middot;{" "}
                {monthly.daysCompleted} of {monthly.totalWorkDays} work days
                completed
              </CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() =>
                  setCalendarMonth((m) => Math.max(0, m - 1))
                }
                disabled={calendarMonth <= 0}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="min-w-[80px] text-center text-sm font-medium">
                {monthName}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() =>
                  setCalendarMonth((m) => Math.min(11, m + 1))
                }
                disabled={calendarMonth >= 11}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Weekday headers */}
          <div className="mb-1 grid grid-cols-7 gap-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                className="py-1 text-center text-xs font-medium text-muted-foreground"
              >
                {d}
              </div>
            ))}
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((cell, idx) => {
              if (cell.type === "blank") {
                return <div key={`blank-${idx}`} />
              }
              const dayNum = cell.index + 1
              const pct =
                cell.goal > 0
                  ? Math.round((cell.actual / cell.goal) * 100)
                  : 0
              const isSelected = selectedDay === cell.index
              const isToday = cell.date === today.date
              const hasPassed = cell.actual > 0

              return (
                <button
                  key={cell.date}
                  onClick={() =>
                    setSelectedDay(
                      selectedDay === cell.index ? null : cell.index
                    )
                  }
                  className={cn(
                    "relative flex flex-col items-center justify-center rounded-md p-1.5 text-xs transition-all hover:ring-2 hover:ring-ring",
                    cell.goal > 0 && hasPassed
                      ? getHeatmapColor(pct)
                      : "bg-muted text-muted-foreground",
                    isSelected && "ring-2 ring-ring ring-offset-2",
                    isToday && "ring-2 ring-blue-500"
                  )}
                  style={{ aspectRatio: "1" }}
                >
                  <span className="font-semibold">{dayNum}</span>
                  {cell.goal > 0 && hasPassed && (
                    <span className="text-[10px] leading-tight opacity-80">
                      {pct}%
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded bg-emerald-600" />
              100%+
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded bg-emerald-400" />
              90-99%
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded bg-yellow-400" />
              70-89%
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded bg-orange-400" />
              50-69%
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded bg-red-400" />
              &lt;50%
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded bg-muted border" />
              No data / Off
            </div>
          </div>

          {/* Selected day detail */}
          {selectedDayData && (
            <div className="mt-4 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">
                  {new Date(selectedDayData.date + "T12:00:00").toLocaleDateString(
                    "en-US",
                    { weekday: "long", month: "long", day: "numeric" }
                  )}
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDay(null)}
                >
                  Close
                </Button>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Goal</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(selectedDayData.goal)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Actual</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(selectedDayData.actual)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Performance</p>
                  <p
                    className={cn(
                      "text-lg font-bold",
                      getPerformanceTextColor(
                        selectedDayData.goal > 0
                          ? (selectedDayData.actual / selectedDayData.goal) *
                              100
                          : 0
                      )
                    )}
                  >
                    {selectedDayData.goal > 0
                      ? Math.round(
                          (selectedDayData.actual / selectedDayData.goal) * 100
                        )
                      : 0}
                    %
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
