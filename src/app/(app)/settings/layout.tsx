import { SettingsNav } from '@/components/settings-nav'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-6 h-14 flex items-center gap-1 shrink-0">
        <span className="text-sm font-medium text-foreground mr-4">Settings</span>
        <SettingsNav />
      </div>
      <div className="flex-1 overflow-auto p-6">
        {children}
      </div>
    </div>
  )
}

