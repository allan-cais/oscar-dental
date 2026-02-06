"use client"

import { format, parseISO } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { DemoAppointment, AppointmentStatus } from "@/components/scheduling/appointment-block"

const statusConfig: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  scheduled: {
    label: "Scheduled",
    className: "bg-gray-100 text-gray-800 border-gray-300",
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-blue-100 text-blue-800 border-blue-300",
  },
  checked_in: {
    label: "Checked In",
    className: "bg-green-100 text-green-800 border-green-300",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-yellow-100 text-yellow-800 border-yellow-300",
  },
  completed: {
    label: "Completed",
    className: "bg-green-100 text-green-700 border-green-300",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-100 text-red-800 border-red-300",
  },
  no_show: {
    label: "No Show",
    className: "bg-red-100 text-red-800 border-red-300",
  },
}

function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number)
  const period = h >= 12 ? "PM" : "AM"
  const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${displayHour}:${m.toString().padStart(2, "0")} ${period}`
}

interface AppointmentDetailDialogProps {
  appointment: DemoAppointment | null
  open: boolean
  onClose: () => void
}

export function AppointmentDetailDialog({
  appointment,
  open,
  onClose,
}: AppointmentDetailDialogProps) {
  if (!appointment) return null

  const {
    patientName,
    patientDob,
    operatory,
    date,
    startTime,
    endTime,
    status,
    typeName,
    productionAmount,
    procedures,
    notes,
    cancellationReason,
  } = appointment

  const config = statusConfig[status]
  const isReadOnly =
    status === "completed" || status === "cancelled" || status === "no_show"

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Appointment Details</DialogTitle>
          <DialogDescription>{typeName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge
              variant="outline"
              className={cn("text-xs border", config.className)}
            >
              {config.label}
            </Badge>
          </div>

          {/* Patient Info */}
          <div className="rounded-md border p-3 space-y-1">
            <div className="text-sm font-medium">{patientName}</div>
            <div className="text-xs text-muted-foreground">
              DOB: {format(parseISO(patientDob), "MMM d, yyyy")}
            </div>
          </div>

          {/* Appointment Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Date</div>
              <div>{format(parseISO(date), "EEEE, MMM d, yyyy")}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Time</div>
              <div>
                {formatTime12(startTime)} - {formatTime12(endTime)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Operatory</div>
              <div>{operatory}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Production</div>
              <div className="font-medium">
                ${productionAmount.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Procedures */}
          {procedures.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-2">
                Procedures
              </div>
              <div className="rounded-md border divide-y">
                {procedures.map((proc, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <span className="font-mono text-xs text-muted-foreground mr-2">
                        {proc.code}
                      </span>
                      <span className="truncate">{proc.description}</span>
                      {proc.tooth && (
                        <span className="text-xs text-muted-foreground ml-2">
                          #{proc.tooth}
                          {proc.surface ? ` (${proc.surface})` : ""}
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground shrink-0 ml-2">
                      ${proc.fee.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {notes && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Notes</div>
              <div className="text-sm bg-muted/50 rounded-md p-2">{notes}</div>
            </div>
          )}

          {/* Cancellation Reason */}
          {cancellationReason && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                Cancellation Reason
              </div>
              <div className="text-sm bg-red-50 text-red-800 rounded-md p-2">
                {cancellationReason}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <DialogFooter className="gap-2">
          {!isReadOnly && (
            <>
              {status === "scheduled" && (
                <>
                  <Button variant="outline" size="sm" onClick={onClose}>
                    Cancel Appointment
                  </Button>
                  <Button size="sm" onClick={onClose}>
                    Confirm
                  </Button>
                </>
              )}
              {status === "confirmed" && (
                <>
                  <Button variant="outline" size="sm" onClick={onClose}>
                    Cancel Appointment
                  </Button>
                  <Button size="sm" onClick={onClose}>
                    Check In
                  </Button>
                </>
              )}
              {status === "checked_in" && (
                <>
                  <Button variant="outline" size="sm" onClick={onClose}>
                    Cancel Appointment
                  </Button>
                  <Button size="sm" onClick={onClose}>
                    Start
                  </Button>
                </>
              )}
              {status === "in_progress" && (
                <Button size="sm" onClick={onClose}>
                  Complete
                </Button>
              )}
            </>
          )}
          {isReadOnly && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
