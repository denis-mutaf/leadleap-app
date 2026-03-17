'use client'

import { useEffect, useState, useMemo } from 'react'
import { format, differenceInDays } from 'date-fns'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { BarChart3, CalendarIcon, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

const TOPMAG_PROJECT_ID = 'fdde44bc-e48e-4a54-aa4a-bfeb3412d334'
const TOPMAG_ACCOUNT_ID = 'act_617010613448516'

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('ru-RU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

const TARGETS = {
  messages: 3720,
  product: 3600,
  catalog: 3600,
} as const

type CampaignType = keyof typeof TARGETS

const TOPMAG_CAMPAIGN_IDS: Record<CampaignType, string[]> = {
  messages: [
    '120211674202600536',
    '120243606770500536',
  ],
  product: [
    '120224419189730536',
    '120243459634660536',
    '120244885345640536',
  ],
  catalog: [
    '120236680301770536',
    '120242148213870536',
    '120244236648470536',
  ],
}

interface CampaignMetrics {
  leads: number
  spend: number
  impressions: number
  clicks: number
  linkClicks: number
  cpl: number
  cpc: number
  ctr: number
  cpm: number
}

type InsightRow = {
  campaign_name: string
  campaign_id: string | null
  date: string
  spend: number
  impressions: number
  clicks: number
  outbound_clicks: number
  results: number
  actions_json: Array<{ action_type: string; value: string }> | null
}

function classifyCampaign(campaignId: string | null): CampaignType | null {
  if (!campaignId) return null
  for (const [type, ids] of Object.entries(TOPMAG_CAMPAIGN_IDS)) {
    if (ids.includes(campaignId)) return type as CampaignType
  }
  return null
}

function extractLeads(
  actionsJson: Array<{ action_type: string; value: string }> | null,
  type: CampaignType
): number {
  if (!actionsJson) return 0
  const targetType =
    type === 'messages'
      ? 'onsite_conversion.messaging_conversation_started_7d'
      : 'onsite_web_lead'
  const action = actionsJson.find((a) => a.action_type === targetType)
  return action ? parseInt(action.value, 10) || 0 : 0
}

const CAMPAIGN_LABELS: Record<CampaignType, string> = {
  messages: 'Сообщения',
  product: 'Продукт',
  catalog: 'Каталог',
}

const CAMPAIGN_COLORS: Record<CampaignType, string> = {
  messages: '#a855f7',
  product: '#22d3ee',
  catalog: '#f59e0b',
}

export function TopmagDashboard() {
  const projectId = TOPMAG_PROJECT_ID
  const accountId = TOPMAG_ACCOUNT_ID

  const [dateFrom, setDateFrom] = useState<Date>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d
  })
  const [dateTo, setDateTo] = useState<Date>(() => new Date())
  const [insights, setInsights] = useState<InsightRow[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const dateFromStr = format(dateFrom, 'yyyy-MM-dd')
  const dateToStr = format(dateTo, 'yyyy-MM-dd')
  const daysInPeriod = differenceInDays(dateTo, dateFrom) + 1

  const periodTargets = useMemo(
    () => ({
      messages: Math.round((TARGETS.messages / 30) * daysInPeriod),
      product: Math.round((TARGETS.product / 30) * daysInPeriod),
      catalog: Math.round((TARGETS.catalog / 30) * daysInPeriod),
    }),
    [daysInPeriod]
  )

  useEffect(() => {
    if (!projectId || !accountId) {
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(
      `/api/meta/insights?projectId=${encodeURIComponent(projectId)}&accountId=${encodeURIComponent(accountId)}&dateFrom=${dateFromStr}&dateTo=${dateToStr}`
    )
      .then((r) => r.json())
      .then((data) => setInsights(data.data ?? []))
      .catch(() => setInsights([]))
      .finally(() => setLoading(false))
  }, [projectId, accountId, dateFromStr, dateToStr])

  const { messagesRows, productRows, catalogRows } = useMemo(() => {
    const messages: InsightRow[] = []
    const product: InsightRow[] = []
    const catalog: InsightRow[] = []
    for (const r of insights) {
      const row: InsightRow = {
        campaign_name: r.campaign_name,
        campaign_id: r.campaign_id ?? null,
        date: r.date,
        spend: Number(r.spend ?? 0),
        impressions: Number(r.impressions ?? 0),
        clicks: Number(r.clicks ?? 0),
        results: Number(r.results ?? 0),
        outbound_clicks: Number(r.outbound_clicks ?? 0),
        actions_json: r.actions_json ?? null,
      }
      const type = classifyCampaign(r.campaign_id ?? null)
      if (type === 'messages') messages.push(row)
      else if (type === 'product') product.push(row)
      else if (type === 'catalog') catalog.push(row)
    }
    return { messagesRows: messages, productRows: product, catalogRows: catalog }
  }, [insights])

  const metricsByType = useMemo((): Record<CampaignType, CampaignMetrics> => {
    const calc = (rows: InsightRow[], type: CampaignType): CampaignMetrics => {
      const leads = rows.reduce((s, r) => s + extractLeads(r.actions_json, type), 0)
      const spend = rows.reduce((s, r) => s + r.spend, 0)
      const impressions = rows.reduce((s, r) => s + r.impressions, 0)
      const clicks = rows.reduce((s, r) => s + r.clicks, 0)
      const linkClicks = rows.reduce((s, r) => s + r.outbound_clicks, 0)
      const effectiveClicks = type === 'messages' ? clicks : linkClicks
      return {
        leads,
        spend,
        impressions,
        clicks,
        linkClicks,
        cpl: leads > 0 ? spend / leads : 0,
        cpc: effectiveClicks > 0 ? spend / effectiveClicks : 0,
        ctr: impressions > 0 ? (effectiveClicks / impressions) * 100 : 0,
        cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
      }
    }
    return {
      messages: calc(messagesRows, 'messages'),
      product: calc(productRows, 'product'),
      catalog: calc(catalogRows, 'catalog'),
    }
  }, [messagesRows, productRows, catalogRows])

  const totalSpend = useMemo(
    () => metricsByType.messages.spend + metricsByType.product.spend + metricsByType.catalog.spend,
    [metricsByType]
  )

  const leadsChartData = useMemo(() => {
    const byDate: Record<string, { date: string; messages: number; product: number; catalog: number }> = {}
    const add = (rows: InsightRow[], key: CampaignType) => {
      rows.forEach((r) => {
        if (!byDate[r.date]) byDate[r.date] = { date: r.date, messages: 0, product: 0, catalog: 0 }
        byDate[r.date][key] += extractLeads(r.actions_json, key)
      })
    }
    add(messagesRows, 'messages')
    add(productRows, 'product')
    add(catalogRows, 'catalog')
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
  }, [messagesRows, productRows, catalogRows])

  const spendChartData = useMemo(() => {
    const byDate: Record<string, { date: string; messages: number; product: number; catalog: number }> = {}
    const add = (rows: InsightRow[], key: CampaignType) => {
      rows.forEach((r) => {
        if (!byDate[r.date]) byDate[r.date] = { date: r.date, messages: 0, product: 0, catalog: 0 }
        byDate[r.date][key] += r.spend
      })
    }
    add(messagesRows, 'messages')
    add(productRows, 'product')
    add(catalogRows, 'catalog')
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
  }, [messagesRows, productRows, catalogRows])

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
      fetch(
        `/api/meta/insights?projectId=${encodeURIComponent(projectId)}&accountId=${encodeURIComponent(accountId)}&dateFrom=${dateFromStr}&dateTo=${dateToStr}`
      )
        .then((r) => r.json())
        .then((d) => setInsights(d.data ?? []))
        .finally(() => setLoading(false))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setSyncing(false)
    }
  }

  const hasData = insights.length > 0

  if (!projectId || !accountId) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="flex items-center gap-2 px-6 h-14 border-b border-border shrink-0">
          <span className="text-sm font-medium">TopMag</span>
        </div>
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center gap-3 text-center py-24">
          <BarChart3 size={40} className="text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Настройте meta_account_id в настройках проекта TopMag</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-6 h-14 border-b border-border shrink-0 flex-wrap">
        <span className="text-sm font-medium mr-2">TopMag</span>
        <Separator orientation="vertical" className="h-5" />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 w-[140px] justify-start font-normal">
              <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              {format(dateFrom, 'dd.MM.yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFrom} onSelect={(d) => d && setDateFrom(d)} initialFocus />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 w-[140px] justify-start font-normal">
              <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              {format(dateTo, 'dd.MM.yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={(d) => d && setDateTo(d)} initialFocus />
          </PopoverContent>
        </Popover>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" className="h-8" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${syncing ? 'animate-spin' : ''}`} />
            Синхронизировать
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {loading && !hasData ? (
          <>
            <Skeleton className="h-24 w-full rounded-lg" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-64 rounded-lg" />
              <Skeleton className="h-64 rounded-lg" />
              <Skeleton className="h-64 rounded-lg" />
            </div>
            <Skeleton className="h-[220px] w-full rounded-lg" />
            <Skeleton className="h-[220px] w-full rounded-lg" />
          </>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center py-24">
            <BarChart3 size={40} className="text-muted-foreground/30" />
            <p className="text-sm font-medium">Нет данных за период</p>
            <p className="text-xs text-muted-foreground">Нажмите «Синхронизировать»</p>
          </div>
        ) : (
          <>
            {/* Section 1 — Total spend */}
            <Card className="p-6">
              <CardContent className="p-0">
                <div className="text-3xl font-bold tabular-nums">${fmt(totalSpend)}</div>
                <CardDescription className="text-sm mt-1">общий расход за период</CardDescription>
              </CardContent>
            </Card>

            {/* Section 2 — Three campaign columns */}
            <div className="grid grid-cols-3 gap-4">
              {(['messages', 'product', 'catalog'] as const).map((type) => {
                const m = metricsByType[type]
                const target = periodTargets[type]
                const pct = target > 0 ? Math.min(100, (m.leads / target) * 100) : 0
                const barColor =
                  pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
                return (
                  <Card key={type}>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-sm font-medium">{CAMPAIGN_LABELS[type]}</CardTitle>
                      <Badge variant="secondary">{m.leads}</Badge>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <div className="text-xs text-muted-foreground">Лиды</div>
                          <div className="font-medium tabular-nums">
                            {m.leads} / {target}
                          </div>
                          <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${barColor}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">CPL</div>
                          <div className="font-medium tabular-nums">
                            {m.leads > 0 ? `$${fmt(m.cpl)}` : '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">CPC</div>
                          <div className="font-medium tabular-nums">
                            {m.linkClicks > 0 ? `$${fmt(m.cpc, 3)}` : '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">CTR</div>
                          <div className="font-medium tabular-nums">{fmt(m.ctr)}%</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">CPM</div>
                          <div className="font-medium tabular-nums">${fmt(m.cpm)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Расход</div>
                          <div className="font-medium tabular-nums">${fmt(m.spend)}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Section 3 — Leads chart */}
              {leadsChartData.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Лиды по дням</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={leadsChartData} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
                          tickFormatter={(v: string) => v.slice(5)}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
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
                        />
                        <Area
                          type="monotone"
                          dataKey="messages"
                          name="Сообщения"
                          stroke={CAMPAIGN_COLORS.messages}
                          fill={CAMPAIGN_COLORS.messages}
                          fillOpacity={0.3}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="product"
                          name="Продукт"
                          stroke={CAMPAIGN_COLORS.product}
                          fill={CAMPAIGN_COLORS.product}
                          fillOpacity={0.3}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="catalog"
                          name="Каталог"
                          stroke={CAMPAIGN_COLORS.catalog}
                          fill={CAMPAIGN_COLORS.catalog}
                          fillOpacity={0.3}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Section 4 — Spend chart */}
              {spendChartData.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Расход по дням</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={spendChartData} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
                        <defs>
                          <linearGradient id="topmagMessages" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CAMPAIGN_COLORS.messages} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={CAMPAIGN_COLORS.messages} stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="topmagProduct" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CAMPAIGN_COLORS.product} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={CAMPAIGN_COLORS.product} stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="topmagCatalog" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CAMPAIGN_COLORS.catalog} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={CAMPAIGN_COLORS.catalog} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
                          tickFormatter={(v: string) => v.slice(5)}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
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
                          type="monotone"
                          dataKey="messages"
                          name="Сообщения"
                          stroke={CAMPAIGN_COLORS.messages}
                          fill="url(#topmagMessages)"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="product"
                          name="Продукт"
                          stroke={CAMPAIGN_COLORS.product}
                          fill="url(#topmagProduct)"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="catalog"
                          name="Каталог"
                          stroke={CAMPAIGN_COLORS.catalog}
                          fill="url(#topmagCatalog)"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
