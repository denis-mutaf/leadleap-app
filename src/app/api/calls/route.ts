import { supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  const managerId = searchParams.get('managerId')

  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }

  let query = supabaseAdmin
    .from('calls')
    .select(
      `*, manager:managers(id, name, pbx_user), client:clients(id, name, phone)`
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (managerId) {
    query = query.eq('manager_id', managerId)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}
