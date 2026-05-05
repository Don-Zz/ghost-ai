"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Project } from "@/hooks/use-project-dialogs"

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

// ── Create Project ────────────────────────────────────────────────────────

interface CreateProjectDialogProps {
  open: boolean
  onClose: () => void
  name: string
  onNameChange: (name: string) => void
  onSubmit: (name: string) => void
}

export function CreateProjectDialog({ open, onClose, name, onNameChange, onSubmit }: CreateProjectDialogProps) {
  const slug = toSlug(name)

  function handleCreate() {
    onSubmit(name)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent showCloseButton={false} className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>Name your new architecture workspace.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Input
            autoFocus
            placeholder="My Project"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) handleCreate() }}
            className="text-copy-primary placeholder:text-copy-muted"
          />
          {slug && (
            <p className="font-mono text-xs text-copy-muted">/{slug}</p>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button disabled={!name.trim()} onClick={handleCreate}>
            Create
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Rename Project ────────────────────────────────────────────────────────

interface RenameProjectDialogProps {
  open: boolean
  onClose: () => void
  name: string
  onNameChange: (name: string) => void
  onSubmit: (name: string) => void
  project: Project | null
}

export function RenameProjectDialog({ open, onClose, name, onNameChange, onSubmit, project }: RenameProjectDialogProps) {
  function handleRename() {
    onSubmit(name)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent showCloseButton={false} className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Rename Project</DialogTitle>
          {project && (
            <DialogDescription>Renaming &ldquo;{project.name}&rdquo;</DialogDescription>
          )}
        </DialogHeader>
        <Input
          autoFocus
          placeholder="Project name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) handleRename() }}
          className="text-copy-primary placeholder:text-copy-muted"
        />
        <div className="flex justify-end gap-2 pt-2">
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button disabled={!name.trim()} onClick={handleRename}>
            Rename
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Delete Project ────────────────────────────────────────────────────────

interface DeleteProjectDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: () => void
  project: Project | null
}

export function DeleteProjectDialog({ open, onClose, onSubmit, project }: DeleteProjectDialogProps) {
  function handleDelete() {
    onSubmit()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent showCloseButton={false} className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Delete Project</DialogTitle>
          <DialogDescription>
            {project
              ? `Are you sure you want to delete "${project.name}"? This cannot be undone.`
              : "Are you sure? This cannot be undone."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 pt-2">
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
