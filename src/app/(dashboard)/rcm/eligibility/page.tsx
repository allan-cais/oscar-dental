"use client"

import { useState, useMemo } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  Clock,
  Search,
  RefreshCw,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  EligibilityCard,
  type EligibilityResultData,
} from "@/components/rcm/eligibility-card"
import { CobPrompt } from "@/components/rcm/cob-prompt"

// ---------------------------------------------------------------------------
// Demo result for the verify patient feature (simulated real-time check)
// ---------------------------------------------------------------------------

const DEMO_RESULT: EligibilityResultData = {
  status: "active",
  payerName: "Delta Dental PPO",
  memberId: "DDX-8834721",
  groupNumber: "GRP-44210",
  benefits: {
    annualMaximum: 2000,
    annualUsed: 450,
    annualRemaining: 1550,
    deductible: 50,
    deductibleMet: 50,
    preventiveCoverage: 100,
    basicCoverage: 80,
    majorCoverage: 50,
    waitingPeriods: [],
  },
  costEstimate: 85,
  costEstimateVariance: 10,
  cachedUntil: "Feb 6, 2026 3:45 PM",
  verificationMethod: "Real-time",
  patientName: "Sarah Mitchell",
}

function statusBadge(status: string) {
  switch (status) {
    case "active":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
          <CheckCircle className="size-3" />
          Active
        </Badge>
      )
    case "inactive":
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200">
          <AlertTriangle className="size-3" />
          Inactive
        </Badge>
      )
    case "error":
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200">
          <AlertTriangle className="size-3" />
          Error
        </Badge>
      )
    case "pending":
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
          <Clock className="size-3" />
          Pending
        </Badge>
      )
    default:
      return null
  }
}

function methodBadge(method: string) {
  return method === "Real-time" ? (
    <Badge variant="outline" className="text-xs">
      <RefreshCw className="size-3" />
      Real-time
    </Badge>
  ) : (
    <Badge variant="secondary" className="text-xs">
      <Clock className="size-3" />
      Batch
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EligibilityPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [verified, setVerified] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [selectedRow, setSelectedRow] = useState<string | null>(null)
  const [cobOpen, setCobOpen] = useState(false)

  // Convex queries
  const recentVerifications = useQuery((api as any).eligibility.queries.list) ?? []

  const stats = useMemo(() => {
    const active = recentVerifications.filter((v: any) => v.status === "active").length
    const pending = recentVerifications.filter((v: any) => v.status === "pending").length
    const error = recentVerifications.filter((v: any) => v.status === "error").length
    return [
      { label: "Verified Today", value: String(recentVerifications.length), icon: CheckCircle, iconColor: "text-emerald-500" },
      { label: "Pending Verification", value: String(pending), icon: Clock, iconColor: "text-amber-500" },
      { label: "Failed / Error", value: String(error), icon: AlertTriangle, iconColor: "text-red-500" },
    ]
  }, [recentVerifications])

  function handleVerify() {
    if (!searchTerm.trim()) return
    setVerifying(true)
    setVerified(false)
    // Simulate verification delay
    setTimeout(() => {
      setVerifying(false)
      setVerified(true)
    }, 1200)
  }

  const selectedVerification = recentVerifications.find(
    (v: any) => v.id === selectedRow
  )

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Eligibility Verification
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Real-time eligibility checks in under 30 seconds with batch
          verification completed by 6 AM daily.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 pt-0">
              <div className={`rounded-lg bg-muted p-2.5 ${stat.iconColor}`}>
                <stat.icon className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="flex items-center gap-4 pt-0">
            <div className="rounded-lg bg-muted p-2.5 text-emerald-500">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Batch Run</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold">Today 5:30 AM</p>
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                  Completed
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content: Verify + Recent */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* LEFT: Verify Patient */}
        <div className="xl:col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="size-5 text-primary" />
                <CardTitle>Verify Patient</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by patient name, ID, or member ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleVerify()
                    }}
                  />
                </div>
                <Button
                  onClick={handleVerify}
                  disabled={!searchTerm.trim() || verifying}
                >
                  {verifying ? (
                    <>
                      <RefreshCw className="size-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Shield className="size-4" />
                      Verify Now
                    </>
                  )}
                </Button>
              </div>

              {verifying && <EligibilityCard data={null} />}
              {verified && !verifying && (
                <>
                  <EligibilityCard data={DEMO_RESULT} />
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCobOpen(true)}
                    >
                      <Shield className="size-4" />
                      Check COB
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Recent Verifications */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Verifications</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Patient</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-6">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentVerifications.map((row: any) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      data-state={selectedRow === row.id ? "selected" : undefined}
                      onClick={() =>
                        setSelectedRow(selectedRow === row.id ? null : row.id)
                      }
                    >
                      <TableCell className="pl-6">
                        <div>
                          <p className="font-medium text-sm">{row.patientName}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.payerName}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{statusBadge(row.status)}</TableCell>
                      <TableCell className="pr-6">
                        <div>
                          <p className="text-xs">{row.verifiedAt}</p>
                          <div className="mt-0.5">{methodBadge(row.method)}</div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {recentVerifications.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                        No recent verifications found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Expanded detail for selected row */}
          {selectedVerification && (
            <Card className="mt-4">
              <CardHeader className="pb-0">
                <CardTitle className="text-base">
                  {selectedVerification.patientName} — Detail
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Separator />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground">Payer</span>
                    <p className="font-medium">{selectedVerification.payerName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status</span>
                    <p>{statusBadge(selectedVerification.status)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Verified At</span>
                    <p className="font-medium">{selectedVerification.verifiedAt}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Method</span>
                    <p>{methodBadge(selectedVerification.method)}</p>
                  </div>
                </div>
                {selectedVerification.status === "active" && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-muted/50 rounded-lg p-2 text-center">
                        <p className="text-muted-foreground text-xs">Annual Max</p>
                        <p className="font-bold">$2,000</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-2 text-center">
                        <p className="text-muted-foreground text-xs">Used</p>
                        <p className="font-bold">$320</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-2 text-center">
                        <p className="text-muted-foreground text-xs">Remaining</p>
                        <p className="font-bold text-emerald-600">$1,680</p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground text-center">
                      Preventive 100% | Basic 80% | Major 50%
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* COB Dialog */}
      <CobPrompt
        open={cobOpen}
        onClose={() => setCobOpen(false)}
        patientName="Sarah Mitchell"
        primaryInsurance={{
          payerName: "Delta Dental PPO",
          memberId: "DDX-8834721",
          groupNumber: "GRP-44210",
          subscriberName: "Sarah Mitchell",
          relationship: "Self",
        }}
        secondaryInsurance={{
          payerName: "Cigna DPPO",
          memberId: "CIG-2240196",
          groupNumber: "GRP-88120",
          subscriberName: "Thomas Mitchell",
          relationship: "Spouse",
        }}
      />
    </div>
  )
}
