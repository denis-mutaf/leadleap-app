import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { fetchMetaAdAccounts, normalizeAccountId } from '@/lib/meta-api'

export async function POST(req: NextRequest) {
  const token = process.env.META_ACCESS_TOKEN
  if (!token) return NextResponse.json({ error: 'META_ACCESS_TOKEN not set' }, { status: 500 })

  const body = await req.json() as { projectId?: string }
  const { projectId } = body
  if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 })

  try {
    const raw = await fetchMetaAdAccounts(token)
    if (raw.length === 0) return NextResponse.json({ success: true, accounts_synced: 0 })

    const accounts = raw.map((row) => ({
      project_id: projectId,
      account_id: normalizeAccountId(row.account_id),
      account_name: row.name ?? row.account_id,
      account_currency: row.account_currency ?? 'USD',
      is_active: true,
    }))

    const { error, count } = await supabaseAdmin
      .from('meta_ad_accounts')
      .upsert(accounts, { onConflict: 'project_id,account_id', count: 'exact' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, accounts_synced: count ?? accounts.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
