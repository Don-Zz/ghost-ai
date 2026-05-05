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

  // Validate rawId if provided: only allow lowercase letters, numbers, hyphens, 3-32 chars
  let id: string | undefined = undefined
  if (rawId) {
    const idPattern = /^[a-z0-9-]{3,32}$/
    if (!idPattern.test(rawId)) {
      return Response.json({ error: "Invalid project id format" }, { status: 400 })
    }
    id = rawId
  }

  try {
    const project = await prisma.project.create({
      data: {
        ...(id ? { id } : {}),
        ownerId: userId,
        name,
      },
    })
    return Response.json({ project }, { status: 201 })
  } catch (err: any) {
    // Prisma unique constraint error
    if (err?.code === "P2002") {
      return Response.json({ error: "Project id already exists" }, { status: 409 })
    }
    console.error("Project creation error:", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
