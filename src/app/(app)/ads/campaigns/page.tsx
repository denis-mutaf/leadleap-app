'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useProjectStore } from '@/store/project-store'
import { useMetaAccountStore } from '@/hooks/use-meta-account'
import type { CampaignAggregateRow } from '@/types/meta'

function AdsCampaignsContent() {
  const searchParams = useSearchParams()
  const projectId = useProjectStore((s) => s.activeProject?.id)
  const { selectedAccountId } = useMetaAccountStore()
  const accountId = selectedAccountId ?? ''
  const dateFrom = searchParams.get('dateFrom') ?? ''
  const dateTo = searchParams.get('dateTo') ?? ''
  const query = [dateFrom && `dateFrom=${encodeURIComponent(dateFrom)}`, dateTo && `dateTo=${encodeURIComponent(dateTo)}`].filter(Boolean).join('&')
  const queryStr = query ? `?${query}` : ''

  const [campaigns, setCampaigns] = useState<CampaignAggregateRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId || !accountId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const params = new URLSearchParams({ projectId, accountId, groupBy: 'campaign' })
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    fetch(`/api/meta/insights?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setCampaigns(data.data ?? []))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false))
  }, [projectId, accountId, dateFrom, dateTo])

  if (!projectId || !accountId) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="px-6 h-14 border-b border-border flex items-center">
          <h1 className="text-sm font-medium">Кампании</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12">
          <BarChart3 size={40} className="text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Выберите проект и аккаунт</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-6 h-14 border-b border-border shrink-0">
        <h1 className="text-sm font-medium">Кампании</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <BarChart3 size={40} className="text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Нет кампаний за выбранный период</p>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Кампании</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium">Кампания</th>
                      <th className="text-right py-2 font-medium">Расход</th>
                      <th className="text-right py-2 font-medium">Показы</th>
                      <th className="text-right py-2 font-medium">Клики</th>
                      <th className="text-right py-2 font-medium">Результаты</th>
                      <th className="text-right py-2 font-medium">CTR</th>
                      <th className="text-right py-2 font-medium">CPC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c) => (
                      <tr key={c.campaign_name} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-2">
                          <Link
                            href={`/ads/campaigns/${encodeURIComponent(c.campaign_id ?? c.campaign_name)}${queryStr ? queryStr : ''}`}
                            className="text-primary hover:underline"
                          >
                            {c.campaign_name}
                          </Link>
                        </td>
                        <td className="text-right py-2">{c.total_spend.toFixed(2)}</td>
                        <td className="text-right py-2">{c.total_impressions.toLocaleString()}</td>
                        <td className="text-right py-2">{c.total_clicks.toLocaleString()}</td>
                        <td className="text-right py-2">{c.total_results.toLocaleString()}</td>
                        <td className="text-right py-2">{c.avg_ctr.toFixed(2)}%</td>
                        <td className="text-right py-2">{c.avg_cpc.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function AdsCampaignsPage() {
  return (
    <Suspense fallback={<div className="flex h-14 items-center px-6 border-b border-border"><div className="h-4 w-32 animate-pulse rounded bg-muted" /></div>}>
      <AdsCampaignsContent />
    </Suspense>
  )
}
