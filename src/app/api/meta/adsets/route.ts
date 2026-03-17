import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { AdsetAggregateRow } from '@/types/meta'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const accountId = searchParams.get('accountId')
  const campaignId = searchParams.get('campaignId')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const groupBy = searchParams.get('groupBy')

  if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  if (!accountId) return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
  if (!campaignId) return NextResponse.json({ error: 'campaignId is required' }, { status: 400 })

  let query = supabaseAdmin
    .from('meta_adset_insights')
    .select('*')
    .eq('project_id', projectId)
    .eq('account_id', accountId)
    .order('date', { ascending: true })

  if (/^\d+$/.test(campaignId)) query = query.eq('campaign_id', campaignId)
  else query = query.eq('campaign_name', decodeURIComponent(campaignId))

  if (dateFrom) query = query.gte('date', dateFrom)
  if (dateTo) query = query.lte('date', dateTo)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const raw = data ?? []

  if (groupBy === 'adset') {
    const grouped: Record<
      string,
      AdsetAggregateRow & { _freq: number; _ctr: number; _cpc: number; _roas_weighted: number }
    > = {}
    for (const row of raw) {
      const key = row.adset_name
      if (!grouped[key]) {
        grouped[key] = {
          adset_id: row.adset_id ?? null, adset_name: row.adset_name,
          campaign_id: row.campaign_id ?? null, campaign_name: row.campaign_name,
          total_spend: 0, total_purchase_roas: 0, total_impressions: 0, total_reach: 0, avg_frequency: 0,
          total_clicks: 0, total_results: 0, avg_ctr: 0, avg_cpc: 0,
          avg_cost_per_result: 0, days: 0, _freq: 0, _ctr: 0, _cpc: 0, _roas_weighted: 0,
        }
      }
      grouped[key].total_spend += Number(row.spend ?? 0)
      grouped[key]._roas_weighted += Number(row.purchase_roas ?? 0) * Number(row.spend ?? 0)
      grouped[key].total_impressions += Number(row.impressions ?? 0)
      grouped[key].total_reach += Number(row.reach ?? 0)
      grouped[key].total_clicks += Number(row.clicks ?? 0)
      grouped[key].total_results += Number(row.results ?? 0)
      grouped[key]._freq += Number(row.frequency ?? 0)
      grouped[key]._ctr += Number(row.ctr ?? 0)
      grouped[key]._cpc += Number(row.cpc ?? 0)
      grouped[key].days += 1
    }
    const adsets = Object.values(grouped).map(({ _freq, _ctr, _cpc, _roas_weighted, ...a }) => ({
      ...a,
      avg_frequency: a.days > 0 ? Math.round((_freq / a.days) * 100) / 100 : 0,
      avg_ctr: a.days > 0 ? _ctr / a.days : 0,
      avg_cpc: a.days > 0 ? _cpc / a.days : 0,
      avg_cost_per_result: a.total_results > 0 ? a.total_spend / a.total_results : 0,
      total_purchase_roas: a.total_spend > 0 ? _roas_weighted / a.total_spend : 0,
    }))
    return NextResponse.json({ data: adsets })
  }

  return NextResponse.json({ data: raw })
}
