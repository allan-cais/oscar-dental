"use client"

import { Wrench, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import type { ChatMessage as ChatMessageType } from "./use-chat"
import { ChatToolConfirmation } from "./chat-tool-confirmation"

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  switch (message.role) {
    case "user":
      return <UserMessage content={message.content} />
    case "assistant":
      return <AssistantMessage content={message.content} />
    case "tool_call":
      if (message.toolStatus === "pending_confirmation" || message.toolStatus === "rejected") {
        return <ChatToolConfirmation message={message} onConfirm={() => {}} onReject={() => {}} />
      }
      return <ToolCallMessage message={message} />
    case "agent_message":
      return <AgentMessageBubble message={message} />
    case "tool_result":
      return null // Tool results are shown as part of assistant response
    case "system":
      return <SystemMessage content={message.content} />
    default:
      return null
  }
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-4 py-2.5">
        <p className="text-sm whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  )
}

function AssistantMessage({ content }: { content: string }) {
  if (!content) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-muted px-4 py-2.5">
          <TypingIndicator />
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-muted px-4 py-2.5">
        <div className="text-sm prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:mt-2 [&_h3]:mb-1 [&_table]:text-xs [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1">
          <SimpleMarkdown content={content} />
        </div>
      </div>
    </div>
  )
}

function ToolCallMessage({ message }: { message: ChatMessageType }) {
  const statusIcon = message.toolStatus === "running" ? (
    <Loader2 className="size-3.5 animate-spin text-blue-500" />
  ) : message.toolStatus === "success" ? (
    <CheckCircle2 className="size-3.5 text-emerald-500" />
  ) : message.toolStatus === "error" ? (
    <XCircle className="size-3.5 text-red-500" />
  ) : null

  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border text-xs text-muted-foreground">
        <Wrench className="size-3.5" />
        <span className="font-medium">{message.toolName}</span>
        {statusIcon}
      </div>
    </div>
  )
}

function AgentMessageBubble({ message }: { message: ChatMessageType }) {
  const fromLabel = message.fromAgent
    ? message.fromAgent.charAt(0).toUpperCase() + message.fromAgent.slice(1)
    : "Agent"

  return (
    <div className="flex justify-start pl-4">
      <div className="max-w-[85%] rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-4 py-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          <div className="size-4 rounded-full bg-blue-500 flex items-center justify-center">
            <span className="text-[9px] font-bold text-white">
              {(message.fromAgent || "A").charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
            {fromLabel} Agent
          </span>
          <span className="text-[10px] text-muted-foreground">&#8594; You</span>
        </div>
        <p className="text-sm text-foreground">{message.content}</p>
      </div>
    </div>
  )
}

function SystemMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-center">
      <p className="text-xs text-muted-foreground/70 py-1">{content}</p>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1">
      <div className="size-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
      <div className="size-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
      <div className="size-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
    </div>
  )
}

/**
 * Simple markdown renderer for chat messages.
 * Handles: bold, code blocks, inline code, bullets, headings, tables, line breaks.
 */
function SimpleMarkdown({ content }: { content: string }) {
  // Split by code blocks first
  const parts = content.split(/(```[\s\S]*?```)/g)

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const code = part.replace(/^```\w*\n?/, "").replace(/\n?```$/, "")
          return (
            <pre key={i} className="bg-background/50 rounded-md p-2 overflow-x-auto my-2">
              <code className="text-xs">{code}</code>
            </pre>
          )
        }

        // Process inline markdown
        const lines = part.split("\n")
        return (
          <div key={i}>
            {lines.map((line, j) => {
              const trimmed = line.trim()
              if (!trimmed) return <br key={j} />

              // Headings
              if (trimmed.startsWith("### ")) return <h3 key={j}>{processInline(trimmed.slice(4))}</h3>
              if (trimmed.startsWith("## ")) return <h2 key={j}>{processInline(trimmed.slice(3))}</h2>
              if (trimmed.startsWith("# ")) return <h2 key={j}>{processInline(trimmed.slice(2))}</h2>

              // Bullet lists
              if (trimmed.startsWith("- ")) {
                return <div key={j} className="flex gap-1.5 ml-1"><span className="text-muted-foreground">•</span><span>{processInline(trimmed.slice(2))}</span></div>
              }

              // Table rows
              if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
                if (trimmed.match(/^\|[\s-|]+\|$/)) return null // separator row
                const cells = trimmed.split("|").filter(Boolean).map(c => c.trim())
                return (
                  <div key={j} className="flex gap-2 text-xs py-0.5">
                    {cells.map((cell, k) => (
                      <span key={k} className="flex-1 min-w-0 truncate">{processInline(cell)}</span>
                    ))}
                  </div>
                )
              }

              // Horizontal rules
              if (trimmed === "---") return <hr key={j} className="my-2 border-border" />

              // Regular paragraph
              return <p key={j}>{processInline(trimmed)}</p>
            })}
          </div>
        )
      })}
    </>
  )
}

function processInline(text: string): React.ReactNode {
  // Process bold, inline code, and italics
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
    // Inline code
    const codeMatch = remaining.match(/`([^`]+)`/)
    // Italic (underscore)
    const italicMatch = remaining.match(/_([^_]+)_/)

    // Find the earliest match
    const matches = [
      boldMatch ? { type: "bold", match: boldMatch, index: boldMatch.index! } : null,
      codeMatch ? { type: "code", match: codeMatch, index: codeMatch.index! } : null,
      italicMatch ? { type: "italic", match: italicMatch, index: italicMatch.index! } : null,
    ].filter(Boolean).sort((a, b) => a!.index - b!.index)

    if (matches.length === 0) {
      parts.push(remaining)
      break
    }

    const earliest = matches[0]!
    if (earliest.index > 0) {
      parts.push(remaining.slice(0, earliest.index))
    }

    if (earliest.type === "bold") {
      parts.push(<strong key={key++}>{earliest.match![1]}</strong>)
    } else if (earliest.type === "code") {
      parts.push(<code key={key++} className="bg-muted px-1 py-0.5 rounded text-xs">{earliest.match![1]}</code>)
    } else if (earliest.type === "italic") {
      parts.push(<em key={key++} className="text-muted-foreground">{earliest.match![1]}</em>)
    }

    remaining = remaining.slice(earliest.index + earliest.match![0].length)
  }

  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : <>{parts}</>
}
