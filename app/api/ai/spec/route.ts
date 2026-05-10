import { auth } from "@clerk/nextjs/server"
import type { NextRequest } from "next/server"
import { tasks } from "@trigger.dev/sdk"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { getProjectWithAccess, getCurrentIdentity } from "@/lib/project-access"

const BodySchema = z.object({
  roomId: z.string().min(1),
  chatHistory: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).default([]),
  nodes: z.array(z.unknown()).default([]),
  edges: z.array(z.unknown()).default([]),
})

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const raw = await request.json().catch(() => null)
  if (!raw) return Response.json({ error: "Invalid JSON" }, { status: 400 })

  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) return Response.json({ error: "Invalid request body" }, { status: 400 })

  const { roomId, chatHistory, nodes, edges } = parsed.data
  const { email } = await getCurrentIdentity()
  const project = await getProjectWithAccess(roomId, userId, email)
  if (!project) return Response.json({ error: "Project not found or access denied" }, { status: 403 })

  const handle = await tasks.trigger("generate-spec", {
    projectId: project.id,
    roomId,
    chatHistory,
    nodes,
    edges,
  })

  await prisma.taskRun.create({
    data: { runId: handle.id, projectId: project.id, userId },
  })

  return Response.json({ runId: handle.id }, { status: 201 })
}
