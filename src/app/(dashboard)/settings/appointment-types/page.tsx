"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import {
  Plus,
  Pencil,
  Search,
  CalendarClock,
} from "lucide-react"
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
import { toast } from "sonner"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ApptCategory =
  | "hygiene"
  | "restorative"
  | "surgical"
  | "diagnostic"
  | "preventive"
  | "endodontic"
  | "prosthodontic"
  | "orthodontic"
  | "emergency"
  | "other"

interface AppointmentType {
  id: string
  name: string
  code: string
  duration: number
  category: ApptCategory
  productionValue: number
  isActive: boolean
}

// (Demo data removed - data sourced from Convex queries)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const CATEGORIES: { value: ApptCategory; label: string }[] = [
  { value: "hygiene", label: "Hygiene" },
  { value: "restorative", label: "Restorative" },
  { value: "surgical", label: "Surgical" },
  { value: "diagnostic", label: "Diagnostic" },
  { value: "preventive", label: "Preventive" },
  { value: "endodontic", label: "Endodontic" },
  { value: "prosthodontic", label: "Prosthodontic" },
  { value: "orthodontic", label: "Orthodontic" },
  { value: "emergency", label: "Emergency" },
  { value: "other", label: "Other" },
]

function categoryColor(category: ApptCategory): string {
  switch (category) {
    case "hygiene":
      return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
    case "restorative":
      return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
    case "surgical":
      return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
    case "diagnostic":
      return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
    case "preventive":
      return "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800"
    case "endodontic":
      return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800"
    case "prosthodontic":
      return "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800"
    case "orthodontic":
      return "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800"
    case "emergency":
      return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
  }
}

function categoryLabel(cat: ApptCategory): string {
  return CATEGORIES.find((c) => c.value === cat)?.label ?? cat
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount)
}

// ---------------------------------------------------------------------------
// Empty Form
// ---------------------------------------------------------------------------
const EMPTY_FORM = {
  name: "",
  code: "",
  duration: 60,
  category: "restorative" as ApptCategory,
  productionValue: 0,
}

// ---------------------------------------------------------------------------
// Appointment Type Dialog
// ---------------------------------------------------------------------------
function AppointmentTypeDialog({
  open,
  onOpenChange,
  appointmentType,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointmentType: typeof EMPTY_FORM & { id?: string }
  onSave: (data: typeof EMPTY_FORM & { id?: string }) => void
}) {
  const [form, setForm] = useState(appointmentType)
  const isEdit = !!appointmentType.id

  useState(() => {
    setForm(appointmentType)
  })

  function handleSave() {
    if (!form.name) return
    onSave(form)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Appointment Type" : "Add Appointment Type"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update appointment type details."
              : "Add a new appointment type to your practice."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="atName">Name</Label>
            <Input
              id="atName"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Adult Prophylaxis"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="atCode">CDT Code</Label>
              <Input
                id="atCode"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="D1110"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="atDuration">Duration (min)</Label>
              <Input
                id="atDuration"
                type="number"
                min={5}
                step={5}
                value={form.duration}
                onChange={(e) =>
                  setForm({ ...form, duration: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="atCategory">Category</Label>
              <Select
                value={form.category}
                onValueChange={(val) =>
                  setForm({ ...form, category: val as ApptCategory })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="atProduction">Production Value ($)</Label>
              <Input
                id="atProduction"
                type="number"
                min={0}
                step={5}
                value={form.productionValue}
                onChange={(e) =>
                  setForm({
                    ...form,
                    productionValue: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!form.name}>
            {isEdit ? "Save Changes" : "Add Type"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function AppointmentTypesSettingsPage() {
  const rawTypes = useQuery(api.appointmentTypes.queries.list as any, {})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingType, setEditingType] = useState<
    (typeof EMPTY_FORM & { id?: string }) | null
  >(null)
  const [search, setSearch] = useState("")

  const createType = useMutation((api as any).appointmentTypes.mutations.create)
  const updateType = useMutation((api as any).appointmentTypes.mutations.update)
  const deactivateType = useMutation((api as any).appointmentTypes.mutations.deactivate)

  // Loading state
  if (rawTypes === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Appointment Types</h1>
            <p className="text-muted-foreground">Manage appointment types, CDT codes, and production values.</p>
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-64 mb-4" />
            <div className="rounded-md border p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Map Convex docs to local shape
  const types = (rawTypes as any[]).map((t: any) => ({
    id: t._id ?? t.id,
    name: t.name ?? "",
    code: t.code ?? "",
    duration: t.duration ?? 60,
    category: (t.category ?? "other") as ApptCategory,
    productionValue: t.productionValue ?? 0,
    isActive: t.isActive ?? true,
  }))

  const filtered = search
    ? types.filter((t) => {
        const q = search.toLowerCase()
        return (
          t.name.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q) ||
          categoryLabel(t.category).toLowerCase().includes(q)
        )
      })
    : types

  function openAdd() {
    setEditingType({ ...EMPTY_FORM })
    setDialogOpen(true)
  }

  function openEdit(type: (typeof types)[number]) {
    setEditingType({
      id: type.id,
      name: type.name,
      code: type.code,
      duration: type.duration,
      category: type.category,
      productionValue: type.productionValue,
    })
    setDialogOpen(true)
  }

  async function handleSave(data: typeof EMPTY_FORM & { id?: string }) {
    try {
      if (data.id) {
        await updateType({
          appointmentTypeId: data.id as any,
          name: data.name,
          code: data.code,
          duration: data.duration,
          category: data.category,
          productionValue: data.productionValue,
        })
        toast.success("Appointment type updated and syncing to PMS")
      } else {
        await createType({
          name: data.name,
          code: data.code,
          duration: data.duration,
          category: data.category,
          productionValue: data.productionValue,
        })
        toast.success("Appointment type created and syncing to PMS")
      }
    } catch (error) {
      toast.error("Failed to save appointment type")
    }
  }

  async function toggleActive(id: string) {
    try {
      const type = types.find((t) => t.id === id)
      if (!type) return
      if (type.isActive) {
        await deactivateType({ appointmentTypeId: id as any })
        toast.success("Appointment type deactivated")
      } else {
        await updateType({ appointmentTypeId: id as any, name: type.name })
        toast.success("Appointment type reactivated")
      }
    } catch (error) {
      toast.error("Failed to update appointment type status")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Appointment Types
          </h1>
          <p className="text-muted-foreground">
            Manage appointment types, CDT codes, and production values.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 size-4" />
          Add Type
        </Button>
      </div>

      {types.length === 0 && !search ? (
        <DataEmptyState resource="appointment types" />
      ) : (
      <Card>
        <CardHeader>
          <CardTitle>All Appointment Types</CardTitle>
          <CardDescription>
            {filtered.length} appointment type{filtered.length !== 1 && "s"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, code, or category..."
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
                  <TableHead>CDT Code</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Production Value</TableHead>
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
                        <CalendarClock className="size-8 text-muted-foreground/50" />
                        <p>No appointment types found.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="font-mono text-xs"
                        >
                          {type.code}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {type.duration} min
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "hover:opacity-90",
                            categoryColor(type.category)
                          )}
                        >
                          {categoryLabel(type.category)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatCurrency(type.productionValue)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            type.isActive
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400"
                          )}
                        >
                          {type.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => openEdit(type)}
                          >
                            <Pencil className="size-3.5" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            className={cn(
                              type.isActive
                                ? "text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            )}
                            onClick={() => toggleActive(type.id)}
                          >
                            {type.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      )}

      {editingType && (
        <AppointmentTypeDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) setEditingType(null)
          }}
          appointmentType={editingType}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
