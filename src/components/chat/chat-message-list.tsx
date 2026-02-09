"use client"

import { useRef, useEffect } from "react"
import { ChatMessage } from "./chat-message"
import type { ChatMessage as ChatMessageType } from "./use-chat"

interface ChatMessageListProps {
  messages: ChatMessageType[]
}

export function ChatMessageList({ messages }: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
      <div className="flex flex-col gap-3">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
