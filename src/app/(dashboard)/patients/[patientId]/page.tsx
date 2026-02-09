"use client"

import { useEffect } from "react"
import { useParams } from "next/navigation"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/../convex/_generated/api"
import type { Id } from "@/../convex/_generated/dataModel"
import { PatientHeader } from "@/components/patients/patient-header"
import { PatientTabs } from "@/components/patients/patient-tabs"
import { useChatContext } from "@/lib/chat-context"

export default function PatientHubPage() {
  const params = useParams<{ patientId: string }>()
  const patientId = params.patientId as Id<"patients">
  const { setEntityData, setPageTitle } = useChatContext()

  const patient = useQuery(api.patients.queries.getById as any, { patientId }) ?? null

  // Audit log: record PHI access as a side-effect
  const logView = useMutation(api.patients.queries.logPatientView as any)
  useEffect(() => {
    if (patient) {
      logView({ patientId }).catch(() => {
        // Audit log failure is non-blocking
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?._id])

  // Inject patient data into chat context so Oscar AI knows which patient is being viewed
  useEffect(() => {
    if (patient) {
      setEntityData({
        patientName: `${patient.firstName} ${patient.lastName}`,
        patientId: patient._id,
        dateOfBirth: patient.dateOfBirth,
        primaryInsurance: patient.primaryInsurance,
      })
      setPageTitle(`Patient Hub — ${patient.firstName} ${patient.lastName}`)
    }
  }, [patient, setEntityData, setPageTitle])

  return (
    <div className="space-y-6">
      <PatientHeader patient={patient} />
      <PatientTabs patientId={patientId} patient={patient} />
    </div>
  )
}
