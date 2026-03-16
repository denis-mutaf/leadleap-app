import type { IntegrationService } from '@/types'

export interface IntegrationField {
  key: string
  label: string
  placeholder: string
  type: 'text' | 'password' | 'url'
  required: boolean
}

export interface IntegrationConfig {
  service: IntegrationService
  label: string
  description: string
  icon: string
  fields: IntegrationField[]
}

export const INTEGRATION_CONFIGS: Record<IntegrationService, IntegrationConfig> = {
  openai: {
    service: 'openai',
    label: 'OpenAI',
    description: 'Transcription (Whisper) and embeddings',
    icon: '⚡',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'sk-...', type: 'password', required: true },
    ],
  },
  anthropic: {
    service: 'anthropic',
    label: 'Anthropic',
    description: 'Call analysis and RAG Q&A (Claude)',
    icon: '🧠',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'sk-ant-...', type: 'password', required: true },
    ],
  },
  gemini: {
    service: 'gemini',
    label: 'Google Gemini',
    description: 'Creative generation (Nano Banana)',
    icon: '✨',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'AIza...', type: 'password', required: true },
    ],
  },
  meta: {
    service: 'meta',
    label: 'Meta Ads',
    description: 'Facebook / Instagram Ads dashboard',
    icon: '📊',
    fields: [
      { key: 'access_token', label: 'Access Token', placeholder: 'EAAg...', type: 'password', required: true },
      { key: 'app_id', label: 'App ID', placeholder: '1234567890', type: 'text', required: true },
      { key: 'app_secret', label: 'App Secret', placeholder: '...', type: 'password', required: false },
    ],
  },
  amocrm: {
    service: 'amocrm',
    label: 'AmoCRM',
    description: 'CRM sync for call notes and leads',
    icon: '🔗',
    fields: [
      { key: 'subdomain', label: 'Subdomain', placeholder: 'mycompany', type: 'text', required: true },
      { key: 'long_token', label: 'Long-lived Token', placeholder: 'eyJ...', type: 'password', required: true },
    ],
  },
  pbx: {
    service: 'pbx',
    label: 'Moldcell PBX',
    description: 'Call recordings webhook from PBX',
    icon: '📞',
    fields: [
      {
        key: 'crm_token',
        label: 'CRM Token',
        placeholder: '...',
        type: 'password',
        required: true,
      },
      {
        key: 'webhook_url',
        label: 'Webhook URL',
        placeholder: 'Read-only — generated automatically',
        type: 'url',
        required: false,
      },
    ],
  },
}

