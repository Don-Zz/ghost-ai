"use client"

import { useEffect, useRef, useCallback } from "react"
import type { CanvasNode, CanvasEdge } from "@/types/canvas"

export type SaveStatus = "idle" | "saving" | "saved" | "error"

interface UseCanvasAutosaveOptions {
  projectId: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  onStatusChange: (status: SaveStatus) => void
  debounceMs?: number
}

export function useCanvasAutosave({
  projectId,
  nodes,
  edges,
  onStatusChange,
  debounceMs = 1500,
}: UseCanvasAutosaveOptions): { save: () => Promise<void> } {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestRef = useRef({ nodes, edges })

  // Track previous references so we only save on genuine changes.
  // This also makes the hook immune to React Strict Mode's double-invocation,
  // which re-runs effects with the same reference — prevRef comparisons return
  // false in that case and no spurious save is scheduled.
  const prevNodesRef = useRef(nodes)
  const prevEdgesRef = useRef(edges)

  latestRef.current = { nodes, edges }

  const save = useCallback(async () => {
    onStatusChange("saving")
    try {
      const res = await fetch(`/api/projects/${projectId}/canvas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes: latestRef.current.nodes, edges: latestRef.current.edges }),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => "")
        console.error(`[autosave] PUT /canvas failed (${res.status}):`, body)
        throw new Error(`Save failed: ${res.status}`)
      }
      onStatusChange("saved")
    } catch (err) {
      console.error("[autosave] save error:", err)
      onStatusChange("error")
    }
  }, [projectId, onStatusChange])

  useEffect(() => {
    const nodesChanged = nodes !== prevNodesRef.current
    const edgesChanged = edges !== prevEdgesRef.current

    prevNodesRef.current = nodes
    prevEdgesRef.current = edges

    if (!nodesChanged && !edgesChanged) return

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(save, debounceMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges])

  return { save }
}
