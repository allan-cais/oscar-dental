"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import type { Id } from "../../../../../convex/_generated/dataModel"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Search, UserPlus } from "lucide-react"

type Role = "admin" | "office_manager" | "billing" | "clinical" | "front_desk" | "provider"

const ROLES: { value: Role; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "office_manager", label: "Office Manager" },
  { value: "billing", label: "Billing" },
  { value: "clinical", label: "Clinical" },
  { value: "front_desk", label: "Front Desk" },
  { value: "provider", label: "Provider" },
]

function roleBadgeVariant(role: Role): "default" | "secondary" | "outline" {
  switch (role) {
    case "admin":
      return "default"
    case "office_manager":
      return "secondary"
    default:
      return "outline"
  }
}

function roleLabel(role: Role): string {
  return ROLES.find((r) => r.value === role)?.label ?? role
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return "Never"
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

// Mock data for when Convex is not connected
const MOCK_USERS = [
  {
    _id: "mock_1" as Id<"users">,
    _creationTime: 0,
    firstName: "John",
    lastName: "Salter",
    email: "john@canopydental.com",
    role: "admin" as Role,
    isActive: true,
    lastLoginAt: Date.now() - 86400000,
    createdAt: Date.now() - 86400000 * 30,
    updatedAt: Date.now(),
    orgId: "mock",
    clerkUserId: "mock",
  },
  {
    _id: "mock_2" as Id<"users">,
    _creationTime: 0,
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah@canopydental.com",
    role: "office_manager" as Role,
    isActive: true,
    lastLoginAt: Date.now() - 3600000,
    createdAt: Date.now() - 86400000 * 20,
    updatedAt: Date.now(),
    orgId: "mock",
    clerkUserId: "mock",
  },
  {
    _id: "mock_3" as Id<"users">,
    _creationTime: 0,
    firstName: "Mike",
    lastName: "Chen",
    email: "mike@canopydental.com",
    role: "billing" as Role,
    isActive: true,
    lastLoginAt: Date.now() - 7200000,
    createdAt: Date.now() - 86400000 * 15,
    updatedAt: Date.now(),
    orgId: "mock",
    clerkUserId: "mock",
  },
  {
    _id: "mock_4" as Id<"users">,
    _creationTime: 0,
    firstName: "Dr. Emily",
    lastName: "Park",
    email: "emily@canopydental.com",
    role: "provider" as Role,
    isActive: true,
    lastLoginAt: Date.now() - 43200000,
    createdAt: Date.now() - 86400000 * 10,
    updatedAt: Date.now(),
    orgId: "mock",
    clerkUserId: "mock",
  },
  {
    _id: "mock_5" as Id<"users">,
    _creationTime: 0,
    firstName: "Lisa",
    lastName: "Rodriguez",
    email: "lisa@canopydental.com",
    role: "front_desk" as Role,
    isActive: false,
    lastLoginAt: Date.now() - 86400000 * 14,
    createdAt: Date.now() - 86400000 * 60,
    updatedAt: Date.now(),
    orgId: "mock",
    clerkUserId: "mock",
  },
]

export default function UsersSettingsPage() {
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "front_desk" as Role,
  })

  // Try Convex query, fall back to mock data
  let users: typeof MOCK_USERS | undefined
  let convexError = false
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const result = useQuery(api.users.queries.list)
    users = result ?? undefined
  } catch {
    convexError = true
    users = MOCK_USERS
  }

  let createUser: ((args: any) => Promise<any>) | null = null
  let deactivateUser: ((args: any) => Promise<any>) | null = null
  let updateUserRole: ((args: any) => Promise<any>) | null = null
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    createUser = useMutation(api.users.mutations.create)
    // eslint-disable-next-line react-hooks/rules-of-hooks
    deactivateUser = useMutation(api.users.mutations.deactivate)
    // eslint-disable-next-line react-hooks/rules-of-hooks
    updateUserRole = useMutation(api.users.mutations.updateRole)
  } catch {
    // Mutations unavailable when Convex is not connected
  }

  const filtered = useMemo(() => {
    if (!users) return []
    return users.filter((user) => {
      const matchesSearch =
        search === "" ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
      const matchesRole = roleFilter === "all" || user.role === roleFilter
      return matchesSearch && matchesRole
    })
  }, [users, search, roleFilter])

  async function handleInvite() {
    if (!createUser) return
    try {
      await createUser({
        email: inviteForm.email,
        firstName: inviteForm.firstName,
        lastName: inviteForm.lastName,
        role: inviteForm.role,
      })
      setInviteOpen(false)
      setInviteForm({ firstName: "", lastName: "", email: "", role: "front_desk" })
    } catch (err) {
      console.error("Failed to create user:", err)
    }
  }

  async function handleToggleActive(userId: Id<"users">) {
    if (!deactivateUser) return
    try {
      await deactivateUser({ userId })
    } catch (err) {
      console.error("Failed to toggle user status:", err)
    }
  }

  async function handleRoleChange(userId: Id<"users">, role: Role) {
    if (!updateUserRole) return
    try {
      await updateUserRole({ userId, role })
    } catch (err) {
      console.error("Failed to update role:", err)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage team members, roles, and access permissions.
          </p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 size-4" />
              Invite User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New User</DialogTitle>
              <DialogDescription>
                Add a new team member to your organization. They will receive an
                email invitation to set up their account.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={inviteForm.firstName}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, firstName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={inviteForm.lastName}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, lastName: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={inviteForm.email}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(value: string) =>
                    setInviteForm({ ...inviteForm, role: value as Role })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleInvite}
                disabled={
                  !inviteForm.firstName ||
                  !inviteForm.lastName ||
                  !inviteForm.email
                }
              >
                Send Invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {filtered.length} user{filtered.length !== 1 && "s"} in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!users ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Loading users...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell className="font-medium">
                        {user.firstName} {user.lastName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant={roleBadgeVariant(user.role)}>
                          {roleLabel(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.isActive ? "default" : "secondary"}
                          className={
                            user.isActive
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(user.lastLoginAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                            {ROLES.map((r) => (
                              <DropdownMenuItem
                                key={r.value}
                                disabled={user.role === r.value}
                                onClick={() =>
                                  handleRoleChange(user._id, r.value)
                                }
                              >
                                {r.label}
                                {user.role === r.value && " (current)"}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(user._id)}
                              className={
                                user.isActive
                                  ? "text-destructive focus:text-destructive"
                                  : ""
                              }
                            >
                              {user.isActive ? "Deactivate" : "Reactivate"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
