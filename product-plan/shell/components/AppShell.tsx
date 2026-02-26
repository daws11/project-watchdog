import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import {
  MainNav,
  defaultNavigationItems,
  defaultBottomItems,
  type NavigationItem,
} from './MainNav'
import { UserMenu } from './UserMenu'

const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ')

interface AppShellProps {
  children: React.ReactNode
  navigationItems?: NavigationItem[]
  bottomItems?: NavigationItem[]
  user?: { name: string; email?: string; avatarUrl?: string }
  onNavigate?: (href: string) => void
  onLogout?: () => void
  onProfile?: () => void
}

export function AppShell({
  children,
  navigationItems = defaultNavigationItems,
  bottomItems = defaultBottomItems,
  user = { name: 'Manager' },
  onNavigate,
  onLogout,
  onProfile,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleNavigate = (href: string) => {
    onNavigate?.(href)
    setMobileOpen(false)
  }

  const sidebarContent = (collapsed: boolean) => (
    <div className="flex flex-col h-full">
      {/* Wordmark */}
      <div className={cn('px-5 py-5', collapsed && 'px-2 py-5 flex justify-center')}>
        {collapsed ? (
          <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            W
          </span>
        ) : (
          <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Watchdog
          </span>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto">
        <MainNav
          items={navigationItems}
          bottomItems={bottomItems}
          collapsed={collapsed}
          onNavigate={handleNavigate}
        />
      </div>

      {/* User Menu */}
      <UserMenu
        user={user}
        collapsed={collapsed}
        onLogout={onLogout}
        onProfile={onProfile}
      />
    </div>
  )

  return (
    <div className="@container flex h-screen bg-white dark:bg-zinc-950">
      {/* Desktop sidebar — container >= 1024px */}
      <aside className="hidden @5xl:flex @5xl:w-64 flex-col border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900 shrink-0">
        {sidebarContent(false)}
      </aside>

      {/* Tablet sidebar — container 768px–1023px */}
      <aside className="hidden @3xl:flex @5xl:hidden w-16 flex-col border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900 shrink-0">
        {sidebarContent(true)}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 @3xl:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 shadow-lg">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-3 p-1 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <X className="size-5" strokeWidth={1.5} />
            </button>
            {sidebarContent(false)}
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar — hidden at container >= 768px */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 @3xl:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1 rounded-md text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <Menu className="size-5" strokeWidth={1.5} />
          </button>
          <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Watchdog
          </span>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
