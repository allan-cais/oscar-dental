"use client"

import { Fragment, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

const DEMO_FEE_SCHEDULES: FeeSchedule[] = [
  {
    id: "fs_001",
    name: "UCR Default",
    payerName: null,
    isDefault: true,
    isActive: true,
    fees: [
      { code: "D0120", description: "Periodic Oral Evaluation", fee: 65, effectiveDate: "2026-01-01" },
      { code: "D0140", description: "Limited Oral Evaluation - Problem Focused", fee: 85, effectiveDate: "2026-01-01" },
      { code: "D0150", description: "Comprehensive Oral Evaluation - New or Established", fee: 95, effectiveDate: "2026-01-01" },
      { code: "D0210", description: "Intraoral - Complete Series of Radiographic Images", fee: 175, effectiveDate: "2026-01-01" },
      { code: "D0220", description: "Intraoral - Periapical First Radiographic Image", fee: 35, effectiveDate: "2026-01-01" },
      { code: "D0230", description: "Intraoral - Periapical Each Additional Image", fee: 28, effectiveDate: "2026-01-01" },
      { code: "D0274", description: "Bitewings - Four Radiographic Images", fee: 80, effectiveDate: "2026-01-01" },
      { code: "D1110", description: "Prophylaxis - Adult", fee: 125, effectiveDate: "2026-01-01" },
      { code: "D1120", description: "Prophylaxis - Child", fee: 85, effectiveDate: "2026-01-01" },
      { code: "D1208", description: "Topical Application of Fluoride", fee: 45, effectiveDate: "2026-01-01" },
      { code: "D2140", description: "Amalgam - One Surface, Primary or Permanent", fee: 195, effectiveDate: "2026-01-01" },
      { code: "D2391", description: "Resin-Based Composite - 1s, Posterior - Primary/Permanent", fee: 235, effectiveDate: "2026-01-01" },
      { code: "D2392", description: "Resin-Based Composite - 2s, Posterior - Primary/Permanent", fee: 295, effectiveDate: "2026-01-01" },
      { code: "D2740", description: "Crown - Porcelain/Ceramic", fee: 1250, effectiveDate: "2026-01-01" },
      { code: "D2750", description: "Crown - Porcelain Fused to High Noble Metal", fee: 1350, effectiveDate: "2026-01-01" },
      { code: "D2950", description: "Core Buildup, Including Any Pins", fee: 325, effectiveDate: "2026-01-01" },
      { code: "D3310", description: "Endodontic Therapy, Anterior Tooth", fee: 850, effectiveDate: "2026-01-01" },
      { code: "D4341", description: "Periodontal Scaling and Root Planing - 4+ Teeth", fee: 310, effectiveDate: "2026-01-01" },
      { code: "D4342", description: "Periodontal Scaling and Root Planing - 1-3 Teeth", fee: 195, effectiveDate: "2026-01-01" },
      { code: "D4910", description: "Periodontal Maintenance", fee: 185, effectiveDate: "2026-01-01" },
      { code: "D7140", description: "Extraction, Erupted Tooth or Exposed Root", fee: 225, effectiveDate: "2026-01-01" },
      { code: "D7210", description: "Extraction, Erupted Tooth, Surgical", fee: 385, effectiveDate: "2026-01-01" },
    ],
  },
  {
    id: "fs_002",
    name: "Delta Dental PPO",
    payerName: "Delta Dental PPO",
    isDefault: false,
    isActive: true,
    fees: [
      { code: "D0120", description: "Periodic Oral Evaluation", fee: 52, effectiveDate: "2026-01-01" },
      { code: "D0140", description: "Limited Oral Evaluation - Problem Focused", fee: 68, effectiveDate: "2026-01-01" },
      { code: "D0150", description: "Comprehensive Oral Evaluation", fee: 78, effectiveDate: "2026-01-01" },
      { code: "D0210", description: "Intraoral - Complete Series", fee: 142, effectiveDate: "2026-01-01" },
      { code: "D0220", description: "Intraoral - Periapical First Image", fee: 28, effectiveDate: "2026-01-01" },
      { code: "D0274", description: "Bitewings - Four Radiographic Images", fee: 65, effectiveDate: "2026-01-01" },
      { code: "D1110", description: "Prophylaxis - Adult", fee: 98, effectiveDate: "2026-01-01" },
      { code: "D1120", description: "Prophylaxis - Child", fee: 68, effectiveDate: "2026-01-01" },
      { code: "D1208", description: "Topical Application of Fluoride", fee: 35, effectiveDate: "2026-01-01" },
      { code: "D2391", description: "Resin-Based Composite - 1s, Posterior", fee: 188, effectiveDate: "2026-01-01" },
      { code: "D2392", description: "Resin-Based Composite - 2s, Posterior", fee: 238, effectiveDate: "2026-01-01" },
      { code: "D2740", description: "Crown - Porcelain/Ceramic", fee: 985, effectiveDate: "2026-01-01" },
      { code: "D2750", description: "Crown - Porcelain Fused to High Noble Metal", fee: 1065, effectiveDate: "2026-01-01" },
      { code: "D2950", description: "Core Buildup", fee: 258, effectiveDate: "2026-01-01" },
      { code: "D3310", description: "Endodontic Therapy, Anterior", fee: 678, effectiveDate: "2026-01-01" },
      { code: "D4341", description: "Periodontal Scaling and Root Planing - 4+", fee: 248, effectiveDate: "2026-01-01" },
      { code: "D4910", description: "Periodontal Maintenance", fee: 148, effectiveDate: "2026-01-01" },
      { code: "D7210", description: "Surgical Extraction", fee: 308, effectiveDate: "2026-01-01" },
    ],
  },
  {
    id: "fs_003",
    name: "Cigna DPPO",
    payerName: "Cigna DPPO",
    isDefault: false,
    isActive: true,
    fees: [
      { code: "D0120", description: "Periodic Oral Evaluation", fee: 48, effectiveDate: "2025-07-01" },
      { code: "D0140", description: "Limited Oral Evaluation - Problem Focused", fee: 62, effectiveDate: "2025-07-01" },
      { code: "D0150", description: "Comprehensive Oral Evaluation", fee: 72, effectiveDate: "2025-07-01" },
      { code: "D0210", description: "Intraoral - Complete Series", fee: 135, effectiveDate: "2025-07-01" },
      { code: "D0274", description: "Bitewings - Four Radiographic Images", fee: 58, effectiveDate: "2025-07-01" },
      { code: "D1110", description: "Prophylaxis - Adult", fee: 92, effectiveDate: "2025-07-01" },
      { code: "D1120", description: "Prophylaxis - Child", fee: 62, effectiveDate: "2025-07-01" },
      { code: "D1208", description: "Topical Application of Fluoride", fee: 32, effectiveDate: "2025-07-01" },
      { code: "D2391", description: "Resin-Based Composite - 1s, Posterior", fee: 175, effectiveDate: "2025-07-01" },
      { code: "D2392", description: "Resin-Based Composite - 2s, Posterior", fee: 225, effectiveDate: "2025-07-01" },
      { code: "D2740", description: "Crown - Porcelain/Ceramic", fee: 945, effectiveDate: "2025-07-01" },
      { code: "D2750", description: "Crown - Porcelain Fused to High Noble Metal", fee: 1020, effectiveDate: "2025-07-01" },
      { code: "D2950", description: "Core Buildup", fee: 245, effectiveDate: "2025-07-01" },
      { code: "D3310", description: "Endodontic Therapy, Anterior", fee: 645, effectiveDate: "2025-07-01" },
      { code: "D4341", description: "Periodontal Scaling and Root Planing - 4+", fee: 235, effectiveDate: "2025-07-01" },
      { code: "D7140", description: "Extraction, Erupted Tooth", fee: 172, effectiveDate: "2025-07-01" },
      { code: "D7210", description: "Surgical Extraction", fee: 295, effectiveDate: "2025-07-01" },
    ],
  },
  {
    id: "fs_004",
    name: "MetLife PDP",
    payerName: "MetLife PDP",
    isDefault: false,
    isActive: true,
    fees: [
      { code: "D0120", description: "Periodic Oral Evaluation", fee: 55, effectiveDate: "2026-01-01" },
      { code: "D0140", description: "Limited Oral Evaluation - Problem Focused", fee: 72, effectiveDate: "2026-01-01" },
      { code: "D0150", description: "Comprehensive Oral Evaluation", fee: 82, effectiveDate: "2026-01-01" },
      { code: "D0210", description: "Intraoral - Complete Series", fee: 148, effectiveDate: "2026-01-01" },
      { code: "D0220", description: "Intraoral - Periapical First Image", fee: 30, effectiveDate: "2026-01-01" },
      { code: "D0274", description: "Bitewings - Four Radiographic Images", fee: 68, effectiveDate: "2026-01-01" },
      { code: "D1110", description: "Prophylaxis - Adult", fee: 102, effectiveDate: "2026-01-01" },
      { code: "D1120", description: "Prophylaxis - Child", fee: 72, effectiveDate: "2026-01-01" },
      { code: "D1208", description: "Topical Application of Fluoride", fee: 38, effectiveDate: "2026-01-01" },
      { code: "D2140", description: "Amalgam - One Surface", fee: 158, effectiveDate: "2026-01-01" },
      { code: "D2391", description: "Resin-Based Composite - 1s, Posterior", fee: 192, effectiveDate: "2026-01-01" },
      { code: "D2392", description: "Resin-Based Composite - 2s, Posterior", fee: 245, effectiveDate: "2026-01-01" },
      { code: "D2740", description: "Crown - Porcelain/Ceramic", fee: 1015, effectiveDate: "2026-01-01" },
      { code: "D2950", description: "Core Buildup", fee: 268, effectiveDate: "2026-01-01" },
      { code: "D3310", description: "Endodontic Therapy, Anterior", fee: 695, effectiveDate: "2026-01-01" },
      { code: "D4341", description: "Periodontal Scaling and Root Planing - 4+", fee: 255, effectiveDate: "2026-01-01" },
      { code: "D4910", description: "Periodontal Maintenance", fee: 155, effectiveDate: "2026-01-01" },
      { code: "D7210", description: "Surgical Extraction", fee: 318, effectiveDate: "2026-01-01" },
    ],
  },
]

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
  const [schedules, setSchedules] = useState<FeeSchedule[]>(DEMO_FEE_SCHEDULES)
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

  function handleOpenEdit(schedule: FeeSchedule) {
    setEditingSchedule(schedule)
    setFormName(schedule.name)
    setFormPayer(schedule.payerName ?? "")
    setFormIsDefault(schedule.isDefault)
    setEditDialogOpen(true)
  }

  function handleSaveEdit() {
    if (!editingSchedule) return
    setSchedules((prev) =>
      prev.map((s) =>
        s.id === editingSchedule.id
          ? {
              ...s,
              name: formName,
              payerName: formPayer || null,
              isDefault: formIsDefault,
            }
          : formIsDefault
            ? { ...s, isDefault: false }
            : s
      )
    )
    setEditDialogOpen(false)
    setEditingSchedule(null)
  }

  function handleAddSchedule() {
    const newSchedule: FeeSchedule = {
      id: `fs_${Date.now()}`,
      name: formName,
      payerName: formPayer || null,
      isDefault: formIsDefault,
      isActive: true,
      fees: [],
    }
    setSchedules((prev) => {
      const updated = formIsDefault
        ? prev.map((s) => ({ ...s, isDefault: false }))
        : prev
      return [...updated, newSchedule]
    })
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
    if (!editingFee) return
    const newValue = parseFloat(editFeeValue)
    if (isNaN(newValue)) return
    setSchedules((prev) =>
      prev.map((s) => {
        if (s.id !== editingFee.scheduleId) return s
        const newFees = [...s.fees]
        newFees[editingFee.feeIndex] = {
          ...newFees[editingFee.feeIndex],
          fee: newValue,
        }
        return { ...s, fees: newFees }
      })
    )
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
    </div>
  )
}

