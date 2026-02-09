"use client"

import { useState } from "react"
import { CheckCircle2, XCircle, Wrench, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ChatMessage } from "./use-chat"

interface ChatToolConfirmationProps {
  message: ChatMessage
  onConfirm: (messageId: string) => void
  onReject: (messageId: string) => void
}

/** Tool descriptions for the confirmation card */
const TOOL_INFO: Record<string, { label: string; description: string }> = {
  create_task: {
    label: "Create Task",
    description: "Creates a HITL task in the task board for staff follow-up.",
  },
  run_eligibility_check: {
    label: "Run Eligibility Check",
    description: "Performs a real-time eligibility verification with the patient's insurance payer.",
  },
  generate_appeal_letter: {
    label: "Generate Appeal Letter",
    description: "Generates an AI-drafted appeal letter for a denied claim.",
  },
}

export function ChatToolConfirmation({ message, onConfirm, onReject }: ChatToolConfirmationProps) {
  const [expanded, setExpanded] = useState(false)
  const toolInfo = TOOL_INFO[message.toolName || ""] || {
    label: message.toolName || "Unknown Tool",
    description: "This action requires your confirmation.",
  }

  const isPending = message.toolStatus === "pending_confirmation"
  const isRejected = message.toolStatus === "rejected"
  const isConfirmed = message.toolStatus === "success" || message.toolStatus === "running"

  let parsedArgs: Record<string, unknown> = {}
  try {
    parsedArgs = message.toolArgs ? JSON.parse(message.toolArgs) : {}
  } catch {
    // ignore parse errors
  }

  return (
    <div className="flex justify-start">
      <div className={`max-w-[90%] rounded-lg border overflow-hidden ${
        isRejected ? "opacity-60 border-muted" :
        isConfirmed ? "border-emerald-200 dark:border-emerald-800" :
        "border-amber-200 dark:border-amber-800"
      }`}>
        {/* Header */}
        <div className={`flex items-center gap-2 px-3 py-2 ${
          isRejected ? "bg-muted/50" :
          isConfirmed ? "bg-emerald-50 dark:bg-emerald-950/20" :
          "bg-amber-50 dark:bg-amber-950/20"
        }`}>
          <Wrench className="size-3.5 shrink-0" />
          <span className="text-sm font-medium">{toolInfo.label}</span>
          {isRejected && (
            <span className="text-xs text-red-600 dark:text-red-400 font-medium ml-auto">Rejected</span>
          )}
          {isConfirmed && (
            <CheckCircle2 className="size-3.5 text-emerald-500 ml-auto" />
          )}
        </div>

        {/* Body */}
        <div className="px-3 py-2 space-y-2">
          <p className="text-xs text-muted-foreground">{toolInfo.description}</p>

          {/* Arguments preview */}
          {Object.keys(parsedArgs).length > 0 && (
            <div>
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                <span>Parameters</span>
              </button>
              {expanded && (
                <div className="mt-1 rounded bg-muted/50 p-2 text-xs space-y-1 font-mono">
                  {Object.entries(parsedArgs).map(([key, val]) => (
                    <div key={key}>
                      <span className="text-muted-foreground">{key}:</span>{" "}
                      <span>{typeof val === "string" ? val : JSON.stringify(val)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action buttons (only when pending) */}
          {isPending && (
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                variant="default"
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                onClick={() => onConfirm(message.id)}
              >
                <CheckCircle2 className="size-3 mr-1" />
                Confirm
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20"
                onClick={() => onReject(message.id)}
              >
                <XCircle className="size-3 mr-1" />
                Reject
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
