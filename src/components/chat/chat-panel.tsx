"use client"

import { useState, useEffect } from "react"
import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChatPersonaBadge } from "./chat-persona-badge"
import { ChatContextBanner } from "./chat-context-banner"
import { ChatEmptyState } from "./chat-empty-state"
import { ChatMessageList } from "./chat-message-list"
import { ChatInput } from "./chat-input"
import { useChat } from "./use-chat"
import { useDemoChat } from "./use-demo-chat"

type Persona = "read_only" | "read_action" | "full"

/** Section label map for agent identity display */
const SECTION_LABELS: Record<string, string> = {
  dashboard: "Team Lead",
  patients: "Patients",
  scheduling: "Scheduling",
  rcm: "Revenue Cycle",
  payments: "Payments",
  reputation: "Reputation",
  ai: "AI Actions",
  tasks: "Tasks",
  settings: "Settings",
  health: "System Health",
}

interface ChatPanelProps {
  persona?: Persona
}

export function ChatPanel({ persona = "read_action" }: ChatPanelProps) {
  const [isDemoMode, setIsDemoMode] = useState(true)

  // Check if agent API is available
  useEffect(() => {
    async function checkApi() {
      try {
        const res = await fetch("/api/chat", { method: "GET" })
        if (res.ok) {
          const data = await res.json()
          setIsDemoMode(data.status !== "ready")
        }
      } catch {
        setIsDemoMode(true)
      }
    }
    checkApi()
  }, [])

  const liveChat = useChat({ persona })
  const demoChat = useDemoChat()
  const chat = isDemoMode ? demoChat : liveChat

  const hasMessages = chat.messages.length > 0

  // Section label for agent identity
  const agentSection = isDemoMode ? "dashboard" : (liveChat.agentSection || "dashboard")
  const sectionLabel = SECTION_LABELS[agentSection] || agentSection

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Oscar AI</span>
          {!isDemoMode && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
              {sectionLabel}
            </span>
          )}
          <ChatPersonaBadge persona={persona} />
          {isDemoMode && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
              Demo
            </span>
          )}
        </div>
        {hasMessages && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={chat.startNewConversation}
            title="New conversation"
          >
            <RotateCcw className="size-4" />
          </Button>
        )}
      </div>

      {/* Context banner */}
      <ChatContextBanner />

      {/* Messages or Empty State */}
      {hasMessages ? (
        <ChatMessageList messages={chat.messages} />
      ) : (
        <ChatEmptyState onSendMessage={chat.sendMessage} />
      )}

      {/* Error banner */}
      {chat.error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-950/20 border-t text-xs text-red-600 dark:text-red-400">
          {chat.error}
        </div>
      )}

      {/* Input */}
      <ChatInput onSend={chat.sendMessage} disabled={chat.isGenerating} />
    </div>
  )
}
