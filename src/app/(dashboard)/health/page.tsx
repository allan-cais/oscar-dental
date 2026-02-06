"use client"

import { useState } from "react"
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

type ServiceStatus = "healthy" | "degraded" | "down"
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

const SERVICES: IntegrationService[] = [
  {
    name: "PMS Sync",
    icon: <Database className="size-5" />,
    status: "healthy",
    responseTime: "120ms",
    lastChecked: "2 min ago",
    uptime: "99.97%",
  },
  {
    name: "Clearinghouse (Vyne)",
    icon: <FileText className="size-5" />,
    status: "healthy",
    responseTime: "230ms",
    lastChecked: "1 min ago",
    uptime: "99.94%",
  },
  {
    name: "Payments (Stripe)",
    icon: <CreditCard className="size-5" />,
    status: "healthy",
    responseTime: "89ms",
    lastChecked: "3 min ago",
    uptime: "99.99%",
  },
  {
    name: "SMS (Twilio)",
    icon: <MessageSquare className="size-5" />,
    status: "degraded",
    responseTime: "450ms",
    lastChecked: "1 min ago",
    uptime: "99.82%",
    message: "Elevated latency",
  },
  {
    name: "Reviews (Google)",
    icon: <Star className="size-5" />,
    status: "healthy",
    responseTime: "180ms",
    lastChecked: "4 min ago",
    uptime: "99.91%",
  },
  {
    name: "AI (OpenAI)",
    icon: <Brain className="size-5" />,
    status: "healthy",
    responseTime: "340ms",
    lastChecked: "2 min ago",
    uptime: "99.88%",
  },
]

const ALERTS: Alert[] = [
  {
    id: "a1",
    time: "2 min ago",
    service: "Twilio",
    severity: "warning",
    message: "Response time exceeded 400ms threshold",
    duration: "Ongoing",
  },
  {
    id: "a2",
    time: "18 min ago",
    service: "PMS Sync",
    severity: "info",
    message: "Batch sync completed: 1,247 records processed",
    duration: "2m 34s",
  },
  {
    id: "a3",
    time: "42 min ago",
    service: "Stripe",
    severity: "info",
    message: "Webhook endpoint verified successfully",
    duration: "—",
  },
  {
    id: "a4",
    time: "1 hr ago",
    service: "OpenAI",
    severity: "info",
    message: "Model fallback: gpt-4o-mini used for 3 requests (rate limit)",
    duration: "45s",
  },
  {
    id: "a5",
    time: "3 hrs ago",
    service: "Vyne",
    severity: "info",
    message: "Claim batch #4821 submitted: 34 claims",
    duration: "—",
  },
  {
    id: "a6",
    time: "5 hrs ago",
    service: "Google",
    severity: "info",
    message: "Review monitoring cycle completed: 2 new reviews detected",
    duration: "12s",
  },
  {
    id: "a7",
    time: "Yesterday, 11:42 PM",
    service: "PMS Sync",
    severity: "critical",
    message: "Connection timeout to OpenDental API — auto-recovered after retry",
    duration: "1m 12s (Resolved)",
  },
  {
    id: "a8",
    time: "Yesterday, 6:00 AM",
    service: "PMS Sync",
    severity: "info",
    message: "Scheduled eligibility batch completed: 892 patients verified",
    duration: "4m 08s",
  },
]

function statusColor(status: ServiceStatus) {
  switch (status) {
    case "healthy":
      return "bg-emerald-500"
    case "degraded":
      return "bg-yellow-500"
    case "down":
      return "bg-red-500"
  }
}

function statusBadge(status: ServiceStatus) {
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
  const pct = Math.round((used / total) * 100)
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

  const hasDegraded = SERVICES.some((s) => s.status === "degraded")
  const hasDown = SERVICES.some((s) => s.status === "down")

  const overallStatus = hasDown
    ? "System Outage Detected"
    : hasDegraded
      ? "Partial Degradation"
      : "All Systems Operational"

  const overallDot = hasDown
    ? "bg-red-500"
    : hasDegraded
      ? "bg-yellow-500"
      : "bg-emerald-500"

  const overallIcon = hasDown ? (
    <XCircle className="size-6 text-red-500" />
  ) : hasDegraded ? (
    <AlertTriangle className="size-6 text-yellow-500" />
  ) : (
    <CheckCircle2 className="size-6 text-emerald-500" />
  )

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
            <p className="text-sm text-muted-foreground">Last checked: 2 minutes ago</p>
          </div>
        </CardContent>
      </Card>

      {/* Integration Status Grid */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Integration Status</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service) => (
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
                  {statusBadge(service.status)}
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
          <ProgressBar label="OpenAI" used={67234} total={100000} unit="tokens" />
          <ProgressBar label="Twilio" used={1234} total={5000} unit="messages" />
          <ProgressBar label="Stripe" used={456} total={2000} unit="API calls" />
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
          <CardDescription>System events and service notifications</CardDescription>
        </CardHeader>
        <CardContent>
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
                {ALERTS.map((alert) => (
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
        </CardContent>
      </Card>
    </div>
  )
}
