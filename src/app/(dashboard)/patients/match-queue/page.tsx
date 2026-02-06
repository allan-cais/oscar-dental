"use client"

import { useState, useMemo } from "react"
import {
  Users,
  CheckCircle2,
  Zap,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Search,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type MatchStatus = "pending" | "matched" | "rejected" | "merged"

interface MatchQueueItem {
  id: string
  oscarPatient: {
    id: string
    firstName: string
    lastName: string
    dob: string
    phone?: string
    email?: string
    address?: string
    gender?: string
  }
  pmsPatient: {
    id: string
    pmsId: string
    firstName: string
    lastName: string
    dob: string
    phone?: string
    email?: string
    address?: string
    gender?: string
  }
  matchScore: number
  matchFields: string[]
  status: MatchStatus
  createdAt: number
  resolvedAt?: number
}

// ---------------------------------------------------------------------------
// Demo Data
// ---------------------------------------------------------------------------
const DEMO_MATCHES: MatchQueueItem[] = [
  {
    id: "mq_1",
    oscarPatient: {
      id: "osc_101",
      firstName: "Maria",
      lastName: "Garcia",
      dob: "1985-03-15",
      phone: "(512) 555-0142",
      email: "maria.garcia@email.com",
      address: "123 Main St, Austin, TX 78701",
      gender: "Female",
    },
    pmsPatient: {
      id: "pms_201",
      pmsId: "OD-10042",
      firstName: "Maria",
      lastName: "Garcia",
      dob: "1985-03-15",
      phone: "(512) 555-0142",
      email: "m.garcia@gmail.com",
      address: "123 Main Street, Austin, TX 78701",
      gender: "Female",
    },
    matchScore: 0.96,
    matchFields: ["name", "dob", "phone", "address"],
    status: "pending",
    createdAt: Date.now() - 3600000,
  },
  {
    id: "mq_2",
    oscarPatient: {
      id: "osc_102",
      firstName: "James",
      lastName: "Thompson",
      dob: "1972-08-22",
      phone: "(512) 555-0198",
      email: "james.t@work.com",
      address: "456 Oak Ave, Round Rock, TX 78664",
      gender: "Male",
    },
    pmsPatient: {
      id: "pms_202",
      pmsId: "OD-10088",
      firstName: "Jim",
      lastName: "Thompson",
      dob: "1972-08-22",
      phone: "(512) 555-0198",
      email: "jthompson@outlook.com",
      address: "456 Oak Avenue, Round Rock, TX 78664",
      gender: "Male",
    },
    matchScore: 0.82,
    matchFields: ["dob", "phone", "address"],
    status: "pending",
    createdAt: Date.now() - 7200000,
  },
  {
    id: "mq_3",
    oscarPatient: {
      id: "osc_103",
      firstName: "Susan",
      lastName: "Lee",
      dob: "1990-11-30",
      phone: "(737) 555-0167",
      email: "susan.lee@email.com",
      address: "789 Elm Dr, Cedar Park, TX 78613",
      gender: "Female",
    },
    pmsPatient: {
      id: "pms_203",
      pmsId: "OD-10125",
      firstName: "Susan",
      lastName: "Lee",
      dob: "1990-11-30",
      phone: "(737) 555-0167",
      email: "susan.lee@email.com",
      address: "789 Elm Dr, Cedar Park, TX 78613",
      gender: "Female",
    },
    matchScore: 1.0,
    matchFields: ["name", "dob", "phone", "email", "address"],
    status: "matched",
    createdAt: Date.now() - 86400000,
    resolvedAt: Date.now() - 80000000,
  },
  {
    id: "mq_4",
    oscarPatient: {
      id: "osc_104",
      firstName: "Robert",
      lastName: "Martinez",
      dob: "1965-05-10",
      phone: "(512) 555-0234",
      email: "rob.martinez@yahoo.com",
      address: "321 Pine Ln, Georgetown, TX 78628",
      gender: "Male",
    },
    pmsPatient: {
      id: "pms_204",
      pmsId: "OD-10201",
      firstName: "Roberto",
      lastName: "Martinez",
      dob: "1965-05-10",
      phone: "(512) 555-0999",
      email: "roberto.m@hotmail.com",
      address: "321 Pine Lane, Georgetown, TX 78628",
      gender: "Male",
    },
    matchScore: 0.65,
    matchFields: ["dob", "address"],
    status: "pending",
    createdAt: Date.now() - 10800000,
  },
  {
    id: "mq_5",
    oscarPatient: {
      id: "osc_105",
      firstName: "Emily",
      lastName: "Chen",
      dob: "1998-01-20",
      phone: "(737) 555-0312",
      email: "emily.chen@email.com",
      address: "567 Birch Ct, Pflugerville, TX 78660",
      gender: "Female",
    },
    pmsPatient: {
      id: "pms_205",
      pmsId: "OD-10267",
      firstName: "Emily",
      lastName: "Chen",
      dob: "1998-01-20",
      phone: "(737) 555-0312",
      email: "echen98@gmail.com",
      address: "567 Birch Court, Pflugerville, TX 78660",
      gender: "Female",
    },
    matchScore: 0.91,
    matchFields: ["name", "dob", "phone", "address"],
    status: "pending",
    createdAt: Date.now() - 14400000,
  },
  {
    id: "mq_6",
    oscarPatient: {
      id: "osc_106",
      firstName: "David",
      lastName: "Wilson",
      dob: "1980-07-04",
      phone: "(512) 555-0456",
      email: "d.wilson@email.com",
      address: "890 Maple Rd, Leander, TX 78641",
      gender: "Male",
    },
    pmsPatient: {
      id: "pms_206",
      pmsId: "OD-10302",
      firstName: "David",
      lastName: "Wilson",
      dob: "1980-07-14",
      phone: "(512) 555-0456",
      email: "dwilson@email.com",
      address: "892 Maple Rd, Leander, TX 78641",
      gender: "Male",
    },
    matchScore: 0.74,
    matchFields: ["name", "phone"],
    status: "pending",
    createdAt: Date.now() - 18000000,
  },
  {
    id: "mq_7",
    oscarPatient: {
      id: "osc_107",
      firstName: "Jennifer",
      lastName: "Davis",
      dob: "1975-12-08",
      phone: "(512) 555-0789",
      email: "jen.davis@work.com",
      address: "234 Walnut St, Austin, TX 78745",
      gender: "Female",
    },
    pmsPatient: {
      id: "pms_207",
      pmsId: "OD-10045",
      firstName: "Jennifer",
      lastName: "Davis-Miller",
      dob: "1975-12-08",
      phone: "(512) 555-0789",
      email: "jen.davis@work.com",
      address: "234 Walnut St, Austin, TX 78745",
      gender: "Female",
    },
    matchScore: 0.88,
    matchFields: ["dob", "phone", "email", "address"],
    status: "pending",
    createdAt: Date.now() - 21600000,
  },
  {
    id: "mq_8",
    oscarPatient: {
      id: "osc_108",
      firstName: "Michael",
      lastName: "Brown",
      dob: "1955-09-17",
      phone: "(737) 555-0543",
      email: "michael.b@aol.com",
      address: "678 Cedar Blvd, Hutto, TX 78634",
      gender: "Male",
    },
    pmsPatient: {
      id: "pms_208",
      pmsId: "OD-10089",
      firstName: "Mike",
      lastName: "Brown",
      dob: "1955-09-17",
      phone: "(737) 555-0543",
      email: "michael.brown@aol.com",
      address: "678 Cedar Blvd, Hutto, TX 78634",
      gender: "Male",
    },
    matchScore: 0.85,
    matchFields: ["dob", "phone", "address"],
    status: "rejected",
    createdAt: Date.now() - 172800000,
    resolvedAt: Date.now() - 86400000,
  },
  {
    id: "mq_9",
    oscarPatient: {
      id: "osc_109",
      firstName: "Linda",
      lastName: "Nguyen",
      dob: "1992-04-25",
      phone: "(512) 555-0678",
      email: "linda.n@email.com",
      address: "901 Ash Way, Austin, TX 78748",
      gender: "Female",
    },
    pmsPatient: {
      id: "pms_209",
      pmsId: "OD-10333",
      firstName: "Linda",
      lastName: "Nguyen",
      dob: "1992-04-25",
      phone: "(512) 555-0678",
      email: "linda.nguyen@email.com",
      address: "901 Ash Way, Austin, TX 78748",
      gender: "Female",
    },
    matchScore: 0.94,
    matchFields: ["name", "dob", "phone", "address"],
    status: "matched",
    createdAt: Date.now() - 259200000,
    resolvedAt: Date.now() - 172800000,
  },
  {
    id: "mq_10",
    oscarPatient: {
      id: "osc_110",
      firstName: "Kevin",
      lastName: "Patel",
      dob: "1988-06-12",
      phone: "(737) 555-0891",
      email: "kevin.p@email.com",
      address: "345 Spruce Dr, Bee Cave, TX 78738",
      gender: "Male",
    },
    pmsPatient: {
      id: "pms_210",
      pmsId: "OD-10400",
      firstName: "Kevin",
      lastName: "Patel",
      dob: "1988-06-12",
      phone: "(737) 555-0891",
      email: "kevin.patel@outlook.com",
      address: "345 Spruce Dr, Bee Cave, TX 78738",
      gender: "Male",
    },
    matchScore: 0.93,
    matchFields: ["name", "dob", "phone", "address"],
    status: "pending",
    createdAt: Date.now() - 1800000,
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(iso: string): string {
  try {
    const d = new Date(iso + "T00:00:00")
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

function scoreColor(score: number): string {
  if (score >= 0.9) return "bg-emerald-500"
  if (score >= 0.7) return "bg-amber-500"
  return "bg-red-500"
}

function scoreTextColor(score: number): string {
  if (score >= 0.9) return "text-emerald-700 dark:text-emerald-400"
  if (score >= 0.7) return "text-amber-700 dark:text-amber-400"
  return "text-red-700 dark:text-red-400"
}

function statusBadge(status: MatchStatus) {
  switch (status) {
    case "pending":
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
          Pending
        </Badge>
      )
    case "matched":
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
          Matched
        </Badge>
      )
    case "rejected":
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
          Rejected
        </Badge>
      )
    case "merged":
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
          Merged
        </Badge>
      )
  }
}

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  dob: "DOB",
  phone: "Phone",
  email: "Email",
  address: "Address",
}

// ---------------------------------------------------------------------------
// Comparison Detail
// ---------------------------------------------------------------------------
function ComparisonDetail({ item }: { item: MatchQueueItem }) {
  const fields: {
    label: string
    key: string
    oscar: string | undefined
    pms: string | undefined
  }[] = [
    {
      label: "First Name",
      key: "name",
      oscar: item.oscarPatient.firstName,
      pms: item.pmsPatient.firstName,
    },
    {
      label: "Last Name",
      key: "name",
      oscar: item.oscarPatient.lastName,
      pms: item.pmsPatient.lastName,
    },
    {
      label: "Date of Birth",
      key: "dob",
      oscar: formatDate(item.oscarPatient.dob),
      pms: formatDate(item.pmsPatient.dob),
    },
    {
      label: "Phone",
      key: "phone",
      oscar: item.oscarPatient.phone,
      pms: item.pmsPatient.phone,
    },
    {
      label: "Email",
      key: "email",
      oscar: item.oscarPatient.email,
      pms: item.pmsPatient.email,
    },
    {
      label: "Address",
      key: "address",
      oscar: item.oscarPatient.address,
      pms: item.pmsPatient.address,
    },
    {
      label: "Gender",
      key: "gender",
      oscar: item.oscarPatient.gender,
      pms: item.pmsPatient.gender,
    },
  ]

  return (
    <Card className="mx-4 mb-4 py-4">
      <CardContent className="p-0 px-4">
        <div className="grid grid-cols-[140px_1fr_1fr] gap-y-2 text-sm">
          <div className="font-medium text-muted-foreground pb-2">Field</div>
          <div className="font-medium pb-2">Oscar Patient</div>
          <div className="font-medium pb-2">PMS Patient ({item.pmsPatient.pmsId})</div>
          <Separator className="col-span-3" />
          {fields.map((field, i) => {
            const isDifferent = field.oscar !== field.pms
            return (
              <div key={i} className="contents">
                <div className="py-1.5 text-muted-foreground">{field.label}</div>
                <div
                  className={cn(
                    "py-1.5",
                    isDifferent && "bg-amber-50 dark:bg-amber-950/20 px-2 rounded"
                  )}
                >
                  {field.oscar || "-"}
                </div>
                <div
                  className={cn(
                    "py-1.5",
                    isDifferent && "bg-amber-50 dark:bg-amber-950/20 px-2 rounded"
                  )}
                >
                  {field.pms || "-"}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function PatientMatchQueuePage() {
  const [matches, setMatches] = useState(DEMO_MATCHES)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("all")
  const [search, setSearch] = useState("")

  // Stats
  const stats = useMemo(() => {
    const pending = matches.filter((m) => m.status === "pending").length
    const resolvedToday = matches.filter(
      (m) =>
        m.resolvedAt &&
        new Date(m.resolvedAt).toDateString() === new Date().toDateString()
    ).length
    const autoMatchRate =
      matches.length > 0
        ? Math.round(
            (matches.filter((m) => m.matchScore >= 0.9).length / matches.length) *
              100
          )
        : 0
    return { pending, resolvedToday, autoMatchRate }
  }, [matches])

  // Filter
  const filtered = useMemo(() => {
    let result = matches
    if (activeTab !== "all") {
      result = result.filter((m) => m.status === activeTab)
    }
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (m) =>
          `${m.oscarPatient.firstName} ${m.oscarPatient.lastName}`
            .toLowerCase()
            .includes(q) ||
          `${m.pmsPatient.firstName} ${m.pmsPatient.lastName}`
            .toLowerCase()
            .includes(q) ||
          m.pmsPatient.pmsId.toLowerCase().includes(q)
      )
    }
    return result
  }, [matches, activeTab, search])

  function handleConfirm(id: string) {
    setMatches((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, status: "matched" as MatchStatus, resolvedAt: Date.now() }
          : m
      )
    )
  }

  function handleReject(id: string) {
    setMatches((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, status: "rejected" as MatchStatus, resolvedAt: Date.now() }
          : m
      )
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Patient Match Queue
        </h1>
        <p className="text-sm text-muted-foreground">
          Review and resolve patient identity matches between Oscar and your PMS.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="py-4">
          <CardContent className="flex items-center gap-4 px-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Users className="size-5 text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Total Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex items-center gap-4 px-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle2 className="size-5 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.resolvedToday}</p>
              <p className="text-xs text-muted-foreground">Resolved Today</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex items-center gap-4 px-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Zap className="size-5 text-blue-700 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.autoMatchRate}%</p>
              <p className="text-xs text-muted-foreground">Auto-Match Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by patient name or PMS ID..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tabs + Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            All ({matches.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({matches.filter((m) => m.status === "pending").length})
          </TabsTrigger>
          <TabsTrigger value="matched">
            Matched ({matches.filter((m) => m.status === "matched").length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({matches.filter((m) => m.status === "rejected").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30px]"></TableHead>
                  <TableHead>Oscar Patient</TableHead>
                  <TableHead>PMS Patient</TableHead>
                  <TableHead>Match Score</TableHead>
                  <TableHead>Matched Fields</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-32 text-center text-muted-foreground"
                    >
                      No matches found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => (
                    <MatchRow
                      key={item.id}
                      item={item}
                      expanded={expandedId === item.id}
                      onToggle={() =>
                        setExpandedId(expandedId === item.id ? null : item.id)
                      }
                      onConfirm={() => handleConfirm(item.id)}
                      onReject={() => handleReject(item.id)}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Match Row
// ---------------------------------------------------------------------------
function MatchRow({
  item,
  expanded,
  onToggle,
  onConfirm,
  onReject,
}: {
  item: MatchQueueItem
  expanded: boolean
  onToggle: () => void
  onConfirm: () => void
  onReject: () => void
}) {
  const pct = Math.round(item.matchScore * 100)

  return (
    <>
      <TableRow
        className="cursor-pointer"
        onClick={onToggle}
      >
        <TableCell>
          {expanded ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
        </TableCell>
        <TableCell>
          <div>
            <p className="font-medium">
              {item.oscarPatient.firstName} {item.oscarPatient.lastName}
            </p>
            <p className="text-xs text-muted-foreground">
              DOB: {formatDate(item.oscarPatient.dob)}
            </p>
          </div>
        </TableCell>
        <TableCell>
          <div>
            <p className="font-medium">
              {item.pmsPatient.firstName} {item.pmsPatient.lastName}
            </p>
            <p className="text-xs text-muted-foreground">
              DOB: {formatDate(item.pmsPatient.dob)} | {item.pmsPatient.pmsId}
            </p>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2 min-w-[120px]">
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", scoreColor(item.matchScore))}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={cn("text-xs font-medium tabular-nums", scoreTextColor(item.matchScore))}>
              {pct}%
            </span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex flex-wrap gap-1">
            {item.matchFields.map((field) => (
              <Badge key={field} variant="secondary" className="text-xs">
                {FIELD_LABELS[field] || field}
              </Badge>
            ))}
          </div>
        </TableCell>
        <TableCell>{statusBadge(item.status)}</TableCell>
        <TableCell className="text-right">
          {item.status === "pending" && (
            <div className="flex items-center justify-end gap-1">
              <Button
                size="xs"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={(e) => {
                  e.stopPropagation()
                  onConfirm()
                }}
              >
                <Check className="size-3" />
                Confirm
              </Button>
              <Button
                size="xs"
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  onReject()
                }}
              >
                <X className="size-3" />
                Reject
              </Button>
            </div>
          )}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={7} className="p-0 bg-muted/30">
            <ComparisonDetail item={item} />
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
