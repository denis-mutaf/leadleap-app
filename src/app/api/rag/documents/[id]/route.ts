import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data: doc } = await supabaseAdmin
    .from('documents')
    .select('storage_path')
    .eq('id', id)
    .single()

  if (doc?.storage_path) {
    await supabaseAdmin.storage.from('rag-documents').remove([doc.storage_path as string])
  }

  const { error } = await supabaseAdmin
    .from('documents')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}

