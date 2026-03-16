import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  getOpenAIClient,
  getAnthropicClient,
  generateEmbeddings,
  searchChunks,
} from '@/lib/rag'

export async function POST(request: Request) {
  const body = await request.json()
  const { projectId, question, limit = 5, threshold = 0.2 } = body as {
    projectId?: string
    question?: string
    limit?: number
    threshold?: number
  }

  if (!projectId || !question) {
    return NextResponse.json({ error: 'projectId и question обязательны' }, { status: 400 })
  }

  try {
    const [openai, anthropic] = await Promise.all([
      getOpenAIClient(projectId),
      getAnthropicClient(projectId),
    ])

    const [queryEmbedding] = await generateEmbeddings(openai, [question])
    const chunks = await searchChunks(projectId, queryEmbedding, limit, threshold)

    if (chunks.length === 0) {
      return NextResponse.json({
        answer: 'В базе знаний не найдено релевантной информации по вашему вопросу.',
        sources: [],
      })
    }

    const docIds = [...new Set(chunks.map((c) => c.document_id))]
    const { data: docs } = await supabaseAdmin
      .from('documents')
      .select('id, title')
      .in('id', docIds)

    const context = chunks
      .map((c, i) => `[${i + 1}] ${c.content}`)
      .join('\n\n')

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `Ты помощник по базе знаний. Отвечай ТОЛЬКО на основе предоставленного контекста. Если ответа нет в контексте — так и скажи.\n\nКонтекст:\n${context}\n\nВопрос: ${question}`,
        },
      ],
    })

    const content = message.content[0]
    const answer = content.type === 'text' ? content.text : ''

    const sources = (docs ?? []).map((d) => ({ id: d.id as string, title: d.title as string }))

    return NextResponse.json({ answer, sources })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Неизвестная ошибка'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

