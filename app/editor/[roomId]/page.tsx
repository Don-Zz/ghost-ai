import { AccessDenied } from "@/components/editor/access-denied"
import { WorkspaceShell } from "@/components/editor/workspace-shell"
import { getCurrentIdentity, getProjectWithAccess } from "@/lib/project-access"

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ roomId: string }>
}) {
  const { roomId } = await params
  const { userId, email } = await getCurrentIdentity()

  if (!userId) return <AccessDenied />

  const project = await getProjectWithAccess(roomId, userId, email)
  if (!project) return <AccessDenied />

  return <WorkspaceShell project={project} isOwner={project.isOwner} />
}
