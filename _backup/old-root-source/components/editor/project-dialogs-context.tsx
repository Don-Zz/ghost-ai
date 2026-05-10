"use client"

import { createContext, useContext } from "react"

interface ProjectDialogsContextValue {
  openCreate: () => void
}

export const ProjectDialogsContext = createContext<ProjectDialogsContextValue | null>(null)

export function useProjectDialogsContext() {
  const ctx = useContext(ProjectDialogsContext)
  if (!ctx) throw new Error("useProjectDialogsContext must be used within EditorShell")
  return ctx
}
