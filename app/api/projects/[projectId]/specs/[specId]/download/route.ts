import { auth } from "@clerk/nextjs/server"
import type { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { getCurrentIdentity } from "@/lib/project-access"

async function hasProjectAccess(projectId: string, userId: string, email: string | null): Promise<boolean> {
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

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/projects/[projectId]/specs/[specId]/download">
) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { projectId, specId } = await ctx.params
  const { email } = await getCurrentIdentity()

  const allowed = await hasProjectAccess(projectId, userId, email)
  if (!allowed) return Response.json({ error: "Forbidden" }, { status: 403 })

  const spec = await prisma.projectSpec.findUnique({
    where: { id: specId },
    select: { projectId: true, filePath: true, id: true },
  })

  if (!spec) return Response.json({ error: "Spec not found" }, { status: 404 })
  if (spec.projectId !== projectId) return Response.json({ error: "Forbidden" }, { status: 403 })

  const res = await fetch(spec.filePath, {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
  })

  if (!res.ok) return Response.json({ error: "Failed to retrieve spec" }, { status: 502 })

  const content = await res.text()

  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="spec-${specId}.md"`,
    },
  })
}
