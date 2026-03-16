import { supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { ManagerStats } from '@/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }

  const { data: managers, error: mErr } = await supabaseAdmin
    .from('managers')
    .select('*')
    .eq('project_id', projectId)

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 })

  const { data: evaluations, error: eErr } = await supabaseAdmin
    .from('evaluations')
    .select('manager_id, score_greeting, score_needs, score_presentation, score_objections, score_closing, score_total')
    .eq('project_id', projectId)

  if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 })

  const evals = evaluations ?? []

  const round1 = (n: number) => Math.round(n * 10) / 10

  const stats: ManagerStats[] = (managers ?? [])
    .map((manager) => {
      const managerEvals = evals.filter((e) => e.manager_id === manager.id)
      const total_calls = managerEvals.length

      if (total_calls === 0) return null

      const sum = (key: keyof (typeof managerEvals)[number]) =>
        managerEvals.reduce((s, e) => s + (e[key] as number), 0)

      const avg = (key: keyof (typeof managerEvals)[number]) =>
        round1(total_calls > 0 ? sum(key) / total_calls : 0)

      return {
        manager,
        total_calls,
        avg_score: avg('score_total'),
        avg_score_greeting: avg('score_greeting'),
        avg_score_needs: avg('score_needs'),
        avg_score_presentation: avg('score_presentation'),
        avg_score_objections: avg('score_objections'),
        avg_score_closing: avg('score_closing'),
      }
    })
    .filter((s): s is ManagerStats => s !== null)
    .sort((a, b) => b.avg_score - a.avg_score)

  return NextResponse.json(stats)
}
