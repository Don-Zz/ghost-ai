"use client"

import { useCallback } from "react"
import { ReactFlow, MiniMap, Background, BackgroundVariant, useReactFlow } from "@xyflow/react"
import { useLiveblocksFlow, Cursors } from "@liveblocks/react-flow"
import "@xyflow/react/dist/style.css"
import "@liveblocks/react-ui/styles.css"
import "@liveblocks/react-flow/styles.css"

import { NODE_COLORS, NODE_TYPES } from "@/types/canvas"
import type { CanvasNode } from "@/types/canvas"
import { CanvasNodeRenderer } from "@/components/editor/canvas-node"
import { ShapePanel } from "@/components/editor/shape-panel"
import type { ShapeDragPayload } from "@/components/editor/shape-panel"

const nodeTypes = {
  [NODE_TYPES.canvasNode]: CanvasNodeRenderer,
}

const defaultEdgeOptions = {
  style: { stroke: "#f8fafc", strokeWidth: 1.5 },
}

let nodeCounter = 0

export function Canvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    })

  const { addNodes, screenToFlowPosition } = useReactFlow()

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const raw = e.dataTransfer.getData("application/ghost-ai-shape")
      if (!raw) return

      let payload: ShapeDragPayload
      try {
        payload = JSON.parse(raw) as ShapeDragPayload
      } catch {
        return
      }

      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      const id = `${payload.shape}-${Date.now()}-${++nodeCounter}`

      const node: CanvasNode = {
        id,
        type: NODE_TYPES.canvasNode,
        position: {
          x: position.x - payload.width / 2,
          y: position.y - payload.height / 2,
        },
        data: { label: "", color: NODE_COLORS[0].fill, shape: payload.shape },
        width: payload.width,
        height: payload.height,
      }

      addNodes(node)
    },
    [addNodes, screenToFlowPosition],
  )

  return (
    <div className="relative h-full w-full bg-base">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDelete={onDelete}
        nodeTypes={nodeTypes}
        colorMode="dark"
        defaultEdgeOptions={defaultEdgeOptions}
        connectOnClick={false}
        panOnScroll
        fitView
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <Cursors />
        <MiniMap
          style={{
            background: "#111114",
            border: "1px solid #2a2a30",
            borderRadius: "12px",
          }}
          maskColor="rgba(8,8,9,0.7)"
        />
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="#3a3a42" />
      </ReactFlow>
      <ShapePanel />
    </div>
  )
}
