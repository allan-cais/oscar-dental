import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const metrics = [
  {
    title: "Today's Production",
    value: "$12,450",
    description: "Across all providers",
  },
  {
    title: "Schedule Fill Rate",
    value: "87%",
    description: "Target: 90%",
  },
  {
    title: "Open Claims",
    value: "34",
    description: "12 pending review",
  },
  {
    title: "Pending Tasks",
    value: "8",
    description: "3 high priority",
  },
]

export default function DashboardPage() {
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
