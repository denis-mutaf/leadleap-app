import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { CampaignAggregateRow } from '@/types/meta'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const accountId = searchParams.get('accountId')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const groupBy = searchParams.get('groupBy')
  const campaignId = searchParams.get('campaignId')

  if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  if (!accountId) return NextResponse.json({ error: 'accountId is required' }, { status: 400 })

  let query = supabaseAdmin
    .from('meta_campaign_insights')
    .select('*')
    .eq('project_id', projectId)
    .eq('account_id', accountId)
    .order('date', { ascending: true })

  if (dateFrom) query = query.gte('date', dateFrom)
  if (dateTo) query = query.lte('date', dateTo)
  if (campaignId) {
    if (/^\d+$/.test(campaignId)) query = query.eq('campaign_id', campaignId)
    else query = query.eq('campaign_name', decodeURIComponent(campaignId))
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const raw = data ?? []

  if (groupBy === 'campaign') {
    const grouped: Record<
      string,
      CampaignAggregateRow & { _cpm: number; _cpc: number; _ctr: number; _roas_weighted: number }
    > = {}
    for (const row of raw) {
      const key = row.campaign_name
      if (!grouped[key]) {
        grouped[key] = {
          campaign_name: row.campaign_name, campaign_id: row.campaign_id ?? null,
          total_spend: 0, total_purchase_roas: 0, total_impressions: 0, total_clicks: 0, total_results: 0,
          avg_cpm: 0, avg_cpc: 0, avg_ctr: 0, avg_cost_per_result: 0,
          days: 0, _cpm: 0, _cpc: 0, _ctr: 0, _roas_weighted: 0,
        }
      }
      grouped[key].total_spend += Number(row.spend ?? 0)
      grouped[key]._roas_weighted += Number(row.purchase_roas ?? 0) * Number(row.spend ?? 0)
      grouped[key].total_impressions += Number(row.impressions ?? 0)
      grouped[key].total_clicks += Number(row.clicks ?? 0)
      grouped[key].total_results += Number(row.results ?? 0)
      grouped[key]._cpm += Number(row.cpm ?? 0)
      grouped[key]._cpc += Number(row.cpc ?? 0)
      grouped[key]._ctr += Number(row.ctr ?? 0)
      grouped[key].days += 1
    }
    const campaigns = Object.values(grouped).map(({ _cpm, _cpc, _ctr, _roas_weighted, ...c }) => ({
      ...c,
      avg_cpm: c.days > 0 ? _cpm / c.days : 0,
      avg_cpc: c.days > 0 ? _cpc / c.days : 0,
      avg_ctr: c.days > 0 ? _ctr / c.days : 0,
      avg_cost_per_result: c.total_results > 0 ? c.total_spend / c.total_results : 0,
      total_purchase_roas: c.total_spend > 0 ? _roas_weighted / c.total_spend : 0,
    }))
    return NextResponse.json({ data: campaigns })
  }

  return NextResponse.json({ data: raw })
}
