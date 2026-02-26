import type { PersonSummary, TaskLoad, GoalStatus } from '../types'

interface PersonRowProps {
  person: PersonSummary
  taskLoad: TaskLoad
  onPersonClick?: () => void
  isLast?: boolean
}

function formatRelativeTime(isoString: string): string {
  const now = new Date()
  const date = new Date(isoString)
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffHours / 24)

  if (diffHours < 1) return 'Now'
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays === 1) return '1d'
  if (diffDays < 30) return `${diffDays}d`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const GOAL_DISPLAY: Record<GoalStatus, { label: string; className: string }> = {
  on_goal: { label: 'On goal', className: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' },
  off_goal: { label: 'Off goal', className: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20' },
}

const LOAD_DISPLAY: Record<TaskLoad, { label: string; symbol: string; className: string }> = {
  above: { label: 'Above', symbol: '▲', className: 'text-amber-600 dark:text-amber-400 font-medium' },
  average: { label: 'Avg', symbol: '—', className: 'text-zinc-400 dark:text-zinc-500' },
  below: { label: 'Below', symbol: '▼', className: 'text-sky-600 dark:text-sky-400 font-medium' },
}

export function PersonRow({ person, taskLoad, onPersonClick, isLast }: PersonRowProps) {
  const displayName = person.name ?? person.phone
  const isDormant = person.status === 'dormant'
  const hasNoTasks = person.taskCounts.total === 0
  const load = LOAD_DISPLAY[taskLoad]

  return (
    <button
      onClick={onPersonClick}
      className={`
        w-full text-left
        ${!isLast ? 'border-b border-zinc-100 dark:border-zinc-800/50' : ''}
        hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400
        transition-colors duration-100
        ${isDormant ? 'opacity-35' : ''}
      `}
    >
      <div className="grid grid-cols-[1fr_minmax(100px,auto)_64px_48px_48px_48px_48px_48px_72px_56px] items-center gap-x-2 px-5 h-12">
        {/* Name + aliases */}
        <div className="flex items-baseline gap-2 min-w-0 overflow-hidden">
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
            {displayName}
          </span>
          {person.aliases.length > 0 && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500 truncate hidden sm:inline">
              {person.aliases.join(', ')}
            </span>
          )}
        </div>

        {/* Role */}
        <div className="text-xs text-zinc-400 dark:text-zinc-500 truncate text-left">
          {person.role ?? '—'}
        </div>

        {/* Goal status */}
        <div className="flex justify-center">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${GOAL_DISPLAY[person.goalStatus].className}`}>
            {GOAL_DISPLAY[person.goalStatus].label}
          </span>
        </div>

        {/* Total */}
        <div className="text-right">
          {hasNoTasks ? (
            <span className="text-xs text-zinc-300 dark:text-zinc-600">—</span>
          ) : (
            <span
              className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 tabular-nums"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {person.taskCounts.total}
            </span>
          )}
        </div>

        {/* High */}
        <div className="text-right">
          <span
            className={`text-sm tabular-nums ${
              person.taskCounts.high > 0
                ? 'font-semibold text-amber-600 dark:text-amber-400'
                : 'text-zinc-300 dark:text-zinc-600'
            }`}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {person.taskCounts.high}
          </span>
        </div>

        {/* Medium */}
        <div className="text-right">
          <span
            className={`text-sm tabular-nums ${
              person.taskCounts.medium > 0
                ? 'text-zinc-600 dark:text-zinc-300'
                : 'text-zinc-300 dark:text-zinc-600'
            }`}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {person.taskCounts.medium}
          </span>
        </div>

        {/* Low */}
        <div className="text-right">
          <span
            className={`text-sm tabular-nums ${
              person.taskCounts.low > 0
                ? 'text-zinc-500 dark:text-zinc-400'
                : 'text-zinc-300 dark:text-zinc-600'
            }`}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {person.taskCounts.low}
          </span>
        </div>

        {/* Overdue */}
        <div className="text-right">
          <span
            className={`text-sm tabular-nums ${
              person.taskCounts.overdue > 0
                ? 'font-semibold text-red-600 dark:text-red-400'
                : 'text-zinc-300 dark:text-zinc-600'
            }`}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {person.taskCounts.overdue}
          </span>
        </div>

        {/* vs Avg */}
        <div className="text-right">
          {hasNoTasks ? (
            <span className="text-xs text-zinc-300 dark:text-zinc-600">—</span>
          ) : (
            <span className={`text-xs ${load.className}`}>
              <span className="mr-0.5">{load.symbol}</span>
              {load.label}
            </span>
          )}
        </div>

        {/* Last activity */}
        <div className="text-right">
          <span
            className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {formatRelativeTime(person.lastActivityAt)}
          </span>
        </div>
      </div>
    </button>
  )
}
