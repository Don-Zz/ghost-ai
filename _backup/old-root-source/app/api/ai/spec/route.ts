import { auth, currentUser } from "@clerk/nextjs/server"
import type { NextRequest } from "next/server"
import { tasks } from "@trigger.dev/sdk"
import { z } from "zod"
import prisma from "@/lib/prisma"
import type { generateSpec } from "@/trigger/generate-spec"

const BodySchema = z.object({
  roomId: z.string().min(1),
  chatHistory: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }),
  ),
  nodes: z.array(z.record(z.string(), z.unknown())),
  edges: z.array(z.record(z.string(), z.unknown())),
})

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const raw = await request.json().catch(() => null)
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body", issues: parsed.error.issues }, { status: 400 })
  }

  const { roomId, chatHistory, nodes, edges } = parsed.data

  // roomId === projectId in this app — resolve project without trusting a client-supplied projectId
  const project = await prisma.project.findUnique({
    where: { id: roomId },
    select: { id: true, ownerId: true },
  })
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 })
  }

  const isOwner = project.ownerId === userId
  if (!isOwner) {
    const user = await currentUser()
    const email = user?.emailAddresses[0]?.emailAddress ?? null
    const collab = email
      ? await prisma.projectCollaborator.findFirst({
          where: { projectId: project.id, collaboratorEmail: email },
        })
      : null
    if (!collab) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  const handle = await tasks.trigger<typeof generateSpec>("generate-spec", {
    projectId: project.id,
    roomId,
    chatHistory,
    nodes,
    edges,
  })

  await prisma.taskRun.create({
    data: {
      runId: handle.id,
      projectId: project.id,
      userId,
    },
  })

  return Response.json({ runId: handle.id }, { status: 201 })
}
