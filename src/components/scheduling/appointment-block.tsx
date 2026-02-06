"use client"

import { cn } from "@/lib/utils"

export type AppointmentCategory =
  | "hygiene"
  | "restorative"
  | "surgical"
  | "diagnostic"
  | "preventive"
  | "emergency"
  | "endodontic"
  | "prosthodontic"
  | "orthodontic"
  | "other"

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "checked_in"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show"

export interface Procedure {
  code: string
  description: string
  fee: number
  tooth?: string
  surface?: string
}

export interface DemoAppointment {
  id: string
  patientName: string
  patientDob: string
  providerId: string
  operatory: string
  date: string
  startTime: string
  endTime: string
  duration: number
  status: AppointmentStatus
  category: AppointmentCategory
  typeName: string
  productionAmount: number
  procedures: Procedure[]
  notes?: string
  cancellationReason?: string
}

const categoryColors: Record<AppointmentCategory, string> = {
  hygiene: "bg-blue-500",
  restorative: "bg-green-500",
  surgical: "bg-red-500",
  diagnostic: "bg-purple-500",
  preventive: "bg-cyan-500",
  emergency: "bg-orange-500",
  endodontic: "bg-amber-600",
  prosthodontic: "bg-teal-500",
  orthodontic: "bg-pink-500",
  other: "bg-gray-500",
}

const categoryHoverColors: Record<AppointmentCategory, string> = {
  hygiene: "hover:bg-blue-400",
  restorative: "hover:bg-green-400",
  surgical: "hover:bg-red-400",
  diagnostic: "hover:bg-purple-400",
  preventive: "hover:bg-cyan-400",
  emergency: "hover:bg-orange-400",
  endodontic: "hover:bg-amber-500",
  prosthodontic: "hover:bg-teal-400",
  orthodontic: "hover:bg-pink-400",
  other: "hover:bg-gray-400",
}

const statusDotColors: Record<AppointmentStatus, string> = {
  scheduled: "bg-gray-300",
  confirmed: "bg-blue-400",
  checked_in: "bg-green-400",
  in_progress: "bg-yellow-400",
  completed: "bg-green-600",
  cancelled: "bg-red-400",
  no_show: "bg-red-600",
}

interface AppointmentBlockProps {
  appointment: DemoAppointment
  onClick: (appointment: DemoAppointment) => void
}

export function AppointmentBlock({ appointment, onClick }: AppointmentBlockProps) {
  const { patientName, typeName, startTime, endTime, status, category } = appointment

  return (
    <button
      type="button"
      onClick={() => onClick(appointment)}
      className={cn(
        "absolute inset-x-1 rounded-md shadow-sm cursor-pointer transition-colors text-left overflow-hidden px-2 py-1 text-white text-xs leading-tight",
        categoryColors[category],
        categoryHoverColors[category]
      )}
      title={`${patientName} - ${typeName}\n${startTime} - ${endTime}`}
    >
      <div className="flex items-center gap-1 min-w-0">
        <span
          className={cn("size-1.5 rounded-full shrink-0", statusDotColors[status])}
        />
        <span className="font-medium truncate">{patientName}</span>
      </div>
      <div className="truncate opacity-90">{typeName}</div>
      <div className="opacity-80">
        {startTime} - {endTime}
      </div>
    </button>
  )
}
