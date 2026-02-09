import { tool } from "@anthropic-ai/claude-agent-sdk"
import { z } from "zod"
import { MOCK_DENIALS, MOCK_PATIENTS } from "../mock-data.js"

export const generateAppealLetter = tool(
  "generate_appeal_letter",
  "Generate an AI-drafted appeal letter for a denied claim. This is an ACTION tool that requires user confirmation.",
  {
    denialId: z.string().describe("Denial ID to generate appeal for (e.g. DEN-301)"),
    additionalContext: z.string().optional().describe("Additional clinical notes or context to include in the appeal"),
  },
  async ({ denialId, additionalContext }) => {
    console.log(`[Oscar Tool] generate_appeal_letter called`, { denialId, additionalContext })

    const denial = MOCK_DENIALS.find((d) => d.id === denialId)
    if (!denial) {
      return { content: [{ type: "text" as const, text: `Denial ${denialId} not found.` }] }
    }

    const patient = MOCK_PATIENTS.find((p) => p.id === denial.patientId)
    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : denial.patientName

    const letter = [
      `## Appeal Letter Draft — ${denial.id}`,
      ``,
      `**Date**: ${new Date().toISOString().split("T")[0]}`,
      `**To**: ${denial.payer} — Claims Review Department`,
      `**Re**: Appeal of Claim ${denial.claimId}`,
      `**Patient**: ${patientName}`,
      `**Member ID**: ${patient?.memberId || "N/A"}`,
      `**Denial Code**: ${denial.denialCode}`,
      ``,
      `---`,
      ``,
      `Dear Claims Review Department,`,
      ``,
      `I am writing to formally appeal the denial of claim ${denial.claimId} for patient ${patientName}, denied on ${denial.deniedDate} with denial code ${denial.denialCode}.`,
      ``,
      `**Denial Reason**: ${denial.denialReason}`,
      ``,
      `**Clinical Justification**:`,
      getAppealJustification(denial.denialCategory, denial.procedureCodes),
      additionalContext ? `\n**Additional Notes**: ${additionalContext}` : "",
      ``,
      `We respectfully request a review of this denial and approval of the submitted claim for $${denial.claimAmount.toFixed(2)}. Supporting clinical documentation, including radiographs and clinical notes, is enclosed.`,
      ``,
      `Please contact our office at (512) 555-0100 if additional information is needed.`,
      ``,
      `Sincerely,`,
      `Canopy Dental — Billing Department`,
      ``,
      `---`,
      `_Warning: This is an AI-generated draft. Review and customize before submission._`,
      `_Appeal deadline: ${denial.appealDeadline}_`,
    ]

    return { content: [{ type: "text" as const, text: letter.join("\n") }] }
  }
)

function getAppealJustification(category: string, procedureCodes: string[]): string {
  switch (category) {
    case "pre_auth":
      return `The procedure(s) ${procedureCodes.join(", ")} were performed as clinically necessary treatment. We are requesting retroactive authorization based on the enclosed clinical documentation demonstrating medical necessity. The patient presented with symptoms requiring immediate intervention, and delaying treatment for pre-authorization would have resulted in further deterioration of the patient's dental health.`
    case "frequency":
      return `While we acknowledge the frequency limitation noted in the denial, the procedures ${procedureCodes.join(", ")} were performed due to documented medical necessity beyond routine care. The enclosed clinical records, including periodontal charting, radiographic evidence, and clinical photographs, demonstrate that these procedures were required to address active disease progression.`
    case "not_covered":
      return `The procedures ${procedureCodes.join(", ")} are recognized as standard of care by the American Dental Association. We believe this denial represents a misapplication of coverage terms. The enclosed documentation demonstrates that these services fall within the patient's benefit coverage as medically necessary treatment.`
    case "missing_info":
      return `We are resubmitting this claim with the previously missing documentation now enclosed. All required attachments, including clinical notes, radiographs, and the applicable narrative, are included with this appeal.`
    case "coding_error":
      return `Upon review, we have identified and corrected the coding discrepancy. The procedures ${procedureCodes.join(", ")} have been verified against ADA CDT coding guidelines. The corrected claim information is enclosed.`
    default:
      return `The procedures ${procedureCodes.join(", ")} were performed as clinically necessary treatment. Enclosed documentation supports the medical necessity of these services.`
  }
}
