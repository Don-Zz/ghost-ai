import { task } from "@trigger.dev/sdk"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateText, tool, stepCountIs } from "ai"
import { z } from "zod"

// Canvas constants — mirrors types/canvas.ts
const NODE_SHAPES = [
  "rectangle",
  "diamond",
  "circle",
  "pill",
  "cylinder",
  "hexagon",
] as const satisfies readonly [string, ...string[]]

const FILL_PALETTE = [
  "#1F1F1F",
  "#10233D",
  "#2E1938",
  "#331B00",
  "#3C1618",
  "#3A1726",
  "#0F2E18",
  "#062822",
] as const satisfies readonly [string, ...string[]]

const SHAPE_DIMS: Record<(typeof NODE_SHAPES)[number], { w: number; h: number }> = {
  rectangle: { w: 160, h: 60 },
  diamond:   { w: 120, h: 120 },
  circle:    { w: 80,  h: 80 },
  pill:      { w: 160, h: 50 },
  cylinder:  { w: 100, h: 80 },
  hexagon:   { w: 100, h: 100 },
}

// Internal types for mutable state
interface CanvasNode {
  id: string
  type: "canvasNode"
  position: { x: number; y: number }
  data: { label: string; color: string; shape: string }
  width: number
  height: number
}

interface CanvasEdge {
  id: string
  type: "canvasEdge"
  source: string
  target: string
  data?: { label?: string }
}

// --- Liveblocks REST helpers ---
const LB_BASE = "https://api.liveblocks.io"
const AI_USER_ID = "ai:ghost"

function lbHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.LIVEBLOCKS_SECRET_KEY}`,
    "Content-Type": "application/json",
  }
}

function unwrapLb(val: unknown): unknown {
  if (val === null || typeof val !== "object") return val
  const obj = val as Record<string, unknown>
  if (obj.liveblocksType === "LiveObject") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries((obj.data as Record<string, unknown>) ?? {}))
      out[k] = unwrapLb(v)
    return out
  }
  if (obj.liveblocksType === "LiveList") {
    return ((obj.data as unknown[]) ?? []).map(unwrapLb)
  }
  if (Array.isArray(val)) return val.map(unwrapLb)
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) out[k] = unwrapLb(v)
  return out
}

async function getCurrentCanvas(
  roomId: string,
): Promise<{ nodes: CanvasNode[]; edges: CanvasEdge[] }> {
  try {
    const res = await fetch(
      `${LB_BASE}/v2/rooms/${encodeURIComponent(roomId)}/storage`,
      { headers: lbHeaders() },
    )
    if (!res.ok) {
      console.error("[design-agent] getCurrentCanvas HTTP error:", res.status)
      return { nodes: [], edges: [] }
    }
    const json = (await res.json()) as { data?: unknown }
    // Root is a LiveObject → unwraps to plain object
    const root = unwrapLb(json.data) as Record<string, unknown>
    // `flow` is a LiveObject containing two LiveMaps
    const flow = (root?.flow ?? {}) as Record<string, unknown>
    // After unwrapLb, LiveMaps are NOT auto-converted to arrays — they remain as
    // { liveblocksType: "LiveMap", data: { [id]: item, ... } }
    const nodesLiveMap = flow?.nodes as { liveblocksType?: string; data?: Record<string, unknown> } | undefined
    const edgesLiveMap = flow?.edges as { liveblocksType?: string; data?: Record<string, unknown> } | undefined
    const nodes: CanvasNode[] = nodesLiveMap?.data
      ? (Object.values(nodesLiveMap.data).filter(Boolean) as CanvasNode[])
      : []
    const edges: CanvasEdge[] = edgesLiveMap?.data
      ? (Object.values(edgesLiveMap.data).filter(Boolean) as CanvasEdge[])
      : []
    console.log(`[design-agent] getCurrentCanvas: ${nodes.length} nodes, ${edges.length} edges`)
    return { nodes, edges }
  } catch (err) {
    console.error("[design-agent] getCurrentCanvas error:", err instanceof Error ? err.message : String(err))
    return { nodes: [], edges: [] }
  }
}

// Mirrors the working debug route: individual ops per node/edge at /flow/nodes/{id}
async function patchCanvas(
  roomId: string,
  finalNodes: CanvasNode[],
  finalEdges: CanvasEdge[],
  originalNodeIds: Set<string>,
  originalEdgeIds: Set<string>,
) {
  const ops: Array<{ op: string; path: string; value?: unknown }> = []

  const finalNodeIds = new Set(finalNodes.map((n) => n.id))
  const finalEdgeIds = new Set(finalEdges.map((e) => e.id))

  for (const node of finalNodes) {
    ops.push({ op: "add", path: `/flow/nodes/${node.id}`, value: node })
  }
  for (const id of originalNodeIds) {
    if (!finalNodeIds.has(id)) ops.push({ op: "remove", path: `/flow/nodes/${id}` })
  }
  for (const edge of finalEdges) {
    ops.push({ op: "add", path: `/flow/edges/${edge.id}`, value: edge })
  }
  for (const id of originalEdgeIds) {
    if (!finalEdgeIds.has(id)) ops.push({ op: "remove", path: `/flow/edges/${id}` })
  }

  if (ops.length === 0) {
    console.log("[design-agent] patchCanvas: no ops to apply")
    return
  }

  console.log(`[design-agent] patchCanvas: sending ${ops.length} ops`)
  const res = await fetch(
    `${LB_BASE}/v2/rooms/${encodeURIComponent(roomId)}/storage/json-patch`,
    {
      method: "PATCH",
      headers: lbHeaders(),
      body: JSON.stringify(ops),
    },
  )
  if (!res.ok) {
    const errText = await res.text().catch(() => "(unreadable)")
    console.error("[design-agent] patchCanvas HTTP error:", res.status, errText)
    throw new Error(`Liveblocks patch failed: ${res.status} — check LIVEBLOCKS_SECRET_KEY`)
  }
  console.log("[design-agent] patchCanvas: success")
}

async function setPresence(roomId: string, thinking: boolean) {
  await fetch(
    `${LB_BASE}/v2/rooms/${encodeURIComponent(roomId)}/presence`,
    {
      method: "POST",
      headers: lbHeaders(),
      body: JSON.stringify({
        userId: AI_USER_ID,
        userInfo: { name: "Ghost AI", avatar: "", color: "#0AC7B4" },
        data: { cursor: null, thinking },
        ttl: thinking ? 30 : 2,
      }),
    },
  )
}

async function broadcastStatus(
  roomId: string,
  message: string,
  status: "start" | "processing" | "complete" | "error",
) {
  const res = await fetch(
    `${LB_BASE}/v2/rooms/${encodeURIComponent(roomId)}/broadcast-event`,
    {
      method: "POST",
      headers: lbHeaders(),
      body: JSON.stringify({ event: { type: "AI_STATUS", message, status } }),
    },
  )
  if (!res.ok)
    console.error("[design-agent] broadcastStatus HTTP error:", res.status, "— check LIVEBLOCKS_SECRET_KEY")
}

const SYSTEM_PROMPT = `You are Ghost AI, an expert system design architect. Generate or update architecture diagrams on a canvas by calling the provided tools.

## Shape guide
- rectangle  → services, components, workers
- diamond    → decisions, routers, load balancers
- circle     → events, queues (small)
- pill       → API gateways, REST/GraphQL endpoints
- cylinder   → databases, object storage, caches
- hexagon    → external systems, third-party services

## Color guide (use exact hex fills)
- #1F1F1F (Default/Dark) → generic nodes
- #10233D (Blue)         → internal services
- #062822 (Teal)         → databases / storage
- #0F2E18 (Green)        → API gateways / proxies
- #2E1938 (Purple)       → message queues / async workers
- #331B00 (Orange)       → caches / CDN
- #3C1618 (Red)          → critical path / security
- #3A1726 (Pink)         → auth / identity

## Layout rules
- Flow left-to-right or top-to-bottom
- Node centres at least 220px apart
- x range 80–1400, y range 80–900
- Keep node IDs stable across updates — only change IDs for new nodes

## Node ID format
"node-{name}-{index}"  (kebab-case name, 1-based index)

## Edge ID format
"e-{sourceId}-{targetId}"

## Output rules — IMPORTANT
- Produce a focused design: 4–6 nodes for a new diagram, fewer for an update.
- Call ALL addNode tools first, then ALL addEdge tools — do not interleave.
- When updating an existing canvas, only call tools for nodes/edges that change.
- Stop immediately once all planned nodes and edges have been added.`

interface DesignPayload {
  prompt: string
  roomId: string
}

export const designTask = task({
  id: "design-agent",
  maxDuration: 300,

  run: async (payload: DesignPayload) => {
    const { prompt, roomId } = payload
    console.log("[design-agent] start", { roomId, promptLen: prompt.length })

    try {
      // 1. Signal start + set AI presence
      await Promise.all([
        setPresence(roomId, true),
        broadcastStatus(roomId, "Ghost AI is starting…", "start"),
      ])

      // 2. Read current canvas state
      await broadcastStatus(roomId, "Reading canvas state…", "processing")
      const { nodes: initialNodes, edges: initialEdges } = await getCurrentCanvas(roomId)

      // Track original IDs so patchCanvas can emit remove ops for deleted items
      const originalNodeIds = new Set(initialNodes.map((n) => n.id))
      const originalEdgeIds = new Set(initialEdges.map((e) => e.id))

      // Mutable state — tools mutate these arrays in place
      const nodes: CanvasNode[] = [...initialNodes]
      const edges: CanvasEdge[] = [...initialEdges]

      // 3. Call OpenRouter with canvas-mutation tools
      await broadcastStatus(roomId, "Designing your architecture…", "processing")
      console.log("[design-agent] calling openai/gpt-oss-20b:free, canvas:", nodes.length, "nodes", edges.length, "edges")

      const openrouter = createOpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY,
      })

      await generateText({
        model: openrouter("openai/gpt-oss-20b:free"),
        system: SYSTEM_PROMPT,
        prompt: [
          `Current canvas nodes (${nodes.length}):\n${JSON.stringify(nodes, null, 2)}`,
          `Current canvas edges (${edges.length}):\n${JSON.stringify(edges, null, 2)}`,
          `\nUser request: ${prompt}`,
          "\nDesign a focused diagram: call addNode for each component (4–6 max), then addEdge to connect them. Stop when done.",
        ].join("\n"),
        maxOutputTokens: 800,
        stopWhen: stepCountIs(20),
        tools: {
          addNode: tool({
            description:
              "Add a new node to the canvas. Also use this to replace/update a node entirely (same id = upsert).",
            inputSchema: z.object({
              id: z.string().describe("Node ID, format: node-{name}-{index}"),
              shape: z.enum(NODE_SHAPES),
              label: z.string().describe("1–3 word label"),
              color: z.enum(FILL_PALETTE),
              x: z.number().describe("X centre position, 80–1400"),
              y: z.number().describe("Y centre position, 80–900"),
            }),
            execute: async ({ id, shape, label, color, x, y }) => {
              const dims = SHAPE_DIMS[shape]
              const node: CanvasNode = {
                id,
                type: "canvasNode",
                position: { x, y },
                data: { label, color, shape },
                width: dims.w,
                height: dims.h,
              }
              const idx = nodes.findIndex((n) => n.id === id)
              if (idx >= 0) nodes[idx] = node
              else nodes.push(node)
              return { success: true, nodeId: id }
            },
          }),

          moveNode: tool({
            description: "Move an existing node to a new position.",
            inputSchema: z.object({
              id: z.string(),
              x: z.number(),
              y: z.number(),
            }),
            execute: async ({ id, x, y }) => {
              const node = nodes.find((n) => n.id === id)
              if (!node) return { success: false, error: `Node "${id}" not found` }
              node.position = { x, y }
              return { success: true }
            },
          }),

          resizeNode: tool({
            description: "Resize a node to specific dimensions.",
            inputSchema: z.object({
              id: z.string(),
              width: z.number(),
              height: z.number(),
            }),
            execute: async ({ id, width, height }) => {
              const node = nodes.find((n) => n.id === id)
              if (!node) return { success: false, error: `Node "${id}" not found` }
              node.width = width
              node.height = height
              return { success: true }
            },
          }),

          updateNodeData: tool({
            description: "Update a node's label, color, or shape without repositioning it.",
            inputSchema: z.object({
              id: z.string(),
              label: z.string().optional(),
              color: z.enum(FILL_PALETTE).optional(),
              shape: z.enum(NODE_SHAPES).optional(),
            }),
            execute: async ({ id, label, color, shape }) => {
              const node = nodes.find((n) => n.id === id)
              if (!node) return { success: false, error: `Node "${id}" not found` }
              if (label !== undefined) node.data.label = label
              if (color !== undefined) node.data.color = color
              if (shape !== undefined) {
                node.data.shape = shape
                const dims = SHAPE_DIMS[shape]
                node.width = dims.w
                node.height = dims.h
              }
              return { success: true }
            },
          }),

          deleteNode: tool({
            description: "Delete a node and all edges connected to it.",
            inputSchema: z.object({
              id: z.string(),
            }),
            execute: async ({ id }) => {
              const idx = nodes.findIndex((n) => n.id === id)
              if (idx < 0) return { success: false, error: `Node "${id}" not found` }
              nodes.splice(idx, 1)
              let removed = 0
              for (let i = edges.length - 1; i >= 0; i--) {
                if (edges[i].source === id || edges[i].target === id) {
                  edges.splice(i, 1)
                  removed++
                }
              }
              return { success: true, edgesRemoved: removed }
            },
          }),

          addEdge: tool({
            description:
              "Add a directed edge between two nodes. Use same id to upsert.",
            inputSchema: z.object({
              id: z.string().describe("Edge ID, format: e-{sourceId}-{targetId}"),
              source: z.string().describe("Source node ID"),
              target: z.string().describe("Target node ID"),
              label: z.string().optional().describe("Optional edge label"),
            }),
            execute: async ({ id, source, target, label }) => {
              const edge: CanvasEdge = {
                id,
                type: "canvasEdge",
                source,
                target,
                ...(label ? { data: { label } } : {}),
              }
              const idx = edges.findIndex((e) => e.id === id)
              if (idx >= 0) edges[idx] = edge
              else edges.push(edge)
              return { success: true, edgeId: id }
            },
          }),

          deleteEdge: tool({
            description: "Delete an edge by ID.",
            inputSchema: z.object({
              id: z.string(),
            }),
            execute: async ({ id }) => {
              const idx = edges.findIndex((e) => e.id === id)
              if (idx < 0) return { success: false, error: `Edge "${id}" not found` }
              edges.splice(idx, 1)
              return { success: true }
            },
          }),
        },
      })

      console.log("[design-agent] generateText done, mutations:", nodes.length, "nodes", edges.length, "edges")

      // 4. Patch Liveblocks storage with final state
      await broadcastStatus(roomId, "Updating canvas…", "processing")
      await patchCanvas(roomId, nodes, edges, originalNodeIds, originalEdgeIds)

      // 5. Done
      await Promise.all([
        broadcastStatus(
          roomId,
          `Done — ${nodes.length} node${nodes.length !== 1 ? "s" : ""}, ${edges.length} edge${edges.length !== 1 ? "s" : ""}.`,
          "complete",
        ),
        setPresence(roomId, false),
      ])

      return {
        success: true,
        nodeCount: nodes.length,
        edgeCount: edges.length,
      }
    } catch (err) {
      console.error("[design-agent] error:", err instanceof Error ? err.message : String(err))
      await Promise.allSettled([
        broadcastStatus(roomId, "Something went wrong. Please try again.", "error"),
        setPresence(roomId, false),
      ])
      throw err
    }
  },
})
