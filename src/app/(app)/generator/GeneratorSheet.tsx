"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2, Upload, X } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

type GeneratorSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerated: () => Promise<void> | void
}

function isImageFile(file: File) {
  return file.type.startsWith('image/')
}

function getImageFilesFromFileList(files: FileList | null): File[] {
  if (!files) return []
  return Array.from(files).filter(isImageFile)
}

function getImageFilesFromPaste(e: ClipboardEvent): File[] {
  const dt = e.clipboardData
  if (!dt) return []
  const items = dt.items
  if (!items) return []

  const files: File[] = []
  for (const item of Array.from(items)) {
    if (item.kind !== 'file') continue
    const f = item.getAsFile()
    if (f && isImageFile(f)) files.push(f)
  }
  return files
}

export default function GeneratorSheet({
  open,
  onOpenChange,
  onGenerated,
}: GeneratorSheetProps) {
  type ReferenceItem = { file: File; url: string }

  const RESOLUTIONS = useMemo(
    () => ['512×512', '1024×1024', '2048×2048', '4096×4096'] as const,
    []
  )

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [prompt, setPrompt] = useState('')
  const [resolution, setResolution] = useState<(typeof RESOLUTIONS)[number]>('1024×1024')
  const [referenceItems, setReferenceItems] = useState<ReferenceItem[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  const referenceFiles = useMemo(
    () => referenceItems.map((i) => i.file),
    [referenceItems]
  )

  const addReferenceFiles = useCallback((files: File[]) => {
    if (files.length === 0) return

    setReferenceItems((prev) => {
      const next = [
        ...files.map((file) => ({ file, url: URL.createObjectURL(file) } satisfies ReferenceItem)),
        ...prev,
      ]
      const trimmed = next.slice(0, 5)
      const removed = next.slice(5)
      removed.forEach((r) => URL.revokeObjectURL(r.url))
      return trimmed
    })
  }, [])

  const removeFileAt = useCallback((index: number) => {
    setReferenceItems((prev) => {
      const item = prev[index]
      if (item) URL.revokeObjectURL(item.url)
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  // Clear previews to avoid leaking ObjectURLs when closing the sheet.
  useEffect(() => {
    if (open) return
    setReferenceItems((prev) => {
      prev.forEach((i) => URL.revokeObjectURL(i.url))
      return []
    })
    // Keep the generator prompt fresh on next open.
    setPrompt('')
    setResolution('1024×1024')
  }, [open])

  // Clipboard paste: only when sheet is open.
  useEffect(() => {
    if (!open) return

    function onPaste(e: ClipboardEvent) {
      const files = getImageFilesFromPaste(e)
      if (files.length === 0) return
      e.preventDefault()
      addReferenceFiles(files)
    }

    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [open, addReferenceFiles])

  const handlePickFiles = useCallback(
    (files: FileList | null) => {
      const picked = getImageFilesFromFileList(files)
      addReferenceFiles(picked)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [addReferenceFiles]
  )

  const handleGenerate = useCallback(async () => {
    if (!API_URL) {
      toast.error('API URL не настроен')
      return
    }

    const trimmedPrompt = prompt.trim()
    if (!trimmedPrompt) return
    if (isGenerating) return

    setIsGenerating(true)
    try {
      const fd = new FormData()
      fd.set('prompt', trimmedPrompt)
      fd.set('resolution', resolution)
      referenceFiles.forEach((f) => fd.append('images', f))

      const res = await fetch(`${API_URL}/generator/generate`, {
        method: 'POST',
        body: fd,
      })

      const data: unknown = await res.json().catch(() => null)

      if (!res.ok) {
        const msg =
          typeof (data as any)?.error === 'string'
            ? (data as any).error
            : typeof (data as any)?.message === 'string'
              ? (data as any).message
              : 'Ошибка генерации'
        toast.error(msg)
        return
      }

      // Close → refresh → toast.
      onOpenChange(false)
      await onGenerated()
      toast.success('Изображение сгенерировано')

      setPrompt('')
      setResolution('1024×1024')
      setReferenceItems((prev) => {
        prev.forEach((i) => URL.revokeObjectURL(i.url))
        return []
      })
    } catch {
      toast.error('Ошибка генерации')
    } finally {
      setIsGenerating(false)
    }
  }, [prompt, resolution, referenceFiles, onGenerated, onOpenChange, isGenerating])

  const isGenerateDisabled = isGenerating || !prompt.trim()

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent side="right" className="w-[480px] sm:w-[480px] p-0 flex flex-col gap-0">
        <SheetHeader className="px-6 py-4 border-b border-border shrink-0">
          <SheetTitle className="text-base">Создать</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Prompt */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Промпт</p>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Опишите изображение..."
              rows={4}
              className="resize-none"
            />
          </div>

          {/* References */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Референсы (до 5)
              </p>
              <Badge variant="outline" className="text-[11px]">
                {referenceItems.length}/5
              </Badge>
            </div>

            <div
              className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors"
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                addReferenceFiles(getImageFilesFromFileList(e.dataTransfer.files))
              }}
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
              }}
              aria-label="Загрузить референсы"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm text-foreground">Нажмите, чтобы выбрать</p>
                  <p className="text-xs text-muted-foreground">Или перетащите сюда (max 5). </p>
                  <p className="text-xs text-muted-foreground">Также можно вставить ⌘V.</p>
                </div>
                <div className="shrink-0">
                  <Button variant="outline" size="sm" type="button">
                    <Upload size={14} className="mr-2" />
                    Добавить
                  </Button>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handlePickFiles(e.target.files)}
              />
            </div>

            {referenceItems.length > 0 && (
              <div className="grid grid-cols-5 gap-2">
                {referenceItems.map((ref, idx) => (
                  <div
                    key={`${ref.file.name}_${idx}`}
                    className="relative rounded-lg border border-border overflow-hidden"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ref.url}
                      alt={ref.file.name}
                      className="w-full h-14 object-cover"
                      loading="lazy"
                    />
                    <button
                      className="absolute top-1 right-1 rounded-md bg-black/60 text-white p-1 hover:bg-black/70"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        removeFileAt(idx)
                      }}
                      aria-label="Удалить"
                      type="button"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resolution */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Разрешение</p>
            <Select value={resolution} onValueChange={(v) => setResolution(v as (typeof RESOLUTIONS)[number])}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESOLUTIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Generate */}
          <Button
            className="w-full h-11 text-sm"
            disabled={isGenerateDisabled}
            onClick={() => void handleGenerate()}
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Сгенерировать
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Upload size={16} />
                Сгенерировать
              </span>
            )}
          </Button>

          {referenceItems.length === 0 && !isGenerating ? (
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Можно сгенерировать и без референсов.</p>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}

