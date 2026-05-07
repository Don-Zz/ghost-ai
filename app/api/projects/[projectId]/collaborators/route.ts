import { auth, clerkClient, currentUser } from "@clerk/nextjs/server"
import type { NextRequest } from "next/server"
import prisma from "@/lib/prisma"

interface CollaboratorUser {
  email: string
  displayName: string | null
  avatarUrl: string | null
}

async function enrichCollaborators(emails: string[]): Promise<CollaboratorUser[]> {
  if (emails.length === 0) return []
  const client = await clerkClient()
  const { data: users } = await client.users.getUserList({ emailAddress: emails })

  const userMap = new Map<string, { displayName: string | null; avatarUrl: string | null }>()
  for (const user of users) {
    const matched = user.emailAddresses.find((e) => emails.includes(e.emailAddress))
    if (matched) {
      const displayName =
        [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || null
      userMap.set(matched.emailAddress, {
        displayName,
        avatarUrl: user.imageUrl || null,
      })
    }
  }

  return emails.map((email) => ({
    email,
    displayName: userMap.get(email)?.displayName ?? null,
    avatarUrl: userMap.get(email)?.avatarUrl ?? null,
  }))
}

async function assertAccess(
  projectId: string,
  userId: string,
): Promise<{ ownerId: string } | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  })
  return project
}

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/projects/[projectId]/collaborators">,
) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { projectId } = await ctx.params

  const project = await assertAccess(projectId, userId)
  if (!project) return Response.json({ error: "Not found" }, { status: 404 })

  if (project.ownerId !== userId) {
    const user = await currentUser()
    const email = user?.emailAddresses[0]?.emailAddress ?? null
    if (!email) return Response.json({ error: "Forbidden" }, { status: 403 })
    const collab = await prisma.projectCollaborator.findFirst({
      where: { projectId, collaboratorEmail: email },
    })
    if (!collab) return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const records = await prisma.projectCollaborator.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  })

  const collaborators = await enrichCollaborators(records.map((r) => r.collaboratorEmail))
  return Response.json({ collaborators })
}

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/projects/[projectId]/collaborators">,
) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { projectId } = await ctx.params

  const project = await assertAccess(projectId, userId)
  if (!project) return Response.json({ error: "Not found" }, { status: 404 })
  if (project.ownerId !== userId) return Response.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
  if (!email || !email.includes("@")) {
    return Response.json({ error: "Valid email is required" }, { status: 400 })
  }

  try {
    await prisma.projectCollaborator.create({
      data: { projectId, collaboratorEmail: email },
    })
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === "P2002") {
      return Response.json({ error: "Already a collaborator" }, { status: 409 })
    }
    console.error("Add collaborator error:", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }

  const [collaborator] = await enrichCollaborators([email])
  return Response.json({ collaborator }, { status: 201 })
}

export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<"/api/projects/[projectId]/collaborators">,
) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { projectId } = await ctx.params

  const project = await assertAccess(projectId, userId)
  if (!project) return Response.json({ error: "Not found" }, { status: 404 })
  if (project.ownerId !== userId) return Response.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
  if (!email) return Response.json({ error: "Email is required" }, { status: 400 })

  await prisma.projectCollaborator.deleteMany({
    where: { projectId, collaboratorEmail: email },
  })

  return new Response(null, { status: 204 })
}
