import { Liveblocks } from "@liveblocks/node"

const CURSOR_COLORS = [
  "#E03E3E",
  "#D9730D",
  "#DFAB01",
  "#4D6461",
  "#0B6E99",
  "#6940A5",
  "#AD1A72",
  "#EB5757",
]

export function getUserColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0
  }
  return CURSOR_COLORS[hash % CURSOR_COLORS.length]
}

declare const globalThis: {
  liveblocksGlobal: Liveblocks | undefined
} & typeof global

export function getLiveblocks(): Liveblocks {
  if (!globalThis.liveblocksGlobal) {
    globalThis.liveblocksGlobal = new Liveblocks({
      secret: process.env.LIVEBLOCKS_SECRET_KEY!,
    })
  }
  return globalThis.liveblocksGlobal
}
