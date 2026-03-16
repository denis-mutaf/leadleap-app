'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Circle, Settings, Upload, X } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Project, ProjectIntegration, IntegrationService } from '@/types'
import { INTEGRATION_CONFIGS } from '@/lib/integrations'
import { IntegrationLogo } from '@/components/integration-logo'
import { ProjectAvatar } from '@/components/project-avatar'
import { useProjectStore } from '@/store/project-store'
import { toast } from 'sonner'

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { activeProject, setProjects, setActiveProject } = useProjectStore()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [project, setProject] = useState<Project | null>(null)
  const [integrations, setIntegrations] = useState<ProjectIntegration[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [editName, setEditName] = useState('')
  const [dialogService, setDialogService] = useState<IntegrationService | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})

  useEffect(() => {
    void loadAll()
  }, [id])

  async function loadAll() {
    setLoading(true)
    const [projRes, intRes] = await Promise.all([
      fetch('/api/projects'),
      fetch(`/api/projects/${id}/integrations`),
    ])
    const projects = await projRes.json()
    const ints = await intRes.json()

    if (Array.isArray(projects)) {
      setProjects(projects)
      const found = projects.find((p: Project) => p.id === id)
      if (found) {
        setProject(found)
        setEditName(found.name)
        if (activeProject?.id === found.id) setActiveProject(found)
      }
    }
    if (Array.isArray(ints)) setIntegrations(ints)
    setLoading(false)
  }

  async function handleSaveGeneral() {
    if (!editName.trim()) return
    setSaving(true)
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Ошибка при сохранении')
    } else {
      setProject(data)
      if (activeProject?.id === data.id) setActiveProject(data)
      toast.success('Проект обновлён')
    }
    setSaving(false)
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`/api/projects/${id}/logo`, {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Ошибка загрузки логотипа')
    } else {
      toast.success('Логотип обновлён')
      void loadAll()
    }
    setUploadingLogo(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleLogoDelete() {
    if (!confirm('Удалить логотип?')) return
    const res = await fetch(`/api/projects/${id}/logo`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Логотип удалён')
      void loadAll()
    } else {
      toast.error('Ошибка при удалении логотипа')
    }
  }

  function openDialog(service: IntegrationService) {
    const existing = integrations.find((i) => i.service === service)
    const config = INTEGRATION_CONFIGS[service]
    const prefilled: Record<string, string> = {}
    config.fields.forEach((f) => {
      const val = (existing?.credentials as Record<string, unknown> | undefined)?.[f.key]
      prefilled[f.key] = typeof val === 'string' ? val : ''
    })
    setFields(prefilled)
    setDialogService(service)
  }

  async function handleSaveIntegration() {
    if (!dialogService) return
    setSaving(true)
    const res = await fetch(`/api/projects/${id}/integrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service: dialogService, credentials: fields }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Ошибка при сохранении')
    } else {
      toast.success(`${INTEGRATION_CONFIGS[dialogService].label} подключён`)
      setDialogService(null)
      void loadAll()
    }
    setSaving(false)
  }

  async function handleDisconnect(service: IntegrationService) {
    if (!confirm(`Отключить ${INTEGRATION_CONFIGS[service].label}?`)) return
    const res = await fetch(`/api/projects/${id}/integrations?service=${service}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      toast.success('Интеграция отключена')
      void loadAll()
    } else {
      toast.error('Ошибка при отключении')
    }
  }

  const activeDialogConfig = dialogService ? INTEGRATION_CONFIGS[dialogService] : null
  const webhookUrl = project ? `${process.env.NEXT_PUBLIC_API_URL}/webhook/${project.slug}` : ''

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="max-w-2xl">
        <p className="text-sm text-muted-foreground">Проект не найден</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          onClick={() => router.push('/settings/projects')}
        >
          <ArrowLeft size={15} />
        </Button>
        <div className="flex items-center gap-3">
          <ProjectAvatar name={project.name} logoUrl={project.logo_url} size="md" />
          <div>
            <h1 className="text-base font-semibold leading-tight">{project.name}</h1>
            <p className="text-xs text-muted-foreground">/{project.slug}</p>
          </div>
          {activeProject?.id === project.id && (
            <Badge variant="secondary" className="text-xs">
              Активный
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="integrations">
        <TabsList>
          <TabsTrigger value="general">Основное</TabsTrigger>
          <TabsTrigger value="integrations">Интеграции</TabsTrigger>
          <TabsTrigger value="webhook">Webhook</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Данные проекта</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Логотип</Label>
                <div className="flex items-center gap-3">
                  <ProjectAvatar name={project.name} logoUrl={project.logo_url} size="lg" />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-xs"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingLogo}
                    >
                      <Upload size={12} />
                      {uploadingLogo ? 'Загрузка...' : 'Загрузить'}
                    </Button>
                    {project.logo_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => void handleLogoDelete()}
                      >
                        <X size={12} />
                        Удалить
                      </Button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => void handleLogoUpload(e)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, WEBP или SVG, до 2MB
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-name">Название проекта</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Slug</Label>
                <Input value={project.slug} readOnly className="text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Slug нельзя изменить после создания
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => void handleSaveGeneral()}
                disabled={saving || editName === project.name}
              >
                {saving ? 'Сохранение...' : 'Сохранить изменения'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="mt-4 space-y-3">
          {Object.values(INTEGRATION_CONFIGS).map((config) => {
            const integration = integrations.find((i) => i.service === config.service)
            const isConnected = !!integration?.is_active

            return (
              <Card key={config.service}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                        <IntegrationLogo service={config.service} size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-sm">{config.label}</CardTitle>
                          {isConnected ? (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <CheckCircle2 size={10} className="text-green-500" />
                              Подключён
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-xs gap-1 text-muted-foreground"
                            >
                              <Circle size={10} />
                              Не подключён
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-xs mt-0.5">
                          {config.description}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isConnected && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground hover:text-destructive"
                          onClick={() => void handleDisconnect(config.service)}
                        >
                          Отключить
                        </Button>
                      )}
                      <Button
                        variant={isConnected ? 'outline' : 'default'}
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => openDialog(config.service)}
                      >
                        <Settings size={11} />
                        {isConnected ? 'Изменить' : 'Подключить'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            )
          })}
        </TabsContent>

        <TabsContent value="webhook" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Webhook URL для PBX</CardTitle>
              <CardDescription className="text-xs">
                Укажите этот URL в настройках Moldcell PBX.
                Звонки будут отправляться на этот адрес для транскрипции и анализа.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={webhookUrl}
                    readOnly
                    className="text-muted-foreground font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(webhookUrl)
                      toast.success('Скопировано')
                    }}
                  >
                    Копировать
                  </Button>
                </div>
              </div>
              <div className="rounded-md border border-border bg-muted/40 p-3 space-y-1">
                <p className="text-xs font-medium">Инструкция по настройке</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Подключите интеграцию PBX выше, вставив CRM токен</li>
                  <li>Скопируйте Webhook URL</li>
                  <li>Вставьте его в Moldcell Business PBX → Интеграции → Webhook</li>
                  <li>Убедитесь что Express бэкенд на Railway запущен</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!dialogService} onOpenChange={(open) => !open && setDialogService(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {activeDialogConfig ? `Подключить ${activeDialogConfig.label}` : ''}
            </DialogTitle>
            <DialogDescription>{activeDialogConfig?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {activeDialogConfig?.fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={field.key}>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                <Input
                  id={field.key}
                  type={field.type === 'password' ? 'password' : 'text'}
                  placeholder={field.placeholder}
                  value={fields[field.key] ?? ''}
                  onChange={(e) =>
                    setFields((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                  readOnly={field.key === 'webhook_url'}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogService(null)}>
              Отмена
            </Button>
            <Button onClick={() => void handleSaveIntegration()} disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

