import { auth } from "@clerk/nextjs/server"
import type { NextRequest } from "next/server"
import { tasks, auth as triggerAuth } from "@trigger.dev/sdk"
import prisma from "@/lib/prisma"
import { getProjectWithAccess, getCurrentIdentity } from "@/lib/project-access"

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : ""
  const roomId = typeof body?.roomId === "string" ? body.roomId.trim() : ""

  if (!prompt || !roomId) {
    return Response.json({ error: "prompt and roomId are required" }, { status: 400 })
  }

  const { email } = await getCurrentIdentity()
  const project = await getProjectWithAccess(roomId, userId, email)
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 })

  const handle = await tasks.trigger("design-agent", { prompt, roomId })
  console.log("[/api/ai/design] triggered run:", handle.id, "room:", roomId)

  await prisma.taskRun.create({
    data: { runId: handle.id, projectId: roomId, userId },
  })

  const publicToken = await triggerAuth.createPublicToken({
    scopes: { read: { runs: [handle.id] } },
  })

  return Response.json({ runId: handle.id, publicToken }, { status: 201 })
}
