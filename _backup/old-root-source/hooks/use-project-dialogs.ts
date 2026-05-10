"use client"

import { useState } from "react"

export interface Project {
  id: string
  name: string
  isOwned: boolean
}

const INITIAL_PROJECTS: Project[] = [
  { id: "p1", name: "Ghost AI MVP", isOwned: true },
  { id: "p2", name: "Landing Page Redesign", isOwned: true },
  { id: "p3", name: "Team Onboarding Flow", isOwned: false },
]

type DialogType = "create" | "rename" | "delete" | null

export function useProjectDialogs() {
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS)
  const [dialog, setDialog] = useState<DialogType>(null)
  const [formName, setFormName] = useState("")
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isLoading] = useState(false)

  function createProject(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    setProjects((prev) => [
      ...prev,
      { id: `p${Date.now()}`, name: trimmed, isOwned: true },
    ])
  }

  function renameProject(id: string, name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: trimmed } : p))
    )
  }

  function deleteProject(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id))
    setSelectedProject((prev) => (prev?.id === id ? null : prev))
  }

  function openCreate() {
    setFormName("")
    setSelectedProject(null)
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
    openCreate,
    openRename,
    openDelete,
    closeDialog,
  }
}
