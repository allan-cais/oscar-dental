import { tool } from "@anthropic-ai/claude-agent-sdk"
import { z } from "zod"
import { MOCK_CLAIMS } from "../mock-data.js"

export const getClaimsSummary = tool(
  "get_claims_summary",
  "Get a summary of the claims pipeline with optional filters by status, payer, or patient.",
  {
    status: z.enum(["draft", "scrubbed", "submitted", "pending", "paid", "denied", "appealed"]).optional().describe("Filter by claim status"),
    patientId: z.string().optional().describe("Filter by patient ID"),
    payer: z.string().optional().describe("Filter by payer name (partial match)"),
  },
  async ({ status, patientId, payer }) => {
    console.log(`[Oscar Tool] get_claims_summary called`, { status, patientId, payer })
    let claims = [...MOCK_CLAIMS]

    if (status) claims = claims.filter((c) => c.status === status)
    if (patientId) claims = claims.filter((c) => c.patientId === patientId)
    if (payer) claims = claims.filter((c) => c.payer.toLowerCase().includes(payer.toLowerCase()))

    if (claims.length === 0) {
      return { content: [{ type: "text" as const, text: "No claims match the specified filters." }] }
    }

    const summary = [
      `## Claims Summary (${claims.length} claims)`,
      ``,
      `| Claim ID | Patient | Payer | Codes | Amount | Status | Days in A/R |`,
      `|----------|---------|-------|-------|--------|--------|-------------|`,
      ...claims.map((c) =>
        `| ${c.id} | ${c.patientName} | ${c.payer} | ${c.procedureCodes.join(", ")} | $${c.totalCharge.toFixed(2)} | ${c.status} | ${c.daysInAr ?? "—"} |`
      ),
      ``,
      `**Total charges**: $${claims.reduce((s, c) => s + c.totalCharge, 0).toFixed(2)}`,
    ]

    const denied = claims.filter((c) => c.status === "denied")
    if (denied.length > 0) {
      summary.push(``, `Warning: **${denied.length} denied claim(s)** requiring attention.`)
    }

    return { content: [{ type: "text" as const, text: summary.join("\n") }] }
  }
)

export const getClaimDetail = tool(
  "get_claim_detail",
  "Get detailed information about a specific claim including procedure codes, payer, status, and denial info if applicable.",
  {
    claimId: z.string().describe("Claim ID (e.g. CLM-9823)"),
  },
  async ({ claimId }) => {
    console.log(`[Oscar Tool] get_claim_detail called with: ${claimId}`)
    const claim = MOCK_CLAIMS.find((c) => c.id === claimId)

    if (!claim) {
      return { content: [{ type: "text" as const, text: `Claim ${claimId} not found.` }] }
    }

    const lines = [
      `# Claim ${claim.id}`,
      `- **Patient**: ${claim.patientName} (${claim.patientId})`,
      `- **Payer**: ${claim.payer}`,
      `- **Status**: ${claim.status}`,
      `- **Total Charge**: $${claim.totalCharge.toFixed(2)}`,
      claim.paidAmount !== undefined ? `- **Paid Amount**: $${claim.paidAmount.toFixed(2)}` : null,
      claim.submittedDate ? `- **Submitted**: ${claim.submittedDate}` : null,
      claim.daysInAr !== undefined ? `- **Days in A/R**: ${claim.daysInAr}` : null,
      ``,
      `## Procedures`,
      ...claim.procedureCodes.map((code, i) => `- **${code}**: ${claim.procedureDescriptions[i]}`),
    ].filter(Boolean)

    if (claim.denialCode) {
      lines.push(
        ``,
        `## Denial Information`,
        `- **Denial Code**: ${claim.denialCode}`,
        `- **Reason**: ${claim.denialReason}`,
      )
    }

    return { content: [{ type: "text" as const, text: lines.join("\n") }] }
  }
)
