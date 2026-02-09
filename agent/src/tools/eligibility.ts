import { tool } from "@anthropic-ai/claude-agent-sdk"
import { z } from "zod"
import { MOCK_PATIENTS, MOCK_ELIGIBILITY_RESULTS } from "../mock-data.js"

export const runEligibilityCheck = tool(
  "run_eligibility_check",
  "Run a real-time eligibility verification for a patient. This is an ACTION tool that requires user confirmation.",
  {
    patientId: z.string().describe("Patient ID to verify eligibility for"),
    payerId: z.string().optional().describe("Specific payer to check (defaults to patient's primary)"),
  },
  async ({ patientId, payerId }) => {
    console.log(`[Oscar Tool] run_eligibility_check called`, { patientId, payerId })

    const patient = MOCK_PATIENTS.find((p) => p.id === patientId)
    if (!patient) {
      return { content: [{ type: "text" as const, text: `Patient ${patientId} not found.` }] }
    }

    const result = MOCK_ELIGIBILITY_RESULTS[patientId]
    if (!result) {
      // Simulate a check for patients without cached results
      return {
        content: [{
          type: "text" as const,
          text: [
            `## Eligibility Verification — ${patient.firstName} ${patient.lastName}`,
            `- **Payer**: ${payerId || patient.primaryPayer}`,
            `- **Member ID**: ${patient.memberId}`,
            `- **Status**: Active`,
            `- **Verified At**: ${new Date().toISOString()}`,
            ``,
            `_Real-time verification completed. Coverage is active. Detailed benefits not available in demo mode._`,
          ].join("\n"),
        }],
      }
    }

    const lines = [
      `## Eligibility Verification — ${result.patientName}`,
      `- **Payer**: ${result.payer}`,
      `- **Member ID**: ${result.memberId}`,
      `- **Status**: ${result.status === "active" ? "Active" : result.status}`,
      `- **Plan Type**: ${result.planType}`,
      `- **Effective Date**: ${result.effectiveDate}`,
      result.terminationDate ? `- **Termination Date**: ${result.terminationDate}` : null,
      ``,
      `### Benefits`,
      `- **Annual Deductible**: $${result.deductible.annual} (Remaining: $${result.deductible.remaining})`,
      `- **Annual Maximum**: $${result.maximums.annual} (Remaining: $${result.maximums.remaining})`,
      ``,
      `### Coverage Levels`,
      `- Preventive: ${result.coverageLevels.preventive}%`,
      `- Basic: ${result.coverageLevels.basic}%`,
      `- Major: ${result.coverageLevels.major}%`,
      result.coverageLevels.orthodontic !== undefined ? `- Orthodontic: ${result.coverageLevels.orthodontic}%` : null,
      result.waitingPeriods && result.waitingPeriods.length > 0 ? `\n### Waiting Periods\n${result.waitingPeriods.map((w) => `- ${w}`).join("\n")}` : null,
      ``,
      `_Verified at: ${result.verifiedAt}_`,
    ]

    return { content: [{ type: "text" as const, text: lines.filter(Boolean).join("\n") }] }
  }
)
