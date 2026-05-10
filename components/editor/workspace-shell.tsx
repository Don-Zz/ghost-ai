"use client"

import { useState, useRef, useCallback } from "react"
import { Bot, LayoutTemplate, Share2, Save, FlaskConical } from "lucide-react"
import { LiveblocksProvider, RoomProvider } from "@liveblocks/react/suspense"

import { Button } from "@/components/ui/button"
import { ShareDialog } from "@/components/editor/share-dialog"
import { CanvasWrapper } from "@/components/editor/canvas-wrapper"
import { AiSidebar } from "@/components/editor/ai-sidebar"
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal"
import type { CanvasTemplate } from "@/components/editor/starter-templates"
import type { SaveStatus } from "@/hooks/use-canvas-autosave"

// Flip to false to hide the AI sidebar without removing any code.
const AI_ENABLED = true

interface WorkspaceShellProps {
  project: { id: string; name: string; canvasJsonPath: string | null }
  isOwner: boolean
}

export function WorkspaceShell({ project, isOwner }: WorkspaceShellProps) {
  const [isAISidebarOpen, setIsAISidebarOpen] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false)
  const [pendingTemplate, setPendingTemplate] = useState<CanvasTemplate | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")

  const saveFnRef = useRef<(() => Promise<void>) | null>(null)

  const handleSaveReady = useCallback((fn: () => Promise<void>) => {
    saveFnRef.current = fn
  }, [])

  const handleManualSave = useCallback(() => {
    saveFnRef.current?.()
  }, [])

  const saveLabel =
    saveStatus === "saving" ? "Saving…" :
    saveStatus === "saved"  ? "Saved"   :
    saveStatus === "error"  ? "Save failed" :
    "Save"

  const [debugStatus, setDebugStatus] = useState<"idle" | "writing" | "ok" | "error">("idle")

  const handleDebugWrite = useCallback(async () => {
    setDebugStatus("writing")
    try {
      const res = await fetch("/api/debug/canvas-write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: project.id }),
      })
      setDebugStatus(res.ok ? "ok" : "error")
    } catch {
      setDebugStatus("error")
    }
    setTimeout(() => setDebugStatus("idle"), 3000)
  }, [project.id])

  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
    <RoomProvider id={project.id} initialPresence={{ cursor: null, thinking: false }}>
    <div className="flex h-full flex-col">
      <ShareDialog
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        project={project}
        isOwner={isOwner}
      />
      <StarterTemplatesModal
        open={isTemplatesOpen}
        onOpenChange={setIsTemplatesOpen}
        onImport={setPendingTemplate}
      />

      {/* Workspace toolbar — sits flush against the global navbar */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-surface-border/60 bg-base px-3">
        <span className="text-sm font-medium text-copy-secondary">{project.name}</span>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            disabled={debugStatus === "writing"}
            className={[
              "h-7 gap-1.5 px-2.5 text-xs",
              debugStatus === "ok"      && "text-green-500",
              debugStatus === "error"   && "text-destructive",
              debugStatus === "writing" && "text-copy-muted",
              debugStatus === "idle"    && "text-amber-400 hover:text-amber-300",
            ].filter(Boolean).join(" ")}
            onClick={handleDebugWrite}
          >
            <FlaskConical className="h-3.5 w-3.5" />
            {debugStatus === "writing" ? "Writing…" : debugStatus === "ok" ? "Written!" : debugStatus === "error" ? "Failed" : "Debug Write"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2.5 text-xs text-copy-muted hover:text-copy-primary"
            onClick={() => setIsTemplatesOpen(true)}
          >
            <LayoutTemplate className="h-3.5 w-3.5" />
            Templates
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={saveStatus === "saving"}
            className={[
              "h-7 gap-1.5 px-2.5 text-xs",
              saveStatus === "saved"  && "text-green-500",
              saveStatus === "error"  && "text-destructive",
              saveStatus === "saving" && "text-copy-muted",
              saveStatus === "idle"   && "text-copy-muted hover:text-copy-primary",
            ].filter(Boolean).join(" ")}
            onClick={handleManualSave}
          >
            <Save className="h-3.5 w-3.5" />
            {saveLabel}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 px-2.5 text-xs"
            onClick={() => setIsShareOpen(true)}
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </Button>
          {AI_ENABLED && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Toggle AI sidebar"
              className={isAISidebarOpen ? "bg-elevated text-copy-primary" : ""}
              onClick={() => setIsAISidebarOpen((prev) => !prev)}
            >
              <Bot className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Workspace body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas — fills all remaining space */}
        <div className="relative flex-1 overflow-hidden">
          <CanvasWrapper
            roomId={project.id}
            savedCanvasUrl={project.canvasJsonPath}
            pendingTemplate={pendingTemplate}
            onTemplateClear={() => setPendingTemplate(null)}
            onSaveStatusChange={setSaveStatus}
            onSaveReady={handleSaveReady}
          />
        </div>

        {/* AI sidebar — only rendered when AI_ENABLED */}
        {AI_ENABLED && isAISidebarOpen && (
          <AiSidebar onClose={() => setIsAISidebarOpen(false)} roomId={project.id} />
        )}
      </div>
    </div>
    </RoomProvider>
    </LiveblocksProvider>
  )
}
