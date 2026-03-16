'use client'

import { useEffect, useState } from 'react'
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  ChevronRight,
  Filter,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useProjectStore } from '@/store/project-store'
import { Call, Evaluation, CallInsight, Manager } from '@/types'
import { toast } from 'sonner'

function formatDuration(seconds: number) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round((value / 10) * 100)
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}/10</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 40
      ? 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800'
      : score >= 25
      ? 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800'
      : 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800'

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium ${color}`}>
      <Star size={10} />
      {score}/50
    </span>
  )
}

export default function CallsPage() {
  const { activeProject } = useProjectStore()

  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [managers, setManagers] = useState<Manager[]>([])
  const [filterManager, setFilterManager] = useState<string>('all')

  const [selectedCallId, setSelectedCallId] = useState<string | null>(null)
  const [callDetail, setCallDetail] = useState<{
    call: Call
    evaluation: Evaluation | null
    insight: CallInsight | null
  } | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [activeTab, setActiveTab] = useState<'summary' | 'transcript' | 'evaluation' | 'insights'>('summary')

  useEffect(() => {
    if (activeProject) {
      void loadManagers()
      void loadCalls()
    }
  }, [activeProject])

  useEffect(() => {
    if (activeProject) void loadCalls()
  }, [filterManager, activeProject])

  async function loadManagers() {
    if (!activeProject) return
    const res = await fetch(`/api/managers?projectId=${activeProject.id}`)
    if (!res.ok) return
    const data = await res.json()
    if (Array.isArray(data)) setManagers(data)
  }

  async function loadCalls() {
    if (!activeProject) return
    setLoading(true)
    const params = new URLSearchParams({ projectId: activeProject.id })
    if (filterManager !== 'all') params.set('managerId', filterManager)
    const res = await fetch(`/api/calls?${params.toString()}`)
    if (!res.ok) {
      setLoading(false)
      toast.error('Не удалось загрузить звонки')
      return
    }
    const data = await res.json()
    if (data.data) setCalls(data.data as Call[])
    setLoading(false)
  }

  async function openCall(callId: string) {
    setSelectedCallId(callId)
    setLoadingDetail(true)
    setCallDetail(null)
    setActiveTab('summary')

    const res = await fetch(`/api/calls/${callId}`)
    const data = await res.json()
    if (!res.ok) {
      toast.error('Не удалось загрузить звонок')
    } else {
      setCallDetail(data)
    }
    setLoadingDetail(false)
  }

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
        <Phone size={32} className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Выберите проект в боковой панели</p>
      </div>
    )
  }

  const callWord =
    calls.length === 1 ? 'звонок'
    : calls.length < 5 ? 'звонка'
    : 'звонков'

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* Header */}
      <div className="flex items-center justify-between px-6 h-14 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-medium">Звонки</h1>
          {!loading && (
            <span className="text-xs text-muted-foreground">
              {calls.length} {callWord}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {managers.length > 0 && (
            <Select value={filterManager} onValueChange={setFilterManager}>
              <SelectTrigger className="h-8 text-xs w-[180px] gap-2">
                <Filter size={12} className="text-muted-foreground shrink-0" />
                <SelectValue placeholder="Все менеджеры" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все менеджеры</SelectItem>
                {managers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
            <Phone size={40} className="text-muted-foreground/40" />
            <div>
              <p className="text-sm font-medium">Нет звонков</p>
              <p className="text-xs text-muted-foreground mt-1">
                Звонки появятся после настройки PBX webhook
              </p>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground w-8" />
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                  Дата и время
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                  Менеджер
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                  Клиент
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-24">
                  Длительность
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-28">
                  Оценка
                </th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {calls.map((call) => (
                <tr
                  key={call.id}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer group"
                  onClick={() => void openCall(call.id)}
                >
                  <td className="px-6 py-3">
                    {call.type === 'inbound' ? (
                      <PhoneIncoming size={14} className="text-green-500" />
                    ) : call.type === 'outbound' ? (
                      <PhoneOutgoing size={14} className="text-blue-500" />
                    ) : (
                      <Phone size={14} className="text-muted-foreground" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatDate(call.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium">
                      {call.manager?.name ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      {call.client?.name && (
                        <p className="text-sm font-medium">{call.client.name}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {call.client?.phone ?? '—'}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatDuration(call.duration)}
                  </td>
                  <td className="px-4 py-3">
                    {call.status === 'analyzed' ? (
                      <ScoreBadge score={0} />
                    ) : call.status === 'pending' ? (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Ожидает
                      </Badge>
                    ) : call.status === 'processing' ? (
                      <Badge variant="outline" className="text-xs text-yellow-600">
                        Обрабатывается
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        {call.status}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight
                      size={14}
                      className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Call detail sheet */}
      <Sheet
        open={selectedCallId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedCallId(null)
        }}
      >
        <SheetContent className="w-[520px] sm:w-[520px] flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b border-border shrink-0">
            <SheetTitle className="text-base">
              {callDetail
                ? `Звонок — ${callDetail.call.client?.name ?? callDetail.call.client?.phone ?? 'Неизвестный клиент'}`
                : 'Загрузка...'}
            </SheetTitle>
            {callDetail && (
              <p className="text-xs text-muted-foreground">
                {formatDate(callDetail.call.created_at)}
                {callDetail.call.manager && ` · ${callDetail.call.manager.name}`}
                {` · ${formatDuration(callDetail.call.duration)}`}
              </p>
            )}
          </SheetHeader>

          {loadingDetail ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : callDetail ? (
            <>
              {/* Tabs */}
              <div className="flex border-b border-border shrink-0 px-6">
                {(
                  [
                    { key: 'summary', label: 'Резюме' },
                    { key: 'evaluation', label: 'Оценка' },
                    { key: 'insights', label: 'Инсайты' },
                    { key: 'transcript', label: 'Транскрипт' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3 py-3 text-xs font-medium border-b-2 transition-colors ${
                      activeTab === tab.key
                        ? 'border-primary text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">

                {/* Summary tab */}
                {activeTab === 'summary' && (
                  <div className="space-y-4">
                    {callDetail.evaluation?.raw_analysis &&
                    typeof callDetail.evaluation.raw_analysis === 'object' &&
                    'summary' in callDetail.evaluation.raw_analysis ? (
                      <div className="rounded-md border border-border bg-muted/40 p-4">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {String(
                            (callDetail.evaluation.raw_analysis as Record<string, unknown>)
                              .summary
                          )}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Резюме недоступно</p>
                    )}
                    {callDetail.evaluation?.recommendations && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Рекомендации
                        </p>
                        <div className="rounded-md border border-border p-4">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {callDetail.evaluation.recommendations}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Evaluation tab */}
                {activeTab === 'evaluation' && (
                  <div className="space-y-4">
                    {callDetail.evaluation ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Общая оценка</span>
                          <ScoreBadge score={callDetail.evaluation.score_total} />
                        </div>
                        <Separator />
                        <div className="space-y-3">
                          <ScoreBar
                            label="Приветствие"
                            value={callDetail.evaluation.score_greeting}
                          />
                          <ScoreBar
                            label="Выявление потребностей"
                            value={callDetail.evaluation.score_needs}
                          />
                          <ScoreBar
                            label="Презентация"
                            value={callDetail.evaluation.score_presentation}
                          />
                          <ScoreBar
                            label="Работа с возражениями"
                            value={callDetail.evaluation.score_objections}
                          />
                          <ScoreBar
                            label="Закрытие"
                            value={callDetail.evaluation.score_closing}
                          />
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Оценка недоступна</p>
                    )}
                  </div>
                )}

                {/* Insights tab */}
                {activeTab === 'insights' && (
                  <div className="space-y-3">
                    {callDetail.insight ? (
                      [
                        { label: 'Имя', value: callDetail.insight.extracted_name },
                        { label: 'Интерес к объекту', value: callDetail.insight.extracted_property },
                        { label: 'Бюджет', value: callDetail.insight.extracted_budget },
                        { label: 'Источник', value: callDetail.insight.extracted_source },
                        { label: 'Сроки', value: callDetail.insight.extracted_timeline },
                        { label: 'Возражения', value: callDetail.insight.extracted_concerns },
                        { label: 'Заметки', value: callDetail.insight.extracted_notes },
                      ].map(({ label, value }) =>
                        value ? (
                          <div key={label} className="flex gap-3">
                            <span className="text-xs text-muted-foreground w-36 shrink-0 pt-0.5">
                              {label}
                            </span>
                            <span className="text-sm">{value}</span>
                          </div>
                        ) : null
                      )
                    ) : (
                      <p className="text-sm text-muted-foreground">Инсайты недоступны</p>
                    )}
                  </div>
                )}

                {/* Transcript tab */}
                {activeTab === 'transcript' && (
                  <div>
                    {callDetail.call.transcript ? (
                      <div className="rounded-md border border-border bg-muted/40 p-4">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap font-mono text-xs">
                          {callDetail.call.transcript}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Транскрипт недоступен</p>
                    )}
                  </div>
                )}

              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}

