import { auth } from "@clerk/nextjs/server"
import type { NextRequest } from "next/server"
import { auth as triggerAuth } from "@trigger.dev/sdk"
import prisma from "@/lib/prisma"

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const runId = typeof body?.runId === "string" ? body.runId.trim() : ""

  if (!runId) {
    return Response.json({ error: "runId is required" }, { status: 400 })
  }

  const taskRun = await prisma.taskRun.findUnique({ where: { runId } })
  if (!taskRun || taskRun.userId !== userId) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const token = await triggerAuth.createPublicToken({
    scopes: { read: { runs: [runId] } },
    expirationTime: "1h",
  })

  return Response.json({ token })
}
