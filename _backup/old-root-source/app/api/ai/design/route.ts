import { auth } from "@clerk/nextjs/server"
import type { NextRequest } from "next/server"
import { tasks } from "@trigger.dev/sdk"
import prisma from "@/lib/prisma"
import type { designTask } from "@/trigger/design-agent"

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : ""
  const roomId = typeof body?.roomId === "string" ? body.roomId.trim() : ""
  const projectId = typeof body?.projectId === "string" ? body.projectId.trim() : ""

  if (!prompt || !roomId || !projectId) {
    return Response.json({ error: "prompt, roomId, and projectId are required" }, { status: 400 })
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
  })
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 })
  }

  const handle = await tasks.trigger<typeof designTask>("design-agent", { prompt, roomId })

  await prisma.taskRun.create({
    data: {
      runId: handle.id,
      projectId,
      userId,
    },
  })

  return Response.json({ runId: handle.id }, { status: 201 })
}
