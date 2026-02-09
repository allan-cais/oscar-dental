"use client"

import { Plus, MessageSquare, Archive } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Conversation {
  id: string
  title: string
  lastMessageAt: number
  messageCount: number
  status: "active" | "archived"
}

interface ChatHistoryListProps {
  conversations: Conversation[]
  activeConversationId?: string
  onSelectConversation: (id: string) => void
  onNewConversation: () => void
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function ChatHistoryList({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
}: ChatHistoryListProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="text-sm font-semibold">Conversations</h3>
        <Button variant="ghost" size="icon-sm" onClick={onNewConversation} title="New conversation">
          <Plus className="size-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No conversations yet
          </div>
        ) : (
          <div className="py-1">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors ${
                  conv.id === activeConversationId ? "bg-muted" : ""
                }`}
              >
                {conv.status === "archived" ? (
                  <Archive className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
                ) : (
                  <MessageSquare className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{conv.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {conv.messageCount} messages · {formatTimeAgo(conv.lastMessageAt)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
