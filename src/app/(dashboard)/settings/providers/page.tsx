"use client"

import { useState, useMemo } from "react"
import {
  Plus,
  Pencil,
  Search,
  Stethoscope,
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
type ProviderType = "dentist" | "hygienist" | "specialist" | "assistant"

interface Provider {
  id: string
  firstName: string
  lastName: string
  npi: string
  type: ProviderType
  specialty: string
  practice: string
  isActive: boolean
}

// ---------------------------------------------------------------------------
// Demo Data
// ---------------------------------------------------------------------------
const DEMO_PROVIDERS: Provider[] = [
  {
    id: "prov_1",
    firstName: "Emily",
    lastName: "Park",
    npi: "1234567890",
    type: "dentist",
    specialty: "General Dentistry",
    practice: "Canopy Dental - Austin",
    isActive: true,
  },
  {
    id: "prov_2",
    firstName: "Sarah",
    lastName: "Mitchell",
    npi: "2345678901",
    type: "hygienist",
    specialty: "Dental Hygiene",
    practice: "Canopy Dental - Austin",
    isActive: true,
  },
  {
    id: "prov_3",
    firstName: "James",
    lastName: "Rodriguez",
    npi: "3456789012",
    type: "specialist",
    specialty: "Endodontics",
    practice: "Canopy Dental - Round Rock",
    isActive: true,
  },
  {
    id: "prov_4",
    firstName: "Lisa",
    lastName: "Chen",
    npi: "4567890123",
    type: "dentist",
    specialty: "General Dentistry",
    practice: "Canopy Dental - Round Rock",
    isActive: true,
  },
  {
    id: "prov_5",
    firstName: "Maria",
    lastName: "Gonzalez",
    npi: "5678901234",
    type: "hygienist",
    specialty: "Dental Hygiene",
    practice: "Canopy Dental - Austin",
    isActive: false,
  },
  {
    id: "prov_6",
    firstName: "David",
    lastName: "Kim",
    npi: "6789012345",
    type: "specialist",
    specialty: "Oral Surgery",
    practice: "Canopy Dental - Austin",
    isActive: true,
  },
]

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
// Main Page
// ---------------------------------------------------------------------------
export default function ProvidersSettingsPage() {
  const [providers, setProviders] = useState(DEMO_PROVIDERS)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<
    (typeof EMPTY_FORM & { id?: string }) | null
  >(null)
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    if (!search) return providers
    const q = search.toLowerCase()
    return providers.filter(
      (p) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
        p.npi.includes(q) ||
        p.specialty.toLowerCase().includes(q)
    )
  }, [providers, search])

  function openAdd() {
    setEditingProvider({ ...EMPTY_FORM })
    setDialogOpen(true)
  }

  function openEdit(provider: Provider) {
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

  function handleSave(data: typeof EMPTY_FORM & { id?: string }) {
    if (data.id) {
      setProviders((prev) =>
        prev.map((p) =>
          p.id === data.id
            ? { ...p, ...data, id: p.id, isActive: p.isActive }
            : p
        )
      )
    } else {
      const newProvider: Provider = {
        id: `prov_${Date.now()}`,
        ...data,
        isActive: true,
      }
      setProviders((prev) => [...prev, newProvider])
    }
  }

  function toggleActive(id: string) {
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p))
    )
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
                    <TableRow key={provider.id}>
                      <TableCell className="font-medium">
                        {provider.firstName} {provider.lastName}
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
