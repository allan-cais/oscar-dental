"use client"

import { Badge } from "@/components/ui/badge"

interface ChatPersonaBadgeProps {
  persona: "read_only" | "read_action" | "full"
}

const PERSONA_CONFIG = {
  read_only: { label: "Read Only", className: "bg-blue-100 text-blue-700 hover:bg-blue-100" },
  read_action: { label: "Read + Action", className: "bg-amber-100 text-amber-700 hover:bg-amber-100" },
  full: { label: "Full Access", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" },
}

export function ChatPersonaBadge({ persona }: ChatPersonaBadgeProps) {
  const config = PERSONA_CONFIG[persona]
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium border-0 ${config.className}`}>
      {config.label}
    </Badge>
  )
}
