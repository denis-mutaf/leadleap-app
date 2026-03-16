import { supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'Only PNG, JPG, WEBP and SVG allowed' },
      { status: 400 }
    )
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: 'File must be under 2MB' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()
  const path = `${id}/logo.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabaseAdmin.storage
    .from('project-logos')
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = supabaseAdmin.storage.from('project-logos').getPublicUrl(path)

  const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`

  const { error: updateError } = await supabaseAdmin
    .from('projects')
    .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ logo_url: logoUrl })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('logo_url')
    .eq('id', id)
    .single()

  if (project?.logo_url) {
    const path = project.logo_url.split('/project-logos/')[1]?.split('?')[0]
    if (path) {
      await supabaseAdmin.storage.from('project-logos').remove([path])
    }
  }

  await supabaseAdmin
    .from('projects')
    .update({ logo_url: null, updated_at: new Date().toISOString() })
    .eq('id', id)

  return new NextResponse(null, { status: 204 })
}

