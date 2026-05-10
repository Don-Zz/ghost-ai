"use client"

import { useReactFlow } from "@xyflow/react"
import { ZoomIn, ZoomOut, Maximize2, Undo2, Redo2 } from "lucide-react"

const ZOOM_DURATION = 200

interface CanvasControlBarProps {
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
}

export function CanvasControlBar({ onUndo, onRedo, canUndo, canRedo }: CanvasControlBarProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow()

  return (
    <div className="pointer-events-none absolute bottom-6 left-6 flex items-center">
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-surface-border bg-surface px-2 py-1.5 shadow-lg">
        <ControlButton onClick={() => zoomOut({ duration: ZOOM_DURATION })} title="Zoom out">
          <ZoomOut className="h-4 w-4" />
        </ControlButton>
        <ControlButton onClick={() => fitView({ duration: ZOOM_DURATION })} title="Fit view">
          <Maximize2 className="h-4 w-4" />
        </ControlButton>
        <ControlButton onClick={() => zoomIn({ duration: ZOOM_DURATION })} title="Zoom in">
          <ZoomIn className="h-4 w-4" />
        </ControlButton>

        <div className="mx-1.5 h-4 w-px bg-surface-border" />

        <ControlButton onClick={onUndo} disabled={!canUndo} title="Undo">
          <Undo2 className="h-4 w-4" />
        </ControlButton>
        <ControlButton onClick={onRedo} disabled={!canRedo} title="Redo">
          <Redo2 className="h-4 w-4" />
        </ControlButton>
      </div>
    </div>
  )
}

function ControlButton({
  onClick,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex h-7 w-7 items-center justify-center rounded-full text-copy-secondary transition-colors hover:bg-elevated hover:text-copy-primary disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  )
}
