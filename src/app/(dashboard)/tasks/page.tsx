"use client"

import { useState, useMemo } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { Separator } from "@/components/ui/separator"
import {
  Search,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ListTodo,
  Loader2,
  ArrowUpRight,
  User,
  MessageSquare,
} from "lucide-react"

// --- Types ---

type TaskStatus = "open" | "in_progress" | "completed"
type TaskPriority = "low" | "medium" | "high" | "urgent"
type TaskResourceType = "claim" | "denial" | "review" | "payment" | "patient" | "appointment"
type TaskRole = "front_desk" | "billing" | "clinical" | "office_manager"
type SLAState = "on_track" | "at_risk" | "overdue"

interface TaskActivity {
  action: string
  by: string
  at: string
}

interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  resourceType: TaskResourceType
  resourceId: string
  assignedRole: TaskRole
  assignedTo: string | null
  slaState: SLAState
  slaText: string
  createdAt: string
  createdAgo: string
  activities: TaskActivity[]
}

// --- Constants ---

const ROLES: { value: TaskRole | "all"; label: string }[] = [
  { value: "all", label: "All Roles" },
  { value: "front_desk", label: "Front Desk" },
  { value: "billing", label: "Billing" },
  { value: "clinical", label: "Clinical" },
  { value: "office_manager", label: "Office Manager" },
]

const PRIORITIES: { value: TaskPriority | "all"; label: string }[] = [
  { value: "all", label: "All Priorities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
]

const RESOURCE_TYPES: { value: TaskResourceType | "all"; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "claim", label: "Claim" },
  { value: "denial", label: "Denial" },
  { value: "review", label: "Review" },
  { value: "payment", label: "Payment" },
  { value: "patient", label: "Patient" },
  { value: "appointment", label: "Appointment" },
]

const STATUSES: { value: TaskStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
]

// --- Badge helpers ---

function resourceBadgeClass(type: TaskResourceType): string {
  const map: Record<TaskResourceType, string> = {
    claim: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    denial: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    review: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    payment: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    patient: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
    appointment: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  }
  return map[type]
}

function roleBadgeClass(role: TaskRole): string {
  const map: Record<TaskRole, string> = {
    front_desk: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    billing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    clinical: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    office_manager: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  }
  return map[role]
}

function priorityBadgeClass(priority: TaskPriority): string {
  const map: Record<TaskPriority, string> = {
    low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    medium: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    urgent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  }
  return map[priority]
}

function slaBadgeClass(state: SLAState): string {
  const map: Record<SLAState, string> = {
    on_track: "text-emerald-700 dark:text-emerald-400",
    at_risk: "text-orange-600 dark:text-orange-400",
    overdue: "text-red-600 dark:text-red-400",
  }
  return map[state]
}

function roleLabel(role: TaskRole): string {
  const map: Record<TaskRole, string> = {
    front_desk: "Front Desk",
    billing: "Billing",
    clinical: "Clinical",
    office_manager: "Office Mgr",
  }
  return map[role]
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// --- Mock Data (30+ tasks) ---

const MOCK_TASKS: Task[] = [
  // OPEN tasks (15)
  {
    id: "TSK-001",
    title: "Call Delta Dental re: denied claim CLM-2024-0847",
    description: "Delta Dental denied claim CLM-2024-0847 for patient Robert Martinez citing missing pre-authorization. Contact the payer to discuss and gather requirements for appeal submission. Claim amount: $1,250.",
    status: "open",
    priority: "high",
    resourceType: "denial",
    resourceId: "DEN-2024-0312",
    assignedRole: "billing",
    assignedTo: null,
    slaState: "on_track",
    slaText: "Due in 18h 23m",
    createdAt: "2026-02-05T08:30:00Z",
    createdAgo: "2 hours ago",
    activities: [
      { action: "Task created from denial event", by: "System", at: "2026-02-05T08:30:00Z" },
      { action: "Assigned to Billing role", by: "System", at: "2026-02-05T08:30:01Z" },
    ],
  },
  {
    id: "TSK-002",
    title: "Respond to 1-star review from John M.",
    description: "Patient John M. left a 1-star review on Google Business: 'Waited 45 minutes past my appointment time. No one apologized.' Draft a professional, empathetic response and route for office manager approval before posting.",
    status: "open",
    priority: "urgent",
    resourceType: "review",
    resourceId: "REV-2024-0089",
    assignedRole: "office_manager",
    assignedTo: null,
    slaState: "at_risk",
    slaText: "Due in 2h 15m",
    createdAt: "2026-02-04T14:00:00Z",
    createdAgo: "20 hours ago",
    activities: [
      { action: "Task created from negative review event", by: "System", at: "2026-02-04T14:00:00Z" },
      { action: "Assigned to Office Manager role", by: "System", at: "2026-02-04T14:00:01Z" },
    ],
  },
  {
    id: "TSK-003",
    title: "Process payment plan installment for Sarah Johnson",
    description: "Sarah Johnson has a scheduled payment plan installment of $150 due today. Process the charge against her card on file ending in 4242. Payment plan balance remaining: $450.",
    status: "open",
    priority: "medium",
    resourceType: "payment",
    resourceId: "PAY-2024-0567",
    assignedRole: "billing",
    assignedTo: null,
    slaState: "on_track",
    slaText: "Due in 6h 45m",
    createdAt: "2026-02-05T07:00:00Z",
    createdAgo: "3 hours ago",
    activities: [
      { action: "Task created from payment schedule event", by: "System", at: "2026-02-05T07:00:00Z" },
    ],
  },
  {
    id: "TSK-004",
    title: "Verify eligibility for tomorrow's hygiene appointments",
    description: "Batch eligibility verification needed for 12 hygiene patients scheduled tomorrow. Run real-time verification for patients whose batch results are older than 7 days.",
    status: "open",
    priority: "high",
    resourceType: "appointment",
    resourceId: "BATCH-2026-0205",
    assignedRole: "front_desk",
    assignedTo: null,
    slaState: "on_track",
    slaText: "Due in 14h 30m",
    createdAt: "2026-02-05T06:00:00Z",
    createdAgo: "4 hours ago",
    activities: [
      { action: "Task created from batch eligibility check", by: "System", at: "2026-02-05T06:00:00Z" },
    ],
  },
  {
    id: "TSK-005",
    title: "Follow up on unpaid balance - Michael Chen ($450)",
    description: "Michael Chen has an outstanding patient balance of $450 that is 45 days past due. This is the second collections notice. Send text-to-pay link and follow up with a phone call if no response within 24 hours.",
    status: "open",
    priority: "high",
    resourceType: "payment",
    resourceId: "PAY-2024-0489",
    assignedRole: "billing",
    assignedTo: null,
    slaState: "overdue",
    slaText: "Overdue by 4h 30m",
    createdAt: "2026-02-04T10:00:00Z",
    createdAgo: "1 day ago",
    activities: [
      { action: "Task created from collections sequence", by: "System", at: "2026-02-04T10:00:00Z" },
      { action: "First notice sent via SMS", by: "System", at: "2026-02-04T10:01:00Z" },
    ],
  },
  {
    id: "TSK-006",
    title: "Submit claim for Emily Park - crown procedure D2740",
    description: "Crown procedure (D2740) completed for Emily Park on 02/04. Claim needs to be scrubbed and submitted to MetLife within 24 hours. Estimated amount: $1,100.",
    status: "open",
    priority: "medium",
    resourceType: "claim",
    resourceId: "CLM-2024-0901",
    assignedRole: "billing",
    assignedTo: null,
    slaState: "on_track",
    slaText: "Due in 20h 10m",
    createdAt: "2026-02-05T09:00:00Z",
    createdAgo: "1 hour ago",
    activities: [
      { action: "Task created from procedure completion event", by: "System", at: "2026-02-05T09:00:00Z" },
    ],
  },
  {
    id: "TSK-007",
    title: "Resubmit corrected claim CLM-2024-0780",
    description: "Claim CLM-2024-0780 for patient Tom Williams was rejected due to incorrect tooth number. Correct the tooth number from #14 to #15 and resubmit to Cigna.",
    status: "open",
    priority: "high",
    resourceType: "claim",
    resourceId: "CLM-2024-0780",
    assignedRole: "billing",
    assignedTo: null,
    slaState: "at_risk",
    slaText: "Due in 3h 10m",
    createdAt: "2026-02-04T16:00:00Z",
    createdAgo: "18 hours ago",
    activities: [
      { action: "Task created from claim rejection event", by: "System", at: "2026-02-04T16:00:00Z" },
      { action: "Scrub error identified: incorrect tooth number", by: "System", at: "2026-02-04T16:00:05Z" },
    ],
  },
  {
    id: "TSK-008",
    title: "Schedule recall appointment - Angela Torres (6mo overdue)",
    description: "Angela Torres is 6 months overdue for her recall appointment. Attempt contact via SMS first, then phone call. Patient prefers morning appointments on Tuesdays or Thursdays.",
    status: "open",
    priority: "medium",
    resourceType: "patient",
    resourceId: "PAT-2024-0234",
    assignedRole: "front_desk",
    assignedTo: null,
    slaState: "on_track",
    slaText: "Due in 2d 4h",
    createdAt: "2026-02-05T07:30:00Z",
    createdAgo: "3 hours ago",
    activities: [
      { action: "Task created from recall management", by: "System", at: "2026-02-05T07:30:00Z" },
    ],
  },
  {
    id: "TSK-009",
    title: "Respond to 3-star review from Patricia L.",
    description: "Patricia L. left a 3-star review: 'Staff was friendly but the office felt outdated. Cleaning was thorough though.' Craft a response acknowledging feedback and mentioning upcoming renovations.",
    status: "open",
    priority: "low",
    resourceType: "review",
    resourceId: "REV-2024-0090",
    assignedRole: "office_manager",
    assignedTo: null,
    slaState: "on_track",
    slaText: "Due in 22h 15m",
    createdAt: "2026-02-05T08:00:00Z",
    createdAgo: "2 hours ago",
    activities: [
      { action: "Task created from review event", by: "System", at: "2026-02-05T08:00:00Z" },
    ],
  },
  {
    id: "TSK-010",
    title: "Confirm insurance for new patient - David Kim",
    description: "New patient David Kim is scheduled for comprehensive exam on 02/07. Verify insurance coverage with Aetna PPO and confirm benefits for D0150, D0210, D0330.",
    status: "open",
    priority: "high",
    resourceType: "patient",
    resourceId: "PAT-2024-0301",
    assignedRole: "front_desk",
    assignedTo: null,
    slaState: "on_track",
    slaText: "Due in 1d 6h",
    createdAt: "2026-02-05T08:15:00Z",
    createdAgo: "2 hours ago",
    activities: [
      { action: "Task created from new patient registration", by: "System", at: "2026-02-05T08:15:00Z" },
    ],
  },
  {
    id: "TSK-011",
    title: "Appeal denied claim for Lisa Rodriguez - D4341",
    description: "Claim for scaling and root planing (D4341) denied by Guardian for patient Lisa Rodriguez. Denial reason: frequency limitation. Prepare appeal with clinical notes showing medical necessity.",
    status: "open",
    priority: "urgent",
    resourceType: "denial",
    resourceId: "DEN-2024-0315",
    assignedRole: "billing",
    assignedTo: null,
    slaState: "overdue",
    slaText: "Overdue by 1h 45m",
    createdAt: "2026-02-04T08:00:00Z",
    createdAgo: "1 day ago",
    activities: [
      { action: "Task created from denial event", by: "System", at: "2026-02-04T08:00:00Z" },
      { action: "Clinical notes requested from Dr. Park", by: "System", at: "2026-02-04T08:01:00Z" },
    ],
  },
  {
    id: "TSK-012",
    title: "Fill cancelled 2PM hygiene slot for tomorrow",
    description: "Patient Rebecca Walsh cancelled her 2PM hygiene appointment for tomorrow. Check Quick Fill queue for eligible patients and attempt to fill the slot. Production value: ~$250.",
    status: "open",
    priority: "medium",
    resourceType: "appointment",
    resourceId: "APT-2026-0206-1400",
    assignedRole: "front_desk",
    assignedTo: null,
    slaState: "at_risk",
    slaText: "Due in 4h 20m",
    createdAt: "2026-02-05T09:30:00Z",
    createdAgo: "1 hour ago",
    activities: [
      { action: "Task created from cancellation event", by: "System", at: "2026-02-05T09:30:00Z" },
      { action: "Quick Fill queue checked: 8 eligible patients", by: "System", at: "2026-02-05T09:30:05Z" },
    ],
  },
  {
    id: "TSK-013",
    title: "Send payment reminder - James Wilson ($320)",
    description: "James Wilson has a balance of $320 that is 30 days past due. Send the first collections notice via text-to-pay link per the automated collections sequence.",
    status: "open",
    priority: "medium",
    resourceType: "payment",
    resourceId: "PAY-2024-0601",
    assignedRole: "billing",
    assignedTo: null,
    slaState: "on_track",
    slaText: "Due in 8h 15m",
    createdAt: "2026-02-05T07:45:00Z",
    createdAgo: "3 hours ago",
    activities: [
      { action: "Task created from collections sequence", by: "System", at: "2026-02-05T07:45:00Z" },
    ],
  },
  {
    id: "TSK-014",
    title: "Review clinical notes for claim CLM-2024-0892",
    description: "Dr. Park's clinical notes for patient Nancy Adams need review before claim submission. Procedure: D2750 (crown). Ensure documentation supports medical necessity for payer Humana.",
    status: "open",
    priority: "low",
    resourceType: "claim",
    resourceId: "CLM-2024-0892",
    assignedRole: "clinical",
    assignedTo: null,
    slaState: "on_track",
    slaText: "Due in 1d 2h",
    createdAt: "2026-02-05T09:15:00Z",
    createdAgo: "1 hour ago",
    activities: [
      { action: "Task created from claim pre-submission review", by: "System", at: "2026-02-05T09:15:00Z" },
    ],
  },
  {
    id: "TSK-015",
    title: "Contact Aetna for claim status - CLM-2024-0750",
    description: "Claim CLM-2024-0750 for patient Karen Brown was submitted 28 days ago with no response. Contact Aetna to check status and escalate if needed. Claim amount: $875.",
    status: "open",
    priority: "high",
    resourceType: "claim",
    resourceId: "CLM-2024-0750",
    assignedRole: "billing",
    assignedTo: null,
    slaState: "overdue",
    slaText: "Overdue by 2h 10m",
    createdAt: "2026-02-04T06:00:00Z",
    createdAgo: "1 day ago",
    activities: [
      { action: "Task created from A/R aging alert (28 days)", by: "System", at: "2026-02-04T06:00:00Z" },
    ],
  },
  // IN PROGRESS tasks (8)
  {
    id: "TSK-016",
    title: "Process EOB for Cigna batch - 8 claims",
    description: "Process Explanation of Benefits received from Cigna covering 8 claims. Post payments, identify any short-pays or denials, and reconcile with expected amounts.",
    status: "in_progress",
    priority: "high",
    resourceType: "claim",
    resourceId: "EOB-2024-0045",
    assignedRole: "billing",
    assignedTo: "Mike Chen",
    slaState: "on_track",
    slaText: "Due in 5h 30m",
    createdAt: "2026-02-05T06:30:00Z",
    createdAgo: "4 hours ago",
    activities: [
      { action: "Task created from EOB receipt", by: "System", at: "2026-02-05T06:30:00Z" },
      { action: "Claimed by Mike Chen", by: "Mike Chen", at: "2026-02-05T07:00:00Z" },
      { action: "Status changed to In Progress", by: "Mike Chen", at: "2026-02-05T07:00:01Z" },
      { action: "Note: 5 of 8 claims processed so far", by: "Mike Chen", at: "2026-02-05T09:00:00Z" },
    ],
  },
  {
    id: "TSK-017",
    title: "Prepare appeal packet for denial DEN-2024-0310",
    description: "Compiling appeal documentation for United Healthcare denial on patient Mark Johnson's implant procedure. Need clinical notes, x-rays, and narrative letter from Dr. Park.",
    status: "in_progress",
    priority: "urgent",
    resourceType: "denial",
    resourceId: "DEN-2024-0310",
    assignedRole: "billing",
    assignedTo: "Mike Chen",
    slaState: "at_risk",
    slaText: "Due in 1h 45m",
    createdAt: "2026-02-04T12:00:00Z",
    createdAgo: "22 hours ago",
    activities: [
      { action: "Task created from denial event", by: "System", at: "2026-02-04T12:00:00Z" },
      { action: "Claimed by Mike Chen", by: "Mike Chen", at: "2026-02-04T13:00:00Z" },
      { action: "Clinical notes received from Dr. Park", by: "Dr. Park", at: "2026-02-05T08:00:00Z" },
    ],
  },
  {
    id: "TSK-018",
    title: "Call Quick Fill patients for tomorrow's 10AM opening",
    description: "Dr. Park's 10AM crown prep slot opened up for tomorrow. Working through Quick Fill queue — 5 patients contacted so far, 3 remaining. Need confirmation by end of day.",
    status: "in_progress",
    priority: "high",
    resourceType: "appointment",
    resourceId: "APT-2026-0206-1000",
    assignedRole: "front_desk",
    assignedTo: "Lisa Rodriguez",
    slaState: "on_track",
    slaText: "Due in 4h 15m",
    createdAt: "2026-02-05T08:00:00Z",
    createdAgo: "2 hours ago",
    activities: [
      { action: "Task created from schedule gap event", by: "System", at: "2026-02-05T08:00:00Z" },
      { action: "Claimed by Lisa Rodriguez", by: "Lisa Rodriguez", at: "2026-02-05T08:15:00Z" },
      { action: "5 patients contacted, awaiting responses", by: "Lisa Rodriguez", at: "2026-02-05T09:30:00Z" },
    ],
  },
  {
    id: "TSK-019",
    title: "Draft response for 2-star review from Mark T.",
    description: "Working on response to Mark T.'s review: 'Billing department was unhelpful when I called about my insurance.' Need empathetic, professional response addressing billing process improvements.",
    status: "in_progress",
    priority: "medium",
    resourceType: "review",
    resourceId: "REV-2024-0088",
    assignedRole: "office_manager",
    assignedTo: "Sarah Johnson",
    slaState: "on_track",
    slaText: "Due in 10h 30m",
    createdAt: "2026-02-05T06:00:00Z",
    createdAgo: "4 hours ago",
    activities: [
      { action: "Task created from negative review event", by: "System", at: "2026-02-05T06:00:00Z" },
      { action: "Claimed by Sarah Johnson", by: "Sarah Johnson", at: "2026-02-05T07:30:00Z" },
      { action: "Draft response written, pending final review", by: "Sarah Johnson", at: "2026-02-05T09:00:00Z" },
    ],
  },
  {
    id: "TSK-020",
    title: "Verify eligibility batch - afternoon patients",
    description: "Running eligibility verification for 8 afternoon patients. Currently processing through real-time checks for patients with stale batch data.",
    status: "in_progress",
    priority: "medium",
    resourceType: "appointment",
    resourceId: "BATCH-2026-0205-PM",
    assignedRole: "front_desk",
    assignedTo: "Lisa Rodriguez",
    slaState: "on_track",
    slaText: "Due in 2h 00m",
    createdAt: "2026-02-05T07:00:00Z",
    createdAgo: "3 hours ago",
    activities: [
      { action: "Task created from batch eligibility check", by: "System", at: "2026-02-05T07:00:00Z" },
      { action: "Claimed by Lisa Rodriguez", by: "Lisa Rodriguez", at: "2026-02-05T08:00:00Z" },
      { action: "6 of 8 verifications complete", by: "Lisa Rodriguez", at: "2026-02-05T09:45:00Z" },
    ],
  },
  {
    id: "TSK-021",
    title: "Follow up on payment plan - Jennifer Lee",
    description: "Jennifer Lee missed her scheduled payment plan installment of $200. Card on file declined. Contacting patient to update payment method. Total remaining: $600.",
    status: "in_progress",
    priority: "high",
    resourceType: "payment",
    resourceId: "PAY-2024-0545",
    assignedRole: "billing",
    assignedTo: "Mike Chen",
    slaState: "at_risk",
    slaText: "Due in 1h 20m",
    createdAt: "2026-02-05T06:00:00Z",
    createdAgo: "4 hours ago",
    activities: [
      { action: "Task created from failed payment event", by: "System", at: "2026-02-05T06:00:00Z" },
      { action: "Claimed by Mike Chen", by: "Mike Chen", at: "2026-02-05T06:30:00Z" },
      { action: "Left voicemail for patient", by: "Mike Chen", at: "2026-02-05T08:00:00Z" },
      { action: "Sent text-to-pay link", by: "Mike Chen", at: "2026-02-05T08:05:00Z" },
    ],
  },
  {
    id: "TSK-022",
    title: "Update patient record - Maria Gonzalez insurance change",
    description: "Maria Gonzalez called to report a change in insurance from Delta Dental to BlueCross BlueShield effective 02/01. Update records and re-verify eligibility for upcoming appointment on 02/10.",
    status: "in_progress",
    priority: "medium",
    resourceType: "patient",
    resourceId: "PAT-2024-0189",
    assignedRole: "front_desk",
    assignedTo: "Lisa Rodriguez",
    slaState: "on_track",
    slaText: "Due in 6h 45m",
    createdAt: "2026-02-05T09:00:00Z",
    createdAgo: "1 hour ago",
    activities: [
      { action: "Task created from patient call", by: "Lisa Rodriguez", at: "2026-02-05T09:00:00Z" },
      { action: "Insurance card copy received via patient portal", by: "System", at: "2026-02-05T09:30:00Z" },
    ],
  },
  {
    id: "TSK-023",
    title: "Prepare pre-authorization for implant - Carlos Diaz",
    description: "Dr. Park treatment planned an implant (D6010) for Carlos Diaz. Pre-authorization required by MetLife. Preparing clinical documentation and supporting x-rays for submission.",
    status: "in_progress",
    priority: "high",
    resourceType: "claim",
    resourceId: "PREAUTH-2024-0078",
    assignedRole: "clinical",
    assignedTo: "Dr. Emily Park",
    slaState: "on_track",
    slaText: "Due in 3d 2h",
    createdAt: "2026-02-05T07:00:00Z",
    createdAgo: "3 hours ago",
    activities: [
      { action: "Task created from treatment plan event", by: "System", at: "2026-02-05T07:00:00Z" },
      { action: "Claimed by Dr. Emily Park", by: "Dr. Emily Park", at: "2026-02-05T08:00:00Z" },
    ],
  },
  // COMPLETED TODAY tasks (6)
  {
    id: "TSK-024",
    title: "Verify eligibility - morning hygiene patients (7 patients)",
    description: "Verified insurance eligibility for all 7 morning hygiene patients. All verified with active coverage. Two patients had updated copay amounts noted in their records.",
    status: "completed",
    priority: "high",
    resourceType: "appointment",
    resourceId: "BATCH-2026-0205-AM",
    assignedRole: "front_desk",
    assignedTo: "Lisa Rodriguez",
    slaState: "on_track",
    slaText: "Completed on time",
    createdAt: "2026-02-05T05:30:00Z",
    createdAgo: "5 hours ago",
    activities: [
      { action: "Task created from batch eligibility check", by: "System", at: "2026-02-05T05:30:00Z" },
      { action: "Claimed by Lisa Rodriguez", by: "Lisa Rodriguez", at: "2026-02-05T06:00:00Z" },
      { action: "All 7 patients verified", by: "Lisa Rodriguez", at: "2026-02-05T07:30:00Z" },
      { action: "Task completed", by: "Lisa Rodriguez", at: "2026-02-05T07:30:01Z" },
    ],
  },
  {
    id: "TSK-025",
    title: "Submit claim batch - yesterday's procedures (5 claims)",
    description: "Submitted 5 claims for procedures completed yesterday. All claims passed scrubbing with no errors. Submitted to: Delta (2), Cigna (1), Aetna (1), MetLife (1).",
    status: "completed",
    priority: "high",
    resourceType: "claim",
    resourceId: "BATCH-CLM-0204",
    assignedRole: "billing",
    assignedTo: "Mike Chen",
    slaState: "on_track",
    slaText: "Completed on time",
    createdAt: "2026-02-05T06:00:00Z",
    createdAgo: "4 hours ago",
    activities: [
      { action: "Task created from end-of-day procedure batch", by: "System", at: "2026-02-05T06:00:00Z" },
      { action: "Claimed by Mike Chen", by: "Mike Chen", at: "2026-02-05T06:15:00Z" },
      { action: "All 5 claims scrubbed - 0 errors", by: "System", at: "2026-02-05T06:20:00Z" },
      { action: "Claims submitted to payers", by: "Mike Chen", at: "2026-02-05T07:00:00Z" },
      { action: "Task completed", by: "Mike Chen", at: "2026-02-05T07:00:01Z" },
    ],
  },
  {
    id: "TSK-026",
    title: "Post 5-star review response for Amanda K.",
    description: "Responded to Amanda K.'s 5-star review: 'Best dental experience ever! Dr. Park and her team are amazing.' Thank you response posted within 4 hours.",
    status: "completed",
    priority: "low",
    resourceType: "review",
    resourceId: "REV-2024-0087",
    assignedRole: "office_manager",
    assignedTo: "Sarah Johnson",
    slaState: "on_track",
    slaText: "Completed on time",
    createdAt: "2026-02-05T05:00:00Z",
    createdAgo: "5 hours ago",
    activities: [
      { action: "Task created from positive review event", by: "System", at: "2026-02-05T05:00:00Z" },
      { action: "Claimed by Sarah Johnson", by: "Sarah Johnson", at: "2026-02-05T06:00:00Z" },
      { action: "Response drafted and approved", by: "Sarah Johnson", at: "2026-02-05T08:00:00Z" },
      { action: "Response posted to Google Business", by: "Sarah Johnson", at: "2026-02-05T08:05:00Z" },
      { action: "Task completed", by: "Sarah Johnson", at: "2026-02-05T08:05:01Z" },
    ],
  },
  {
    id: "TSK-027",
    title: "Collect copay from walk-in patient - Thomas Brown",
    description: "Thomas Brown walked in for emergency exam. Copay of $45 collected via card on file. Receipt sent via SMS.",
    status: "completed",
    priority: "medium",
    resourceType: "payment",
    resourceId: "PAY-2024-0610",
    assignedRole: "front_desk",
    assignedTo: "Lisa Rodriguez",
    slaState: "on_track",
    slaText: "Completed on time",
    createdAt: "2026-02-05T08:30:00Z",
    createdAgo: "2 hours ago",
    activities: [
      { action: "Task created from walk-in check-in", by: "System", at: "2026-02-05T08:30:00Z" },
      { action: "Claimed by Lisa Rodriguez", by: "Lisa Rodriguez", at: "2026-02-05T08:30:05Z" },
      { action: "Copay of $45 collected", by: "Lisa Rodriguez", at: "2026-02-05T08:35:00Z" },
      { action: "Task completed", by: "Lisa Rodriguez", at: "2026-02-05T08:35:01Z" },
    ],
  },
  {
    id: "TSK-028",
    title: "Recall outreach batch - 15 patients (6mo overdue)",
    description: "Sent recall reminder SMS to 15 patients who are 6+ months overdue. 9 messages delivered, 4 scheduled callbacks, 2 numbers disconnected (flagged for update).",
    status: "completed",
    priority: "medium",
    resourceType: "patient",
    resourceId: "RECALL-BATCH-0205",
    assignedRole: "front_desk",
    assignedTo: "Lisa Rodriguez",
    slaState: "on_track",
    slaText: "Completed on time",
    createdAt: "2026-02-05T06:00:00Z",
    createdAgo: "4 hours ago",
    activities: [
      { action: "Task created from recall management", by: "System", at: "2026-02-05T06:00:00Z" },
      { action: "Claimed by Lisa Rodriguez", by: "Lisa Rodriguez", at: "2026-02-05T06:30:00Z" },
      { action: "15 SMS messages sent", by: "Lisa Rodriguez", at: "2026-02-05T07:00:00Z" },
      { action: "Results: 9 delivered, 4 callbacks, 2 disconnected", by: "System", at: "2026-02-05T07:30:00Z" },
      { action: "Task completed", by: "Lisa Rodriguez", at: "2026-02-05T07:30:01Z" },
    ],
  },
  {
    id: "TSK-029",
    title: "Process refund for overpayment - Helen Wright ($75)",
    description: "Helen Wright overpaid by $75 due to insurance adjustment. Refund processed to original payment method. Patient notified via SMS.",
    status: "completed",
    priority: "medium",
    resourceType: "payment",
    resourceId: "PAY-2024-0598",
    assignedRole: "billing",
    assignedTo: "Mike Chen",
    slaState: "on_track",
    slaText: "Completed on time",
    createdAt: "2026-02-05T07:00:00Z",
    createdAgo: "3 hours ago",
    activities: [
      { action: "Task created from overpayment detection", by: "System", at: "2026-02-05T07:00:00Z" },
      { action: "Claimed by Mike Chen", by: "Mike Chen", at: "2026-02-05T07:15:00Z" },
      { action: "Refund of $75 processed via Stripe", by: "Mike Chen", at: "2026-02-05T07:30:00Z" },
      { action: "Patient notified via SMS", by: "System", at: "2026-02-05T07:30:05Z" },
      { action: "Task completed", by: "Mike Chen", at: "2026-02-05T07:30:06Z" },
    ],
  },
  // Extra tasks to hit 30+
  {
    id: "TSK-030",
    title: "Verify pre-authorization status - Rachel Adams implant",
    description: "Check status of pre-authorization submitted to Humana 14 days ago for patient Rachel Adams implant procedure (D6010). Follow up if still pending.",
    status: "open",
    priority: "medium",
    resourceType: "claim",
    resourceId: "PREAUTH-2024-0075",
    assignedRole: "billing",
    assignedTo: null,
    slaState: "on_track",
    slaText: "Due in 1d 8h",
    createdAt: "2026-02-05T08:45:00Z",
    createdAgo: "2 hours ago",
    activities: [
      { action: "Task created from pre-auth follow-up schedule", by: "System", at: "2026-02-05T08:45:00Z" },
    ],
  },
  {
    id: "TSK-031",
    title: "Review request sent to patient - Christopher Lee",
    description: "Christopher Lee completed a crown procedure today. Review request SMS should be sent 2 hours after checkout per protocol. Verify delivery and monitor for response.",
    status: "open",
    priority: "low",
    resourceType: "review",
    resourceId: "REVREQ-2024-0156",
    assignedRole: "front_desk",
    assignedTo: null,
    slaState: "on_track",
    slaText: "Due in 1d 0h",
    createdAt: "2026-02-05T10:00:00Z",
    createdAgo: "30 minutes ago",
    activities: [
      { action: "Task created from review request schedule", by: "System", at: "2026-02-05T10:00:00Z" },
    ],
  },
]

// --- Component ---

export default function TasksPage() {
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [resourceFilter, setResourceFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [noteText, setNoteText] = useState("")

  // Try Convex, fall back to mock
  let tasks: Task[] | undefined
  let convexError = false
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const result = useQuery(api.tasks.queries.list)
    tasks = (result as Task[] | undefined) ?? undefined
  } catch {
    convexError = true
    tasks = MOCK_TASKS
  }

  // Filtered tasks
  const filtered = useMemo(() => {
    if (!tasks) return []
    return tasks.filter((t) => {
      const matchesSearch =
        search === "" ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.id.toLowerCase().includes(search.toLowerCase())
      const matchesRole = roleFilter === "all" || t.assignedRole === roleFilter
      const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter
      const matchesResource = resourceFilter === "all" || t.resourceType === resourceFilter
      const matchesStatus = statusFilter === "all" || t.status === statusFilter
      return matchesSearch && matchesRole && matchesPriority && matchesResource && matchesStatus
    })
  }, [tasks, search, roleFilter, priorityFilter, resourceFilter, statusFilter])

  // Group by status
  const openTasks = useMemo(() => filtered.filter((t) => t.status === "open"), [filtered])
  const inProgressTasks = useMemo(() => filtered.filter((t) => t.status === "in_progress"), [filtered])
  const completedTasks = useMemo(() => filtered.filter((t) => t.status === "completed"), [filtered])

  // Stats
  const allTasks = tasks ?? []
  const statsOpen = allTasks.filter((t) => t.status === "open").length
  const statsInProgress = allTasks.filter((t) => t.status === "in_progress").length
  const statsAtRisk = allTasks.filter((t) => t.slaState === "at_risk" && t.status !== "completed").length
  const statsOverdue = allTasks.filter((t) => t.slaState === "overdue" && t.status !== "completed").length

  function formatActivityTime(iso: string): string {
    const d = new Date(iso)
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        <p className="text-muted-foreground">
          Event-driven task management with role-based routing, SLA tracking, and
          HITL work packets.
        </p>
      </div>

      {convexError && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Convex backend is not connected. Displaying mock data for preview.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Open</p>
                <p className="text-3xl font-bold text-blue-600">{statsOpen}</p>
              </div>
              <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
                <ListTodo className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-3xl font-bold text-yellow-600">{statsInProgress}</p>
              </div>
              <div className="rounded-full bg-yellow-100 p-3 dark:bg-yellow-900/30">
                <Loader2 className="size-5 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">At Risk</p>
                <p className="text-3xl font-bold text-orange-600">{statsAtRisk}</p>
                <p className="text-xs text-muted-foreground">SLA approaching</p>
              </div>
              <div className="rounded-full bg-orange-100 p-3 dark:bg-orange-900/30">
                <AlertTriangle className="size-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-3xl font-bold text-red-600">{statsOverdue}</p>
                <p className="text-xs text-muted-foreground">Past SLA deadline</p>
              </div>
              <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/30">
                <Clock className="size-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full lg:w-[160px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full lg:w-[160px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={resourceFilter} onValueChange={setResourceFilter}>
              <SelectTrigger className="w-full lg:w-[160px]">
                <SelectValue placeholder="Resource Type" />
              </SelectTrigger>
              <SelectContent>
                {RESOURCE_TYPES.map((rt) => (
                  <SelectItem key={rt.value} value={rt.value}>
                    {rt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Board - 3 columns */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Open Column */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="size-2.5 rounded-full bg-blue-500" />
            <h2 className="text-sm font-semibold">Open</h2>
            <Badge variant="secondary" className="text-xs">{openTasks.length}</Badge>
          </div>
          <div className="space-y-3">
            {openTasks.map((task) => (
              <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
            ))}
            {openTasks.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No open tasks match filters
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* In Progress Column */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="size-2.5 rounded-full bg-yellow-500" />
            <h2 className="text-sm font-semibold">In Progress</h2>
            <Badge variant="secondary" className="text-xs">{inProgressTasks.length}</Badge>
          </div>
          <div className="space-y-3">
            {inProgressTasks.map((task) => (
              <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
            ))}
            {inProgressTasks.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No in-progress tasks match filters
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Completed Today Column */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="size-2.5 rounded-full bg-emerald-500" />
            <h2 className="text-sm font-semibold">Completed Today</h2>
            <Badge variant="secondary" className="text-xs">{completedTasks.length}</Badge>
          </div>
          <div className="space-y-3">
            {completedTasks.map((task) => (
              <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
            ))}
            {completedTasks.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No completed tasks match filters
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => { if (!open) { setSelectedTask(null); setNoteText("") } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedTask && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <span>{selectedTask.id}</span>
                  <span>-</span>
                  <span>{selectedTask.resourceId}</span>
                </div>
                <DialogTitle className="text-lg">{selectedTask.title}</DialogTitle>
                <DialogDescription>{selectedTask.description}</DialogDescription>
              </DialogHeader>

              {/* Metadata */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge className={resourceBadgeClass(selectedTask.resourceType)}>
                  {capitalize(selectedTask.resourceType)}
                </Badge>
                <Badge className={roleBadgeClass(selectedTask.assignedRole)}>
                  {roleLabel(selectedTask.assignedRole)}
                </Badge>
                <Badge className={priorityBadgeClass(selectedTask.priority)}>
                  {capitalize(selectedTask.priority)}
                </Badge>
                <Badge
                  variant="outline"
                  className={slaBadgeClass(selectedTask.slaState)}
                >
                  <Clock className="mr-1 size-3" />
                  {selectedTask.slaText}
                </Badge>
              </div>

              {selectedTask.assignedTo && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                  <User className="size-3.5" />
                  <span>Assigned to: <span className="font-medium text-foreground">{selectedTask.assignedTo}</span></span>
                </div>
              )}

              <Separator />

              {/* Activity Timeline */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Activity</h3>
                <div className="space-y-3">
                  {selectedTask.activities.map((act, i) => (
                    <div key={i} className="flex gap-3 text-sm">
                      <div className="flex flex-col items-center">
                        <div className="mt-1 size-2 rounded-full bg-muted-foreground/40" />
                        {i < selectedTask.activities.length - 1 && (
                          <div className="w-px flex-1 bg-muted-foreground/20" />
                        )}
                      </div>
                      <div className="pb-3">
                        <p>{act.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {act.by} - {formatActivityTime(act.at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Add Note */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Add Note</h3>
                <Textarea
                  placeholder="Type a note..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={3}
                />
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row">
                {selectedTask.status !== "completed" && (
                  <>
                    <Button variant="outline" size="sm">
                      <User className="mr-1.5 size-3.5" />
                      Assign to Me
                    </Button>
                    <Button variant="outline" size="sm" className="text-orange-600 border-orange-200 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-950/30">
                      <ArrowUpRight className="mr-1.5 size-3.5" />
                      Escalate
                    </Button>
                    <Button size="sm">
                      <CheckCircle2 className="mr-1.5 size-3.5" />
                      Complete Task
                    </Button>
                  </>
                )}
                {noteText.trim() && (
                  <Button variant="secondary" size="sm">
                    <MessageSquare className="mr-1.5 size-3.5" />
                    Add Note
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// --- Task Card Component (inline) ---

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  return (
    <Card className="cursor-pointer transition-colors hover:bg-accent/50" onClick={onClick}>
      <CardContent className="p-4 space-y-3">
        {/* Title */}
        <p className="text-sm font-medium leading-snug">{task.title}</p>

        {/* Badges row */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${resourceBadgeClass(task.resourceType)}`}>
            {capitalize(task.resourceType)}
          </Badge>
          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${roleBadgeClass(task.assignedRole)}`}>
            {roleLabel(task.assignedRole)}
          </Badge>
          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${priorityBadgeClass(task.priority)}`}>
            {capitalize(task.priority)}
          </Badge>
        </div>

        {/* SLA + time */}
        <div className="flex items-center justify-between text-xs">
          <span className={`flex items-center gap-1 font-medium ${slaBadgeClass(task.slaState)}`}>
            <Clock className="size-3" />
            {task.slaText}
          </span>
          <span className="text-muted-foreground">{task.createdAgo}</span>
        </div>

        {/* Assigned to */}
        {task.assignedTo && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="size-3" />
            {task.assignedTo}
          </div>
        )}

        {/* Quick actions */}
        {task.status !== "completed" && (
          <div className="flex gap-2 pt-1">
            {!task.assignedTo && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={(e) => { e.stopPropagation() }}
              >
                Assign to Me
              </Button>
            )}
            {task.slaState !== "overdue" && task.priority !== "urgent" && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs text-orange-600 border-orange-200 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-950/30"
                onClick={(e) => { e.stopPropagation() }}
              >
                Escalate
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={(e) => { e.stopPropagation() }}
            >
              Complete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
