/**
 * Oscar Consult Agent — API Route
 *
 * GET  /api/chat — Health check (is ANTHROPIC_API_KEY configured?)
 * POST /api/chat — SSE stream: bridges chat UI to the Oscar agent SDK
 *
 * The route creates a per-section agent with team awareness,
 * injects pending inbox messages, and streams events via SSE.
 */

import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 120 // 2 min timeout for long agent turns

// ── V1 Agent Team Constants ─────────────────────────────────────────────────

const V1_SPECIALISTS = ["dashboard", "patients", "scheduling", "rcm"]
const ALL_SECTIONS = [
  "dashboard", "patients", "scheduling", "rcm",
  "payments", "reputation", "ai", "tasks", "settings", "health",
]

function getTeammatesForSection(section: string): string[] {
  return ALL_SECTIONS.filter((s) => s !== section)
}

// ── GET: Health Check ───────────────────────────────────────────────────────

export async function GET() {
  const hasKey = !!process.env.ANTHROPIC_API_KEY
  return NextResponse.json({
    status: hasKey ? "ready" : "not_configured",
    version: "1.0.0",
    agents: V1_SPECIALISTS,
  })
}

// ── POST: Agent SSE Stream ──────────────────────────────────────────────────

interface ChatPostBody {
  message: string
  context: {
    section: string
    entityType?: string
    entityId?: string
    entityData?: Record<string, unknown>
    pageTitle?: string
  }
  persona: "read_only" | "read_action" | "full"
  conversationId?: string
  teamId?: string
  history?: Array<{
    role: string
    content: string
  }>
}

export async function POST(req: NextRequest) {
  // Validate API key
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 503 }
    )
  }

  let body: ChatPostBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    )
  }

  const { message, context, persona = "read_action", teamId } = body

  if (!message || !context?.section) {
    return NextResponse.json(
      { error: "message and context.section are required" },
      { status: 400 }
    )
  }

  // Determine section + team config
  const section = context.section || "dashboard"
  const isTeamLead = section === "dashboard"
  const effectiveTeamId = teamId || `team-${Date.now()}`

  // Build team config for system prompt
  const teamConfig = {
    agentSection: section,
    isTeamLead,
    teammates: getTeammatesForSection(section),
    teamId: effectiveTeamId,
    pendingMessages: [] as Array<{ from: string; content: string }>,
  }

  // SSE response stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      function sendSSE(data: Record<string, unknown>) {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          )
        } catch {
          // Controller closed — client disconnected
        }
      }

      try {
        // Dynamically import agent SDK (ESM module)
        const { createOscarAgent } = await import(
          /* webpackIgnore: true */
          "../../../../agent/src/index.js"
        )

        const agentStream = createOscarAgent({
          message,
          context: {
            section: context.section,
            entityType: context.entityType as any,
            entityId: context.entityId,
            entityData: context.entityData,
            pageTitle: context.pageTitle,
          },
          persona,
          teamConfig,
        })

        // Iterate the async generator
        for await (const sdkMessage of agentStream) {
          switch (sdkMessage.type) {
            // Full assistant response (after all tool calls complete)
            case "assistant": {
              const msg = sdkMessage.message
              if (msg?.content) {
                for (const block of msg.content) {
                  if (block.type === "text") {
                    sendSSE({ type: "text", content: block.text })
                  } else if (block.type === "tool_use") {
                    const toolName = block.name?.replace(
                      "mcp__oscar-tools__",
                      ""
                    )
                    // Detect agent messaging tool calls
                    if (toolName === "send_agent_message") {
                      sendSSE({
                        type: "agent_message",
                        from: section,
                        to: (block.input as any)?.toAgent,
                        content: (block.input as any)?.content,
                        messageType: (block.input as any)?.messageType || "message",
                      })
                    }
                    sendSSE({
                      type: "tool_call",
                      toolName,
                      toolArgs: JSON.stringify(block.input),
                    })
                  }
                }
              }
              break
            }

            // Streaming partial events
            case "stream_event": {
              const event = sdkMessage.event
              if (event?.type === "content_block_delta") {
                const delta = event.delta as any
                if (delta?.type === "text_delta" && delta.text) {
                  sendSSE({ type: "text", content: delta.text })
                }
              }
              break
            }

            // Final result
            case "result": {
              if (sdkMessage.subtype === "success") {
                sendSSE({
                  type: "done",
                  usage: {
                    inputTokens: sdkMessage.usage?.input_tokens ?? 0,
                    outputTokens: sdkMessage.usage?.output_tokens ?? 0,
                  },
                  teamId: effectiveTeamId,
                })
              } else {
                sendSSE({
                  type: "error",
                  error: "Agent execution failed",
                })
              }
              break
            }

            // Skip other message types (system, status, etc.)
            default:
              break
          }
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error"
        console.error("[Oscar API] Agent error:", errorMessage)
        sendSSE({ type: "error", error: errorMessage })
      } finally {
        try {
          controller.close()
        } catch {
          // Already closed
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
