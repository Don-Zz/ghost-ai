"use client"

import { useOthers } from "@liveblocks/react"
import { useAuth, UserButton } from "@clerk/nextjs"

interface CollaboratorAvatarProps {
  name?: string
  avatar?: string
  color?: string
  index: number
}

function CollaboratorAvatar({ name, avatar, color = "#00c8d4", index }: CollaboratorAvatarProps) {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?"

  return (
    <div
      className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{
        marginLeft: index > 0 ? "-8px" : 0,
        outline: `2px solid ${color}40`,
        outlineOffset: "1px",
        zIndex: 10 - index,
      }}
    >
      {avatar ? (
        <img
          src={avatar}
          alt={name ?? "Collaborator"}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center text-[10px] font-semibold"
          style={{ backgroundColor: `${color}30`, color }}
        >
          {initials}
        </div>
      )}
    </div>
  )
}

export function PresenceAvatars() {
  const { userId } = useAuth()
  const others = useOthers()

  const collaborators = others.filter((other) => other.id !== userId)
  const visible = collaborators.slice(0, 5)
  const overflow = collaborators.length - 5

  return (
    <div className="flex items-center gap-2">
      {visible.length > 0 && (
        <div className="flex items-center">
          {visible.map((other, i) => (
            <CollaboratorAvatar
              key={other.connectionId}
              name={other.info?.name}
              avatar={other.info?.avatar}
              color={other.info?.color}
              index={i}
            />
          ))}
          {overflow > 0 && (
            <div
              className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-elevated text-[10px] font-medium text-copy-secondary"
              style={{
                marginLeft: "-8px",
                outline: "2px solid var(--border-default)",
                outlineOffset: "1px",
                zIndex: 0,
              }}
            >
              +{overflow}
            </div>
          )}
        </div>
      )}

      {visible.length > 0 && (
        <div className="h-5 w-px bg-surface-border" />
      )}

      <UserButton
        appearance={{ elements: { avatarBox: "h-7 w-7" } }}
      />
    </div>
  )
}
