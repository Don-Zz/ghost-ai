"use client"

import { useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

interface SpecPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  specId: string
  projectId: string
  filename: string
  createdAt: string
}

export function SpecPreviewModal({
  open,
  onOpenChange,
  specId,
  projectId,
  filename,
  createdAt,
}: SpecPreviewModalProps) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setContent(null)
    setError(null)
    setLoading(true)

    fetch(`/api/projects/${projectId}/specs/${specId}/download`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load spec")
        return res.text()
      })
      .then((text) => {
        setContent(text)
      })
      .catch(() => {
        setError("Could not load spec content.")
      })
      .finally(() => {
        setLoading(false)
      })
  }, [open, specId, projectId])

  function handleDownload() {
    const a = document.createElement("a")
    a.href = `/api/projects/${projectId}/specs/${specId}/download`
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col gap-0 rounded-3xl border-surface-border bg-surface p-0">
        <DialogHeader className="shrink-0 border-b border-surface-border px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-sm font-semibold text-copy-primary">
                {filename}
              </DialogTitle>
              <p className="mt-0.5 text-xs text-copy-muted">
                {new Date(createdAt).toLocaleString()}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDownload}
              className="h-7 shrink-0 gap-1.5 px-2.5 text-xs text-copy-muted hover:text-copy-primary"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="px-6 py-5">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-copy-muted" />
              </div>
            )}
            {error && (
              <p className="py-12 text-center text-sm text-state-error">{error}</p>
            )}
            {content && (
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
