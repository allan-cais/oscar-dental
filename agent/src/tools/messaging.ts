import { tool } from "@anthropic-ai/claude-agent-sdk"
import { z } from "zod"

/**
 * Runtime store for outgoing agent messages.
 * The API route reads this after each agent turn to persist to Convex.
 */
let pendingOutbox: Array<{ toAgent: string; content: string; messageType: string }> = []

/** Get and clear the outgoing message buffer */
export function drainOutbox() {
  const msgs = [...pendingOutbox]
  pendingOutbox = []
  return msgs
}

/** Pre-loaded inbox messages (injected by the API route before each turn) */
let inboxMessages: Array<{ from: string; content: string; timestamp: number }> = []

/** Set inbox messages before an agent turn */
export function setInbox(messages: typeof inboxMessages) {
  inboxMessages = messages
}

export const sendAgentMessage = tool(
  "send_agent_message",
  "Send a message to another Oscar agent specialist. Use this to request data or delegate questions to the appropriate domain expert. Available agents: patients, scheduling, rcm, dashboard.",
  {
    toAgent: z.string().describe("Target agent section: 'patients', 'scheduling', 'rcm', or 'dashboard'"),
    content: z.string().describe("Message content to send to the other agent"),
    messageType: z.enum(["message", "broadcast", "escalate"]).default("message").describe("Message type: 'message' for direct, 'broadcast' for all agents, 'escalate' for team lead"),
  },
  async ({ toAgent, content, messageType }) => {
    console.log(`[Oscar Agent] send_agent_message: ${messageType} to ${toAgent}`)
    pendingOutbox.push({ toAgent, content, messageType })
    return {
      content: [{
        type: "text" as const,
        text: `Message sent to **${toAgent}** agent. They will receive it on their next interaction.\n\n> "${content.slice(0, 100)}${content.length > 100 ? "..." : ""}"`,
      }],
    }
  }
)

export const checkAgentInbox = tool(
  "check_agent_inbox",
  "Check your inbox for messages from other Oscar agent specialists. Messages are delivered when users interact with your section.",
  {},
  async () => {
    console.log(`[Oscar Agent] check_agent_inbox: ${inboxMessages.length} messages`)
    if (inboxMessages.length === 0) {
      return {
        content: [{ type: "text" as const, text: "No new messages from other agents." }],
      }
    }

    const formatted = inboxMessages
      .map((m) => `**From ${m.from}**: ${m.content}`)
      .join("\n\n")

    return {
      content: [{ type: "text" as const, text: `You have ${inboxMessages.length} message(s):\n\n${formatted}` }],
    }
  }
)
