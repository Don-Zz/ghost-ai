"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Bot } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

const PLACEHOLDER_REPLY = "AI Copilot response coming soon."

let msgCounter = 0
function newId() {
  return `msg-${Date.now()}-${++msgCounter}`
}

export function AiCopilot() {
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const send = useCallback(() => {
    const text = draft.trim()
    if (!text) return

    setDraft("")
    setMessages((prev) => [
      ...prev,
      { id: newId(), role: "user", content: text },
      { id: newId(), role: "assistant", content: PLACEHOLDER_REPLY },
    ])
  }, [draft])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Message feed */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8">
            <Bot className="h-8 w-8 text-copy-faint" />
            <p className="text-center text-xs text-copy-muted">
              Ask the AI Copilot anything about your diagram.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={
                msg.role === "user"
                  ? "flex justify-end"
                  : "flex justify-start"
              }
            >
              <div
                className={
                  msg.role === "user"
                    ? "max-w-[85%] rounded-2xl rounded-br-sm bg-elevated px-3 py-2 text-sm text-copy-primary"
                    : "max-w-[85%] rounded-2xl rounded-bl-sm bg-accent-dim px-3 py-2 text-sm text-accent-ai-text"
                }
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-surface-border p-3">
        <div className="flex items-end gap-2 rounded-xl border border-surface-border bg-elevated px-3 py-2 focus-within:border-brand">
          <textarea
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI Copilot…"
            className="flex-1 resize-none bg-transparent text-sm text-copy-primary placeholder:text-copy-faint focus:outline-none"
            style={{ maxHeight: "120px" }}
          />
          <button
            onClick={send}
            disabled={!draft.trim()}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-base transition-opacity disabled:opacity-30"
            aria-label="Send"
          >
            <Send className="h-3.5 w-3.5 text-[#080809]" />
          </button>
        </div>
      </div>
    </div>
  )
}
