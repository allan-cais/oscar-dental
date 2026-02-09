import { tool } from "@anthropic-ai/claude-agent-sdk"
import { z } from "zod"
import { MOCK_PATIENTS } from "../mock-data.js"

export const lookupPatient = tool(
  "lookup_patient",
  "Search for patients by name, ID, or phone number. Returns matching patient records.",
  {
    query: z.string().describe("Patient name, ID (e.g. PAT-1001), or phone number to search for"),
  },
  async ({ query }) => {
    console.log(`[Oscar Tool] lookup_patient called with: ${query}`)
    const q = query.toLowerCase()
    const matches = MOCK_PATIENTS.filter(
      (p) =>
        p.id.toLowerCase().includes(q) ||
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.email.toLowerCase().includes(q)
    )

    if (matches.length === 0) {
      return { content: [{ type: "text" as const, text: `No patients found matching "${query}".` }] }
    }

    const results = matches.map((p) => [
      `**${p.firstName} ${p.lastName}** (${p.id})`,
      `  DOB: ${p.dateOfBirth} | Phone: ${p.phone}`,
      `  Insurance: ${p.primaryPayer} (${p.memberId})`,
      `  Status: ${p.status} | Balance: $${p.outstandingBalance.toFixed(2)}`,
      p.nextAppointment ? `  Next Appt: ${p.nextAppointment}` : `  No upcoming appointments`,
    ].join("\n"))

    return {
      content: [{ type: "text" as const, text: `Found ${matches.length} patient(s):\n\n${results.join("\n\n")}` }],
    }
  }
)

export const getPatientDetails = tool(
  "get_patient_details",
  "Get detailed information for a specific patient including insurance, balance, notes, and visit history.",
  {
    patientId: z.string().describe("Patient ID (e.g. PAT-1001)"),
  },
  async ({ patientId }) => {
    console.log(`[Oscar Tool] get_patient_details called with: ${patientId}`)
    const patient = MOCK_PATIENTS.find((p) => p.id === patientId)

    if (!patient) {
      return { content: [{ type: "text" as const, text: `Patient ${patientId} not found.` }] }
    }

    const detail = [
      `# Patient: ${patient.firstName} ${patient.lastName}`,
      `- **ID**: ${patient.id}`,
      `- **DOB**: ${patient.dateOfBirth}`,
      `- **Phone**: ${patient.phone}`,
      `- **Email**: ${patient.email}`,
      `- **Status**: ${patient.status}`,
      ``,
      `## Insurance`,
      `- **Primary Payer**: ${patient.primaryPayer}`,
      `- **Member ID**: ${patient.memberId}`,
      ``,
      `## Financial`,
      `- **Outstanding Balance**: $${patient.outstandingBalance.toFixed(2)}`,
      `- **Last Visit**: ${patient.lastVisit}`,
      patient.nextAppointment ? `- **Next Appointment**: ${patient.nextAppointment}` : `- **Next Appointment**: None scheduled`,
      ``,
      `## Notes`,
      patient.notes || "No notes.",
      ``,
      `_Warning: PHI accessed: patient demographics and financial information._`,
    ].join("\n")

    return { content: [{ type: "text" as const, text: detail }] }
  }
)
