"use client"

import { useChatContext } from "@/lib/chat-context"

export function ChatContextBanner() {
  const { section, entityType, entityId, entityData, pageTitle } = useChatContext()

  const label = entityData?.name
    ? `${pageTitle} — ${entityData.name}`
    : pageTitle || section

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-muted/50 border-b text-xs text-muted-foreground">
      <span className="font-medium">Viewing:</span>
      <span>{label}</span>
      {entityType && entityId && (
        <span className="text-muted-foreground/70">({entityType} {entityId})</span>
      )}
    </div>
  )
}
