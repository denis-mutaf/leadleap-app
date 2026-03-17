'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { BarChart3, CalendarIcon, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useProjectStore } from '@/store/project-store'
import { useMetaAccountStore } from '@/hooks/use-meta-account'
import type { MetaAdAccount, MetaCampaignInsight, CampaignAggregateRow } from '@/types/meta'

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('ru-RU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function getDefaultRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 30)
  return { dateFrom: format(from, 'yyyy-MM-dd'), dateTo: format(to, 'yyyy-MM-dd') }
}

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  trend?: 'up' | 'down' | 'neutral'
}

function KpiCard({ label, value, sub, trend = 'neutral' }: KpiCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor =
    trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
  return (
    <Card className="p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <TrendIcon className={`h-3.5 w-3.5 ${trendColor}`} />
      </div>
      <span className="text-2xl font-bold tabular-nums leading-tight">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </Card>
  )
}

function AdsDashboardContent() {
  const searchParams = useSearchParams()
  const projectId = useProjectStore((s) => s.activeProject?.id)
  const { selectedAccountId, setSelectedAccountId } = useMetaAccountStore()
  const [accounts, setAccounts] = useState<MetaAdAccount[]>([])
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState<Date | undefined>(() => {
    const p = searchParams.get('dateFrom')
    return p ? new Date(p + 'T00:00:00') : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  })
  const [dateTo, setDateTo] = useState<Date | undefined>(() => {
    const p = searchParams.get('dateTo')
    return p ? new Date(p + 'T00:00:00') : new Date()
  })
  const [insights, setInsights] = useState<MetaCampaignInsight[]>([])
  const [campaignsAgg, setCampaignsAgg] = useState<CampaignAggregateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncingAccounts, setSyncingAccounts] = useState(false)

  const accountId = selectedAccountId ?? accounts[0]?.account_id ?? null
  const dateFromStr = dateFrom ? format(dateFrom, 'yyyy-MM-dd') : getDefaultRange().dateFrom
  const dateToStr = dateTo ? format(dateTo, 'yyyy-MM-dd') : getDefaultRange().dateTo
  const query = `?dateFrom=${encodeURIComponent(dateFromStr)}&dateTo=${encodeURIComponent(dateToStr)}`

  useEffect(() => {
    if (!projectId) {
      setAccountsLoading(false)
      return
    }
    fetch(`/api/meta/accounts?projectId=${encodeURIComponent(projectId)}`)
      .then((r) => r.json())
      .then((data) => {
        const list: MetaAdAccount[] = data.data ?? []
        setAccounts(list)
        if (!selectedAccountId && list.length) setSelectedAccountId(list[0].account_id)
        setAccountsLoading(false)
      })
      .catch(() => setAccountsLoading(false))
  }, [projectId, selectedAccountId, setSelectedAccountId])

  useEffect(() => {
    if (!projectId || !accountId) {
      setLoading(false)
      return
    }
    const from = searchParams.get('dateFrom') || dateFromStr
    const to = searchParams.get('dateTo') || dateToStr
    setLoading(true)
    Promise.all([
      fetch(
        `/api/meta/insights?projectId=${encodeURIComponent(projectId)}&accountId=${encodeURIComponent(accountId)}&dateFrom=${from}&dateTo=${to}`
      ).then((r) => r.json()),
      fetch(
        `/api/meta/insights?projectId=${encodeURIComponent(projectId)}&accountId=${encodeURIComponent(accountId)}&dateFrom=${from}&dateTo=${to}&groupBy=campaign`
      ).then((r) => r.json()),
    ])
      .then(([dailyRes, aggRes]) => {
        setInsights(dailyRes.data ?? [])
        setCampaignsAgg(aggRes.data ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [projectId, accountId, dateFromStr, dateToStr, searchParams])

  const metrics = useMemo(() => {
    const spend = insights.reduce((s, r) => s + Number(r.spend ?? 0), 0)
    const impressions = insights.reduce((s, r) => s + Number(r.impressions ?? 0), 0)
    const clicks = insights.reduce((s, r) => s + Number(r.clicks ?? 0), 0)
    const results = insights.reduce((s, r) => s + Number(r.results ?? 0), 0)
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
    const cpc = clicks > 0 ? spend / clicks : 0
    const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0
    const cpp = results > 0 ? spend / results : 0
    return { spend, impressions, clicks, results, ctr, cpc, cpm, cpp }
  }, [insights])

  const chartData = useMemo(() => {
    const byDate: Record<
      string,
      { date: string; spend: number; ctr: number; cpc: number; clicks: number }
    > = {}
    for (const r of insights) {
      const d = r.date
      if (!byDate[d]) byDate[d] = { date: d, spend: 0, ctr: 0, cpc: 0, clicks: 0 }
      byDate[d].spend += Number(r.spend ?? 0)
      byDate[d].clicks += Number(r.clicks ?? 0)
    }
    const rows = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
    return rows.map((r) => {
      const imp = insights
        .filter((i) => i.date === r.date)
        .reduce((s, i) => s + Number(i.impressions ?? 0), 0)
      return {
        ...r,
        ctr: imp > 0 ? parseFloat(((r.clicks / imp) * 100).toFixed(2)) : 0,
        cpc: r.clicks > 0 ? parseFloat((r.spend / r.clicks).toFixed(4)) : 0,
        spend: parseFloat(r.spend.toFixed(2)),
      }
    })
  }, [insights])

  const topCampaigns = useMemo(
    () => [...campaignsAgg].sort((a, b) => b.total_spend - a.total_spend).slice(0, 10),
    [campaignsAgg]
  )

  async function handleSync() {
    if (!projectId || !accountId) return
    setSyncing(true)
    try {
      const res = await fetch('/api/meta/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, accountId, dateFrom: dateFromStr, dateTo: dateToStr }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Ошибка синхронизации')
      toast.success(`Синхронизировано: ${data.rows_synced ?? 0} записей`)
      setLoading(true)
      Promise.all([
        fetch(
          `/api/meta/insights?projectId=${encodeURIComponent(projectId)}&accountId=${encodeURIComponent(accountId)}&dateFrom=${dateFromStr}&dateTo=${dateToStr}`
        ).then((r) => r.json()),
        fetch(
          `/api/meta/insights?projectId=${encodeURIComponent(projectId)}&accountId=${encodeURIComponent(accountId)}&dateFrom=${dateFromStr}&dateTo=${dateToStr}&groupBy=campaign`
        ).then((r) => r.json()),
      ])
        .then(([d, a]) => {
          setInsights(d.data ?? [])
          setCampaignsAgg(a.data ?? [])
        })
        .finally(() => setLoading(false))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setSyncing(false)
    }
  }

  async function handleSyncAccounts() {
    if (!projectId) return
    setSyncingAccounts(true)
    try {
      const res = await fetch('/api/meta/sync-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Ошибка')
      toast.success(`Аккаунтов: ${data.accounts_synced ?? 0}`)
      const r = await fetch(`/api/meta/accounts?projectId=${encodeURIComponent(projectId)}`)
      const d = await r.json()
      const list: MetaAdAccount[] = d.data ?? []
      setAccounts(list)
      if (!selectedAccountId && list.length) setSelectedAccountId(list[0].account_id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setSyncingAccounts(false)
    }
  }

  const hasData = insights.length > 0 || campaignsAgg.length > 0

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Тулбар */}
      <div className="flex items-center gap-2 px-6 h-14 border-b border-border shrink-0 flex-wrap">
        <span className="text-sm font-medium mr-2">Реклама</span>
        <Separator orientation="vertical" className="h-5" />
        <Select
          value={accountId ?? ''}
          onValueChange={(v) => setSelectedAccountId(v || null)}
          disabled={accountsLoading}
        >
          <SelectTrigger className="w-[200px] h-8 text-sm">
            <SelectValue placeholder="Аккаунт" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.account_id}>
                {a.account_name || a.account_id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 w-[140px] justify-start font-normal">
              <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              {dateFrom ? format(dateFrom, 'dd.MM.yyyy') : 'От'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 w-[140px] justify-start font-normal">
              <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              {dateTo ? format(dateTo, 'dd.MM.yyyy') : 'До'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
          </PopoverContent>
        </Popover>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={handleSyncAccounts}
            disabled={!projectId || syncingAccounts}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${syncingAccounts ? 'animate-spin' : ''}`} />
            Аккаунты
          </Button>
          <Button
            size="sm"
            className="h-8"
            onClick={handleSync}
            disabled={!projectId || !accountId || syncing}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${syncing ? 'animate-spin' : ''}`} />
            Синхронизировать
          </Button>
        </div>
      </div>

      {/* Контент */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {!projectId || !accountId ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center py-24">
            <BarChart3 size={40} className="text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Выберите проект и рекламный аккаунт</p>
          </div>
        ) : loading && !hasData ? (
          <>
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-[88px] rounded-lg" />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-[220px] rounded-lg" />
              <Skeleton className="h-[220px] rounded-lg" />
            </div>
            <Skeleton className="h-[280px] rounded-lg" />
          </>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center py-24">
            <BarChart3 size={40} className="text-muted-foreground/30" />
            <p className="text-sm font-medium">Нет данных за период</p>
            <p className="text-xs text-muted-foreground">Нажмите «Синхронизировать»</p>
          </div>
        ) : (
          <>
            {/* KPI */}
            <div className="grid grid-cols-4 gap-3">
              <KpiCard label="Расход" value={`$${fmt(metrics.spend)}`} sub="потрачено за период" />
              <KpiCard
                label="Показы"
                value={metrics.impressions.toLocaleString('ru-RU')}
                sub="всего показов"
              />
              <KpiCard label="Клики" value={metrics.clicks.toLocaleString('ru-RU')} sub="переходов" />
              <KpiCard
                label="Результаты"
                value={metrics.results.toLocaleString('ru-RU')}
                sub="целевых действий"
              />
              <KpiCard
                label="CTR"
                value={`${fmt(metrics.ctr)}%`}
                sub="кликабельность"
                trend={metrics.ctr > 1 ? 'up' : 'down'}
              />
              <KpiCard
                label="CPC"
                value={`$${fmt(metrics.cpc, 3)}`}
                sub="цена за клик"
                trend={metrics.cpc < 1 ? 'up' : 'down'}
              />
              <KpiCard label="CPM" value={`$${fmt(metrics.cpm)}`} sub="цена за 1000 показов" />
              <KpiCard
                label="Цена за результат"
                value={metrics.cpp > 0 ? `$${fmt(metrics.cpp)}` : '—'}
                sub={metrics.results > 0 ? 'стоимость конверсии' : 'нет конверсий'}
                trend={metrics.cpp > 0 && metrics.cpp < 10 ? 'up' : 'neutral'}
              />
            </div>

            {/* Графики */}
            {chartData.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Расход по дням</CardTitle>
                    <CardDescription className="text-xs">$ / день</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={chartData} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradSpend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                          tickFormatter={(v: string) => v.slice(5)}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                          tickFormatter={(v: number) => `$${v}`}
                          width={36}
                        />
                        <Tooltip
                          contentStyle={{
                            background: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                          formatter={(v) => [typeof v === 'number' ? `$${v.toFixed(2)}` : '—', 'Расход']}
                        />
                        <Area
                          dataKey="spend"
                          type="monotone"
                          stroke="#a855f7"
                          strokeWidth={2}
                          fill="url(#gradSpend)"
                          dot={false}
                          activeDot={{ r: 4, fill: '#a855f7', strokeWidth: 0 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">CTR по дням</CardTitle>
                    <CardDescription className="text-xs">% / день</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={chartData} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                          tickFormatter={(v: string) => v.slice(5)}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                          tickFormatter={(v: number) => `${v}%`}
                          width={36}
                        />
                        <Tooltip
                          contentStyle={{
                            background: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                          formatter={(v) => [typeof v === 'number' ? `${v.toFixed(2)}%` : '—', 'CTR']}
                        />
                        <Line
                          dataKey="ctr"
                          type="monotone"
                          stroke="#22d3ee"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, fill: '#22d3ee', strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Таблица кампаний */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium">Кампании</CardTitle>
                    <CardDescription className="text-xs">
                      Топ {topCampaigns.length} по расходам за период
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                    <Link href={`/ads/campaigns${query}`}>Все кампании →</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-xs">Кампания</TableHead>
                      <TableHead className="text-xs text-right">Расход</TableHead>
                      <TableHead className="text-xs text-right">Показы</TableHead>
                      <TableHead className="text-xs text-right">Клики</TableHead>
                      <TableHead className="text-xs text-right">CTR</TableHead>
                      <TableHead className="text-xs text-right">CPC</TableHead>
                      <TableHead className="text-xs text-right">Результаты</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topCampaigns.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center text-sm text-muted-foreground py-8"
                        >
                          Нет данных
                        </TableCell>
                      </TableRow>
                    ) : (
                      topCampaigns.map((c) => {
                        const ctr =
                          c.total_impressions > 0
                            ? ((c.total_clicks / c.total_impressions) * 100).toFixed(2)
                            : '0.00'
                        const cpc =
                          c.total_clicks > 0
                            ? (c.total_spend / c.total_clicks).toFixed(3)
                            : '—'
                        return (
                          <TableRow
                            key={c.campaign_name}
                            className="hover:bg-muted/40 border-border/50"
                          >
                            <TableCell className="py-2.5">
                              <Link
                                href={`/ads/campaigns/${encodeURIComponent(c.campaign_id ?? c.campaign_name)}${query}`}
                                className="text-primary hover:underline text-sm truncate max-w-[260px] block"
                              >
                                {c.campaign_name}
                              </Link>
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              ${c.total_spend.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              {c.total_impressions.toLocaleString('ru-RU')}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              {c.total_clicks.toLocaleString('ru-RU')}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              {ctr}%
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              {cpc}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              {c.total_results.toLocaleString('ru-RU')}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

export default function AdsDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        </div>
      }
    >
      <AdsDashboardContent />
    </Suspense>
  )
}
