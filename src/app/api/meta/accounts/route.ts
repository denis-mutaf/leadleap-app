import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('meta_ad_accounts')
    .select('id, account_id, account_name, account_currency, is_active, created_at')
    .eq('project_id', projectId)
    .eq('is_active', true)
    .order('account_name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}
