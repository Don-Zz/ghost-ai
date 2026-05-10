"use client"

import { useState } from "react"
import { useReactFlow } from "@xyflow/react"
import { NODE_COLORS } from "@/types/canvas"
import type { NodeColor } from "@/types/canvas"

function ColorSwatch({
  color,
  isActive,
  nodeId,
}: {
  color: NodeColor
  isActive: boolean
  nodeId: string
}) {
  const { updateNodeData } = useReactFlow()
  const [hovered, setHovered] = useState(false)

  return (
    <button
      title={color.label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        updateNodeData(nodeId, { color: color.fill })
      }}
      style={{
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: color.fill,
        border: isActive ? `2px solid ${color.text}` : "1.5px solid #3a3a42",
        boxShadow: hovered ? `0 0 6px 2px ${color.text}40` : "none",
        cursor: "pointer",
        flexShrink: 0,
        transition: "transform 0.1s ease, box-shadow 0.1s ease",
        transform: hovered ? "scale(1.1)" : "scale(1)",
        outline: "none",
        padding: 0,
      }}
    />
  )
}

export function NodeColorToolbar({
  nodeId,
  activeFill,
}: {
  nodeId: string
  activeFill: string
}) {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2"
      style={{ bottom: "calc(100% + 8px)", zIndex: 10 }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5"
        style={{
          background: "#18181c",
          border: "1px solid #2a2a30",
          boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          whiteSpace: "nowrap",
        }}
      >
        {NODE_COLORS.map((color) => (
          <ColorSwatch
            key={color.fill}
            color={color}
            isActive={color.fill === activeFill}
            nodeId={nodeId}
          />
        ))}
      </div>
    </div>
  )
}
