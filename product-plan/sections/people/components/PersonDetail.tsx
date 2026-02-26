import { useMemo, useState } from 'react'
import { ArrowLeft, Phone, Mail, Link2, Settings, Search, X } from 'lucide-react'
import type { PersonDetailProps, Task, TaskPriority, TaskStatus, TaskLoad } from '../types'
import { PersonSettings } from './PersonSettings'
import { TaskDetailModal } from './TaskDetailModal'
import { DateRangePicker } from './DateRangePicker'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function computeTaskLoad(total: number, average: number): TaskLoad {
  if (total === 0) return 'below'
  const lower = average * 0.9
  const upper = average * 1.1
  if (total > upper) return 'above'
  if (total < lower) return 'below'
  return 'average'
}

function fuzzyMatch(text: string, query: string): boolean {
  const lower = text.toLowerCase()
  const q = query.toLowerCase()
  let qi = 0
  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) qi++
  }
  return qi === q.length
}

function matchesSearch(task: Task, query: string): boolean {
  return (
    fuzzyMatch(task.title, query) ||
    fuzzyMatch(task.summary, query) ||
    fuzzyMatch(task.sourceReference, query)
  )
}

const PRIORITY_ORDER: TaskPriority[] = ['high', 'medium', 'low']

const PRIORITY_STYLE: Record<TaskPriority, { label: string; dot: string; text: string }> = {
  high: { label: 'High Priority', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  medium: { label: 'Medium Priority', dot: 'bg-zinc-400 dark:bg-zinc-500', text: 'text-zinc-600 dark:text-zinc-300' },
  low: { label: 'Low Priority', dot: 'bg-zinc-300 dark:bg-zinc-600', text: 'text-zinc-500 dark:text-zinc-400' },
}

const LOAD_DISPLAY: Record<TaskLoad, { label: string; symbol: string; className: string }> = {
  above: { label: 'Above average', symbol: '▲', className: 'text-amber-600 dark:text-amber-400' },
  average: { label: 'Average', symbol: '—', className: 'text-zinc-500 dark:text-zinc-400' },
  below: { label: 'Below average', symbol: '▼', className: 'text-sky-600 dark:text-sky-400' },
}

type PriorityFilter = 'all' | TaskPriority
type StatusFilter = 'all' | 'open' | 'in_progress' | 'overdue'

const PRIORITY_FILTERS: { value: PriorityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'overdue', label: 'Overdue' },
]

export function PersonDetail({ person, tasks, messages, averageTaskCount, onBack, onSaveSettings, onPersonReferenceClick }: PersonDetailProps) {
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const displayName = person.name ?? person.phone
  const taskLoad = computeTaskLoad(person.taskCounts.total, averageTaskCount)
  const load = LOAD_DISPLAY[taskLoad]

  const taskDueDates = useMemo(() => {
    const dates = new Set<string>()
    for (const task of tasks) {
      if (task.dueDate) dates.add(task.dueDate)
    }
    return dates
  }, [tasks])

  const hasActiveFilters = searchQuery || priorityFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo

  const clearFilters = () => {
    setSearchQuery('')
    setPriorityFilter('all')
    setStatusFilter('all')
    setDateFrom('')
    setDateTo('')
  }

  const filteredTasks = useMemo(() => {
    let result = tasks

    if (searchQuery.trim()) {
      result = result.filter((t) => matchesSearch(t, searchQuery.trim()))
    }

    if (priorityFilter !== 'all') {
      result = result.filter((t) => t.priority === priorityFilter)
    }

    if (statusFilter === 'overdue') {
      result = result.filter((t) => t.isOverdue)
    } else if (statusFilter !== 'all') {
      result = result.filter((t) => t.status === statusFilter)
    }

    if (dateFrom) {
      result = result.filter((t) => t.dueDate && t.dueDate >= dateFrom)
    }
    if (dateTo) {
      result = result.filter((t) => t.dueDate && t.dueDate <= dateTo)
    }

    return result
  }, [tasks, searchQuery, priorityFilter, statusFilter, dateFrom, dateTo])

  const tasksByPriority = useMemo(() => {
    const grouped: Record<TaskPriority, Task[]> = { high: [], medium: [], low: [] }
    for (const task of filteredTasks) {
      grouped[task.priority].push(task)
    }
    for (const priority of PRIORITY_ORDER) {
      grouped[priority].sort((a, b) => {
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
        if (a.dueDate) return -1
        if (b.dueDate) return 1
        return b.createdAt.localeCompare(a.createdAt)
      })
    }
    return grouped
  }, [filteredTasks])

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-6 space-y-6">
        {/* Header */}
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors mb-4"
          >
            <ArrowLeft className="size-4" strokeWidth={1.5} />
            Back to People
          </button>

          <div className="flex items-center gap-3">
            <h1
              className="text-xl font-bold text-zinc-900 dark:text-zinc-100"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {displayName}
            </h1>
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-1.5 rounded-lg text-zinc-300 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Person settings"
            >
              <Settings className="size-4.5" strokeWidth={1.5} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-zinc-400 dark:text-zinc-500">
            {person.role && (
              <span>{person.role}{person.function ? ` · ${person.function}` : ''}</span>
            )}
            {person.phone && (
              <span className="flex items-center gap-1.5">
                <Phone className="size-3.5" strokeWidth={1.5} />
                {person.phone}
              </span>
            )}
            {person.email && (
              <span className="flex items-center gap-1.5">
                <Mail className="size-3.5" strokeWidth={1.5} />
                {person.email}
              </span>
            )}
            {person.aliases.length > 0 && (
              <span>aka {person.aliases.join(', ')}</span>
            )}
            {person.identifiersLinked > 1 && (
              <span className="flex items-center gap-1.5">
                <Link2 className="size-3.5" strokeWidth={1.5} />
                {person.identifiersLinked} identifiers linked
              </span>
            )}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Total Tasks" value={person.taskCounts.total} />
          <StatCard label="High Priority" value={person.taskCounts.high} color="amber" />
          <StatCard label="Medium" value={person.taskCounts.medium} />
          <StatCard label="Low" value={person.taskCounts.low} />
          <StatCard label="Overdue" value={person.taskCounts.overdue} color="red" />
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex flex-col justify-between">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">vs Team Avg</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-lg font-bold ${load.className}`}>{load.symbol}</span>
              <span className={`text-sm font-medium ${load.className}`}>{load.label}</span>
            </div>
            <p className="text-xs text-zinc-300 dark:text-zinc-600 mt-0.5">
              avg {averageTaskCount.toFixed(1)} tasks
            </p>
          </div>
        </div>

        {/* Tasks section */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          {/* Card header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-baseline gap-2.5">
              <h2
                className="text-sm font-bold text-zinc-900 dark:text-zinc-100"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Tasks
              </h2>
              {hasActiveFilters && (
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {filteredTasks.length} of {tasks.length}
                </span>
              )}
            </div>
            <div className="flex items-center border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium'
                    : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1.5 transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium'
                    : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                Kanban
              </button>
            </div>
          </div>

          {/* Filters toolbar */}
          {tasks.length > 0 && (
            <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800/50 space-y-3">
              {/* Search + date range row */}
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400 dark:text-zinc-500"
                    strokeWidth={1.5}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tasks..."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                      <X className="size-3.5" strokeWidth={1.5} />
                    </button>
                  )}
                </div>

                {/* Date range */}
                <DateRangePicker
                  from={dateFrom}
                  to={dateTo}
                  onFromChange={setDateFrom}
                  onToChange={setDateTo}
                  taskDates={taskDueDates}
                />
              </div>

              {/* Filter pills row */}
              <div className="flex items-center gap-4">
                {/* Priority filter */}
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mr-1">Priority</span>
                  {PRIORITY_FILTERS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setPriorityFilter(value)}
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                        priorityFilter === value
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium'
                          : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700" />

                {/* Status filter */}
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mr-1">Status</span>
                  {STATUS_FILTERS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setStatusFilter(value)}
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                        statusFilter === value
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium'
                          : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Clear all filters */}
                {hasActiveFilters && (
                  <>
                    <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700" />
                    <button
                      onClick={clearFilters}
                      className="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
                    >
                      Clear filters
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Task content */}
          {tasks.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <p className="text-sm text-zinc-400 dark:text-zinc-500">No active tasks.</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <p className="text-sm text-zinc-400 dark:text-zinc-500">No tasks match your filters.</p>
              <button
                onClick={clearFilters}
                className="text-sm text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 mt-2 transition-colors"
              >
                Clear filters
              </button>
            </div>
          ) : viewMode === 'list' ? (
            <ListView tasksByPriority={tasksByPriority} onTaskClick={setSelectedTaskId} />
          ) : (
            <KanbanView tasksByPriority={tasksByPriority} onTaskClick={setSelectedTaskId} />
          )}
        </div>
      </div>

      {/* Task detail modal */}
      {selectedTaskId && (() => {
        const task = tasks.find((t) => t.id === selectedTaskId)
        if (!task) return null
        const taskMessages = messages.filter((m) => m.taskId === selectedTaskId)
        return (
          <TaskDetailModal
            task={task}
            messages={taskMessages}
            onClose={() => setSelectedTaskId(null)}
            onPersonReferenceClick={onPersonReferenceClick}
          />
        )
      })()}

      {/* Settings slide-over */}
      {settingsOpen && (
        <PersonSettings
          person={person}
          onClose={() => setSettingsOpen(false)}
          onSave={(data) => onSaveSettings?.(person.id, data)}
        />
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color?: 'amber' | 'red' }) {
  const valueColor = {
    amber: 'text-amber-500 dark:text-amber-400',
    red: 'text-red-500 dark:text-red-400',
  }[color ?? ''] ?? 'text-zinc-900 dark:text-zinc-100'

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      <p
        className={`text-2xl font-bold mt-1 tabular-nums ${valueColor}`}
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {value}
      </p>
    </div>
  )
}

/* ── List View ── */

function ListView({ tasksByPriority, onTaskClick }: { tasksByPriority: Record<string, Task[]>; onTaskClick?: (id: string) => void }) {
  const hasAny = PRIORITY_ORDER.some((p) => tasksByPriority[p].length > 0)
  if (!hasAny) return null

  return (
    <div>
      {PRIORITY_ORDER.map((priority) => {
        const tasks = tasksByPriority[priority]
        if (tasks.length === 0) return null
        const style = PRIORITY_STYLE[priority]

        return (
          <div key={priority}>
            <div className="flex items-center gap-2 px-5 py-2.5 bg-zinc-50/80 dark:bg-zinc-800/30 border-b border-zinc-200 dark:border-zinc-800">
              <span className={`size-2 rounded-full ${style.dot}`} />
              <span className={`text-xs font-semibold uppercase tracking-wider ${style.text}`}>
                {style.label}
              </span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">{tasks.length}</span>
            </div>
            {tasks.map((task, i) => (
              <TaskRow key={task.id} task={task} isLast={i === tasks.length - 1} onClick={() => onTaskClick?.(task.id)} />
            ))}
          </div>
        )
      })}
    </div>
  )
}

function TaskRow({ task, isLast, onClick }: { task: Task; isLast?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-5 py-3.5 ${!isLast ? 'border-b border-zinc-100 dark:border-zinc-800/40' : ''} hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <span className={`text-sm font-medium ${task.isOverdue ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
              {task.title}
            </span>
            {task.isOverdue && (
              <span className="text-[10px] font-semibold text-red-500 dark:text-red-400 uppercase tracking-wider px-1.5 py-0.5 bg-red-50 dark:bg-red-950/30 rounded">
                Overdue
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-1">
            {task.summary}
          </p>
          <p className="text-[11px] text-zinc-300 dark:text-zinc-600 mt-1">
            {task.sourceReference}
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0 text-xs text-zinc-400 dark:text-zinc-500 pt-0.5">
          {task.dueDate && (
            <span className={task.isOverdue ? 'text-red-500 dark:text-red-400 font-medium' : ''}>
              {formatDate(task.dueDate)}
            </span>
          )}
          <span
            className="tabular-nums text-zinc-300 dark:text-zinc-600"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
            title="AI confidence"
          >
            {Math.round(task.confidence * 100)}%
          </span>
        </div>
      </div>
    </button>
  )
}

/* ── Kanban View ── */

function KanbanView({ tasksByPriority, onTaskClick }: { tasksByPriority: Record<string, Task[]>; onTaskClick?: (id: string) => void }) {
  return (
    <div className="grid grid-cols-3 divide-x divide-zinc-200 dark:divide-zinc-800">
      {PRIORITY_ORDER.map((priority) => {
        const tasks = tasksByPriority[priority]
        const style = PRIORITY_STYLE[priority]

        return (
          <div key={priority} className="flex flex-col">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-50/80 dark:bg-zinc-800/30 border-b border-zinc-200 dark:border-zinc-800">
              <span className={`size-2 rounded-full ${style.dot}`} />
              <span className={`text-[11px] font-semibold uppercase tracking-wider ${style.text}`}>
                {style.label}
              </span>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{tasks.length}</span>
            </div>
            <div className="p-3 space-y-2 min-h-[120px]">
              {tasks.length === 0 ? (
                <p className="text-xs text-zinc-300 dark:text-zinc-600 text-center py-6">No tasks</p>
              ) : (
                tasks.map((task) => (
                  <KanbanCard key={task.id} task={task} onClick={() => onTaskClick?.(task.id)} />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function KanbanCard({ task, onClick }: { task: Task; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-lg border p-3.5 cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
      task.isOverdue
        ? 'border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/10'
        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
    }`}>
      <p className={`text-[13px] font-medium leading-snug ${task.isOverdue ? 'text-red-700 dark:text-red-300' : 'text-zinc-900 dark:text-zinc-100'}`}>
        {task.title}
      </p>
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5 line-clamp-2">
        {task.summary}
      </p>
      <div className="flex items-center justify-between mt-2.5 text-[11px] text-zinc-400 dark:text-zinc-500">
        {task.dueDate ? (
          <span className={task.isOverdue ? 'text-red-500 dark:text-red-400 font-medium' : ''}>
            {formatDate(task.dueDate)}
          </span>
        ) : (
          <span>No date</span>
        )}
        <span
          className="tabular-nums text-zinc-300 dark:text-zinc-600"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {Math.round(task.confidence * 100)}%
        </span>
      </div>
    </button>
  )
}
