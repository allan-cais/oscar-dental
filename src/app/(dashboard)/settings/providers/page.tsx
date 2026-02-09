"use client"

import React, { useState, useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import {
  Plus,
  Pencil,
  Search,
  Stethoscope,
  ChevronDown,
  ChevronRight,
  Trash2,
  Clock,
} from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { DataEmptyState } from "@/components/ui/data-empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ProviderType = "dentist" | "hygienist" | "specialist" | "assistant"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function typeBadge(type: ProviderType) {
  switch (type) {
    case "dentist":
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
          Dentist
        </Badge>
      )
    case "hygienist":
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
          Hygienist
        </Badge>
      )
    case "specialist":
      return (
        <Badge className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800">
          Specialist
        </Badge>
      )
    case "assistant":
      return (
        <Badge className="bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">
          Assistant
        </Badge>
      )
  }
}

const PROVIDER_TYPES: { value: ProviderType; label: string }[] = [
  { value: "dentist", label: "Dentist" },
  { value: "hygienist", label: "Hygienist" },
  { value: "specialist", label: "Specialist" },
  { value: "assistant", label: "Assistant" },
]

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  npi: "",
  type: "dentist" as ProviderType,
  specialty: "",
  practice: "Canopy Dental - Austin",
}

// ---------------------------------------------------------------------------
// Provider Dialog
// ---------------------------------------------------------------------------
function ProviderDialog({
  open,
  onOpenChange,
  provider,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  provider: typeof EMPTY_FORM & { id?: string }
  onSave: (data: typeof EMPTY_FORM & { id?: string }) => void
}) {
  const [form, setForm] = useState(provider)
  const isEdit = !!provider.id

  // Reset form when dialog opens with new data
  useState(() => {
    setForm(provider)
  })

  function handleSave() {
    if (!form.firstName || !form.lastName) return
    onSave(form)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Provider" : "Add Provider"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update provider information."
              : "Add a new provider to your practice."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provFirstName">First Name</Label>
              <Input
                id="provFirstName"
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
                placeholder="Emily"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provLastName">Last Name</Label>
              <Input
                id="provLastName"
                value={form.lastName}
                onChange={(e) =>
                  setForm({ ...form, lastName: e.target.value })
                }
                placeholder="Park"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provType">Type</Label>
              <Select
                value={form.type}
                onValueChange={(val) =>
                  setForm({ ...form, type: val as ProviderType })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="provNpi">NPI</Label>
              <Input
                id="provNpi"
                value={form.npi}
                onChange={(e) => setForm({ ...form, npi: e.target.value })}
                placeholder="1234567890"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="provSpecialty">Specialty</Label>
            <Input
              id="provSpecialty"
              value={form.specialty}
              onChange={(e) =>
                setForm({ ...form, specialty: e.target.value })
              }
              placeholder="General Dentistry"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="provPractice">Practice</Label>
            <Select
              value={form.practice}
              onValueChange={(val) => setForm({ ...form, practice: val })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select practice" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Canopy Dental - Austin">
                  Canopy Dental - Austin
                </SelectItem>
                <SelectItem value="Canopy Dental - Round Rock">
                  Canopy Dental - Round Rock
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!form.firstName || !form.lastName}
          >
            {isEdit ? "Save Changes" : "Add Provider"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Day Names
// ---------------------------------------------------------------------------
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

// ---------------------------------------------------------------------------
// Working Hours Section
// ---------------------------------------------------------------------------
function WorkingHoursSection({ providerId }: { providerId: string }) {
  const [expanded, setExpanded] = useState(false)
  const [newDay, setNewDay] = useState(1) // Monday default
  const [newStart, setNewStart] = useState("08:00")
  const [newEnd, setNewEnd] = useState("17:00")

  const workingHours = useQuery(
    (api as any).workingHours.queries.list,
    { providerId }
  )
  const createWorkingHour = useMutation((api as any).workingHours.mutations.create)
  const removeWorkingHour = useMutation((api as any).workingHours.mutations.remove)

  async function handleAdd() {
    try {
      await createWorkingHour({
        pmsProviderId: providerId,
        dayOfWeek: newDay,
        startTime: newStart,
        endTime: newEnd,
      })
      toast.success("Working hours added")
    } catch (error) {
      toast.error("Failed to add working hours")
    }
  }

  async function handleRemove(id: string) {
    try {
      await removeWorkingHour({ workingHourId: id as any })
      toast.success("Working hours removed")
    } catch (error) {
      toast.error("Failed to remove working hours")
    }
  }

  const hours = (workingHours as any[] | undefined) ?? []

  return (
    <div className="border-t mt-2 pt-2">
      <button
        type="button"
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full text-left py-1"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        <Clock className="size-4" />
        Working Hours
        <Badge variant="secondary" className="ml-auto text-xs">
          {hours.length}
        </Badge>
      </button>
      {expanded && (
        <div className="mt-2 space-y-3">
          {hours.length === 0 ? (
            <p className="text-xs text-muted-foreground pl-6">No working hours configured.</p>
          ) : (
            <div className="space-y-1 pl-6">
              {hours.map((h: any) => (
                <div key={h._id ?? h.id} className="flex items-center gap-3 text-sm">
                  <span className="w-24 font-medium">{DAY_NAMES[h.dayOfWeek] ?? `Day ${h.dayOfWeek}`}</span>
                  <span className="text-muted-foreground">{h.startTime} - {h.endTime}</span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 ml-auto"
                    onClick={() => handleRemove(h._id ?? h.id)}
                  >
                    <Trash2 className="size-3.5" />
                    <span className="sr-only">Remove</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2 pl-6">
            <div className="space-y-1">
              <Label className="text-xs">Day</Label>
              <Select value={String(newDay)} onValueChange={(v) => setNewDay(Number(v))}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_NAMES.map((name, i) => (
                    <SelectItem key={i} value={String(i)}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Start</Label>
              <Input
                type="time"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                className="w-[110px] h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End</Label>
              <Input
                type="time"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                className="w-[110px] h-8 text-xs"
              />
            </div>
            <Button size="sm" variant="outline" className="h-8" onClick={handleAdd}>
              <Plus className="size-3.5 mr-1" />
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function ProvidersSettingsPage() {
  const rawProviders = useQuery(api.providers.queries.list as any, {})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<
    (typeof EMPTY_FORM & { id?: string }) | null
  >(null)
  const [search, setSearch] = useState("")
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null)

  // Loading state
  if (rawProviders === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Providers</h1>
            <p className="text-muted-foreground">Manage providers across your practices.</p>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-20" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-64 mb-4" />
            <div className="rounded-md border p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Map Convex docs to local shape
  const providers = (rawProviders as any[]).map((p: any) => ({
    id: p._id ?? p.id,
    pmsProviderId: p.pmsProviderId ?? p.foreignId ?? p._id ?? p.id,
    firstName: p.firstName ?? "",
    lastName: p.lastName ?? "",
    npi: p.npi ?? "",
    type: (p.type ?? "dentist") as ProviderType,
    specialty: p.specialty ?? "",
    practice: p.practice ?? "",
    isActive: p.isActive ?? true,
  }))

  const filtered = search
    ? providers.filter((p) => {
        const q = search.toLowerCase()
        return (
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
          p.npi.includes(q) ||
          p.specialty.toLowerCase().includes(q)
        )
      })
    : providers

  function openAdd() {
    setEditingProvider({ ...EMPTY_FORM })
    setDialogOpen(true)
  }

  function openEdit(provider: (typeof providers)[number]) {
    setEditingProvider({
      id: provider.id,
      firstName: provider.firstName,
      lastName: provider.lastName,
      npi: provider.npi,
      type: provider.type,
      specialty: provider.specialty,
      practice: provider.practice,
    })
    setDialogOpen(true)
  }

  function handleSave(_data: typeof EMPTY_FORM & { id?: string }) {
    // TODO: Call Convex mutation to create/update provider
    // For now, data will refresh via useQuery reactivity
  }

  function toggleActive(_id: string) {
    // TODO: Call Convex mutation to toggle active status
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Providers</h1>
          <p className="text-muted-foreground">
            Manage providers across your practices.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 size-4" />
          Add Provider
        </Button>
      </div>

      {providers.length === 0 && !search ? (
        <DataEmptyState resource="providers" />
      ) : (
      <Card>
        <CardHeader>
          <CardTitle>All Providers</CardTitle>
          <CardDescription>
            {filtered.length} provider{filtered.length !== 1 && "s"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search providers..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>NPI</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Practice</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-32 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Stethoscope className="size-8 text-muted-foreground/50" />
                        <p>No providers found.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((provider) => (
                    <React.Fragment key={provider.id}>
                    <TableRow>
                      <TableCell className="font-medium">
                        <button
                          type="button"
                          className="flex items-center gap-1.5 hover:underline"
                          onClick={() => setExpandedProvider(expandedProvider === provider.id ? null : provider.id)}
                        >
                          {expandedProvider === provider.id ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                          {provider.firstName} {provider.lastName}
                        </button>
                      </TableCell>
                      <TableCell>{typeBadge(provider.type)}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {provider.npi}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {provider.specialty}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {provider.practice}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            provider.isActive
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400"
                          )}
                        >
                          {provider.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setExpandedProvider(expandedProvider === provider.id ? null : provider.id)}
                            title="Working Hours"
                          >
                            <Clock className="size-3.5" />
                            <span className="sr-only">Working Hours</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => openEdit(provider)}
                          >
                            <Pencil className="size-3.5" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            className={cn(
                              provider.isActive
                                ? "text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            )}
                            onClick={() => toggleActive(provider.id)}
                          >
                            {provider.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedProvider === provider.id && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted/30 p-4">
                          <WorkingHoursSection providerId={provider.pmsProviderId} />
                        </TableCell>
                      </TableRow>
                    )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      )}

      {editingProvider && (
        <ProviderDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) setEditingProvider(null)
          }}
          provider={editingProvider}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
