"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ReactFlow, Background, BackgroundVariant, useReactFlow, ConnectionMode } from "@xyflow/react"
import { useLiveblocksFlow } from "@liveblocks/react-flow"
import { useHistory, useMyPresence, useEventListener, useStorage } from "@liveblocks/react"
import "@xyflow/react/dist/style.css"
import "@liveblocks/react-ui/styles.css"
import "@liveblocks/react-flow/styles.css"

import { NODE_COLORS, NODE_TYPES, EDGE_TYPES } from "@/types/canvas"
import type { CanvasNode, CanvasEdge } from "@/types/canvas"
import { CanvasNodeRenderer } from "@/components/editor/canvas-node"
import { CanvasEdgeRenderer } from "@/components/editor/canvas-edge"
import { ShapePanel } from "@/components/editor/shape-panel"
import type { ShapeDragPayload } from "@/components/editor/shape-panel"
import { CanvasControlBar } from "@/components/editor/canvas-control-bar"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import type { CanvasTemplate } from "@/components/editor/starter-templates"
import { LiveCursors } from "@/components/editor/live-cursors"
import { PresenceAvatars } from "@/components/editor/presence-avatars"
import { useCanvasAutosave } from "@/hooks/use-canvas-autosave"
import type { SaveStatus } from "@/hooks/use-canvas-autosave"

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
  projectId: string
  savedCanvasUrl: string | null
  pendingTemplate?: CanvasTemplate | null
  onTemplateClear?: () => void
  onSaveStatusChange?: (status: SaveStatus) => void
  onSaveReady?: (save: () => Promise<void>) => void
}

export function Canvas({
  projectId,
  savedCanvasUrl,
  pendingTemplate,
  onTemplateClear,
  onSaveStatusChange,
  onSaveReady,
}: CanvasProps) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    })

  // --- Diagnostic: read raw storage to verify what Liveblocks actually has ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawFlowStorage = useStorage((s: any) => s?.flow ?? null)
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("[canvas:storage] raw flow key:", JSON.stringify(rawFlowStorage))
  }, [rawFlowStorage])

  // --- Diagnostic: log every change to the nodes array from useLiveblocksFlow ---
  useEffect(() => {
    // eslint-disable-next-line no-console
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.log(`[canvas:nodes] useLiveblocksFlow returned ${nodes.length} node(s):`, (nodes as any[]).map((n) => n.id))
  }, [nodes])

  const reactFlow = useReactFlow()
  const { addNodes, setNodes, setEdges, screenToFlowPosition } = reactFlow
  const { undo, redo, canUndo, canRedo } = useHistory()
  const [, updateMyPresence] = useMyPresence()
  const [savedStateLoaded, setSavedStateLoaded] = useState(false)
  const [aiStatus, setAiStatus] = useState<string | null>(null)
  const aiStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEventListener(({ event }) => {
    if (event.type !== "AI_STATUS") return
    setAiStatus(event.message)
    if (aiStatusTimer.current) clearTimeout(aiStatusTimer.current)
    if (event.status === "complete" || event.status === "error") {
      aiStatusTimer.current = setTimeout(() => setAiStatus(null), 3000)
    }
  })

  useKeyboardShortcuts({ instance: reactFlow, onUndo: undo, onRedo: redo })

  const { save } = useCanvasAutosave({
    projectId,
    nodes: nodes as CanvasNode[],
    edges: edges as CanvasEdge[],
    onStatusChange: onSaveStatusChange ?? (() => {}),
  })

  useEffect(() => {
    onSaveReady?.(save)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save])

  // Load saved canvas state only if the room is empty (no active collaboration)
  useEffect(() => {
    if (savedStateLoaded) return
    if (!savedCanvasUrl) { setSavedStateLoaded(true); return }
    if (nodes.length > 0 || edges.length > 0) { setSavedStateLoaded(true); return }

    fetch(`/api/projects/${projectId}/canvas`)
      .then((r) => r.json())
      .then((data) => {
        if (data.canvas?.nodes?.length || data.canvas?.edges?.length) {
          setNodes(data.canvas.nodes ?? [])
          setEdges(data.canvas.edges ?? [])
          setTimeout(() => reactFlow.fitView({ duration: 400, padding: 0.1 }), 80)
        }
      })
      .catch(() => {})
      .finally(() => setSavedStateLoaded(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!pendingTemplate) return
    setNodes(pendingTemplate.nodes)
    setEdges(pendingTemplate.edges)
    onTemplateClear?.()
    setTimeout(() => reactFlow.fitView({ duration: 400, padding: 0.1 }), 80)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTemplate])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      updateMyPresence({ cursor: pos })
    },
    [screenToFlowPosition, updateMyPresence],
  )

  const handleMouseLeave = useCallback(() => {
    updateMyPresence({ cursor: null })
  }, [updateMyPresence])

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
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="#3a3a42" />
      </ReactFlow>
      <LiveCursors />
      <div className="absolute right-3 top-3 z-10">
        <PresenceAvatars />
      </div>
      <CanvasControlBar onUndo={undo} onRedo={redo} canUndo={canUndo()} canRedo={canRedo()} />
      <ShapePanel />
      {aiStatus && (
        <div className="pointer-events-none absolute bottom-16 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full border border-surface-border bg-elevated/90 px-4 py-1.5 text-xs text-accent-ai-text shadow-lg backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0AC7B4]" />
            {aiStatus}
            <span className="ml-1 opacity-50">[nodes: {nodes.length}]</span>
          </div>
        </div>
      )}
      {/* Dev: always-visible node count so we can spot updates even when aiStatus is gone */}
      <div className="pointer-events-none absolute left-3 top-3 z-50 rounded bg-black/40 px-2 py-0.5 font-mono text-[10px] text-white/50">
        lb:{nodes.length}n {edges.length}e
      </div>
    </div>
  )
}
