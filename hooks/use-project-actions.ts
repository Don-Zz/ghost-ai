"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import type { ProjectData } from "@/lib/projects"

export interface Project {
  id: string
  name: string
  isOwned: boolean
}

type DialogType = "create" | "rename" | "delete" | null

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function shortSuffix(): string {
  return Math.random().toString(36).slice(2, 6)
}

export function useProjectActions(
  initialOwned: ProjectData[],
  initialShared: ProjectData[],
) {
  const router = useRouter()
  const params = useParams()

  const projects: Project[] = [
    ...initialOwned.map((p) => ({ ...p, isOwned: true })),
    ...initialShared.map((p) => ({ ...p, isOwned: false })),
  ]

  const [dialog, setDialog] = useState<DialogType>(null)
  const [formName, setFormName] = useState("")
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [pendingSuffix, setPendingSuffix] = useState("")
  const [error, setError] = useState<Error | null>(null)

  const slug = toSlug(formName)
  const roomIdPreview = slug ? `${slug}-${pendingSuffix}` : ""

  async function createProject(name: string): Promise<boolean> {
    const trimmed = name.trim()
    if (!trimmed || isLoading) return false
    setIsLoading(true)
    setError(null)
    try {
      const nameSlug = toSlug(trimmed)
      const roomId = nameSlug ? `${nameSlug}-${pendingSuffix}` : pendingSuffix
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, id: roomId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(new Error(data?.error || "Failed to create project"))
        // Optionally: toast?.error(data?.error || "Failed to create project")
        return false
      }
      const { project } = (await res.json()) as { project: { id: string } }
      router.push(`/editor/${project.id}`)
      return true
    } catch (err: any) {
      setError(err)
      // Optionally: toast?.error(err.message)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  async function renameProject(id: string, name: string): Promise<boolean> {
    const trimmed = name.trim()
    if (!trimmed || isLoading) return false
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(new Error(data?.error || "Failed to rename project"))
        // Optionally: toast?.error(data?.error || "Failed to rename project")
        return false
      }
      router.refresh()
      return true
    } catch (err: any) {
      setError(err)
      // Optionally: toast?.error(err.message)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  async function deleteProject(id: string): Promise<boolean> {
    if (isLoading) return false
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(new Error(data?.error || "Failed to delete project"))
        // Optionally: toast?.error(data?.error || "Failed to delete project")
        return false
      }
      const activeId = Array.isArray(params?.projectId)
        ? params.projectId[0]
        : (params?.projectId as string | undefined)
      if (activeId === id) {
        router.push("/editor")
      } else {
        router.refresh()
      }
      return true
    } catch (err: any) {
      setError(err)
      // Optionally: toast?.error(err.message)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  function openCreate() {
    setFormName("")
    setSelectedProject(null)
    setPendingSuffix(shortSuffix())
    setDialog("create")
  }

  function openRename(project: Project) {
    setSelectedProject(project)
    setFormName(project.name)
    setDialog("rename")
  }

  function openDelete(project: Project) {
    setSelectedProject(project)
    setFormName("")
    setDialog("delete")
  }

  function closeDialog() {
    setDialog(null)
    setSelectedProject(null)
    setFormName("")
  }

  return {
    projects,
    createProject,
    renameProject,
    deleteProject,
    dialog,
    formName,
    setFormName,
    selectedProject,
    isLoading,
    error,
    roomIdPreview,
    openCreate,
    openRename,
    openDelete,
    closeDialog,
  }
}
