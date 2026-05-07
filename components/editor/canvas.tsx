"use client"

import { useCallback, useEffect } from "react"
import { ReactFlow, Background, BackgroundVariant, useReactFlow, ConnectionMode } from "@xyflow/react"
import { useLiveblocksFlow, Cursors } from "@liveblocks/react-flow"
import { useHistory } from "@liveblocks/react"
import "@xyflow/react/dist/style.css"
import "@liveblocks/react-ui/styles.css"
import "@liveblocks/react-flow/styles.css"

import { NODE_COLORS, NODE_TYPES, EDGE_TYPES } from "@/types/canvas"
import type { CanvasNode } from "@/types/canvas"
import { CanvasNodeRenderer } from "@/components/editor/canvas-node"
import { CanvasEdgeRenderer } from "@/components/editor/canvas-edge"
import { ShapePanel } from "@/components/editor/shape-panel"
import type { ShapeDragPayload } from "@/components/editor/shape-panel"
import { CanvasControlBar } from "@/components/editor/canvas-control-bar"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import type { CanvasTemplate } from "@/components/editor/starter-templates"

const nodeTypes = {
  [NODE_TYPES.canvasNode]: CanvasNodeRenderer,
}

const edgeTypes = {
  [EDGE_TYPES.canvasEdge]: CanvasEdgeRenderer,
}

const defaultEdgeOptions = {
  type: EDGE_TYPES.canvasEdge,
}

let nodeCounter = 0

interface CanvasProps {
  pendingTemplate?: CanvasTemplate | null
  onTemplateClear?: () => void
}

export function Canvas({ pendingTemplate, onTemplateClear }: CanvasProps) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    })

  const reactFlow = useReactFlow()
  const { addNodes, setNodes, setEdges, screenToFlowPosition } = reactFlow
  const { undo, redo, canUndo, canRedo } = useHistory()

  useKeyboardShortcuts({ instance: reactFlow, onUndo: undo, onRedo: redo })

  useEffect(() => {
    if (!pendingTemplate) return
    setNodes(pendingTemplate.nodes)
    setEdges(pendingTemplate.edges)
    onTemplateClear?.()
    setTimeout(() => reactFlow.fitView({ duration: 400, padding: 0.1 }), 80)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTemplate])

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
        edgeTypes={edgeTypes}
        colorMode="dark"
        defaultEdgeOptions={defaultEdgeOptions}
        connectionMode={ConnectionMode.Loose}
        connectOnClick={false}
        panOnScroll
        fitView
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <Cursors />
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="#3a3a42" />
      </ReactFlow>
      <CanvasControlBar onUndo={undo} onRedo={redo} canUndo={canUndo()} canRedo={canRedo()} />
      <ShapePanel />
    </div>
  )
}
