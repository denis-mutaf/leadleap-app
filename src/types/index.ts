export interface Project {
  id: string
  name: string
  slug: string
  logo_url: string | null
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ProjectIntegration {
  id: string
  project_id: string
  service: IntegrationService
  credentials: Record<string, unknown>
  settings: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

export type IntegrationService =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'meta'
  | 'amocrm'
  | 'pbx'

export interface Manager {
  id: string
  project_id: string
  name: string
  pbx_user: string | null
  amo_user_id: number | null
  created_at: string
}

export interface Client {
  id: string
  project_id: string
  phone: string | null
  name: string | null
  amo_lead_id: number | null
  created_at: string
}

export interface Call {
  id: string
  project_id: string
  callid: string | null
  manager_id: string | null
  client_id: string | null
  type: string | null
  duration: number
  audio_path: string | null
  transcript: string | null
  status: string
  amo_lead_id: number | null
  created_at: string
  manager?: Manager | null
  client?: Client | null
}

export interface Evaluation {
  id: string
  project_id: string
  call_id: string
  manager_id: string | null
  score_greeting: number
  score_needs: number
  score_presentation: number
  score_objections: number
  score_closing: number
  score_total: number
  recommendations: string | null
  raw_analysis: Record<string, unknown>
  created_at: string
}

export interface CallInsight {
  id: string
  project_id: string
  call_id: string
  client_id: string | null
  extracted_name: string | null
  extracted_property: string | null
  extracted_budget: string | null
  extracted_concerns: string | null
  extracted_source: string | null
  extracted_timeline: string | null
  extracted_notes: string | null
  created_at: string
}

export interface ManagerStats {
  manager: Manager
  total_calls: number
  avg_score: number
  avg_score_greeting: number
  avg_score_needs: number
  avg_score_presentation: number
  avg_score_objections: number
  avg_score_closing: number
}

