"use client"

import { useState } from "react"
import { Bot, Share2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ShareDialog } from "@/components/editor/share-dialog"
import { CanvasWrapper } from "@/components/editor/canvas-wrapper"

interface WorkspaceShellProps {
  project: { id: string; name: string }
  isOwner: boolean
}

export function WorkspaceShell({ project, isOwner }: WorkspaceShellProps) {
  const [isAISidebarOpen, setIsAISidebarOpen] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)

  return (
    <div className="flex h-full flex-col">
      <ShareDialog
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        project={project}
        isOwner={isOwner}
      />

      {/* Workspace toolbar — sits flush against the global navbar */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-surface-border/60 bg-base px-3">
        <span className="text-sm font-medium text-copy-secondary">{project.name}</span>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 px-2.5 text-xs"
            onClick={() => setIsShareOpen(true)}
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Toggle AI sidebar"
            className={isAISidebarOpen ? "bg-elevated text-copy-primary" : ""}
            onClick={() => setIsAISidebarOpen((prev) => !prev)}
          >
            <Bot className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Workspace body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas — fills all remaining space */}
        <div className="relative flex-1 overflow-hidden">
          <CanvasWrapper roomId={project.id} />
        </div>

        {/* AI sidebar */}
        {isAISidebarOpen && (
          <aside className="flex w-72 shrink-0 flex-col border-l border-surface-border bg-surface">
            <div className="flex items-center gap-2 border-b border-surface-border px-4 py-3">
              <Bot className="h-4 w-4 text-accent-ai-text" />
              <span className="text-sm font-semibold text-copy-primary">AI Copilot</span>
            </div>
            <div className="flex flex-1 items-center justify-center p-4">
              <p className="text-center text-sm text-copy-muted">AI chat coming soon</p>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
