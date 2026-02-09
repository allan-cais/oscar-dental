"use client"

import { useState, useMemo } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import {
  Plus,
  Pencil,
  Search,
  DoorOpen,
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

// ---------------------------------------------------------------------------
// (Types are inferred from Convex query results)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Empty Form
// ---------------------------------------------------------------------------
const EMPTY_FORM = {
  name: "",
  shortName: "",
  practice: "Canopy Dental - Austin",
}

// ---------------------------------------------------------------------------
// Operatory Dialog
// ---------------------------------------------------------------------------
function OperatoryDialog({
  open,
  onOpenChange,
  operatory,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  operatory: typeof EMPTY_FORM & { id?: string }
  onSave: (data: typeof EMPTY_FORM & { id?: string }) => void
}) {
  const [form, setForm] = useState(operatory)
  const isEdit = !!operatory.id

  useState(() => {
    setForm(operatory)
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
            {isEdit ? "Edit Operatory" : "Add Operatory"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update operatory details."
              : "Add a new operatory to your practice."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="opName">Name</Label>
            <Input
              id="opName"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Operatory 1 - Hygiene"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="opShortName">Short Name</Label>
            <Input
              id="opShortName"
              value={form.shortName}
              onChange={(e) =>
                setForm({ ...form, shortName: e.target.value })
              }
              placeholder="OP1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="opPractice">Practice</Label>
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
          <Button onClick={handleSave} disabled={!form.name}>
            {isEdit ? "Save Changes" : "Add Operatory"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function OperatoriesSettingsPage() {
  const rawOperatories = useQuery(api.operatories.queries.list as any, {})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingOp, setEditingOp] = useState<
    (typeof EMPTY_FORM & { id?: string }) | null
  >(null)
  const [search, setSearch] = useState("")

  // Loading state
  if (rawOperatories === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Operatories</h1>
            <p className="text-muted-foreground">Manage operatory rooms across your practices.</p>
          </div>
          <Skeleton className="h-10 w-36" />
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
  const operatories = (rawOperatories as any[]).map((op: any) => ({
    id: op._id ?? op.id,
    name: op.name ?? "",
    shortName: op.shortName ?? "",
    practice: op.practice ?? "",
    isActive: op.isActive ?? true,
  }))

  const filtered = search
    ? operatories.filter((op) => {
        const q = search.toLowerCase()
        return (
          op.name.toLowerCase().includes(q) ||
          op.shortName.toLowerCase().includes(q) ||
          op.practice.toLowerCase().includes(q)
        )
      })
    : operatories

  function openAdd() {
    setEditingOp({ ...EMPTY_FORM })
    setDialogOpen(true)
  }

  function openEdit(op: (typeof operatories)[number]) {
    setEditingOp({
      id: op.id,
      name: op.name,
      shortName: op.shortName,
      practice: op.practice,
    })
    setDialogOpen(true)
  }

  function handleSave(_data: typeof EMPTY_FORM & { id?: string }) {
    // TODO: Call Convex mutation to create/update operatory
  }

  function toggleActive(_id: string) {
    // TODO: Call Convex mutation to toggle active status
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Operatories</h1>
          <p className="text-muted-foreground">
            Manage operatory rooms across your practices.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 size-4" />
          Add Operatory
        </Button>
      </div>

      {operatories.length === 0 && !search ? (
        <DataEmptyState resource="operatories" />
      ) : (
      <Card>
        <CardHeader>
          <CardTitle>All Operatories</CardTitle>
          <CardDescription>
            {filtered.length} operator{filtered.length !== 1 ? "ies" : "y"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search operatories..."
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
                  <TableHead>Short Name</TableHead>
                  <TableHead>Practice</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-32 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <DoorOpen className="size-8 text-muted-foreground/50" />
                        <p>No operatories found.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((op) => (
                    <TableRow key={op.id}>
                      <TableCell className="font-medium">{op.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {op.shortName}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {op.practice}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            op.isActive
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400"
                          )}
                        >
                          {op.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => openEdit(op)}
                          >
                            <Pencil className="size-3.5" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            className={cn(
                              op.isActive
                                ? "text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            )}
                            onClick={() => toggleActive(op.id)}
                          >
                            {op.isActive ? "Deactivate" : "Activate"}
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

      {editingOp && (
        <OperatoryDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) setEditingOp(null)
          }}
          operatory={editingOp}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
