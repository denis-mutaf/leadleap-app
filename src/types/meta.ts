export interface MetaAdAccount {
  id: string
  account_id: string
  account_name: string
  account_currency: string
  is_active: boolean
  created_at: string
}

export interface MetaCampaignInsight {
  id: string
  account_id: string
  campaign_id: string | null
  campaign_name: string
  date: string
  spend: number
  impressions: number
  clicks: number
  outbound_clicks: number
  results: number
  cost_per_result: number
  cpm: number
  cpc: number
  ctr: number
  reach: number
  frequency: number
  video_p25_watched: number
  video_p50_watched: number
  video_p75_watched: number
  video_p100_watched: number
  video_thruplay: number
  account_currency: string
  purchase_roas: number
  quality_ranking: string | null
  engagement_rate_ranking: string | null
  conversion_rate_ranking: string | null
  actions_json: Record<string, unknown>[] | null
  action_values_json: Record<string, unknown>[] | null
  cost_per_action_type_json: Record<string, unknown>[] | null
}

export interface MetaAdsetInsight {
  id: string
  account_id: string
  campaign_id: string | null
  campaign_name: string
  adset_id: string | null
  adset_name: string
  date: string
  spend: number
  impressions: number
  clicks: number
  outbound_clicks: number
  results: number
  cost_per_result: number
  cpm: number
  cpc: number
  ctr: number
  reach: number
  frequency: number
  video_p25_watched: number
  video_p50_watched: number
  video_p75_watched: number
  video_p100_watched: number
  video_thruplay: number
  account_currency: string
  purchase_roas: number
  quality_ranking: string | null
  engagement_rate_ranking: string | null
  conversion_rate_ranking: string | null
  actions_json: Record<string, unknown>[] | null
  action_values_json: Record<string, unknown>[] | null
  cost_per_action_type_json: Record<string, unknown>[] | null
}

export interface MetaAdInsight {
  id: string
  account_id: string
  campaign_id: string | null
  campaign_name: string
  adset_id: string | null
  adset_name: string
  ad_id: string
  ad_name: string
  date: string
  spend: number
  impressions: number
  clicks: number
  outbound_clicks: number
  results: number
  cost_per_result: number
  cpm: number
  cpc: number
  ctr: number
  reach: number
  frequency: number
  video_p25_watched: number
  video_p50_watched: number
  video_p75_watched: number
  video_p100_watched: number
  video_thruplay: number
  account_currency: string
  purchase_roas: number
  quality_ranking: string | null
  engagement_rate_ranking: string | null
  conversion_rate_ranking: string | null
  actions_json: Record<string, unknown>[] | null
  action_values_json: Record<string, unknown>[] | null
  cost_per_action_type_json: Record<string, unknown>[] | null
}

export interface MetaDemographicInsight {
  id: string
  account_id: string
  campaign_id: string | null
  campaign_name: string
  date: string
  age: string | null
  gender: string | null
  spend: number
  impressions: number
  clicks: number
  results: number
  cpm: number
  cpc: number
  ctr: number
}

export interface MetaPlacementInsight {
  id: string
  account_id: string
  campaign_id: string | null
  campaign_name: string
  date: string
  publisher_platform: string | null
  platform_position: string | null
  spend: number
  impressions: number
  clicks: number
  results: number
  cpm: number
  cpc: number
  ctr: number
}

export interface MetaGeoInsight {
  id: string
  account_id: string
  campaign_id: string | null
  campaign_name: string
  date: string
  country: string | null
  region: string | null
  spend: number
  impressions: number
  clicks: number
  results: number
  cpm: number
  cpc: number
  ctr: number
}

export interface MetaHourlyInsight {
  id: string
  account_id: string
  campaign_id: string | null
  campaign_name: string
  date: string
  hour: number
  spend: number
  impressions: number
  clicks: number
  results: number
  cpm: number
  cpc: number
  ctr: number
}

export interface MetaDeviceInsight {
  id: string
  account_id: string
  campaign_id: string | null
  campaign_name: string
  date: string
  device_platform: string | null
  spend: number
  impressions: number
  clicks: number
  results: number
  cpm: number
  cpc: number
  ctr: number
}

// Aggregated types for UI

export interface CampaignAggregateRow {
  campaign_name: string
  campaign_id: string | null
  total_spend: number
  total_purchase_roas: number
  total_impressions: number
  total_clicks: number
  total_results: number
  avg_cpm: number
  avg_cpc: number
  avg_ctr: number
  avg_cost_per_result: number
  days: number
}

export interface AdsetAggregateRow {
  adset_id: string | null
  adset_name: string
  campaign_id: string | null
  campaign_name: string
  total_spend: number
  total_purchase_roas: number
  total_impressions: number
  total_reach: number
  avg_frequency: number
  total_clicks: number
  total_results: number
  avg_ctr: number
  avg_cpc: number
  avg_cost_per_result: number
  days: number
}
