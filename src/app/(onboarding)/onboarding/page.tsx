"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Building2,
  Database,
  FileCheck,
  MessageSquare,
  CalendarDays,
  Users,
  RefreshCw,
  Activity,
  Rocket,
  Loader2,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Circle,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PmsType = "opendental" | "eaglesoft" | "dentrix"
type Role = "admin" | "office_manager" | "billing" | "clinical" | "front_desk" | "provider"

interface PracticeProfile {
  name: string
  street: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  npi: string
  taxId: string
}

interface PmsConnection {
  type: PmsType
  apiKey: string        // NexHealth API key
  subdomain: string     // NexHealth subdomain
  locationId: string    // NexHealth location ID
  environment: "sandbox" | "production"
  tested: boolean
  testing: boolean
  providerCount?: number // providers found during test
}

interface Clearinghouse {
  accountId: string
  apiKey: string
  submitterId: string
  tested: boolean
  testing: boolean
}

interface MessageTemplates {
  reviewRequest: string
  collectionReminder: string
}

interface SchedulingRules {
  hours: { day: string; enabled: boolean; start: string; end: string }[]
  defaultDuration: string
  lookAhead: string
}

interface TeamMember {
  id: string
  firstName: string
  lastName: string
  email: string
  role: Role
}

interface SyncItem {
  label: string
  current: number
  total: number
  done: boolean
}

interface HealthItem {
  label: string
  provider: string
  status: "connected" | "error"
  responseTime: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS = [
  { label: "Practice", icon: Building2 },
  { label: "PMS", icon: Database },
  { label: "Clearinghouse", icon: FileCheck },
  { label: "Templates", icon: MessageSquare },
  { label: "Scheduling", icon: CalendarDays },
  { label: "Team", icon: Users },
  { label: "Sync", icon: RefreshCw },
  { label: "Health", icon: Activity },
  { label: "Launch", icon: Rocket },
]

const ROLES: { value: Role; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "office_manager", label: "Office Manager" },
  { value: "billing", label: "Billing" },
  { value: "clinical", label: "Clinical" },
  { value: "front_desk", label: "Front Desk" },
  { value: "provider", label: "Provider" },
]

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

const TIME_OPTIONS = [
  "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM",
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM",
  "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM",
]

// ---------------------------------------------------------------------------
// Default data
// ---------------------------------------------------------------------------

const DEFAULT_PRACTICE: PracticeProfile = {
  name: "Canopy Dental - Main Office",
  street: "1234 Oak Street, Suite 200",
  city: "Austin",
  state: "TX",
  zip: "78701",
  phone: "(512) 555-0123",
  email: "office@canopydental.com",
  npi: "1234567890",
  taxId: "12-3456789",
}

const DEFAULT_PMS: PmsConnection = {
  type: "opendental",
  apiKey: "",
  subdomain: "canopy-dental",
  locationId: "",
  environment: "sandbox",
  tested: false,
  testing: false,
}

const DEFAULT_CLEARINGHOUSE: Clearinghouse = {
  accountId: "VD-CANOPY-001",
  apiKey: "vd_xxxxxxxxxxxxxxxxxxxx",
  submitterId: "CANOPY-TX-001",
  tested: false,
  testing: false,
}

const DEFAULT_TEMPLATES: MessageTemplates = {
  reviewRequest:
    `Hi {patient_first_name}, thank you for visiting {practice_name}! We'd love to hear about your experience. Would you mind leaving us a review? {review_link}\n\nReply STOP to opt out.`,
  collectionReminder:
    `Hi {patient_first_name}, this is a friendly reminder that you have an outstanding balance of {balance_amount} with {practice_name}. Pay securely online: {payment_link}\n\nReply STOP to opt out.`,
}

const DEFAULT_SCHEDULING: SchedulingRules = {
  hours: DAYS.map((day) => ({
    day,
    enabled: day !== "Saturday",
    start: "8:00 AM",
    end: "5:00 PM",
  })),
  defaultDuration: "30",
  lookAhead: "3",
}

const DEFAULT_TEAM: TeamMember[] = [
  { id: "1", firstName: "John", lastName: "Salter", email: "john@canopydental.com", role: "admin" },
  { id: "2", firstName: "Sarah", lastName: "Johnson", email: "sarah@canopydental.com", role: "office_manager" },
  { id: "3", firstName: "Mike", lastName: "Chen", email: "mike@canopydental.com", role: "billing" },
  { id: "4", firstName: "Dr. Emily", lastName: "Park", email: "emily@canopydental.com", role: "provider" },
]

const DEFAULT_SYNC: SyncItem[] = [
  { label: "Patients (via NexHealth)", current: 200, total: 200, done: true },
  { label: "Appointments (via NexHealth)", current: 500, total: 500, done: true },
  { label: "Claims (via NexHealth)", current: 150, total: 200, done: false },
  { label: "Insurance (via NexHealth)", current: 180, total: 200, done: false },
  { label: "Providers (via NexHealth)", current: 6, total: 6, done: true },
]

const DEFAULT_HEALTH: HealthItem[] = [
  { label: "PMS", provider: "NexHealth Synchronizer", status: "connected", responseTime: "45ms" },
  { label: "Clearinghouse", provider: "Vyne Dental", status: "connected", responseTime: "120ms" },
  { label: "SMS", provider: "Twilio", status: "connected", responseTime: "89ms" },
  { label: "Payments", provider: "Stripe", status: "connected", responseTime: "67ms" },
  { label: "Reviews", provider: "Google", status: "connected", responseTime: "210ms" },
  { label: "AI", provider: "OpenAI", status: "connected", responseTime: "340ms" },
]

// ---------------------------------------------------------------------------
// Skippable steps (0-indexed)
// ---------------------------------------------------------------------------
const SKIPPABLE_STEPS = new Set([3, 4, 5])

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [practice, setPractice] = useState<PracticeProfile>(DEFAULT_PRACTICE)
  const [pms, setPms] = useState<PmsConnection>(DEFAULT_PMS)
  const [clearinghouse, setClearinghouse] = useState<Clearinghouse>(DEFAULT_CLEARINGHOUSE)
  const [templates, setTemplates] = useState<MessageTemplates>(DEFAULT_TEMPLATES)
  const [scheduling, setScheduling] = useState<SchedulingRules>(DEFAULT_SCHEDULING)
  const [team, setTeam] = useState<TeamMember[]>(DEFAULT_TEAM)
  const [syncItems, setSyncItems] = useState<SyncItem[]>(DEFAULT_SYNC)
  const [syncComplete, setSyncComplete] = useState(false)
  const [healthItems] = useState<HealthItem[]>(DEFAULT_HEALTH)
  const [launched, setLaunched] = useState(false)
  const router = useRouter()

  // Redirect to dashboard after launch
  useEffect(() => {
    if (!launched) return
    const timeout = setTimeout(() => router.push("/dashboard"), 2000)
    return () => clearTimeout(timeout)
  }, [launched, router])

  // Simulate sync progress when on step 6
  useEffect(() => {
    if (step !== 6 || syncComplete) return
    const interval = setInterval(() => {
      setSyncItems((prev) => {
        const next = prev.map((item) => {
          if (item.done) return item
          const increment = Math.ceil(item.total * 0.15)
          const newCurrent = Math.min(item.current + increment, item.total)
          return { ...item, current: newCurrent, done: newCurrent >= item.total }
        })
        if (next.every((i) => i.done)) {
          setSyncComplete(true)
          clearInterval(interval)
        }
        return next
      })
    }, 600)
    return () => clearInterval(interval)
  }, [step, syncComplete])

  const goNext = useCallback(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), [])
  const goBack = useCallback(() => setStep((s) => Math.max(s - 1, 0)), [])

  // -------------------------------------------------------------------------
  // PMS test connection
  // -------------------------------------------------------------------------
  function handleTestPms() {
    setPms((p) => ({ ...p, testing: true, tested: false }))
    setTimeout(() => {
      setPms((p) => ({ ...p, testing: false, tested: true, providerCount: 4 }))
    }, 2000)
  }

  // -------------------------------------------------------------------------
  // Clearinghouse test connection
  // -------------------------------------------------------------------------
  function handleTestClearinghouse() {
    setClearinghouse((c) => ({ ...c, testing: true, tested: false }))
    setTimeout(() => setClearinghouse((c) => ({ ...c, testing: false, tested: true })), 1500)
  }

  // -------------------------------------------------------------------------
  // Team management
  // -------------------------------------------------------------------------
  function addTeamMember() {
    setTeam((t) => [
      ...t,
      { id: String(Date.now()), firstName: "", lastName: "", email: "", role: "front_desk" },
    ])
  }

  function removeTeamMember(id: string) {
    setTeam((t) => t.filter((m) => m.id !== id))
  }

  function updateTeamMember(id: string, field: keyof TeamMember, value: string) {
    setTeam((t) => t.map((m) => (m.id === id ? { ...m, [field]: value } : m)))
  }

  // -------------------------------------------------------------------------
  // PMS display name
  // -------------------------------------------------------------------------
  function pmsLabel(type: PmsType): string {
    switch (type) {
      case "opendental": return "OpenDental"
      case "eaglesoft": return "Eaglesoft"
      case "dentrix": return "Dentrix"
    }
  }

  // -------------------------------------------------------------------------
  // Overall sync percentage
  // -------------------------------------------------------------------------
  function syncPercentage(): number {
    const totalItems = syncItems.reduce((acc, i) => acc + i.total, 0)
    const currentItems = syncItems.reduce((acc, i) => acc + i.current, 0)
    return totalItems === 0 ? 0 : Math.round((currentItems / totalItems) * 100)
  }

  // =========================================================================
  // Step renderers
  // =========================================================================

  function renderPracticeProfile() {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Practice Profile</CardTitle>
          <CardDescription>Enter your practice information. This will be used across Oscar for claims, scheduling, and communications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="practiceName">Practice Name</Label>
            <Input id="practiceName" value={practice.name} onChange={(e) => setPractice({ ...practice, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="street">Street Address</Label>
            <Input id="street" value={practice.street} onChange={(e) => setPractice({ ...practice, street: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={practice.city} onChange={(e) => setPractice({ ...practice, city: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" value={practice.state} onChange={(e) => setPractice({ ...practice, state: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input id="zip" value={practice.zip} onChange={(e) => setPractice({ ...practice, zip: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={practice.phone} onChange={(e) => setPractice({ ...practice, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={practice.email} onChange={(e) => setPractice({ ...practice, email: e.target.value })} />
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="npi">NPI Number</Label>
              <Input id="npi" value={practice.npi} onChange={(e) => setPractice({ ...practice, npi: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxId">Tax ID</Label>
              <Input id="taxId" value={practice.taxId} onChange={(e) => setPractice({ ...practice, taxId: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  function renderPmsConnection() {
    return (
      <Card>
        <CardHeader>
          <CardTitle>PMS Connection</CardTitle>
          <CardDescription>Connect Oscar to your Practice Management System via NexHealth Synchronizer. The Synchronizer agent runs on-premises and provides a unified API to your PMS.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* PMS Selection */}
          <div className="grid grid-cols-3 gap-4">
            {(["opendental", "eaglesoft", "dentrix"] as PmsType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setPms({ ...pms, type, tested: false })}
                className={`rounded-lg border-2 p-4 text-left transition-colors ${
                  pms.type === type
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Database className="size-5 text-primary" />
                  <span className="font-semibold">{pmsLabel(type)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {type === "opendental" ? "Full read/write via NexHealth" : "Read-only via NexHealth"}
                </p>
              </button>
            ))}
          </div>

          {/* Read-only warning for Eaglesoft/Dentrix */}
          {pms.type !== "opendental" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
              <div className="flex items-start gap-2">
                <AlertTriangle className="size-4 mt-0.5 text-amber-600 dark:text-amber-400" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Read-only access</strong> — Scheduling and payment write-back will use the HITL task system for {pmsLabel(pms.type)}.
                </p>
              </div>
            </div>
          )}

          {/* NexHealth Synchronizer credentials */}
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-sm text-muted-foreground">
                Enter your NexHealth Synchronizer credentials below. These are provided by NexHealth when your on-premises agent is installed.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nhApiKey">NexHealth API Key</Label>
                <Input
                  id="nhApiKey"
                  type="password"
                  value={pms.apiKey}
                  onChange={(e) => setPms({ ...pms, apiKey: e.target.value, tested: false })}
                  placeholder="Enter your API key"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nhSubdomain">Subdomain</Label>
                <Input
                  id="nhSubdomain"
                  value={pms.subdomain}
                  onChange={(e) => setPms({ ...pms, subdomain: e.target.value, tested: false })}
                  placeholder="your-practice"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nhLocationId">Location ID</Label>
                <Input
                  id="nhLocationId"
                  value={pms.locationId}
                  onChange={(e) => setPms({ ...pms, locationId: e.target.value, tested: false })}
                  placeholder="e.g. 12345"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nhEnv">Environment</Label>
                <Select
                  value={pms.environment}
                  onValueChange={(val) => setPms({ ...pms, environment: val as "sandbox" | "production", tested: false })}
                >
                  <SelectTrigger id="nhEnv">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Test connection */}
          <div className="flex items-center gap-3">
            <Button onClick={handleTestPms} disabled={pms.testing || !pms.apiKey} variant={pms.tested ? "outline" : "default"}>
              {pms.testing ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Connecting to NexHealth...
                </>
              ) : pms.tested ? (
                <>
                  <Check className="mr-2 size-4 text-emerald-600" />
                  Connected
                </>
              ) : (
                "Test Connection"
              )}
            </Button>
            {pms.tested && (
              <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                NexHealth Synchronizer connected — {pms.providerCount ?? 0} providers found
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  function renderClearinghouse() {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Clearinghouse Connection</CardTitle>
          <CardDescription>Connect to Vyne Dental for electronic claims submission and tracking.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary">Vyne Dental</Badge>
            <span className="text-sm text-muted-foreground">Electronic claims clearinghouse</span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="chAccountId">Account ID</Label>
            <Input id="chAccountId" value={clearinghouse.accountId} onChange={(e) => setClearinghouse({ ...clearinghouse, accountId: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chApiKey">API Key</Label>
            <Input id="chApiKey" type="password" value={clearinghouse.apiKey} onChange={(e) => setClearinghouse({ ...clearinghouse, apiKey: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chSubmitterId">Submitter ID</Label>
            <Input id="chSubmitterId" value={clearinghouse.submitterId} onChange={(e) => setClearinghouse({ ...clearinghouse, submitterId: e.target.value })} />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleTestClearinghouse} disabled={clearinghouse.testing} variant={clearinghouse.tested ? "outline" : "default"}>
              {clearinghouse.testing ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Testing...
                </>
              ) : clearinghouse.tested ? (
                <>
                  <Check className="mr-2 size-4 text-emerald-600" />
                  Connected
                </>
              ) : (
                "Test Connection"
              )}
            </Button>
            {clearinghouse.tested && (
              <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                Successfully connected to Vyne Dental
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  function renderMessageTemplates() {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Message Templates</CardTitle>
          <CardDescription>Configure SMS templates for patient communications. Templates support variables like {"{patient_first_name}"} and {"{practice_name}"}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="reviewTemplate">Review Request Template</Label>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-600">FTC Compliant</span>
              </div>
            </div>
            <Textarea
              id="reviewTemplate"
              rows={5}
              value={templates.reviewRequest}
              onChange={(e) => setTemplates({ ...templates, reviewRequest: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">No incentives in review requests (FTC compliant). STOP keyword included for TCPA compliance.</p>
          </div>
          <Separator />
          <div className="space-y-3">
            <Label htmlFor="collectionTemplate">Collection Reminder Template</Label>
            <Textarea
              id="collectionTemplate"
              rows={5}
              value={templates.collectionReminder}
              onChange={(e) => setTemplates({ ...templates, collectionReminder: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">STOP keyword included for TCPA compliance.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  function renderSchedulingRules() {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scheduling Rules</CardTitle>
          <CardDescription>Set your practice business hours and default scheduling parameters.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Business hours grid */}
          <div className="space-y-3">
            <Label>Business Hours</Label>
            <div className="space-y-2">
              {scheduling.hours.map((h, idx) => (
                <div key={h.day} className="flex items-center gap-3">
                  <div className="w-24 text-sm font-medium">{h.day}</div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...scheduling.hours]
                      next[idx] = { ...next[idx], enabled: !next[idx].enabled }
                      setScheduling({ ...scheduling, hours: next })
                    }}
                    className={`size-5 rounded border flex items-center justify-center transition-colors ${
                      h.enabled ? "bg-primary border-primary text-primary-foreground" : "border-input"
                    }`}
                  >
                    {h.enabled && <Check className="size-3" />}
                  </button>
                  {h.enabled ? (
                    <>
                      <Select
                        value={h.start}
                        onValueChange={(v) => {
                          const next = [...scheduling.hours]
                          next[idx] = { ...next[idx], start: v }
                          setScheduling({ ...scheduling, hours: next })
                        }}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground text-sm">to</span>
                      <Select
                        value={h.end}
                        onValueChange={(v) => {
                          const next = [...scheduling.hours]
                          next[idx] = { ...next[idx], end: v }
                          setScheduling({ ...scheduling, hours: next })
                        }}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Closed</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Default Appointment Duration</Label>
              <Select value={scheduling.defaultDuration} onValueChange={(v) => setScheduling({ ...scheduling, defaultDuration: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scheduling Look-ahead</Label>
              <Select value={scheduling.lookAhead} onValueChange={(v) => setScheduling({ ...scheduling, lookAhead: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 month</SelectItem>
                  <SelectItem value="2">2 months</SelectItem>
                  <SelectItem value="3">3 months</SelectItem>
                  <SelectItem value="6">6 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  function renderInviteTeam() {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Invite Team Members</CardTitle>
              <CardDescription>Add the people who will use Oscar. You can always add more later from Settings.</CardDescription>
            </div>
            <Button onClick={addTeamMember} size="sm">
              <Plus className="mr-2 size-4" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>First Name</TableHead>
                  <TableHead>Last Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <Input
                        value={member.firstName}
                        onChange={(e) => updateTeamMember(member.id, "firstName", e.target.value)}
                        placeholder="First name"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={member.lastName}
                        onChange={(e) => updateTeamMember(member.id, "lastName", e.target.value)}
                        placeholder="Last name"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={member.email}
                        onChange={(e) => updateTeamMember(member.id, "email", e.target.value)}
                        placeholder="email@example.com"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Select value={member.role} onValueChange={(v) => updateTeamMember(member.id, "role", v)}>
                        <SelectTrigger className="h-8 w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => removeTeamMember(member.id)} className="size-8 p-0 text-muted-foreground hover:text-destructive">
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    )
  }

  function renderInitialSync() {
    const pct = syncPercentage()
    return (
      <Card>
        <CardHeader>
          <CardTitle>Initial Data Sync</CardTitle>
          <CardDescription>
            {syncComplete
              ? "All data has been synced successfully from your PMS."
              : "Syncing data from your PMS into Oscar. This may take a few moments."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Overall Progress</span>
              <span className="text-muted-foreground">{pct}%</span>
            </div>
            <div className="h-3 w-full rounded-full bg-secondary">
              <div
                className="h-3 rounded-full bg-primary transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <Separator />

          {/* Individual items */}
          <div className="space-y-4">
            {syncItems.map((item) => {
              const itemPct = item.total === 0 ? 0 : Math.round((item.current / item.total) * 100)
              return (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {item.done ? (
                        <CheckCircle2 className="size-4 text-emerald-600" />
                      ) : (
                        <Loader2 className="size-4 animate-spin text-primary" />
                      )}
                      <span>{item.label}</span>
                    </div>
                    <span className="text-muted-foreground tabular-nums">
                      {item.current}/{item.total} {item.done && <Check className="inline size-3 text-emerald-600" />}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${item.done ? "bg-emerald-500" : "bg-primary"}`}
                      style={{ width: `${itemPct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Status */}
          <div className="flex items-center justify-center pt-2">
            {syncComplete ? (
              <div className="flex items-center gap-2 text-emerald-600 font-medium">
                <CheckCircle2 className="size-5" />
                Sync Complete!
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Syncing...
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  function renderHealthCheck() {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Integration Health Check</CardTitle>
          <CardDescription>All connected integrations are verified and operational.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {healthItems.map((item) => (
              <div key={item.label} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.label}</span>
                  <CheckCircle2 className="size-4 text-emerald-600" />
                </div>
                <p className="text-xs text-muted-foreground">{item.provider}</p>
                <div className="flex items-center gap-1.5">
                  <div className="size-2 rounded-full bg-emerald-500" />
                  <span className="text-xs text-emerald-600 font-medium">Connected</span>
                  <span className="text-xs text-muted-foreground ml-auto">{item.responseTime}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  function renderReviewAndLaunch() {
    const checklist = [
      { label: "Practice Profile", done: true },
      { label: `PMS Connection (${pmsLabel(pms.type)})`, done: pms.tested },
      { label: "Clearinghouse (Vyne Dental)", done: clearinghouse.tested },
      { label: "Message Templates", done: true },
      { label: "Scheduling Rules", done: true },
      { label: `Team Members (${team.length})`, done: team.length > 0 },
      { label: "Initial Data Sync", done: syncComplete },
      { label: "Health Check", done: true },
    ]

    return (
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Practice</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-medium">{practice.name}</p>
              <p className="text-muted-foreground">{practice.street}</p>
              <p className="text-muted-foreground">{practice.city}, {practice.state} {practice.zip}</p>
              <p className="text-muted-foreground">{practice.phone}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">PMS</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-medium">{pmsLabel(pms.type)}</p>
              <p className="text-muted-foreground">via NexHealth Synchronizer</p>
              <p className="text-muted-foreground">{pms.type === "opendental" ? "Full read/write" : "Read-only (HITL fallback)"}</p>
              <Badge variant={pms.tested ? "default" : "secondary"} className={pms.tested ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" : ""}>
                {pms.tested ? "Connected" : "Not tested"}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Scheduling</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="text-muted-foreground">{scheduling.hours.filter((h) => h.enabled).length} days/week</p>
              <p className="text-muted-foreground">{scheduling.defaultDuration} min default appt</p>
              <p className="text-muted-foreground">{scheduling.lookAhead} month look-ahead</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Team</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-medium">{team.length} members</p>
              {team.slice(0, 3).map((m) => (
                <p key={m.id} className="text-muted-foreground">{m.firstName} {m.lastName} ({ROLES.find((r) => r.value === m.role)?.label})</p>
              ))}
              {team.length > 3 && <p className="text-muted-foreground">+{team.length - 3} more</p>}
            </CardContent>
          </Card>
        </div>

        {/* Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>Setup Checklist</CardTitle>
            <CardDescription>{checklist.filter((c) => c.done).length} of {checklist.length} steps completed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {checklist.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  {item.done ? (
                    <CheckCircle2 className="size-5 text-emerald-600" />
                  ) : (
                    <Circle className="size-5 text-muted-foreground" />
                  )}
                  <span className={`text-sm ${item.done ? "" : "text-muted-foreground"}`}>{item.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Launch button */}
        {!launched ? (
          <Button className="w-full h-12 text-lg" size="lg" onClick={() => setLaunched(true)}>
            <Rocket className="mr-2 size-5" />
            Launch Oscar
          </Button>
        ) : (
          <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-900 dark:bg-emerald-950/30">
            <CheckCircle2 className="size-12 text-emerald-600 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-emerald-800 dark:text-emerald-200">Oscar is Live!</h3>
            <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">Your practice is all set. Redirecting to dashboard...</p>
          </div>
        )}
      </div>
    )
  }

  // =========================================================================
  // Step content dispatcher
  // =========================================================================

  const STEP_RENDERERS = [
    renderPracticeProfile,
    renderPmsConnection,
    renderClearinghouse,
    renderMessageTemplates,
    renderSchedulingRules,
    renderInviteTeam,
    renderInitialSync,
    renderHealthCheck,
    renderReviewAndLaunch,
  ]

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="space-y-8">
      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((s, idx) => {
            const Icon = s.icon
            const isActive = idx === step
            const isComplete = idx < step
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => idx <= step && setStep(idx)}
                disabled={idx > step}
                className={`flex flex-col items-center gap-1.5 transition-colors ${
                  idx <= step ? "cursor-pointer" : "cursor-not-allowed opacity-40"
                }`}
              >
                <div
                  className={`size-9 rounded-full flex items-center justify-center transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isComplete
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isComplete ? <Check className="size-4" /> : <Icon className="size-4" />}
                </div>
                <span className={`text-xs hidden sm:block ${isActive ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
              </button>
            )
          })}
        </div>
        {/* Connecting line */}
        <div className="h-1 w-full rounded-full bg-secondary mt-1">
          <div
            className="h-1 rounded-full bg-primary transition-all duration-500"
            style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Step title */}
      <div>
        <h2 className="text-xl font-bold">Step {step + 1}: {STEPS[step].label}</h2>
        <p className="text-sm text-muted-foreground">
          {step + 1} of {STEPS.length}
        </p>
      </div>

      {/* Step content */}
      {STEP_RENDERERS[step]()}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2 pb-8">
        <Button variant="outline" onClick={goBack} disabled={step === 0}>
          <ChevronLeft className="mr-2 size-4" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          {SKIPPABLE_STEPS.has(step) && step < STEPS.length - 1 && (
            <Button variant="ghost" onClick={goNext}>
              Skip
            </Button>
          )}
          {step < STEPS.length - 1 && (
            <Button onClick={goNext}>
              Next
              <ChevronRight className="ml-2 size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
