import { auth, currentUser } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"

export async function getCurrentIdentity(): Promise<{ userId: string | null; email: string | null }> {
  const { userId } = await auth()
  if (!userId) return { userId: null, email: null }
  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress ?? null
  return { userId, email }
}

export async function getProjectWithAccess(
  projectId: string,
  userId: string,
  email: string | null,
): Promise<{ id: string; name: string; isOwner: boolean } | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, ownerId: true },
  })
  if (!project) return null
  if (project.ownerId === userId) return { id: project.id, name: project.name, isOwner: true }
  if (email) {
    const collab = await prisma.projectCollaborator.findFirst({
      where: { projectId, collaboratorEmail: email },
    })
    if (collab) return { id: project.id, name: project.name, isOwner: false }
  }
  return null
}
