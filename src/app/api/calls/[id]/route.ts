import { supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const [callRes, evalRes, insightRes] = await Promise.all([
    supabaseAdmin
      .from('calls')
      .select(
        `*, manager:managers(id, name), client:clients(id, name, phone)`
      )
      .eq('id', id)
      .single(),
    supabaseAdmin
      .from('evaluations')
      .select('*')
      .eq('call_id', id)
      .maybeSingle(),
    supabaseAdmin
      .from('call_insights')
      .select('*')
      .eq('call_id', id)
      .maybeSingle(),
  ])

  if (callRes.error) {
    const isNotFound = callRes.error.code === 'PGRST116'
    if (isNotFound) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ error: callRes.error.message }, { status: 500 })
  }
  if (evalRes.error) return NextResponse.json({ error: evalRes.error.message }, { status: 500 })
  if (insightRes.error) return NextResponse.json({ error: insightRes.error.message }, { status: 500 })

  return NextResponse.json({
    call: callRes.data,
    evaluation: evalRes.data ?? null,
    insight: insightRes.data ?? null,
  })
}
