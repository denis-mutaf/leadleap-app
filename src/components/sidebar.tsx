'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser, useClerk } from '@clerk/nextjs'
import { motion } from 'framer-motion'
import React from 'react'
import {
  BookOpen,
  Phone,
  Users,
  Sparkles,
  BarChart2,
  Settings2,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ProjectSwitcher } from '@/components/project-switcher'
import { ThemeToggle } from '@/components/theme-toggle'

const navItems = [
  { href: '/knowledge-base', label: 'База знаний', icon: BookOpen },
  { href: '/calls', label: 'Звонки', icon: Phone },
  { href: '/managers', label: 'Менеджеры', icon: Users },
  { href: '/creatives', label: 'Креативы', icon: Sparkles },
  { href: '/ads', label: 'Реклама', icon: BarChart2 },
]

function NavLink({
  href,
  label,
  icon: Icon,
  collapsed,
  active,
}: {
  href: string
  label: string
  icon: React.ElementType
  collapsed: boolean
  active: boolean
}) {
  const content = (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-md px-2 h-9 text-sm transition-colors w-full
        ${
          active
            ? 'bg-accent text-accent-foreground font-medium'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
        }
        ${collapsed ? 'justify-center px-0 w-9' : ''}
      `}
    >
      <Icon size={16} className="shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    )
  }

  return content
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { user } = useUser()
  const { signOut } = useClerk()

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.emailAddresses?.[0]?.emailAddress?.slice(0, 2).toUpperCase() ?? 'LL'

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        animate={{ width: collapsed ? 56 : 240 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="flex flex-col h-screen border-r border-border bg-card overflow-hidden shrink-0"
      >
        <div
          className={`flex items-center h-14 px-3 gap-2 shrink-0 ${
            collapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
                <Sparkles size={13} className="text-primary-foreground" />
              </div>
              <span className="font-semibold text-sm tracking-tight">LeadLeap</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </Button>
        </div>

        <Separator />

        <div className={`py-2 shrink-0 ${collapsed ? 'px-1' : 'px-2'}`}>
          <ProjectSwitcher collapsed={collapsed} />
        </div>

        <Separator />

        <nav
          className={`flex-1 py-3 flex flex-col gap-1 overflow-y-auto ${
            collapsed ? 'px-1 items-center' : 'px-2'
          }`}
        >
          {!collapsed && (
            <span className="px-2 mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Навигация
            </span>
          )}
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              collapsed={collapsed}
              active={pathname.startsWith(item.href)}
            />
          ))}
        </nav>

        <Separator />

        <div
          className={`py-3 flex flex-col gap-1 shrink-0 ${
            collapsed ? 'px-1 items-center' : 'px-2'
          }`}
        >
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/settings"
                  className={`flex items-center justify-center rounded-md h-9 w-9 transition-colors
                    ${
                      pathname.startsWith('/settings')
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                    }`}
                >
                  <Settings2 size={16} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Настройки</TooltipContent>
            </Tooltip>
          ) : (
            <Link
              href="/settings"
              className={`flex items-center gap-3 rounded-md px-2 h-9 text-sm transition-colors
                ${
                  pathname.startsWith('/settings')
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                }`}
            >
              <Settings2 size={16} className="shrink-0" />
              <span>Настройки</span>
            </Link>
          )}

          <div className={`flex items-center gap-2 px-2 py-1 ${collapsed ? 'flex-col px-0 gap-2' : ''}`}>
            <ThemeToggle />
            {!collapsed && <div className="flex-1" />}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => signOut({ redirectUrl: '/sign-in' })}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <LogOut size={15} />
                </button>
              </TooltipTrigger>
              <TooltipContent side={collapsed ? 'right' : 'top'}>Выйти</TooltipContent>
            </Tooltip>
          </div>

          {!collapsed && (
            <div className="flex items-center gap-2 px-2 py-1 mt-1">
              <Avatar className="h-6 w-6">
                <AvatarImage src={user?.imageUrl ?? undefined} />
                <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium truncate leading-tight">
                  {user?.fullName ?? user?.emailAddresses?.[0]?.emailAddress ?? ''}
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.aside>
    </TooltipProvider>
  )
}

