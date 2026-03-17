import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    if (req.headers.get('x-vercel-cron') !== '1') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const { data: accounts, error } = await supabaseAdmin
    .from('meta_ad_accounts')
    .select('account_id, project_id')
    .eq('is_active', true)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const results = []

  for (const account of accounts ?? []) {
    try {
      const res = await fetch(`${baseUrl}/api/meta/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: account.project_id, accountId: account.account_id }),
      })
      const data = await res.json() as Record<string, unknown>
      results.push({ account_id: account.account_id, ...data })
    } catch (err) {
      results.push({
        account_id: account.account_id,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  return NextResponse.json({ success: true, results })
}
