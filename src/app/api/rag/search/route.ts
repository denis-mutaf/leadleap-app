import { NextResponse } from 'next/server'
import { getOpenAIClient, generateEmbeddings, searchChunks } from '@/lib/rag'

export async function POST(request: Request) {
  const body = await request.json()
  const { projectId, query, limit = 5, threshold = 0.2 } = body as {
    projectId?: string
    query?: string
    limit?: number
    threshold?: number
  }

  if (!projectId || !query) {
    return NextResponse.json({ error: 'projectId и query обязательны' }, { status: 400 })
  }

  try {
    const openai = await getOpenAIClient(projectId)
    const [queryEmbedding] = await generateEmbeddings(openai, [query])
    const results = await searchChunks(projectId, queryEmbedding, limit, threshold)
    return NextResponse.json(results)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Неизвестная ошибка'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

