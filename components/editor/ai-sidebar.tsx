"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Bot, Download, FileText, Loader2, Send, X } from "lucide-react"
import {
  useBroadcastEvent,
  useEventListener,
  useSelf,
  useStorage,
  useUpdateMyPresence,
} from "@liveblocks/react"
import { useRealtimeRun } from "@trigger.dev/react-hooks"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { isAiStatusPayload, ChatMessageSchema, type ChatMessage } from "@/types/tasks"
import { SpecPreviewModal } from "@/components/editor/spec-preview-modal"

interface ProjectSpec {
  id: string
  createdAt: string
}

function specFilename(id: string) {
  return `spec-${id}.md`
}

const STARTER_CHIPS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
]

let msgCounter = 0
function newId() {
  return `msg-${Date.now()}-${++msgCounter}`
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

interface DisplayMessage extends ChatMessage {
  id: string
  isOwn: boolean
}

interface RunState {
  runId: string
  publicToken: string
}

interface AiSidebarProps {
  onClose: () => void
  roomId: string
}

const TERMINAL_ERROR_STATUSES = new Set([
  "FAILED",
  "CANCELED",
  "CRASHED",
  "TIMED_OUT",
  "EXPIRED",
  "INTERRUPTED",
  "SYSTEM_FAILURE",
])

function isExpiredTokenError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return msg.includes("expired") || msg.includes("401")
  }
  return false
}

// Isolated component so useRealtimeRun is always called at top level.
// Uses refs for callbacks so effects are stable and never fire multiple times
// from reference churn.
function RunTracker({
  runId,
  publicToken,
  onComplete,
  onError,
}: {
  runId: string
  publicToken: string
  onComplete: () => void
  onError: (expired: boolean) => void
}) {
  const firedRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  const onErrorRef = useRef(onError)
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])
  useEffect(() => { onErrorRef.current = onError }, [onError])

  const { run, error } = useRealtimeRun(runId, {
    accessToken: publicToken,
    onComplete: () => {
      if (firedRef.current) return
      firedRef.current = true
      onCompleteRef.current()
    },
  })

  useEffect(() => {
    if (run?.status && TERMINAL_ERROR_STATUSES.has(run.status) && !firedRef.current) {
      firedRef.current = true
      console.error("[RunTracker] terminal status:", run.status, "runId:", runId)
      onErrorRef.current(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.status])

  useEffect(() => {
    if (error && !firedRef.current) {
      firedRef.current = true
      console.error("[RunTracker] realtime connection error:", error)
      onErrorRef.current(isExpiredTokenError(error))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error])

  return null
}

export function AiSidebar({ onClose, roomId }: AiSidebarProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [draft, setDraft] = useState("")
  const [isThinking, setIsThinking] = useState(false)
  const [statusText, setStatusText] = useState<string | null>(null)
  const [runState, setRunState] = useState<RunState | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [specs, setSpecs] = useState<ProjectSpec[]>([])
  const [specsLoading, setSpecsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("architect")
  const [previewSpec, setPreviewSpec] = useState<ProjectSpec | null>(null)
  const [specRunState, setSpecRunState] = useState<RunState | null>(null)
  const [specGenerating, setSpecGenerating] = useState(false)
  const [specError, setSpecError] = useState<string | null>(null)

  // Read canvas nodes/edges from shared Liveblocks storage so spec generation has context.
  // useLiveblocksFlow stores data as: root.flow.nodes (LiveMap) and root.flow.edges (LiveMap).
  // useStorage returns LiveMaps as ReadonlyMap instances.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flowNodes = useStorage((root: any) => root?.flow?.nodes ?? null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flowEdges = useStorage((root: any) => root?.flow?.edges ?? null)

  const canvasNodes = useMemo(() => {
    if (!flowNodes) return []
    return flowNodes instanceof Map
      ? Array.from(flowNodes.values())
      : Object.values(flowNodes as Record<string, unknown>)
  }, [flowNodes])

  const canvasEdges = useMemo(() => {
    if (!flowEdges) return []
    return flowEdges instanceof Map
      ? Array.from(flowEdges.values())
      : Object.values(flowEdges as Record<string, unknown>)
  }, [flowEdges])

  const broadcast = useBroadcastEvent()
  const updatePresence = useUpdateMyPresence()
  const self = useSelf()
  const senderName = self?.info?.name ?? "User"

  const isRunActive = runState !== null

  // Mirror run state into presence so live-cursors shows the thinking spinner
  useEffect(() => {
    updatePresence({ thinking: isRunActive })
  }, [isRunActive, updatePresence])

  // Clean up timers on unmount to prevent state updates after unmount
  useEffect(() => {
    return () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    }
  }, [])

  // Load specs when the Specs tab becomes active
  useEffect(() => {
    if (activeTab !== "specs") return
    setSpecsLoading(true)
    fetch(`/api/projects/${roomId}/specs`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch specs")
        const data = await res.json()
        setSpecs(data.specs ?? [])
      })
      .catch(() => setSpecs([]))
      .finally(() => setSpecsLoading(false))
  }, [activeTab, roomId])

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 0)
  }, [])

  const pushAiMessage = useCallback(
    (content: string) => {
      const msg: ChatMessage = {
        sender: "Ghost AI",
        role: "assistant",
        content,
        timestamp: Date.now(),
      }
      try {
        broadcast({ type: "CHAT_MESSAGE", ...msg })
      } catch {
        // best-effort — local copy always added below
      }
      setMessages((prev) => [...prev, { ...msg, id: newId(), isOwn: false }])
      scrollToBottom()
    },
    [broadcast, scrollToBottom],
  )

  const resetRun = useCallback(() => {
    setRunState(null)
    setIsThinking(false)
  }, [])

  const handleRunComplete = useCallback(() => {
    pushAiMessage("Your canvas has been updated. Let me know if you'd like any changes.")
    resetRun()
  }, [pushAiMessage, resetRun])

  const handleRunError = useCallback((expired: boolean) => {
    pushAiMessage(
      expired
        ? "AI run expired. Please try again."
        : "Something went wrong with the AI run. Please try again.",
    )
    resetRun()
  }, [pushAiMessage, resetRun])

  useEventListener(({ event }) => {
    if (event.type === "AI_STATUS") {
      const payload = { text: event.message }
      if (!isAiStatusPayload(payload)) return

      if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
      setStatusText(payload.text ?? null)

      if (event.status === "start" || event.status === "processing") {
        setIsThinking(true)
      } else {
        setIsThinking(false)
        if (event.status === "complete") {
          // AI_STATUS complete acts as a fallback reset if useRealtimeRun didn't fire
          statusTimerRef.current = setTimeout(() => {
            setStatusText(null)
            setRunState(null)
          }, 3000)
        } else {
          setRunState(null)
          statusTimerRef.current = setTimeout(() => setStatusText(null), 3000)
        }
      }
      return
    }

    if (event.type === "CHAT_MESSAGE") {
      const parsed = ChatMessageSchema.safeParse({
        sender: event.sender,
        role: event.role,
        content: event.content,
        timestamp: event.timestamp,
      })
      if (!parsed.success) return

      setMessages((prev) => [...prev, { ...parsed.data, id: newId(), isOwn: false }])
      scrollToBottom()
    }
  })

  const reloadSpecs = useCallback(() => {
    setSpecsLoading(true)
    fetch(`/api/projects/${roomId}/specs`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch specs")
        const data = await res.json()
        setSpecs(data.specs ?? [])
      })
      .catch(() => {})
      .finally(() => setSpecsLoading(false))
  }, [roomId])

  const handleGenerateSpec = useCallback(async () => {
    setSpecGenerating(true)
    setSpecError(null)
    try {
      const res = await fetch("/api/ai/spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          chatHistory: messages.map((m) => ({ role: m.role, content: m.content })),
          nodes: canvasNodes,
          edges: canvasEdges,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string })?.error ?? "Spec generation failed")
      }
      const { runId } = (await res.json()) as { runId: string }

      const tokenRes = await fetch("/api/ai/spec/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      })
      if (!tokenRes.ok) throw new Error("Failed to get spec token")
      const { publicToken } = (await tokenRes.json()) as { publicToken: string }

      setSpecRunState({ runId, publicToken })
    } catch (err) {
      console.error("[AiSidebar] spec generation error:", err)
      setSpecError(err instanceof Error ? err.message : "Spec generation failed")
    } finally {
      setSpecGenerating(false)
    }
  }, [roomId, messages, canvasNodes, canvasEdges])

  const handleSpecComplete = useCallback(() => {
    setSpecRunState(null)
    reloadSpecs()
    // Switch to the Specs tab so the user sees the new spec
    setActiveTab("specs")
  }, [reloadSpecs])

  const handleSpecError = useCallback((expired: boolean) => {
    setSpecRunState(null)
    setSpecError(
      expired ? "Spec run expired. Please try again." : "Spec generation failed. Please try again.",
    )
  }, [])

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isRunActive) return

      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
      setSendError(null)

      // Add user message locally immediately — chat works even if broadcast or AI fails
      const msg: ChatMessage = {
        sender: senderName,
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      }
      setDraft("")
      setMessages((prev) => [...prev, { ...msg, id: newId(), isOwn: true }])
      scrollToBottom()

      // Broadcast to room — best-effort, does not block chat
      try {
        broadcast({ type: "CHAT_MESSAGE", ...msg })
      } catch {
        // non-fatal: message already shown locally
      }

      // Trigger AI generation
      try {
        const res = await fetch("/api/ai/design", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: trimmed, roomId }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err?.error ?? "Request failed")
        }
        const { runId, publicToken } = await res.json()
        setRunState({ runId, publicToken })
        setIsThinking(true)
      } catch (err) {
        console.error("[AiSidebar] AI design API error:", err)
        pushAiMessage("AI generation is temporarily unavailable, but chat is working.")
        setSendError("AI generation unavailable")
        errorTimerRef.current = setTimeout(() => setSendError(null), 4000)
      }
    },
    [isRunActive, senderName, broadcast, roomId, pushAiMessage, scrollToBottom],
  )

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send(draft)
    }
  }

  const isInputDisabled = isRunActive

  return (
    <aside className="animate-in slide-in-from-right flex w-72 shrink-0 flex-col border-l border-surface-border bg-base/95 shadow-2xl duration-300">
      {/* Design run tracker */}
      {runState && (
        <RunTracker
          runId={runState.runId}
          publicToken={runState.publicToken}
          onComplete={handleRunComplete}
          onError={handleRunError}
        />
      )}
      {/* Spec run tracker — reloads spec list on completion */}
      {specRunState && (
        <RunTracker
          runId={specRunState.runId}
          publicToken={specRunState.publicToken}
          onComplete={handleSpecComplete}
          onError={handleSpecError}
        />
      )}

      {/* Header */}
      <div className="flex shrink-0 items-start justify-between border-b border-surface-border px-4 py-3">
        <div className="flex items-start gap-2.5">
          <Bot className="mt-0.5 h-4 w-4 shrink-0 text-accent-ai-text" />
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-copy-primary">AI Workspace</p>
              {(isThinking || isRunActive) && (
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0AC7B4]" />
              )}
            </div>
            <p className="text-xs text-copy-muted">Collaborate with Ghost AI</p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close AI sidebar"
          className="flex h-6 w-6 items-center justify-center rounded-lg text-copy-muted transition-colors hover:text-copy-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Status strip — only visible while a run is active */}
      {isRunActive && (
        <div className="flex shrink-0 items-center gap-2 border-b border-surface-border bg-elevated/60 px-4 py-2">
          <Loader2 className="h-3 w-3 shrink-0 animate-spin text-[#0AC7B4]" />
          <p className="text-xs text-accent-ai-text">
            {statusText ?? "AI is working on your canvas…"}
          </p>
        </div>
      )}

      {previewSpec && (
        <SpecPreviewModal
          open={previewSpec !== null}
          onOpenChange={(open) => { if (!open) setPreviewSpec(null) }}
          specId={previewSpec.id}
          projectId={roomId}
          filename={specFilename(previewSpec.id)}
          createdAt={previewSpec.createdAt}
        />
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <TabsList className="mx-3 mt-3 shrink-0 bg-elevated">
          <TabsTrigger
            value="architect"
            className="flex-1 text-xs text-copy-muted data-active:bg-accent data-active:text-accent-foreground"
          >
            AI Architect
          </TabsTrigger>
          <TabsTrigger
            value="specs"
            className="flex-1 text-xs text-copy-muted data-active:bg-accent data-active:text-accent-foreground"
          >
            Specs
          </TabsTrigger>
        </TabsList>

        {/* AI Architect tab */}
        <TabsContent
          value="architect"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {/* Scrollable chat area */}
          <ScrollArea className="min-h-0 flex-1 px-3 pt-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <Bot className="h-8 w-8 text-copy-faint" />
                <p className="text-center text-xs text-copy-muted">
                  Describe your system and Ghost AI will generate an architecture for you.
                </p>
                <div className="flex w-full flex-col gap-2">
                  {STARTER_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => send(chip)}
                      disabled={isInputDisabled}
                      className="rounded-xl bg-subtle px-3 py-2 text-left text-xs text-accent-ai-text transition-colors hover:bg-elevated disabled:opacity-50"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 pb-3">
                {messages.map((msg) =>
                  msg.isOwn ? (
                    <div key={msg.id} className="flex justify-end">
                      <div className="flex max-w-[85%] flex-col items-end gap-1">
                        <div className="rounded-2xl rounded-br-sm bg-[#0F2E18] px-3 py-2 text-sm text-[#62C073]">
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-copy-faint">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div key={msg.id} className="flex justify-start">
                      <div className="flex max-w-[85%] flex-col gap-1">
                        <span className="text-[10px] font-medium text-copy-muted">
                          {msg.sender}
                        </span>
                        <div className="rounded-2xl rounded-bl-sm border border-surface-border bg-elevated px-3 py-2 text-sm text-accent-ai-text">
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-copy-faint">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                    </div>
                  ),
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input area */}
          <div className="shrink-0 border-t border-surface-border p-3">
            <div
              className={[
                "flex items-end gap-2 rounded-xl border bg-elevated px-3 py-2 transition-colors",
                isInputDisabled
                  ? "border-surface-border opacity-60"
                  : "border-surface-border focus-within:border-brand",
              ].join(" ")}
            >
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isInputDisabled}
                placeholder={isInputDisabled ? "AI is working…" : "Ask AI Architect…"}
                className="min-h-[72px] flex-1 resize-none border-0 bg-transparent p-0 text-sm text-copy-primary placeholder:text-copy-faint focus-visible:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                style={{ maxHeight: "160px", overflowY: "auto" }}
              />
              <Button
                size="icon"
                disabled={isInputDisabled || !draft.trim()}
                onClick={() => send(draft)}
                className="h-7 w-7 shrink-0 rounded-full bg-[#62C073] text-white hover:bg-[#62C073]/90 disabled:opacity-30"
                aria-label="Send"
              >
                {isInputDisabled ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
            {sendError ? (
              <p className="mt-1.5 text-center text-[10px] text-red-400">{sendError}</p>
            ) : (
              <p className="mt-1.5 text-center text-[10px] text-copy-faint">
                {isInputDisabled ? "AI is generating…" : "Enter to send · Shift+Enter for newline"}
              </p>
            )}
          </div>
        </TabsContent>

        {/* Specs tab */}
        <TabsContent value="specs" className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Generate Spec action */}
          <div className="shrink-0 border-b border-surface-border px-3 py-2.5">
            {specError && (
              <p className="mb-2 rounded-xl bg-state-error/10 px-2 py-1 text-center text-[10px] text-state-error">
                {specError}
              </p>
            )}
            {specRunState && (
              <div className="mb-2 flex items-center gap-1.5 rounded-xl bg-elevated/60 px-2 py-1">
                <Loader2 className="h-3 w-3 shrink-0 animate-spin text-[#0AC7B4]" />
                <p className="text-[10px] text-accent-ai-text">Generating spec…</p>
              </div>
            )}
            <Button
              className="w-full bg-brand text-white hover:bg-brand/90"
              onClick={handleGenerateSpec}
              disabled={specGenerating || specRunState !== null}
            >
              {specGenerating || specRunState !== null ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Generating…
                </>
              ) : (
                "Generate Spec"
              )}
            </Button>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-2 p-3">
              {specsLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin text-copy-muted" />
                </div>
              )}

              {!specsLoading && specs.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-8">
                  <FileText className="h-8 w-8 text-copy-faint" />
                  <p className="text-center text-xs text-copy-muted">
                    No specs yet. Click Generate Spec to create one from your canvas.
                  </p>
                </div>
              )}

              {!specsLoading && specs.map((spec) => {
                const filename = specFilename(spec.id)
                const downloadUrl = `/api/projects/${roomId}/specs/${spec.id}/download`
                return (
                  <button
                    key={spec.id}
                    onClick={() => setPreviewSpec(spec)}
                    className="w-full rounded-2xl border border-surface-border bg-elevated p-3 text-left transition-colors hover:border-border-subtle hover:bg-subtle"
                  >
                    <div className="flex items-start gap-2.5">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-copy-muted" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-copy-primary">
                          {filename}
                        </p>
                        <p className="mt-0.5 text-xs text-copy-muted">
                          {new Date(spec.createdAt).toLocaleString()}
                        </p>
                        <a
                          href={downloadUrl}
                          download={filename}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-2 inline-flex h-6 items-center gap-1 rounded-lg px-2 text-xs text-copy-faint transition-colors hover:text-copy-primary"
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </a>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </aside>
  )
}
