"use client"

import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function DashboardPage() {
  const todayISO = new Date().toISOString().split("T")[0]

  // Fetch real data from Convex
  const patients = useQuery((api as any).patients.queries.list, { status: "active" })
  const todayAppointments = useQuery((api as any).scheduling.queries.getByDate, { date: todayISO })
  const claims = useQuery((api as any).pmsClaims.queries.list, {})
  const procedures = useQuery((api as any).procedures.queries.list, {})

  // Check if any queries are still loading
  const isLoading =
    patients === undefined ||
    todayAppointments === undefined ||
    claims === undefined ||
    procedures === undefined

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to Oscar. Here is an overview of today&apos;s practice
            performance.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  // Compute KPIs from live data
  // patients.queries.list returns { patients: [...], nextCursor, totalCount }
  const patientList = (patients as any)?.patients ?? []
  const patientCount = Array.isArray(patientList) ? patientList.length : 0
  const appointmentCount = Array.isArray(todayAppointments) ? todayAppointments.length : 0

  // Open claims = claims with status != "paid"
  const openClaims = Array.isArray(claims)
    ? claims.filter((c: any) => c.status !== "paid")
    : []
  const openClaimsCount = openClaims.length
  const pendingReviewCount = Array.isArray(claims)
    ? claims.filter((c: any) => c.status === "submitted" || c.status === "accepted").length
    : 0

  // Today's production: sum fees from procedures completed today
  const todayProduction = Array.isArray(procedures)
    ? procedures
        .filter((p: any) => p.completedAt === todayISO || p.completedAt?.startsWith(todayISO))
        .reduce((sum: number, p: any) => sum + (p.fee ?? 0), 0)
    : 0

  // Schedule fill rate: rough estimate based on today's appointments vs a typical capacity of 20
  const scheduleCapacity = 20
  const fillRate = scheduleCapacity > 0
    ? Math.min(100, Math.round((appointmentCount / scheduleCapacity) * 100))
    : 0

  const metrics = [
    {
      title: "Today's Production",
      value: formatCurrency(todayProduction),
      description: "Across all providers",
    },
    {
      title: "Schedule Fill Rate",
      value: `${fillRate}%`,
      description: `${appointmentCount} appointments today (target: 90%)`,
    },
    {
      title: "Open Claims",
      value: `${openClaimsCount}`,
      description: `${pendingReviewCount} pending review`,
    },
    {
      title: "Active Patients",
      value: `${patientCount}`,
      description: "Currently active",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to Oscar. Here is an overview of today&apos;s practice
          performance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="pb-2">
              <CardDescription>{metric.title}</CardDescription>
              <CardTitle className="text-3xl">{metric.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
