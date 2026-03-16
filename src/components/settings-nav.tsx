'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const settingsNav = [{ href: '/settings/projects', label: 'Проекты' }]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1">
      {settingsNav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`px-3 h-8 flex items-center text-sm rounded-md transition-colors
            ${
              pathname.startsWith(item.href)
                ? 'bg-accent text-accent-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}

