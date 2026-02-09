/**
 * Oscar Agent — Shared Types
 */

// ── Chat Context ─────────────────────────────────────────────────────────────

/** Describes the current page/entity the user is viewing in the Oscar dashboard */
export interface ChatContext {
  /** Dashboard section: "dashboard" | "patients" | "scheduling" | "rcm" | "payments" | "reputation" | "ai" | "tasks" | "settings" | "health" */
  section: string
  /** Type of entity being viewed, if any */
  entityType?: "patient" | "claim" | "denial" | "appointment" | "payment_plan" | "review"
  /** ID of the entity being viewed */
  entityId?: string
  /** Loaded entity data (name, status, etc.) for context injection */
  entityData?: Record<string, unknown>
  /** Human-readable page title */
  pageTitle?: string
}

// ── Persona ──────────────────────────────────────────────────────────────────

/** Chat persona mode — controls which tools are available */
export type Persona = "read_only" | "read_action" | "full"

// ── Chat Messages ────────────────────────────────────────────────────────────

export type ChatMessageRole = "user" | "assistant" | "system" | "tool_call" | "tool_result"

export interface ChatMessage {
  id: string
  role: ChatMessageRole
  content: string
  /** Tool name if role is tool_call or tool_result */
  toolName?: string
  /** Tool arguments as JSON string if role is tool_call */
  toolArgs?: string
  /** Tool result content if role is tool_result */
  toolResult?: string
  /** Tool execution status */
  toolStatus?: "pending" | "running" | "success" | "error" | "pending_confirmation" | "rejected"
  /** Whether this message contains PHI */
  containsPhi?: boolean
  /** Categories of PHI present */
  phiCategories?: string[]
  /** Timestamp */
  timestamp: number
}

// ── Chat Request / Response ──────────────────────────────────────────────────

export interface ChatRequest {
  message: string
  context: ChatContext
  persona: Persona
  conversationId?: string
  history?: ChatMessage[]
}

// ── SSE Event Types ──────────────────────────────────────────────────────────

export type SSEEventType = "text" | "tool_call" | "tool_result" | "done" | "error"

export interface SSEEvent {
  type: SSEEventType
  content?: string
  toolName?: string
  toolArgs?: string
  toolResult?: string
  toolStatus?: string
  /** Usage stats on done event */
  usage?: {
    inputTokens: number
    outputTokens: number
  }
  error?: string
}

// ── Tool Metadata ────────────────────────────────────────────────────────────

export type ToolCategory = "read" | "action"

export interface OscarToolMeta {
  name: string
  description: string
  category: ToolCategory
  /** Whether this tool requires HITL confirmation before execution */
  requiresConfirmation: boolean
  /** Which persona levels can access this tool */
  minPersona: Persona
}

/** Registry of all Oscar tools with their metadata */
export const TOOL_REGISTRY: OscarToolMeta[] = [
  // Read tools
  { name: "lookup_patient", description: "Search for patients by name, ID, or phone", category: "read", requiresConfirmation: false, minPersona: "read_only" },
  { name: "get_patient_details", description: "Get detailed patient information", category: "read", requiresConfirmation: false, minPersona: "read_only" },
  { name: "get_claims_summary", description: "Get claims pipeline summary with filters", category: "read", requiresConfirmation: false, minPersona: "read_only" },
  { name: "get_claim_detail", description: "Get detailed information for a specific claim", category: "read", requiresConfirmation: false, minPersona: "read_only" },
  { name: "get_schedule", description: "Get appointment schedule for a date/provider", category: "read", requiresConfirmation: false, minPersona: "read_only" },
  { name: "get_open_slots", description: "Find available appointment slots", category: "read", requiresConfirmation: false, minPersona: "read_only" },
  { name: "get_denial_details", description: "Get denial details and appeal deadlines", category: "read", requiresConfirmation: false, minPersona: "read_only" },
  { name: "get_ar_summary", description: "Get accounts receivable aging summary", category: "read", requiresConfirmation: false, minPersona: "read_only" },
  // Action tools
  { name: "create_task", description: "Create a HITL task for staff follow-up", category: "action", requiresConfirmation: true, minPersona: "read_action" },
  { name: "run_eligibility_check", description: "Run real-time eligibility verification", category: "action", requiresConfirmation: true, minPersona: "read_action" },
  { name: "generate_appeal_letter", description: "Generate an AI-drafted appeal letter", category: "action", requiresConfirmation: true, minPersona: "read_action" },
  // Inter-agent messaging
  { name: "send_agent_message", description: "Send a message to another Oscar agent specialist", category: "action", requiresConfirmation: false, minPersona: "read_action" },
  { name: "check_agent_inbox", description: "Check inbox for messages from other agents", category: "read", requiresConfirmation: false, minPersona: "read_only" },
]
