"use client"

import { LiveblocksProvider, RoomProvider, ClientSideSuspense } from "@liveblocks/react/suspense"
import { ReactFlowProvider } from "@xyflow/react"
import { ErrorBoundary } from "react-error-boundary"
import { Canvas } from "@/components/editor/canvas"

interface CanvasWrapperProps {
  roomId: string
}

export function CanvasWrapper({ roomId }: CanvasWrapperProps) {
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
              <Canvas />
            </ReactFlowProvider>
          </ClientSideSuspense>
        </ErrorBoundary>
      </RoomProvider>
    </LiveblocksProvider>
  )
}
