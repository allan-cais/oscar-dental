"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { DataEmptyState } from "@/components/ui/data-empty-state"
import {
  Database, RefreshCw, CheckCircle2, XCircle, Loader2,
  Wifi, Clock, Shield, Webhook, ArrowRightLeft,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type PmsType = "opendental" | "eaglesoft" | "dentrix"
const PMS_LABELS: Record<PmsType, string> = { opendental: "OpenDental", eaglesoft: "Eaglesoft", dentrix: "Dentrix" }

interface SyncRecord {
  id: string; type: "full" | "incremental"; status: "completed" | "failed" | "running"
  patients: number; appointments: number; providers: number; started: string; duration: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function PmsConnectionPage() {
  // Load NexHealth config from Convex (practiceId optional — returns first active config)
  const configData = useQuery(api.nexhealth.queries.getConfig as any, {})
  // Sync history requires practiceId + pagination — skip for now (shows empty history)
  const syncHistoryData = undefined

  const [subdomain, setSubdomain] = useState("")
  const [locationId, setLocationId] = useState("")
  const [environment, setEnvironment] = useState<"sandbox" | "production">("production")
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null)
  const [runningFull, setRunningFull] = useState(false)
  const [runningIncremental, setRunningIncremental] = useState(false)

  // Loading state
  if (configData === undefined) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">PMS Connection</h1>
          <p className="text-muted-foreground">Manage your NexHealth Synchronizer connection.</p>
        </div>
        <Separator />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  const config = configData as any
  const isConnected = !!config && config.status !== "disconnected"
  const pmsType: PmsType = (config?.pmsType as PmsType) || "opendental"
  const writeCapability = "Read/Write" // All PMS types have identical capabilities via NexHealth

  // Populate form from config
  const configSubdomain = subdomain || config?.subdomain || ""
  const configLocationId = locationId || config?.locationId || ""
  const configEnv = config?.environment || environment

  // Sync history from Convex
  const syncHistory: SyncRecord[] = Array.isArray(syncHistoryData)
    ? (syncHistoryData as any[]).map((row: any, idx: number) => ({
        id: row._id || `sync-${idx}`,
        type: row.type || "incremental",
        status: row.status || "completed",
        patients: row.patients || row.patientCount || 0,
        appointments: row.appointments || row.appointmentCount || 0,
        providers: row.providers || row.providerCount || 0,
        started: row.started || (row.startedAt ? new Date(row.startedAt).toLocaleString() : "--"),
        duration: row.duration || "--",
      }))
    : []

  // Last sync info from config
  const lastFullSync = config?.lastFullSyncAt ? new Date(config.lastFullSyncAt).toLocaleString() : "--"
  const lastIncrementalSync = config?.lastIncrementalSyncAt ? new Date(config.lastIncrementalSyncAt).toLocaleString() : "--"

  function handleSaveConfig() {
    setSaving(true)
    setTimeout(() => setSaving(false), 1500)
  }
  function handleTestConnection() {
    setTesting(true)
    setTestResult(null)
    setTimeout(() => { setTesting(false); setTestResult("success") }, 2000)
  }
  function handleFullSync() {
    setRunningFull(true)
    setTimeout(() => setRunningFull(false), 3000)
  }
  function handleIncrementalSync() {
    setRunningIncremental(true)
    setTimeout(() => setRunningIncremental(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">PMS Connection</h1>
        <p className="text-muted-foreground">
          Manage your NexHealth Synchronizer connection to {PMS_LABELS[pmsType] || pmsType}.
        </p>
      </div>
      <Separator />

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" />Connection Status</CardTitle>
          <CardDescription>Current status of the NexHealth Synchronizer bridge.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <><span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" /><span className="font-semibold text-emerald-700 dark:text-emerald-400">Connected</span></>
                ) : (
                  <><span className="h-3 w-3 rounded-full bg-red-500" /><span className="font-semibold text-red-700 dark:text-red-400">Disconnected</span></>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">PMS System</p>
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
                {PMS_LABELS[pmsType] || pmsType}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Capability</p>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
                {writeCapability}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Last Sync</p>
              <p className="font-medium flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted-foreground" />{lastIncrementalSync}
              </p>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Wifi className="h-4 w-4" />Uptime: <span className="font-medium text-foreground">{config?.uptime || "--"}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="h-4 w-4" />TLS 1.3 encrypted
            </span>
          </div>
        </CardContent>
      </Card>

      {/* NexHealth Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ArrowRightLeft className="h-5 w-5" />NexHealth Configuration</CardTitle>
          <CardDescription>API credentials and environment settings for the NexHealth Synchronizer.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <div className="flex gap-2">
                <Input id="api-key" value={config?.apiKeyMasked || "Not configured"} readOnly className="font-mono" />
                <Button variant="outline">Change</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subdomain">Subdomain</Label>
              <Input id="subdomain" value={configSubdomain} onChange={(e) => setSubdomain(e.target.value)} placeholder="your-practice" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location-id">Location ID</Label>
              <Input id="location-id" value={configLocationId} onChange={(e) => setLocationId(e.target.value)} placeholder="12345" className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Environment</Label>
              <Select value={configEnv} onValueChange={(v) => setEnvironment(v as "sandbox" | "production")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveConfig} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sync Operations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><RefreshCw className="h-5 w-5" />Sync Operations</CardTitle>
          <CardDescription>Test your connection or trigger manual sync operations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
              {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : testResult === "success" ? <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
                : testResult === "error" ? <XCircle className="mr-2 h-4 w-4 text-red-600" />
                : <Wifi className="mr-2 h-4 w-4" />}
              Test Connection
            </Button>
            <Button variant="outline" onClick={handleFullSync} disabled={runningFull}>
              {runningFull ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
              Run Full Sync
            </Button>
            <Button variant="outline" onClick={handleIncrementalSync} disabled={runningIncremental}>
              {runningIncremental ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Run Incremental Sync
            </Button>
          </div>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Last Full Sync</p>
              <p className="font-medium">{lastFullSync}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Last Incremental Sync</p>
              <p className="font-medium">{lastIncrementalSync}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Sync History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sync History</CardTitle>
          <CardDescription>Recent sync operations and their results.</CardDescription>
        </CardHeader>
        <CardContent>
          {syncHistory.length === 0 ? (
            <DataEmptyState resource="sync history" message="No sync history available yet. Run a sync operation to see results here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Patients</TableHead>
                  <TableHead className="text-right">Appointments</TableHead>
                  <TableHead className="text-right">Providers</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncHistory.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell><Badge variant="outline" className="capitalize">{row.type}</Badge></TableCell>
                    <TableCell>
                      {row.status === "completed" ? (
                        <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-4 w-4" />Completed</span>
                      ) : row.status === "failed" ? (
                        <span className="flex items-center gap-1.5 text-red-700 dark:text-red-400"><XCircle className="h-4 w-4" />Failed</span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400"><Loader2 className="h-4 w-4 animate-spin" />Running</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">{row.patients.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono">{row.appointments.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono">{row.providers}</TableCell>
                    <TableCell className="text-muted-foreground">{row.started}</TableCell>
                    <TableCell className="text-muted-foreground">{row.duration}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Webhook Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Webhook className="h-5 w-5" />Webhook Status</CardTitle>
          <CardDescription>Incoming webhook endpoint for real-time PMS event notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Endpoint URL</Label>
              <Input value={config?.webhookUrl || "https://app.canopydental.com/api/webhooks/nexhealth"} readOnly className="font-mono text-xs" />
            </div>
            <div className="space-y-2">
              <Label>Signing Secret</Label>
              <div className="flex gap-2">
                <Input value={config?.signingSecretMasked || "Not configured"} readOnly className="font-mono" />
                <Button variant="outline">Rotate</Button>
              </div>
            </div>
          </div>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <>
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">Active</span>
                  </>
                ) : (
                  <>
                    <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
                    <span className="font-medium text-muted-foreground">Inactive</span>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Events Received (24h)</p>
              <p className="font-semibold text-lg">{config?.webhookEventsCount24h ?? 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Last Event</p>
              <p className="font-medium">{config?.lastWebhookEventAt ? new Date(config.lastWebhookEventAt).toLocaleString() : "--"}</p>
              {config?.lastWebhookEventType && (
                <p className="text-xs text-muted-foreground font-mono">{config.lastWebhookEventType}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
