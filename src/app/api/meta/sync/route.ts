import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  fetchMetaInsights, fetchMetaAdsetInsights, fetchMetaAdInsights,
  fetchMetaDemographicInsights, fetchMetaPlacementInsights,
  fetchMetaGeoInsights, fetchMetaHourlyInsights,
  normalizeAccountId, extractResults, extractActionValue,
} from '@/lib/meta-api'

type ActionArr = Array<{ action_type: string; value: string }>

export async function POST(req: NextRequest) {
  const token = process.env.META_ACCESS_TOKEN
  if (!token) return NextResponse.json({ error: 'META_ACCESS_TOKEN not set' }, { status: 500 })

  const body = await req.json() as {
    projectId?: string
    accountId?: string
    dateFrom?: string
    dateTo?: string
  }
  const { projectId, accountId: rawId, dateFrom, dateTo } = body

  if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  if (!rawId) return NextResponse.json({ error: 'accountId is required' }, { status: 400 })

  const accountId = normalizeAccountId(rawId)
  let totalSynced = 0

  try {
    const rows = await fetchMetaInsights(accountId, token, dateFrom, dateTo)
    if (rows.length > 0) {
      const records = rows.map((row) => {
        const spend = parseFloat(String(row.spend)) || 0
        const results = extractResults(row.actions as ActionArr | undefined)
        return {
          project_id: projectId,
          account_id: accountId,
          campaign_id: row.campaign_id ? String(row.campaign_id) : null,
          campaign_name: String(row.campaign_name),
          date: String(row.date_start),
          spend,
          impressions: parseInt(String(row.impressions), 10) || 0,
          clicks: parseInt(String(row.clicks), 10) || 0,
          results,
          cost_per_result: results > 0 ? spend / results : 0,
          cpm: parseFloat(String(row.cpm)) || 0,
          cpc: parseFloat(String(row.cpc)) || 0,
          ctr: parseFloat(String(row.ctr)) || 0,
          reach: parseInt(String(row.reach ?? ''), 10) || 0,
          frequency: parseFloat(String(row.frequency ?? '')) || 0,
          video_p25_watched: extractActionValue(row.video_p25_watched_actions as ActionArr | undefined),
          video_p50_watched: extractActionValue(row.video_p50_watched_actions as ActionArr | undefined),
          video_p75_watched: extractActionValue(row.video_p75_watched_actions as ActionArr | undefined),
          video_p100_watched: extractActionValue(row.video_p100_watched_actions as ActionArr | undefined),
          video_thruplay: extractActionValue(row.video_thruplay_watched_actions as ActionArr | undefined),
          account_currency: String(row.account_currency ?? 'USD'),
          fetched_at: new Date().toISOString(),
        }
      })
      const { error, count } = await supabaseAdmin
        .from('meta_campaign_insights')
        .upsert(records, { onConflict: 'project_id,account_id,campaign_name,date', count: 'exact' })
      if (error) console.error('campaign sync error:', error)
      else totalSynced += count ?? records.length
    }
  } catch (err) { console.error('fetchMetaInsights error:', err) }

  try {
    const rows = await fetchMetaAdsetInsights(accountId, token, dateFrom, dateTo)
    if (rows.length > 0) {
      const records = rows.map((row) => {
        const spend = parseFloat(String(row.spend)) || 0
        const results = extractResults(row.actions as ActionArr | undefined)
        return {
          project_id: projectId,
          account_id: accountId,
          campaign_id: row.campaign_id ? String(row.campaign_id) : null,
          campaign_name: String(row.campaign_name),
          adset_id: row.adset_id ? String(row.adset_id) : null,
          adset_name: String(row.adset_name),
          date: String(row.date_start),
          spend,
          impressions: parseInt(String(row.impressions), 10) || 0,
          clicks: parseInt(String(row.clicks), 10) || 0,
          results,
          cost_per_result: results > 0 ? spend / results : 0,
          cpm: parseFloat(String(row.cpm)) || 0,
          cpc: parseFloat(String(row.cpc)) || 0,
          ctr: parseFloat(String(row.ctr)) || 0,
          reach: parseInt(String(row.reach ?? ''), 10) || 0,
          frequency: parseFloat(String(row.frequency ?? '')) || 0,
          video_p25_watched: extractActionValue(row.video_p25_watched_actions as ActionArr | undefined),
          video_p50_watched: extractActionValue(row.video_p50_watched_actions as ActionArr | undefined),
          video_p75_watched: extractActionValue(row.video_p75_watched_actions as ActionArr | undefined),
          video_p100_watched: extractActionValue(row.video_p100_watched_actions as ActionArr | undefined),
          video_thruplay: extractActionValue(row.video_thruplay_watched_actions as ActionArr | undefined),
          account_currency: String(row.account_currency ?? 'USD'),
          fetched_at: new Date().toISOString(),
        }
      })
      const { error, count } = await supabaseAdmin
        .from('meta_adset_insights')
        .upsert(records, { onConflict: 'project_id,account_id,adset_name,campaign_name,date', count: 'exact' })
      if (error) console.error('adset sync error:', error)
      else totalSynced += count ?? records.length
    }
  } catch (err) { console.error('fetchMetaAdsetInsights error:', err) }

  const [demoRes, placementRes, geoRes, hourlyRes, adRes] = await Promise.allSettled([
    (async () => {
      const rows = await fetchMetaDemographicInsights(accountId, token, dateFrom, dateTo)
      if (!rows.length) return 0
      const records = rows.map((row) => ({
        project_id: projectId,
        account_id: accountId,
        campaign_id: row.campaign_id ? String(row.campaign_id) : null,
        campaign_name: String(row.campaign_name),
        date: String(row.date_start),
        age: row.age ? String(row.age) : null,
        gender: row.gender ? String(row.gender) : null,
        spend: parseFloat(String(row.spend)) || 0,
        impressions: parseInt(String(row.impressions), 10) || 0,
        clicks: parseInt(String(row.clicks), 10) || 0,
        results: extractResults(row.actions as ActionArr | undefined),
        cpm: parseFloat(String(row.cpm ?? '0')) || 0,
        cpc: parseFloat(String(row.cpc ?? '0')) || 0,
        ctr: parseFloat(String(row.ctr ?? '0')) || 0,
        fetched_at: new Date().toISOString(),
      }))
      const { error, count } = await supabaseAdmin
        .from('meta_demographic_insights')
        .upsert(records, { onConflict: 'project_id,account_id,campaign_name,date,age,gender', count: 'exact' })
      if (error) { console.error('demographic sync error:', error); return 0 }
      return count ?? records.length
    })(),
    (async () => {
      const rows = await fetchMetaPlacementInsights(accountId, token, dateFrom, dateTo)
      if (!rows.length) return 0
      const records = rows.map((row) => ({
        project_id: projectId,
        account_id: accountId,
        campaign_id: row.campaign_id ? String(row.campaign_id) : null,
        campaign_name: String(row.campaign_name),
        date: String(row.date_start),
        publisher_platform: row.publisher_platform ? String(row.publisher_platform) : null,
        platform_position: row.platform_position ? String(row.platform_position) : null,
        spend: parseFloat(String(row.spend)) || 0,
        impressions: parseInt(String(row.impressions), 10) || 0,
        clicks: parseInt(String(row.clicks), 10) || 0,
        results: extractResults(row.actions as ActionArr | undefined),
        cpm: parseFloat(String(row.cpm ?? '0')) || 0,
        cpc: parseFloat(String(row.cpc ?? '0')) || 0,
        ctr: parseFloat(String(row.ctr ?? '0')) || 0,
        fetched_at: new Date().toISOString(),
      }))
      const { error, count } = await supabaseAdmin
        .from('meta_placement_insights')
        .upsert(records, { onConflict: 'project_id,account_id,campaign_name,date,publisher_platform,platform_position', count: 'exact' })
      if (error) { console.error('placement sync error:', error); return 0 }
      return count ?? records.length
    })(),
    (async () => {
      const rows = await fetchMetaGeoInsights(accountId, token, dateFrom, dateTo)
      if (!rows.length) return 0
      const records = rows.map((row) => ({
        project_id: projectId,
        account_id: accountId,
        campaign_id: row.campaign_id ? String(row.campaign_id) : null,
        campaign_name: String(row.campaign_name),
        date: String(row.date_start),
        country: row.country ? String(row.country) : null,
        region: row.region ? String(row.region) : null,
        spend: parseFloat(String(row.spend)) || 0,
        impressions: parseInt(String(row.impressions), 10) || 0,
        clicks: parseInt(String(row.clicks), 10) || 0,
        results: extractResults(row.actions as ActionArr | undefined),
        cpm: parseFloat(String(row.cpm ?? '0')) || 0,
        cpc: parseFloat(String(row.cpc ?? '0')) || 0,
        ctr: parseFloat(String(row.ctr ?? '0')) || 0,
        fetched_at: new Date().toISOString(),
      }))
      const { error, count } = await supabaseAdmin
        .from('meta_geo_insights')
        .upsert(records, { onConflict: 'project_id,account_id,campaign_name,date,country,region', count: 'exact' })
      if (error) { console.error('geo sync error:', error); return 0 }
      return count ?? records.length
    })(),
    (async () => {
      const rows = await fetchMetaHourlyInsights(accountId, token, dateFrom, dateTo)
      if (!rows.length) return 0
      const records = rows.map((row) => {
        const hourRaw = String(row.hourly_stats_aggregated_by_advertiser_time_zone ?? '0')
        const hour = parseInt(hourRaw.split(':')[0], 10)
        return {
          project_id: projectId,
          account_id: accountId,
          campaign_id: row.campaign_id ? String(row.campaign_id) : null,
          campaign_name: String(row.campaign_name),
          date: String(row.date_start),
          hour: Number.isNaN(hour) ? 0 : Math.max(0, Math.min(23, hour)),
          spend: parseFloat(String(row.spend)) || 0,
          impressions: parseInt(String(row.impressions), 10) || 0,
          clicks: parseInt(String(row.clicks), 10) || 0,
          results: extractResults(row.actions as ActionArr | undefined),
          cpm: parseFloat(String(row.cpm ?? '0')) || 0,
          cpc: parseFloat(String(row.cpc ?? '0')) || 0,
          ctr: parseFloat(String(row.ctr ?? '0')) || 0,
          fetched_at: new Date().toISOString(),
        }
      })
      const { error, count } = await supabaseAdmin
        .from('meta_hourly_insights')
        .upsert(records, { onConflict: 'project_id,account_id,campaign_name,date,hour', count: 'exact' })
      if (error) { console.error('hourly sync error:', error); return 0 }
      return count ?? records.length
    })(),
    (async () => {
      const rows = await fetchMetaAdInsights(accountId, token, dateFrom, dateTo)
      if (!rows.length) return 0
      const records = rows
        .map((row) => {
          const adId = String(row.ad_id ?? '').trim()
          const adName = String(row.ad_name ?? '').trim()
          if (!adId || !adName) return null
          const spend = parseFloat(String(row.spend)) || 0
          const results = extractResults(row.actions as ActionArr | undefined)
          return {
            project_id: projectId,
            account_id: accountId,
            campaign_id: row.campaign_id ? String(row.campaign_id) : null,
            campaign_name: String(row.campaign_name),
            adset_id: row.adset_id ? String(row.adset_id) : null,
            adset_name: String(row.adset_name ?? ''),
            ad_id: adId,
            ad_name: adName,
            date: String(row.date_start),
            spend,
            impressions: parseInt(String(row.impressions), 10) || 0,
            clicks: parseInt(String(row.clicks), 10) || 0,
            results,
            cost_per_result: results > 0 ? spend / results : 0,
            cpm: parseFloat(String(row.cpm)) || 0,
            cpc: parseFloat(String(row.cpc)) || 0,
            ctr: parseFloat(String(row.ctr)) || 0,
            reach: parseInt(String(row.reach ?? ''), 10) || 0,
            frequency: parseFloat(String(row.frequency ?? '')) || 0,
            video_p25_watched: extractActionValue(row.video_p25_watched_actions as ActionArr | undefined),
            video_p50_watched: extractActionValue(row.video_p50_watched_actions as ActionArr | undefined),
            video_p75_watched: extractActionValue(row.video_p75_watched_actions as ActionArr | undefined),
            video_p100_watched: extractActionValue(row.video_p100_watched_actions as ActionArr | undefined),
            video_thruplay: extractActionValue(row.video_thruplay_watched_actions as ActionArr | undefined),
            account_currency: String(row.account_currency ?? 'USD'),
            fetched_at: new Date().toISOString(),
          }
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
      if (!records.length) return 0
      const { error, count } = await supabaseAdmin
        .from('meta_ad_insights')
        .upsert(records, { onConflict: 'project_id,account_id,ad_id,date', count: 'exact' })
      if (error) { console.error('ad sync error:', error); return 0 }
      return count ?? records.length
    })(),
  ])

  for (const res of [demoRes, placementRes, geoRes, hourlyRes, adRes]) {
    if (res.status === 'fulfilled') totalSynced += res.value
    else console.error('parallel sync error:', res.reason)
  }

  return NextResponse.json({ success: true, rows_synced: totalSynced })
}
