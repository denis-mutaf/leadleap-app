'use client'
import { useParams } from 'next/navigation'
import { TopmagDashboard } from '@/components/dashboards/topmag'
import { GenericAdsDashboard } from '@/components/dashboards/generic'

export default function AdsDashboardPage() {
  const { slug } = useParams()
  if (slug === 'topmag') return <TopmagDashboard />
  return <GenericAdsDashboard />
}

