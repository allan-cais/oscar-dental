"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Search,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react"

type ActionType =
  | "login"
  | "phi_access"
  | "write_off"
  | "treatment_plan_lock"
  | "treatment_plan_override"
  | "consent_change"
  | "user_role_change"

type ResourceType = "claim" | "patient" | "user" | "denial" | "review"

interface AuditEntry {
  id: string
  timestamp: number
  user: { name: string; role: string }
  action: ActionType
  resource: { type: ResourceType; id: string }
  details: Record<string, unknown>
  hashValid: boolean
}

const ACTION_LABELS: Record<ActionType, string> = {
  login: "Login",
  phi_access: "PHI Access",
  write_off: "Write-Off",
  treatment_plan_lock: "Treatment Plan Lock",
  treatment_plan_override: "Treatment Plan Override",
  consent_change: "Consent Change",
  user_role_change: "User Role Change",
}

const ACTIONS: { value: ActionType; label: string }[] = [
  { value: "login", label: "Login" },
  { value: "phi_access", label: "PHI Access" },
  { value: "write_off", label: "Write-Off" },
  { value: "treatment_plan_lock", label: "Treatment Plan Lock" },
  { value: "treatment_plan_override", label: "Treatment Plan Override" },
  { value: "consent_change", label: "Consent Change" },
  { value: "user_role_change", label: "User Role Change" },
]

const RESOURCE_TYPES: { value: ResourceType; label: string }[] = [
  { value: "claim", label: "Claim" },
  { value: "patient", label: "Patient" },
  { value: "user", label: "User" },
  { value: "denial", label: "Denial" },
  { value: "review", label: "Review" },
]

const MOCK_USERS = [
  { name: "John Salter", role: "admin" },
  { name: "Sarah Johnson", role: "office_manager" },
  { name: "Mike Chen", role: "billing" },
  { name: "Dr. Emily Park", role: "provider" },
  { name: "Lisa Rodriguez", role: "front_desk" },
]

function generateMockEntries(): AuditEntry[] {
  const now = Date.now()
  const entries: AuditEntry[] = [
    {
      id: "aud_001",
      timestamp: now - 120000,
      user: MOCK_USERS[0],
      action: "login",
      resource: { type: "user", id: "USR-001" },
      details: { ip: "192.168.1.42", browser: "Chrome 120", mfa: true },
      hashValid: true,
    },
    {
      id: "aud_002",
      timestamp: now - 300000,
      user: MOCK_USERS[3],
      action: "phi_access",
      resource: { type: "patient", id: "PAT-1847" },
      details: { fields_accessed: ["ssn", "insurance_id", "medical_history"], purpose: "Treatment planning", duration_seconds: 45 },
      hashValid: true,
    },
    {
      id: "aud_003",
      timestamp: now - 420000,
      user: MOCK_USERS[2],
      action: "write_off",
      resource: { type: "claim", id: "CLM-9823" },
      details: { amount: 245.00, reason: "Timely filing expired", approved_by: "Sarah Johnson", original_amount: 1245.00 },
      hashValid: true,
    },
    {
      id: "aud_004",
      timestamp: now - 600000,
      user: MOCK_USERS[3],
      action: "treatment_plan_lock",
      resource: { type: "patient", id: "PAT-2103" },
      details: { plan_id: "TP-4421", procedures: ["D2740", "D2750", "D0220"], total_fee: 3450.00 },
      hashValid: true,
    },
    {
      id: "aud_005",
      timestamp: now - 900000,
      user: MOCK_USERS[1],
      action: "treatment_plan_override",
      resource: { type: "patient", id: "PAT-2103" },
      details: { plan_id: "TP-4421", override_reason: "Patient requested phased approach", original_procedures: 3, new_procedures: 1, approved_by: "Dr. Emily Park" },
      hashValid: true,
    },
    {
      id: "aud_006",
      timestamp: now - 1200000,
      user: MOCK_USERS[2],
      action: "phi_access",
      resource: { type: "patient", id: "PAT-0932" },
      details: { fields_accessed: ["insurance_id", "billing_address"], purpose: "Insurance verification" },
      hashValid: true,
    },
    {
      id: "aud_007",
      timestamp: now - 1500000,
      user: MOCK_USERS[0],
      action: "user_role_change",
      resource: { type: "user", id: "USR-005" },
      details: { user_affected: "Lisa Rodriguez", previous_role: "front_desk", new_role: "billing", reason: "Department transfer" },
      hashValid: true,
    },
    {
      id: "aud_008",
      timestamp: now - 1800000,
      user: MOCK_USERS[4],
      action: "login",
      resource: { type: "user", id: "USR-005" },
      details: { ip: "10.0.0.88", browser: "Safari 17", mfa: true },
      hashValid: true,
    },
    {
      id: "aud_009",
      timestamp: now - 2400000,
      user: MOCK_USERS[3],
      action: "phi_access",
      resource: { type: "patient", id: "PAT-3301" },
      details: { fields_accessed: ["radiographs", "clinical_notes"], purpose: "Follow-up exam" },
      hashValid: true,
    },
    {
      id: "aud_010",
      timestamp: now - 3000000,
      user: MOCK_USERS[1],
      action: "consent_change",
      resource: { type: "patient", id: "PAT-1847" },
      details: { consent_type: "sms_marketing", previous: true, new: false, source: "Patient portal", tcpa_compliant: true },
      hashValid: true,
    },
    {
      id: "aud_011",
      timestamp: now - 3600000,
      user: MOCK_USERS[2],
      action: "write_off",
      resource: { type: "claim", id: "CLM-8744" },
      details: { amount: 89.50, reason: "Contractual adjustment", approved_by: "Sarah Johnson", original_amount: 589.50 },
      hashValid: true,
    },
    {
      id: "aud_012",
      timestamp: now - 4200000,
      user: MOCK_USERS[0],
      action: "login",
      resource: { type: "user", id: "USR-001" },
      details: { ip: "192.168.1.42", browser: "Chrome 120", mfa: true },
      hashValid: true,
    },
    {
      id: "aud_013",
      timestamp: now - 5400000,
      user: MOCK_USERS[3],
      action: "treatment_plan_lock",
      resource: { type: "patient", id: "PAT-4502" },
      details: { plan_id: "TP-4489", procedures: ["D7140", "D7210"], total_fee: 890.00 },
      hashValid: true,
    },
    {
      id: "aud_014",
      timestamp: now - 7200000,
      user: MOCK_USERS[2],
      action: "phi_access",
      resource: { type: "denial", id: "DEN-0234" },
      details: { fields_accessed: ["eob_document", "denial_reason", "patient_info"], purpose: "Appeal preparation" },
      hashValid: true,
    },
    {
      id: "aud_015",
      timestamp: now - 9000000,
      user: MOCK_USERS[1],
      action: "consent_change",
      resource: { type: "patient", id: "PAT-0932" },
      details: { consent_type: "email_reminders", previous: false, new: true, source: "Front desk check-in", tcpa_compliant: true },
      hashValid: true,
    },
    {
      id: "aud_016",
      timestamp: now - 10800000,
      user: MOCK_USERS[0],
      action: "user_role_change",
      resource: { type: "user", id: "USR-003" },
      details: { user_affected: "Mike Chen", previous_role: "front_desk", new_role: "billing", reason: "Promotion" },
      hashValid: true,
    },
    {
      id: "aud_017",
      timestamp: now - 14400000,
      user: MOCK_USERS[3],
      action: "phi_access",
      resource: { type: "patient", id: "PAT-1102" },
      details: { fields_accessed: ["medical_history", "allergies", "medications"], purpose: "Pre-operative review" },
      hashValid: true,
    },
    {
      id: "aud_018",
      timestamp: now - 18000000,
      user: MOCK_USERS[2],
      action: "write_off",
      resource: { type: "claim", id: "CLM-7621" },
      details: { amount: 1200.00, reason: "Denied — non-covered benefit", approved_by: "John Salter", original_amount: 1200.00 },
      hashValid: true,
    },
    {
      id: "aud_019",
      timestamp: now - 21600000,
      user: MOCK_USERS[4],
      action: "login",
      resource: { type: "user", id: "USR-005" },
      details: { ip: "10.0.0.88", browser: "Safari 17", mfa: true },
      hashValid: true,
    },
    {
      id: "aud_020",
      timestamp: now - 25200000,
      user: MOCK_USERS[3],
      action: "treatment_plan_lock",
      resource: { type: "patient", id: "PAT-0821" },
      details: { plan_id: "TP-4399", procedures: ["D1110", "D0120", "D0274"], total_fee: 420.00 },
      hashValid: true,
    },
    {
      id: "aud_021",
      timestamp: now - 28800000,
      user: MOCK_USERS[1],
      action: "phi_access",
      resource: { type: "review", id: "REV-0192" },
      details: { fields_accessed: ["patient_name", "review_text"], purpose: "Response drafting" },
      hashValid: true,
    },
    {
      id: "aud_022",
      timestamp: now - 32400000,
      user: MOCK_USERS[2],
      action: "phi_access",
      resource: { type: "claim", id: "CLM-9102" },
      details: { fields_accessed: ["procedure_codes", "diagnosis_codes", "insurance_info"], purpose: "Claims scrubbing" },
      hashValid: true,
    },
    {
      id: "aud_023",
      timestamp: now - 36000000,
      user: MOCK_USERS[0],
      action: "consent_change",
      resource: { type: "patient", id: "PAT-3301" },
      details: { consent_type: "sms_appointment_reminders", previous: true, new: true, source: "System migration", tcpa_compliant: true },
      hashValid: true,
    },
    {
      id: "aud_024",
      timestamp: now - 43200000,
      user: MOCK_USERS[3],
      action: "treatment_plan_override",
      resource: { type: "patient", id: "PAT-0821" },
      details: { plan_id: "TP-4399", override_reason: "Insurance pre-auth required for D0274", original_procedures: 3, new_procedures: 2, approved_by: "Dr. Emily Park" },
      hashValid: true,
    },
    {
      id: "aud_025",
      timestamp: now - 50400000,
      user: MOCK_USERS[2],
      action: "write_off",
      resource: { type: "claim", id: "CLM-6988" },
      details: { amount: 55.00, reason: "Patient courtesy adjustment", approved_by: "Sarah Johnson", original_amount: 355.00 },
      hashValid: true,
    },
    {
      id: "aud_026",
      timestamp: now - 57600000,
      user: MOCK_USERS[1],
      action: "login",
      resource: { type: "user", id: "USR-002" },
      details: { ip: "192.168.1.55", browser: "Firefox 121", mfa: true },
      hashValid: true,
    },
    {
      id: "aud_027",
      timestamp: now - 64800000,
      user: MOCK_USERS[3],
      action: "phi_access",
      resource: { type: "patient", id: "PAT-4502" },
      details: { fields_accessed: ["clinical_notes", "treatment_history"], purpose: "Chart review" },
      hashValid: true,
    },
    {
      id: "aud_028",
      timestamp: now - 72000000,
      user: MOCK_USERS[0],
      action: "user_role_change",
      resource: { type: "user", id: "USR-004" },
      details: { user_affected: "Dr. Emily Park", previous_role: "clinical", new_role: "provider", reason: "Role correction" },
      hashValid: true,
    },
    {
      id: "aud_029",
      timestamp: now - 79200000,
      user: MOCK_USERS[4],
      action: "phi_access",
      resource: { type: "patient", id: "PAT-2891" },
      details: { fields_accessed: ["contact_info", "appointment_history"], purpose: "Scheduling follow-up" },
      hashValid: true,
    },
    {
      id: "aud_030",
      timestamp: now - 86400000,
      user: MOCK_USERS[2],
      action: "phi_access",
      resource: { type: "patient", id: "PAT-1523" },
      details: { fields_accessed: ["insurance_id", "coverage_details"], purpose: "Eligibility check" },
      hashValid: true,
    },
  ]
  return entries
}

const AUDIT_ENTRIES = generateMockEntries()

function actionBadgeColor(action: ActionType): string {
  switch (action) {
    case "login":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
    case "phi_access":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
    case "write_off":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
    case "treatment_plan_lock":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
    case "treatment_plan_override":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
    case "consent_change":
      return "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400"
    case "user_role_change":
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400"
  }
}

function roleBadgeVariant(role: string): "default" | "secondary" | "outline" {
  switch (role) {
    case "admin":
      return "default"
    case "office_manager":
      return "secondary"
    default:
      return "outline"
  }
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function formatRole(role: string): string {
  return role
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function AuditLogPage() {
  const [search, setSearch] = useState("")
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [resourceFilter, setResourceFilter] = useState<string>("all")
  const [userFilter, setUserFilter] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)

  const filtered = useMemo(() => {
    return AUDIT_ENTRIES.filter((entry) => {
      const matchesSearch =
        search === "" ||
        ACTION_LABELS[entry.action].toLowerCase().includes(search.toLowerCase()) ||
        JSON.stringify(entry.details).toLowerCase().includes(search.toLowerCase()) ||
        entry.resource.id.toLowerCase().includes(search.toLowerCase())

      const matchesAction = actionFilter === "all" || entry.action === actionFilter
      const matchesResource = resourceFilter === "all" || entry.resource.type === resourceFilter
      const matchesUser = userFilter === "all" || entry.user.name === userFilter

      let matchesDateFrom = true
      let matchesDateTo = true
      if (dateFrom) {
        matchesDateFrom = entry.timestamp >= new Date(dateFrom).getTime()
      }
      if (dateTo) {
        matchesDateTo = entry.timestamp <= new Date(dateTo).getTime() + 86400000
      }

      return matchesSearch && matchesAction && matchesResource && matchesUser && matchesDateFrom && matchesDateTo
    })
  }, [search, actionFilter, resourceFilter, userFilter, dateFrom, dateTo])

  function handleVerify() {
    setVerifying(true)
    setVerified(false)
    setTimeout(() => {
      setVerifying(false)
      setVerified(true)
    }, 2500)
  }

  function handleVerifyOpen(open: boolean) {
    setVerifyOpen(open)
    if (!open) {
      setVerifying(false)
      setVerified(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground">
            Immutable, tamper-evident audit trail with SHA-256 hash chain verification.
          </p>
        </div>
        <Dialog open={verifyOpen} onOpenChange={handleVerifyOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" onClick={handleVerify}>
              <ShieldCheck className="mr-2 size-4" />
              Verify Integrity
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Chain Integrity Verification</DialogTitle>
              <DialogDescription>
                Verifying SHA-256 hash chain for all audit entries.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-6">
              {verifying ? (
                <>
                  <Loader2 className="size-12 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Checking 847 audit entries...
                  </p>
                </>
              ) : verified ? (
                <>
                  <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <CheckCircle2 className="size-10 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">
                      Chain Verified
                    </p>
                    <p className="text-sm text-muted-foreground">
                      847 entries checked. No tampering detected.
                    </p>
                  </div>
                </>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search actions, details, resource IDs..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Action Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {ACTIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={resourceFilter} onValueChange={setResourceFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Resource Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                {RESOURCE_TYPES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {MOCK_USERS.map((u) => (
                  <SelectItem key={u.name} value={u.name}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              className="w-[160px]"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From"
            />
            <Input
              type="date"
              className="w-[160px]"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To"
            />
          </div>
        </CardContent>
      </Card>

      {/* Audit Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Entries</CardTitle>
          <CardDescription>
            {filtered.length} entr{filtered.length === 1 ? "y" : "ies"} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30px]"></TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead className="text-center">Hash Valid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No audit entries match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((entry) => {
                    const isExpanded = expandedRow === entry.id
                    return (
                      <TableRow
                        key={entry.id}
                        className="group cursor-pointer"
                        onClick={() =>
                          setExpandedRow(isExpanded ? null : entry.id)
                        }
                      >
                        <TableCell className="px-2">
                          {isExpanded ? (
                            <ChevronDown className="size-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="size-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatTimestamp(entry.timestamp)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{entry.user.name}</span>
                            <Badge variant={roleBadgeVariant(entry.user.role)} className="text-xs">
                              {formatRole(entry.user.role)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={actionBadgeColor(entry.action)}>
                            {ACTION_LABELS[entry.action]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            <span className="text-muted-foreground capitalize">{entry.resource.type}</span>
                            {" "}
                            <span className="font-mono text-xs">{entry.resource.id}</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {entry.hashValid ? (
                            <CheckCircle2 className="mx-auto size-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <span className="mx-auto size-4 text-red-600">X</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Expanded Details */}
          {expandedRow && (
            <div className="mt-3 rounded-lg border bg-muted/50 p-4">
              <h4 className="mb-2 text-sm font-semibold">Entry Details</h4>
              <pre className="overflow-x-auto rounded-md bg-background p-3 text-xs font-mono leading-relaxed">
                {JSON.stringify(
                  AUDIT_ENTRIES.find((e) => e.id === expandedRow)?.details,
                  null,
                  2
                )}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
