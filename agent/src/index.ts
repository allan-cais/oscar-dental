/**
 * Oscar Agent — Main Entry Point
 * Exports createOscarAgent() factory for use by the Next.js API route.
 */

import { query } from "@anthropic-ai/claude-agent-sdk"
import { createOscarMcpServer } from "./tools/index.js"
import { buildSystemPrompt, type TeamConfig } from "./system-prompt.js"
import { getToolsForPersona } from "./personas.js"
import type { ChatContext, Persona, ChatMessage } from "./types.js"

export interface CreateOscarAgentOptions {
  message: string
  context: ChatContext
  persona: Persona
  conversationHistory?: ChatMessage[]
  teamConfig?: TeamConfig
}

/**
 * Create an Oscar agent instance that processes a user message
 * with context-aware tools and persona-gated access.
 *
 * Returns an async generator that yields SDK messages as the agent works.
 */
export function createOscarAgent(options: CreateOscarAgentOptions) {
  const { message, context, persona, conversationHistory, teamConfig } = options

  // Get persona-gated tool names
  const toolNames = getToolsForPersona(persona)

  // Create MCP server with only the tools this persona can access
  const mcpServer = createOscarMcpServer(toolNames)

  // Build context-aware system prompt with optional team config
  const systemPrompt = buildSystemPrompt(persona, context, teamConfig)

  // Build the prompt — for now just the current message
  // In future, conversationHistory will be woven into multi-turn context
  const prompt = message

  return query({
    prompt,
    options: {
      systemPrompt,
      mcpServers: { "oscar-tools": mcpServer },
      allowedTools: toolNames.map((t) => `mcp__oscar-tools__${t}`),
      maxTurns: 10,
    },
  })
}

// Re-export types for convenience
export type { ChatContext, Persona, ChatMessage, ChatRequest, SSEEvent } from "./types.js"
export type { TeamConfig } from "./system-prompt.js"
export { getToolsForPersona, personaFromRole, personaLabel } from "./personas.js"
export { TOOL_REGISTRY } from "./types.js"
