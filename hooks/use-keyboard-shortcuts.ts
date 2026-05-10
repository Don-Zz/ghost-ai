import { useEffect } from "react"

const ZOOM_DURATION = 200

interface ZoomInstance {
  zoomIn: (options?: { duration?: number }) => void
  zoomOut: (options?: { duration?: number }) => void
}

interface KeyboardShortcutsOptions {
  instance: ZoomInstance | null
  onUndo: () => void
  onRedo: () => void
}

function isEditableTarget(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement | null
  if (!target) return false
  const tag = target.tagName.toLowerCase()
  return tag === "input" || tag === "textarea" || target.isContentEditable
}

export function useKeyboardShortcuts({ instance, onUndo, onRedo }: KeyboardShortcutsOptions) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e)) return

      const isMod = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()

      if (!isMod && (e.key === "+" || e.key === "=")) {
        e.preventDefault()
        instance?.zoomIn({ duration: ZOOM_DURATION })
        return
      }

      if (!isMod && e.key === "-") {
        e.preventDefault()
        instance?.zoomOut({ duration: ZOOM_DURATION })
        return
      }

      if (isMod && key === "z" && !e.shiftKey) {
        e.preventDefault()
        onUndo()
        return
      }

      if (isMod && key === "z" && e.shiftKey) {
        e.preventDefault()
        onRedo()
        return
      }

      if (isMod && key === "y") {
        e.preventDefault()
        onRedo()
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [instance, onUndo, onRedo])
}
