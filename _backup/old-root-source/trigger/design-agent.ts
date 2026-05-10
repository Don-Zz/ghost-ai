import { task } from "@trigger.dev/sdk"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateText, tool, stepCountIs } from "ai"
import { z } from "zod"
import { Liveblocks } from "@liveblocks/node"
import { mutateFlow } from "@liveblocks/react-flow/node"

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
  if (obj.liveblocksType === "LiveObject" || obj.liveblocksType === "LiveMap") {
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

// useLiveblocksFlow stores canvas data at storage["flow"].nodes / storage["flow"].edges
// Both are LiveMaps (keyed by node/edge ID), nested inside a LiveObject at key "flow".
const LB_FLOW_KEY = "flow"

async function getCurrentCanvas(
  roomId: string,
): Promise<{ nodes: CanvasNode[]; edges: CanvasEdge[] }> {
  try {
    const res = await fetch(
      `${LB_BASE}/v2/rooms/${encodeURIComponent(roomId)}/storage`,
      { headers: lbHeaders() },
    )
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.error(`[getCurrentCanvas] storage fetch failed: ${res.status} ${res.statusText}`)
      return { nodes: [], edges: [] }
    }
    const json = (await res.json()) as { data?: unknown }
    const root = unwrapLb(json.data) as Record<string, unknown>
    const flow = root?.[LB_FLOW_KEY] as Record<string, unknown> | undefined
    // eslint-disable-next-line no-console
    console.log(`[getCurrentCanvas] flow key present: ${!!flow}, raw flow keys: ${flow ? Object.keys(flow).join(", ") : "none"}`)
    const nodesMap = flow?.nodes as Record<string, CanvasNode> | undefined
    const edgesMap = flow?.edges as Record<string, CanvasEdge> | undefined
    const result = {
      nodes: nodesMap ? Object.values(nodesMap) : [],
      edges: edgesMap ? Object.values(edgesMap) : [],
    }
    // eslint-disable-next-line no-console
    console.log(`[getCurrentCanvas] read ${result.nodes.length} node(s), ${result.edges.length} edge(s) from room ${roomId}`)
    return result
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[getCurrentCanvas] unexpected error:", err)
    return { nodes: [], edges: [] }
  }
}

async function patchCanvas(
  roomId: string,
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  prevNodes: CanvasNode[],
  prevEdges: CanvasEdge[],
) {
  const client = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY! })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await mutateFlow({ client: client as any, roomId }, async (flow) => {
    // Remove nodes that the agent deleted
    const finalNodeIds = new Set(nodes.map((n) => n.id))
    for (const n of prevNodes) {
      if (!finalNodeIds.has(n.id)) flow.removeNode(n.id)
    }

    // Remove edges that the agent deleted
    const finalEdgeIds = new Set(edges.map((e) => e.id))
    for (const e of prevEdges) {
      if (!finalEdgeIds.has(e.id)) flow.removeEdge(e.id)
    }

    // Upsert all nodes and edges using the proper LiveMap/LiveObject encoding
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    flow.addNodes(nodes as any[])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    flow.addEdges(edges as any[])
  })

  // eslint-disable-next-line no-console
  console.log(`[patchCanvas] mutateFlow done — ${nodes.length} node(s), ${edges.length} edge(s) in room ${roomId}`)
}

async function setPresence(roomId: string, thinking: boolean) {
  try {
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
  } catch {
    // non-fatal — no connected clients yet
  }
}

async function broadcastStatus(
  roomId: string,
  message: string,
  status: "start" | "processing" | "complete" | "error",
) {
  try {
    const res = await fetch(
      `${LB_BASE}/v2/rooms/${encodeURIComponent(roomId)}/broadcast-event`,
      {
        method: "POST",
        headers: lbHeaders(),
        body: JSON.stringify({ event: { type: "AI_STATUS", message, status } }),
      },
    )
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.warn(`[broadcastStatus] ${res.status} for "${message}" (no active clients?)`)
    }
  } catch {
    // non-fatal — broadcast is best-effort
  }
}

const SYSTEM_PROMPT = `You are Ghost AI, an expert system design architect. Your job is to generate or update system architecture diagrams on a shared canvas by calling the provided tools.

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

When updating an existing canvas apply the user request incrementally — keep unchanged nodes as-is and only call tools for nodes/edges that need to change.

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

    try {
      // 1. Signal start + set AI presence
      await Promise.all([
        setPresence(roomId, true),
        broadcastStatus(roomId, "Ghost AI is starting…", "start"),
      ])

      // 2. Read current canvas state
      await broadcastStatus(roomId, "Reading canvas state…", "processing")
      const { nodes: initialNodes, edges: initialEdges } = await getCurrentCanvas(roomId)

      // Mutable state — tools mutate these arrays in place
      const nodes: CanvasNode[] = [...initialNodes]
      const edges: CanvasEdge[] = [...initialEdges]

      // 3. Call OpenRouter with canvas-mutation tools
      await broadcastStatus(roomId, "Designing your architecture…", "processing")

      const openrouter = createOpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY,
      })

      try {
        const genResult = await generateText({
          model: openrouter("openai/gpt-oss-20b:free"),
          system: SYSTEM_PROMPT,
          prompt: [
            `Current canvas nodes (${nodes.length}):\n${JSON.stringify(nodes, null, 2)}`,
            `Current canvas edges (${edges.length}):\n${JSON.stringify(edges, null, 2)}`,
            `\nUser request: ${prompt}`,
            "\nDesign a focused diagram: call addNode for each component (4–6 max), then addEdge to connect them. Stop when done.",
          ].join("\n"),
          maxOutputTokens: 4096,
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
              "Add a directed edge between two nodes. Use same id to upsert. Both source and target must be node IDs that were previously created with addNode.",
            inputSchema: z.object({
              id: z.string().describe("Edge ID, format: e-{sourceId}-{targetId}"),
              source: z.string().describe("Source node ID — must exist in the node registry"),
              target: z.string().describe("Target node ID — must exist in the node registry"),
              label: z.string().optional().describe("Optional edge label"),
            }),
            execute: async ({ id, source, target, label }) => {
              const nodeIds = nodes.map((n) => n.id)
              const missingSource = !nodeIds.includes(source)
              const missingTarget = !nodeIds.includes(target)
              if (missingSource || missingTarget) {
                const missing = [missingSource && source, missingTarget && target].filter(Boolean).join(", ")
                // eslint-disable-next-line no-console
                console.warn(`[addEdge] rejected edge "${id}" — unknown node(s): ${missing}. Known: ${nodeIds.join(", ")}`)
                return {
                  success: false,
                  error: `Cannot create edge — node(s) not found: ${missing}`,
                  knownNodeIds: nodeIds,
                }
              }
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
        // eslint-disable-next-line no-console
        console.log(
          `[designAgent] generateText finished — steps: ${genResult.steps.length}, finishReason: ${genResult.finishReason}`,
        )
      } catch (genErr) {
        // gpt-oss-20b emits a malformed header token after completing all tool calls.
        // Tool execute() callbacks already ran, so mutations are captured in the arrays.
        // Proceed if we have something to write; re-throw only if nothing was generated.
        if (nodes.length === 0) throw genErr
        // eslint-disable-next-line no-console
        console.warn(
          `[designAgent] generateText threw after ${nodes.length} node(s) captured — continuing:`,
          (genErr as Error).message,
        )
      }

      // 4. Final consistency pass: drop any edges whose source or target is not in the node registry.
      // This guards against edge cases where the LLM error response wasn't acted on, or where
      // a node was deleted after an edge referencing it had already been accepted.
      const finalNodeIds = new Set(nodes.map((n) => n.id))
      const validEdges = edges.filter((e) => {
        const ok = finalNodeIds.has(e.source) && finalNodeIds.has(e.target)
        if (!ok) {
          // eslint-disable-next-line no-console
          console.warn(
            `[designAgent] dropping dangling edge "${e.id}" (source="${e.source}" target="${e.target}") — not in final node set [${[...finalNodeIds].join(", ")}]`,
          )
        }
        return ok
      })
      if (validEdges.length !== edges.length) {
        edges.length = 0
        edges.push(...validEdges)
      }

      // Patch Liveblocks storage with final state
      // eslint-disable-next-line no-console
      console.log(
        `[designAgent] LLM produced ${nodes.length} node(s), ${edges.length} edge(s):`,
        JSON.stringify(nodes.map((n) => ({ id: n.id, label: n.data.label, shape: n.data.shape }))),
      )
      await broadcastStatus(roomId, "Updating canvas…", "processing")
      await patchCanvas(roomId, nodes, edges, initialNodes, initialEdges)

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
      await Promise.allSettled([
        broadcastStatus(roomId, "Something went wrong. Please try again.", "error"),
        setPresence(roomId, false),
      ])
      throw err
    }
  },
})
