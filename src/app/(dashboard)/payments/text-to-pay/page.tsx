"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../../convex/_generated/api"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  DollarSign,
  Send,
  Clock,
  TrendingUp,
  MoreHorizontal,
  MessageSquare,
  RefreshCw,
  XCircle,
  Phone,
  Search,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PaymentLinkStatus = "pending" | "sent" | "paid" | "expired" | "failed"

interface MockPatient {
  id: string
  name: string
  phone: string
}

interface MockPaymentLink {
  id: string
  dateSent: number
  patient: string
  amount: number
  phone: string
  status: PaymentLinkStatus
  paidDate?: number
  description: string
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_PATIENTS: MockPatient[] = [
  { id: "p1", name: "James Mitchell", phone: "(512) 555-0134" },
  { id: "p2", name: "Maria Garcia", phone: "(512) 555-0217" },
  { id: "p3", name: "Robert Chen", phone: "(512) 555-0389" },
  { id: "p4", name: "Linda Nguyen", phone: "(512) 555-0456" },
  { id: "p5", name: "David Thompson", phone: "(512) 555-0523" },
  { id: "p6", name: "Sarah Williams", phone: "(512) 555-0698" },
  { id: "p7", name: "Michael Brown", phone: "(512) 555-0742" },
  { id: "p8", name: "Jennifer Davis", phone: "(512) 555-0815" },
  { id: "p9", name: "Christopher Lee", phone: "(512) 555-0901" },
  { id: "p10", name: "Amanda Martinez", phone: "(512) 555-0167" },
  { id: "p11", name: "Kevin Robinson", phone: "(512) 555-0234" },
  { id: "p12", name: "Patricia Anderson", phone: "(512) 555-0378" },
]

const now = Date.now()
const DAY = 86400000

const MOCK_PAYMENT_LINKS: MockPaymentLink[] = [
  {
    id: "tpay_1",
    dateSent: now - DAY * 0.1,
    patient: "James Mitchell",
    amount: 450.0,
    phone: "(512) 555-0134",
    status: "sent",
    description: "Crown copay - tooth #14",
  },
  {
    id: "tpay_2",
    dateSent: now - DAY * 0.5,
    patient: "Maria Garcia",
    amount: 125.0,
    phone: "(512) 555-0217",
    status: "paid",
    paidDate: now - DAY * 0.3,
    description: "Cleaning & exam copay",
  },
  {
    id: "tpay_3",
    dateSent: now - DAY * 1,
    patient: "Robert Chen",
    amount: 1850.0,
    phone: "(512) 555-0389",
    status: "pending",
    description: "Implant deposit",
  },
  {
    id: "tpay_4",
    dateSent: now - DAY * 1.5,
    patient: "Linda Nguyen",
    amount: 275.0,
    phone: "(512) 555-0456",
    status: "paid",
    paidDate: now - DAY * 1.2,
    description: "Root canal copay",
  },
  {
    id: "tpay_5",
    dateSent: now - DAY * 2,
    patient: "David Thompson",
    amount: 89.0,
    phone: "(512) 555-0523",
    status: "expired",
    description: "Fluoride treatment",
  },
  {
    id: "tpay_6",
    dateSent: now - DAY * 2.5,
    patient: "Sarah Williams",
    amount: 650.0,
    phone: "(512) 555-0698",
    status: "paid",
    paidDate: now - DAY * 2.1,
    description: "Extraction + bone graft copay",
  },
  {
    id: "tpay_7",
    dateSent: now - DAY * 3,
    patient: "Michael Brown",
    amount: 200.0,
    phone: "(512) 555-0742",
    status: "failed",
    description: "Past-due balance",
  },
  {
    id: "tpay_8",
    dateSent: now - DAY * 3.5,
    patient: "Jennifer Davis",
    amount: 1200.0,
    phone: "(512) 555-0815",
    status: "paid",
    paidDate: now - DAY * 3.0,
    description: "Invisalign monthly payment",
  },
  {
    id: "tpay_9",
    dateSent: now - DAY * 4,
    patient: "Christopher Lee",
    amount: 375.0,
    phone: "(512) 555-0901",
    status: "sent",
    description: "Veneer consultation deposit",
  },
  {
    id: "tpay_10",
    dateSent: now - DAY * 5,
    patient: "Amanda Martinez",
    amount: 50.0,
    phone: "(512) 555-0167",
    status: "paid",
    paidDate: now - DAY * 4.5,
    description: "X-ray copay",
  },
  {
    id: "tpay_11",
    dateSent: now - DAY * 6,
    patient: "Kevin Robinson",
    amount: 2000.0,
    phone: "(512) 555-0234",
    status: "pending",
    description: "All-on-4 deposit",
  },
  {
    id: "tpay_12",
    dateSent: now - DAY * 7,
    patient: "Patricia Anderson",
    amount: 165.0,
    phone: "(512) 555-0378",
    status: "paid",
    paidDate: now - DAY * 6.5,
    description: "Night guard copay",
  },
  {
    id: "tpay_13",
    dateSent: now - DAY * 8,
    patient: "James Mitchell",
    amount: 320.0,
    phone: "(512) 555-0134",
    status: "expired",
    description: "Previous balance - filling",
  },
  {
    id: "tpay_14",
    dateSent: now - DAY * 9,
    patient: "Maria Garcia",
    amount: 95.0,
    phone: "(512) 555-0217",
    status: "paid",
    paidDate: now - DAY * 8.5,
    description: "Sealants copay",
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value)
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function statusBadge(status: PaymentLinkStatus) {
  const map: Record<
    PaymentLinkStatus,
    { label: string; className: string }
  > = {
    pending: {
      label: "Pending",
      className:
        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    },
    sent: {
      label: "Sent",
      className:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    },
    paid: {
      label: "Paid",
      className:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    expired: {
      label: "Expired",
      className:
        "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    },
    failed: {
      label: "Failed",
      className:
        "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    },
  }
  const s = map[status]
  return (
    <Badge variant="secondary" className={s.className}>
      {s.label}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TextToPayPage() {
  // Form state
  const [patientSearch, setPatientSearch] = useState("")
  const [selectedPatient, setSelectedPatient] = useState<MockPatient | null>(
    null
  )
  const [showPatientDropdown, setShowPatientDropdown] = useState(false)
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [phoneOverride, setPhoneOverride] = useState("")

  // Table filter
  const [tableSearch, setTableSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // Dialog state
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sendingLink, setSendingLink] = useState(false)

  // Convex with fallback
  let paymentLinks: MockPaymentLink[] | undefined
  let convexError = false
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const result = useQuery(api.textToPay.queries.list, {})
    // Query returns { paymentLinks: [...], totalCount } — extract the array
    paymentLinks = result ? (result as any).paymentLinks ?? result : undefined
  } catch {
    convexError = true
    paymentLinks = MOCK_PAYMENT_LINKS
  }

  let sendPaymentLink: ((args: any) => Promise<any>) | null = null
  let resendPaymentLink: ((args: any) => Promise<any>) | null = null
  let cancelPaymentLink: ((args: any) => Promise<any>) | null = null
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    sendPaymentLink = useMutation(api.textToPay.mutations.createPaymentLink)
    // eslint-disable-next-line react-hooks/rules-of-hooks
    resendPaymentLink = useMutation(api.textToPay.mutations.sendViaSms)
    // eslint-disable-next-line react-hooks/rules-of-hooks
    cancelPaymentLink = useMutation(api.textToPay.mutations.expire)
  } catch {
    // Mutations unavailable when Convex is not connected
  }

  const data = paymentLinks ?? MOCK_PAYMENT_LINKS

  // Stats
  const stats = useMemo(() => {
    const totalSent = data.length
    const pending = data
      .filter((l) => l.status === "pending" || l.status === "sent")
      .reduce((sum, l) => sum + l.amount, 0)
    const paid = data
      .filter((l) => l.status === "paid")
      .reduce((sum, l) => sum + l.amount, 0)
    const paidCount = data.filter((l) => l.status === "paid").length
    const conversionRate =
      totalSent > 0 ? Math.round((paidCount / totalSent) * 100) : 0
    return { totalSent, pending, paid, conversionRate }
  }, [data])

  // Filtered table data
  const filteredLinks = useMemo(() => {
    return data.filter((link) => {
      const matchesSearch =
        tableSearch === "" ||
        link.patient.toLowerCase().includes(tableSearch.toLowerCase()) ||
        link.phone.includes(tableSearch) ||
        link.description.toLowerCase().includes(tableSearch.toLowerCase())
      const matchesStatus =
        statusFilter === "all" || link.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [data, tableSearch, statusFilter])

  // Patient autocomplete
  const filteredPatients = useMemo(() => {
    if (!patientSearch || selectedPatient) return []
    return MOCK_PATIENTS.filter((p) =>
      p.name.toLowerCase().includes(patientSearch.toLowerCase())
    ).slice(0, 5)
  }, [patientSearch, selectedPatient])

  function handleSelectPatient(patient: MockPatient) {
    setSelectedPatient(patient)
    setPatientSearch(patient.name)
    setPhoneOverride(patient.phone)
    setShowPatientDropdown(false)
  }

  function handleClearPatient() {
    setSelectedPatient(null)
    setPatientSearch("")
    setPhoneOverride("")
  }

  const phone = phoneOverride || selectedPatient?.phone || ""
  const parsedAmount = parseFloat(amount)
  const canSend =
    selectedPatient && !isNaN(parsedAmount) && parsedAmount > 0 && phone

  async function handleSend() {
    setSendingLink(true)
    try {
      if (sendPaymentLink) {
        await sendPaymentLink({
          patientId: selectedPatient?.id,
          amount: parsedAmount,
          description,
          dueDate: dueDate || undefined,
          phone,
        })
      }
      // Reset form
      handleClearPatient()
      setAmount("")
      setDescription("")
      setDueDate("")
      setConfirmOpen(false)
    } catch (err) {
      console.error("Failed to send payment link:", err)
    } finally {
      setSendingLink(false)
    }
  }

  async function handleResend(linkId: string) {
    if (!resendPaymentLink) return
    try {
      await resendPaymentLink({ linkId })
    } catch (err) {
      console.error("Failed to resend payment link:", err)
    }
  }

  async function handleCancel(linkId: string) {
    if (!cancelPaymentLink) return
    try {
      await cancelPaymentLink({ linkId })
    } catch (err) {
      console.error("Failed to cancel payment link:", err)
    }
  }

  // SMS preview text
  const smsPreview =
    selectedPatient && parsedAmount > 0
      ? `Hi ${selectedPatient.name.split(" ")[0]}, Canopy Dental has sent you a payment request for ${formatCurrency(parsedAmount)}${description ? ` (${description})` : ""}. Pay securely here: https://pay.canopydental.com/xxxxxx${dueDate ? ` Due by ${new Date(dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}. Reply STOP to opt out.`
      : null

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Text-to-Pay</h1>
        <p className="text-muted-foreground">
          Send SMS payment links via Twilio with Stripe checkout. Track delivery,
          payment completion, and PMS ledger reconciliation.
        </p>
      </div>

      {convexError && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Convex backend is not connected. Displaying mock data for preview.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Send className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSent}</div>
            <p className="text-xs text-muted-foreground">Payment links sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.pending)}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting payment
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collected</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.paid)}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully paid
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Conversion Rate
            </CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Links paid / total sent
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Send Payment Link Form */}
      <Card>
        <CardHeader>
          <CardTitle>Send Payment Link</CardTitle>
          <CardDescription>
            Create and send an SMS payment link to a patient. They will receive a
            secure Stripe checkout link via text message.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Form Fields */}
            <div className="space-y-4">
              {/* Patient Search */}
              <div className="space-y-2">
                <Label htmlFor="patient-search">Patient</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="patient-search"
                    placeholder="Search patient by name..."
                    className="pl-9"
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value)
                      if (selectedPatient) {
                        setSelectedPatient(null)
                        setPhoneOverride("")
                      }
                      setShowPatientDropdown(true)
                    }}
                    onFocus={() => setShowPatientDropdown(true)}
                    onBlur={() => {
                      // Delay to allow click on dropdown item
                      setTimeout(() => setShowPatientDropdown(false), 200)
                    }}
                  />
                  {showPatientDropdown && filteredPatients.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
                      {filteredPatients.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent"
                          onMouseDown={() => handleSelectPatient(p)}
                        >
                          <span className="font-medium">{p.name}</span>
                          <span className="text-muted-foreground">
                            {p.phone}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedPatient && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {selectedPatient.name}{" "}
                    <button
                      type="button"
                      className="text-primary underline"
                      onClick={handleClearPatient}
                    >
                      clear
                    </button>
                  </p>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-9"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="e.g., Crown copay - tooth #14"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <Label htmlFor="due-date">
                  Due Date{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="(555) 555-0100"
                    className="pl-9"
                    value={phone}
                    onChange={(e) => setPhoneOverride(e.target.value)}
                  />
                </div>
                {selectedPatient && (
                  <p className="text-xs text-muted-foreground">
                    Pre-filled from patient record
                  </p>
                )}
              </div>

              {/* Send Button */}
              <Button
                className="w-full sm:w-auto"
                disabled={!canSend}
                onClick={() => setConfirmOpen(true)}
              >
                <Send className="mr-2 size-4" />
                Send Payment Link
              </Button>
            </div>

            {/* Right: SMS Preview */}
            <div className="space-y-2">
              <Label>SMS Preview</Label>
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  {smsPreview ? (
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <p className="text-sm leading-relaxed">{smsPreview}</p>
                      </div>
                      <Separator />
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          {smsPreview.length} characters
                          {smsPreview.length > 160 && (
                            <span className="ml-1 text-amber-600">
                              ({Math.ceil(smsPreview.length / 153)} SMS
                              segments)
                            </span>
                          )}
                        </span>
                        <span>Via Twilio</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                      <MessageSquare className="mb-2 size-8 opacity-40" />
                      <p className="text-sm">
                        Select a patient and enter an amount to preview the SMS
                        message.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirm Send Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment Link</DialogTitle>
            <DialogDescription>
              You are about to send a payment link to{" "}
              {selectedPatient?.name} at {phone}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Patient</span>
              <span className="font-medium">{selectedPatient?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium">
                {!isNaN(parsedAmount) ? formatCurrency(parsedAmount) : "--"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span className="font-medium">{phone}</span>
            </div>
            {description && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Description</span>
                <span className="font-medium">{description}</span>
              </div>
            )}
            {dueDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due Date</span>
                <span className="font-medium">
                  {new Date(dueDate + "T00:00:00").toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sendingLink}>
              {sendingLink ? (
                <>
                  <div className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 size-4" />
                  Send Link
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recent Sends Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payment Links</CardTitle>
          <CardDescription>
            {filteredLinks.length} payment link
            {filteredLinks.length !== 1 && "s"} sent
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Table Filters */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by patient, phone, or description..."
                className="pl-9"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {(
                [
                  { value: "all", label: "All" },
                  { value: "pending", label: "Pending" },
                  { value: "sent", label: "Sent" },
                  { value: "paid", label: "Paid" },
                  { value: "expired", label: "Expired" },
                  { value: "failed", label: "Failed" },
                ] as const
              ).map((opt) => (
                <Button
                  key={opt.value}
                  variant={statusFilter === opt.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date Sent</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Paid Date</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!paymentLinks && !convexError ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Loading payment links...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredLinks.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No payment links found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLinks.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(link.dateSent)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {link.patient}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(link.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {link.phone}
                      </TableCell>
                      <TableCell>{statusBadge(link.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {link.paidDate ? formatDate(link.paidDate) : "--"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="size-8 p-0">
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              disabled={
                                link.status === "paid" ||
                                link.status === "expired"
                              }
                              onClick={() => handleResend(link.id)}
                            >
                              <RefreshCw className="mr-2 size-4" />
                              Resend
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={
                                link.status === "paid" ||
                                link.status === "expired" ||
                                link.status === "failed"
                              }
                              onClick={() => handleCancel(link.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <XCircle className="mr-2 size-4" />
                              Cancel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
