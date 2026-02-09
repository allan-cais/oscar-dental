"use client"

import { Sparkles } from "lucide-react"
import { useChatContext } from "@/lib/chat-context"
import { getSuggestedPrompts } from "./mock-chat-service"

interface ChatEmptyStateProps {
  onSendMessage: (content: string) => void
}

export function ChatEmptyState({ onSendMessage }: ChatEmptyStateProps) {
  const { section } = useChatContext()
  const prompts = getSuggestedPrompts(section)

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="rounded-full bg-primary/10 p-3 mb-4">
        <Sparkles className="size-6 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-1">Ask Oscar anything</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-[280px]">
        I can help with patient lookups, claims, scheduling, denials, and more.
      </p>
      <div className="flex flex-col gap-2 w-full max-w-[300px]">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSendMessage(prompt)}
            className="text-left text-sm px-3 py-2 rounded-lg border border-border hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}
