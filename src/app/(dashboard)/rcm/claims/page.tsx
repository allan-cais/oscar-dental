"use client"

import { Fragment, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ClaimsPipeline,
  type ClaimStatus,
} from "@/components/rcm/claims-pipeline"
import {
  ClaimDetail,
  type ClaimDetailData,
} from "@/components/rcm/claim-detail"
import { cn } from "@/lib/utils"
import {
  FileText,
  CheckCircle,
  DollarSign,
  Clock,
  ChevronDown,
  ChevronRight,
  Eye,
  RotateCw,
  Send,
  Search,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Demo Data
// ---------------------------------------------------------------------------

interface DemoClaim {
  id: string
  claimNumber: string
  patientName: string
  payer: string
  payerId: string
  status: ClaimStatus
  procedures: {
    code: string
    description: string
    fee: number
    tooth?: string
    surface?: string
    quantity?: number
  }[]
  totalCharged: number
  totalPaid: number
  adjustments: number
  patientPortion: number
  ageInDays: number
  ageBucket: string
  submittedDate: string
  scrubErrors?: {
    code: string
    message: string
    severity: "error" | "warning" | "info"
    field?: string
  }[]
  statusHistory: { status: string; timestamp: string; label: string }[]
}

const DEMO_CLAIMS: DemoClaim[] = [
  {
    id: "clm_001",
    claimNumber: "CLM-2026-0001",
    patientName: "Sarah Johnson",
    payer: "Delta Dental PPO",
    payerId: "delta",
    status: "paid",
    procedures: [
      { code: "D0120", description: "Periodic Oral Evaluation", fee: 65, tooth: undefined, surface: undefined, quantity: 1 },
      { code: "D1110", description: "Prophylaxis - Adult", fee: 125, tooth: undefined, surface: undefined, quantity: 1 },
      { code: "D0274", description: "Bitewings - Four Radiographic Images", fee: 80, tooth: undefined, surface: undefined, quantity: 1 },
    ],
    totalCharged: 270,
    totalPaid: 216,
    adjustments: 27,
    patientPortion: 27,
    ageInDays: 22,
    ageBucket: "0-30",
    submittedDate: "2026-01-14",
    statusHistory: [
      { status: "draft", timestamp: "Jan 13, 2026 09:15 AM", label: "Created" },
      { status: "scrubbing", timestamp: "Jan 13, 2026 09:16 AM", label: "Scrubbing" },
      { status: "ready", timestamp: "Jan 13, 2026 09:16 AM", label: "Scrub Passed" },
      { status: "submitted", timestamp: "Jan 14, 2026 08:00 AM", label: "Submitted" },
      { status: "accepted", timestamp: "Jan 16, 2026 02:30 PM", label: "Accepted" },
      { status: "paid", timestamp: "Jan 28, 2026 11:00 AM", label: "Paid" },
    ],
  },
  {
    id: "clm_002",
    claimNumber: "CLM-2026-0002",
    patientName: "Michael Chen",
    payer: "Cigna DPPO",
    payerId: "cigna",
    status: "submitted",
    procedures: [
      { code: "D2391", description: "Resin Composite - 1s, Posterior", fee: 235, tooth: "14", surface: "MO", quantity: 1 },
      { code: "D2392", description: "Resin Composite - 2s, Posterior", fee: 295, tooth: "15", surface: "MOD", quantity: 1 },
    ],
    totalCharged: 530,
    totalPaid: 0,
    adjustments: 0,
    patientPortion: 0,
    ageInDays: 15,
    ageBucket: "0-30",
    submittedDate: "2026-01-21",
    statusHistory: [
      { status: "draft", timestamp: "Jan 20, 2026 03:45 PM", label: "Created" },
      { status: "scrubbing", timestamp: "Jan 20, 2026 03:46 PM", label: "Scrubbing" },
      { status: "ready", timestamp: "Jan 20, 2026 03:46 PM", label: "Scrub Passed" },
      { status: "submitted", timestamp: "Jan 21, 2026 08:00 AM", label: "Submitted" },
    ],
  },
  {
    id: "clm_003",
    claimNumber: "CLM-2026-0003",
    patientName: "Emily Rodriguez",
    payer: "MetLife PDP",
    payerId: "metlife",
    status: "denied",
    procedures: [
      { code: "D2740", description: "Crown - Porcelain/Ceramic", fee: 1250, tooth: "30", surface: undefined, quantity: 1 },
    ],
    totalCharged: 1250,
    totalPaid: 0,
    adjustments: 0,
    patientPortion: 0,
    ageInDays: 45,
    ageBucket: "31-60",
    submittedDate: "2025-12-22",
    scrubErrors: [],
    statusHistory: [
      { status: "draft", timestamp: "Dec 21, 2025 11:30 AM", label: "Created" },
      { status: "ready", timestamp: "Dec 21, 2025 11:31 AM", label: "Scrub Passed" },
      { status: "submitted", timestamp: "Dec 22, 2025 08:00 AM", label: "Submitted" },
      { status: "denied", timestamp: "Jan 08, 2026 09:15 AM", label: "Denied - Missing Pre-Auth" },
    ],
  },
  {
    id: "clm_004",
    claimNumber: "CLM-2026-0004",
    patientName: "James Williams",
    payer: "Delta Dental PPO",
    payerId: "delta",
    status: "scrub_failed",
    procedures: [
      { code: "D4341", description: "Periodontal Scaling and Root Planing", fee: 310, tooth: undefined, surface: undefined, quantity: 1 },
      { code: "D4342", description: "Periodontal Scaling - 1-3 Teeth", fee: 195, tooth: undefined, surface: undefined, quantity: 1 },
    ],
    totalCharged: 505,
    totalPaid: 0,
    adjustments: 0,
    patientPortion: 0,
    ageInDays: 3,
    ageBucket: "0-30",
    submittedDate: "",
    scrubErrors: [
      { code: "SCR-101", message: "Missing quadrant specification for D4341", severity: "error", field: "procedures[0].tooth" },
      { code: "SCR-204", message: "D4342 frequency limit: last performed within 24 months", severity: "warning", field: "procedures[1]" },
    ],
    statusHistory: [
      { status: "draft", timestamp: "Feb 02, 2026 10:00 AM", label: "Created" },
      { status: "scrubbing", timestamp: "Feb 02, 2026 10:01 AM", label: "Scrubbing" },
      { status: "scrub_failed", timestamp: "Feb 02, 2026 10:01 AM", label: "Scrub Failed (2 issues)" },
    ],
  },
  {
    id: "clm_005",
    claimNumber: "CLM-2026-0005",
    patientName: "Lisa Park",
    payer: "Cigna DPPO",
    payerId: "cigna",
    status: "accepted",
    procedures: [
      { code: "D0150", description: "Comprehensive Oral Evaluation", fee: 95, tooth: undefined, surface: undefined, quantity: 1 },
      { code: "D0210", description: "Intraoral - Complete Series", fee: 175, tooth: undefined, surface: undefined, quantity: 1 },
      { code: "D1110", description: "Prophylaxis - Adult", fee: 125, tooth: undefined, surface: undefined, quantity: 1 },
    ],
    totalCharged: 395,
    totalPaid: 0,
    adjustments: 0,
    patientPortion: 0,
    ageInDays: 10,
    ageBucket: "0-30",
    submittedDate: "2026-01-26",
    statusHistory: [
      { status: "draft", timestamp: "Jan 25, 2026 02:00 PM", label: "Created" },
      { status: "ready", timestamp: "Jan 25, 2026 02:01 PM", label: "Scrub Passed" },
      { status: "submitted", timestamp: "Jan 26, 2026 08:00 AM", label: "Submitted" },
      { status: "accepted", timestamp: "Jan 30, 2026 10:45 AM", label: "Accepted" },
    ],
  },
  {
    id: "clm_006",
    claimNumber: "CLM-2026-0006",
    patientName: "Robert Kim",
    payer: "MetLife PDP",
    payerId: "metlife",
    status: "draft",
    procedures: [
      { code: "D7210", description: "Surgical Extraction", fee: 385, tooth: "1", surface: undefined, quantity: 1 },
    ],
    totalCharged: 385,
    totalPaid: 0,
    adjustments: 0,
    patientPortion: 0,
    ageInDays: 1,
    ageBucket: "0-30",
    submittedDate: "",
    statusHistory: [
      { status: "draft", timestamp: "Feb 04, 2026 04:30 PM", label: "Created" },
    ],
  },
  {
    id: "clm_007",
    claimNumber: "CLM-2026-0007",
    patientName: "Amanda Torres",
    payer: "Delta Dental PPO",
    payerId: "delta",
    status: "paid",
    procedures: [
      { code: "D0120", description: "Periodic Oral Evaluation", fee: 65, tooth: undefined, surface: undefined, quantity: 1 },
      { code: "D1110", description: "Prophylaxis - Adult", fee: 125, tooth: undefined, surface: undefined, quantity: 1 },
    ],
    totalCharged: 190,
    totalPaid: 152,
    adjustments: 19,
    patientPortion: 19,
    ageInDays: 28,
    ageBucket: "0-30",
    submittedDate: "2026-01-08",
    statusHistory: [
      { status: "draft", timestamp: "Jan 07, 2026 11:00 AM", label: "Created" },
      { status: "ready", timestamp: "Jan 07, 2026 11:01 AM", label: "Scrub Passed" },
      { status: "submitted", timestamp: "Jan 08, 2026 08:00 AM", label: "Submitted" },
      { status: "paid", timestamp: "Jan 25, 2026 03:00 PM", label: "Paid" },
    ],
  },
  {
    id: "clm_008",
    claimNumber: "CLM-2026-0008",
    patientName: "David Nguyen",
    payer: "Cigna DPPO",
    payerId: "cigna",
    status: "appealed",
    procedures: [
      { code: "D2750", description: "Crown - Porcelain Fused to High Noble Metal", fee: 1350, tooth: "19", surface: undefined, quantity: 1 },
      { code: "D2950", description: "Core Buildup", fee: 325, tooth: "19", surface: undefined, quantity: 1 },
    ],
    totalCharged: 1675,
    totalPaid: 0,
    adjustments: 0,
    patientPortion: 0,
    ageInDays: 75,
    ageBucket: "61-90",
    submittedDate: "2025-11-22",
    statusHistory: [
      { status: "draft", timestamp: "Nov 21, 2025 09:00 AM", label: "Created" },
      { status: "submitted", timestamp: "Nov 22, 2025 08:00 AM", label: "Submitted" },
      { status: "denied", timestamp: "Dec 15, 2025 11:30 AM", label: "Denied - Not Medically Necessary" },
      { status: "appealed", timestamp: "Dec 20, 2025 02:00 PM", label: "Appeal Submitted" },
    ],
  },
  {
    id: "clm_009",
    claimNumber: "CLM-2026-0009",
    patientName: "Jessica Brown",
    payer: "Delta Dental PPO",
    payerId: "delta",
    status: "ready",
    procedures: [
      { code: "D0120", description: "Periodic Oral Evaluation", fee: 65, tooth: undefined, surface: undefined, quantity: 1 },
      { code: "D0274", description: "Bitewings - Four Radiographic Images", fee: 80, tooth: undefined, surface: undefined, quantity: 1 },
      { code: "D1110", description: "Prophylaxis - Adult", fee: 125, tooth: undefined, surface: undefined, quantity: 1 },
      { code: "D1208", description: "Topical Fluoride", fee: 45, tooth: undefined, surface: undefined, quantity: 1 },
    ],
    totalCharged: 315,
    totalPaid: 0,
    adjustments: 0,
    patientPortion: 0,
    ageInDays: 0,
    ageBucket: "0-30",
    submittedDate: "",
    statusHistory: [
      { status: "draft", timestamp: "Feb 05, 2026 08:30 AM", label: "Created" },
      { status: "ready", timestamp: "Feb 05, 2026 08:31 AM", label: "Scrub Passed" },
    ],
  },
  {
    id: "clm_010",
    claimNumber: "CLM-2026-0010",
    patientName: "Thomas Lee",
    payer: "MetLife PDP",
    payerId: "metlife",
    status: "paid",
    procedures: [
      { code: "D2391", description: "Resin Composite - 1s, Posterior", fee: 235, tooth: "3", surface: "DO", quantity: 1 },
    ],
    totalCharged: 235,
    totalPaid: 165,
    adjustments: 35,
    patientPortion: 35,
    ageInDays: 40,
    ageBucket: "31-60",
    submittedDate: "2025-12-27",
    statusHistory: [
      { status: "draft", timestamp: "Dec 26, 2025 01:00 PM", label: "Created" },
      { status: "submitted", timestamp: "Dec 27, 2025 08:00 AM", label: "Submitted" },
      { status: "paid", timestamp: "Jan 20, 2026 09:00 AM", label: "Paid" },
    ],
  },
  {
    id: "clm_011",
    claimNumber: "CLM-2026-0011",
    patientName: "Karen Davis",
    payer: "Delta Dental PPO",
    payerId: "delta",
    status: "submitted",
    procedures: [
      { code: "D4341", description: "Periodontal Scaling and Root Planing", fee: 310, tooth: "UR", surface: undefined, quantity: 1 },
      { code: "D4341", description: "Periodontal Scaling and Root Planing", fee: 310, tooth: "UL", surface: undefined, quantity: 1 },
    ],
    totalCharged: 620,
    totalPaid: 0,
    adjustments: 0,
    patientPortion: 0,
    ageInDays: 8,
    ageBucket: "0-30",
    submittedDate: "2026-01-28",
    statusHistory: [
      { status: "draft", timestamp: "Jan 27, 2026 10:15 AM", label: "Created" },
      { status: "ready", timestamp: "Jan 27, 2026 10:16 AM", label: "Scrub Passed" },
      { status: "submitted", timestamp: "Jan 28, 2026 08:00 AM", label: "Submitted" },
    ],
  },
  {
    id: "clm_012",
    claimNumber: "CLM-2026-0012",
    patientName: "Christopher Martinez",
    payer: "Cigna DPPO",
    payerId: "cigna",
    status: "denied",
    procedures: [
      { code: "D0220", description: "Intraoral - Periapical First Image", fee: 35, tooth: "8", surface: undefined, quantity: 1 },
      { code: "D3310", description: "Endodontic Therapy - Anterior", fee: 850, tooth: "8", surface: undefined, quantity: 1 },
      { code: "D2740", description: "Crown - Porcelain/Ceramic", fee: 1250, tooth: "8", surface: undefined, quantity: 1 },
    ],
    totalCharged: 2135,
    totalPaid: 0,
    adjustments: 0,
    patientPortion: 0,
    ageInDays: 62,
    ageBucket: "61-90",
    submittedDate: "2025-12-05",
    statusHistory: [
      { status: "draft", timestamp: "Dec 04, 2025 02:30 PM", label: "Created" },
      { status: "submitted", timestamp: "Dec 05, 2025 08:00 AM", label: "Submitted" },
      { status: "denied", timestamp: "Jan 02, 2026 03:45 PM", label: "Denied - Frequency Limitation" },
    ],
  },
  {
    id: "clm_013",
    claimNumber: "CLM-2026-0013",
    patientName: "Maria Gonzalez",
    payer: "Delta Dental PPO",
    payerId: "delta",
    status: "paid",
    procedures: [
      { code: "D0120", description: "Periodic Oral Evaluation", fee: 65, tooth: undefined, surface: undefined, quantity: 1 },
      { code: "D1110", description: "Prophylaxis - Adult", fee: 125, tooth: undefined, surface: undefined, quantity: 1 },
    ],
    totalCharged: 190,
    totalPaid: 156,
    adjustments: 15,
    patientPortion: 19,
    ageInDays: 50,
    ageBucket: "31-60",
    submittedDate: "2025-12-17",
    statusHistory: [
      { status: "draft", timestamp: "Dec 16, 2025 09:45 AM", label: "Created" },
      { status: "submitted", timestamp: "Dec 17, 2025 08:00 AM", label: "Submitted" },
      { status: "paid", timestamp: "Jan 10, 2026 11:00 AM", label: "Paid" },
    ],
  },
  {
    id: "clm_014",
    claimNumber: "CLM-2026-0014",
    patientName: "Andrew Thompson",
    payer: "MetLife PDP",
    payerId: "metlife",
    status: "draft",
    procedures: [
      { code: "D0150", description: "Comprehensive Oral Evaluation", fee: 95, tooth: undefined, surface: undefined, quantity: 1 },
      { code: "D0210", description: "Intraoral - Complete Series", fee: 175, tooth: undefined, surface: undefined, quantity: 1 },
    ],
    totalCharged: 270,
    totalPaid: 0,
    adjustments: 0,
    patientPortion: 0,
    ageInDays: 0,
    ageBucket: "0-30",
    submittedDate: "",
    statusHistory: [
      { status: "draft", timestamp: "Feb 05, 2026 10:30 AM", label: "Created" },
    ],
  },
  {
    id: "clm_015",
    claimNumber: "CLM-2026-0015",
    patientName: "Sophia Anderson",
    payer: "Delta Dental PPO",
    payerId: "delta",
    status: "submitted",
    procedures: [
      { code: "D2740", description: "Crown - Porcelain/Ceramic", fee: 1250, tooth: "19", surface: undefined, quantity: 1 },
      { code: "D2950", description: "Core Buildup", fee: 325, tooth: "19", surface: undefined, quantity: 1 },
    ],
    totalCharged: 1575,
    totalPaid: 0,
    adjustments: 0,
    patientPortion: 0,
    ageInDays: 5,
    ageBucket: "0-30",
    submittedDate: "2026-01-31",
    statusHistory: [
      { status: "draft", timestamp: "Jan 30, 2026 11:00 AM", label: "Created" },
      { status: "ready", timestamp: "Jan 30, 2026 11:01 AM", label: "Scrub Passed" },
      { status: "submitted", timestamp: "Jan 31, 2026 08:00 AM", label: "Submitted" },
    ],
  },
  {
    id: "clm_016",
    claimNumber: "CLM-2026-0016",
    patientName: "Brian White",
    payer: "Cigna DPPO",
    payerId: "cigna",
    status: "paid",
    procedures: [
      { code: "D0120", description: "Periodic Oral Evaluation", fee: 65, tooth: undefined, surface: undefined, quantity: 1 },
      { code: "D0274", description: "Bitewings - Four Radiographic Images", fee: 80, tooth: undefined, surface: undefined, quantity: 1 },
      { code: "D1110", description: "Prophylaxis - Adult", fee: 125, tooth: undefined, surface: undefined, quantity: 1 },
    ],
    totalCharged: 270,
    totalPaid: 210,
    adjustments: 30,
    patientPortion: 30,
    ageInDays: 35,
    ageBucket: "31-60",
    submittedDate: "2026-01-01",
    statusHistory: [
      { status: "draft", timestamp: "Dec 31, 2025 03:00 PM", label: "Created" },
      { status: "submitted", timestamp: "Jan 01, 2026 08:00 AM", label: "Submitted" },
      { status: "paid", timestamp: "Jan 22, 2026 10:00 AM", label: "Paid" },
    ],
  },
  {
    id: "clm_017",
    claimNumber: "CLM-2026-0017",
    patientName: "Rachel Green",
    payer: "Delta Dental PPO",
    payerId: "delta",
    status: "accepted",
    procedures: [
      { code: "D2391", description: "Resin Composite - 1s, Posterior", fee: 235, tooth: "19", surface: "O", quantity: 1 },
    ],
    totalCharged: 235,
    totalPaid: 0,
    adjustments: 0,
    patientPortion: 0,
    ageInDays: 12,
    ageBucket: "0-30",
    submittedDate: "2026-01-24",
    statusHistory: [
      { status: "draft", timestamp: "Jan 23, 2026 01:00 PM", label: "Created" },
      { status: "submitted", timestamp: "Jan 24, 2026 08:00 AM", label: "Submitted" },
      { status: "accepted", timestamp: "Jan 29, 2026 09:30 AM", label: "Accepted" },
    ],
  },
  {
    id: "clm_018",
    claimNumber: "CLM-2026-0018",
    patientName: "Daniel Clark",
    payer: "MetLife PDP",
    payerId: "metlife",
    status: "denied",
    procedures: [
      { code: "D4910", description: "Periodontal Maintenance", fee: 185, tooth: undefined, surface: undefined, quantity: 1 },
    ],
    totalCharged: 185,
    totalPaid: 0,
    adjustments: 0,
    patientPortion: 0,
    ageInDays: 95,
    ageBucket: "91-120",
    submittedDate: "2025-11-02",
    statusHistory: [
      { status: "draft", timestamp: "Nov 01, 2025 10:00 AM", label: "Created" },
      { status: "submitted", timestamp: "Nov 02, 2025 08:00 AM", label: "Submitted" },
      { status: "denied", timestamp: "Nov 28, 2025 04:00 PM", label: "Denied - No Prior SRP on File" },
    ],
  },
  {
    id: "clm_019",
    claimNumber: "CLM-2026-0019",
    patientName: "Michelle Lewis",
    payer: "Delta Dental PPO",
    payerId: "delta",
    status: "paid",
    procedures: [
      { code: "D0120", description: "Periodic Oral Evaluation", fee: 65, tooth: undefined, surface: undefined, quantity: 1 },
      { code: "D1110", description: "Prophylaxis - Adult", fee: 125, tooth: undefined, surface: undefined, quantity: 1 },
      { code: "D1208", description: "Topical Fluoride", fee: 45, tooth: undefined, surface: undefined, quantity: 1 },
    ],
    totalCharged: 235,
    totalPaid: 190,
    adjustments: 22,
    patientPortion: 23,
    ageInDays: 18,
    ageBucket: "0-30",
    submittedDate: "2026-01-18",
    statusHistory: [
      { status: "draft", timestamp: "Jan 17, 2026 02:30 PM", label: "Created" },
      { status: "submitted", timestamp: "Jan 18, 2026 08:00 AM", label: "Submitted" },
      { status: "paid", timestamp: "Feb 01, 2026 11:30 AM", label: "Paid" },
    ],
  },
  {
    id: "clm_020",
    claimNumber: "CLM-2026-0020",
    patientName: "Steven Hall",
    payer: "Cigna DPPO",
    payerId: "cigna",
    status: "scrub_failed",
    procedures: [
      { code: "D2740", description: "Crown - Porcelain/Ceramic", fee: 1250, tooth: "30", surface: undefined, quantity: 1 },
      { code: "D2950", description: "Core Buildup", fee: 325, tooth: "30", surface: undefined, quantity: 1 },
      { code: "D0220", description: "Intraoral - Periapical First Image", fee: 35, tooth: "30", surface: undefined, quantity: 1 },
    ],
    totalCharged: 1610,
    totalPaid: 0,
    adjustments: 0,
    patientPortion: 0,
    ageInDays: 2,
    ageBucket: "0-30",
    submittedDate: "",
    scrubErrors: [
      { code: "SCR-301", message: "Pre-authorization required for D2740 by Cigna DPPO", severity: "error", field: "procedures[0]" },
      { code: "SCR-105", message: "Narrative/clinical notes recommended for crown procedure", severity: "warning" },
      { code: "SCR-402", message: "Verify tooth #30 does not have existing crown on file", severity: "warning" },
    ],
    statusHistory: [
      { status: "draft", timestamp: "Feb 03, 2026 03:15 PM", label: "Created" },
      { status: "scrubbing", timestamp: "Feb 03, 2026 03:16 PM", label: "Scrubbing" },
      { status: "scrub_failed", timestamp: "Feb 03, 2026 03:16 PM", label: "Scrub Failed (3 issues)" },
    ],
  },
  {
    id: "clm_021",
    claimNumber: "CLM-2026-0021",
    patientName: "Jennifer Taylor",
    payer: "Delta Dental PPO",
    payerId: "delta",
    status: "submitted",
    procedures: [
      { code: "D7210", description: "Surgical Extraction", fee: 385, tooth: "17", surface: undefined, quantity: 1 },
      { code: "D7210", description: "Surgical Extraction", fee: 385, tooth: "32", surface: undefined, quantity: 1 },
    ],
    totalCharged: 770,
    totalPaid: 0,
    adjustments: 0,
    patientPortion: 0,
    ageInDays: 4,
    ageBucket: "0-30",
    submittedDate: "2026-02-01",
    statusHistory: [
      { status: "draft", timestamp: "Jan 31, 2026 04:00 PM", label: "Created" },
      { status: "ready", timestamp: "Jan 31, 2026 04:01 PM", label: "Scrub Passed" },
      { status: "submitted", timestamp: "Feb 01, 2026 08:00 AM", label: "Submitted" },
    ],
  },
  {
    id: "clm_022",
    claimNumber: "CLM-2026-0022",
    patientName: "Kevin Wright",
    payer: "MetLife PDP",
    payerId: "metlife",
    status: "paid",
    procedures: [
      { code: "D0120", description: "Periodic Oral Evaluation", fee: 65, tooth: undefined, surface: undefined, quantity: 1 },
      { code: "D1110", description: "Prophylaxis - Adult", fee: 125, tooth: undefined, surface: undefined, quantity: 1 },
    ],
    totalCharged: 190,
    totalPaid: 145,
    adjustments: 22,
    patientPortion: 23,
    ageInDays: 55,
    ageBucket: "31-60",
    submittedDate: "2025-12-12",
    statusHistory: [
      { status: "draft", timestamp: "Dec 11, 2025 11:30 AM", label: "Created" },
      { status: "submitted", timestamp: "Dec 12, 2025 08:00 AM", label: "Submitted" },
      { status: "paid", timestamp: "Jan 05, 2026 02:00 PM", label: "Paid" },
    ],
  },
  {
    id: "clm_023",
    claimNumber: "CLM-2026-0023",
    patientName: "Laura Robinson",
    payer: "Delta Dental PPO",
    payerId: "delta",
    status: "accepted",
    procedures: [
      { code: "D0120", description: "Periodic Oral Evaluation", fee: 65, tooth: undefined, surface: undefined, quantity: 1 },
      { code: "D0274", description: "Bitewings - Four Radiographic Images", fee: 80, tooth: undefined, surface: undefined, quantity: 1 },
      { code: "D1110", description: "Prophylaxis - Adult", fee: 125, tooth: undefined, surface: undefined, quantity: 1 },
    ],
    totalCharged: 270,
    totalPaid: 0,
    adjustments: 0,
    patientPortion: 0,
    ageInDays: 7,
    ageBucket: "0-30",
    submittedDate: "2026-01-29",
    statusHistory: [
      { status: "draft", timestamp: "Jan 28, 2026 09:00 AM", label: "Created" },
      { status: "submitted", timestamp: "Jan 29, 2026 08:00 AM", label: "Submitted" },
      { status: "accepted", timestamp: "Feb 03, 2026 10:00 AM", label: "Accepted" },
    ],
  },
  {
    id: "clm_024",
    claimNumber: "CLM-2026-0024",
    patientName: "Patrick Harris",
    payer: "Cigna DPPO",
    payerId: "cigna",
    status: "appealed",
    procedures: [
      { code: "D3310", description: "Endodontic Therapy - Anterior", fee: 850, tooth: "9", surface: undefined, quantity: 1 },
    ],
    totalCharged: 850,
    totalPaid: 0,
    adjustments: 0,
    patientPortion: 0,
    ageInDays: 88,
    ageBucket: "61-90",
    submittedDate: "2025-11-09",
    statusHistory: [
      { status: "draft", timestamp: "Nov 08, 2025 10:30 AM", label: "Created" },
      { status: "submitted", timestamp: "Nov 09, 2025 08:00 AM", label: "Submitted" },
      { status: "denied", timestamp: "Dec 05, 2025 01:00 PM", label: "Denied - Documentation Insufficient" },
      { status: "appealed", timestamp: "Dec 12, 2025 09:00 AM", label: "Appeal Submitted with X-rays" },
    ],
  },
  {
    id: "clm_025",
    claimNumber: "CLM-2026-0025",
    patientName: "Nancy Scott",
    payer: "Delta Dental PPO",
    payerId: "delta",
    status: "paid",
    procedures: [
      { code: "D2391", description: "Resin Composite - 1s, Posterior", fee: 235, tooth: "4", surface: "MO", quantity: 1 },
      { code: "D2392", description: "Resin Composite - 2s, Posterior", fee: 295, tooth: "5", surface: "MOD", quantity: 1 },
    ],
    totalCharged: 530,
    totalPaid: 424,
    adjustments: 53,
    patientPortion: 53,
    ageInDays: 30,
    ageBucket: "0-30",
    submittedDate: "2026-01-06",
    statusHistory: [
      { status: "draft", timestamp: "Jan 05, 2026 01:00 PM", label: "Created" },
      { status: "submitted", timestamp: "Jan 06, 2026 08:00 AM", label: "Submitted" },
      { status: "paid", timestamp: "Jan 30, 2026 09:45 AM", label: "Paid" },
    ],
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

const STATUS_BADGE_STYLES: Record<
  ClaimStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; className: string }
> = {
  draft: { variant: "secondary", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  scrubbing: { variant: "secondary", className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  scrub_failed: { variant: "destructive", className: "" },
  ready: { variant: "secondary", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
  submitted: { variant: "secondary", className: "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300" },
  accepted: { variant: "secondary", className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  paid: { variant: "secondary", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" },
  denied: { variant: "destructive", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  appealed: { variant: "secondary", className: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
}

const STATUS_LABELS: Record<ClaimStatus, string> = {
  draft: "Draft",
  scrubbing: "Scrubbing",
  scrub_failed: "Scrub Failed",
  ready: "Ready",
  submitted: "Submitted",
  accepted: "Accepted",
  paid: "Paid",
  denied: "Denied",
  appealed: "Appealed",
}

const PAYERS = ["Delta Dental PPO", "Cigna DPPO", "MetLife PDP"]
const AGE_BUCKETS = ["0-30", "31-60", "61-90", "91-120", "120+"]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ClaimsPage() {
  const [activeStatus, setActiveStatus] = useState<ClaimStatus | null>(null)
  const [payerFilter, setPayerFilter] = useState<string>("all")
  const [ageBucketFilter, setAgeBucketFilter] = useState<string>("all")
  const [expandedClaim, setExpandedClaim] = useState<string | null>(null)

  // Compute pipeline counts
  const pipelineCounts: Record<ClaimStatus, number> = {
    draft: 0,
    scrubbing: 0,
    scrub_failed: 0,
    ready: 0,
    submitted: 0,
    accepted: 0,
    paid: 0,
    denied: 0,
    appealed: 0,
  }
  for (const claim of DEMO_CLAIMS) {
    pipelineCounts[claim.status]++
  }

  // Filter claims
  const filteredClaims = DEMO_CLAIMS.filter((claim) => {
    if (activeStatus && claim.status !== activeStatus) return false
    if (payerFilter !== "all" && claim.payer !== payerFilter) return false
    if (ageBucketFilter !== "all" && claim.ageBucket !== ageBucketFilter) return false
    return true
  })

  // Stats
  const totalClaims = DEMO_CLAIMS.length
  const totalCharged = DEMO_CLAIMS.reduce((sum, c) => sum + c.totalCharged, 0)
  const totalPaid = DEMO_CLAIMS.reduce((sum, c) => sum + c.totalPaid, 0)
  const totalOutstanding = totalCharged - totalPaid - DEMO_CLAIMS.reduce((sum, c) => sum + c.adjustments, 0)
  const submittedClaims = DEMO_CLAIMS.filter(
    (c) => c.status !== "draft" && c.status !== "scrubbing" && c.status !== "scrub_failed" && c.status !== "ready"
  )
  const avgDaysToSubmit =
    submittedClaims.length > 0
      ? (submittedClaims.reduce((sum, c) => sum + Math.max(c.ageInDays, 1), 0) / submittedClaims.length).toFixed(1)
      : "0"
  const cleanClaimCount = DEMO_CLAIMS.filter(
    (c) => !c.scrubErrors || c.scrubErrors.length === 0
  ).length
  const cleanRate = ((cleanClaimCount / totalClaims) * 100).toFixed(1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Claims Tracker</h1>
        <p className="text-muted-foreground">
          Claims scrubbing, submission tracking, and revenue cycle pipeline.
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="size-4" />
              Total Claims
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClaims}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="size-4" />
              Clean Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cleanRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="size-4" />
              Avg Days to Submit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgDaysToSubmit}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="size-4" />
              Total Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalOutstanding)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Claims Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ClaimsPipeline
            counts={pipelineCounts}
            activeStatus={activeStatus}
            onStatusClick={setActiveStatus}
          />
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={payerFilter} onValueChange={setPayerFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Payers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payers</SelectItem>
            {PAYERS.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={ageBucketFilter} onValueChange={setAgeBucketFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Ages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ages</SelectItem>
            {AGE_BUCKETS.map((b) => (
              <SelectItem key={b} value={b}>
                {b} days
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(activeStatus || payerFilter !== "all" || ageBucketFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setActiveStatus(null)
              setPayerFilter("all")
              setAgeBucketFilter("all")
            }}
          >
            Clear Filters
          </Button>
        )}

        <span className="self-center text-sm text-muted-foreground ml-auto">
          {filteredClaims.length} of {totalClaims} claims
        </span>
      </div>

      {/* Claims Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]" />
                <TableHead>Claim #</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Payer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Procedures</TableHead>
                <TableHead className="text-right">Charged</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Age</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClaims.map((claim) => {
                const isExpanded = expandedClaim === claim.id
                const badgeStyle = STATUS_BADGE_STYLES[claim.status]

                return (
                  <Fragment key={claim.id}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() =>
                        setExpandedClaim(isExpanded ? null : claim.id)
                      }
                    >
                      <TableCell>
                        {isExpanded ? (
                          <ChevronDown className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {claim.claimNumber}
                      </TableCell>
                      <TableCell className="font-medium">
                        {claim.patientName}
                      </TableCell>
                      <TableCell>{claim.payer}</TableCell>
                      <TableCell>
                        <Badge
                          variant={badgeStyle.variant}
                          className={badgeStyle.className}
                        >
                          {STATUS_LABELS[claim.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {claim.procedures.length}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(claim.totalCharged)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(claim.totalPaid)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            claim.ageInDays > 60 && "text-red-600 font-semibold",
                            claim.ageInDays > 30 &&
                              claim.ageInDays <= 60 &&
                              "text-amber-600 font-medium"
                          )}
                        >
                          {claim.ageInDays}d
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {claim.submittedDate || "-"}
                      </TableCell>
                      <TableCell>
                        <div
                          className="flex gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {claim.status === "draft" && (
                            <Button size="xs" variant="outline">
                              Scrub
                            </Button>
                          )}
                          {claim.status === "scrub_failed" && (
                            <>
                              <Button size="xs" variant="outline">
                                <Eye className="size-3" />
                                Errors
                              </Button>
                              <Button size="xs" variant="outline">
                                <RotateCw className="size-3" />
                                Re-scrub
                              </Button>
                            </>
                          )}
                          {claim.status === "ready" && (
                            <Button size="xs">
                              <Send className="size-3" />
                              Submit
                            </Button>
                          )}
                          {claim.status === "submitted" && (
                            <Button size="xs" variant="outline">
                              <Search className="size-3" />
                              Check
                            </Button>
                          )}
                          {claim.status === "denied" && (
                            <Button size="xs" variant="destructive">
                              View Denial
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={11} className="p-4">
                          <ClaimDetail
                            claim={{
                              procedures: claim.procedures,
                              totalCharged: claim.totalCharged,
                              totalPaid: claim.totalPaid,
                              adjustments: claim.adjustments,
                              patientPortion: claim.patientPortion,
                              scrubErrors: claim.scrubErrors,
                              statusHistory: claim.statusHistory,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })}
              {filteredClaims.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={11}
                    className="text-center text-muted-foreground py-8"
                  >
                    No claims match the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
