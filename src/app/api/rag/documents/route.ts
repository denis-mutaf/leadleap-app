import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  parseDocument,
  chunkText,
  getOpenAIClient,
  getAnthropicClient,
  generateEmbeddings,
  generateTitle,
} from '@/lib/rag'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'projectId обязателен' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('id, title, file_name, file_type, file_size, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const projectId = formData.get('projectId') as string | null
  const customTitle = formData.get('title') as string | null

  if (!file || !projectId) {
    return NextResponse.json({ error: 'file и projectId обязательны' }, { status: 400 })
  }

  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'text/html',
  ]
  const allowedExts = ['.pdf', '.docx', '.txt', '.md', '.html']
  const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase()

  if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
    return NextResponse.json(
      { error: 'Поддерживаются только PDF, DOCX, TXT, MD, HTML' },
      { status: 400 }
    )
  }

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: 'Файл должен быть меньше 20MB' }, { status: 400 })
  }

  try {
    const [openai, anthropic] = await Promise.all([
      getOpenAIClient(projectId),
      getAnthropicClient(projectId),
    ])

    const buffer = Buffer.from(await file.arrayBuffer())
    const text = await parseDocument(buffer, file.type, file.name)

    if (!text.trim()) {
      return NextResponse.json(
        { error: 'Не удалось извлечь текст из файла' },
        { status: 400 }
      )
    }

    const title = customTitle?.trim() || (await generateTitle(anthropic, text))

    const storagePath = `${projectId}/${Date.now()}_${file.name}`
    await supabaseAdmin.storage
      .from('rag-documents')
      .upload(storagePath, buffer, { contentType: file.type, upsert: false })

    const { data: doc, error: docError } = await supabaseAdmin
      .from('documents')
      .insert({
        project_id: projectId,
        title,
        file_name: file.name,
        file_type: file.type || `application/${ext.slice(1)}`,
        file_size: file.size,
        storage_path: storagePath,
      })
      .select()
      .single()

    if (docError) {
      throw new Error(docError.message)
    }

    const chunks = chunkText(text)
    const embeddings = await generateEmbeddings(openai, chunks)

    const chunkRecords = chunks.map((content, i) => ({
      document_id: doc.id as string,
      project_id: projectId,
      content,
      embedding: embeddings[i],
      chunk_index: i,
    }))

    const { error: chunkError } = await supabaseAdmin
      .from('document_chunks')
      .insert(chunkRecords)

    if (chunkError) {
      throw new Error(chunkError.message)
    }

    return NextResponse.json(doc, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Неизвестная ошибка'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

