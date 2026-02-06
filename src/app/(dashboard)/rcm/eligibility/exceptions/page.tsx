"use client"

import { useState } from "react"
import {
  AlertTriangle,
  RefreshCw,
  ClipboardList,
  X,
  Calendar,
  Filter,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

interface ExceptionRow {
  id: string
  patientName: string
  payerName: string
  errorMessage: string
  attemptedAt: string
  attempts: number
  status: "open" | "retrying" | "resolved" | "dismissed"
}

const DEMO_EXCEPTIONS: ExceptionRow[] = [
  {
    id: "1",
    patientName: "James Wilson",
    payerName: "Aetna DMO",
    errorMessage: "Invalid Member ID — no matching subscriber found",
    attemptedAt: "Today 8:55 AM",
    attempts: 2,
    status: "open",
  },
  {
    id: "2",
    patientName: "David Park",
    payerName: "Delta Dental Premier",
    errorMessage: "Payer not responding — connection timeout after 30s",
    attemptedAt: "Today 8:12 AM",
    attempts: 3,
    status: "open",
  },
  {
    id: "3",
    patientName: "Angela Torres",
    payerName: "MetLife PDP",
    errorMessage: "Coverage terminated — effective end date 01/15/2026",
    attemptedAt: "Today 7:30 AM",
    attempts: 1,
    status: "open",
  },
  {
    id: "4",
    patientName: "Steven Lee",
    payerName: "Cigna DHMO",
    errorMessage: "Group number not found in payer system",
    attemptedAt: "Today 6:48 AM",
    attempts: 2,
    status: "open",
  },
  {
    id: "5",
    patientName: "Patricia Adams",
    payerName: "Guardian PPO",
    errorMessage: "Date of birth mismatch with subscriber records",
    attemptedAt: "Today 5:30 AM",
    attempts: 1,
    status: "open",
  },
  {
    id: "6",
    patientName: "Marcus Hall",
    payerName: "Humana PPO",
    errorMessage: "Payer system maintenance — service unavailable",
    attemptedAt: "Yesterday 6:00 PM",
    attempts: 4,
    status: "retrying",
  },
  {
    id: "7",
    patientName: "Diana Kim",
    payerName: "BlueCross PPO",
    errorMessage: "Subscriber relationship code invalid — expected '18' or '01'",
    attemptedAt: "Yesterday 3:45 PM",
    attempts: 1,
    status: "open",
  },
  {
    id: "8",
    patientName: "William Scott",
    payerName: "United Concordia",
    errorMessage: "NPI not authorized for eligibility inquiries with this payer",
    attemptedAt: "Yesterday 2:10 PM",
    attempts: 2,
    status: "open",
  },
]

function statusBadge(status: ExceptionRow["status"]) {
  switch (status) {
    case "open":
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200">
          <AlertTriangle className="size-3" />
          Open
        </Badge>
      )
    case "retrying":
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
          <RefreshCw className="size-3" />
          Retrying
        </Badge>
      )
    case "resolved":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
          Resolved
        </Badge>
      )
    case "dismissed":
      return (
        <Badge variant="secondary" className="text-xs">
          Dismissed
        </Badge>
      )
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EligibilityExceptionsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [exceptions, setExceptions] = useState(DEMO_EXCEPTIONS)

  const filtered = exceptions.filter((e) => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false
    return true
  })

  function handleRetry(id: string) {
    setExceptions((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, status: "retrying" as const, attempts: e.attempts + 1 } : e
      )
    )
    // Simulate retry completion
    setTimeout(() => {
      setExceptions((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, status: "resolved" as const } : e
        )
      )
    }, 2000)
  }

  function handleDismiss(id: string) {
    setExceptions((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, status: "dismissed" as const } : e
      )
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Eligibility Exceptions
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Verification failures requiring attention. Retry, create a task, or
          dismiss resolved issues.
        </p>
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted-foreground" />
                From
              </label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted-foreground" />
                To
              </label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Filter className="size-3.5 text-muted-foreground" />
                Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="retrying">Retrying</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exceptions table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-red-500" />
              <CardTitle>
                Exceptions{" "}
                <span className="text-muted-foreground font-normal text-sm">
                  ({filtered.length})
                </span>
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Patient</TableHead>
                <TableHead>Payer</TableHead>
                <TableHead className="min-w-[240px]">Error Message</TableHead>
                <TableHead>Attempted At</TableHead>
                <TableHead className="text-center"># Attempts</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="pl-6 font-medium">
                    {row.patientName}
                  </TableCell>
                  <TableCell className="text-sm">{row.payerName}</TableCell>
                  <TableCell>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      {row.errorMessage}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm">{row.attemptedAt}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-xs">
                      {row.attempts}
                    </Badge>
                  </TableCell>
                  <TableCell>{statusBadge(row.status)}</TableCell>
                  <TableCell className="pr-6">
                    <div className="flex items-center justify-end gap-1.5">
                      {row.status === "open" && (
                        <>
                          <Button
                            variant="outline"
                            size="xs"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => handleRetry(row.id)}
                          >
                            <RefreshCw className="size-3" />
                            Retry
                          </Button>
                          <Button variant="outline" size="xs">
                            <ClipboardList className="size-3" />
                            Create Task
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            className="text-muted-foreground"
                            onClick={() => handleDismiss(row.id)}
                          >
                            <X className="size-3" />
                            Dismiss
                          </Button>
                        </>
                      )}
                      {row.status === "retrying" && (
                        <span className="flex items-center gap-1.5 text-xs text-amber-600">
                          <RefreshCw className="size-3 animate-spin" />
                          Retrying...
                        </span>
                      )}
                      {row.status === "resolved" && (
                        <span className="text-xs text-emerald-600">
                          Resolved
                        </span>
                      )}
                      {row.status === "dismissed" && (
                        <span className="text-xs text-muted-foreground">
                          Dismissed
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No exceptions found matching current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
