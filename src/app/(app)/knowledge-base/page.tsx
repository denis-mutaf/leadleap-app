'use client'

import { useEffect, useState, useRef } from 'react'
import {
  Upload,
  Trash2,
  Search,
  Send,
  FileText,
  BookOpen,
  X,
  BrainCircuit,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { useProjectStore } from '@/store/project-store'
import { toast } from 'sonner'

interface Document {
  id: string
  title: string
  file_name: string
  file_type: string
  file_size: number
  created_at: string
}

interface Source {
  id: string
  title: string
}

interface SearchResult {
  id: string
  document_id: string
  content: string
  similarity: number
}

type SheetMode = 'upload' | 'ask' | 'search' | null

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function fileTypeLabel(type: string, name: string) {
  if (type.includes('pdf') || name.endsWith('.pdf')) return 'PDF'
  if (type.includes('word') || name.endsWith('.docx')) return 'DOCX'
  if (name.endsWith('.md')) return 'MD'
  if (type.includes('html') || name.endsWith('.html')) return 'HTML'
  return 'TXT'
}

export default function KnowledgeBasePage() {
  const { activeProject } = useProjectStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [documents, setDocuments] = useState<Document[]>([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [sheetMode, setSheetMode] = useState<SheetMode>(null)

  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [sources, setSources] = useState<Source[]>([])
  const [asking, setAsking] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (activeProject) void loadDocuments()
  }, [activeProject])

  function openSheet(mode: SheetMode) {
    setSheetMode(mode)
  }

  function closeSheet() {
    setSheetMode(null)
  }

  async function loadDocuments() {
    if (!activeProject) return
    setLoadingDocs(true)
    const res = await fetch(`/api/rag/documents?projectId=${activeProject.id}`)
    const data = await res.json()
    if (Array.isArray(data)) setDocuments(data)
    setLoadingDocs(false)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !activeProject) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('projectId', activeProject.id)

    const res = await fetch('/api/rag/documents', {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error ?? 'Ошибка загрузки')
    } else {
      toast.success(`Документ "${data.title}" добавлен`)
      closeSheet()
      void loadDocuments()
    }

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleDelete(doc: Document) {
    if (!confirm(`Удалить "${doc.title}"?`)) return
    setDeletingId(doc.id)
    const res = await fetch(`/api/rag/documents/${doc.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Документ удалён')
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
    } else {
      toast.error('Ошибка при удалении')
    }
    setDeletingId(null)
  }

  async function handleAsk() {
    if (!question.trim() || !activeProject) return
    setAsking(true)
    setAnswer('')
    setSources([])

    const res = await fetch('/api/rag/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id, question }),
    })
    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error ?? 'Ошибка запроса')
    } else {
      setAnswer(data.answer)
      setSources(data.sources ?? [])
    }
    setAsking(false)
  }

  async function handleSearch() {
    if (!searchQuery.trim() || !activeProject) return
    setSearching(true)
    setSearchResults([])

    const res = await fetch('/api/rag/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id, query: searchQuery }),
    })
    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error ?? 'Ошибка поиска')
    } else {
      setSearchResults(Array.isArray(data) ? data : [])
    }
    setSearching(false)
  }

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
        <BookOpen size={32} className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Выберите проект в боковой панели</p>
      </div>
    )
  }

  const docWord =
    documents.length === 1
      ? 'документ'
      : documents.length < 5
        ? 'документа'
        : 'документов'

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-6 h-14 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-medium">База знаний</h1>
          {!loadingDocs && (
            <span className="text-xs text-muted-foreground">
              {documents.length} {docWord}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-8 text-xs"
            onClick={() => openSheet('search')}
          >
            <Search size={13} />
            Поиск
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-8 text-xs"
            onClick={() => openSheet('ask')}
          >
            <BrainCircuit size={13} />
            Спросить AI
          </Button>
          <Button
            size="sm"
            className="gap-2 h-8 text-xs"
            onClick={() => openSheet('upload')}
          >
            <Upload size={13} />
            Загрузить
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loadingDocs ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
            <FileText size={40} className="text-muted-foreground/40" />
            <div>
              <p className="text-sm font-medium">База знаний пуста</p>
              <p className="text-xs text-muted-foreground mt-1">
                Загрузите первый документ чтобы начать работу
              </p>
            </div>
            <Button
              size="sm"
              className="gap-2 mt-2"
              onClick={() => openSheet('upload')}
            >
              <Upload size={13} />
              Загрузить документ
            </Button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground">
                  Документ
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-20">
                  Тип
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-24">
                  Размер
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-32">
                  Добавлен
                </th>
                <th className="px-4 py-3 w-12" />
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr
                  key={doc.id}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors group"
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate max-w-[400px]">
                        {doc.title}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 pl-5 truncate max-w-[400px]">
                      {doc.file_name}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">
                      {fileTypeLabel(doc.file_type, doc.file_name)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatBytes(doc.file_size)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatDate(doc.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => void handleDelete(doc)}
                      disabled={deletingId === doc.id}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Sheet open={sheetMode !== null} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent className="w-[420px] sm:w-[420px] flex flex-col gap-0 p-0">
          {sheetMode === 'upload' && (
            <>
              <SheetHeader className="px-6 py-4 border-b border-border shrink-0">
                <SheetTitle className="text-base">Загрузить документ</SheetTitle>
              </SheetHeader>
              <div className="flex-1 p-6 space-y-4">
                <div
                  className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-border/80 hover:bg-muted/20 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={24} className="text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      {uploading ? 'Обработка документа...' : 'Нажмите чтобы выбрать файл'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, DOCX, TXT, MD, HTML — до 20MB
                    </p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt,.md,.html"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                />
                <div className="rounded-md border border-border bg-muted/40 p-3 space-y-1">
                  <p className="text-xs font-medium">Что происходит при загрузке</p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Текст извлекается из файла</li>
                    <li>Claude генерирует название документа</li>
                    <li>Текст разбивается на чанки</li>
                    <li>OpenAI создаёт эмбеддинги для поиска</li>
                  </ol>
                </div>
              </div>
            </>
          )}

          {sheetMode === 'ask' && (
            <>
              <SheetHeader className="px-6 py-4 border-b border-border shrink-0">
                <SheetTitle className="text-base">Спросить AI</SheetTitle>
              </SheetHeader>
              <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                <Textarea
                  placeholder="Задайте вопрос по базе знаний..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="text-sm min-h-[120px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void handleAsk()
                  }}
                />
                <Button
                  className="w-full gap-2"
                  onClick={() => void handleAsk()}
                  disabled={asking || !question.trim()}
                >
                  <Send size={13} />
                  {asking ? 'Поиск по базе знаний...' : 'Отправить'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">⌘ + Enter для отправки</p>

                {answer && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="rounded-md border border-border bg-muted/40 p-4">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{answer}</p>
                      </div>
                      {sources.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Источники:</p>
                          <div className="flex flex-wrap gap-1">
                            {sources.map((s) => (
                              <Badge key={s.id} variant="secondary" className="text-xs">
                                {s.title}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground gap-1 h-7 px-2"
                        onClick={() => {
                          setAnswer('')
                          setSources([])
                          setQuestion('')
                        }}
                      >
                        <X size={11} />
                        Очистить
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {sheetMode === 'search' && (
            <>
              <SheetHeader className="px-6 py-4 border-b border-border shrink-0">
                <SheetTitle className="text-base">Поиск по базе</SheetTitle>
              </SheetHeader>
              <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                <div className="flex gap-2">
                  <Input
                    placeholder="Поисковый запрос..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => void handleSearch()}
                    disabled={searching || !searchQuery.trim()}
                    className="shrink-0"
                  >
                    <Search size={14} />
                  </Button>
                </div>

                {searching && (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full rounded-md" />
                    ))}
                  </div>
                )}

                {!searching && searchResults.length === 0 && searchQuery && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Ничего не найдено
                  </p>
                )}

                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Найдено: {searchResults.length} фрагментов
                    </p>
                    {searchResults.map((r, i) => (
                      <div
                        key={r.id}
                        className="rounded-md border border-border p-3 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">
                            #{i + 1}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {(r.similarity * 100).toFixed(0)}%
                          </Badge>
                        </div>
                        <p className="text-xs leading-relaxed line-clamp-5">{r.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
