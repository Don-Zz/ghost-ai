"use client"

import { useState, useEffect, useCallback } from "react"
import { Link2, Loader2, UserMinus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface Collaborator {
  email: string
  displayName: string | null
  avatarUrl: string | null
}

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: { id: string; name: string }
  isOwner: boolean
}

export function ShareDialog({ open, onOpenChange, project, isOwner }: ShareDialogProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [collaboratorsError, setCollaboratorsError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<{ [email: string]: boolean }>({})

  const fetchCollaborators = useCallback(async () => {
    setLoading(true)
    setCollaboratorsError(null)
    try {
      const res = await fetch(`/api/projects/${project.id}/collaborators`)
      if (res.ok) {
        const data = (await res.json()) as { collaborators: Collaborator[] }
        setCollaborators(data.collaborators)
      } else {
        let msg = "Failed to fetch collaborators"
        try {
          const err = await res.json()
          if (err?.error) msg = err.error
        } catch {}
        setCollaboratorsError(msg)
      }
    } catch (err: any) {
      setCollaboratorsError(err?.message || "Failed to fetch collaborators")
    } finally {
      setLoading(false)
    }
  }, [project.id])

  useEffect(() => {
    if (open) {
      setError(null)
      setEmail("")
      fetchCollaborators()
    }
  }, [open, fetchCollaborators])

  async function handleInvite() {
    const trimmed = email.trim()
    if (!trimmed) return
    setInviting(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${project.id}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      })
      const data = (await res.json()) as { collaborator?: Collaborator; error?: string }
      if (!res.ok) {
        setError(data.error ?? "Failed to invite collaborator")
        return
      }
      if (data.collaborator) {
        setCollaborators((prev) => [...prev, data.collaborator!])
      }
      setEmail("")
    } finally {
      setInviting(false)
  }

  async function handleRemove(targetEmail: string) {
    setRemoving((prev) => ({ ...prev, [targetEmail]: true }))
    const prevCollaborators = collaborators
    setCollaborators((prev) => prev.filter((c) => c.email !== targetEmail)) // optimistic
    try {
      const res = await fetch(`/api/projects/${project.id}/collaborators`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      })
      if (!res.ok) {
        setCollaborators(prevCollaborators) // rollback
        setError("Failed to remove collaborator")
      }
    } catch {
      setCollaborators(prevCollaborators) // rollback
      setError("Failed to remove collaborator")
    } finally {
      setRemoving((prev) => ({ ...prev, [targetEmail]: false }))
  }

    }
  }

  async function handleCopyLink() {
    const url = `${window.location.origin}/editor/${project.id}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      try {
        const textarea = document.createElement("textarea")
        textarea.value = url
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        setError("Failed to copy link")
      }
    }
  }

  function handleRemove(email: string): void {
    throw new Error("Function not implemented.")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-copy-primary">
            Share &ldquo;{project.name}&rdquo;
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {isOwner && (
            <div className="flex gap-2">
              <Input
                placeholder="Email address"
                type="email"
                value={email}
                autoFocus
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleInvite()
                }}
                className="text-copy-primary placeholder:text-copy-muted"
              />
              <Button
                onClick={handleInvite}
                disabled={inviting || !email.trim()}
                className="shrink-0"
              >
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invite"}
              </Button>
            </div>
          )}

          {error && <p className="text-sm text-error">{error}</p>}
          {collaboratorsError && <p className="text-sm text-error">{collaboratorsError}</p>}

          <div className="min-h-[48px]">
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-copy-muted" />
              </div>
            ) : collaborators.length === 0 ? (
              <p className="py-2 text-sm text-copy-muted">No collaborators yet.</p>
            ) : (
              <ul className="space-y-2">
                {collaborators.map((c) => (
                  <li key={c.email} className="flex items-center gap-3">
                    {c.avatarUrl ? (
                      <img
                        src={c.avatarUrl}
                        alt=""
                        className="h-7 w-7 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-elevated text-xs font-medium text-copy-muted">
                        {(c.displayName ?? c.email)[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      {c.displayName ? (
                        <>
                          <p className="truncate text-sm text-copy-primary">{c.displayName}</p>
                          <p className="truncate text-xs text-copy-muted">{c.email}</p>
                        </>
                      ) : (
                        <p className="truncate text-sm text-copy-primary">{c.email}</p>
                      )}
                    </div>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${c.email}`}
                        onClick={() => handleRemove(c.email)}
                        className="shrink-0 text-copy-muted hover:text-error"
                        disabled={!!removing[c.email]}
                      >
                        {removing[c.email] ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Button variant="outline" className="w-full gap-2" onClick={handleCopyLink}>
            <Link2 className="h-4 w-4" />
            {copied ? "Copied!" : "Copy link"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
