"use client"

import { ClientSideSuspense } from "@liveblocks/react/suspense"
import { ReactFlowProvider } from "@xyflow/react"
import { ErrorBoundary } from "react-error-boundary"
import { Canvas } from "@/components/editor/canvas"
import type { CanvasTemplate } from "@/components/editor/starter-templates"
import type { SaveStatus } from "@/hooks/use-canvas-autosave"

interface CanvasWrapperProps {
  roomId: string
  savedCanvasUrl: string | null
  pendingTemplate?: CanvasTemplate | null
  onTemplateClear?: () => void
  onSaveStatusChange?: (status: SaveStatus) => void
  onSaveReady?: (save: () => Promise<void>) => void
}

export function CanvasWrapper({ roomId, savedCanvasUrl, pendingTemplate, onTemplateClear, onSaveStatusChange, onSaveReady }: CanvasWrapperProps) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex h-full w-full items-center justify-center bg-base">
          <p className="text-sm text-copy-muted">Could not connect to canvas. Please refresh.</p>
        </div>
      }
    >
      <ClientSideSuspense
        fallback={
          <div className="flex h-full w-full items-center justify-center bg-base">
            <p className="text-sm text-copy-muted">Loading canvas…</p>
          </div>
        }
      >
        <ReactFlowProvider>
          <Canvas
            projectId={roomId}
            savedCanvasUrl={savedCanvasUrl}
            pendingTemplate={pendingTemplate}
            onTemplateClear={onTemplateClear}
            onSaveStatusChange={onSaveStatusChange}
            onSaveReady={onSaveReady}
          />
        </ReactFlowProvider>
      </ClientSideSuspense>
    </ErrorBoundary>
  )
}
