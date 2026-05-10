import { auth } from "@clerk/nextjs/server"
import { put } from "@vercel/blob"
import type { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { getCurrentIdentity } from "@/lib/project-access"

async function hasProjectAccess(projectId: string, userId: string, email: string | null) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  })
  if (!project) return false
  if (project.ownerId === userId) return true
  if (email) {
    const collab = await prisma.projectCollaborator.findFirst({
      where: { projectId, collaboratorEmail: email },
    })
    if (collab) return true
  }
  return false
}

export async function PUT(
  request: NextRequest,
  ctx: RouteContext<"/api/projects/[projectId]/canvas">
) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { projectId } = await ctx.params
  const { email } = await getCurrentIdentity()

  const allowed = await hasProjectAccess(projectId, userId, email)
  if (!allowed) return Response.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ error: "Invalid JSON" }, { status: 400 })

  let blobUrl: string
  try {
    const blob = await put(`canvas/${projectId}.json`, JSON.stringify(body), {
      access: "private",
      contentType: "application/json",
      allowOverwrite: true,
    })
    blobUrl = blob.url
  } catch (err) {
    console.error("[canvas PUT] blob upload failed:", err)
    return Response.json({ error: "Failed to save canvas" }, { status: 500 })
  }

  try {
    await prisma.project.update({
      where: { id: projectId },
      data: { canvasJsonPath: blobUrl },
      select: { id: true },
    })
  } catch (err) {
    console.error("[canvas PUT] db update failed:", err)
    return Response.json({ error: "Failed to save canvas" }, { status: 500 })
  }

  return Response.json({ ok: true, url: blobUrl })
}

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/projects/[projectId]/canvas">
) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { projectId } = await ctx.params
  const { email } = await getCurrentIdentity()

  const allowed = await hasProjectAccess(projectId, userId, email)
  if (!allowed) return Response.json({ error: "Forbidden" }, { status: 403 })

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { canvasJsonPath: true },
    })

    if (!project?.canvasJsonPath) return Response.json({ canvas: null })

    const res = await fetch(project.canvasJsonPath, {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    })
    if (!res.ok) return Response.json({ canvas: null })

    const canvas = await res.json()
    return Response.json({ canvas })
  } catch (err) {
    console.error("[canvas GET] failed:", err)
    return Response.json({ error: "Failed to load canvas" }, { status: 500 })
  }
}
