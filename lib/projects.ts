import prisma from "@/lib/prisma"

export interface ProjectData {
  id: string
  name: string
}

export async function getOwnedProjects(userId: string): Promise<ProjectData[]> {
  return prisma.project.findMany({
    where: { ownerId: userId },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  })
}

export async function getSharedProjects(email: string): Promise<ProjectData[]> {
  const rows = await prisma.projectCollaborator.findMany({
    where: { collaboratorEmail: email },
    include: { project: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  })
  return rows.map((r) => r.project)
}
