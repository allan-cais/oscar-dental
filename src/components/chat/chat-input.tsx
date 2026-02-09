"use client"

import { useState, useRef, useCallback, type KeyboardEvent } from "react"
import { SendHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ onSend, disabled, placeholder = "Ask Oscar anything..." }: ChatInputProps) {
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue("")
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }, [value, disabled, onSend])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const handleInput = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    // Auto-resize: reset to auto, then set to scrollHeight (max 4 rows ~96px)
    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 96)}px`
  }, [])

  return (
    <div className="border-t bg-background p-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="shrink-0 size-9"
        >
          <SendHorizontal className="size-4" />
          <span className="sr-only">Send message</span>
        </Button>
      </div>
      {disabled && (
        <p className="text-xs text-muted-foreground mt-1.5 pl-1">Oscar is thinking...</p>
      )}
    </div>
  )
}
