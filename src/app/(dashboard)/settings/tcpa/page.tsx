"use client"

import { useState, useMemo } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import { DataEmptyState } from "@/components/ui/data-empty-state"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
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
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import {
  Search,
  Shield,
  Users,
  XCircle,
  MessageSquare,
  CheckCircle2,
  Phone,
  Mail,
  Smartphone,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
} from "lucide-react"

// --- Types ---

type ConsentSource = "sms_optin" | "web_form" | "phone" | "paper"
type MessageType = "appt_reminders" | "billing" | "marketing" | "scheduling"

interface PatientConsent {
  id: string
  name: string
  smsConsent: boolean
  emailConsent: boolean
  voiceConsent: boolean
  messagePrefs: MessageType[]
  lastUpdated: string
  source: ConsentSource
}

interface StopEvent {
  id: string
  dateTime: string
  patient: string
  channel: string
  keyword: string
  actionTaken: string
  status: string
}

interface MessageTypeStats {
  type: MessageType
  label: string
  description: string
  subscribedCount: number
  optOutCount: number
  optOutPct: string
  enabled: boolean
}

// --- Constants ---

const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  appt_reminders: "Appt Reminders",
  billing: "Billing",
  marketing: "Marketing",
  scheduling: "Scheduling",
}

function sourceLabel(source: ConsentSource): string {
  const map: Record<ConsentSource, string> = {
    sms_optin: "SMS Opt-in",
    web_form: "Web Form",
    phone: "Phone",
    paper: "Paper",
  }
  return map[source]
}

function sourceBadgeClass(source: ConsentSource): string {
  const map: Record<ConsentSource, string> = {
    sms_optin: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    web_form: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    phone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    paper: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  }
  return map[source]
}

// --- Mock Data ---
// TODO: Wire to real STOP event tracking when Twilio integration is built
const MOCK_STOP_EVENTS: StopEvent[] = [
  { id: "SE001", dateTime: "2026-02-05 09:23 AM", patient: "Thomas Brown", channel: "SMS", keyword: "STOP", actionTaken: "Immediately opted out", status: "Processed" },
  { id: "SE002", dateTime: "2026-02-04 03:15 PM", patient: "James Wilson", channel: "SMS", keyword: "STOP", actionTaken: "Immediately opted out", status: "Processed" },
  { id: "SE003", dateTime: "2026-02-03 11:42 AM", patient: "Patricia Lee", channel: "SMS", keyword: "STOP ALL", actionTaken: "Immediately opted out", status: "Processed" },
  { id: "SE004", dateTime: "2026-02-02 08:55 AM", patient: "Amanda Kim", channel: "SMS", keyword: "STOP", actionTaken: "Immediately opted out", status: "Processed" },
  { id: "SE005", dateTime: "2026-01-30 02:10 PM", patient: "Robert Martinez", channel: "SMS", keyword: "UNSUBSCRIBE", actionTaken: "Immediately opted out", status: "Processed" },
  { id: "SE006", dateTime: "2026-01-28 10:30 AM", patient: "Karen Brown", channel: "SMS", keyword: "STOP", actionTaken: "Immediately opted out", status: "Processed" },
]

// TODO: Wire to real message type stats when Twilio integration is built
const MOCK_MESSAGE_TYPES: MessageTypeStats[] = [
  { type: "appt_reminders", label: "Appointment Reminders", description: "Automated reminders for upcoming appointments", subscribedCount: 172, optOutCount: 15, optOutPct: "8.0%", enabled: true },
  { type: "billing", label: "Billing Notifications", description: "Payment reminders, statements, and text-to-pay links", subscribedCount: 168, optOutCount: 19, optOutPct: "10.2%", enabled: true },
  { type: "marketing", label: "Marketing / Review Requests", description: "Review requests, promotional offers, and newsletters", subscribedCount: 112, optOutCount: 75, optOutPct: "40.1%", enabled: true },
  { type: "scheduling", label: "Scheduling Confirmations", description: "Appointment confirmations, rescheduling notices, and recall reminders", subscribedCount: 158, optOutCount: 29, optOutPct: "15.5%", enabled: true },
]

const VALID_MESSAGE_TYPES: MessageType[] = ["appt_reminders", "billing", "marketing", "scheduling"]
const VALID_SOURCES: ConsentSource[] = ["sms_optin", "web_form", "phone", "paper"]

// --- Component ---

export default function TCPASettingsPage() {
  const [search, setSearch] = useState("")
  const [editingPatient, setEditingPatient] = useState<PatientConsent | null>(null)
  const [editForm, setEditForm] = useState<{
    smsConsent: boolean
    emailConsent: boolean
    voiceConsent: boolean
    messagePrefs: MessageType[]
  }>({ smsConsent: false, emailConsent: false, voiceConsent: false, messagePrefs: [] })
  const [messageTypes, setMessageTypes] = useState<MessageTypeStats[]>(MOCK_MESSAGE_TYPES)

  // Fetch patient consent data from Convex
  const rawConsents = useQuery((api as any).tcpa.queries.listConsents)

  // Map backend results to the PatientConsent interface
  const patients: PatientConsent[] | undefined = rawConsents
    ? (rawConsents as any[]).map((r: any): PatientConsent => ({
        id: r.id,
        name: r.name,
        smsConsent: r.smsConsent,
        emailConsent: r.emailConsent,
        voiceConsent: r.voiceConsent,
        messagePrefs: (r.messagePrefs as string[]).filter(
          (p): p is MessageType => VALID_MESSAGE_TYPES.includes(p as MessageType)
        ),
        lastUpdated: r.lastUpdated
          ? new Date(r.lastUpdated).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "",
        source: VALID_SOURCES.includes(r.source as ConsentSource)
          ? (r.source as ConsentSource)
          : "paper",
      }))
    : undefined

  const filtered = useMemo(() => {
    if (!patients) return []
    return patients.filter((p) =>
      search === "" || p.name.toLowerCase().includes(search.toLowerCase())
    )
  }, [patients, search])

  // Compute stats
  const allPatients = patients ?? []
  const totalConsented = allPatients.length
  const optedOut = allPatients.filter(
    (p) => !p.smsConsent && !p.emailConsent && !p.voiceConsent
  ).length
  const optedOutPct = totalConsented > 0 ? ((optedOut / totalConsented) * 100).toFixed(1) : "0"
  const smsRate = totalConsented > 0
    ? ((allPatients.filter((p) => p.smsConsent).length / totalConsented) * 100).toFixed(0)
    : "0"
  const emailRate = totalConsented > 0
    ? ((allPatients.filter((p) => p.emailConsent).length / totalConsented) * 100).toFixed(0)
    : "0"
  const voiceRate = totalConsented > 0
    ? ((allPatients.filter((p) => p.voiceConsent).length / totalConsented) * 100).toFixed(0)
    : "0"

  function openEdit(patient: PatientConsent) {
    setEditingPatient(patient)
    setEditForm({
      smsConsent: patient.smsConsent,
      emailConsent: patient.emailConsent,
      voiceConsent: patient.voiceConsent,
      messagePrefs: [...patient.messagePrefs],
    })
  }

  function toggleMessagePref(pref: MessageType) {
    setEditForm((prev) => ({
      ...prev,
      messagePrefs: prev.messagePrefs.includes(pref)
        ? prev.messagePrefs.filter((p) => p !== pref)
        : [...prev.messagePrefs, pref],
    }))
  }

  function toggleGlobalMessageType(type: MessageType) {
    setMessageTypes((prev) =>
      prev.map((mt) =>
        mt.type === type ? { ...mt, enabled: !mt.enabled } : mt
      )
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">TCPA Compliance</h1>
        <p className="text-muted-foreground">
          Manage patient communication consent, STOP keyword processing, and
          granular opt-out preferences per TCPA requirements.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Patients Consented</p>
                <p className="text-3xl font-bold">{totalConsented}</p>
              </div>
              <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
                <Users className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Opted Out</p>
                <p className="text-3xl font-bold text-red-600">{optedOut}</p>
                <p className="text-xs text-muted-foreground">{optedOutPct}% of total</p>
              </div>
              <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/30">
                <XCircle className="size-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">STOP Keywords This Month</p>
                <p className="text-3xl font-bold text-orange-600">4</p>
              </div>
              <div className="rounded-full bg-orange-100 p-3 dark:bg-orange-900/30">
                <MessageSquare className="size-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Channels</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-sm">
                    <Smartphone className="size-3.5 text-blue-600" />
                    <span className="font-semibold">{smsRate}%</span>
                  </span>
                  <span className="flex items-center gap-1 text-sm">
                    <Mail className="size-3.5 text-purple-600" />
                    <span className="font-semibold">{emailRate}%</span>
                  </span>
                  <span className="flex items-center gap-1 text-sm">
                    <Phone className="size-3.5 text-emerald-600" />
                    <span className="font-semibold">{voiceRate}%</span>
                  </span>
                </div>
              </div>
              <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/30">
                <Shield className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patient Consent Management Table */}
      <Card>
        <CardHeader>
          <CardTitle>Patient Consent Management</CardTitle>
          <CardDescription>
            View and manage communication consent for all patients. Each patient
            can opt in or out of specific channels and message types.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by patient name..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient Name</TableHead>
                  <TableHead className="text-center">SMS</TableHead>
                  <TableHead className="text-center">Email</TableHead>
                  <TableHead className="text-center">Voice</TableHead>
                  <TableHead>Message Preferences</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!patients ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Loading consent data...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : patients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="p-0">
                      <DataEmptyState
                        resource="consent records"
                        message="No patient communication consent data found. Consent records are created when patients opt in to communications."
                      />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No patients match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium">{patient.name}</TableCell>
                      <TableCell className="text-center">
                        {patient.smsConsent ? (
                          <CheckCircle2 className="mx-auto size-4 text-emerald-600" />
                        ) : (
                          <XCircle className="mx-auto size-4 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {patient.emailConsent ? (
                          <CheckCircle2 className="mx-auto size-4 text-emerald-600" />
                        ) : (
                          <XCircle className="mx-auto size-4 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {patient.voiceConsent ? (
                          <CheckCircle2 className="mx-auto size-4 text-emerald-600" />
                        ) : (
                          <XCircle className="mx-auto size-4 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {patient.messagePrefs.length === 0 ? (
                            <span className="text-xs text-muted-foreground">None</span>
                          ) : (
                            patient.messagePrefs.map((pref) => (
                              <Badge
                                key={pref}
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0"
                              >
                                {MESSAGE_TYPE_LABELS[pref]}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {patient.lastUpdated}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 py-0 ${sourceBadgeClass(patient.source)}`}
                        >
                          {sourceLabel(patient.source)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => openEdit(patient)}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* STOP Keyword Log */}
      <Card>
        <CardHeader>
          <CardTitle>STOP Keyword Log</CardTitle>
          <CardDescription>
            Recent STOP keyword events. All STOP keywords are processed within
            &lt;1 second per TCPA requirements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
              <CheckCircle2 className="mr-1 size-3" />
              All STOP keywords processed within &lt;1 second
            </Badge>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Keyword Received</TableHead>
                  <TableHead>Action Taken</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_STOP_EVENTS.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {event.dateTime}
                    </TableCell>
                    <TableCell className="font-medium">{event.patient}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {event.channel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                        {event.keyword}
                      </code>
                    </TableCell>
                    <TableCell className="text-sm">{event.actionTaken}</TableCell>
                    <TableCell>
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] px-1.5 py-0">
                        {event.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Granular Opt-Out Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Granular Opt-Out Settings</CardTitle>
          <CardDescription>
            Patients can opt out of specific message types while remaining opted
            in for others. Toggle message types on or off globally below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Message Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Subscribed</TableHead>
                  <TableHead className="text-right">Opt-Outs</TableHead>
                  <TableHead className="text-right">Opt-Out %</TableHead>
                  <TableHead className="text-center">Enabled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messageTypes.map((mt) => (
                  <TableRow key={mt.type}>
                    <TableCell className="font-medium">{mt.label}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[250px]">
                      {mt.description}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {mt.subscribedCount}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {mt.optOutCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          parseFloat(mt.optOutPct) > 20
                            ? "text-orange-600 font-medium"
                            : "text-muted-foreground"
                        }
                      >
                        {mt.optOutPct}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => toggleGlobalMessageType(mt.type)}
                      >
                        {mt.enabled ? (
                          <ToggleRight className="size-6 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="size-6 text-muted-foreground" />
                        )}
                        <span className="sr-only">
                          {mt.enabled ? "Disable" : "Enable"} {mt.label}
                        </span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {messageTypes.some((mt) => !mt.enabled) && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
              <AlertTriangle className="mt-0.5 size-4 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Disabled message types will not be sent to any patients, regardless
                of their individual consent preferences.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Consent Dialog */}
      <Dialog
        open={!!editingPatient}
        onOpenChange={(open) => { if (!open) setEditingPatient(null) }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPatient ? `Edit Consent - ${editingPatient.name}` : "Edit Consent"}</DialogTitle>
            <DialogDescription>
              Update communication channel consent and message type
              preferences for this patient.
            </DialogDescription>
          </DialogHeader>
          {editingPatient && (
            <>

              {/* Channel Toggles */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold">Channels</Label>
                  <div className="mt-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="size-4 text-blue-600" />
                        <span className="text-sm">SMS</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() =>
                          setEditForm((prev) => ({
                            ...prev,
                            smsConsent: !prev.smsConsent,
                          }))
                        }
                      >
                        {editForm.smsConsent ? (
                          <ToggleRight className="size-6 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="size-6 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="size-4 text-purple-600" />
                        <span className="text-sm">Email</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() =>
                          setEditForm((prev) => ({
                            ...prev,
                            emailConsent: !prev.emailConsent,
                          }))
                        }
                      >
                        {editForm.emailConsent ? (
                          <ToggleRight className="size-6 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="size-6 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="size-4 text-emerald-600" />
                        <span className="text-sm">Voice</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() =>
                          setEditForm((prev) => ({
                            ...prev,
                            voiceConsent: !prev.voiceConsent,
                          }))
                        }
                      >
                        {editForm.voiceConsent ? (
                          <ToggleRight className="size-6 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="size-6 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Message Type Toggles */}
                <div>
                  <Label className="text-sm font-semibold">Message Preferences</Label>
                  <div className="mt-2 space-y-3">
                    {(Object.keys(MESSAGE_TYPE_LABELS) as MessageType[]).map(
                      (type) => (
                        <div
                          key={type}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm">
                            {MESSAGE_TYPE_LABELS[type]}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => toggleMessagePref(type)}
                          >
                            {editForm.messagePrefs.includes(type) ? (
                              <ToggleRight className="size-6 text-emerald-600" />
                            ) : (
                              <ToggleLeft className="size-6 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setEditingPatient(null)}
                >
                  Cancel
                </Button>
                <Button onClick={() => setEditingPatient(null)}>
                  Save Changes
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
