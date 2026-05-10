import { auth, currentUser } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { getLiveblocks, getUserColor } from "@/lib/liveblocks"
import { getProjectWithAccess } from "@/lib/project-access"

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return new NextResponse(null, { status: 401 })

  const { room } = await request.json()
  if (!room) return new NextResponse("Missing room", { status: 400 })

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress ?? null

  const project = await getProjectWithAccess(room, userId, email)
  if (!project) return new NextResponse(null, { status: 403 })

  const liveblocks = getLiveblocks()
  await liveblocks.getOrCreateRoom(room, { defaultAccesses: [] })

  const name = user?.fullName ?? user?.firstName ?? email ?? "Anonymous"
  const avatar = user?.imageUrl ?? ""
  const color = getUserColor(userId)

  const session = liveblocks.prepareSession(userId, {
    userInfo: { name, avatar, color },
  })
  session.allow(room, session.FULL_ACCESS)

  const { status, body } = await session.authorize()
  return new Response(body, { status })
}
