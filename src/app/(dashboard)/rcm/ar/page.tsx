"use client"

import { useState, useMemo } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import type { Id } from "../../../../../convex/_generated/dataModel"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  DollarSign,
  Clock,
  TrendingUp,
  AlertTriangle,
  Phone,
  FileText,
  StickyNote,
  ChevronDown,
  ChevronRight,
  CalendarIcon,
  Search,
  Filter,
  Building2,
  Users,
  ShieldAlert,
  ArrowUpDown,
  Send,
  XCircle,
} from "lucide-react"

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_AGING = {
  insuranceAging: [
    { bucket: "0-30", count: 45, totalAmount: 28500 },
    { bucket: "31-60", count: 22, totalAmount: 18200 },
    { bucket: "61-90", count: 12, totalAmount: 14500 },
    { bucket: "91-120", count: 8, totalAmount: 9800 },
    { bucket: "120+", count: 5, totalAmount: 7200 },
  ],
  patientAging: [
    { bucket: "0-30", count: 30, totalAmount: 8500 },
    { bucket: "31-60", count: 15, totalAmount: 5200 },
    { bucket: "61-90", count: 8, totalAmount: 3800 },
    { bucket: "91-120", count: 4, totalAmount: 2100 },
    { bucket: "120+", count: 3, totalAmount: 1800 },
  ],
  totals: {
    insurance: 78200,
    patient: 21400,
    total: 99600,
  },
}

type AgingClaim = {
  _id: Id<"claims">
  patientName: string
  payerName: string
  claimNumber: string
  amount: number
  ageDays: number
  bucket: string
  type: "insurance" | "patient"
  status: string
  lastAction: string
  dateSubmitted: string
}

const MOCK_AGING_CLAIMS: AgingClaim[] = [
  {
    _id: "ac_1" as Id<"claims">,
    patientName: "Wilson, James",
    payerName: "Delta Dental",
    claimNumber: "CLM-2024-0891",
    amount: 1250.0,
    ageDays: 12,
    bucket: "0-30",
    type: "insurance",
    status: "submitted",
    lastAction: "Submitted electronically",
    dateSubmitted: "2026-01-24",
  },
  {
    _id: "ac_2" as Id<"claims">,
    patientName: "Park, Emily",
    payerName: "Cigna",
    claimNumber: "CLM-2024-0876",
    amount: 875.0,
    ageDays: 8,
    bucket: "0-30",
    type: "insurance",
    status: "submitted",
    lastAction: "Submitted electronically",
    dateSubmitted: "2026-01-28",
  },
  {
    _id: "ac_11" as Id<"claims">,
    patientName: "Rivera, Carlos",
    payerName: "MetLife",
    claimNumber: "CLM-2024-0888",
    amount: 560.0,
    ageDays: 18,
    bucket: "0-30",
    type: "insurance",
    status: "submitted",
    lastAction: "Submitted electronically",
    dateSubmitted: "2026-01-18",
  },
  {
    _id: "ac_3" as Id<"claims">,
    patientName: "Chen, David",
    payerName: "MetLife",
    claimNumber: "CLM-2024-0854",
    amount: 2100.0,
    ageDays: 35,
    bucket: "31-60",
    type: "insurance",
    status: "pending",
    lastAction: "Payer acknowledged receipt",
    dateSubmitted: "2026-01-01",
  },
  {
    _id: "ac_4" as Id<"claims">,
    patientName: "Thompson, Sarah",
    payerName: "Aetna",
    claimNumber: "CLM-2024-0812",
    amount: 3200.0,
    ageDays: 48,
    bucket: "31-60",
    type: "insurance",
    status: "in_review",
    lastAction: "Called payer — under review",
    dateSubmitted: "2025-12-19",
  },
  {
    _id: "ac_5" as Id<"claims">,
    patientName: "Garcia, Maria",
    payerName: "Guardian",
    claimNumber: "CLM-2024-0788",
    amount: 4500.0,
    ageDays: 67,
    bucket: "61-90",
    type: "insurance",
    status: "pending",
    lastAction: "Follow-up call scheduled",
    dateSubmitted: "2025-11-30",
  },
  {
    _id: "ac_12" as Id<"claims">,
    patientName: "Kim, Jennifer",
    payerName: "United Healthcare",
    claimNumber: "CLM-2024-0775",
    amount: 1950.0,
    ageDays: 74,
    bucket: "61-90",
    type: "insurance",
    status: "pending",
    lastAction: "Additional docs requested",
    dateSubmitted: "2025-11-23",
  },
  {
    _id: "ac_6" as Id<"claims">,
    patientName: "Johnson, Robert",
    payerName: "Delta Dental",
    claimNumber: "CLM-2024-0745",
    amount: 1850.0,
    ageDays: 95,
    bucket: "91-120",
    type: "insurance",
    status: "escalated",
    lastAction: "Escalated to supervisor",
    dateSubmitted: "2025-11-02",
  },
  {
    _id: "ac_13" as Id<"claims">,
    patientName: "Anderson, William",
    payerName: "Aetna",
    claimNumber: "CLM-2024-0732",
    amount: 2280.0,
    ageDays: 108,
    bucket: "91-120",
    type: "insurance",
    status: "escalated",
    lastAction: "Appeal letter sent",
    dateSubmitted: "2025-10-20",
  },
  {
    _id: "ac_7" as Id<"claims">,
    patientName: "Lee, Susan",
    payerName: "Cigna",
    claimNumber: "CLM-2024-0698",
    amount: 2800.0,
    ageDays: 132,
    bucket: "120+",
    type: "insurance",
    status: "escalated",
    lastAction: "Second appeal filed",
    dateSubmitted: "2025-09-26",
  },
  {
    _id: "ac_8" as Id<"claims">,
    patientName: "Brown, Michael",
    payerName: "Self-Pay",
    claimNumber: "PAT-2024-0155",
    amount: 450.0,
    ageDays: 22,
    bucket: "0-30",
    type: "patient",
    status: "billed",
    lastAction: "Statement mailed",
    dateSubmitted: "2026-01-14",
  },
  {
    _id: "ac_9" as Id<"claims">,
    patientName: "Martinez, Ana",
    payerName: "Self-Pay",
    claimNumber: "PAT-2024-0142",
    amount: 1200.0,
    ageDays: 55,
    bucket: "31-60",
    type: "patient",
    status: "billed",
    lastAction: "Second statement sent",
    dateSubmitted: "2025-12-12",
  },
  {
    _id: "ac_10" as Id<"claims">,
    patientName: "Davis, Patricia",
    payerName: "Self-Pay",
    claimNumber: "PAT-2024-0128",
    amount: 780.0,
    ageDays: 78,
    bucket: "61-90",
    type: "patient",
    status: "collections",
    lastAction: "Collections notice sent",
    dateSubmitted: "2025-11-19",
  },
  {
    _id: "ac_14" as Id<"claims">,
    patientName: "Taylor, Jessica",
    payerName: "Self-Pay",
    claimNumber: "PAT-2024-0118",
    amount: 340.0,
    ageDays: 98,
    bucket: "91-120",
    type: "patient",
    status: "collections",
    lastAction: "Payment plan offered",
    dateSubmitted: "2025-10-30",
  },
  {
    _id: "ac_15" as Id<"claims">,
    patientName: "Moore, Richard",
    payerName: "Self-Pay",
    claimNumber: "PAT-2024-0098",
    amount: 920.0,
    ageDays: 145,
    bucket: "120+",
    type: "patient",
    status: "collections",
    lastAction: "Final notice — pending write-off review",
    dateSubmitted: "2025-09-13",
  },
]

type WorklistItem = {
  claimId: Id<"claims">
  patientName: string
  payerName: string
  claimNumber: string
  amount: number
  ageDays: number
  score: number
  collectionProbability: number
  rationale: string
}

const MOCK_WORKLIST: WorklistItem[] = [
  {
    claimId: "wl_1" as Id<"claims">,
    patientName: "Wilson, James",
    payerName: "Delta Dental",
    claimNumber: "CLM-2024-0891",
    amount: 2450.0,
    ageDays: 95,
    score: 92,
    collectionProbability: 78,
    rationale:
      "Critical age (95 days) - timely filing risk; High value ($2,450); Payer Delta Dental high denial rate (18%)",
  },
  {
    claimId: "wl_2" as Id<"claims">,
    patientName: "Park, Emily",
    payerName: "Cigna",
    claimNumber: "CLM-2024-0876",
    amount: 1875.0,
    ageDays: 72,
    score: 85,
    collectionProbability: 82,
    rationale:
      "High age (72 days) - approaching deadline; High value ($1,875); Previous denial on file",
  },
  {
    claimId: "wl_3" as Id<"claims">,
    patientName: "Chen, David",
    payerName: "MetLife",
    claimNumber: "CLM-2024-0854",
    amount: 3200.0,
    ageDays: 62,
    score: 81,
    collectionProbability: 85,
    rationale:
      "Very high value ($3,200); Age 62 days - past first follow-up window; MetLife requires specific documentation",
  },
  {
    claimId: "wl_4" as Id<"claims">,
    patientName: "Thompson, Sarah",
    payerName: "Aetna",
    claimNumber: "CLM-2024-0812",
    amount: 1425.0,
    ageDays: 88,
    score: 78,
    collectionProbability: 65,
    rationale:
      "Near timely filing deadline (88 days); Aetna 90-day filing limit; Moderate value ($1,425)",
  },
  {
    claimId: "wl_5" as Id<"claims">,
    patientName: "Garcia, Maria",
    payerName: "Guardian",
    claimNumber: "CLM-2024-0788",
    amount: 980.0,
    ageDays: 105,
    score: 74,
    collectionProbability: 52,
    rationale:
      "Past 90-day window (105 days); Appeal may be required; Guardian slow processing history",
  },
  {
    claimId: "wl_6" as Id<"claims">,
    patientName: "Johnson, Robert",
    payerName: "Delta Dental",
    claimNumber: "CLM-2024-0745",
    amount: 750.0,
    ageDays: 45,
    score: 62,
    collectionProbability: 88,
    rationale:
      "Moderate age (45 days); Delta Dental high denial rate (18%); Standard follow-up recommended",
  },
  {
    claimId: "wl_7" as Id<"claims">,
    patientName: "Lee, Susan",
    payerName: "United Healthcare",
    claimNumber: "CLM-2024-0698",
    amount: 1650.0,
    ageDays: 38,
    score: 58,
    collectionProbability: 91,
    rationale:
      "High value ($1,650); Age 38 days - approaching second billing cycle; UHC requires pre-auth verification",
  },
  {
    claimId: "wl_8" as Id<"claims">,
    patientName: "Brown, Michael",
    payerName: "Cigna",
    claimNumber: "CLM-2024-0854B",
    amount: 520.0,
    ageDays: 52,
    score: 45,
    collectionProbability: 75,
    rationale:
      "Moderate age (52 days); Lower value ($520); Standard follow-up protocol",
  },
  {
    claimId: "wl_9" as Id<"claims">,
    patientName: "Anderson, William",
    payerName: "Aetna",
    claimNumber: "CLM-2024-0732",
    amount: 2280.0,
    ageDays: 108,
    score: 71,
    collectionProbability: 42,
    rationale:
      "Past filing window (108 days); High value ($2,280); Appeal letter sent — awaiting payer response",
  },
  {
    claimId: "wl_10" as Id<"claims">,
    patientName: "Kim, Jennifer",
    payerName: "United Healthcare",
    claimNumber: "CLM-2024-0775",
    amount: 1950.0,
    ageDays: 74,
    score: 68,
    collectionProbability: 72,
    rationale:
      "Additional documentation requested by payer; High value ($1,950); UHC typically pays after resubmission",
  },
  {
    claimId: "wl_11" as Id<"claims">,
    patientName: "Rivera, Carlos",
    payerName: "MetLife",
    claimNumber: "CLM-2024-0888",
    amount: 560.0,
    ageDays: 18,
    score: 35,
    collectionProbability: 95,
    rationale:
      "Recently submitted (18 days); Lower value ($560); Within normal MetLife processing window",
  },
  {
    claimId: "wl_12" as Id<"claims">,
    patientName: "Martinez, Ana",
    payerName: "Aetna",
    claimNumber: "CLM-2024-0801",
    amount: 380.0,
    ageDays: 28,
    score: 32,
    collectionProbability: 92,
    rationale:
      "Within normal processing window (28 days); Low value ($380); First follow-up not yet due",
  },
  {
    claimId: "wl_13" as Id<"claims">,
    patientName: "Taylor, Jessica",
    payerName: "Guardian",
    claimNumber: "CLM-2024-0820",
    amount: 1120.0,
    ageDays: 58,
    score: 55,
    collectionProbability: 70,
    rationale:
      "Moderate age (58 days); Guardian slow processing (avg 52 days); Follow-up call recommended",
  },
  {
    claimId: "wl_14" as Id<"claims">,
    patientName: "Moore, Richard",
    payerName: "Delta Dental",
    claimNumber: "CLM-2024-0842",
    amount: 890.0,
    ageDays: 42,
    score: 48,
    collectionProbability: 84,
    rationale:
      "Approaching 45-day mark; Delta Dental high denial rate; Standard follow-up window",
  },
  {
    claimId: "wl_15" as Id<"claims">,
    patientName: "Davis, Patricia",
    payerName: "MetLife",
    claimNumber: "CLM-2024-0860",
    amount: 290.0,
    ageDays: 15,
    score: 18,
    collectionProbability: 97,
    rationale:
      "Recently submitted (15 days); Low value ($290); Within standard MetLife processing time",
  },
]

type PayerData = {
  payerId: string
  payerName: string
  totalClaims: number
  paidClaims: number
  deniedClaims: number
  pendingClaims: number
  avgDaysToPay: number
  denialRate: number
  appealSuccessRate: number
  totalCharged: number
  totalPaid: number
  totalOutstanding: number
  flags: string[]
}

const MOCK_PAYERS: PayerData[] = [
  {
    payerId: "p1",
    payerName: "Delta Dental",
    totalClaims: 145,
    paidClaims: 120,
    deniedClaims: 18,
    pendingClaims: 7,
    avgDaysToPay: 32,
    denialRate: 12.4,
    appealSuccessRate: 72,
    totalCharged: 185000,
    totalPaid: 142000,
    totalOutstanding: 43000,
    flags: ["high_denial"],
  },
  {
    payerId: "p2",
    payerName: "Cigna Dental",
    totalClaims: 98,
    paidClaims: 88,
    deniedClaims: 5,
    pendingClaims: 5,
    avgDaysToPay: 48,
    denialRate: 5.1,
    appealSuccessRate: 80,
    totalCharged: 125000,
    totalPaid: 108000,
    totalOutstanding: 17000,
    flags: ["slow"],
  },
  {
    payerId: "p3",
    payerName: "MetLife",
    totalClaims: 112,
    paidClaims: 102,
    deniedClaims: 6,
    pendingClaims: 4,
    avgDaysToPay: 25,
    denialRate: 5.4,
    appealSuccessRate: 68,
    totalCharged: 148000,
    totalPaid: 132000,
    totalOutstanding: 16000,
    flags: [],
  },
  {
    payerId: "p4",
    payerName: "Aetna",
    totalClaims: 76,
    paidClaims: 65,
    deniedClaims: 8,
    pendingClaims: 3,
    avgDaysToPay: 38,
    denialRate: 10.5,
    appealSuccessRate: 62,
    totalCharged: 98000,
    totalPaid: 78000,
    totalOutstanding: 20000,
    flags: ["high_denial"],
  },
  {
    payerId: "p5",
    payerName: "Guardian",
    totalClaims: 54,
    paidClaims: 48,
    deniedClaims: 3,
    pendingClaims: 3,
    avgDaysToPay: 52,
    denialRate: 5.6,
    appealSuccessRate: 75,
    totalCharged: 72000,
    totalPaid: 61000,
    totalOutstanding: 11000,
    flags: ["slow"],
  },
  {
    payerId: "p6",
    payerName: "United Healthcare",
    totalClaims: 88,
    paidClaims: 80,
    deniedClaims: 4,
    pendingClaims: 4,
    avgDaysToPay: 29,
    denialRate: 4.5,
    appealSuccessRate: 85,
    totalCharged: 115000,
    totalPaid: 102000,
    totalOutstanding: 13000,
    flags: [],
  },
]

// Payer-to-claims mapping for expanded payer view
const MOCK_PAYER_CLAIMS: Record<string, { claimNumber: string; patientName: string; amount: number; ageDays: number; status: string }[]> = {
  p1: [
    { claimNumber: "CLM-2024-0891", patientName: "Wilson, James", amount: 2450, ageDays: 95, status: "escalated" },
    { claimNumber: "CLM-2024-0745", patientName: "Johnson, Robert", amount: 1850, ageDays: 95, status: "escalated" },
    { claimNumber: "CLM-2024-0842", patientName: "Moore, Richard", amount: 890, ageDays: 42, status: "pending" },
  ],
  p2: [
    { claimNumber: "CLM-2024-0876", patientName: "Park, Emily", amount: 1875, ageDays: 72, status: "pending" },
    { claimNumber: "CLM-2024-0698", patientName: "Lee, Susan", amount: 2800, ageDays: 132, status: "escalated" },
  ],
  p3: [
    { claimNumber: "CLM-2024-0854", patientName: "Chen, David", amount: 2100, ageDays: 35, status: "pending" },
    { claimNumber: "CLM-2024-0888", patientName: "Rivera, Carlos", amount: 560, ageDays: 18, status: "submitted" },
    { claimNumber: "CLM-2024-0860", patientName: "Davis, Patricia", amount: 290, ageDays: 15, status: "submitted" },
  ],
  p4: [
    { claimNumber: "CLM-2024-0812", patientName: "Thompson, Sarah", amount: 3200, ageDays: 48, status: "in_review" },
    { claimNumber: "CLM-2024-0732", patientName: "Anderson, William", amount: 2280, ageDays: 108, status: "escalated" },
  ],
  p5: [
    { claimNumber: "CLM-2024-0788", patientName: "Garcia, Maria", amount: 4500, ageDays: 67, status: "pending" },
    { claimNumber: "CLM-2024-0820", patientName: "Taylor, Jessica", amount: 1120, ageDays: 58, status: "pending" },
  ],
  p6: [
    { claimNumber: "CLM-2024-0775", patientName: "Kim, Jennifer", amount: 1950, ageDays: 74, status: "pending" },
    { claimNumber: "CLM-2024-0698B", patientName: "Lee, Susan", amount: 1650, ageDays: 38, status: "submitted" },
  ],
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatCurrencyFull(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

function bucketColor(bucket: string): string {
  switch (bucket) {
    case "0-30":
      return "bg-emerald-500"
    case "31-60":
      return "bg-yellow-500"
    case "61-90":
      return "bg-orange-500"
    case "91-120":
      return "bg-red-500"
    case "120+":
      return "bg-red-800"
    default:
      return "bg-gray-400"
  }
}

function bucketTextColor(bucket: string): string {
  switch (bucket) {
    case "0-30":
      return "text-emerald-700 dark:text-emerald-400"
    case "31-60":
      return "text-yellow-700 dark:text-yellow-400"
    case "61-90":
      return "text-orange-700 dark:text-orange-400"
    case "91-120":
      return "text-red-700 dark:text-red-400"
    case "120+":
      return "text-red-900 dark:text-red-300"
    default:
      return "text-gray-700 dark:text-gray-400"
  }
}

function statusBadge(status: string): { variant: "default" | "secondary" | "outline" | "destructive"; className: string; label: string } {
  switch (status) {
    case "submitted":
      return { variant: "outline", className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800", label: "Submitted" }
    case "pending":
      return { variant: "outline", className: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-300 dark:border-yellow-800", label: "Pending" }
    case "in_review":
      return { variant: "outline", className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800", label: "In Review" }
    case "escalated":
      return { variant: "outline", className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800", label: "Escalated" }
    case "billed":
      return { variant: "outline", className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800", label: "Billed" }
    case "collections":
      return { variant: "outline", className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800", label: "Collections" }
    default:
      return { variant: "outline", className: "", label: status }
  }
}

function scoreBadge(score: number): { className: string; label: string } {
  if (score >= 80)
    return {
      className:
        "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
      label: "Urgent",
    }
  if (score >= 60)
    return {
      className:
        "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
      label: "High",
    }
  if (score >= 40)
    return {
      className:
        "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
      label: "Medium",
    }
  return {
    className:
      "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
    label: "Low",
  }
}

function probabilityBarColor(prob: number): string {
  if (prob >= 80) return "bg-emerald-500"
  if (prob >= 60) return "bg-yellow-500"
  if (prob >= 40) return "bg-orange-500"
  return "bg-red-500"
}

function payerStatusBadge(payer: PayerData): { className: string; label: string } {
  if (payer.denialRate >= 10) {
    return {
      className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
      label: "High Denial",
    }
  }
  if (payer.avgDaysToPay >= 45) {
    return {
      className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
      label: "Slow Payer",
    }
  }
  return {
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
    label: "Normal",
  }
}

function formatDateStr(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ArPage() {
  const [activeTab, setActiveTab] = useState("aging")
  const [convexError, setConvexError] = useState(false)

  // Aging state
  const [expandedBuckets, setExpandedBuckets] = useState<Set<string>>(new Set())
  const [agingFilter, setAgingFilter] = useState<"all" | "insurance" | "patient">("all")
  const [agingBucketFilter, setAgingBucketFilter] = useState<string>("all")
  const [agingSearch, setAgingSearch] = useState("")

  // Worklist state
  const [followUpOpen, setFollowUpOpen] = useState(false)
  const [selectedWorklistItem, setSelectedWorklistItem] = useState<WorklistItem | null>(null)
  const [followUpForm, setFollowUpForm] = useState({
    actionType: "call" as "call" | "letter" | "note",
    notes: "",
    dueDate: undefined as Date | undefined,
  })
  const [worklistSearch, setWorklistSearch] = useState("")
  const [worklistSort, setWorklistSort] = useState<"score" | "age" | "amount">("score")

  // Payer state
  const [expandedPayers, setExpandedPayers] = useState<Set<string>>(new Set())
  const [payerSearch, setPayerSearch] = useState("")

  // Try Convex, fall back to mock data
  let agingData = MOCK_AGING
  let agingClaims = MOCK_AGING_CLAIMS
  let worklistData = MOCK_WORKLIST
  let payerData = MOCK_PAYERS

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const arResult = useQuery(api.ar.queries.getAging)
    if (arResult) {
      agingData = arResult as typeof MOCK_AGING
    }
  } catch {
    if (!convexError) setConvexError(true)
  }

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const wlResult = useQuery(api.ar.queries.getWorklist)
    if (wlResult) {
      worklistData = wlResult as typeof MOCK_WORKLIST
    }
  } catch {
    // silently fall back
  }

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const payerResult = useQuery(api.ar.queries.getPayerAnalysis)
    if (payerResult) {
      payerData = payerResult as typeof MOCK_PAYERS
    }
  } catch {
    // silently fall back
  }

  // ─── Computed ────────────────────────────────────────────────────────────

  const maxAgingAmount = useMemo(() => {
    const allAmounts = agingData.insuranceAging.map((b, i) => b.totalAmount + agingData.patientAging[i].totalAmount)
    return Math.max(...allAmounts)
  }, [agingData])

  const avgDaysOutstanding = useMemo(() => {
    const totalWeightedDays =
      agingData.insuranceAging.reduce((sum, b) => {
        const midpoint =
          b.bucket === "120+" ? 150 : (parseInt(b.bucket.split("-")[0]) + parseInt(b.bucket.split("-")[1])) / 2
        return sum + midpoint * b.count
      }, 0) +
      agingData.patientAging.reduce((sum, b) => {
        const midpoint =
          b.bucket === "120+" ? 150 : (parseInt(b.bucket.split("-")[0]) + parseInt(b.bucket.split("-")[1])) / 2
        return sum + midpoint * b.count
      }, 0)
    const totalCount =
      agingData.insuranceAging.reduce((sum, b) => sum + b.count, 0) +
      agingData.patientAging.reduce((sum, b) => sum + b.count, 0)
    return totalCount > 0 ? Math.round(totalWeightedDays / totalCount) : 0
  }, [agingData])

  const filteredAgingClaims = useMemo(() => {
    let claims = agingClaims
    if (agingFilter !== "all") {
      claims = claims.filter((c) => c.type === agingFilter)
    }
    if (agingBucketFilter !== "all") {
      claims = claims.filter((c) => c.bucket === agingBucketFilter)
    }
    if (agingSearch) {
      const q = agingSearch.toLowerCase()
      claims = claims.filter(
        (c) =>
          c.patientName.toLowerCase().includes(q) ||
          c.payerName.toLowerCase().includes(q) ||
          c.claimNumber.toLowerCase().includes(q)
      )
    }
    return claims
  }, [agingClaims, agingFilter, agingBucketFilter, agingSearch])

  const sortedWorklist = useMemo(() => {
    let items = [...worklistData]
    if (worklistSearch) {
      const q = worklistSearch.toLowerCase()
      items = items.filter(
        (w) =>
          w.patientName.toLowerCase().includes(q) ||
          w.payerName.toLowerCase().includes(q) ||
          w.claimNumber.toLowerCase().includes(q)
      )
    }
    items.sort((a, b) => {
      if (worklistSort === "score") return b.score - a.score
      if (worklistSort === "age") return b.ageDays - a.ageDays
      return b.amount - a.amount
    })
    return items
  }, [worklistData, worklistSearch, worklistSort])

  const filteredPayers = useMemo(() => {
    if (!payerSearch) return payerData
    const q = payerSearch.toLowerCase()
    return payerData.filter((p) => p.payerName.toLowerCase().includes(q))
  }, [payerData, payerSearch])

  const payerSummary = useMemo(() => {
    const totalPayers = payerData.length
    const avgDenialRate =
      payerData.reduce((sum, p) => sum + p.denialRate, 0) / totalPayers
    const flaggedCount = payerData.filter((p) => p.flags.length > 0).length
    return { totalPayers, avgDenialRate, flaggedCount }
  }, [payerData])

  // ─── Handlers ────────────────────────────────────────────────────────────

  function toggleBucket(bucket: string) {
    setExpandedBuckets((prev) => {
      const next = new Set(prev)
      if (next.has(bucket)) {
        next.delete(bucket)
      } else {
        next.add(bucket)
      }
      return next
    })
  }

  function togglePayer(payerId: string) {
    setExpandedPayers((prev) => {
      const next = new Set(prev)
      if (next.has(payerId)) {
        next.delete(payerId)
      } else {
        next.add(payerId)
      }
      return next
    })
  }

  function openFollowUp(item: WorklistItem) {
    setSelectedWorklistItem(item)
    setFollowUpForm({ actionType: "call", notes: "", dueDate: undefined })
    setFollowUpOpen(true)
  }

  function handleSubmitFollowUp() {
    console.log("Follow-up created:", { claimId: selectedWorklistItem?.claimId, ...followUpForm })
    setFollowUpOpen(false)
    setSelectedWorklistItem(null)
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">A/R Management</h1>
        <p className="text-muted-foreground">
          Accounts receivable aging, AI-prioritized worklists, and payer
          performance analysis. Target: insurance A/R under 30 days.
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="aging">
            <Clock className="mr-1.5 size-4" />
            Aging Report
          </TabsTrigger>
          <TabsTrigger value="worklist">
            <TrendingUp className="mr-1.5 size-4" />
            AI Worklist
          </TabsTrigger>
          <TabsTrigger value="payers">
            <Building2 className="mr-1.5 size-4" />
            Payer Analysis
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Aging Report ─────────────────────────────────────── */}
        <TabsContent value="aging" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total A/R</CardTitle>
                <DollarSign className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(agingData.totals.total)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {agingData.insuranceAging.reduce((s, b) => s + b.count, 0) +
                    agingData.patientAging.reduce((s, b) => s + b.count, 0)}{" "}
                  open claims
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Insurance A/R</CardTitle>
                <Building2 className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(agingData.totals.insurance)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {agingData.insuranceAging.reduce((s, b) => s + b.count, 0)} claims
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Patient A/R</CardTitle>
                <Users className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(agingData.totals.patient)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {agingData.patientAging.reduce((s, b) => s + b.count, 0)} claims
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg Days Outstanding</CardTitle>
                <Clock className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgDaysOutstanding}</div>
                <p className="text-xs text-muted-foreground">
                  Target: &lt; 30 days
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Aging Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Aging Distribution</CardTitle>
              <CardDescription>
                Insurance and patient receivables by aging bucket
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {agingData.insuranceAging.map((bucket, i) => {
                const patientBucket = agingData.patientAging[i]
                const combinedTotal = bucket.totalAmount + patientBucket.totalAmount
                const insuranceWidth =
                  maxAgingAmount > 0
                    ? (bucket.totalAmount / maxAgingAmount) * 100
                    : 0
                const patientWidth =
                  maxAgingAmount > 0
                    ? (patientBucket.totalAmount / maxAgingAmount) * 100
                    : 0

                return (
                  <div key={bucket.bucket} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className={`font-medium ${bucketTextColor(bucket.bucket)}`}>
                        {bucket.bucket} days
                      </span>
                      <span className="text-muted-foreground">
                        {formatCurrency(combinedTotal)} ({bucket.count + patientBucket.count} claims)
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <div className="flex-1">
                        <div className="flex h-6 items-center rounded-sm bg-muted">
                          <div
                            className={`h-full rounded-sm ${bucketColor(bucket.bucket)} opacity-80 transition-all`}
                            style={{ width: `${Math.max(insuranceWidth, 2)}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex h-6 items-center rounded-sm bg-muted">
                          <div
                            className={`h-full rounded-sm ${bucketColor(bucket.bucket)} opacity-40 transition-all`}
                            style={{ width: `${Math.max(patientWidth, 2)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 text-xs text-muted-foreground">
                      <span className="flex-1">
                        Insurance: {formatCurrency(bucket.totalAmount)} ({bucket.count})
                      </span>
                      <span className="flex-1">
                        Patient: {formatCurrency(patientBucket.totalAmount)} ({patientBucket.count})
                      </span>
                    </div>
                  </div>
                )
              })}
              <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="size-3 rounded-sm bg-gray-500 opacity-80" />
                  Insurance (solid)
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="size-3 rounded-sm bg-gray-500 opacity-40" />
                  Patient (light)
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Claims Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Open Claims</CardTitle>
                  <CardDescription>
                    {filteredAgingClaims.length} claims matching filters
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search claims..."
                      className="h-8 w-[180px] pl-8 text-sm"
                      value={agingSearch}
                      onChange={(e) => setAgingSearch(e.target.value)}
                    />
                  </div>
                  <Select
                    value={agingFilter}
                    onValueChange={(v) => setAgingFilter(v as typeof agingFilter)}
                  >
                    <SelectTrigger className="h-8 w-[130px] text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                      <SelectItem value="patient">Patient</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={agingBucketFilter}
                    onValueChange={setAgingBucketFilter}
                  >
                    <SelectTrigger className="h-8 w-[130px] text-sm">
                      <Filter className="mr-1.5 size-3.5" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Buckets</SelectItem>
                      <SelectItem value="0-30">0-30 days</SelectItem>
                      <SelectItem value="31-60">31-60 days</SelectItem>
                      <SelectItem value="61-90">61-90 days</SelectItem>
                      <SelectItem value="91-120">91-120 days</SelectItem>
                      <SelectItem value="120+">120+ days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Claim #</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Payer</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Age (days)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Last Action</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAgingClaims.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                          No claims match the current filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAgingClaims.map((claim) => {
                        const sb = statusBadge(claim.status)
                        return (
                          <TableRow key={claim._id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className={`size-2 rounded-full ${bucketColor(claim.bucket)}`} />
                                <span className="font-mono text-sm">{claim.claimNumber}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{claim.patientName}</TableCell>
                            <TableCell className="text-muted-foreground">{claim.payerName}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrencyFull(claim.amount)}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={bucketTextColor(claim.bucket)}>
                                {claim.ageDays}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={sb.variant} className={`text-xs ${sb.className}`}>
                                {sb.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden max-w-[200px] truncate text-sm text-muted-foreground lg:table-cell">
                              {claim.lastAction}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="xs" title="Follow Up">
                                  <FileText className="size-3.5" />
                                </Button>
                                <Button variant="ghost" size="xs" title="Call Payer">
                                  <Phone className="size-3.5" />
                                </Button>
                                <Button variant="ghost" size="xs" title="Write Off">
                                  <XCircle className="size-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: AI Worklist ──────────────────────────────────────── */}
        <TabsContent value="worklist" className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">AI-Prioritized Collection Worklist</h2>
            <p className="text-sm text-muted-foreground">
              Claims ranked by collection priority score. Higher scores indicate greater urgency.
            </p>
          </div>

          {/* Worklist Controls */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by patient, payer, or claim #..."
                className="pl-9"
                value={worklistSearch}
                onChange={(e) => setWorklistSearch(e.target.value)}
              />
            </div>
            <Select
              value={worklistSort}
              onValueChange={(v) => setWorklistSort(v as typeof worklistSort)}
            >
              <SelectTrigger className="w-[180px]">
                <ArrowUpDown className="mr-2 size-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">Sort by Priority</SelectItem>
                <SelectItem value="age">Sort by Age</SelectItem>
                <SelectItem value="amount">Sort by Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority summary */}
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              {
                label: "Urgent",
                range: "80-100",
                count: sortedWorklist.filter((w) => w.score >= 80).length,
                className: "border-red-200 dark:border-red-900",
              },
              {
                label: "High",
                range: "60-79",
                count: sortedWorklist.filter((w) => w.score >= 60 && w.score < 80).length,
                className: "border-orange-200 dark:border-orange-900",
              },
              {
                label: "Medium",
                range: "40-59",
                count: sortedWorklist.filter((w) => w.score >= 40 && w.score < 60).length,
                className: "border-yellow-200 dark:border-yellow-900",
              },
              {
                label: "Low",
                range: "0-39",
                count: sortedWorklist.filter((w) => w.score < 40).length,
                className: "border-emerald-200 dark:border-emerald-900",
              },
            ].map((tier) => (
              <Card key={tier.label} className={tier.className}>
                <CardContent className="pt-4 pb-4">
                  <div className="text-lg font-bold">{tier.count}</div>
                  <p className="text-xs text-muted-foreground">
                    {tier.label} ({tier.range})
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Worklist Items */}
          <div className="space-y-3">
            {sortedWorklist.map((item, index) => {
              const badge = scoreBadge(item.score)
              return (
                <Card key={item.claimId}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      {/* Left: info */}
                      <div className="flex items-start gap-4">
                        {/* Rank + Score */}
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs text-muted-foreground">#{index + 1}</span>
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border text-lg font-bold ${badge.className}`}
                          >
                            {item.score}
                          </div>
                        </div>
                        <div className="space-y-2 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{item.patientName}</span>
                            <Badge variant="outline" className="text-xs">
                              {badge.label}
                            </Badge>
                            <span className="text-xs font-mono text-muted-foreground">
                              {item.claimNumber}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span>{item.payerName}</span>
                            <span className="font-medium text-foreground">
                              {formatCurrencyFull(item.amount)}
                            </span>
                            <span>{item.ageDays} days old</span>
                          </div>
                          {/* Collection Probability Bar */}
                          <div className="flex items-center gap-3 max-w-xs">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              Collection
                            </span>
                            <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full rounded-full transition-all ${probabilityBarColor(item.collectionProbability)}`}
                                style={{ width: `${item.collectionProbability}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium w-8 text-right">
                              {item.collectionProbability}%
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                            {item.rationale}
                          </p>
                        </div>
                      </div>

                      {/* Right: actions */}
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openFollowUp(item)}
                        >
                          <FileText className="mr-1.5 size-3.5" />
                          Follow-Up Task
                        </Button>
                        <Button variant="outline" size="sm">
                          <Phone className="mr-1.5 size-3.5" />
                          Call
                        </Button>
                        <Button variant="outline" size="sm">
                          <Send className="mr-1.5 size-3.5" />
                          Send Statement
                        </Button>
                        <Button variant="ghost" size="sm">
                          <StickyNote className="mr-1.5 size-3.5" />
                          Add Note
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            {sortedWorklist.length === 0 && (
              <Card>
                <CardContent className="flex h-32 items-center justify-center">
                  <p className="text-muted-foreground">
                    No worklist items match your search.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Follow-up Dialog */}
          <Dialog open={followUpOpen} onOpenChange={setFollowUpOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Follow-Up Task</DialogTitle>
                <DialogDescription>
                  {selectedWorklistItem
                    ? `Schedule a follow-up for ${selectedWorklistItem.patientName} — ${selectedWorklistItem.payerName} (${formatCurrencyFull(selectedWorklistItem.amount)})`
                    : "Schedule a follow-up action"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="actionType">Task Type</Label>
                  <Select
                    value={followUpForm.actionType}
                    onValueChange={(v) =>
                      setFollowUpForm({
                        ...followUpForm,
                        actionType: v as typeof followUpForm.actionType,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select task type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">
                        <div className="flex items-center gap-2">
                          <Phone className="size-3.5" />
                          Call
                        </div>
                      </SelectItem>
                      <SelectItem value="letter">
                        <div className="flex items-center gap-2">
                          <FileText className="size-3.5" />
                          Letter
                        </div>
                      </SelectItem>
                      <SelectItem value="note">
                        <div className="flex items-center gap-2">
                          <StickyNote className="size-3.5" />
                          Note
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 size-4" />
                        {followUpForm.dueDate
                          ? formatDateStr(followUpForm.dueDate)
                          : "Select a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={followUpForm.dueDate}
                        onSelect={(date) =>
                          setFollowUpForm({
                            ...followUpForm,
                            dueDate: date ?? undefined,
                          })
                        }
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add notes about this follow-up..."
                    value={followUpForm.notes}
                    onChange={(e) =>
                      setFollowUpForm({ ...followUpForm, notes: e.target.value })
                    }
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setFollowUpOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitFollowUp}
                  disabled={!followUpForm.dueDate}
                >
                  Create Task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── Tab 3: Payer Analysis ───────────────────────────────────── */}
        <TabsContent value="payers" className="space-y-6">
          {/* Payer Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Payers</CardTitle>
                <Building2 className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{payerSummary.totalPayers}</div>
                <p className="text-xs text-muted-foreground">Active insurance payers</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg Denial Rate</CardTitle>
                <AlertTriangle className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPercent(payerSummary.avgDenialRate)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Target: &lt; 5%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Flagged Payers</CardTitle>
                <ShieldAlert className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{payerSummary.flaggedCount}</div>
                <p className="text-xs text-muted-foreground">
                  Slow payers or high denial rate
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Payer Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search payers..."
              className="pl-9"
              value={payerSearch}
              onChange={(e) => setPayerSearch(e.target.value)}
            />
          </div>

          {/* Payer Table */}
          <Card>
            <CardHeader>
              <CardTitle>Payer Performance</CardTitle>
              <CardDescription>
                Click a payer row to see all open claims for that payer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]" />
                      <TableHead>Payer Name</TableHead>
                      <TableHead className="text-right"># Claims</TableHead>
                      <TableHead className="text-right">Avg Days to Pay</TableHead>
                      <TableHead className="text-right">Denial Rate</TableHead>
                      <TableHead className="text-right">Appeal Success</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                          No payers found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPayers.map((payer) => {
                        const isExpanded = expandedPayers.has(payer.payerId)
                        const sb = payerStatusBadge(payer)
                        const payerClaims = MOCK_PAYER_CLAIMS[payer.payerId] ?? []
                        return (
                          <PayerRow
                            key={payer.payerId}
                            payer={payer}
                            statusBadge={sb}
                            claims={payerClaims}
                            isExpanded={isExpanded}
                            onToggle={() => togglePayer(payer.payerId)}
                          />
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Sub-components (inline) ─────────────────────────────────────────────────

function PayerRow({
  payer,
  statusBadge: sb,
  claims,
  isExpanded,
  onToggle,
}: {
  payer: PayerData
  statusBadge: { className: string; label: string }
  claims: { claimNumber: string; patientName: string; amount: number; ageDays: number; status: string }[]
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={onToggle}
      >
        <TableCell>
          {isExpanded ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
        </TableCell>
        <TableCell className="font-medium">{payer.payerName}</TableCell>
        <TableCell className="text-right">{payer.totalClaims}</TableCell>
        <TableCell className="text-right">
          <span
            className={
              payer.avgDaysToPay >= 45
                ? "font-medium text-amber-600 dark:text-amber-400"
                : ""
            }
          >
            {payer.avgDaysToPay}
          </span>
        </TableCell>
        <TableCell className="text-right">
          <span
            className={
              payer.denialRate >= 10
                ? "font-medium text-red-600 dark:text-red-400"
                : ""
            }
          >
            {formatPercent(payer.denialRate)}
          </span>
        </TableCell>
        <TableCell className="text-right">
          {formatPercent(payer.appealSuccessRate)}
        </TableCell>
        <TableCell className="text-right font-medium">
          {formatCurrency(payer.totalOutstanding)}
        </TableCell>
        <TableCell>
          <Badge
            variant="outline"
            className={`text-xs ${sb.className}`}
          >
            {sb.label}
          </Badge>
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell />
          <TableCell colSpan={7}>
            <div className="py-3 space-y-3">
              {/* Summary stats row */}
              <div className="grid gap-4 sm:grid-cols-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Charged: </span>
                  <span className="font-medium">{formatCurrency(payer.totalCharged)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Paid: </span>
                  <span className="font-medium">{formatCurrency(payer.totalPaid)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Denied: </span>
                  <span className="font-medium">{payer.deniedClaims} claims</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Pending: </span>
                  <span className="font-medium">{payer.pendingClaims} claims</span>
                </div>
              </div>

              {/* Open claims for this payer */}
              {claims.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Open Claims</h4>
                  <div className="rounded-md border bg-background">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Claim #</TableHead>
                          <TableHead className="text-xs">Patient</TableHead>
                          <TableHead className="text-xs text-right">Amount</TableHead>
                          <TableHead className="text-xs text-right">Age</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {claims.map((claim) => {
                          const csb = statusBadge(claim.status)
                          return (
                            <TableRow key={claim.claimNumber}>
                              <TableCell className="font-mono text-xs">{claim.claimNumber}</TableCell>
                              <TableCell className="text-sm">{claim.patientName}</TableCell>
                              <TableCell className="text-right text-sm">{formatCurrencyFull(claim.amount)}</TableCell>
                              <TableCell className="text-right text-sm">{claim.ageDays} days</TableCell>
                              <TableCell>
                                <Badge variant={csb.variant} className={`text-xs ${csb.className}`}>
                                  {csb.label}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
