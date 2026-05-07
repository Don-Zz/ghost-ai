"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { EdgeLabelRenderer, getSmoothStepPath, useReactFlow, type EdgeProps } from "@xyflow/react"
import type { CanvasEdge } from "@/types/canvas"

export function CanvasEdgeRenderer({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<CanvasEdge>) {
  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState(false)
  const [localLabel, setLocalLabel] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const { setEdges } = useReactFlow()

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 6,
  })

  const isActive = selected || hovered
  const strokeColor = isActive ? "#c0c0cc" : "#505060"
  const markerId = `canvas-edge-arrow-${id}`

  const commitEdit = useCallback(
    (value: string) => {
      setEdges((eds) =>
        eds.map((e) => (e.id === id ? { ...e, data: { ...e.data, label: value.trim() } } : e))
      )
      setEditing(false)
    },
    [id, setEdges]
  )

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setLocalLabel(data?.label ?? "")
      setEditing(true)
    },
    [data?.label]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") commitEdit(e.currentTarget.value)
      else if (e.key === "Escape") setEditing(false)
    },
    [commitEdit]
  )

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const savedLabel = data?.label ?? ""

  return (
    <>
      <defs>
        <marker
          id={markerId}
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L6,3 z" fill={strokeColor} />
        </marker>
      </defs>
      <g
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* wider transparent hit area — makes edges easy to click without thickening the line */}
        <path d={edgePath} fill="none" stroke="transparent" strokeWidth={16} />
        <path
          d={edgePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          markerEnd={`url(#${markerId})`}
          style={{ transition: "stroke 0.15s ease" }}
        />
      </g>
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
          onDoubleClick={handleDoubleClick}
        >
          {editing ? (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <input
                ref={inputRef}
                type="text"
                value={localLabel}
                onChange={(e) => setLocalLabel(e.target.value)}
                onBlur={(e) => commitEdit(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Label"
                className="canvas-edge-input"
                style={{ width: `${Math.max(60, localLabel.length * 8 + 24)}px` }}
              />
            </div>
          ) : savedLabel ? (
            <span className="canvas-edge-label">{savedLabel}</span>
          ) : isActive ? (
            <span className="canvas-edge-hint">Label</span>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
