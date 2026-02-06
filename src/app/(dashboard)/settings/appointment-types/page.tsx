"use client"

import { useState, useMemo } from "react"
import {
  Plus,
  Pencil,
  Search,
  CalendarClock,
} from "lucide-react"
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

// ---------------------------------------------------------------------------
// Demo Data
// ---------------------------------------------------------------------------
const DEMO_APPOINTMENT_TYPES: AppointmentType[] = [
  {
    id: "at_1",
    name: "Adult Prophylaxis",
    code: "D1110",
    duration: 60,
    category: "hygiene",
    productionValue: 150,
    isActive: true,
  },
  {
    id: "at_2",
    name: "Child Prophylaxis",
    code: "D1120",
    duration: 45,
    category: "hygiene",
    productionValue: 95,
    isActive: true,
  },
  {
    id: "at_3",
    name: "Scaling & Root Planing (per quad)",
    code: "D4341",
    duration: 90,
    category: "hygiene",
    productionValue: 275,
    isActive: true,
  },
  {
    id: "at_4",
    name: "Porcelain Crown",
    code: "D2740",
    duration: 90,
    category: "restorative",
    productionValue: 1200,
    isActive: true,
  },
  {
    id: "at_5",
    name: "Composite Filling (2 surface)",
    code: "D2332",
    duration: 45,
    category: "restorative",
    productionValue: 250,
    isActive: true,
  },
  {
    id: "at_6",
    name: "Comprehensive Oral Evaluation",
    code: "D0150",
    duration: 30,
    category: "diagnostic",
    productionValue: 85,
    isActive: true,
  },
  {
    id: "at_7",
    name: "Periodic Oral Evaluation",
    code: "D0120",
    duration: 15,
    category: "diagnostic",
    productionValue: 55,
    isActive: true,
  },
  {
    id: "at_8",
    name: "Root Canal (Anterior)",
    code: "D3310",
    duration: 90,
    category: "endodontic",
    productionValue: 850,
    isActive: true,
  },
  {
    id: "at_9",
    name: "Surgical Extraction",
    code: "D7210",
    duration: 60,
    category: "surgical",
    productionValue: 350,
    isActive: true,
  },
  {
    id: "at_10",
    name: "Emergency Exam",
    code: "D0140",
    duration: 30,
    category: "emergency",
    productionValue: 75,
    isActive: true,
  },
]

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
  const [types, setTypes] = useState(DEMO_APPOINTMENT_TYPES)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingType, setEditingType] = useState<
    (typeof EMPTY_FORM & { id?: string }) | null
  >(null)
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    if (!search) return types
    const q = search.toLowerCase()
    return types.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        categoryLabel(t.category).toLowerCase().includes(q)
    )
  }, [types, search])

  function openAdd() {
    setEditingType({ ...EMPTY_FORM })
    setDialogOpen(true)
  }

  function openEdit(type: AppointmentType) {
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

  function handleSave(data: typeof EMPTY_FORM & { id?: string }) {
    if (data.id) {
      setTypes((prev) =>
        prev.map((t) =>
          t.id === data.id
            ? { ...t, ...data, id: t.id, isActive: t.isActive }
            : t
        )
      )
    } else {
      const newType: AppointmentType = {
        id: `at_${Date.now()}`,
        ...data,
        isActive: true,
      }
      setTypes((prev) => [...prev, newType])
    }
  }

  function toggleActive(id: string) {
    setTypes((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t))
    )
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
