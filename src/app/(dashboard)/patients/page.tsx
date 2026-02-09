"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { format, formatDistanceToNow, parseISO } from "date-fns"
import {
  Search,
  Plus,
  Users,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PAGE_SIZE = 20

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDob(iso: string): string {
  try {
    return format(parseISO(iso), "MMM d, yyyy")
  } catch {
    return iso
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

function formatRelativeDate(iso: string | undefined): string {
  if (!iso) return "Never"
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true })
  } catch {
    return iso
  }
}

function formatPhone(phone: string | undefined): string {
  if (!phone) return "-"
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return phone
}

// ---------------------------------------------------------------------------
// Skeleton Row
// ---------------------------------------------------------------------------
function SkeletonRow() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
    </TableRow>
  )
}

// ---------------------------------------------------------------------------
// Add Patient Dialog
// ---------------------------------------------------------------------------
function AddPatientDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    phone: "",
    email: "",
    gender: "",
    payerId: "",
    payerName: "",
    memberId: "",
  })

  const createPatient = useMutation(api.patients.mutations.create as any)

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.firstName || !formData.lastName || !formData.dateOfBirth) return

    setSubmitting(true)
    try {
      await createPatient({
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        gender: formData.gender || undefined,
        primaryInsurance:
          formData.payerId && formData.payerName && formData.memberId
            ? {
                payerId: formData.payerId,
                payerName: formData.payerName,
                memberId: formData.memberId,
              }
            : undefined,
      })
      toast.success("Patient created and syncing to PMS")
      setFormData({
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        phone: "",
        email: "",
        gender: "",
        payerId: "",
        payerName: "",
        memberId: "",
      })
      onOpenChange(false)
    } catch (err) {
      console.error("Failed to create patient:", err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Patient</DialogTitle>
          <DialogDescription>
            Enter patient demographics and insurance information.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
                required
              />
            </div>
          </div>

          {/* DOB & Gender */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth *</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => updateField("dateOfBirth", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={formData.gender}
                onValueChange={(val) => updateField("gender", val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="patient@email.com"
              />
            </div>
          </div>

          {/* Insurance Section */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Primary Insurance</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payerId">Payer ID</Label>
                  <Input
                    id="payerId"
                    value={formData.payerId}
                    onChange={(e) => updateField("payerId", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payerName">Payer Name</Label>
                  <Input
                    id="payerName"
                    value={formData.payerName}
                    onChange={(e) => updateField("payerName", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="memberId">Member ID</Label>
                <Input
                  id="memberId"
                  value={formData.memberId}
                  onChange={(e) => updateField("memberId", e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {submitting ? "Creating..." : "Add Patient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function PatientsPage() {
  const router = useRouter()
  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [page, setPage] = useState(0)
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]) // cursors for each page (page 0 = null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput)
      setPage(0)
      setCursorStack([null])
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Reset page when filter changes
  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value)
    setPage(0)
    setCursorStack([null])
  }, [])

  // Server-side search via mutation when search query is present
  const searchMutation = useMutation(api.patients.queries.search as any)
  const [searchResults, setSearchResults] = useState<any[] | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)

  // Trigger server-side search when searchQuery changes
  useEffect(() => {
    if (searchQuery.length > 0) {
      setSearchLoading(true)
      searchMutation({ searchTerm: searchQuery })
        .then((results: any) => {
          setSearchResults(results ?? [])
        })
        .catch(() => {
          setSearchResults([])
        })
        .finally(() => {
          setSearchLoading(false)
        })
    } else {
      setSearchResults(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  // Query patients from Convex (used when not searching)
  const currentCursor = cursorStack[page] ?? undefined
  const result = useQuery(api.patients.queries.list as any, {
    status:
      statusFilter === "active"
        ? ("active" as const)
        : statusFilter === "inactive"
          ? ("inactive" as const)
          : undefined,
    limit: PAGE_SIZE,
    cursor: currentCursor,
  })

  // Loading state
  if (result === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
            <p className="text-sm text-muted-foreground">
              Master Patient Index with search, demographics, and PMS sync status.
            </p>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-[160px]" />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Date of Birth</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Insurance</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Last Visit</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  // Use server-side search results when searching, otherwise use paginated list
  const patients = searchResults !== null ? searchResults : (result.patients ?? [])
  const totalCount = searchResults !== null ? searchResults.length : (result.totalCount ?? patients.length)
  const nextCursor = searchResults !== null ? null : (result.nextCursor ?? null)
  const isLoading = false
  const hasPatients = patients && patients.length > 0
  const totalPages = totalCount ? Math.ceil(totalCount / PAGE_SIZE) : 0
  const showingFrom = hasPatients ? page * PAGE_SIZE + 1 : 0
  const showingTo = hasPatients
    ? Math.min((page + 1) * PAGE_SIZE, totalCount ?? 0)
    : 0

  function handleNextPage() {
    if (!nextCursor) return
    // Store the nextCursor for page+1
    setCursorStack((prev) => {
      const next = [...prev]
      next[page + 1] = nextCursor
      return next
    })
    setPage((p) => p + 1)
  }

  function handlePrevPage() {
    setPage((p) => Math.max(0, p - 1))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
          <p className="text-sm text-muted-foreground">
            Master Patient Index with search, demographics, and PMS sync status.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus />
          Add Patient
        </Button>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search patients by name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Patients</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Date of Birth</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Insurance</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Last Visit</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Loading state */}
            {isLoading && (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            )}

            {/* Empty state */}
            {!isLoading && !hasPatients && (
              <TableRow>
                <TableCell colSpan={7} className="h-48">
                  <div className="flex flex-col items-center justify-center text-center">
                    <Users className="size-10 text-muted-foreground/50 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">
                      No patients found
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {searchQuery
                        ? "Try adjusting your search or filters."
                        : "Add your first patient to get started."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {/* Patient rows */}
            {patients &&
              patients.length > 0 &&
              patients.map((patient: any) => {
                const balance =
                  (patient.patientBalance ?? 0) +
                  (patient.insuranceBalance ?? 0)

                return (
                  <TableRow
                    key={patient._id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/patients/${patient._id}`)}
                  >
                    <TableCell>
                      <span className="font-medium hover:underline">
                        {patient.lastName}, {patient.firstName}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDob(patient.dateOfBirth)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatPhone(patient.phone)}
                    </TableCell>
                    <TableCell>
                      {patient.primaryInsurance ? (
                        <span className="text-sm">
                          {patient.primaryInsurance.payerName}
                        </span>
                      ) : (
                        <Badge variant="secondary">Uninsured</Badge>
                      )}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        balance > 500 && "text-red-600 font-medium"
                      )}
                    >
                      {formatCurrency(balance)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatRelativeDate(patient.lastVisitDate)}
                    </TableCell>
                    <TableCell>
                      {patient.isActive ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {(totalCount ?? 0) > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {showingFrom}-{showingTo} of {totalCount} patients
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={page === 0}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={!nextCursor}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Add Patient Dialog */}
      <AddPatientDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
