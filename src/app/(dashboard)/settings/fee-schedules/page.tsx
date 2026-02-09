"use client"

import { Fragment, useState } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DataEmptyState } from "@/components/ui/data-empty-state"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Plus,
  Pencil,
  DollarSign,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Demo Data
// ---------------------------------------------------------------------------

interface FeeEntry {
  code: string
  description: string
  fee: number
  effectiveDate: string
}

interface FeeSchedule {
  id: string
  name: string
  payerName: string | null
  isDefault: boolean
  isActive: boolean
  fees: FeeEntry[]
}

// (Demo data removed - data sourced from Convex queries)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FeeSchedulesPage() {
  const rawSchedules = useQuery(api.feeSchedules.queries.list as any, {})
  const [expandedSchedule, setExpandedSchedule] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<FeeSchedule | null>(null)
  const [editingFee, setEditingFee] = useState<{
    scheduleId: string
    feeIndex: number
  } | null>(null)
  const [editFeeValue, setEditFeeValue] = useState("")

  // Form state for add/edit dialog
  const [formName, setFormName] = useState("")
  const [formPayer, setFormPayer] = useState("")
  const [formIsDefault, setFormIsDefault] = useState(false)

  // Loading state
  if (rawSchedules === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Fee Schedules</h1>
            <p className="text-muted-foreground">
              Insurance fee schedules and UCR rates by procedure code.
            </p>
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <Card>
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Map Convex docs to local shape
  const schedules: FeeSchedule[] = (rawSchedules as any[]).map((s: any) => ({
    id: s._id ?? s.id,
    name: s.name ?? "",
    payerName: s.payerName ?? null,
    isDefault: s.isDefault ?? false,
    isActive: s.isActive ?? true,
    fees: (s.fees ?? []).map((f: any) => ({
      code: f.code ?? "",
      description: f.description ?? "",
      fee: f.fee ?? 0,
      effectiveDate: f.effectiveDate ?? "",
    })),
  }))

  function handleOpenEdit(schedule: FeeSchedule) {
    setEditingSchedule(schedule)
    setFormName(schedule.name)
    setFormPayer(schedule.payerName ?? "")
    setFormIsDefault(schedule.isDefault)
    setEditDialogOpen(true)
  }

  function handleSaveEdit() {
    // TODO: Call Convex mutation to update fee schedule
    setEditDialogOpen(false)
    setEditingSchedule(null)
  }

  function handleAddSchedule() {
    // TODO: Call Convex mutation to create fee schedule
    setAddDialogOpen(false)
    setFormName("")
    setFormPayer("")
    setFormIsDefault(false)
  }

  function handleStartEditFee(scheduleId: string, feeIndex: number, currentFee: number) {
    setEditingFee({ scheduleId, feeIndex })
    setEditFeeValue(currentFee.toString())
  }

  function handleSaveFee() {
    // TODO: Call Convex mutation to update fee value
    setEditingFee(null)
    setEditFeeValue("")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fee Schedules</h1>
          <p className="text-muted-foreground">
            Insurance fee schedules and UCR rates by procedure code. Used for
            claims scrubbing validation and production tracking.
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setFormName("")
                setFormPayer("")
                setFormIsDefault(false)
              }}
            >
              <Plus className="size-4" />
              Add Fee Schedule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Fee Schedule</DialogTitle>
              <DialogDescription>
                Create a new fee schedule for a payer or as a default UCR schedule.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="add-name">Schedule Name</Label>
                <Input
                  id="add-name"
                  placeholder="e.g., Aetna DMO"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-payer">Payer (optional)</Label>
                <Input
                  id="add-payer"
                  placeholder="e.g., Aetna"
                  value={formPayer}
                  onChange={(e) => setFormPayer(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="add-default"
                  checked={formIsDefault}
                  onChange={(e) => setFormIsDefault(e.target.checked)}
                  className="rounded border-input"
                />
                <Label htmlFor="add-default">Set as default schedule</Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddSchedule} disabled={!formName}>
                Add Schedule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Fee Schedule</DialogTitle>
            <DialogDescription>
              Update fee schedule name, payer, and default status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Schedule Name</Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-payer">Payer (optional)</Label>
              <Input
                id="edit-payer"
                value={formPayer}
                onChange={(e) => setFormPayer(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-default"
                checked={formIsDefault}
                onChange={(e) => setFormIsDefault(e.target.checked)}
                className="rounded border-input"
              />
              <Label htmlFor="edit-default">Set as default schedule</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!formName}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fee Schedules Table */}
      {schedules.length === 0 ? (
        <DataEmptyState resource="fee schedules" />
      ) : (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]" />
                <TableHead>Schedule Name</TableHead>
                <TableHead>Payer</TableHead>
                <TableHead className="text-right"># Procedures</TableHead>
                <TableHead className="text-center">Default</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((schedule) => {
                const isExpanded = expandedSchedule === schedule.id

                return (
                  <Fragment key={schedule.id}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() =>
                        setExpandedSchedule(
                          isExpanded ? null : schedule.id
                        )
                      }
                    >
                      <TableCell>
                        {isExpanded ? (
                          <ChevronDown className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {schedule.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {schedule.payerName ?? "Default (UCR)"}
                      </TableCell>
                      <TableCell className="text-right">
                        {schedule.fees.length}
                      </TableCell>
                      <TableCell className="text-center">
                        {schedule.isDefault && (
                          <CheckCircle className="size-4 text-green-600 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={schedule.isActive ? "secondary" : "outline"}
                          className={
                            schedule.isActive
                              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                              : ""
                          }
                        >
                          {schedule.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div
                          className="flex gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleOpenEdit(schedule)}
                          >
                            <Pencil className="size-3" />
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={7} className="p-4 bg-muted/30">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-semibold">
                                Procedure Fees
                              </h4>
                              <Button size="xs" variant="outline">
                                <Plus className="size-3" />
                                Add Procedure
                              </Button>
                            </div>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>CDT Code</TableHead>
                                  <TableHead>Description</TableHead>
                                  <TableHead className="text-right">
                                    Fee
                                  </TableHead>
                                  <TableHead>Effective Date</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {schedule.fees.map((fee, feeIdx) => {
                                  const isEditingThis =
                                    editingFee?.scheduleId === schedule.id &&
                                    editingFee?.feeIndex === feeIdx

                                  return (
                                    <TableRow key={fee.code + feeIdx}>
                                      <TableCell className="font-mono text-xs">
                                        {fee.code}
                                      </TableCell>
                                      <TableCell>{fee.description}</TableCell>
                                      <TableCell className="text-right">
                                        {isEditingThis ? (
                                          <div className="flex items-center justify-end gap-1">
                                            <DollarSign className="size-3 text-muted-foreground" />
                                            <Input
                                              type="number"
                                              value={editFeeValue}
                                              onChange={(e) =>
                                                setEditFeeValue(e.target.value)
                                              }
                                              onKeyDown={(e) => {
                                                if (e.key === "Enter")
                                                  handleSaveFee()
                                                if (e.key === "Escape")
                                                  setEditingFee(null)
                                              }}
                                              className="w-24 h-7 text-right text-xs"
                                              autoFocus
                                            />
                                            <Button
                                              size="xs"
                                              variant="ghost"
                                              onClick={handleSaveFee}
                                            >
                                              <CheckCircle className="size-3 text-green-600" />
                                            </Button>
                                          </div>
                                        ) : (
                                          <button
                                            className="hover:underline cursor-pointer text-right"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleStartEditFee(
                                                schedule.id,
                                                feeIdx,
                                                fee.fee
                                              )
                                            }}
                                          >
                                            {formatCurrency(fee.fee)}
                                          </button>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-muted-foreground">
                                        {fee.effectiveDate}
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                                {schedule.fees.length === 0 && (
                                  <TableRow>
                                    <TableCell
                                      colSpan={4}
                                      className="text-center text-muted-foreground py-6"
                                    >
                                      No procedures added yet. Click &quot;Add
                                      Procedure&quot; to get started.
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      )}
    </div>
  )
}

