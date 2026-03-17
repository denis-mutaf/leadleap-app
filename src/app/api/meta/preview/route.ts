import { NextRequest, NextResponse } from 'next/server'
import { fetchMetaAdPreview } from '@/lib/meta-api'

export async function GET(req: NextRequest) {
  const token = process.env.META_ACCESS_TOKEN
  if (!token) return NextResponse.json({ error: 'META_ACCESS_TOKEN not set' }, { status: 500 })

  const { searchParams } = new URL(req.url)
  const adId = searchParams.get('adId')
  const adFormat = searchParams.get('adFormat') ?? 'MOBILE_FEED_STANDARD'

  if (!adId) return NextResponse.json({ error: 'adId is required' }, { status: 400 })

  try {
    const body = await fetchMetaAdPreview(adId, token, adFormat)
    return new NextResponse(body, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
