"use client"

import { useOthers } from "@liveblocks/react"
import { useAuth } from "@clerk/nextjs"
import { useViewport } from "@xyflow/react"
import { Loader2 } from "lucide-react"

export function LiveCursors() {
  const { userId } = useAuth()
  const others = useOthers()
  const { x: vpX, y: vpY, zoom } = useViewport()

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {others.map((other) => {
        if (other.id === userId) return null
        const cursor = other.presence.cursor
        if (!cursor) return null

        const sx = cursor.x * zoom + vpX
        const sy = cursor.y * zoom + vpY
        const color = other.info?.color ?? "#00c8d4"
        const name = other.info?.name ?? ""
        const thinking = other.presence.thinking === true

        return (
          <div
            key={other.connectionId}
            className="pointer-events-none absolute"
            style={{ left: sx, top: sy }}
          >
            <svg
              width="14"
              height="18"
              viewBox="0 0 14 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1 1L13 9L7.5 10.5L5.5 17L1 1Z"
                fill={color}
                stroke="rgba(0,0,0,0.5)"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
            {name && (
              <div
                className="mt-0.5 flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: color }}
              >
                {name}
                {thinking && (
                  <Loader2 className="h-2.5 w-2.5 animate-spin opacity-80" />
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
