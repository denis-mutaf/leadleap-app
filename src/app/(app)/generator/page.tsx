"use client"

import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import GeneratorSheet from './GeneratorSheet'
import { Download, ImageOff } from 'lucide-react'
import { toast } from 'sonner'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

type GeneratorImage = {
  id: string
  public_url: string
  prompt: string
  resolution: string
  created_at: string
}

type GeneratorHistoryResponse = {
  success: boolean
  images: GeneratorImage[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object'
}

function formatRuDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function safeFileName(name: string) {
  return name.replace(/[^\p{L}\p{N}\-_. ]/gu, '_').slice(0, 80) || 'image'
}

function guessExtFromBlobType(mime: string) {
  const m = mime.toLowerCase()
  if (m === 'image/png') return 'png'
  if (m === 'image/webp') return 'webp'
  if (m === 'image/jpeg' || m === 'image/jpg') return 'jpg'
  if (m === 'image/gif') return 'gif'
  return 'png'
}

export default function GeneratorPage() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [detailItem, setDetailItem] = useState<GeneratorImage | null>(null)
  const [images, setImages] = useState<GeneratorImage[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  const loadHistory = useCallback(async () => {
    if (!API_URL) {
      toast.error('API URL не настроен')
      return
    }

    setHistoryLoading(true)
    try {
      const res = await fetch(`${API_URL}/generator/history`)
      const data: unknown = await res.json().catch(() => null)
      if (!res.ok) {
        const msg =
          isRecord(data) && typeof data.error === 'string'
            ? data.error
            : 'Не удалось загрузить историю'
        toast.error(msg)
        setImages([])
        return
      }

      if (!isRecord(data)) {
        setImages([])
        return
      }

      const parsed = data as Partial<GeneratorHistoryResponse>
      if (parsed.success && Array.isArray(parsed.images)) {
        setImages(parsed.images as GeneratorImage[])
      } else {
        setImages([])
      }
    } catch {
      toast.error('Не удалось загрузить историю')
      setImages([])
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  const handleDownload = useCallback(async (item: GeneratorImage) => {
    try {
      const res = await fetch(item.public_url)
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const ext = guessExtFromBlobType(blob.type)

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${safeFileName(
        item.prompt?.trim().slice(0, 50) || 'image'
      )}_${item.resolution.replaceAll('×', 'x')}.${ext}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Не удалось скачать')
    }
  }, [])

  const hasItems = images.length > 0

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-14 border-b border-border shrink-0">
        <h1 className="text-sm font-medium">Генератор</h1>
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          Новое изображение
        </Button>
      </div>

      {/* Gallery */}
      <div className="flex-1 overflow-y-auto p-6">
        {historyLoading && !hasItems ? (
          <div className="columns-[220px] gap-3 [column-fill:_balance]">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="mb-3 break-inside-avoid">
                <div className="rounded-xl border border-border overflow-hidden bg-card">
                  <Skeleton
                    className={`w-full rounded-none ${
                      i % 4 === 0 ? 'h-36' : i % 4 === 1 ? 'h-52' : i % 4 === 2 ? 'h-44' : 'h-64'
                    }`}
                  />
                  <div className="p-3 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Skeleton className="h-5 w-20 rounded-md" />
                      <Skeleton className="h-5 w-24 rounded-md" />
                    </div>
                    <Skeleton className="h-4 w-[85%] rounded-md" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !hasItems ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
            <ImageOff size={40} className="text-muted-foreground/40" />
            <div>
              <p className="text-sm font-medium">Пока нет изображений</p>
              <p className="text-xs text-muted-foreground mt-1">
                Нажмите «Новое изображение», чтобы начать
              </p>
            </div>
          </div>
        ) : (
          <div className="columns-[220px] gap-3 [column-fill:_balance]">
            {images.map((item) => (
              <div key={item.id} className="mb-3 break-inside-avoid">
                <div
                  role="button"
                  tabIndex={0}
                  className="rounded-xl border border-border overflow-hidden bg-card cursor-pointer group"
                  onClick={() => setDetailItem(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setDetailItem(item)
                    }
                  }}
                >
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.public_url}
                      alt={item.prompt?.trim() ? item.prompt : 'Изображение'}
                      className="w-full object-cover block"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          void handleDownload(item)
                        }}
                        aria-label="Скачать"
                      >
                        <Download size={14} />
                      </Button>
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[11px]">
                        {item.resolution}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium leading-snug line-clamp-1">
                      {item.prompt?.trim() ? item.prompt : 'Без промпта'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={detailItem !== null} onOpenChange={(open) => !open && setDetailItem(null)}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
          {detailItem && (
            <>
              <div className="relative aspect-square max-h-[70vh] w-full bg-muted overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={detailItem.public_url}
                  alt={detailItem.prompt?.trim() ? detailItem.prompt : 'Изображение'}
                  className="w-full h-full object-contain block"
                />
              </div>

              <DialogHeader className="p-4 pb-2">
                <DialogTitle className="line-clamp-2 break-words pr-8">
                  {detailItem.prompt?.trim() ? detailItem.prompt : 'Без промпта'}
                </DialogTitle>
              </DialogHeader>

              <div className="px-4 pb-4 space-y-3">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Разрешение</dt>
                  <dd>{detailItem.resolution}</dd>
                  <dt className="text-muted-foreground">Дата</dt>
                  <dd>{formatRuDate(detailItem.created_at)}</dd>
                </dl>

                <div className="rounded-md border border-border bg-muted/30 p-4">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {detailItem.prompt?.trim() ? detailItem.prompt : '—'}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    void handleDownload(detailItem)
                  }}
                >
                  <Download size={14} className="mr-2" />
                  Скачать
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <GeneratorSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onGenerated={loadHistory}
      />
    </div>
  )
}

