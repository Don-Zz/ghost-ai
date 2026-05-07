"use client"

import { useState, useEffect } from "react"
import type { NodeShape } from "@/types/canvas"
import { NODE_SHAPES, NODE_COLORS } from "@/types/canvas"

export interface ShapeDragPayload {
  shape: NodeShape
  width: number
  height: number
}

const SHAPE_DEFAULTS: Record<NodeShape, { width: number; height: number }> = {
  rectangle: { width: 160, height: 80 },
  diamond:   { width: 140, height: 140 },
  circle:    { width: 100, height: 100 },
  pill:      { width: 160, height: 60 },
  cylinder:  { width: 100, height: 120 },
  hexagon:   { width: 120, height: 120 },
}

const SHAPE_LABELS: Record<NodeShape, string> = {
  rectangle: "Rectangle",
  diamond:   "Diamond",
  circle:    "Circle",
  pill:      "Pill",
  cylinder:  "Cylinder",
  hexagon:   "Hexagon",
}

const svgProps = {
  viewBox: "0 0 24 24",
  className: "h-4 w-4",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
}

const SHAPE_ICONS: Record<NodeShape, React.ReactNode> = {
  rectangle: (
    <svg {...svgProps}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
    </svg>
  ),
  diamond: (
    <svg {...svgProps}>
      <polygon points="12,2 22,12 12,22 2,12" />
    </svg>
  ),
  circle: (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),
  pill: (
    <svg {...svgProps}>
      <rect x="1" y="7" width="22" height="10" rx="5" />
    </svg>
  ),
  cylinder: (
    <svg {...svgProps}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <line x1="3" y1="5" x2="3" y2="19" />
      <line x1="21" y1="5" x2="21" y2="19" />
      <ellipse cx="12" cy="19" rx="9" ry="3" />
    </svg>
  ),
  hexagon: (
    <svg {...svgProps}>
      <polygon points="6,2 18,2 23,12 18,22 6,22 1,12" />
    </svg>
  ),
}

// ─── Ghost preview shapes ─────────────────────────────────────────
// Mirrors the geometry from canvas-node.tsx at the node's default size.

const GHOST_FILL = NODE_COLORS[0].fill
const GHOST_BORDER = "#00c8d4"

function GhostShape({ shape, width, height }: { shape: NodeShape; width: number; height: number }) {
  if (shape === "rectangle") {
    return (
      <div
        style={{
          width, height,
          background: GHOST_FILL,
          border: `1.5px solid ${GHOST_BORDER}`,
          borderRadius: 8,
        }}
      />
    )
  }
  if (shape === "circle") {
    return (
      <div
        style={{
          width, height,
          background: GHOST_FILL,
          border: `1.5px solid ${GHOST_BORDER}`,
          borderRadius: "50%",
        }}
      />
    )
  }
  if (shape === "pill") {
    return (
      <div
        style={{
          width, height,
          background: GHOST_FILL,
          border: `1.5px solid ${GHOST_BORDER}`,
          borderRadius: 9999,
        }}
      />
    )
  }
  if (shape === "diamond") {
    return (
      <svg width={width} height={height} viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon points="50,2 98,50 50,98 2,50" fill={GHOST_FILL} stroke={GHOST_BORDER} strokeWidth={1.5} />
      </svg>
    )
  }
  if (shape === "hexagon") {
    return (
      <svg width={width} height={height} viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon points="25,2 75,2 98,50 75,98 25,98 2,50" fill={GHOST_FILL} stroke={GHOST_BORDER} strokeWidth={1.5} />
      </svg>
    )
  }
  // cylinder
  return (
    <svg width={width} height={height} viewBox="0 0 100 100" preserveAspectRatio="none">
      <rect x={1} y={12} width={98} height={76} fill={GHOST_FILL} stroke="none" />
      <line x1={1} y1={12} x2={1} y2={88} stroke={GHOST_BORDER} strokeWidth={1.5} />
      <line x1={99} y1={12} x2={99} y2={88} stroke={GHOST_BORDER} strokeWidth={1.5} />
      <ellipse cx={50} cy={88} rx={49} ry={12} fill={GHOST_FILL} stroke={GHOST_BORDER} strokeWidth={1.5} />
      <ellipse cx={50} cy={12} rx={49} ry={12} fill={GHOST_FILL} stroke={GHOST_BORDER} strokeWidth={1.5} />
    </svg>
  )
}

// ─── Drag state ───────────────────────────────────────────────────

interface DragState {
  shape: NodeShape
  width: number
  height: number
  x: number
  y: number
}

function handleDragStart(e: React.DragEvent, shape: NodeShape) {
  const payload: ShapeDragPayload = { shape, ...SHAPE_DEFAULTS[shape] }
  e.dataTransfer.setData("application/ghost-ai-shape", JSON.stringify(payload))
  e.dataTransfer.effectAllowed = "copy"
}

// ─── Shape panel ──────────────────────────────────────────────────

export function ShapePanel() {
  const [dragState, setDragState] = useState<DragState | null>(null)

  // Track cursor position globally while a drag is active.
  // dragover still fires (and bubbles) even when the native ghost is suppressed.
  useEffect(() => {
    if (!dragState) return

    const onDragOver = (e: DragEvent) => {
      setDragState((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : null))
    }

    document.addEventListener("dragover", onDragOver)
    return () => document.removeEventListener("dragover", onDragOver)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragState !== null])

  function onDragStart(e: React.DragEvent, shape: NodeShape) {
    handleDragStart(e, shape)

    // Suppress the browser's default drag ghost so our custom overlay is the
    // only visual feedback. An empty off-screen Image element works cross-browser.
    const empty = new Image()
    empty.src =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
    e.dataTransfer.setDragImage(empty, 0, 0)

    const { width, height } = SHAPE_DEFAULTS[shape]
    setDragState({ shape, width, height, x: e.clientX, y: e.clientY })
  }

  function onDragEnd() {
    setDragState(null)
  }

  return (
    <>
      {/* Ghost preview — fixed overlay that follows the cursor */}
      {dragState && (
        <div
          style={{
            position: "fixed",
            left: dragState.x - dragState.width / 2,
            top: dragState.y - dragState.height / 2,
            width: dragState.width,
            height: dragState.height,
            opacity: 0.65,
            pointerEvents: "none",
            zIndex: 9999,
          }}
        >
          <GhostShape shape={dragState.shape} width={dragState.width} height={dragState.height} />
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-surface-border bg-surface px-3 py-2 shadow-lg">
          {NODE_SHAPES.map((shape) => (
            <button
              key={shape}
              draggable
              onDragStart={(e) => onDragStart(e, shape)}
              onDragEnd={onDragEnd}
              title={SHAPE_LABELS[shape]}
              className="flex h-8 w-8 cursor-grab items-center justify-center rounded-full text-copy-secondary transition-colors hover:bg-elevated hover:text-copy-primary active:cursor-grabbing"
            >
              {SHAPE_ICONS[shape]}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
