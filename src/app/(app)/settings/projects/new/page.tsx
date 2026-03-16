'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NewProjectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/settings/projects')
  }, [router])

  return null
}
