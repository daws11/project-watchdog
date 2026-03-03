import {
  LayoutDashboard,
  Users,
  ListChecks,
  FolderKanban,
  Inbox,
  Activity,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { useLocation } from 'react-router-dom'

const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ')

export interface NavigationItem {
  label: string
  href: string
  icon?: LucideIcon
}

interface MainNavProps {
  items: NavigationItem[]
  bottomItems?: NavigationItem[]
  collapsed?: boolean
  onNavigate?: (href: string) => void
}

export const defaultNavigationItems: NavigationItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'People', href: '/people', icon: Users },
  { label: 'Tasks', href: '/tasks', icon: ListChecks },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Sources', href: '/sources', icon: Inbox },
  { label: 'Processing', href: '/processing', icon: Activity },
]

export const defaultBottomItems: NavigationItem[] = [
  { label: 'Settings', href: '/settings', icon: Settings },
]

export function MainNav({ items, bottomItems, collapsed = false, onNavigate }: MainNavProps) {
  const location = useLocation()

  return (
    <nav className="flex flex-col h-full">
      <ul className="flex-1 space-y-0.5 px-2">
        {items.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            isActive={location.pathname.startsWith(item.href)}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </ul>

      {bottomItems && bottomItems.length > 0 && (
        <div className="border-t border-zinc-200 dark:border-zinc-800 px-2 pt-2">
          <ul className="space-y-0.5">
            {bottomItems.map((item) => (
              <NavItem
                key={item.href}
                item={item}
                isActive={location.pathname.startsWith(item.href)}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        </div>
      )}
    </nav>
  )
}

function NavItem({
  item,
  isActive,
  collapsed,
  onNavigate,
}: {
  item: NavigationItem
  isActive: boolean
  collapsed: boolean
  onNavigate?: (href: string) => void
}) {
  const Icon = item.icon

  return (
    <li>
      <button
        onClick={() => onNavigate?.(item.href)}
        title={collapsed ? item.label : undefined}
        className={cn(
          'flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500',
          isActive
            ? 'bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400'
            : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
          collapsed && 'justify-center px-2'
        )}
      >
        {Icon && <Icon className="size-5 shrink-0" strokeWidth={1.5} />}
        {!collapsed && <span>{item.label}</span>}
      </button>
    </li>
  )
}
