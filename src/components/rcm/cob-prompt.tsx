"use client"

import { useState } from "react"
import { Shield } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export interface InsuranceInfo {
  payerName: string
  memberId: string
  groupNumber: string
  subscriberName: string
  relationship: string
}

export interface CobPromptProps {
  open: boolean
  onClose: () => void
  onConfirm?: (coordinationOrder: "primary_first" | "secondary_first") => void
  patientName: string
  primaryInsurance: InsuranceInfo
  secondaryInsurance: InsuranceInfo
}

function InsurancePanel({
  label,
  insurance,
  selected,
  onSelect,
}: {
  label: string
  insurance: InsuranceInfo
  selected: boolean
  onSelect: () => void
}) {
  return (
    <Card
      className={`cursor-pointer transition-all ${
        selected
          ? "border-primary ring-2 ring-primary/20"
          : "border-border hover:border-muted-foreground/30"
      }`}
      onClick={onSelect}
    >
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-center justify-between">
          <Badge variant={selected ? "default" : "secondary"} className="text-xs">
            {label}
          </Badge>
          <div
            className={`size-4 rounded-full border-2 flex items-center justify-center ${
              selected ? "border-primary" : "border-muted-foreground/40"
            }`}
          >
            {selected && (
              <div className="size-2 rounded-full bg-primary" />
            )}
          </div>
        </div>
        <div className="space-y-1.5 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Payer</p>
            <p className="font-medium">{insurance.payerName}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Member ID</p>
            <p className="font-medium">{insurance.memberId}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Group #</p>
            <p className="font-medium">{insurance.groupNumber}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Subscriber</p>
            <p className="font-medium">{insurance.subscriberName}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Relationship</p>
            <p className="font-medium">{insurance.relationship}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function CobPrompt({
  open,
  onClose,
  onConfirm,
  patientName,
  primaryInsurance,
  secondaryInsurance,
}: CobPromptProps) {
  const [order, setOrder] = useState<"primary_first" | "secondary_first">(
    "primary_first"
  )

  function handleConfirm() {
    onConfirm?.(order)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="size-5 text-primary" />
            <DialogTitle>Coordination of Benefits</DialogTitle>
          </div>
          <DialogDescription>
            <span className="font-medium text-foreground">{patientName}</span>{" "}
            has secondary insurance. Please confirm the coordination order.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <InsurancePanel
            label="Primary Insurance"
            insurance={primaryInsurance}
            selected={order === "primary_first"}
            onSelect={() => setOrder("primary_first")}
          />
          <InsurancePanel
            label="Secondary Insurance"
            insurance={secondaryInsurance}
            selected={order === "secondary_first"}
            onSelect={() => setOrder("secondary_first")}
          />
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Select which insurance should be billed first. The highlighted plan
          will be processed as the primary payer.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Confirm Order</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
