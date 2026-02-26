import { LogOut, User } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ')

interface UserMenuProps {
  user: {
    name: string
    email?: string
    avatarUrl?: string
  }
  collapsed?: boolean
  onLogout?: () => void
  onProfile?: () => void
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function UserMenu({ user, collapsed = false, onLogout, onProfile }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  return (
    <div ref={menuRef} className="relative px-2 pb-3">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm transition-colors',
          'hover:bg-zinc-100 dark:hover:bg-zinc-800',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500',
          collapsed && 'justify-center px-2'
        )}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="size-7 rounded-full shrink-0 object-cover"
          />
        ) : (
          <span className="flex items-center justify-center size-7 rounded-full bg-sky-100 text-sky-700 text-xs font-semibold shrink-0 dark:bg-sky-900 dark:text-sky-300">
            {getInitials(user.name)}
          </span>
        )}
        {!collapsed && (
          <span className="truncate text-zinc-700 dark:text-zinc-300 font-medium">
            {user.name}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-2 right-2 mb-1 rounded-md border border-zinc-200 bg-white py-1 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          {!collapsed && user.email && (
            <div className="px-3 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {user.email}
            </div>
          )}
          <button
            onClick={() => {
              onProfile?.()
              setOpen(false)
            }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <User className="size-4" strokeWidth={1.5} />
            Profile
          </button>
          <button
            onClick={() => {
              onLogout?.()
              setOpen(false)
            }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <LogOut className="size-4" strokeWidth={1.5} />
            Log out
          </button>
        </div>
      )}
    </div>
  )
}
