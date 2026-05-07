"use client"

import { LayoutTemplate } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { NODE_COLORS } from "@/types/canvas"
import type { CanvasNode, CanvasEdge, NodeShape } from "@/types/canvas"
import { CANVAS_TEMPLATES, type CanvasTemplate } from "@/components/editor/starter-templates"

// ─── Preview geometry ─────────────────────────────────────────────
// Logical SVG coordinate space. Width="100%" on the SVG element lets the
// browser auto-calculate height from the aspect ratio, so the preview fills
// each card's full width at the correct proportional height.

const VB_W = 300
const VB_H = 260
const VB_PAD = 16

interface Transform {
  scale: number
  offsetX: number
  offsetY: number
}

function computeTransform(nodes: CanvasNode[]): Transform {
  if (nodes.length === 0) return { scale: 1, offsetX: VB_W / 2, offsetY: VB_H / 2 }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const node of nodes) {
    const w = (node.width as number) ?? 160
    const h = (node.height as number) ?? 80
    minX = Math.min(minX, node.position.x)
    minY = Math.min(minY, node.position.y)
    maxX = Math.max(maxX, node.position.x + w)
    maxY = Math.max(maxY, node.position.y + h)
  }

  const contentW = maxX - minX
  const contentH = maxY - minY
  const scale = Math.min(
    (VB_W - VB_PAD * 2) / contentW,
    (VB_H - VB_PAD * 2) / contentH,
  )
  const scaledW = contentW * scale
  const scaledH = contentH * scale
  return {
    scale,
    offsetX: (VB_W - scaledW) / 2 - minX * scale,
    offsetY: (VB_H - scaledH) / 2 - minY * scale,
  }
}

function nodeCenter(node: CanvasNode): [number, number] {
  const w = (node.width as number) ?? 160
  const h = (node.height as number) ?? 80
  return [node.position.x + w / 2, node.position.y + h / 2]
}

// ─── Per-shape SVG renderers ──────────────────────────────────────

interface ShapeProps {
  x: number; y: number; w: number; h: number; fill: string; sw: number
}

function RectShape({ x, y, w, h, fill, sw }: ShapeProps) {
  return <rect x={x} y={y} width={w} height={h} rx={4} fill={fill} stroke="#2a2a30" strokeWidth={sw} />
}

function CircleShape({ x, y, w, h, fill, sw }: ShapeProps) {
  return (
    <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2}
      fill={fill} stroke="#2a2a30" strokeWidth={sw} />
  )
}

function PillShape({ x, y, w, h, fill, sw }: ShapeProps) {
  return <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={fill} stroke="#2a2a30" strokeWidth={sw} />
}

function DiamondShape({ x, y, w, h, fill, sw }: ShapeProps) {
  const cx = x + w / 2, cy = y + h / 2
  return (
    <polygon
      points={`${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}`}
      fill={fill} stroke="#2a2a30" strokeWidth={sw}
    />
  )
}

function HexagonShape({ x, y, w, h, fill, sw }: ShapeProps) {
  const cx = x + w / 2, cy = y + h / 2, rx = w / 2, ry = h / 2
  const pts = [
    [cx - rx * 0.5, cy - ry], [cx + rx * 0.5, cy - ry],
    [cx + rx, cy],
    [cx + rx * 0.5, cy + ry], [cx - rx * 0.5, cy + ry],
    [cx - rx, cy],
  ].map(([px, py]) => `${px},${py}`).join(" ")
  return <polygon points={pts} fill={fill} stroke="#2a2a30" strokeWidth={sw} />
}

function CylinderShape({ x, y, w, h, fill, sw }: ShapeProps) {
  const ey = h * 0.14
  return (
    <g>
      <rect x={x} y={y + ey} width={w} height={h - ey * 2} fill={fill} stroke="none" />
      <line x1={x}     y1={y + ey} x2={x}     y2={y + h - ey} stroke="#2a2a30" strokeWidth={sw} />
      <line x1={x + w} y1={y + ey} x2={x + w} y2={y + h - ey} stroke="#2a2a30" strokeWidth={sw} />
      <ellipse cx={x + w / 2} cy={y + h - ey} rx={w / 2} ry={ey} fill={fill} stroke="#2a2a30" strokeWidth={sw} />
      <ellipse cx={x + w / 2} cy={y + ey}     rx={w / 2} ry={ey} fill={fill} stroke="#2a2a30" strokeWidth={sw} />
    </g>
  )
}

const SHAPE_RENDERERS: Record<NodeShape, React.ComponentType<ShapeProps>> = {
  rectangle: RectShape,
  circle:    CircleShape,
  pill:      PillShape,
  diamond:   DiamondShape,
  hexagon:   HexagonShape,
  cylinder:  CylinderShape,
}

// ─── Preview SVG ──────────────────────────────────────────────────
// width="100%" lets the SVG fill the card. The browser computes height
// from the viewBox aspect ratio (300:220 ≈ 1.36:1), giving ~200 px of
// preview height at typical card widths inside a max-w-4xl dialog.

function TemplatePreview({ nodes, edges }: { nodes: CanvasNode[]; edges: CanvasEdge[] }) {
  const { scale, offsetX, offsetY } = computeTransform(nodes)
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const sw = 1.5 / scale

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      width="100%"
      style={{ display: "block", background: "#080809" }}
    >
      <g transform={`translate(${offsetX},${offsetY}) scale(${scale})`}>
        {edges.map((edge) => {
          const src = nodeMap[edge.source]
          const tgt = nodeMap[edge.target]
          if (!src || !tgt) return null
          const [sx, sy] = nodeCenter(src)
          const [tx, ty] = nodeCenter(tgt)
          return (
            <line key={edge.id} x1={sx} y1={sy} x2={tx} y2={ty}
              stroke="#3a3a42" strokeWidth={sw} />
          )
        })}

        {nodes.map((node) => {
          const w = (node.width as number) ?? 160
          const h = (node.height as number) ?? 80
          const colorPair = NODE_COLORS.find((c) => c.fill === node.data.color) ?? NODE_COLORS[0]
          const shape = (node.data.shape ?? "rectangle") as NodeShape
          const ShapeComp = SHAPE_RENDERERS[shape] ?? RectShape
          return (
            <ShapeComp key={node.id} x={node.position.x} y={node.position.y}
              w={w} h={h} fill={colorPair.fill} sw={sw} />
          )
        })}
      </g>
    </svg>
  )
}

// ─── Template card ────────────────────────────────────────────────

interface TemplateCardProps {
  template: CanvasTemplate
  onImport: (template: CanvasTemplate) => void
}

function TemplateCard({ template, onImport }: TemplateCardProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-surface-border bg-surface transition-colors hover:border-border-subtle">
      <div className="overflow-hidden rounded-t-2xl">
        <TemplatePreview nodes={template.nodes} edges={template.edges} />
      </div>
      <div className="flex flex-col gap-4 p-5">
        <div>
          <p className="text-base font-semibold text-copy-primary">{template.name}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-copy-muted">{template.description}</p>
        </div>
        <Button size="sm" className="w-full" onClick={() => onImport(template)}>
          Import
        </Button>
      </div>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────

interface StarterTemplatesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (template: CanvasTemplate) => void
}

export function StarterTemplatesModal({
  open,
  onOpenChange,
  onImport,
}: StarterTemplatesModalProps) {
  function handleImport(template: CanvasTemplate) {
    onImport(template)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl sm:w-[90vw] rounded-3xl p-6">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="flex items-center gap-2 text-copy-primary">
            <LayoutTemplate className="h-5 w-5" />
            Import Template
          </DialogTitle>
          <p className="text-sm text-copy-muted">
            Choose a starter template to pre-populate your canvas. Any existing nodes will be
            replaced —{" "}
            <kbd className="inline-flex items-center rounded bg-elevated px-1.5 py-0.5 font-mono text-xs text-copy-secondary">
              ⌘Z
            </kbd>{" "}
            to undo.
          </p>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 pt-2">
          {CANVAS_TEMPLATES.map((template) => (
            <TemplateCard key={template.id} template={template} onImport={handleImport} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
