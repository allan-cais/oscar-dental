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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { DataEmptyState } from "@/components/ui/data-empty-state"
import { cn } from "@/lib/utils"
import {
  Clock,
  Plus,
  Copy,
  Pencil,
  Trash2,
  CalendarCheck,
  DollarSign,
  Users,
  BarChart3,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SlotData = {
  startTime: string
  endTime: string
  appointmentType?: string
  category: string
  provider?: string
  operatory?: string
  value?: number
  productionTarget?: number
}

/** Safely extract a numeric production value from a slot */
function getSlotValue(slot: SlotData): number {
  const v = slot.value ?? slot.productionTarget
  return typeof v === "number" && !isNaN(v) ? v : 0
}

/** Safely extract the operatory label from a slot */
function getSlotOperatory(slot: SlotData): string {
  return slot.operatory || "Unassigned"
}

/** Safely extract the display label for a slot */
function getSlotLabel(slot: SlotData): string {
  return slot.appointmentType || slot.category || "Slot"
}

type TemplateData = {
  name: string
  slots: SlotData[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_TYPES: Record<string, string[]> = {
  Hygiene: ["Hygiene", "Perio Maint", "SRP"],
  Restorative: ["Crown Prep", "Crown Seat", "Filling", "Bridge Prep", "Inlay/Onlay"],
  Surgical: ["Root Canal", "Extraction", "Implant Consult", "Implant Placement"],
  Cosmetic: ["Veneer Prep", "Veneer Seat", "Whitening", "Bonding"],
  Admin: ["Exam + X-rays", "New Patient Exam", "Consult"],
  Emergency: ["Emergency Exam", "Emergency Treatment"],
}

const DAY_NAMES: { key: number; short: string; full: string }[] = [
  { key: 1, short: "Mon", full: "Monday" },
  { key: 2, short: "Tue", full: "Tuesday" },
  { key: 3, short: "Wed", full: "Wednesday" },
  { key: 4, short: "Thu", full: "Thursday" },
  { key: 5, short: "Fri", full: "Friday" },
  { key: 6, short: "Sat", full: "Saturday" },
  { key: 0, short: "Sun", full: "Sunday" },
]

// Time slots from 7:00 AM to 6:00 PM in 30-min increments
const TIME_SLOTS: string[] = []
for (let h = 7; h < 18; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`)
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`)
}
TIME_SLOTS.push("18:00")

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

function formatTime(time24: string): string {
  const [h, m] = time24.split(":").map(Number)
  const period = h >= 12 ? "PM" : "AM"
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${String(m).padStart(2, "0")} ${period}`
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

function getCategoryColor(category: string): {
  bg: string
  text: string
  badge: string
} {
  const normalized = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()
  switch (normalized) {
    case "Hygiene":
      return {
        bg: "bg-blue-100 dark:bg-blue-900/30",
        text: "text-blue-800 dark:text-blue-300",
        badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      }
    case "Restorative":
      return {
        bg: "bg-emerald-100 dark:bg-emerald-900/30",
        text: "text-emerald-800 dark:text-emerald-300",
        badge:
          "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
      }
    case "Surgical":
      return {
        bg: "bg-red-100 dark:bg-red-900/30",
        text: "text-red-800 dark:text-red-300",
        badge: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      }
    case "Cosmetic":
      return {
        bg: "bg-purple-100 dark:bg-purple-900/30",
        text: "text-purple-800 dark:text-purple-300",
        badge:
          "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
      }
    case "Emergency":
      return {
        bg: "bg-orange-100 dark:bg-orange-900/30",
        text: "text-orange-800 dark:text-orange-300",
        badge:
          "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
      }
    case "Diagnostic":
    case "Preventive":
    case "Admin":
    default:
      return {
        bg: "bg-gray-100 dark:bg-gray-800/50",
        text: "text-gray-700 dark:text-gray-300",
        badge: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300",
      }
  }
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function PerfectDayPage() {
  const [selectedDay, setSelectedDay] = useState("1") // Monday
  const [editSlot, setEditSlot] = useState<{
    slot: SlotData
    index: number
  } | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  // Edit form state
  const [editForm, setEditForm] = useState({
    appointmentType: "",
    category: "",
    provider: "",
    operatory: "",
    startTime: "",
    endTime: "",
    value: "",
  })

  // Create template form state
  const [createForm, setCreateForm] = useState({
    name: "",
    copyFrom: "",
  })

  // Load data from Convex
  const operatoriesData = useQuery(api.operatories.queries.list as any, {})
  const providersData = useQuery(api.providers.queries.list as any, {})
  const templatesData = useQuery(api.perfectday.queries.getTemplates as any, {})

  const operatories = (operatoriesData as any[]) ?? []
  const providersList = (providersData as any[]) ?? []
  const providerNames = providersList.map((p: any) => p.name || `${p.firstName || ""} ${p.lastName || ""}`.trim() || "Unknown")

  // Build templates map from Convex data
  // templatesData should be an array or object of templates keyed by day
  const templates: Record<number, TemplateData> = useMemo(() => {
    const result: Record<number, TemplateData> = {}
    // Initialize all days with empty templates
    DAY_NAMES.forEach((d) => {
      result[d.key] = { name: `${d.full} Template`, slots: [] }
    })
    // Overlay Convex data
    if (Array.isArray(templatesData)) {
      for (const t of templatesData as any[]) {
        const dayKey = t.dayOfWeek ?? t.dayKey
        if (dayKey !== undefined && result[dayKey] !== undefined) {
          result[dayKey] = {
            name: t.name || result[dayKey].name,
            slots: (t.slots || []) as SlotData[],
          }
        }
      }
    } else if (templatesData && typeof templatesData === "object") {
      for (const [key, val] of Object.entries(templatesData as any)) {
        const dayKey = parseInt(key)
        if (!isNaN(dayKey) && result[dayKey] !== undefined && val) {
          result[dayKey] = {
            name: (val as any).name || result[dayKey].name,
            slots: ((val as any).slots || []) as SlotData[],
          }
        }
      }
    }
    return result
  }, [templatesData])

  const dayKey = parseInt(selectedDay)
  const currentTemplate = templates[dayKey]

  // Compute stats for selected day
  const stats = useMemo(() => {
    if (!currentTemplate || currentTemplate.slots.length === 0) {
      return {
        totalSlots: 0,
        productionTarget: 0,
        providerHours: 0,
        utilization: 0,
      }
    }
    const totalSlots = currentTemplate.slots.length
    const productionTarget = currentTemplate.slots.reduce(
      (sum, s) => sum + getSlotValue(s),
      0
    )

    const providerMinutes = currentTemplate.slots.reduce((sum, s) => {
      return sum + (timeToMinutes(s.endTime) - timeToMinutes(s.startTime))
    }, 0)
    const providerHours = Math.round((providerMinutes / 60) * 10) / 10

    const usedOps = new Set(currentTemplate.slots.map((s) => getSlotOperatory(s)))
    const availableMinutes = usedOps.size * 540 // 9 productive hours
    const utilization =
      availableMinutes > 0
        ? Math.round((providerMinutes / availableMinutes) * 100)
        : 0

    return { totalSlots, productionTarget, providerHours, utilization }
  }, [currentTemplate])

  // Group slots by operatory for the grid
  const slotsByOperatory = useMemo(() => {
    if (!currentTemplate) return {}
    const map: Record<string, SlotData[]> = {}
    for (const slot of currentTemplate.slots) {
      const opKey = getSlotOperatory(slot)
      if (!map[opKey]) map[opKey] = []
      map[opKey].push(slot)
    }
    for (const key of Object.keys(map)) {
      map[key].sort(
        (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
      )
    }
    return map
  }, [currentTemplate])

  // Operatories that have slots
  const activeOperatories = useMemo(() => {
    const ops = Object.keys(slotsByOperatory)
    const order = operatories.map((o: any) => o.name)
    return ops.sort((a, b) => order.indexOf(a) - order.indexOf(b))
  }, [slotsByOperatory, operatories])

  // Loading state — after all hooks
  if (operatoriesData === undefined || providersData === undefined || templatesData === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Perfect Day Templates</h1>
            <p className="text-muted-foreground">Define ideal schedule templates for each day of the week.</p>
          </div>
        </div>
        <div className="h-12 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="h-96 bg-muted animate-pulse rounded-lg" />
      </div>
    )
  }

  function openEditSlot(slot: SlotData, index: number) {
    setEditSlot({ slot, index })
    setEditForm({
      appointmentType: slot.appointmentType || slot.category || "",
      category: slot.category,
      provider: slot.provider || "",
      operatory: getSlotOperatory(slot),
      startTime: slot.startTime,
      endTime: slot.endTime,
      value: String(getSlotValue(slot)),
    })
    setEditOpen(true)
  }

  function handleSaveSlot() {
    setEditOpen(false)
    setEditSlot(null)
  }

  function handleDeleteSlot() {
    setEditOpen(false)
    setEditSlot(null)
  }

  function handleCreateTemplate() {
    setCreateOpen(false)
    setCreateForm({ name: "", copyFrom: "" })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Perfect Day Templates
          </h1>
          <p className="text-muted-foreground">
            Define ideal schedule templates for each day of the week.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-4" />
          Create Template
        </Button>
      </div>

      {/* Day-of-week tabs */}
      <Tabs value={selectedDay} onValueChange={setSelectedDay}>
        <TabsList className="w-full justify-start">
          {DAY_NAMES.map((d) => (
            <TabsTrigger key={d.key} value={String(d.key)}>
              <span className="hidden sm:inline">{d.full}</span>
              <span className="sm:hidden">{d.short}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {DAY_NAMES.map((d) => (
          <TabsContent key={d.key} value={String(d.key)}>
            {/* Template name */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold">
                {templates[d.key]?.name ?? `${d.full} Template`}
              </h2>
            </div>

            {/* Stats Cards */}
            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Card className="py-3">
                <CardContent className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <CalendarCheck className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Slots</p>
                    <p className="text-xl font-bold">{stats.totalSlots}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="py-3">
                <CardContent className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                    <DollarSign className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Production Target
                    </p>
                    <p className="text-xl font-bold">
                      {formatCurrency(stats.productionTarget)}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="py-3">
                <CardContent className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                    <Users className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Provider Hours
                    </p>
                    <p className="text-xl font-bold">{stats.providerHours}h</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="py-3">
                <CardContent className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                    <BarChart3 className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Utilization</p>
                    <p className="text-xl font-bold">{stats.utilization}%</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Schedule Grid */}
            {templates[d.key]?.slots.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <CalendarCheck className="mb-3 size-12 text-muted-foreground/40" />
                  <h3 className="text-lg font-semibold text-muted-foreground">
                    No template configured
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Create a Perfect Day template for {d.full} to optimize
                    scheduling.
                  </p>
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="mr-2 size-4" />
                    Create Template
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <div
                      className="min-w-[700px]"
                      style={{
                        display: "grid",
                        gridTemplateColumns: `60px repeat(${activeOperatories.length}, 1fr)`,
                      }}
                    >
                      {/* Header row */}
                      <div className="sticky top-0 z-10 border-b bg-muted/50 p-2 text-xs font-medium text-muted-foreground">
                        Time
                      </div>
                      {activeOperatories.map((op) => (
                        <div
                          key={op}
                          className="sticky top-0 z-10 border-b border-l bg-muted/50 p-2 text-center text-xs font-medium text-muted-foreground"
                        >
                          {op}
                        </div>
                      ))}

                      {/* Time rows */}
                      {TIME_SLOTS.filter((_, i) => i < TIME_SLOTS.length - 1).map(
                        (time) => {
                          const timeMin = timeToMinutes(time)
                          const isHour = time.endsWith(":00")

                          return (
                            <>
                              <div
                                key={`time-${time}`}
                                className={cn(
                                  "flex items-start justify-end border-b px-2 py-1 text-[10px] text-muted-foreground",
                                  isHour
                                    ? "border-b-muted-foreground/20"
                                    : "border-b-muted/60"
                                )}
                                style={{ height: "40px" }}
                              >
                                {isHour && formatTime(time)}
                              </div>

                              {activeOperatories.map((op) => {
                                const slotHere = slotsByOperatory[op]?.find(
                                  (s) => s.startTime === time
                                )
                                const isInsideSlot = slotsByOperatory[op]?.some(
                                  (s) =>
                                    timeMin > timeToMinutes(s.startTime) &&
                                    timeMin < timeToMinutes(s.endTime)
                                )

                                if (isInsideSlot) {
                                  return null
                                }

                                if (slotHere) {
                                  const durationMin =
                                    timeToMinutes(slotHere.endTime) -
                                    timeToMinutes(slotHere.startTime)
                                  const spanRows = durationMin / 30
                                  const colors = getCategoryColor(
                                    slotHere.category
                                  )
                                  const slotIndex =
                                    currentTemplate.slots.indexOf(slotHere)

                                  return (
                                    <div
                                      key={`${op}-${time}`}
                                      className={cn(
                                        "relative border-b border-l p-1",
                                        isHour
                                          ? "border-b-muted-foreground/20"
                                          : "border-b-muted/60"
                                      )}
                                      style={{
                                        height: `${spanRows * 40}px`,
                                        gridRow: `span ${spanRows}`,
                                      }}
                                    >
                                      <button
                                        onClick={() =>
                                          openEditSlot(slotHere, slotIndex)
                                        }
                                        className={cn(
                                          "flex h-full w-full flex-col rounded-md p-1.5 text-left transition-all hover:ring-2 hover:ring-ring",
                                          colors.bg,
                                          colors.text
                                        )}
                                      >
                                        <div className="flex items-center justify-between gap-1">
                                          <span className="truncate text-xs font-semibold">
                                            {getSlotLabel(slotHere)}
                                          </span>
                                          <Pencil className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                                        </div>
                                        {slotHere.provider && (
                                          <span className="mt-0.5 text-[10px] opacity-80">
                                            {slotHere.provider}
                                          </span>
                                        )}
                                        <span className="text-[10px] opacity-70">
                                          {formatTime(slotHere.startTime)} -{" "}
                                          {formatTime(slotHere.endTime)}
                                        </span>
                                        {spanRows >= 2 && (
                                          <span className="mt-auto text-[10px] font-medium">
                                            {formatCurrency(getSlotValue(slotHere))}
                                          </span>
                                        )}
                                      </button>
                                    </div>
                                  )
                                }

                                return (
                                  <div
                                    key={`${op}-${time}`}
                                    className={cn(
                                      "border-b border-l",
                                      isHour
                                        ? "border-b-muted-foreground/20"
                                        : "border-b-muted/60"
                                    )}
                                    style={{ height: "40px" }}
                                  />
                                )
                              })}
                            </>
                          )
                        }
                      )}
                    </div>
                  </div>

                  {/* Category Legend */}
                  <Separator />
                  <div className="flex flex-wrap items-center gap-3 p-3">
                    {["Hygiene", "Restorative", "Surgical", "Cosmetic", "Admin", "Emergency"].map(
                      (cat) => {
                        const colors = getCategoryColor(cat)
                        return (
                          <Badge
                            key={cat}
                            variant="secondary"
                            className={colors.badge}
                          >
                            {cat}
                          </Badge>
                        )
                      }
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Edit Slot Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Template Slot</DialogTitle>
            <DialogDescription>
              Modify this time slot in the Perfect Day template.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={editForm.category}
                onValueChange={(v) =>
                  setEditForm({ ...editForm, category: v, appointmentType: "" })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(CATEGORY_TYPES).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Appointment Type</Label>
              <Select
                value={editForm.appointmentType}
                onValueChange={(v) =>
                  setEditForm({ ...editForm, appointmentType: v })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {(CATEGORY_TYPES[editForm.category] ?? []).map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={editForm.provider}
                onValueChange={(v) =>
                  setEditForm({ ...editForm, provider: v })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {providerNames.map((p: string) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Operatory</Label>
              <Select
                value={editForm.operatory}
                onValueChange={(v) =>
                  setEditForm({ ...editForm, operatory: v })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select operatory" />
                </SelectTrigger>
                <SelectContent>
                  {operatories.map((o: any) => (
                    <SelectItem key={o._id || o.id} value={o.name}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Select
                  value={editForm.startTime}
                  onValueChange={(v) =>
                    setEditForm({ ...editForm, startTime: v })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {formatTime(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Select
                  value={editForm.endTime}
                  onValueChange={(v) =>
                    setEditForm({ ...editForm, endTime: v })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {formatTime(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Production Value ($)</Label>
              <Input
                type="number"
                value={editForm.value}
                onChange={(e) =>
                  setEditForm({ ...editForm, value: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="destructive"
              onClick={handleDeleteSlot}
              className="sm:mr-auto"
            >
              <Trash2 className="mr-2 size-4" />
              Delete Slot
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSlot}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Perfect Day Template</DialogTitle>
            <DialogDescription>
              Set up a new template or copy from an existing day.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select
                value={selectedDay}
                onValueChange={setSelectedDay}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_NAMES.map((d) => (
                    <SelectItem key={d.key} value={String(d.key)}>
                      {d.full}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, name: e.target.value })
                }
                placeholder="e.g., Tuesday - Balanced Day"
              />
            </div>
            <div className="space-y-2">
              <Label>Copy From (optional)</Label>
              <Select
                value={createForm.copyFrom}
                onValueChange={(v) =>
                  setCreateForm({ ...createForm, copyFrom: v })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Start empty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Start empty</SelectItem>
                  {DAY_NAMES.filter(
                    (d) => templates[d.key]?.slots.length > 0
                  ).map((d) => (
                    <SelectItem key={d.key} value={String(d.key)}>
                      <div className="flex items-center gap-2">
                        <Copy className="size-3" />
                        {templates[d.key]?.name ?? d.full}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate}>Create Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
