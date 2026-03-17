import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const accountId = searchParams.get('accountId')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const campaignName = searchParams.get('campaignName')

  if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  if (!accountId) return NextResponse.json({ error: 'accountId is required' }, { status: 400 })

  let query = supabaseAdmin
    .from('meta_demographic_insights')
    .select('*')
    .eq('project_id', projectId)
    .eq('account_id', accountId)
    .order('date', { ascending: true })

  if (dateFrom) query = query.gte('date', dateFrom)
  if (dateTo) query = query.lte('date', dateTo)
  if (campaignName) {
    const names = campaignName.split(',').map((s) => s.trim()).filter(Boolean)
    if (names.length) query = query.in('campaign_name', names)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}
