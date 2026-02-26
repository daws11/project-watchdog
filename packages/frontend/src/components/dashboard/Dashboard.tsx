import { ChevronRight, TrendingUp, TrendingDown, Minus, AlertTriangle, Target } from 'lucide-react'
import type {
  DashboardProps,
  DashboardKpi,
  KpiColor,
  TrendDirection,
  AttentionPerson,
  ActivityEvent,
  ActivityEventType,
  GoalAlignmentSummary,
} from './types'

function relativeTime(iso: string): string {
  const now = new Date()
  const then = new Date(iso)
  const diffMs = now.getTime() - then.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay === 1) return 'Yesterday'
  if (diffDay < 7) return `${diffDay}d ago`
  return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const KPI_VALUE_COLOR: Record<KpiColor, string> = {
  sky: 'text-sky-600 dark:text-sky-400',
  amber: 'text-amber-500 dark:text-amber-400',
  red: 'text-red-500 dark:text-red-400',
  default: 'text-zinc-900 dark:text-zinc-100',
}

const TREND_ICON: Record<TrendDirection, typeof TrendingUp> = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
}

const ACTIVITY_STYLES: Record<ActivityEventType, string> = {
  processing: 'bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800/40',
  task: 'bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800/40',
  problem: 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/40',
  source: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40',
  identity: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40',
}

const ACTIVITY_LABELS: Record<ActivityEventType, string> = {
  processing: 'Processing',
  task: 'Task',
  problem: 'Problem',
  source: 'Source',
  identity: 'Identity',
}

export function Dashboard({
  kpis,
  goalAlignment,
  attentionPeople,
  activityFeed,
  onNavigate,
  onPersonClick,
}: DashboardProps) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-6 space-y-6" style={{ fontFamily: "'Inter', sans-serif" }}>
        {/* Header */}
        <div>
          <h1
            className="text-xl font-bold text-zinc-900 dark:text-zinc-100"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Dashboard
          </h1>
          <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
            Management overview for your team
          </p>
        </div>

        {/* KPI cards row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {kpis.map((kpi) => (
            <KpiCard
              key={kpi.id}
              kpi={kpi}
              onClick={() => onNavigate?.(kpi.linkTo, kpi.linkFilter)}
            />
          ))}
          <GoalAlignmentCard
            goalAlignment={goalAlignment}
            onNavigate={onNavigate}
          />
        </div>

        {/* Two-column layout: Attention + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Attention Needed */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="size-4 text-amber-500 dark:text-amber-400" strokeWidth={1.5} />
                <h2
                  className="text-sm font-bold text-zinc-900 dark:text-zinc-100"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Attention Needed
                </h2>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">{attentionPeople.length}</span>
              </div>
              <button
                onClick={() => onNavigate?.(goalAlignment.linkTo, goalAlignment.linkFilterOffGoal)}
                className="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
              >
                View all
              </button>
            </div>

            {attentionPeople.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Target className="size-8 text-emerald-300 dark:text-emerald-700 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-sm text-zinc-400 dark:text-zinc-500">Everyone is on goal</p>
              </div>
            ) : (
              <div>
                {attentionPeople.map((person, i) => (
                  <AttentionRow
                    key={person.personId}
                    person={person}
                    isLast={i === attentionPeople.length - 1}
                    onClick={() => onPersonClick?.(person.personId)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2
                className="text-sm font-bold text-zinc-900 dark:text-zinc-100"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Recent Activity
              </h2>
            </div>

            {activityFeed.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm text-zinc-400 dark:text-zinc-500">No recent activity</p>
              </div>
            ) : (
              <div>
                {activityFeed.map((event, i) => (
                  <ActivityRow
                    key={event.id}
                    event={event}
                    isLast={i === activityFeed.length - 1}
                    onClick={() => onNavigate?.(event.linkTo)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── KPI Card ── */

function KpiCard({ kpi, onClick }: { kpi: DashboardKpi; onClick?: () => void }) {
  const TrendIcon = TREND_ICON[kpi.trendDirection]
  const valueColor = KPI_VALUE_COLOR[kpi.color]

  const trendColor =
    kpi.trendDirection === 'up' && (kpi.color === 'red' || kpi.color === 'amber')
      ? 'text-red-500 dark:text-red-400'
      : kpi.trendDirection === 'down' && (kpi.color === 'red' || kpi.color === 'amber')
        ? 'text-emerald-500 dark:text-emerald-400'
        : kpi.trendDirection === 'up'
          ? 'text-zinc-400 dark:text-zinc-500'
          : kpi.trendDirection === 'down'
            ? 'text-emerald-500 dark:text-emerald-400'
            : 'text-zinc-300 dark:text-zinc-600'

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 text-left transition-all hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{kpi.label}</p>
        <ChevronRight className="size-3.5 text-zinc-300 dark:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <p
          className={`text-2xl font-bold tabular-nums ${valueColor}`}
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {kpi.value}
        </p>
        {kpi.trend !== '0' && (
          <span className={`flex items-center gap-0.5 text-xs ${trendColor}`}>
            <TrendIcon className="size-3" strokeWidth={1.5} />
            {kpi.trend}
          </span>
        )}
      </div>
    </button>
  )
}

/* ── Goal Alignment Card ── */

function GoalAlignmentCard({
  goalAlignment,
  onNavigate,
}: {
  goalAlignment: GoalAlignmentSummary
  onNavigate?: (path: string, filter?: string) => void
}) {
  const offGoalPct = goalAlignment.total > 0
    ? Math.round((goalAlignment.offGoal / goalAlignment.total) * 100)
    : 0

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">People on Goal</p>
      <div className="flex items-baseline gap-1.5 mt-1">
        <button
          type="button"
          onClick={() => onNavigate?.(goalAlignment.linkTo, goalAlignment.linkFilterOnGoal)}
          className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded"
        >
          <span
            className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {goalAlignment.onGoal}
          </span>
        </button>
        <span className="text-zinc-300 dark:text-zinc-600 text-lg">/</span>
        <button
          type="button"
          onClick={() => onNavigate?.(goalAlignment.linkTo, goalAlignment.linkFilterOffGoal)}
          className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded"
        >
          <span
            className={`text-lg font-bold tabular-nums ${goalAlignment.offGoal > 0 ? 'text-red-500 dark:text-red-400' : 'text-zinc-400 dark:text-zinc-500'}`}
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {goalAlignment.offGoal}
          </span>
        </button>
        <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-0.5">off</span>
      </div>
      {goalAlignment.offGoal > 0 && (
        <div className="mt-2.5">
          <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 dark:bg-emerald-400 transition-all"
              style={{ width: `${100 - offGoalPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Attention Row ── */

function AttentionRow({
  person,
  isLast,
  onClick,
}: {
  person: AttentionPerson
  isLast?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex items-center gap-4 px-5 py-3.5 ${
        !isLast ? 'border-b border-zinc-100 dark:border-zinc-800/40' : ''
      } hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400`}
    >
      {/* Off-goal indicator */}
      <span className="size-2 rounded-full bg-red-500 dark:bg-red-400 shrink-0" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
            {person.name}
          </span>
          <span className="text-xs text-zinc-400 dark:text-zinc-500 truncate shrink-0">
            {person.role}
          </span>
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
          {person.misalignedGoal}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <span
          className="text-xs tabular-nums text-zinc-400 dark:text-zinc-500"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
          title={`${person.goalMatchCount} of ${person.taskCount} tasks align with goals`}
        >
          {person.goalMatchCount}/{person.taskCount}
        </span>
      </div>

      <ChevronRight className="size-3.5 text-zinc-300 dark:text-zinc-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
    </button>
  )
}

/* ── Activity Row ── */

function ActivityRow({
  event,
  isLast,
  onClick,
}: {
  event: ActivityEvent
  isLast?: boolean
  onClick?: () => void
}) {
  const style = ACTIVITY_STYLES[event.type]
  const label = ACTIVITY_LABELS[event.type]

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 px-5 py-3.5 ${
        !isLast ? 'border-b border-zinc-100 dark:border-zinc-800/40' : ''
      } hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400`}
    >
      <span
        className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md border shrink-0 ${style}`}
      >
        {label}
      </span>
      <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 truncate min-w-0">
        {event.description}
      </span>
      <span
        className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0 tabular-nums"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {relativeTime(event.timestamp)}
      </span>
    </button>
  )
}
