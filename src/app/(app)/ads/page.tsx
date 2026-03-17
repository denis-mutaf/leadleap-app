'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProjectStore } from '@/store/project-store'

export default function AdsPage() {
  const router = useRouter()
  const activeProject = useProjectStore((s) => s.activeProject)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const slug = activeProject?.slug ?? 'generic'
    router.replace(`/ads/${slug}`)
  }, [mounted, activeProject?.slug, router])

  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-24 animate-pulse rounded bg-muted" />
    </div>
  )
}
