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
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_TODAY = {
  date: "2026-02-05",
  dailyGoal: 8500,
  actualProduction: 5240,
  scheduledProduction: 9200,
  completedAppointments: 8,
  totalAppointments: 14,
}

const MOCK_PROVIDERS = [
  {
    providerId: "prov_1",
    name: "Dr. Emily Park",
    scheduled: 3800,
    completed: 2400,
    appointmentCount: 5,
    totalScheduled: 7,
  },
  {
    providerId: "prov_2",
    name: "Dr. Michael Torres",
    scheduled: 3200,
    completed: 1800,
    appointmentCount: 4,
    totalScheduled: 6,
  },
  {
    providerId: "prov_3",
    name: "Dr. Sarah Kim",
    scheduled: 2200,
    completed: 1040,
    appointmentCount: 3,
    totalScheduled: 5,
  },
]

const MOCK_WEEKLY = [
  { date: "2026-02-02", day: "Mon", goal: 8500, actual: 9100 },
  { date: "2026-02-03", day: "Tue", goal: 8500, actual: 7800 },
  { date: "2026-02-04", day: "Wed", goal: 8500, actual: 8900 },
  { date: "2026-02-05", day: "Thu", goal: 8500, actual: 5240 },
  { date: "2026-02-06", day: "Fri", goal: 8500, actual: 0 },
  { date: "2026-02-07", day: "Sat", goal: 4000, actual: 0 },
  { date: "2026-02-08", day: "Sun", goal: 0, actual: 0 },
]

// Seeded random to keep consistent across renders
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

const MOCK_MONTHLY = {
  monthlyGoal: 170000,
  monthlyActual: 98400,
  daysCompleted: 15,
  totalWorkDays: 22,
  projectedTotal: 144320,
  days: Array.from({ length: 28 }, (_, i) => {
    const isWorkday =
      i < 5 ||
      (i >= 7 && i < 12) ||
      (i >= 14 && i < 19) ||
      (i >= 21 && i < 26)
    const isSaturday = i % 7 === 5
    const goal = isWorkday ? 8500 : isSaturday ? 4000 : 0
    const actual = i < 15 ? Math.floor(6000 + seededRandom(i + 42) * 4000) : 0
    return {
      date: `2026-02-${String(i + 1).padStart(2, "0")}`,
      goal,
      actual,
    }
  }),
}

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

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function ProductionGoalsPage() {
  const [goalsOpen, setGoalsOpen] = useState(false)
  const [dailyGoalInput, setDailyGoalInput] = useState("8500")
  const [monthlyGoalInput, setMonthlyGoalInput] = useState("170000")
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [calendarMonth, setCalendarMonth] = useState(1) // 0-indexed: 1 = February

  // Try loading from Convex, fall back to mock data
  let convexError = false
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery(api.scheduling.queries.productionGoals)
  } catch {
    convexError = true
  }

  const today = MOCK_TODAY
  const providers = MOCK_PROVIDERS
  const weekly = MOCK_WEEKLY
  const monthly = MOCK_MONTHLY

  // Derived values
  const dailyPct = Math.round((today.actualProduction / today.dailyGoal) * 100)
  const remaining = today.dailyGoal - today.actualProduction
  const monthlyPct = Math.round(
    (monthly.monthlyActual / monthly.monthlyGoal) * 100
  )
  // Assume 8 hours workday, currently 2pm-ish = 60% through the day
  const timeOfDayProgress = 60

  // Selected day detail
  const selectedDayData = useMemo(() => {
    if (selectedDay === null) return null
    return monthly.days[selectedDay] ?? null
  }, [selectedDay, monthly.days])

  // Calendar grid computation
  const calendarDays = useMemo(() => {
    // February 2026 starts on Sunday (day 0)
    const firstDayOfWeek = 0 // Sunday
    const daysInMonth = 28
    const leadingBlanks = firstDayOfWeek
    const cells: (
      | { type: "blank" }
      | { type: "day"; index: number; date: string; goal: number; actual: number }
    )[] = []
    for (let i = 0; i < leadingBlanks; i++) {
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
  }, [monthly.days])

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

      {convexError && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Convex backend is not connected. Displaying demo data for preview.
            </p>
          </CardContent>
        </Card>
      )}

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
                  width: `${Math.min((today.actualProduction / today.dailyGoal) * 100, 100)}%`,
                }}
              />
              {/* Scheduled production indicator (lighter overlay) */}
              {today.scheduledProduction > today.actualProduction && (
                <div
                  className="absolute inset-y-0 rounded-r-lg bg-emerald-200/40 dark:bg-emerald-800/30"
                  style={{
                    left: `${Math.min((today.actualProduction / today.dailyGoal) * 100, 100)}%`,
                    width: `${Math.min(
                      ((today.scheduledProduction - today.actualProduction) /
                        today.dailyGoal) *
                        100,
                      100 -
                        Math.min(
                          (today.actualProduction / today.dailyGoal) * 100,
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
                {providers.map((provider) => {
                  const providerPct = Math.round(
                    (provider.completed / today.dailyGoal) * 100
                  )
                  const providerScheduledPct = Math.round(
                    (provider.scheduled / today.dailyGoal) * 100
                  )
                  const status = getStatusBadge(
                    (provider.completed / provider.scheduled) * 100,
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
                                  (provider.completed / provider.scheduled) *
                                    100
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
                ...weekly.map((d) => Math.max(d.goal, d.actual))
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
                February 2026 &middot;{" "}
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
                Feb 2026
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
              const hasPassed = cell.index < 15

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
