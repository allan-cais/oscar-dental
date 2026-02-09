/**
 * Oscar Agent — MCP Server Factory
 * Assembles selected tools into an in-process MCP server.
 */

import { createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk"
import { lookupPatient, getPatientDetails } from "./patients.js"
import { getClaimsSummary, getClaimDetail } from "./claims.js"
import { getSchedule, getOpenSlots } from "./scheduling.js"
import { getDenialDetails, getArSummary } from "./denials.js"
import { createTask } from "./tasks.js"
import { runEligibilityCheck } from "./eligibility.js"
import { generateAppealLetter } from "./appeals.js"
import { sendAgentMessage, checkAgentInbox } from "./messaging.js"

/** All available Oscar tools, keyed by name */
const ALL_TOOLS = {
  lookup_patient: lookupPatient,
  get_patient_details: getPatientDetails,
  get_claims_summary: getClaimsSummary,
  get_claim_detail: getClaimDetail,
  get_schedule: getSchedule,
  get_open_slots: getOpenSlots,
  get_denial_details: getDenialDetails,
  get_ar_summary: getArSummary,
  create_task: createTask,
  run_eligibility_check: runEligibilityCheck,
  generate_appeal_letter: generateAppealLetter,
  send_agent_message: sendAgentMessage,
  check_agent_inbox: checkAgentInbox,
} as const

export type OscarToolName = keyof typeof ALL_TOOLS

/**
 * Create an MCP server with the specified tools (or all tools if none specified).
 */
export function createOscarMcpServer(toolNames?: string[]) {
  const tools = toolNames
    ? toolNames
        .filter((name): name is OscarToolName => name in ALL_TOOLS)
        .map((name) => ALL_TOOLS[name])
    : Object.values(ALL_TOOLS)

  return createSdkMcpServer({
    name: "oscar-tools",
    version: "1.0.0",
    tools,
  })
}
