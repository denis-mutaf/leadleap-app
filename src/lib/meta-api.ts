const META_GRAPH_URL = 'https://graph.facebook.com/v21.0'

/** Нормализация accountId: добавляет act_ если нет */
export function normalizeAccountId(accountId: string): string {
  const raw = String(accountId).trim()
  return raw.startsWith('act_') ? raw : `act_${raw}`
}

/** Извлекает сумму results из массива actions Meta API */
export function extractResults(
  actions?: Array<{ action_type: string; value: string }>
): number {
  if (!actions) return 0
  const resultTypes = ['lead', 'offsite_conversion', 'onsite_conversion', 'purchase', 'complete_registration']
  return actions
    .filter((a) => resultTypes.includes(a.action_type))
    .reduce((sum, a) => sum + (parseInt(a.value, 10) || 0), 0)
}

/** Извлекает значение из массива video actions */
export function extractActionValue(
  actions?: Array<{ action_type: string; value: string }>
): number {
  const v = actions?.[0]?.value
  return v != null ? parseInt(String(v), 10) || 0 : 0
}

/** Fetch с exponential backoff при 429 (макс 3 попытки: 1s, 2s, 4s) */
async function fetchWithBackoff(url: string, attempt = 0): Promise<Response> {
  const res = await fetch(url)
  if (res.status === 429 && attempt < 3) {
    await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)))
    return fetchWithBackoff(url, attempt + 1)
  }
  return res
}

/** Рекурсивная загрузка всех страниц Meta API с курсорной пагинацией */
async function fetchAllPages<T>(url: string): Promise<T[]> {
  const results: T[] = []
  let nextUrl: string | null = url

  while (nextUrl) {
    const res = await fetchWithBackoff(nextUrl)
    const json = await res.json()

    if (!res.ok) {
      const message = (json as { error?: { message?: string } }).error?.message ?? res.statusText
      throw new Error(`Meta API error: ${message}`)
    }

    const data = (json as { data?: T[]; paging?: { next?: string } }).data ?? []
    results.push(...data)

    const next = (json as { paging?: { next?: string } }).paging?.next
    nextUrl = next ?? null

    if (nextUrl) await new Promise((r) => setTimeout(r, 300))
  }

  return results
}

const INSIGHT_FIELDS = [
  'campaign_id', 'campaign_name', 'spend', 'impressions', 'clicks',
  'results', 'cpm', 'cpc', 'ctr', 'reach', 'frequency',
  'actions', 'date_start', 'account_currency',
  'video_p25_watched_actions', 'video_p50_watched_actions',
  'video_p75_watched_actions', 'video_p100_watched_actions',
  'video_thruplay_watched_actions',
].join(',')

const ADSET_FIELDS = [
  'campaign_id', 'campaign_name', 'adset_id', 'adset_name',
  'spend', 'impressions', 'clicks', 'results', 'cpm', 'cpc', 'ctr',
  'reach', 'frequency', 'actions', 'date_start', 'account_currency',
  'video_p25_watched_actions', 'video_p50_watched_actions',
  'video_p75_watched_actions', 'video_p100_watched_actions',
  'video_thruplay_watched_actions',
].join(',')

const AD_FIELDS = [
  'campaign_id', 'campaign_name', 'adset_id', 'adset_name',
  'ad_id', 'ad_name', 'spend', 'impressions', 'clicks', 'results',
  'cpm', 'cpc', 'ctr', 'reach', 'frequency', 'actions', 'date_start',
  'account_currency', 'video_p25_watched_actions', 'video_p50_watched_actions',
  'video_p75_watched_actions', 'video_p100_watched_actions',
  'video_thruplay_watched_actions',
].join(',')

function buildInsightsUrl(
  accountId: string,
  token: string,
  fields: string,
  level: string,
  dateFrom?: string,
  dateTo?: string,
  breakdowns?: string
): string {
  const params = new URLSearchParams({
    fields,
    level,
    time_increment: '1',
    access_token: token,
    limit: '500',
  })
  if (dateFrom && dateTo) {
    params.set('time_range', JSON.stringify({ since: dateFrom, until: dateTo }))
  }
  if (breakdowns) params.set('breakdowns', breakdowns)
  return `${META_GRAPH_URL}/${accountId}/insights?${params.toString()}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MetaRawRow = Record<string, any>

export async function fetchMetaInsights(
  accountId: string,
  token: string,
  dateFrom?: string,
  dateTo?: string
): Promise<MetaRawRow[]> {
  const url = buildInsightsUrl(accountId, token, INSIGHT_FIELDS, 'campaign', dateFrom, dateTo)
  return fetchAllPages<MetaRawRow>(url)
}

export async function fetchMetaAdsetInsights(
  accountId: string,
  token: string,
  dateFrom?: string,
  dateTo?: string
): Promise<MetaRawRow[]> {
  const url = buildInsightsUrl(accountId, token, ADSET_FIELDS, 'adset', dateFrom, dateTo)
  return fetchAllPages<MetaRawRow>(url)
}

export async function fetchMetaAdInsights(
  accountId: string,
  token: string,
  dateFrom?: string,
  dateTo?: string
): Promise<MetaRawRow[]> {
  const url = buildInsightsUrl(accountId, token, AD_FIELDS, 'ad', dateFrom, dateTo)
  return fetchAllPages<MetaRawRow>(url)
}

export async function fetchMetaDemographicInsights(
  accountId: string,
  token: string,
  dateFrom?: string,
  dateTo?: string
): Promise<MetaRawRow[]> {
  const fields = 'campaign_id,campaign_name,age,gender,spend,impressions,clicks,actions,cpm,cpc,ctr,date_start'
  const url = buildInsightsUrl(accountId, token, fields, 'campaign', dateFrom, dateTo, 'age,gender')
  return fetchAllPages<MetaRawRow>(url)
}

export async function fetchMetaPlacementInsights(
  accountId: string,
  token: string,
  dateFrom?: string,
  dateTo?: string
): Promise<MetaRawRow[]> {
  const fields = 'campaign_id,campaign_name,publisher_platform,platform_position,spend,impressions,clicks,actions,cpm,cpc,ctr,date_start'
  const url = buildInsightsUrl(accountId, token, fields, 'campaign', dateFrom, dateTo, 'publisher_platform,platform_position')
  return fetchAllPages<MetaRawRow>(url)
}

export async function fetchMetaGeoInsights(
  accountId: string,
  token: string,
  dateFrom?: string,
  dateTo?: string
): Promise<MetaRawRow[]> {
  const fields = 'campaign_id,campaign_name,country,region,spend,impressions,clicks,actions,cpm,cpc,ctr,date_start'
  const url = buildInsightsUrl(accountId, token, fields, 'campaign', dateFrom, dateTo, 'country,region')
  return fetchAllPages<MetaRawRow>(url)
}

export async function fetchMetaHourlyInsights(
  accountId: string,
  token: string,
  dateFrom?: string,
  dateTo?: string
): Promise<MetaRawRow[]> {
  const fields = 'campaign_id,campaign_name,hourly_stats_aggregated_by_advertiser_time_zone,spend,impressions,clicks,actions,cpm,cpc,ctr,date_start'
  const url = buildInsightsUrl(accountId, token, fields, 'campaign', dateFrom, dateTo, 'hourly_stats_aggregated_by_advertiser_time_zone')
  return fetchAllPages<MetaRawRow>(url)
}

export async function fetchMetaAdAccounts(token: string): Promise<Array<{
  account_id: string
  name: string
  account_currency?: string
}>> {
  const url = `${META_GRAPH_URL}/me/adaccounts?fields=account_id,name,account_currency&access_token=${token}&limit=200`
  return fetchAllPages(url)
}

export async function fetchMetaAds(adsetId: string, token: string): Promise<Array<{
  id: string
  name: string
  status: string
  creative?: { id: string }
}>> {
  const url = `${META_GRAPH_URL}/${adsetId}/ads?fields=id,name,status,creative{id}&access_token=${token}&limit=200`
  return fetchAllPages(url)
}

export async function fetchMetaAdPreview(adId: string, token: string, adFormat = 'MOBILE_FEED_STANDARD'): Promise<string> {
  const url = `${META_GRAPH_URL}/${adId}/previews?ad_format=${adFormat}&access_token=${token}`
  const res = await fetchWithBackoff(url)
  const json = await res.json() as { data?: Array<{ body: string }>; error?: { message: string } }
  if (!res.ok) throw new Error(json.error?.message ?? res.statusText)
  return json.data?.[0]?.body ?? ''
}
