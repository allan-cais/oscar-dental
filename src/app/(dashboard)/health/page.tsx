"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
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
import { Badge } from "@/components/ui/badge"
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Database,
  CreditCard,
  MessageSquare,
  Star,
  Brain,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"

type ServiceStatus = "healthy" | "degraded" | "down" | "not_configured"
type AlertSeverity = "info" | "warning" | "critical"

interface IntegrationService {
  name: string
  icon: React.ReactNode
  status: ServiceStatus
  responseTime: string
  lastChecked: string
  uptime: string
  message?: string
}

interface Alert {
  id: string
  time: string
  service: string
  severity: AlertSeverity
  message: string
  duration: string
}

// Default service definitions (icons and names)
const SERVICE_DEFINITIONS: { name: string; icon: React.ReactNode; key: string }[] = [
  { name: "PMS Sync", icon: <Database className="size-5" />, key: "pms_sync" },
  { name: "Clearinghouse (Vyne)", icon: <FileText className="size-5" />, key: "clearinghouse" },
  { name: "Payments (Stripe)", icon: <CreditCard className="size-5" />, key: "payments" },
  { name: "SMS (Twilio)", icon: <MessageSquare className="size-5" />, key: "sms" },
  { name: "Reviews (Google)", icon: <Star className="size-5" />, key: "reviews" },
  { name: "AI (OpenAI)", icon: <Brain className="size-5" />, key: "ai" },
  { name: "NexHealth Sync", icon: <Database className="size-5" />, key: "nexhealth" },
]

function statusColor(status: ServiceStatus) {
  switch (status) {
    case "healthy":
      return "bg-emerald-500"
    case "degraded":
      return "bg-yellow-500"
    case "down":
      return "bg-red-500"
    case "not_configured":
      return "bg-gray-400"
  }
}

function statusBadgeElement(status: ServiceStatus) {
  switch (status) {
    case "healthy":
      return (
        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
          Healthy
        </Badge>
      )
    case "degraded":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          Degraded
        </Badge>
      )
    case "down":
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          Down
        </Badge>
      )
    case "not_configured":
      return (
        <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          Not Configured
        </Badge>
      )
  }
}

function severityBadge(severity: AlertSeverity) {
  switch (severity) {
    case "info":
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          Info
        </Badge>
      )
    case "warning":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          Warning
        </Badge>
      )
    case "critical":
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          Critical
        </Badge>
      )
  }
}

function ProgressBar({ label, used, total, unit }: { label: string; used: number; total: number; unit: string }) {
  const pct = total > 0 ? Math.round((used / total) * 100) : 0
  const barColor = pct >= 80 ? "bg-red-500" : pct >= 60 ? "bg-yellow-500" : "bg-emerald-500"

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {used.toLocaleString()} / {total.toLocaleString()} {unit}
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted">
        <div
          className={`h-2.5 rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground text-right">{pct}% used</p>
    </div>
  )
}

export default function HealthPage() {
  const [refreshing, setRefreshing] = useState(false)

  // Load health status from Convex — actual query names from convex/health/queries.ts
  const systemHealth = useQuery((api as any).health.queries.getSystemHealth, {})
  const integrationHealth = useQuery((api as any).health.queries.getIntegrationHealth, {})
  const tokenUtilization = useQuery((api as any).health.queries.getTokenUtilization, {})

  // Loading state
  if (systemHealth === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">System Health</h1>
            <p className="text-muted-foreground">Platform health monitoring and integration status.</p>
          </div>
        </div>
        <div className="h-20 bg-muted animate-pulse rounded-lg" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="h-40 bg-muted animate-pulse rounded-lg" />
        <div className="h-60 bg-muted animate-pulse rounded-lg" />
      </div>
    )
  }

  // Build services list from Convex integrationHealth data
  // integrationHealth returns: Array<{ target, status, lastChecked, responseTimeMs, errorCount, message }>
  const integrations = Array.isArray(integrationHealth) ? integrationHealth : []
  const services: IntegrationService[] = SERVICE_DEFINITIONS.map((def) => {
    // Map SERVICE_DEFINITIONS key to integrationHealth target
    const keyToTarget: Record<string, string> = {
      pms_sync: "pms_sync",
      clearinghouse: "clearinghouse",
      payments: "stripe",
      sms: "twilio",
      reviews: "google_business",
      ai: "openai",
      nexhealth: "nexhealth",
    }
    const target = keyToTarget[def.key] ?? def.key
    const serviceData = integrations.find((s: any) => s.target === target)

    if (serviceData) {
      return {
        name: def.name,
        icon: def.icon,
        status: (serviceData.status === "unknown" ? "not_configured" : serviceData.status) as ServiceStatus,
        responseTime: serviceData.responseTimeMs ? `${serviceData.responseTimeMs}ms` : "--",
        lastChecked: serviceData.lastChecked
          ? new Date(serviceData.lastChecked).toLocaleString()
          : "--",
        uptime: "--",
        message: serviceData.message ?? undefined,
      }
    }

    return {
      name: def.name,
      icon: def.icon,
      status: "not_configured" as ServiceStatus,
      responseTime: "--",
      lastChecked: "--",
      uptime: "--",
      message: "Integration not yet configured",
    }
  })

  // Build alerts from integration health — flag services with errors as alerts
  const alerts: Alert[] = integrations
    .filter((s: any) => s.errorCount > 0 || s.status === "down" || s.status === "degraded")
    .map((s: any, idx: number) => ({
      id: `alert-${idx}`,
      time: s.lastChecked ? new Date(s.lastChecked).toLocaleString() : "--",
      service: s.target,
      severity: (s.status === "down" ? "critical" : s.status === "degraded" ? "warning" : "info") as AlertSeverity,
      message: s.message ?? `${s.errorCount} error(s) in the last hour`,
      duration: "--",
    }))

  const hasDegraded = services.some((s) => s.status === "degraded")
  const hasDown = services.some((s) => s.status === "down")
  const allNotConfigured = services.every((s) => s.status === "not_configured")

  function getOverallStatus() {
    if (hasDown) return "System Outage Detected";
    if (hasDegraded) return "Partial Degradation";
    if (allNotConfigured) return "Awaiting Configuration";
    return "All Systems Operational";
  }

  function getOverallDot() {
    if (hasDown) return "bg-red-500";
    if (hasDegraded) return "bg-yellow-500";
    if (allNotConfigured) return "bg-gray-400";
    return "bg-emerald-500";
  }

  function getOverallIcon() {
    if (hasDown) return <XCircle className="size-6 text-red-500" />;
    if (hasDegraded) return <AlertTriangle className="size-6 text-yellow-500" />;
    if (allNotConfigured) return <AlertTriangle className="size-6 text-gray-400" />;
    return <CheckCircle2 className="size-6 text-emerald-500" />;
  }

  const overallStatus = getOverallStatus()
  const overallDot = getOverallDot()
  const overallIcon = getOverallIcon()

  // Token utilization from dedicated query
  const tokenData = tokenUtilization as any
  const openaiUsed = tokenData?.openAi?.estimatedTokensUsed ?? 0
  const openaiTotal = 1000000
  const twilioUsed = tokenData?.twilio?.messagesSent ?? 0
  const twilioTotal = 5000
  const stripeUsed = tokenData?.stripe?.apiCalls ?? 0
  const stripeTotal = 10000

  function handleRefresh() {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1500)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Health</h1>
          <p className="text-muted-foreground">
            Platform health monitoring and integration status.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`mr-2 size-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Overall Status Banner */}
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          {overallIcon}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={`inline-block size-3 rounded-full ${overallDot}`} />
              <h2 className="text-lg font-semibold">{overallStatus}</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {(systemHealth as any)?.lastChecked
                ? `Last checked: ${new Date((systemHealth as any).lastChecked).toLocaleString()}`
                : "Health data loaded from backend"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Integration Status Grid */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Integration Status</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card key={service.name}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                      {service.icon}
                    </div>
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Last checked: {service.lastChecked}
                      </p>
                    </div>
                  </div>
                  {statusBadgeElement(service.status)}
                </div>
                <div className="mt-4 flex items-center gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Response</p>
                    <p className="font-medium">{service.responseTime}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Uptime</p>
                    <p className="font-medium">{service.uptime}</p>
                  </div>
                </div>
                {service.message && (
                  <div className="mt-3 rounded-md bg-yellow-50 px-3 py-2 text-xs text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                    {service.message}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Token Utilization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-5" />
            API Usage &amp; Token Utilization
          </CardTitle>
          <CardDescription>Monthly consumption across integrated services</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <ProgressBar label="OpenAI" used={openaiUsed} total={openaiTotal} unit="tokens" />
          <ProgressBar label="Twilio" used={twilioUsed} total={twilioTotal} unit="messages" />
          <ProgressBar label="Stripe" used={stripeUsed} total={stripeTotal} unit="API calls" />
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
          <CardDescription>System events and service notifications</CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No recent alerts. System events will appear here once integrations are configured.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {alert.time}
                      </TableCell>
                      <TableCell className="font-medium">{alert.service}</TableCell>
                      <TableCell>{severityBadge(alert.severity)}</TableCell>
                      <TableCell className="max-w-xs truncate text-sm">
                        {alert.message}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {alert.duration}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
