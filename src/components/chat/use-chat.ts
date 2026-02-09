"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useChatContext } from "@/lib/chat-context"

export type ChatMessageRole = "user" | "assistant" | "system" | "tool_call" | "tool_result" | "agent_message"

export interface ChatMessage {
  id: string
  role: ChatMessageRole
  content: string
  toolName?: string
  toolArgs?: string
  toolResult?: string
  toolStatus?: "pending" | "running" | "success" | "error" | "pending_confirmation" | "rejected"
  /** For agent_message: which agent sent it */
  fromAgent?: string
  /** For agent_message: which agent receives it */
  toAgent?: string
  timestamp: number
}

interface UseChatOptions {
  persona?: "read_only" | "read_action" | "full"
}

interface UseChatReturn {
  messages: ChatMessage[]
  isGenerating: boolean
  sendMessage: (content: string) => Promise<void>
  startNewConversation: () => void
  error: string | null
  /** Current section agent identity */
  agentSection: string
  /** Whether this is the team lead (dashboard) */
  isTeamLead: boolean
}

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Get or create a teamId for inter-agent messaging */
function getTeamId(): string {
  if (typeof window === "undefined") return `team-${Date.now()}`
  const key = "oscar-team-id"
  let teamId = localStorage.getItem(key)
  if (!teamId) {
    teamId = `team-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    localStorage.setItem(key, teamId)
  }
  return teamId
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { persona = "read_action" } = options
  const chatContext = useChatContext()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const teamIdRef = useRef<string>(getTeamId())

  const section = chatContext.section || "dashboard"
  const isTeamLead = section === "dashboard"

  // Reset messages when section changes
  useEffect(() => {
    setMessages([])
    setError(null)
  }, [section])

  const sendMessage = useCallback(async (content: string) => {
    if (isGenerating) return
    setError(null)

    // Add user message
    const userMsg: ChatMessage = {
      id: generateId(),
      role: "user",
      content,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])
    setIsGenerating(true)

    // Create assistant message placeholder for streaming
    const assistantId = generateId()
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, assistantMsg])

    try {
      abortRef.current = new AbortController()

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          context: {
            section: chatContext.section,
            entityType: chatContext.entityType,
            entityId: chatContext.entityId,
            entityData: chatContext.entityData,
            pageTitle: chatContext.pageTitle,
          },
          persona,
          teamId: teamIdRef.current,
        }),
        signal: abortRef.current.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response body")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const jsonStr = line.slice(6).trim()
          if (!jsonStr) continue

          try {
            const event = JSON.parse(jsonStr)

            switch (event.type) {
              case "text":
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + event.content }
                      : m
                  )
                )
                break

              case "tool_call": {
                const toolCallMsg: ChatMessage = {
                  id: generateId(),
                  role: "tool_call",
                  content: `Calling ${event.toolName}...`,
                  toolName: event.toolName,
                  toolArgs: event.toolArgs,
                  toolStatus: "running",
                  timestamp: Date.now(),
                }
                setMessages((prev) => [...prev, toolCallMsg])
                break
              }

              case "tool_result": {
                setMessages((prev) => {
                  const toolResultMsg: ChatMessage = {
                    id: generateId(),
                    role: "tool_result",
                    content: event.toolResult || "Tool completed",
                    toolName: event.toolName,
                    toolResult: event.toolResult,
                    toolStatus: "success",
                    timestamp: Date.now(),
                  }
                  return [...prev, toolResultMsg]
                })
                break
              }

              case "agent_message": {
                const agentMsg: ChatMessage = {
                  id: generateId(),
                  role: "agent_message",
                  content: event.content || "",
                  fromAgent: event.from,
                  toAgent: event.to,
                  timestamp: Date.now(),
                }
                setMessages((prev) => [...prev, agentMsg])
                break
              }

              case "done":
                break

              case "error":
                setError(event.error)
                break
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return
      const errorMessage = err instanceof Error ? err.message : "Failed to send message"
      setError(errorMessage)

      // Update assistant message with error
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId && !m.content
            ? { ...m, content: "Sorry, I encountered an error. Please try again." }
            : m
        )
      )
    } finally {
      setIsGenerating(false)
      abortRef.current = null
    }
  }, [isGenerating, chatContext, persona])

  const startNewConversation = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
    setError(null)
    setIsGenerating(false)
  }, [])

  return {
    messages,
    isGenerating,
    sendMessage,
    startNewConversation,
    error,
    agentSection: section,
    isTeamLead,
  }
}
