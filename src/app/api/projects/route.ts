import { supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('id, name, slug, logo_url, settings, created_at, updated_at')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { name, slug } = body

  if (!name || !slug) {
    return NextResponse.json({ error: 'name and slug are required' }, { status: 400 })
  }

  const slugRegex = /^[a-z0-9-]+$/
  if (!slugRegex.test(slug)) {
    return NextResponse.json(
      { error: 'slug must be lowercase letters, numbers and hyphens only' },
      { status: 400 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from('projects')
    .insert({ name, slug })
    .select()
    .single()

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json(
        { error: 'A project with this slug already exists' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

