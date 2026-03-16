import { supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('managers')
    .select('*')
    .eq('project_id', projectId)
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const body = await request.json()
  const { projectId, name, pbx_user } = body

  if (!projectId || !name) {
    return NextResponse.json({ error: 'projectId and name required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('managers')
    .insert({ project_id: projectId, name, pbx_user: pbx_user ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
