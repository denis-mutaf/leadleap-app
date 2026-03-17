'use client'

import { useEffect, useState, useMemo, Fragment, Suspense } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useProjectStore } from '@/store/project-store'
import { useMetaAccountStore } from '@/hooks/use-meta-account'
import type { MetaAdsetInsight } from '@/types/meta'
import type { MetaAdInsight } from '@/types/meta'
import type { MetaDemographicInsight, MetaPlacementInsight, MetaHourlyInsight } from '@/types/meta'

function AdsetDetailContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const campaignId = params.campaignId as string
  const adsetId = params.adsetId as string
  const projectId = useProjectStore((s) => s.activeProject?.id)
  const { selectedAccountId } = useMetaAccountStore()
  const accountId = selectedAccountId ?? ''
  const dateFrom = searchParams.get('dateFrom') ?? ''
  const dateTo = searchParams.get('dateTo') ?? ''
  const query = [dateFrom && `dateFrom=${encodeURIComponent(dateFrom)}`, dateTo && `dateTo=${encodeURIComponent(dateTo)}`].filter(Boolean).join('&')
  const queryStr = query ? `?${query}` : ''

  const [adsetRows, setAdsetRows] = useState<MetaAdsetInsight[]>([])
  const [adRows, setAdRows] = useState<MetaAdInsight[]>([])
  const [demographics, setDemographics] = useState<MetaDemographicInsight[]>([])
  const [placements, setPlacements] = useState<MetaPlacementInsight[]>([])
  const [hourly, setHourly] = useState<MetaHourlyInsight[]>([])
  const [tabDemographicsLoaded, setTabDemographicsLoaded] = useState(false)
  const [tabPlacementsLoaded, setTabPlacementsLoaded] = useState(false)
  const [tabHourlyLoaded, setTabHourlyLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expandedAdId, setExpandedAdId] = useState<string | null>(null)

  const campaignName = adsetRows[0]?.campaign_name ?? campaignId
  const adsetName = adsetRows[0]?.adset_name ?? adsetId

  useEffect(() => {
    if (!projectId || !accountId || !campaignId || !adsetId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const adsetParams = new URLSearchParams({ projectId, accountId, campaignId })
    if (dateFrom) adsetParams.set('dateFrom', dateFrom)
    if (dateTo) adsetParams.set('dateTo', dateTo)
    // Adset filter: API uses campaignId for campaign, we need adset filter - API has campaignId and returns adset rows, we filter client-side by adset_name or adset_id
    fetch(`/api/meta/adsets?${adsetParams.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        const rows = (data.data ?? []) as MetaAdsetInsight[]
        const filtered = rows.filter(
          (r) => String(r.adset_id ?? r.adset_name) === adsetId || r.adset_name === adsetId
        )
        setAdsetRows(filtered)
      })
      .catch(() => setAdsetRows([]))

    const adParams = new URLSearchParams({ projectId, accountId, adsetId })
    if (dateFrom) adParams.set('dateFrom', dateFrom)
    if (dateTo) adParams.set('dateTo', dateTo)
    fetch(`/api/meta/ad-insights?${adParams.toString()}`)
      .then((r) => r.json())
      .then((data) => setAdRows(data.data ?? []))
      .catch(() => setAdRows([]))
      .finally(() => setLoading(false))
  }, [projectId, accountId, campaignId, adsetId, dateFrom, dateTo])

  const metrics = useMemo(() => {
    const spend = adsetRows.reduce((s, r) => s + Number(r.spend ?? 0), 0)
    const impressions = adsetRows.reduce((s, r) => s + Number(r.impressions ?? 0), 0)
    const clicks = adsetRows.reduce((s, r) => s + Number(r.clicks ?? 0), 0)
    const results = adsetRows.reduce((s, r) => s + Number(r.results ?? 0), 0)
    const freqSum = adsetRows.reduce((s, r) => s + Number(r.frequency ?? 0), 0)
    const days = adsetRows.length
    return {
      spend,
      impressions,
      clicks,
      results,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpc: clicks > 0 ? spend / clicks : 0,
      frequency: days > 0 ? freqSum / days : 0,
    }
  }, [adsetRows])

  const spendChartData = useMemo(() => {
    const byDate: Record<string, number> = {}
    adsetRows.forEach((r) => {
      byDate[r.date] = (byDate[r.date] ?? 0) + Number(r.spend ?? 0)
    })
    return Object.entries(byDate)
      .map(([date, spend]) => ({ date, spend }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [adsetRows])

  const freqChartData = useMemo(() => {
    const byDate: Record<string, number> = {}
    adsetRows.forEach((r) => {
      const d = r.date
      if (!byDate[d]) byDate[d] = 0
      byDate[d] += Number(r.frequency ?? 0)
    })
    const count: Record<string, number> = {}
    adsetRows.forEach((r) => {
      count[r.date] = (count[r.date] ?? 0) + 1
    })
    return Object.keys(byDate)
      .sort()
      .map((date) => ({ date, frequency: count[date] ? byDate[date] / count[date] : 0 }))
  }, [adsetRows])

  const videoFunnelData = useMemo(() => {
    const p25 = adsetRows.reduce((s, r) => s + Number(r.video_p25_watched ?? 0), 0)
    const p50 = adsetRows.reduce((s, r) => s + Number(r.video_p50_watched ?? 0), 0)
    const p75 = adsetRows.reduce((s, r) => s + Number(r.video_p75_watched ?? 0), 0)
    const p100 = adsetRows.reduce((s, r) => s + Number(r.video_p100_watched ?? 0), 0)
    const thru = adsetRows.reduce((s, r) => s + Number(r.video_thruplay ?? 0), 0)
    if (p25 === 0 && p50 === 0 && p75 === 0 && p100 === 0 && thru === 0) return null
    return [
      { name: '25%', value: p25 },
      { name: '50%', value: p50 },
      { name: '75%', value: p75 },
      { name: '100%', value: p100 },
      { name: 'ThruPlay', value: thru },
    ]
  }, [adsetRows])

  const adsAggregated = useMemo(() => {
    const byAd: Record<string, { ad_id: string; ad_name: string; spend: number; impressions: number; clicks: number; results: number; rows: MetaAdInsight[] }> = {}
    adRows.forEach((r) => {
      const key = r.ad_id
      if (!byAd[key]) byAd[key] = { ad_id: r.ad_id, ad_name: r.ad_name, spend: 0, impressions: 0, clicks: 0, results: 0, rows: [] }
      byAd[key].spend += Number(r.spend ?? 0)
      byAd[key].impressions += Number(r.impressions ?? 0)
      byAd[key].clicks += Number(r.clicks ?? 0)
      byAd[key].results += Number(r.results ?? 0)
      byAd[key].rows.push(r)
    })
    return Object.values(byAd)
  }, [adRows])

  function loadDemographics() {
    if (tabDemographicsLoaded || !projectId) return
    setTabDemographicsLoaded(true)
    const p = new URLSearchParams({ projectId, accountId })
    if (dateFrom) p.set('dateFrom', dateFrom)
    if (dateTo) p.set('dateTo', dateTo)
    p.set('campaignName', campaignName)
    fetch(`/api/meta/demographics?${p.toString()}`)
      .then((r) => r.json())
      .then((data) => setDemographics(data.data ?? []))
  }

  function loadPlacements() {
    if (tabPlacementsLoaded || !projectId) return
    setTabPlacementsLoaded(true)
    const p = new URLSearchParams({ projectId, accountId })
    if (dateFrom) p.set('dateFrom', dateFrom)
    if (dateTo) p.set('dateTo', dateTo)
    p.set('campaignName', campaignName)
    fetch(`/api/meta/placements?${p.toString()}`)
      .then((r) => r.json())
      .then((data) => setPlacements(data.data ?? []))
  }

  function loadHourly() {
    if (tabHourlyLoaded || !projectId) return
    setTabHourlyLoaded(true)
    const p = new URLSearchParams({ projectId, accountId })
    if (dateFrom) p.set('dateFrom', dateFrom)
    if (dateTo) p.set('dateTo', dateTo)
    p.set('campaignName', campaignName)
    fetch(`/api/meta/hourly?${p.toString()}`)
      .then((r) => r.json())
      .then((data) => setHourly(data.data ?? []))
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-6 h-14 border-b border-border shrink-0 flex items-center gap-2 text-sm">
        <Link href="/ads" className="text-muted-foreground hover:text-foreground">Реклама</Link>
        <span className="text-muted-foreground">/</span>
        <Link href={`/ads/campaigns${queryStr}`} className="text-muted-foreground hover:text-foreground">Кампании</Link>
        <span className="text-muted-foreground">/</span>
        <Link href={`/ads/campaigns/${encodeURIComponent(campaignId)}${queryStr}`} className="text-muted-foreground hover:text-foreground">{campaignName}</Link>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium truncate">{adsetName}</span>
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
            <Skeleton className="h-64 w-full rounded-lg mb-6" />
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
              <Card><CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">Расход</CardTitle></CardHeader><CardContent className="px-3 pb-3 font-semibold">{metrics.spend.toFixed(2)}</CardContent></Card>
              <Card><CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">Показы</CardTitle></CardHeader><CardContent className="px-3 pb-3 font-semibold">{metrics.impressions.toLocaleString()}</CardContent></Card>
              <Card><CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">Клики</CardTitle></CardHeader><CardContent className="px-3 pb-3 font-semibold">{metrics.clicks.toLocaleString()}</CardContent></Card>
              <Card><CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">Результаты</CardTitle></CardHeader><CardContent className="px-3 pb-3 font-semibold">{metrics.results.toLocaleString()}</CardContent></Card>
              <Card><CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">CTR</CardTitle></CardHeader><CardContent className="px-3 pb-3 font-semibold">{metrics.ctr.toFixed(2)}%</CardContent></Card>
              <Card><CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">CPC</CardTitle></CardHeader><CardContent className="px-3 pb-3 font-semibold">{metrics.cpc.toFixed(4)}</CardContent></Card>
              <Card><CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">Частота</CardTitle></CardHeader><CardContent className="px-3 pb-3 font-semibold">{metrics.frequency.toFixed(2)}</CardContent></Card>
            </div>

            {spendChartData.length > 0 && (
              <Card className="mb-6">
                <CardHeader><CardTitle className="text-sm">Расход по дням</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={spendChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip />
                        <Line type="monotone" dataKey="spend" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {freqChartData.length > 0 && (
              <Card className="mb-6">
                <CardHeader><CardTitle className="text-sm">Частота по дням</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={freqChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip />
                        <ReferenceLine y={3} stroke="#ef4444" label="Выгорание" />
                        <Line type="monotone" dataKey="frequency" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {videoFunnelData && (
              <Card className="mb-6">
                <CardHeader><CardTitle className="text-sm">Воронка просмотров</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={videoFunnelData} layout="vertical" margin={{ left: 60 }}>
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={60} />
                        <Tooltip />
                        <Bar dataKey="value" radius={0} fill="hsl(var(--primary))">
                          {videoFunnelData.map((_, i) => (
                            <Cell key={i} fill={`hsl(var(--primary))`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            <Tabs className="mb-6" onValueChange={(v) => { if (v === 'demographics') loadDemographics(); if (v === 'placements') loadPlacements(); if (v === 'hourly') loadHourly(); }}>
              <Card>
                <CardHeader>
                  <TabsList>
                    <TabsTrigger value="demographics">Демография</TabsTrigger>
                    <TabsTrigger value="placements">Плейсменты</TabsTrigger>
                    <TabsTrigger value="hourly">По часам</TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent>
                  <TabsContent value="demographics">
                    {!tabDemographicsLoaded ? <p className="text-sm text-muted-foreground">Переключитесь на вкладку для загрузки</p> : (
                      <div className="overflow-x-auto text-sm">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-2 font-medium">Возраст</th>
                              <th className="text-left py-2 font-medium">Пол</th>
                              <th className="text-right py-2 font-medium">Расход</th>
                              <th className="text-right py-2 font-medium">Показы</th>
                              <th className="text-right py-2 font-medium">Клики</th>
                            </tr>
                          </thead>
                          <tbody>
                            {demographics.map((d, i) => (
                              <tr key={i} className="border-b border-border/50">
                                <td className="py-2">{d.age ?? '—'}</td>
                                <td className="py-2">{d.gender ?? '—'}</td>
                                <td className="text-right py-2">{d.spend.toFixed(2)}</td>
                                <td className="text-right py-2">{d.impressions.toLocaleString()}</td>
                                <td className="text-right py-2">{d.clicks.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {demographics.length === 0 && <p className="text-muted-foreground py-4">Нет данных</p>}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="placements">
                    {!tabPlacementsLoaded ? <p className="text-sm text-muted-foreground">Переключитесь на вкладку для загрузки</p> : (
                      <div className="overflow-x-auto text-sm">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-2 font-medium">Платформа</th>
                              <th className="text-left py-2 font-medium">Позиция</th>
                              <th className="text-right py-2 font-medium">Расход</th>
                              <th className="text-right py-2 font-medium">Показы</th>
                            </tr>
                          </thead>
                          <tbody>
                            {placements.map((p, i) => (
                              <tr key={i} className="border-b border-border/50">
                                <td className="py-2">{p.publisher_platform ?? '—'}</td>
                                <td className="py-2">{p.platform_position ?? '—'}</td>
                                <td className="text-right py-2">{p.spend.toFixed(2)}</td>
                                <td className="text-right py-2">{p.impressions.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {placements.length === 0 && <p className="text-muted-foreground py-4">Нет данных</p>}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="hourly">
                    {!tabHourlyLoaded ? <p className="text-sm text-muted-foreground">Переключитесь на вкладку для загрузки</p> : (
                      <div className="overflow-x-auto text-sm">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-2 font-medium">Час</th>
                              <th className="text-right py-2 font-medium">Расход</th>
                              <th className="text-right py-2 font-medium">Показы</th>
                              <th className="text-right py-2 font-medium">Клики</th>
                            </tr>
                          </thead>
                          <tbody>
                            {hourly.map((h, i) => (
                              <tr key={i} className="border-b border-border/50">
                                <td className="py-2">{h.hour}:00</td>
                                <td className="text-right py-2">{h.spend.toFixed(2)}</td>
                                <td className="text-right py-2">{h.impressions.toLocaleString()}</td>
                                <td className="text-right py-2">{h.clicks.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {hourly.length === 0 && <p className="text-muted-foreground py-4">Нет данных</p>}
                      </div>
                    )}
                  </TabsContent>
                </CardContent>
              </Card>
            </Tabs>

            <Card>
              <CardHeader><CardTitle className="text-sm">Объявления</CardTitle></CardHeader>
              <CardContent>
                {adsAggregated.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Нет данных по объявлениям</p>
                ) : (
                  <div className="overflow-x-auto text-sm">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 font-medium">Объявление</th>
                          <th className="text-right py-2 font-medium">Расход</th>
                          <th className="text-right py-2 font-medium">Показы</th>
                          <th className="text-right py-2 font-medium">Клики</th>
                          <th className="text-right py-2 font-medium">Результаты</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adsAggregated.map((ad) => (
                          <Fragment key={ad.ad_id}>
                            <tr
                              key={ad.ad_id}
                              className="border-b border-border/50 hover:bg-muted/50 cursor-pointer"
                              onClick={() => setExpandedAdId(expandedAdId === ad.ad_id ? null : ad.ad_id)}
                            >
                              <td className="py-2 font-medium">{ad.ad_name}</td>
                              <td className="text-right py-2">{ad.spend.toFixed(2)}</td>
                              <td className="text-right py-2">{ad.impressions.toLocaleString()}</td>
                              <td className="text-right py-2">{ad.clicks.toLocaleString()}</td>
                              <td className="text-right py-2">{ad.results.toLocaleString()}</td>
                            </tr>
                            {expandedAdId === ad.ad_id && (
                              <tr key={`${ad.ad_id}-detail`} className="bg-muted/30">
                                <td colSpan={5} className="p-4">
                                  <div className="overflow-x-auto text-xs">
                                    <table className="w-full">
                                      <thead>
                                        <tr className="border-b border-border">
                                          <th className="text-left py-2 font-medium">Дата</th>
                                          <th className="text-right py-2 font-medium">Расход</th>
                                          <th className="text-right py-2 font-medium">Показы</th>
                                          <th className="text-right py-2 font-medium">Клики</th>
                                          <th className="text-right py-2 font-medium">Результаты</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {ad.rows.sort((a, b) => a.date.localeCompare(b.date)).map((r) => (
                                          <tr key={r.id} className="border-b border-border/50">
                                            <td className="py-2">{r.date}</td>
                                            <td className="text-right py-2">{Number(r.spend).toFixed(2)}</td>
                                            <td className="text-right py-2">{r.impressions.toLocaleString()}</td>
                                            <td className="text-right py-2">{r.clicks.toLocaleString()}</td>
                                            <td className="text-right py-2">{r.results.toLocaleString()}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
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

export default function AdsetDetailPage() {
  return (
    <Suspense fallback={<div className="h-14 border-b border-border flex items-center px-6"><div className="h-4 w-64 animate-pulse rounded bg-muted" /></div>}>
      <AdsetDetailContent />
    </Suspense>
  )
}
