"use client"

import { useState, useCallback } from "react"
import { useChatContext } from "@/lib/chat-context"
import { getMockResponse } from "./mock-chat-service"
import type { ChatMessage } from "./use-chat"

interface UseDemoChatReturn {
  messages: ChatMessage[]
  isGenerating: boolean
  sendMessage: (content: string) => Promise<void>
  startNewConversation: () => void
  error: null // Demo mode never has errors
}

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Demo mode chat hook -- same interface as useChat but uses mock responses.
 * Active when ANTHROPIC_API_KEY is not set or agent is unavailable.
 */
export function useDemoChat(): UseDemoChatReturn {
  const chatContext = useChatContext()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  const sendMessage = useCallback(async (content: string) => {
    if (isGenerating) return

    // Add user message
    const userMsg: ChatMessage = {
      id: generateId(),
      role: "user",
      content,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])
    setIsGenerating(true)

    const mockResponse = getMockResponse(content, chatContext.section)

    // Simulate tool calls if present
    if (mockResponse.toolCalls) {
      for (const tc of mockResponse.toolCalls) {
        await new Promise((r) => setTimeout(r, 400))
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: "tool_call",
            content: `Calling ${tc.name}...`,
            toolName: tc.name,
            toolArgs: tc.args,
            toolStatus: "running",
            timestamp: Date.now(),
          },
        ])

        await new Promise((r) => setTimeout(r, 600))
        setMessages((prev) =>
          prev.map((m) =>
            m.toolName === tc.name && m.toolStatus === "running"
              ? { ...m, toolStatus: "success" as const }
              : m
          )
        )
      }
    }

    // Simulate streaming delay
    await new Promise((r) => setTimeout(r, mockResponse.delay))

    // Simulate typing by adding content progressively
    const assistantId = generateId()
    const words = mockResponse.content.split(" ")

    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      },
    ])

    // Stream words in chunks
    const chunkSize = 3
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(" ") + " "
      await new Promise((r) => setTimeout(r, 30))
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: m.content + chunk } : m
        )
      )
    }

    setIsGenerating(false)
  }, [isGenerating, chatContext.section])

  const startNewConversation = useCallback(() => {
    setMessages([])
    setIsGenerating(false)
  }, [])

  return { messages, isGenerating, sendMessage, startNewConversation, error: null }
}
