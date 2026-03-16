'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useProjectStore } from '@/store/project-store'
import type { Project } from '@/types'
import { ProjectAvatar } from '@/components/project-avatar'
import { toast } from 'sonner'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const { setProjects: setStoreProjects, setActiveProject, activeProject } = useProjectStore()
  const router = useRouter()

  useEffect(() => {
    void loadProjects()
  }, [])

  async function loadProjects() {
    setLoading(true)
    const res = await fetch('/api/projects')
    const data = await res.json()
    if (Array.isArray(data)) {
      setProjects(data)
      setStoreProjects(data)
      if (!activeProject && data.length > 0) setActiveProject(data[0])
    }
    setLoading(false)
  }

  function handleNameChange(value: string) {
    setName(value)
    setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
  }

  async function handleCreate() {
    if (!name || !slug) return
    setCreating(true)
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Failed to create project')
    } else {
      toast.success(`Project "${data.name}" created`)
      setDialogOpen(false)
      setName('')
      setSlug('')
      void loadProjects()
    }
    setCreating(false)
  }

  async function handleDelete(project: Project) {
    if (!confirm(`Удалить проект "${project.name}"? Это действие необратимо.`)) return
    setDeleting(project.id)
    const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Проект удалён')
      void loadProjects()
    } else {
      toast.error('Не удалось удалить проект')
    }
    setDeleting(null)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Проекты</h1>
          <p className="text-sm text-muted-foreground">Управление клиентскими проектами</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus size={14} />
              Новый проект
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Создать проект</DialogTitle>
              <DialogDescription>
                Добавьте новый клиентский проект. У каждого проекта свои интеграции и данные.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Название проекта</Label>
                <Input
                  id="name"
                  placeholder="Isragrup"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  placeholder="isragrup"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Используется в webhook URL: /webhook/{slug}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleCreate} disabled={creating || !name || !slug}>
                {creating ? 'Создание...' : 'Создать'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">Нет проектов</p>
            <p className="text-xs text-muted-foreground mt-1">
              Создайте первый проект чтобы начать работу
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="cursor-pointer hover:border-border/80 transition-colors"
              onClick={() => router.push(`/settings/projects/${project.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <ProjectAvatar
                      name={project.name}
                      logoUrl={project.logo_url}
                      size="md"
                    />
                    <div>
                      <CardTitle className="text-sm">{project.name}</CardTitle>
                      <CardDescription className="text-xs mt-0.5">/{project.slug}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeProject?.id === project.id && (
                      <Badge variant="secondary" className="text-xs">
                        Активный
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        void handleDelete(project)
                      }}
                      disabled={deleting === project.id}
                    >
                      <Trash2 size={13} />
                    </Button>
                    <ChevronRight size={14} className="text-muted-foreground" />
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
