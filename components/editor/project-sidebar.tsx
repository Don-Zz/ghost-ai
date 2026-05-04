"use client"

import { Plus, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function ProjectSidebar({ isOpen, onClose }: ProjectSidebarProps) {
  return (
    <aside
      className={cn(
        "fixed top-12 left-0 z-40 flex h-[calc(100vh-3rem)] w-72 flex-col",
        "bg-surface border-r border-surface-border",
        "transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
        <span className="text-sm font-semibold text-copy-primary">Projects</span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          className="text-copy-muted hover:text-copy-primary"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden px-3 pt-3">
        <Tabs defaultValue="my-projects" className="flex flex-1 flex-col">
          <TabsList className="w-full">
            <TabsTrigger value="my-projects" className="flex-1">
              My Projects
            </TabsTrigger>
            <TabsTrigger value="shared" className="flex-1">
              Shared
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-projects" className="flex flex-1 items-center justify-center">
            <p className="text-sm text-copy-muted">No projects yet.</p>
          </TabsContent>

          <TabsContent value="shared" className="flex flex-1 items-center justify-center">
            <p className="text-sm text-copy-muted">No shared projects.</p>
          </TabsContent>
        </Tabs>
      </div>

      <div className="p-3 border-t border-surface-border">
        <Button variant="default" className="w-full gap-2">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>
    </aside>
  )
}
