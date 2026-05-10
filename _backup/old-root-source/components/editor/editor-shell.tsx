"use client"

import { useState } from "react"

import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { ProjectDialogsContext } from "@/components/editor/project-dialogs-context"
import {
  CreateProjectDialog,
  RenameProjectDialog,
  DeleteProjectDialog,
} from "@/components/editor/project-dialogs"
import { useProjectActions } from "@/hooks/use-project-actions"
import type { ProjectData } from "@/lib/projects"

interface EditorShellProps {
  children: React.ReactNode
  ownedProjects: ProjectData[]
  sharedProjects: ProjectData[]
}

export function EditorShell({ children, ownedProjects, sharedProjects }: EditorShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const {
    projects,
    createProject,
    renameProject,
    deleteProject,
    dialog,
    formName,
    setFormName,
    selectedProject,
    roomIdPreview,
    openCreate,
    openRename,
    openDelete,
    closeDialog,
  } = useProjectActions(ownedProjects, sharedProjects)

  return (
    <ProjectDialogsContext.Provider value={{ openCreate }}>
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onSidebarToggle={() => setIsSidebarOpen((prev) => !prev)}
      />
      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        projects={projects}
        onNewProject={openCreate}
        onRenameProject={openRename}
        onDeleteProject={openDelete}
      />
      <CreateProjectDialog
        open={dialog === "create"}
        onClose={closeDialog}
        name={formName}
        onNameChange={setFormName}
        onSubmit={createProject}
        roomIdPreview={roomIdPreview}
      />
      <RenameProjectDialog
        open={dialog === "rename"}
        onClose={closeDialog}
        name={formName}
        onNameChange={setFormName}
        onSubmit={(name) => { if (selectedProject) renameProject(selectedProject.id, name) }}
        project={selectedProject}
      />
      <DeleteProjectDialog
        open={dialog === "delete"}
        onClose={closeDialog}
        onSubmit={() => { if (selectedProject) deleteProject(selectedProject.id) }}
        project={selectedProject}
      />
      <main className="pt-12 h-screen overflow-hidden">{children}</main>
    </ProjectDialogsContext.Provider>
  )
}
