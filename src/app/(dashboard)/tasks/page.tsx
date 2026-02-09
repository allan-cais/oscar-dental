"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
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
import { Skeleton } from "@/components/ui/skeleton"
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

type TaskStatus = "open" | "in_progress" | "completed" | "cancelled"
type TaskPriority = "low" | "medium" | "high" | "urgent"
type TaskResourceType = "claim" | "denial" | "review" | "payment" | "patient" | "appointment" | "collection" | "recall" | "eligibility" | "general"
type TaskRole = "front_desk" | "billing" | "clinical" | "office_manager" | "admin"
type SLAState = "on_track" | "at_risk" | "overdue"

// --- Constants ---

const ROLES: { value: TaskRole | "all"; label: string }[] = [
  { value: "all", label: "All Roles" },
  { value: "front_desk", label: "Front Desk" },
  { value: "billing", label: "Billing" },
  { value: "clinical", label: "Clinical" },
  { value: "office_manager", label: "Office Manager" },
  { value: "admin", label: "Admin" },
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
  { value: "collection", label: "Collection" },
  { value: "recall", label: "Recall" },
  { value: "eligibility", label: "Eligibility" },
  { value: "general", label: "General" },
]

const STATUSES: { value: TaskStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

// --- Badge helpers ---

function resourceBadgeClass(type: TaskResourceType): string {
  const map: Record<string, string> = {
    claim: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    denial: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    review: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    payment: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    patient: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
    appointment: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
    collection: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    recall: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
    eligibility: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
    general: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  }
  return map[type] || map.general
}

function roleBadgeClass(role: TaskRole): string {
  const map: Record<string, string> = {
    front_desk: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    billing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    clinical: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    office_manager: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    admin: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  }
  return map[role] || map.front_desk
}

function priorityBadgeClass(priority: TaskPriority): string {
  const map: Record<string, string> = {
    low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    medium: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    urgent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  }
  return map[priority] || map.low
}

function slaBadgeClass(state: SLAState | undefined): string {
  const map: Record<string, string> = {
    on_track: "text-emerald-700 dark:text-emerald-400",
    at_risk: "text-orange-600 dark:text-orange-400",
    overdue: "text-red-600 dark:text-red-400",
  }
  return state ? map[state] || "" : ""
}

function roleLabel(role: TaskRole): string {
  const map: Record<string, string> = {
    front_desk: "Front Desk",
    billing: "Billing",
    clinical: "Clinical",
    office_manager: "Office Mgr",
    admin: "Admin",
  }
  return map[role] || role
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ")
}

function formatSlaText(slaDeadline: number | undefined, status: string): string {
  if (status === "completed" || status === "cancelled") return "Completed"
  if (!slaDeadline) return "No SLA"
  const now = Date.now()
  const diff = slaDeadline - now
  if (diff <= 0) {
    const overMs = Math.abs(diff)
    const hours = Math.floor(overMs / (1000 * 60 * 60))
    const mins = Math.floor((overMs % (1000 * 60 * 60)) / (1000 * 60))
    return `Overdue by ${hours}h ${mins}m`
  }
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    const remHours = hours % 24
    return `Due in ${days}d ${remHours}h`
  }
  return `Due in ${hours}h ${mins}m`
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const mins = Math.floor(diff / (1000 * 60))
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// --- Component ---

export default function TasksPage() {
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [resourceFilter, setResourceFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  // Convex queries
  const tasks = useQuery((api as any).tasks.queries.list, {
    status: statusFilter !== "all" ? statusFilter : undefined,
    assignedRole: roleFilter !== "all" ? roleFilter : undefined,
    priority: priorityFilter !== "all" ? priorityFilter : undefined,
    resourceType: resourceFilter !== "all" ? resourceFilter : undefined,
    search: search || undefined,
  })
  const stats = useQuery((api as any).tasks.queries.getStats)
  const selectedTask = useQuery(
    (api as any).tasks.queries.getById,
    selectedTaskId ? { taskId: selectedTaskId } : "skip"
  )

  // Convex mutations
  const assignToMe = useMutation((api as any).tasks.mutations.assignToMe)
  const escalate = useMutation((api as any).tasks.mutations.escalate)
  const completeMutation = useMutation((api as any).tasks.mutations.complete)

  const isLoading = tasks === undefined

  // Group by status
  const taskList = tasks ?? []
  const openTasks = useMemo(() => taskList.filter((t: any) => t.status === "open"), [taskList])
  const inProgressTasks = useMemo(() => taskList.filter((t: any) => t.status === "in_progress"), [taskList])
  const completedTasks = useMemo(() => taskList.filter((t: any) => t.status === "completed"), [taskList])

  async function handleAssign(taskId: string, e?: React.MouseEvent) {
    e?.stopPropagation()
    try {
      await assignToMe({ taskId })
      toast.success("Task assigned to you")
    } catch (err: any) {
      toast.error(err.message ?? "Failed to assign task")
    }
  }

  async function handleEscalate(taskId: string, e?: React.MouseEvent) {
    e?.stopPropagation()
    try {
      await escalate({ taskId })
      toast.success("Task escalated")
    } catch (err: any) {
      toast.error(err.message ?? "Failed to escalate task")
    }
  }

  async function handleComplete(taskId: string, e?: React.MouseEvent) {
    e?.stopPropagation()
    try {
      await completeMutation({ taskId })
      toast.success("Task completed")
    } catch (err: any) {
      toast.error(err.message ?? "Failed to complete task")
    }
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

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Open</p>
                {stats ? (
                  <p className="text-3xl font-bold text-blue-600">{stats.open}</p>
                ) : (
                  <Skeleton className="h-9 w-12 mt-1" />
                )}
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
                {stats ? (
                  <p className="text-3xl font-bold text-yellow-600">{stats.inProgress}</p>
                ) : (
                  <Skeleton className="h-9 w-12 mt-1" />
                )}
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
                {stats ? (
                  <>
                    <p className="text-3xl font-bold text-orange-600">{stats.atRisk}</p>
                    <p className="text-xs text-muted-foreground">SLA approaching</p>
                  </>
                ) : (
                  <Skeleton className="h-9 w-12 mt-1" />
                )}
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
                {stats ? (
                  <>
                    <p className="text-3xl font-bold text-red-600">{stats.overdue}</p>
                    <p className="text-xs text-muted-foreground">Past SLA deadline</p>
                  </>
                ) : (
                  <Skeleton className="h-9 w-12 mt-1" />
                )}
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

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-6 lg:grid-cols-3">
          {[0, 1, 2].map((col) => (
            <div key={col} className="space-y-3">
              <Skeleton className="h-5 w-32" />
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-40 w-full rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Task Board - 3 columns */}
      {!isLoading && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Open Column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="size-2.5 rounded-full bg-blue-500" />
              <h2 className="text-sm font-semibold">Open</h2>
              <Badge variant="secondary" className="text-xs">{openTasks.length}</Badge>
            </div>
            <div className="space-y-3">
              {openTasks.map((task: any) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  onClick={() => setSelectedTaskId(task._id)}
                  onAssign={(e) => handleAssign(task._id, e)}
                  onEscalate={(e) => handleEscalate(task._id, e)}
                  onComplete={(e) => handleComplete(task._id, e)}
                />
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
              {inProgressTasks.map((task: any) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  onClick={() => setSelectedTaskId(task._id)}
                  onAssign={(e) => handleAssign(task._id, e)}
                  onEscalate={(e) => handleEscalate(task._id, e)}
                  onComplete={(e) => handleComplete(task._id, e)}
                />
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
              {completedTasks.map((task: any) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  onClick={() => setSelectedTaskId(task._id)}
                  onAssign={(e) => handleAssign(task._id, e)}
                  onEscalate={(e) => handleEscalate(task._id, e)}
                  onComplete={(e) => handleComplete(task._id, e)}
                />
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
      )}

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTaskId} onOpenChange={(open) => { if (!open) { setSelectedTaskId(null) } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            {selectedTask ? (
              <>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <span>{(selectedTask as any)._id?.slice(-8)}</span>
                  {(selectedTask as any).resourceId && (
                    <>
                      <span>-</span>
                      <span>{(selectedTask as any).resourceId}</span>
                    </>
                  )}
                </div>
                <DialogTitle className="text-lg">{(selectedTask as any).title}</DialogTitle>
                <DialogDescription>{(selectedTask as any).description || "No description"}</DialogDescription>
              </>
            ) : (
              <>
                <DialogTitle>Loading task...</DialogTitle>
                <DialogDescription>Please wait</DialogDescription>
              </>
            )}
          </DialogHeader>
          {selectedTask && (
            <>

              {/* Metadata */}
              <div className="flex flex-wrap gap-2 pt-2">
                {(selectedTask as any).resourceType && (
                  <Badge className={resourceBadgeClass((selectedTask as any).resourceType)}>
                    {capitalize((selectedTask as any).resourceType)}
                  </Badge>
                )}
                {(selectedTask as any).assignedRole && (
                  <Badge className={roleBadgeClass((selectedTask as any).assignedRole)}>
                    {roleLabel((selectedTask as any).assignedRole)}
                  </Badge>
                )}
                <Badge className={priorityBadgeClass((selectedTask as any).priority)}>
                  {capitalize((selectedTask as any).priority)}
                </Badge>
                <Badge
                  variant="outline"
                  className={slaBadgeClass((selectedTask as any).slaStatus)}
                >
                  <Clock className="mr-1 size-3" />
                  {formatSlaText((selectedTask as any).slaDeadline, (selectedTask as any).status)}
                </Badge>
              </div>

              {(selectedTask as any).isEscalated && (
                <div className="flex items-center gap-2 text-sm text-orange-600 pt-1">
                  <ArrowUpRight className="size-3.5" />
                  <span className="font-medium">Escalated</span>
                  {(selectedTask as any).escalatedAt && (
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo((selectedTask as any).escalatedAt)}
                    </span>
                  )}
                </div>
              )}

              {(selectedTask as any).isHitlFallback && (selectedTask as any).workPacket && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Work Packet</h3>
                    <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap">
                      {(selectedTask as any).workPacket}
                    </pre>
                  </div>
                </>
              )}

              <Separator />

              {/* Timestamps */}
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Created: {new Date((selectedTask as any).createdAt).toLocaleString()}</p>
                <p>Updated: {new Date((selectedTask as any).updatedAt).toLocaleString()}</p>
                {(selectedTask as any).completedAt && (
                  <p>Completed: {new Date((selectedTask as any).completedAt).toLocaleString()}</p>
                )}
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row">
                {(selectedTask as any).status !== "completed" && (selectedTask as any).status !== "cancelled" && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => handleAssign((selectedTask as any)._id)}>
                      <User className="mr-1.5 size-3.5" />
                      Assign to Me
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-orange-600 border-orange-200 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-950/30"
                      onClick={() => handleEscalate((selectedTask as any)._id)}
                    >
                      <ArrowUpRight className="mr-1.5 size-3.5" />
                      Escalate
                    </Button>
                    <Button size="sm" onClick={() => handleComplete((selectedTask as any)._id)}>
                      <CheckCircle2 className="mr-1.5 size-3.5" />
                      Complete Task
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// --- Task Card Component ---

function TaskCard({
  task,
  onClick,
  onAssign,
  onEscalate,
  onComplete,
}: {
  task: any
  onClick: () => void
  onAssign: (e: React.MouseEvent) => void
  onEscalate: (e: React.MouseEvent) => void
  onComplete: (e: React.MouseEvent) => void
}) {
  return (
    <Card className="cursor-pointer transition-colors hover:bg-accent/50" onClick={onClick}>
      <CardContent className="p-4 space-y-3">
        {/* Title */}
        <p className="text-sm font-medium leading-snug">{task.title}</p>

        {/* Badges row */}
        <div className="flex flex-wrap gap-1.5">
          {task.resourceType && (
            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${resourceBadgeClass(task.resourceType)}`}>
              {capitalize(task.resourceType)}
            </Badge>
          )}
          {task.assignedRole && (
            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${roleBadgeClass(task.assignedRole)}`}>
              {roleLabel(task.assignedRole)}
            </Badge>
          )}
          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${priorityBadgeClass(task.priority)}`}>
            {capitalize(task.priority)}
          </Badge>
        </div>

        {/* SLA + time */}
        <div className="flex items-center justify-between text-xs">
          <span className={`flex items-center gap-1 font-medium ${slaBadgeClass(task.slaStatus)}`}>
            <Clock className="size-3" />
            {formatSlaText(task.slaDeadline, task.status)}
          </span>
          <span className="text-muted-foreground">{formatTimeAgo(task.createdAt)}</span>
        </div>

        {/* Escalated indicator */}
        {task.isEscalated && (
          <div className="flex items-center gap-1 text-xs text-orange-600">
            <ArrowUpRight className="size-3" />
            Escalated
          </div>
        )}

        {/* Quick actions */}
        {task.status !== "completed" && task.status !== "cancelled" && (
          <div className="flex gap-2 pt-1">
            {!task.assignedTo && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={onAssign}
              >
                Assign to Me
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs text-orange-600 border-orange-200 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-950/30"
              onClick={onEscalate}
            >
              Escalate
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={onComplete}
            >
              Complete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
