'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useProjectStore } from '@/store/project-store'
import { useMetaAccountStore } from '@/hooks/use-meta-account'
import type { MetaCampaignInsight } from '@/types/meta'
import type { AdsetAggregateRow } from '@/types/meta'

function CampaignDetailContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const campaignId = params.campaignId as string
  const projectId = useProjectStore((s) => s.activeProject?.id)
  const { selectedAccountId } = useMetaAccountStore()
  const accountId = selectedAccountId ?? ''
  const dateFrom = searchParams.get('dateFrom') ?? ''
  const dateTo = searchParams.get('dateTo') ?? ''
  const query = [dateFrom && `dateFrom=${encodeURIComponent(dateFrom)}`, dateTo && `dateTo=${encodeURIComponent(dateTo)}`].filter(Boolean).join('&')
  const queryStr = query ? `?${query}` : ''

  const [insights, setInsights] = useState<MetaCampaignInsight[]>([])
  const [adsets, setAdsets] = useState<AdsetAggregateRow[]>([])
  const [campaignName, setCampaignName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId || !accountId || !campaignId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const insightParams = new URLSearchParams({ projectId, accountId })
    if (dateFrom) insightParams.set('dateFrom', dateFrom)
    if (dateTo) insightParams.set('dateTo', dateTo)
    insightParams.set('campaignId', campaignId)

    const adsetParams = new URLSearchParams({ projectId, accountId, campaignId, groupBy: 'adset' })
    if (dateFrom) adsetParams.set('dateFrom', dateFrom)
    if (dateTo) adsetParams.set('dateTo', dateTo)

    Promise.all([
      fetch(`/api/meta/insights?${insightParams.toString()}`).then((r) => r.json()),
      fetch(`/api/meta/adsets?${adsetParams.toString()}`).then((r) => r.json()),
    ]).then(([insRes, adsetRes]) => {
      const daily = insRes.data ?? []
      setInsights(daily)
      if (daily.length) setCampaignName(daily[0].campaign_name)
      setAdsets(adsetRes.data ?? [])
    }).finally(() => setLoading(false))
  }, [projectId, accountId, campaignId, dateFrom, dateTo])

  const metrics = {
    spend: insights.reduce((s, r) => s + Number(r.spend ?? 0), 0),
    impressions: insights.reduce((s, r) => s + Number(r.impressions ?? 0), 0),
    clicks: insights.reduce((s, r) => s + Number(r.clicks ?? 0), 0),
    results: insights.reduce((s, r) => s + Number(r.results ?? 0), 0),
    frequency: insights.length ? insights.reduce((s, r) => s + Number(r.frequency ?? 0), 0) / insights.length : 0,
  }
  const ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0
  const cpc = metrics.clicks > 0 ? metrics.spend / metrics.clicks : 0

  const chartData = insights.map((r) => ({ date: r.date, spend: Number(r.spend ?? 0) })).sort((a, b) => a.date.localeCompare(b.date))

  const displayName = campaignName || campaignId

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-6 h-14 border-b border-border shrink-0 flex items-center gap-2 text-sm">
        <Link href="/ads" className="text-muted-foreground hover:text-foreground">Реклама</Link>
        <span className="text-muted-foreground">/</span>
        <Link href={`/ads/campaigns${queryStr}`} className="text-muted-foreground hover:text-foreground">Кампании</Link>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium truncate">{displayName}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-64 w-full rounded-lg mb-6" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
              <Card><CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">Расход</CardTitle></CardHeader><CardContent className="px-3 pb-3 font-semibold">{metrics.spend.toFixed(2)}</CardContent></Card>
              <Card><CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">Показы</CardTitle></CardHeader><CardContent className="px-3 pb-3 font-semibold">{metrics.impressions.toLocaleString()}</CardContent></Card>
              <Card><CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">Клики</CardTitle></CardHeader><CardContent className="px-3 pb-3 font-semibold">{metrics.clicks.toLocaleString()}</CardContent></Card>
              <Card><CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">Результаты</CardTitle></CardHeader><CardContent className="px-3 pb-3 font-semibold">{metrics.results.toLocaleString()}</CardContent></Card>
              <Card><CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">CTR</CardTitle></CardHeader><CardContent className="px-3 pb-3 font-semibold">{ctr.toFixed(2)}%</CardContent></Card>
              <Card><CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">CPC</CardTitle></CardHeader><CardContent className="px-3 pb-3 font-semibold">{cpc.toFixed(4)}</CardContent></Card>
              <Card><CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">Частота</CardTitle></CardHeader><CardContent className="px-3 pb-3 font-semibold">{metrics.frequency.toFixed(2)}</CardContent></Card>
            </div>

            {chartData.length > 0 && (
              <Card className="mb-6">
                <CardHeader><CardTitle className="text-sm">Расход по дням</CardTitle></CardHeader>
                <CardContent>
                  <ChartContainer config={{ spend: { label: 'Расход', color: 'hsl(var(--primary))' } }} className="h-64">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="spend" stroke="var(--color-spend)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle className="text-sm">Адсеты</CardTitle></CardHeader>
              <CardContent>
                {adsets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Нет данных по адсетам</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 font-medium">Адсет</th>
                          <th className="text-right py-2 font-medium">Расход</th>
                          <th className="text-right py-2 font-medium">Показы</th>
                          <th className="text-right py-2 font-medium">Клики</th>
                          <th className="text-right py-2 font-medium">Результаты</th>
                          <th className="text-right py-2 font-medium">CTR</th>
                          <th className="text-right py-2 font-medium">CPC</th>
                          <th className="text-right py-2 font-medium">Частота</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adsets.map((a) => {
                          const adsetId = a.adset_id ?? a.adset_name
                          const freqClass = a.avg_frequency > 3 ? 'text-red-500 font-medium' : ''
                          return (
                            <tr key={a.adset_name} className="border-b border-border/50 hover:bg-muted/50">
                              <td className="py-2">
                                <Link
                                  href={`/ads/campaigns/${encodeURIComponent(campaignId)}/${encodeURIComponent(adsetId)}${queryStr}`}
                                  className="text-primary hover:underline"
                                >
                                  {a.adset_name}
                                </Link>
                              </td>
                              <td className="text-right py-2">{a.total_spend.toFixed(2)}</td>
                              <td className="text-right py-2">{a.total_impressions.toLocaleString()}</td>
                              <td className="text-right py-2">{a.total_clicks.toLocaleString()}</td>
                              <td className="text-right py-2">{a.total_results.toLocaleString()}</td>
                              <td className="text-right py-2">{a.avg_ctr.toFixed(2)}%</td>
                              <td className="text-right py-2">{a.avg_cpc.toFixed(4)}</td>
                              <td className={`text-right py-2 ${freqClass}`}>{a.avg_frequency.toFixed(2)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

export default function CampaignDetailPage() {
  return (
    <Suspense fallback={<div className="h-14 border-b border-border flex items-center px-6"><div className="h-4 w-48 animate-pulse rounded bg-muted" /></div>}>
      <CampaignDetailContent />
    </Suspense>
  )
}
