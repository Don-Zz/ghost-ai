import { auth } from "@clerk/nextjs/server"
import type { NextRequest } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
  })

  return Response.json({ projects })
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const rawName = typeof body?.name === "string" ? body.name.trim() : ""
  const name = rawName || "Untitled Project"
  const rawId = typeof body?.id === "string" ? body.id.trim() : undefined

  const project = await prisma.project.create({
    data: {
      ...(rawId ? { id: rawId } : {}),
      ownerId: userId,
      name,
    },
  })

  return Response.json({ project }, { status: 201 })
}
