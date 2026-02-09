import { tool } from "@anthropic-ai/claude-agent-sdk"
import { z } from "zod"
import { MOCK_DENIALS, MOCK_AR_SUMMARY } from "../mock-data.js"

export const getDenialDetails = tool(
  "get_denial_details",
  "Get denial details including denial code, reason, appeal deadline, and AI-suggested action. Returns all denials if no ID specified.",
  {
    denialId: z.string().optional().describe("Specific denial ID (e.g. DEN-301). Omit to see all denials."),
  },
  async ({ denialId }) => {
    console.log(`[Oscar Tool] get_denial_details called`, { denialId })

    const denials = denialId
      ? MOCK_DENIALS.filter((d) => d.id === denialId)
      : MOCK_DENIALS

    if (denials.length === 0) {
      return { content: [{ type: "text" as const, text: denialId ? `Denial ${denialId} not found.` : "No active denials." }] }
    }

    const lines: string[] = [`## Denials (${denials.length})`]

    for (const d of denials) {
      lines.push(
        ``,
        `### ${d.id} — ${d.patientName}`,
        `- **Claim**: ${d.claimId} | **Payer**: ${d.payer}`,
        `- **Denial Code**: ${d.denialCode} (${d.denialCategory})`,
        `- **Reason**: ${d.denialReason}`,
        `- **Amount**: $${d.claimAmount.toFixed(2)}`,
        `- **Denied Date**: ${d.deniedDate}`,
        `- **Appeal Deadline**: ${d.appealDeadline}`,
        `- **Status**: ${d.status}`,
        d.assignedTo ? `- **Assigned To**: ${d.assignedTo}` : `- **Assigned To**: Unassigned`,
        `- **Procedures**: ${d.procedureCodes.join(", ")}`,
        ``,
        `**AI Recommended Action**: ${d.aiSuggestedAction}`,
      )
    }

    return { content: [{ type: "text" as const, text: lines.join("\n") }] }
  }
)

export const getArSummary = tool(
  "get_ar_summary",
  "Get the accounts receivable aging summary including insurance and patient A/R buckets, and top payer performance.",
  {},
  async () => {
    console.log(`[Oscar Tool] get_ar_summary called`)
    const ar = MOCK_AR_SUMMARY

    const lines = [
      `## Accounts Receivable Summary`,
      `- **Total Outstanding**: $${ar.totalOutstanding.toFixed(2)}`,
      `- **Total Claims**: ${ar.totalClaims}`,
      `- **Average Days in A/R**: ${ar.averageDaysInAr}`,
      ``,
      `### Insurance A/R Aging`,
      `| Aging Bucket | Claims | Amount | % of Total |`,
      `|-------------|--------|--------|-----------|`,
      ...ar.insuranceBuckets.map((b) =>
        `| ${b.range} | ${b.claimCount} | $${b.totalAmount.toFixed(2)} | ${b.percentOfTotal}% |`
      ),
      ``,
      `### Patient A/R Aging`,
      `| Aging Bucket | Claims | Amount | % of Total |`,
      `|-------------|--------|--------|-----------|`,
      ...ar.patientBuckets.map((b) =>
        `| ${b.range} | ${b.claimCount} | $${b.totalAmount.toFixed(2)} | ${b.percentOfTotal}% |`
      ),
      ``,
      `### Top Payers by Outstanding`,
      `| Payer | Outstanding | Avg Days | Denial Rate |`,
      `|-------|------------|----------|-------------|`,
      ...ar.topPayers.map((p) =>
        `| ${p.payer} | $${p.amount.toFixed(2)} | ${p.avgDays} | ${p.denialRate}% |`
      ),
    ]

    return { content: [{ type: "text" as const, text: lines.join("\n") }] }
  }
)
