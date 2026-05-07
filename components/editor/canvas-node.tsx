"use client"

import { Handle, Position, type NodeProps } from "@xyflow/react"
import { NODE_COLORS } from "@/types/canvas"
import type { CanvasNode, NodeShape } from "@/types/canvas"

const DEFAULT_FILL = NODE_COLORS[0].fill
const DEFAULT_TEXT = NODE_COLORS[0].text

interface ShapeProps {
  fill: string
  text: string
  border: string
  label: string
}

// ─── CSS shapes ───────────────────────────────────────────────────

function ShapeRectangle({ fill, text, border, label }: ShapeProps) {
  return (
    <div
      className="flex h-full w-full items-center justify-center overflow-hidden"
      style={{ background: fill, color: text, border: `1.5px solid ${border}`, borderRadius: 8 }}
    >
      <span className="max-w-full truncate px-3 text-xs font-medium">{label}</span>
    </div>
  )
}

function ShapeCircle({ fill, text, border, label }: ShapeProps) {
  return (
    <div
      className="flex h-full w-full items-center justify-center overflow-hidden"
      style={{ background: fill, color: text, border: `1.5px solid ${border}`, borderRadius: "50%" }}
    >
      <span className="max-w-[72%] truncate text-center text-xs font-medium">{label}</span>
    </div>
  )
}

function ShapePill({ fill, text, border, label }: ShapeProps) {
  return (
    <div
      className="flex h-full w-full items-center justify-center overflow-hidden"
      style={{ background: fill, color: text, border: `1.5px solid ${border}`, borderRadius: 9999 }}
    >
      <span className="max-w-[80%] truncate px-5 text-xs font-medium">{label}</span>
    </div>
  )
}

// ─── SVG shapes ───────────────────────────────────────────────────
// All use preserveAspectRatio="none" so they fill the node bounds.
// Default node dimensions per shape are chosen to look correct at rest.

function svgLabel(label: string, x: number, y: number, textColor: string) {
  if (!label) return null
  const truncated = label.length > 14 ? `${label.slice(0, 13)}…` : label
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      fill={textColor}
      fontSize={10}
      fontWeight={500}
      style={{ userSelect: "none", pointerEvents: "none" }}
    >
      {truncated}
    </text>
  )
}

// Diamond — square viewBox, node default 140×140
function ShapeDiamond({ fill, text, border, label }: ShapeProps) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polygon points="50,2 98,50 50,98 2,50" fill={fill} stroke={border} strokeWidth={1.5} />
      {svgLabel(label, 50, 50, text)}
    </svg>
  )
}

// Hexagon (flat-top) — square viewBox, node default 120×120
function ShapeHexagon({ fill, text, border, label }: ShapeProps) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polygon points="25,2 75,2 98,50 75,98 25,98 2,50" fill={fill} stroke={border} strokeWidth={1.5} />
      {svgLabel(label, 50, 50, text)}
    </svg>
  )
}

// Cylinder — square viewBox stretched by node height, default 100×120
// Top ellipse ry=12, body from y=12 to y=88, bottom ellipse ry=12 at y=88
function ShapeCylinder({ fill, text, border, label }: ShapeProps) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
      {/* body fill between ellipse centres */}
      <rect x={1} y={12} width={98} height={76} fill={fill} stroke="none" />
      {/* side edges */}
      <line x1={1} y1={12} x2={1} y2={88} stroke={border} strokeWidth={1.5} />
      <line x1={99} y1={12} x2={99} y2={88} stroke={border} strokeWidth={1.5} />
      {/* bottom ellipse */}
      <ellipse cx={50} cy={88} rx={49} ry={12} fill={fill} stroke={border} strokeWidth={1.5} />
      {/* top ellipse — drawn last so it sits over the body/side-line join */}
      <ellipse cx={50} cy={12} rx={49} ry={12} fill={fill} stroke={border} strokeWidth={1.5} />
      {svgLabel(label, 50, 52, text)}
    </svg>
  )
}

// ─── Dispatch table ───────────────────────────────────────────────

const SHAPE_COMPONENTS: Record<NodeShape, React.ComponentType<ShapeProps>> = {
  rectangle: ShapeRectangle,
  circle: ShapeCircle,
  pill: ShapePill,
  diamond: ShapeDiamond,
  hexagon: ShapeHexagon,
  cylinder: ShapeCylinder,
}

// ─── Node renderer ────────────────────────────────────────────────

export function CanvasNodeRenderer({ data, selected }: NodeProps<CanvasNode>) {
  const colorPair = NODE_COLORS.find((c) => c.fill === data.color)
  const fill = colorPair?.fill ?? DEFAULT_FILL
  const text = colorPair?.text ?? DEFAULT_TEXT
  const border = selected ? "#00c8d4" : "#2a2a30"
  const shape = data.shape ?? "rectangle"
  const ShapeComponent = SHAPE_COMPONENTS[shape] ?? ShapeRectangle

  return (
    <div className="relative h-full w-full">
      <ShapeComponent fill={fill} text={text} border={border} label={data.label} />
      <Handle type="target" position={Position.Top} id="top" />
      <Handle type="source" position={Position.Right} id="right" />
      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="target" position={Position.Left} id="left" />
    </div>
  )
}
