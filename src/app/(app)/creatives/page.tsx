'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Sparkles,
  Settings2,
  Download,
  RefreshCw,
  ImageOff,
  Loader2,
  X,
  Plus,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useProjectStore } from '@/store/project-store'
import { toast } from 'sonner'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
/** Имя поля для файла логотипа в API генерации. Если не задано — логотип не отправляется (избегаем "Unexpected field"). */
const CREATIVES_LOGO_FIELD = process.env.NEXT_PUBLIC_CREATIVES_LOGO_FIELD || ''

const MODELS = [
  { key: 'nano-banana', label: 'NB', tag: 'Быстрый' },
  { key: 'nano-banana-2', label: 'NB 2', tag: 'Рекомендуем' },
  { key: 'nano-banana-pro', label: 'NB Pro', tag: 'Качество' },
]

const FORMATS = [
  { value: '1:1', label: 'Пост' },
  { value: '9:16', label: 'Сторис' },
  { value: '16:9', label: 'Баннер' },
  { value: '4:5', label: 'Instagram' },
]

const RESOLUTIONS = [
  { key: '0.5K', label: '0.5K', sub: 'Быстро' },
  { key: '1K', label: '1K', sub: 'Стандарт' },
  { key: '2K', label: '2K', sub: 'Высокое' },
  { key: '4K', label: '4K', sub: 'Максимум' },
]

const GOALS = [
  { value: 'traffic', label: 'Трафик' },
  { value: 'lead', label: 'Заявка' },
  { value: 'awareness', label: 'Узнаваемость' },
  { value: 'retargeting', label: 'Ретаргетинг' },
]

const LANGUAGES = [
  { key: 'ru', label: 'RU' },
  { key: 'ro', label: 'RO' },
  { key: 'en', label: 'EN' },
]

const STYLES = [
  { key: 'minimal', label: 'Минимал' },
  { key: 'bold', label: 'Яркий' },
  { key: 'luxury', label: 'Люкс' },
  { key: 'massmarket', label: 'Масс' },
]

const SETTINGS_STORAGE_KEY = 'leadleap_creatives_settings'

type HistoryItem = {
  id: string
  image_url: string
  format: string | null
  model: string | null
  headline: string | null
  created_at: string
}

type ParseProductResponse = {
  headline?: string | null
  subheadline?: string | null
  cta?: string | null
  extra_text?: string | null
  price?: string | null
  language?: string | null
  visual_prompt?: string | null
  benefits?: string[] | null
  image_url?: string | null
}

type HistoryResponse = HistoryItem[]

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object'
}

function toHexColor(value: string) {
  const v = value.trim()
  if (!v) return ''
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toLowerCase()
  if (/^[0-9a-fA-F]{6}$/.test(v)) return `#${v.toLowerCase()}`
  return v
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
  return name.replace(/[^\p{L}\p{N}\-_. ]/gu, '_').slice(0, 80) || 'file'
}

function base64ToFile(base64: string, fileName: string) {
  let mime = 'image/jpeg'
  let b64 = base64
  const dataUrlMatch = base64.match(/^data:(.+?);base64,(.+)$/)
  if (dataUrlMatch) {
    mime = dataUrlMatch[1]
    b64 = dataUrlMatch[2]
  }
  try {
    const bin = atob(b64.replace(/\s/g, ''))
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return new File([bytes], safeFileName(fileName), { type: mime })
  } catch {
    return null
  }
}

function ScrollArea({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <div className={`overflow-y-auto ${className ?? ''}`}>{children}</div>
}

export default function CreativesPage() {
  const { activeProject } = useProjectStore()

  // Generator form state
  const [productUrl, setProductUrl] = useState('')
  const [price, setPrice] = useState('')
  const [headline, setHeadline] = useState('')
  const [subheadline, setSubheadline] = useState('')
  const [cta, setCta] = useState('')
  const [extraText, setExtraText] = useState('')
  const [benefits, setBenefits] = useState<string[]>([''])
  const [userPrompt, setUserPrompt] = useState('')
  const [format, setFormat] = useState<string>('1:1')
  const [compositionFiles, setCompositionFiles] = useState<File[]>([])
  const [referenceFiles, setReferenceFiles] = useState<File[]>([])

  // Settings state
  const [selectedModel, setSelectedModel] = useState<string>('nano-banana-2')
  const [imageSize, setImageSize] = useState<string>('1K')
  const [style, setStyle] = useState<string>('minimal')
  const [goals, setGoals] = useState<string[]>([])
  const [language, setLanguage] = useState<string>('ru')
  const [industry, setIndustry] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [colorBackground, setColorBackground] = useState('')
  const [colorAccent, setColorAccent] = useState('')
  const [colorText, setColorText] = useState('')
  const [colorSecondary, setColorSecondary] = useState('')
  const [fonts, setFonts] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)

  // UI state
  const [generatorOpen, setGeneratorOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const [detailItem, setDetailItem] = useState<HistoryItem | null>(null)

  const parseTimerRef = useRef<number | null>(null)
  const generatorPhotosInputRef = useRef<HTMLInputElement | null>(null)
  const generatorRefsInputRef = useRef<HTMLInputElement | null>(null)
  const logoInputRef = useRef<HTMLInputElement | null>(null)

  const headlineRef = useRef<HTMLTextAreaElement | null>(null)
  const subheadlineRef = useRef<HTMLTextAreaElement | null>(null)
  const ctaRef = useRef<HTMLTextAreaElement | null>(null)
  const extraTextRef = useRef<HTMLTextAreaElement | null>(null)

  const applyAutosize = useCallback(() => {
    const refs = [headlineRef, subheadlineRef, ctaRef, extraTextRef]
    refs.forEach((r) => {
      const el = r.current
      if (!el) return
      el.style.height = '0px'
      el.style.height = `${el.scrollHeight}px`
    })
  }, [])

  useEffect(() => {
    applyAutosize()
  }, [headline, subheadline, cta, extraText, applyAutosize])

  // Load settings from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (!raw) return
      const parsed: unknown = JSON.parse(raw)
      if (!isRecord(parsed)) return

      if (typeof parsed.selectedModel === 'string') setSelectedModel(parsed.selectedModel)
      if (typeof parsed.imageSize === 'string') setImageSize(parsed.imageSize)
      if (typeof parsed.style === 'string') setStyle(parsed.style)
      if (Array.isArray(parsed.goals) && parsed.goals.every((g) => typeof g === 'string')) {
        setGoals(parsed.goals)
      }
      if (typeof parsed.language === 'string') setLanguage(parsed.language)
      if (typeof parsed.industry === 'string') setIndustry(parsed.industry)
      if (typeof parsed.targetAudience === 'string') setTargetAudience(parsed.targetAudience)
      if (typeof parsed.colorBackground === 'string') setColorBackground(parsed.colorBackground)
      if (typeof parsed.colorAccent === 'string') setColorAccent(parsed.colorAccent)
      if (typeof parsed.colorText === 'string') setColorText(parsed.colorText)
      if (typeof parsed.colorSecondary === 'string') setColorSecondary(parsed.colorSecondary)
      if (typeof parsed.fonts === 'string') setFonts(parsed.fonts)
    } catch {
      // ignore corrupted settings
    }
  }, [])

  // Save settings to localStorage (serializable only)
  useEffect(() => {
    const payload = {
      selectedModel,
      imageSize,
      style,
      goals,
      language,
      industry,
      targetAudience,
      colorBackground,
      colorAccent,
      colorText,
      colorSecondary,
      fonts,
    }
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // ignore quota errors
    }
  }, [
    selectedModel,
    imageSize,
    style,
    goals,
    language,
    industry,
    targetAudience,
    colorBackground,
    colorAccent,
    colorText,
    colorSecondary,
    fonts,
  ])

  const loadHistory = useCallback(async () => {
    if (!API_URL) {
      toast.error('API URL не настроен')
      return
    }
    setHistoryLoading(true)
    try {
      const res = await fetch(`${API_URL}/creatives/history`)
      if (!res.ok) throw new Error('Не удалось загрузить историю')
      const data: unknown = await res.json()
      if (Array.isArray(data)) setHistoryItems(data as HistoryResponse)
      else setHistoryItems([])
    } catch {
      toast.error('Не удалось загрузить историю')
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  const handleFetchImage = useCallback(
    async (url: string) => {
      if (!API_URL) return
      try {
        const res = await fetch(`${API_URL}/creatives/fetch-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        })
        const data: unknown = await res.json()
        if (!res.ok) return
        if (!isRecord(data)) return
        const base64 = data.base64
        if (typeof base64 !== 'string') return
        const file = base64ToFile(base64, 'product.jpg')
        if (!file) return
        setCompositionFiles((prev) => [file, ...prev].slice(0, 3))
      } catch {
        // ignore
      }
    },
    []
  )

  /** Добавляет изображение в композицию из URL или data URL, полученных при парсинге. */
  const addProductImageFromParse = useCallback(
    async (urlOrData: string) => {
      const s = urlOrData.trim()
      if (!s) return
      // Data URL
      if (s.startsWith('data:')) {
        const file = base64ToFile(s, 'product.jpg')
        if (file) setCompositionFiles((prev) => [file, ...prev].slice(0, 3))
        return
      }
      // Сырой base64 (без префикса)
      if (!s.startsWith('http://') && !s.startsWith('https://')) {
        const dataUrl = `data:image/jpeg;base64,${s}`
        const file = base64ToFile(dataUrl, 'product.jpg')
        if (file) setCompositionFiles((prev) => [file, ...prev].slice(0, 3))
        return
      }
      // Прямая ссылка — загрузка в клиенте, при ошибке (CORS) через API
      try {
        const res = await fetch(s, { mode: 'cors' })
        if (!res.ok) throw new Error('Fetch failed')
        const blob = await res.blob()
        const mime = blob.type || 'image/jpeg'
        const ext = mime.split('/')[1] || 'jpg'
        const file = new File([blob], `product.${ext}`, { type: mime })
        setCompositionFiles((prev) => [file, ...prev].slice(0, 3))
      } catch {
        await handleFetchImage(s)
      }
    },
    [handleFetchImage]
  )

  const handleParseProduct = useCallback(async () => {
    if (!API_URL) {
      setParseError('API URL не настроен')
      return
    }
    const url = productUrl.trim()
    if (!url.startsWith('http')) return

    setParsing(true)
    setParseError('')
    try {
      const res = await fetch(`${API_URL}/creatives/parse-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          settings: { style, language, goals, targetAudience, industry, format },
        }),
      })

      const data: unknown = await res.json()
      if (!res.ok) {
        const msg =
          isRecord(data) && typeof data.error === 'string'
            ? data.error
            : 'Ошибка парсинга'
        setParseError(msg)
        return
      }

      const parsed = data as ParseProductResponse
      if (typeof parsed.headline === 'string') setHeadline(parsed.headline)
      if (typeof parsed.subheadline === 'string') setSubheadline(parsed.subheadline)
      if (typeof parsed.cta === 'string') setCta(parsed.cta)
      if (typeof parsed.extra_text === 'string') setExtraText(parsed.extra_text)
      if (typeof parsed.price === 'string') setPrice(parsed.price)
      if (typeof parsed.language === 'string') setLanguage(parsed.language)
      if (typeof parsed.visual_prompt === 'string') setUserPrompt(parsed.visual_prompt)

      if (Array.isArray(parsed.benefits) && parsed.benefits.length > 0) {
        const next = parsed.benefits
          .filter((b) => typeof b === 'string')
          .slice(0, 4)
        if (next.length > 0) setBenefits(next)
      }

      const raw = parsed as Record<string, unknown>
      const imageUrl =
        (typeof parsed.image_url === 'string' && parsed.image_url && parsed.image_url !== 'null'
          ? parsed.image_url
          : null) ??
        (typeof raw.product_image === 'string' && raw.product_image ? raw.product_image : null) ??
        (typeof raw.image === 'string' && raw.image ? raw.image : null)
      const imageBase64 = typeof raw.image_base64 === 'string' && raw.image_base64 ? raw.image_base64 : null
      if (imageUrl) {
        await addProductImageFromParse(imageUrl)
      } else if (imageBase64) {
        await addProductImageFromParse(imageBase64)
      }
    } catch {
      setParseError('Ошибка парсинга')
    } finally {
      setParsing(false)
    }
  }, [
    productUrl,
    style,
    language,
    goals,
    targetAudience,
    industry,
    format,
    addProductImageFromParse,
  ])

  // Debounced parse on URL change
  useEffect(() => {
    const url = productUrl.trim()
    if (!url.startsWith('http')) return

    if (parseTimerRef.current) window.clearTimeout(parseTimerRef.current)
    parseTimerRef.current = window.setTimeout(() => {
      void handleParseProduct()
    }, 800)

    return () => {
      if (parseTimerRef.current) window.clearTimeout(parseTimerRef.current)
    }
  }, [productUrl, handleParseProduct])

  // Clipboard paste -> composition photos (max 3)
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      if (!generatorOpen) return
      const items = e.clipboardData?.items
      if (!items) return
      const files: File[] = []
      for (const item of Array.from(items)) {
        if (item.kind !== 'file') continue
        const f = item.getAsFile()
        if (f) files.push(f)
      }
      if (files.length === 0) return
      setCompositionFiles((prev) => [...files, ...prev].slice(0, 3))
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [generatorOpen])

  const addCompositionFiles = useCallback((files: FileList | null) => {
    if (!files) return
    const picked = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (picked.length === 0) return
    setCompositionFiles((prev) => [...prev, ...picked].slice(0, 3))
  }, [])

  const addReferenceFiles = useCallback((files: FileList | null) => {
    if (!files) return
    const picked = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (picked.length === 0) return
    setReferenceFiles((prev) => [...prev, ...picked].slice(0, 5))
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!activeProject) {
      toast.error('Выберите проект')
      return
    }
    if (!API_URL) {
      toast.error('API URL не настроен')
      return
    }

    setGenerating(true)
    try {
      const fd = new FormData()
      fd.set('model', selectedModel)
      fd.set('format', format)
      fd.set('imageSize', imageSize)
      fd.set('headline', headline)
      fd.set('subheadline', subheadline)
      fd.set('cta', cta)
      fd.set('extraText', extraText)
      fd.set('price', price)
      fd.set('userPrompt', userPrompt)
      fd.set(
        'benefits',
        JSON.stringify(benefits.map((b) => b.trim()).filter((b) => b.length > 0))
      )
      fd.set('goals', JSON.stringify(goals))
      fd.set('industry', industry)
      fd.set('language', language)
      fd.set('style', style)
      fd.set('targetAudience', targetAudience)
      fd.set('colorBackground', colorBackground)
      fd.set('colorAccent', colorAccent)
      fd.set('colorText', colorText)
      fd.set('colorSecondary', colorSecondary)
      fd.set('fonts', fonts)

      compositionFiles.forEach((f) => fd.append('photos', f))
      referenceFiles.forEach((f) => fd.append('references', f))
      if (logoFile && CREATIVES_LOGO_FIELD) {
        fd.append(CREATIVES_LOGO_FIELD, logoFile, logoFile.name)
      }

      const res = await fetch(`${API_URL}/creatives/generate`, {
        method: 'POST',
        body: fd,
      })

      const data: unknown = await res.json().catch(() => null)
      if (!res.ok) {
        const msg =
          isRecord(data) && typeof data.error === 'string'
            ? data.error
            : 'Ошибка генерации'
        toast.error(msg)
        return
      }

      toast.success('Креатив готов')
      await loadHistory()
      setGeneratorOpen(false)
    } catch {
      toast.error('Ошибка генерации')
    } finally {
      setGenerating(false)
    }
  }, [
    activeProject,
    selectedModel,
    format,
    imageSize,
    headline,
    subheadline,
    cta,
    extraText,
    price,
    userPrompt,
    benefits,
    goals,
    industry,
    language,
    style,
    targetAudience,
    colorBackground,
    colorAccent,
    colorText,
    colorSecondary,
    fonts,
    compositionFiles,
    referenceFiles,
    logoFile,
    loadHistory,
  ])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  const setFormatAndCloseParseError = useCallback((value: string) => {
    setFormat(value)
    setParseError('')
  }, [])

  const toggleGoal = useCallback((value: string) => {
    setGoals((prev) =>
      prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value]
    )
  }, [])

  const removeFileAt = useCallback((index: number) => {
    setCompositionFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const removeRefAt = useCallback((index: number) => {
    setReferenceFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const onDownload = useCallback(async (item: HistoryItem) => {
    try {
      const res = await fetch(item.image_url)
      const blob = await res.blob()
      const a = document.createElement('a')
      const url = URL.createObjectURL(blob)
      a.href = url
      a.download = safeFileName(
        `${item.headline ?? 'creative'}_${item.format ?? 'format'}.jpg`
      )
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Не удалось скачать')
    }
  }, [])

  const onGeneratorDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      addCompositionFiles(e.dataTransfer.files)
    },
    [addCompositionFiles]
  )

  const setColor = useCallback(
    (
      next: string,
      setter: (v: string) => void,
      allowEmpty = true
    ) => {
      const v = toHexColor(next)
      if (!v && allowEmpty) setter('')
      else setter(v)
    },
    []
  )

  const hasItems = historyItems.length > 0
  const countWord =
    historyItems.length === 1
      ? 'креатив'
      : historyItems.length < 5
      ? 'креатива'
      : 'креативов'

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-14 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-medium">Креативы</h1>
          {!historyLoading && (
            <span className="text-xs text-muted-foreground">
              {historyItems.length} {countWord}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void loadHistory()}
            aria-label="Обновить"
          >
            <RefreshCw size={16} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 size={14} className="mr-2" />
            Настройки
          </Button>
          <Button size="sm" onClick={() => setGeneratorOpen(true)}>
            <Sparkles size={14} className="mr-2" />
            Создать
          </Button>
        </div>
      </div>

      {/* Gallery */}
      <div className="flex-1 overflow-y-auto p-6">
        {historyLoading && !hasItems ? (
          <div className="columns-[220px] gap-3 [column-fill:_balance]">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="mb-3 break-inside-avoid">
                <Skeleton
                  className={`w-full rounded-xl ${
                    i % 4 === 0
                      ? 'h-36'
                      : i % 4 === 1
                      ? 'h-52'
                      : i % 4 === 2
                      ? 'h-44'
                      : 'h-64'
                  }`}
                />
              </div>
            ))}
          </div>
        ) : !hasItems && !generating ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <ImageOff size={40} className="text-muted-foreground/40" />
            <div>
              <p className="text-sm font-medium">Пока нет креативов</p>
              <p className="text-xs text-muted-foreground mt-1">
                Нажмите «Создать», чтобы сгенерировать первый креатив
              </p>
            </div>
          </div>
        ) : (
          <div className="columns-[220px] gap-3 [column-fill:_balance]">
            {generating && (
              <div key="__generating__" className="mb-3 break-inside-avoid">
                <div className="rounded-xl border border-border overflow-hidden bg-card">
                  <Skeleton className="w-full h-64" />
                  <div className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-16 rounded-md" />
                      <Skeleton className="h-5 w-14 rounded-md" />
                    </div>
                    <Skeleton className="h-4 w-[85%] rounded-md" />
                    <Skeleton className="h-3 w-24 rounded-md" />
                  </div>
                </div>
              </div>
            )}
            {historyItems.map((item) => (
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
                      src={item.image_url}
                      alt={item.headline ?? 'Креатив'}
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
                          void onDownload(item)
                        }}
                      >
                        <Download size={14} />
                      </Button>
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.format && (
                        <Badge variant="outline" className="text-[11px]">
                          {item.format}
                        </Badge>
                      )}
                      {item.model && (
                        <Badge variant="secondary" className="text-[11px]">
                          {item.model}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium leading-snug line-clamp-2">
                      {item.headline ?? 'Без заголовка'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRuDate(item.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Creative detail modal */}
      <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
          {detailItem && (
            <>
              <div className="relative aspect-[4/5] max-h-[70vh] w-full bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={detailItem.image_url}
                  alt={detailItem.headline ?? 'Креатив'}
                  className="w-full h-full object-contain"
                />
              </div>
              <DialogHeader className="p-4 pb-2">
                <DialogTitle className="line-clamp-2 pr-8">
                  {detailItem.headline ?? 'Без заголовка'}
                </DialogTitle>
              </DialogHeader>
              <div className="px-4 pb-4 space-y-3">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {detailItem.model && (
                    <>
                      <dt className="text-muted-foreground">Модель</dt>
                      <dd>{detailItem.model}</dd>
                    </>
                  )}
                  {detailItem.format && (
                    <>
                      <dt className="text-muted-foreground">Формат</dt>
                      <dd>{detailItem.format}</dd>
                    </>
                  )}
                  <dt className="text-muted-foreground">Дата</dt>
                  <dd>{formatRuDate(detailItem.created_at)}</dd>
                </dl>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    void onDownload(detailItem)
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

      {/* Generator Sheet */}
      <Sheet open={generatorOpen} onOpenChange={setGeneratorOpen}>
        <SheetContent className="w-[480px] sm:w-[480px] p-0 flex flex-col gap-0">
          <SheetHeader className="px-6 py-4 border-b border-border shrink-0">
            <SheetTitle className="text-base">Создать</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* URL + parse */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Ссылка на продукт
                  </p>
                  {parsing && (
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 size={12} className="animate-spin" />
                      Парсинг…
                    </span>
                  )}
                </div>
                <Input
                  value={productUrl}
                  placeholder="https://..."
                  onChange={(e) => setProductUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleParseProduct()
                  }}
                />
                {parseError && (
                  <p className="text-xs text-red-500">{parseError}</p>
                )}
              </div>

              {/* Price */}
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Цена
                </p>
                <Input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Например, 99 000 €"
                />
              </div>

              {/* Photos upload */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Фото продукта
                  </p>
                  <Badge variant="outline" className="text-[11px]">
                    {compositionFiles.length}/3
                  </Badge>
                </div>
                <div
                  className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground"
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onDrop={onGeneratorDrop}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm text-foreground">Перетащите изображения сюда</p>
                      <p className="text-xs text-muted-foreground">
                        Или вставьте из буфера обмена (⌘V). До 3 фото.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generatorPhotosInputRef.current?.click()}
                    >
                      <Plus size={14} className="mr-2" />
                      Добавить
                    </Button>
                    <input
                      ref={generatorPhotosInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => addCompositionFiles(e.target.files)}
                    />
                  </div>
                </div>

                {compositionFiles.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {compositionFiles.map((f, idx) => (
                      <div key={`${f.name}_${idx}`} className="relative rounded-lg border border-border overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={URL.createObjectURL(f)}
                          alt={f.name}
                          className="w-full h-20 object-cover"
                        />
                        <button
                          className="absolute top-1 right-1 rounded-md bg-black/60 text-white p-1"
                          onClick={() => removeFileAt(idx)}
                          aria-label="Удалить"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {compositionFiles.length > 0 && (
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-0 h-auto text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => generatorRefsInputRef.current?.click()}
                    >
                      <Plus size={12} className="mr-2" />
                      референсы
                    </Button>
                    <Badge variant="outline" className="text-[11px]">
                      {referenceFiles.length}/5
                    </Badge>
                    <input
                      ref={generatorRefsInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => addReferenceFiles(e.target.files)}
                    />
                  </div>
                )}

                {referenceFiles.length > 0 && (
                  <div className="grid grid-cols-5 gap-2">
                    {referenceFiles.map((f, idx) => (
                      <div key={`${f.name}_${idx}`} className="relative rounded-lg border border-border overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={URL.createObjectURL(f)}
                          alt={f.name}
                          className="w-full h-14 object-cover"
                        />
                        <button
                          className="absolute top-1 right-1 rounded-md bg-black/60 text-white p-1"
                          onClick={() => removeRefAt(idx)}
                          aria-label="Удалить"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Format selector */}
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Формат
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {FORMATS.map((f) => (
                    <Button
                      key={f.value}
                      type="button"
                      variant="outline"
                      className={`h-9 text-xs ${format === f.value ? '!bg-primary !text-primary-foreground !border-primary' : ''}`}
                      onClick={() => setFormatAndCloseParseError(f.value)}
                    >
                      {f.value}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Texts */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Заголовок
                  </p>
                  <Textarea
                    ref={headlineRef}
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className="resize-none overflow-hidden"
                    rows={1}
                    placeholder="Короткий заголовок"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Подзаголовок
                  </p>
                  <Textarea
                    ref={subheadlineRef}
                    value={subheadline}
                    onChange={(e) => setSubheadline(e.target.value)}
                    className="resize-none overflow-hidden"
                    rows={1}
                    placeholder="Уточнение, детали"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    CTA
                  </p>
                  <Textarea
                    ref={ctaRef}
                    value={cta}
                    onChange={(e) => setCta(e.target.value)}
                    className="resize-none overflow-hidden"
                    rows={1}
                    placeholder="Например: Получить консультацию"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Доп. текст
                  </p>
                  <Textarea
                    ref={extraTextRef}
                    value={extraText}
                    onChange={(e) => setExtraText(e.target.value)}
                    className="resize-none overflow-hidden"
                    rows={1}
                    placeholder="Небольшой уточняющий текст"
                  />
                </div>
              </div>

              {/* Benefits */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Преимущества
                  </p>
                  <Badge variant="outline" className="text-[11px]">
                    {benefits.filter((b) => b.trim()).length}/4
                  </Badge>
                </div>
                <div className="space-y-2">
                  {benefits.map((b, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={b}
                        placeholder={`Преимущество ${idx + 1}`}
                        onChange={(e) =>
                          setBenefits((prev) =>
                            prev.map((v, i) => (i === idx ? e.target.value : v))
                          )
                        }
                      />
                      {benefits.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={() =>
                            setBenefits((prev) => prev.filter((_, i) => i !== idx))
                          }
                        >
                          <X size={14} />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {benefits.length < 4 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-0 h-auto text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setBenefits((prev) => [...prev, ''])}
                  >
                    <Plus size={12} className="mr-2" />
                    Добавить
                  </Button>
                )}
              </div>

              {/* Prompt */}
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Промпт
                </p>
                <Textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  rows={3}
                  placeholder="Дополнительные указания для генерации"
                />
              </div>

              <Separator />

              {/* Generate */}
              <Button
                className="w-full h-11 text-sm text-white"
                style={{
                  background:
                    'linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f97316 100%)',
                }}
                disabled={generating}
                onClick={() => void handleGenerate()}
              >
                {generating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Генерируем…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles size={16} />
                    Сгенерировать
                  </span>
                )}
              </Button>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Settings Sheet */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent className="w-[320px] sm:w-[320px] p-0 flex flex-col gap-0">
          <SheetHeader className="px-6 py-4 border-b border-border shrink-0">
            <SheetTitle className="text-base">Настройки</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* Logo */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Логотип
                  </p>
                  {logoFile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setLogoFile(null)}
                      aria-label="Удалить логотип"
                    >
                      <X size={14} />
                    </Button>
                  )}
                </div>

                {!logoFile ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <Plus size={14} className="mr-2" />
                    Загрузить
                  </Button>
                ) : (
                  <div className="rounded-xl border border-border overflow-hidden w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={URL.createObjectURL(logoFile)}
                      alt="Логотип"
                      className="w-full h-28 object-contain bg-muted/30"
                    />
                  </div>
                )}

                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) setLogoFile(f)
                  }}
                />
              </div>

              {/* Model selector */}
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Модель
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {MODELS.map((m) => (
                    <Button
                      key={m.key}
                      variant="outline"
                      className={`h-9 text-xs flex flex-col leading-none ${selectedModel === m.key ? '!bg-primary !text-primary-foreground !border-primary' : ''}`}
                      onClick={() => setSelectedModel(m.key)}
                    >
                      <span>{m.label}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {m.tag}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Resolution selector */}
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Разрешение
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {RESOLUTIONS.map((r) => (
                    <Button
                      key={r.key}
                      variant="outline"
                      className={`h-9 text-xs flex flex-col leading-none ${imageSize === r.key ? '!bg-primary !text-primary-foreground !border-primary' : ''}`}
                      onClick={() => setImageSize(r.key)}
                    >
                      <span>{r.label}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {r.sub}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Style selector */}
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Стиль
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {STYLES.map((s) => (
                    <Button
                      key={s.key}
                      variant="outline"
                      className={`h-9 text-xs ${style === s.key ? '!bg-primary !text-primary-foreground !border-primary' : ''}`}
                      onClick={() => setStyle(s.key)}
                    >
                      {s.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Goal selector */}
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Цель
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {GOALS.map((g) => {
                    const active = goals.includes(g.value)
                    return (
                      <Button
                        key={g.value}
                        variant="outline"
                        className={`h-9 text-xs ${active ? '!bg-primary !text-primary-foreground !border-primary' : ''}`}
                        onClick={() => toggleGoal(g.value)}
                      >
                        {g.label}
                      </Button>
                    )
                  })}
                </div>
              </div>

              {/* Language selector */}
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Язык
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {LANGUAGES.map((l) => (
                    <Button
                      key={l.key}
                      variant="outline"
                      className={`h-9 text-xs ${language === l.key ? '!bg-primary !text-primary-foreground !border-primary' : ''}`}
                      onClick={() => setLanguage(l.key)}
                    >
                      {l.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Industry */}
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Индустрия
                </p>
                <Input
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="Например: недвижимость"
                />
              </div>

              {/* Target audience */}
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  ЦА
                </p>
                <Input
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="Например: семьи 30–45"
                />
              </div>

              {/* Colors */}
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Цвета
                </p>

                {(
                  [
                    {
                      label: 'Фон',
                      value: colorBackground,
                      set: (v: string) => setColor(v, setColorBackground),
                      clear: () => setColorBackground(''),
                    },
                    {
                      label: 'Акцент',
                      value: colorAccent,
                      set: (v: string) => setColor(v, setColorAccent),
                      clear: () => setColorAccent(''),
                    },
                    {
                      label: 'Текст',
                      value: colorText,
                      set: (v: string) => setColor(v, setColorText),
                      clear: () => setColorText(''),
                    },
                    {
                      label: 'Доп.',
                      value: colorSecondary,
                      set: (v: string) => setColor(v, setColorSecondary),
                      clear: () => setColorSecondary(''),
                    },
                  ] as const
                ).map((row) => (
                  <div key={row.label} className="flex items-center gap-2">
                    <div className="w-12 text-xs text-muted-foreground shrink-0">
                      {row.label}
                    </div>
                    <input
                      type="color"
                      value={row.value || '#000000'}
                      onChange={(e) => row.set(e.target.value)}
                      className="h-9 w-10 rounded-md border border-border bg-transparent p-1"
                    />
                    <Input
                      value={row.value}
                      onChange={(e) => row.set(e.target.value)}
                      placeholder="#RRGGBB"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={row.clear}
                      aria-label="Очистить"
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Fonts */}
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Шрифты
                </p>
                <Input
                  value={fonts}
                  onChange={(e) => setFonts(e.target.value)}
                  placeholder="Например: Manrope, Playfair Display"
                />
              </div>

              <Separator />

              {/* Extra selectors present in project UI kit */}
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Формат (по умолчанию)
                </p>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Выберите формат" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMATS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.value} — {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <AnimatePresence>
        {generating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none"
          />
        )}
      </AnimatePresence>
    </div>
  )
}
