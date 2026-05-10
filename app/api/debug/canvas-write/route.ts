import { auth, currentUser } from "@clerk/nextjs/server"
import { getProjectWithAccess } from "@/lib/project-access"
import { NextResponse } from "next/server"

const LB_BASE = "https://api.liveblocks.io"
const LB_FLOW_KEY = "flow"

function lbHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.LIVEBLOCKS_SECRET_KEY}`,
    "Content-Type": "application/json",
  }
}

const DEBUG_NODES = [
  {
    id: "debug-node-client",
    type: "canvasNode",
    position: { x: 100, y: 200 },
    data: { label: "Client", color: "#10233D", shape: "rectangle" },
    width: 160,
    height: 60,
  },
  {
    id: "debug-node-api",
    type: "canvasNode",
    position: { x: 400, y: 200 },
    data: { label: "API Gateway", color: "#0F2E18", shape: "pill" },
    width: 160,
    height: 50,
  },
  {
    id: "debug-node-db",
    type: "canvasNode",
    position: { x: 700, y: 200 },
    data: { label: "Database", color: "#062822", shape: "cylinder" },
    width: 100,
    height: 80,
  },
]

const DEBUG_EDGES = [
  {
    id: "e-debug-node-client-debug-node-api",
    type: "canvasEdge",
    source: "debug-node-client",
    target: "debug-node-api",
    data: { label: "HTTP" },
  },
  {
    id: "e-debug-node-api-debug-node-db",
    type: "canvasEdge",
    source: "debug-node-api",
    target: "debug-node-db",
    data: { label: "SQL" },
  },
]

type PatchOp = { op: string; path: string; value: unknown }

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress ?? null

  const payload = (await req.json()) as { roomId?: string }
  const roomId = payload.roomId
  if (!roomId) return NextResponse.json({ error: "roomId required" }, { status: 400 })

  const project = await getProjectWithAccess(roomId, userId, email)
  if (!project) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const ops: PatchOp[] = [
    ...DEBUG_NODES.map((node) => ({
      op: "add",
      path: `/${LB_FLOW_KEY}/nodes/${node.id}`,
      value: node,
    })),
    ...DEBUG_EDGES.map((edge) => ({
      op: "add",
      path: `/${LB_FLOW_KEY}/edges/${edge.id}`,
      value: edge,
    })),
  ]

  console.log(`[debug/canvas-write] sending ${ops.length} ops to room ${roomId}`)

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
    console.error(`[debug/canvas-write] PATCH failed ${res.status}:`, errText)
    return NextResponse.json({ error: `Liveblocks patch failed: ${res.status}`, detail: errText }, { status: 502 })
  }

  return NextResponse.json({
    ok: true,
    nodes: DEBUG_NODES.length,
    edges: DEBUG_EDGES.length,
    lbStatus: res.status,
  })
}
