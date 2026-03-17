'use client'

import { useEffect } from 'react'
import { ChevronsUpDown, Plus, FolderKanban } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useProjectStore } from '@/store/project-store'
import { ProjectAvatar } from '@/components/project-avatar'

export function ProjectSwitcher({ collapsed }: { collapsed: boolean }) {
  const { projects, activeProject, setProjects, setActiveProject } = useProjectStore()
  const router = useRouter()

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProjects(data)

          // Check if store already has an active project after hydration
          const currentActive = useProjectStore.getState().activeProject
          if (!currentActive && data.length > 0) {
            setActiveProject(data[0])
          }
        }
      })
      .catch(() => {})
  }, [])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={`w-full justify-between gap-2 px-2 h-10 ${collapsed ? 'px-0 justify-center' : ''}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {activeProject ? (
              <ProjectAvatar
                name={activeProject.name}
                logoUrl={activeProject.logo_url}
                size="sm"
              />
            ) : (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-muted">
                <FolderKanban size={12} className="text-muted-foreground" />
              </div>
            )}
            {!collapsed && (
              <span className="truncate text-sm font-medium">
                {activeProject ? activeProject.name : 'Выберите проект'}
              </span>
            )}
          </div>
          {!collapsed && <ChevronsUpDown size={14} className="shrink-0 text-muted-foreground" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Проекты</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {projects.length === 0 && (
          <div className="px-2 py-3 text-xs text-muted-foreground text-center">
            Нет проектов
          </div>
        )}
        {projects.map((project) => (
          <DropdownMenuItem
            key={project.id}
            onClick={() => {
              setActiveProject(project)
              router.push(`/ads/${project.slug}`)
            }}
            className="gap-2 cursor-pointer"
          >
            <ProjectAvatar name={project.name} logoUrl={project.logo_url} size="sm" />
            <span className="truncate">{project.name}</span>
            {activeProject?.id === project.id && (
              <span className="ml-auto text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/projects/new" className="gap-2 cursor-pointer">
            <Plus size={14} />
            <span>Новый проект</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

