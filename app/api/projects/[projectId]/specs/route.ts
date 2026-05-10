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
  ctx: RouteContext<"/api/projects/[projectId]/specs">
) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { projectId } = await ctx.params
  const { email } = await getCurrentIdentity()

  const allowed = await hasProjectAccess(projectId, userId, email)
  if (!allowed) return Response.json({ error: "Forbidden" }, { status: 403 })

  const specs = await prisma.projectSpec.findMany({
    where: { projectId },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  })

  return Response.json({ specs })
}
