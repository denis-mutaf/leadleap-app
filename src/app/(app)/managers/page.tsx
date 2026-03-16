'use client'

import { useEffect, useState } from 'react'
import { Users, TrendingUp, Phone, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useProjectStore } from '@/store/project-store'
import { ManagerStats } from '@/types'

function ScoreRing({ score, max = 50 }: { score: number; max?: number }) {
  const pct = Math.round((score / max) * 100)
  const color =
    pct >= 80 ? 'text-green-500'
    : pct >= 50 ? 'text-yellow-500'
    : 'text-red-500'

  return (
    <div className={`text-2xl font-bold ${color}`}>
      {score}
      <span className="text-sm font-normal text-muted-foreground">/{max}</span>
    </div>
  )
}

function MiniBar({ value, max = 10, label }: { value: number; max?: number; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground truncate">{label}</span>
        <span className="font-medium shrink-0 ml-2">{value}</span>
      </div>
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
    </div>
  )
}

export default function ManagersPage() {
  const { activeProject } = useProjectStore()
  const [stats, setStats] = useState<ManagerStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (activeProject) void loadStats()
  }, [activeProject])

  async function loadStats() {
    if (!activeProject) return
    setLoading(true)
    const res = await fetch(`/api/managers/stats?projectId=${activeProject.id}`)
    if (!res.ok) {
      setLoading(false)
      return
    }
    const data = await res.json()
    if (Array.isArray(data)) setStats(data)
    setLoading(false)
  }

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
        <Users size={32} className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Выберите проект в боковой панели</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* Header */}
      <div className="flex items-center justify-between px-6 h-14 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-medium">Менеджеры</h1>
          {!loading && (
            <span className="text-xs text-muted-foreground">
              {stats.length}{' '}
              {stats.length === 1
                ? 'менеджер'
                : stats.length < 5
                ? 'менеджера'
                : 'менеджеров'}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-56 w-full rounded-lg" />
            ))}
          </div>
        ) : stats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <Users size={40} className="text-muted-foreground/40" />
            <div>
              <p className="text-sm font-medium">Нет менеджеров</p>
              <p className="text-xs text-muted-foreground mt-1">
                Менеджеры появятся после обработки первых звонков
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {stats.map((s, index) => (
              <Card key={s.manager.id} className="relative overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                        {s.manager.name
                          .split(' ')
                          .map((w) => w[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div>
                        <CardTitle className="text-sm">{s.manager.name}</CardTitle>
                        {index === 0 && (
                          <Badge variant="secondary" className="text-xs mt-1 gap-1">
                            <TrendingUp size={9} />
                            Лучший
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ScoreRing score={s.avg_score} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Phone size={11} />
                      {s.total_calls} звонков
                    </span>
                    <span className="flex items-center gap-1">
                      <Star size={11} />
                      Ср. {s.avg_score}/50
                    </span>
                  </div>
                  <div className="space-y-2">
                    <MiniBar label="Приветствие" value={s.avg_score_greeting} />
                    <MiniBar label="Потребности" value={s.avg_score_needs} />
                    <MiniBar label="Презентация" value={s.avg_score_presentation} />
                    <MiniBar label="Возражения" value={s.avg_score_objections} />
                    <MiniBar label="Закрытие" value={s.avg_score_closing} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

