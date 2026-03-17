import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const accountId = searchParams.get('accountId')
  const adsetId = searchParams.get('adsetId')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  if (!accountId) return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
  if (!adsetId) return NextResponse.json({ error: 'adsetId is required' }, { status: 400 })

  let query = supabaseAdmin
    .from('meta_ad_insights')
    .select('*')
    .eq('project_id', projectId)
    .eq('account_id', accountId)
    .order('date', { ascending: true })

  if (/^\d+$/.test(adsetId)) query = query.eq('adset_id', adsetId)
  else query = query.eq('adset_name', decodeURIComponent(adsetId))

  if (dateFrom) query = query.gte('date', dateFrom)
  if (dateTo) query = query.lte('date', dateTo)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
}
