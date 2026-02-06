"use client"

import { useParams } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "@/../convex/_generated/api"
import type { Id } from "@/../convex/_generated/dataModel"
import { PatientHeader } from "@/components/patients/patient-header"
import { PatientTabs } from "@/components/patients/patient-tabs"

export default function PatientHubPage() {
  const params = useParams<{ patientId: string }>()
  const patientId = params.patientId as Id<"patients">

  // Gracefully handle when Convex is not connected
  let patient = null
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    patient = useQuery(api.patients?.getById, { id: patientId }) ?? null
  } catch {
    // Convex not connected — patient remains null, UI shows loading/demo state
    patient = null
  }

  return (
    <div className="space-y-6">
      <PatientHeader patient={patient} />
      <PatientTabs patientId={patientId} patient={patient} />
    </div>
  )
}
