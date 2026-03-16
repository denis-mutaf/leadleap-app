import { supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('project_integrations')
    .select('*')
    .eq('project_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { service, credentials, settings } = body

  if (!service) {
    return NextResponse.json({ error: 'service is required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('project_integrations')
    .upsert(
      {
        project_id: id,
        service,
        credentials: credentials ?? {},
        settings: settings ?? {},
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'project_id,service' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const service = searchParams.get('service')

  if (!service) {
    return NextResponse.json({ error: 'service query param is required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('project_integrations')
    .delete()
    .eq('project_id', id)
    .eq('service', service)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}

