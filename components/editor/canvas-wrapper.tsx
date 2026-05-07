"use client"

import { LiveblocksProvider, RoomProvider, ClientSideSuspense } from "@liveblocks/react/suspense"
import { ReactFlowProvider } from "@xyflow/react"
import { ErrorBoundary } from "react-error-boundary"
import { Canvas } from "@/components/editor/canvas"
import type { CanvasTemplate } from "@/components/editor/starter-templates"

interface CanvasWrapperProps {
  roomId: string
  pendingTemplate?: CanvasTemplate | null
  onTemplateClear?: () => void
}

export function CanvasWrapper({ roomId, pendingTemplate, onTemplateClear }: CanvasWrapperProps) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider
        id={roomId}
        initialPresence={{ cursor: null, isThinking: false }}
      >
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
              <Canvas pendingTemplate={pendingTemplate} onTemplateClear={onTemplateClear} />
            </ReactFlowProvider>
          </ClientSideSuspense>
        </ErrorBoundary>
      </RoomProvider>
    </LiveblocksProvider>
  )
}
