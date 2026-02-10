"use client"

import { useState, useEffect } from "react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataEmptyState } from "@/components/ui/data-empty-state"
import { Building2, Clock, Save, Wifi, WifiOff, AlertTriangle } from "lucide-react"

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
]

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]

const DEFAULT_HOURS = DAYS_OF_WEEK.map((day) => ({
  day,
  open: day === "Saturday" || day === "Sunday" ? "09:00" : "08:00",
  close: day === "Saturday" || day === "Sunday" ? "13:00" : "17:00",
  closed: day === "Sunday",
}))

interface PracticeForm {
  name: string
  street: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  npi: string
  taxId: string
  timezone: string
  pmsType: string
  businessHours: typeof DEFAULT_HOURS
}

function connectionStatusBadge(
  status?: "connected" | "disconnected" | "error"
) {
  switch (status) {
    case "connected":
      return (
        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
          <Wifi className="mr-1 size-3" />
          Connected
        </Badge>
      )
    case "error":
      return (
        <Badge variant="destructive">
          <AlertTriangle className="mr-1 size-3" />
          Error
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary">
          <WifiOff className="mr-1 size-3" />
          Disconnected
        </Badge>
      )
  }
}

function pmsLabel(type?: string): string {
  switch (type) {
    case "opendental":
      return "OpenDental"
    case "eaglesoft":
      return "Eaglesoft"
    case "dentrix":
      return "Dentrix"
    default:
      return "Not configured"
  }
}

export default function PracticeSettingsPage() {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<PracticeForm>({
    name: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    email: "",
    npi: "",
    taxId: "",
    timezone: "America/Chicago",
    pmsType: "",
    businessHours: DEFAULT_HOURS,
  })

  // Load from Convex
  const practicesData = useQuery(api.practices.queries.list as any, {})

  const updatePractice = useMutation(api.practices.mutations.update as any) as ((args: any) => Promise<any>) | null

  const practices = (practicesData as any[]) ?? []
  const practice = practices?.[0]

  // Populate form when practice loads
  useEffect(() => {
    if (practice) {
      setForm({
        name: practice.name || "",
        street: practice.address?.street || "",
        city: practice.address?.city || "",
        state: practice.address?.state || "",
        zip: practice.address?.zip || "",
        phone: practice.phone || "",
        email: practice.email || "",
        npi: practice.npi ?? "",
        taxId: practice.taxId ?? "",
        timezone: practice.timezone || "America/Chicago",
        pmsType: practice.pmsType ?? "",
        businessHours: practice.businessHours ?? DEFAULT_HOURS,
      })
    }
  }, [practice])

  function updateField(field: keyof PracticeForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function updateHours(
    index: number,
    field: "open" | "close" | "closed",
    value: string | boolean
  ) {
    setForm((prev) => {
      const hours = [...prev.businessHours]
      hours[index] = { ...hours[index], [field]: value }
      return { ...prev, businessHours: hours }
    })
  }

  async function handleSave() {
    if (!updatePractice || !practice) return
    setSaving(true)
    try {
      await updatePractice({
        practiceId: practice._id,
        name: form.name,
        address: {
          street: form.street,
          city: form.city,
          state: form.state,
          zip: form.zip,
        },
        phone: form.phone,
        email: form.email,
        npi: form.npi || undefined,
        taxId: form.taxId || undefined,
        timezone: form.timezone,
        businessHours: form.businessHours,
      })
    } catch (err) {
      console.error("Failed to save practice:", err)
    } finally {
      setSaving(false)
    }
  }

  // Loading state
  if (practicesData === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Practice Settings</h1>
            <p className="text-muted-foreground">Manage your practice profile, business hours, and PMS connection.</p>
          </div>
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  // Empty state
  if (practices.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Practice Settings</h1>
            <p className="text-muted-foreground">Manage your practice profile, business hours, and PMS connection.</p>
          </div>
        </div>
        <DataEmptyState resource="practice" message="No practice configured yet. Complete the onboarding wizard to set up your practice." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Practice Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your practice profile, business hours, and PMS connection.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 size-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Practice Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-5" />
            Practice Profile
          </CardTitle>
          <CardDescription>
            Basic information about your dental practice.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Practice Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                value={form.street}
                onChange={(e) => updateField("street", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={form.state}
                  onChange={(e) => updateField("state", e.target.value)}
                  maxLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP</Label>
                <Input
                  id="zip"
                  value={form.zip}
                  onChange={(e) => updateField("zip", e.target.value)}
                  maxLength={10}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
              />
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="npi">NPI Number</Label>
              <Input
                id="npi"
                value={form.npi}
                onChange={(e) => updateField("npi", e.target.value)}
                placeholder="10-digit NPI"
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxId">Tax ID</Label>
              <Input
                id="taxId"
                value={form.taxId}
                onChange={(e) => updateField("taxId", e.target.value)}
                placeholder="XX-XXXXXXX"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PMS Connection */}
      <Card>
        <CardHeader>
          <CardTitle>PMS Connection</CardTitle>
          <CardDescription>
            Practice management system integration status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <p className="font-medium">{pmsLabel(practice?.pmsType)}</p>
              <p className="text-sm text-muted-foreground">
                {practice?.lastSyncAt
                  ? `Last synced ${new Date(practice.lastSyncAt).toLocaleString()}`
                  : "Never synced"}
              </p>
            </div>
            {connectionStatusBadge(practice?.pmsConnectionStatus)}
          </div>
        </CardContent>
      </Card>

      {/* Timezone */}
      <Card>
        <CardHeader>
          <CardTitle>Timezone</CardTitle>
          <CardDescription>
            Set the timezone used for scheduling and reporting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={form.timezone}
            onValueChange={(value) => updateField("timezone", value)}
          >
            <SelectTrigger className="w-full sm:w-[300px]">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Business Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-5" />
            Business Hours
          </CardTitle>
          <CardDescription>
            Set your practice operating hours for each day of the week.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {form.businessHours.map((hours, idx) => (
              <div
                key={hours.day}
                className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center"
              >
                <div className="flex w-28 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!hours.closed}
                    onChange={(e) => updateHours(idx, "closed", !e.target.checked)}
                    className="size-4 rounded border-gray-300"
                  />
                  <span
                    className={`text-sm font-medium ${
                      hours.closed ? "text-muted-foreground line-through" : ""
                    }`}
                  >
                    {hours.day}
                  </span>
                </div>
                {!hours.closed ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={hours.open}
                      onChange={(e) => updateHours(idx, "open", e.target.value)}
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={hours.close}
                      onChange={(e) => updateHours(idx, "close", e.target.value)}
                      className="w-32"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Closed</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bottom save button for long pages */}
      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 size-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  )
}
