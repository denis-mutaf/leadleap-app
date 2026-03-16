import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'

export async function parseDocument(
  buffer: Buffer,
  fileType: string,
  fileName: string
): Promise<string> {
  if (fileType === 'application/pdf') {
    const pdfParse = (await import('pdf-parse')) as unknown as (
      buffer: Buffer
    ) => Promise<{ text: string }>
    const result = await pdfParse(buffer)
    return result.text
  }

  if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName.endsWith('.docx')
  ) {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  return buffer.toString('utf-8')
}

export function chunkText(text: string, chunkSize = 1500, overlap = 200): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    const chunk = text.slice(start, end).trim()
    if (chunk.length > 50) chunks.push(chunk)
    start += chunkSize - overlap
  }

  return chunks
}

export async function getOpenAIClient(projectId: string): Promise<OpenAI> {
  const { data } = await supabaseAdmin
    .from('project_integrations')
    .select('credentials')
    .eq('project_id', projectId)
    .eq('service', 'openai')
    .eq('is_active', true)
    .single()

  const apiKey = (data as { credentials?: { api_key?: unknown } } | null)?.credentials?.api_key
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error(
      'OpenAI не подключён для этого проекта. Добавьте API ключ в Настройки → Проект → Интеграции.'
    )
  }

  return new OpenAI({ apiKey })
}

export async function getAnthropicClient(projectId: string): Promise<Anthropic> {
  const { data } = await supabaseAdmin
    .from('project_integrations')
    .select('credentials')
    .eq('project_id', projectId)
    .eq('service', 'anthropic')
    .eq('is_active', true)
    .single()

  const apiKey = (data as { credentials?: { api_key?: unknown } } | null)?.credentials?.api_key
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error(
      'Anthropic не подключён для этого проекта. Добавьте API ключ в Настройки → Проект → Интеграции.'
    )
  }

  return new Anthropic({ apiKey })
}

export async function generateEmbeddings(
  openai: OpenAI,
  texts: string[]
): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  })
  return response.data.map((d) => d.embedding)
}

export async function generateTitle(
  anthropic: Anthropic,
  text: string
): Promise<string> {
  const preview = text.slice(0, 4000)
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content:
          'Придумай короткое название (2-6 слов) для этого документа. Отвечай только названием, без кавычек и пояснений.\n\n' +
          preview,
      },
    ],
  })
  const content = message.content[0]
  return content.type === 'text' ? content.text.trim() : 'Без названия'
}

export async function searchChunks(
  projectId: string,
  queryEmbedding: number[],
  limit = 5,
  threshold = 0.2
) {
  const { data, error } = await supabaseAdmin.rpc('match_chunks', {
    query_embedding: queryEmbedding,
    match_project_id: projectId,
    match_threshold: threshold,
    match_count: limit,
  })

  if (error) throw new Error(error.message)
  return (data ?? []) as Array<{
    id: string
    document_id: string
    content: string
    similarity: number
  }>
}

