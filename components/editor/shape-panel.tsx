"use client"

import type { NodeShape } from "@/types/canvas"
import { NODE_SHAPES } from "@/types/canvas"

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

// Each icon is a 16×16 SVG that matches the geometry used in the canvas node renderer.
// stroke="currentColor" inherits the button text colour automatically.
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
  // Rounded rectangle — rx matches the 8px in canvas node
  rectangle: (
    <svg {...svgProps}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
    </svg>
  ),

  // Diamond — same polygon shape as canvas (rotated square)
  diamond: (
    <svg {...svgProps}>
      <polygon points="12,2 22,12 12,22 2,12" />
    </svg>
  ),

  // Circle — perfect round
  circle: (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),

  // Pill — fully rounded capsule, wide aspect ratio
  pill: (
    <svg {...svgProps}>
      <rect x="1" y="7" width="22" height="10" rx="5" />
    </svg>
  ),

  // Cylinder — top ellipse + vertical sides + bottom ellipse
  cylinder: (
    <svg {...svgProps}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <line x1="3" y1="5" x2="3" y2="19" />
      <line x1="21" y1="5" x2="21" y2="19" />
      <ellipse cx="12" cy="19" rx="9" ry="3" />
    </svg>
  ),

  // Hexagon (flat-top) — matches canvas polygon
  hexagon: (
    <svg {...svgProps}>
      <polygon points="6,2 18,2 23,12 18,22 6,22 1,12" />
    </svg>
  ),
}

function handleDragStart(e: React.DragEvent, shape: NodeShape) {
  const payload: ShapeDragPayload = { shape, ...SHAPE_DEFAULTS[shape] }
  e.dataTransfer.setData("application/ghost-ai-shape", JSON.stringify(payload))
  e.dataTransfer.effectAllowed = "copy"
}

export function ShapePanel() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-surface-border bg-surface px-3 py-2 shadow-lg">
        {NODE_SHAPES.map((shape) => (
          <button
            key={shape}
            draggable
            onDragStart={(e) => handleDragStart(e, shape)}
            title={SHAPE_LABELS[shape]}
            className="flex h-8 w-8 cursor-grab items-center justify-center rounded-full text-copy-secondary transition-colors hover:bg-elevated hover:text-copy-primary active:cursor-grabbing"
          >
            {SHAPE_ICONS[shape]}
          </button>
        ))}
      </div>
    </div>
  )
}
