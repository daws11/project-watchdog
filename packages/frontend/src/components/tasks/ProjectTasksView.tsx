import { useMemo, useState } from 'react'
import { Search, X, ChevronDown, ChevronRight, FolderKanban } from 'lucide-react'
import type { Task, ProjectWithTasks, ProjectPerson, TaskMessage, ChatMessage, ViewMode } from './types'
import { TaskDetailModal } from '../people/TaskDetailModal'
import { DateRangePicker } from '../people/DateRangePicker'
import { ChatPanel } from './ChatPanel'

/* ── Helpers ── */

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
    fuzzyMatch(task.userName, query) ||
    fuzzyMatch(task.sourceReference, query)
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const PRIORITY_ORDER: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low']

const PRIORITY_STYLE: Record<'high' | 'medium' | 'low', { label: string; dot: string; text: string }> = {
  high: { label: 'High Priority', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  medium: { label: 'Medium Priority', dot: 'bg-zinc-400 dark:bg-zinc-500', text: 'text-zinc-600 dark:text-zinc-300' },
  low: { label: 'Low Priority', dot: 'bg-zinc-300 dark:bg-zinc-600', text: 'text-zinc-500 dark:text-zinc-400' },
}

type PriorityFilter = 'all' | 'high' | 'medium' | 'low'
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

function getHealthColor(score: number): string {
  if (score >= 80) return 'text-emerald-500 dark:text-emerald-400'
  if (score >= 60) return 'text-yellow-500 dark:text-yellow-400'
  if (score >= 40) return 'text-orange-500 dark:text-orange-400'
  return 'text-red-500 dark:text-red-400'
}

function getHealthBg(score: number): string {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 60) return 'bg-yellow-500'
  if (score >= 40) return 'bg-orange-500'
  return 'bg-red-500'
}

/* ── Main Component ── */

interface ProjectTasksViewProps {
  projects: ProjectWithTasks[]
  messages: TaskMessage[]
  chatMessages: ChatMessage[]
  viewMode?: ViewMode
  onViewModeChange?: (mode: ViewMode) => void
  onPersonClick?: (personId: string) => void
  onChatSend?: (message: string, taskContext: Task[]) => void
}

export function ProjectTasksView({
  projects,
  messages,
  chatMessages,
  viewMode = 'project',
  onViewModeChange,
  onPersonClick,
  onChatSend,
}: ProjectTasksViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [personFilter, setPersonFilter] = useState<string>('all')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(() => {
    // Default: expand all projects
    return new Set(projects.map((p) => p.id))
  })

  // Get all unique people across projects
  const allPeople = useMemo(() => {
    const peopleMap = new Map<string, ProjectPerson>()
    for (const project of projects) {
      for (const person of project.people) {
        if (!peopleMap.has(person.id)) {
          peopleMap.set(person.id, person)
        }
      }
    }
    return Array.from(peopleMap.values())
  }, [projects])

  // Get all due dates
  const taskDueDates = useMemo(() => {
    const dates = new Set<string>()
    for (const project of projects) {
      for (const task of project.tasks) {
        if (task.dueDate) dates.add(task.dueDate)
      }
    }
    return dates
  }, [projects])

  // Get all tasks count
  const totalTasks = useMemo(() => projects.reduce((sum, p) => sum + p.tasks.length, 0), [projects])

  const hasActiveFilters = searchQuery || priorityFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo || personFilter !== 'all'

  const clearFilters = () => {
    setSearchQuery('')
    setPriorityFilter('all')
    setStatusFilter('all')
    setDateFrom('')
    setDateTo('')
    setPersonFilter('all')
  }

  // Filter tasks per project
  const filterTasks = (tasks: Task[]): Task[] => {
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
    if (personFilter !== 'all') {
      result = result.filter((t) => t.userId === personFilter)
    }

    return result
  }

  // Prepare projects with filtered tasks
  const filteredProjects = useMemo(() => {
    return projects
      .map((project) => ({
        ...project,
        filteredTasks: filterTasks(project.tasks),
      }))
      .filter((project) => project.filteredTasks.length > 0)
  }, [projects, searchQuery, priorityFilter, statusFilter, dateFrom, dateTo, personFilter])

  // Calculate filtered total
  const filteredTotal = filteredProjects.reduce((sum, p) => sum + p.filteredTasks.length, 0)

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects)
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId)
    } else {
      newExpanded.add(projectId)
    }
    setExpandedProjects(newExpanded)
  }

  const expandAll = () => setExpandedProjects(new Set(filteredProjects.map((p) => p.id)))
  const collapseAll = () => setExpandedProjects(new Set())

  return (
    <div className="h-full flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-6 py-6 space-y-6">
          {/* Header */}
          <div>
            <h1
              className="text-xl font-bold text-zinc-900 dark:text-zinc-100"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Tasks
            </h1>
            <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
              Tasks grouped by project
            </p>
          </div>

          {/* Tasks card */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            {/* Card header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-baseline gap-2.5">
                <h2
                  className="text-sm font-bold text-zinc-900 dark:text-zinc-100"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Projects
                </h2>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {filteredProjects.length} projects
                </span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {hasActiveFilters ? `${filteredTotal} of ${totalTasks} tasks` : `${totalTasks} tasks`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={expandAll}
                  className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 px-2 py-1"
                >
                  Expand All
                </button>
                <button
                  onClick={collapseAll}
                  className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 px-2 py-1"
                >
                  Collapse All
                </button>
              </div>
            </div>

            {/* Filters toolbar */}
            <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800/50 space-y-3">
              {/* Search + date range + dropdowns row */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* View mode: By Priority / By Project */}
                {onViewModeChange && (
                  <div className="flex items-center border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs overflow-hidden">
                    <button
                      onClick={() => onViewModeChange('priority')}
                      className={`px-3 py-1.5 transition-colors ${
                        viewMode === 'priority'
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium'
                          : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      By Priority
                    </button>
                    <button
                      onClick={() => onViewModeChange('project')}
                      className={`px-3 py-1.5 transition-colors ${
                        viewMode === 'project'
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium'
                          : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      By Project
                    </button>
                  </div>
                )}
                <div className="flex-1 min-w-[200px] relative">
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

                <DateRangePicker
                  from={dateFrom}
                  to={dateTo}
                  onFromChange={setDateFrom}
                  onToChange={setDateTo}
                  taskDates={taskDueDates}
                />

                {/* Person filter dropdown */}
                <div className="relative">
                  <select
                    value={personFilter}
                    onChange={(e) => setPersonFilter(e.target.value)}
                    className="appearance-none text-xs text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
                  >
                    <option value="all">All People</option>
                    {allPeople.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3 text-zinc-400 pointer-events-none" strokeWidth={1.5} />
                </div>
              </div>

              {/* Filter pills row */}
              <div className="flex items-center gap-4 flex-wrap">
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

            {/* Project content */}
            {projects.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <p className="text-sm text-zinc-400 dark:text-zinc-500">No projects found.</p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <p className="text-sm text-zinc-400 dark:text-zinc-500">No tasks match your filters.</p>
                <button
                  onClick={clearFilters}
                  className="text-sm text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 mt-2 transition-colors"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredProjects.map((project) => (
                  <ProjectGroup
                    key={project.id}
                    project={project}
                    isExpanded={expandedProjects.has(project.id)}
                    onToggle={() => toggleProject(project.id)}
                    onTaskClick={setSelectedTaskId}
                    onPersonClick={onPersonClick}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat panel */}
      <ChatPanel
        messages={chatMessages}
        taskCount={filteredTotal}
        onSend={(msg) => onChatSend?.(msg, filteredProjects.flatMap((p) => p.filteredTasks))}
      />

      {/* Task detail modal */}
      {selectedTaskId && (() => {
        const task = filteredProjects.flatMap((p) => p.tasks).find((t) => t.id === selectedTaskId)
        if (!task) return null
        const taskMessages = messages.filter((m) => m.taskId === selectedTaskId)
        return (
          <TaskDetailModal
            task={task}
            messages={taskMessages}
            onClose={() => setSelectedTaskId(null)}
            onPersonReferenceClick={(personId) => {
              setSelectedTaskId(null)
              onPersonClick?.(personId)
            }}
          />
        )
      })()}
    </div>
  )
}

/* ── Project Group ── */

interface ProjectGroupProps {
  project: ProjectWithTasks & { filteredTasks: Task[] }
  isExpanded: boolean
  onToggle: () => void
  onTaskClick: (id: string) => void
  onPersonClick?: (id: string) => void
}

function ProjectGroup({ project, isExpanded, onToggle, onTaskClick, onPersonClick }: ProjectGroupProps) {
  const completedPercent = project.taskStats.total > 0
    ? Math.round((project.taskStats.done / project.taskStats.total) * 100)
    : 0

  return (
    <div className="bg-white dark:bg-zinc-900">
      {/* Project Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="size-4 text-zinc-400" strokeWidth={1.5} />
          ) : (
            <ChevronRight className="size-4 text-zinc-400" strokeWidth={1.5} />
          )}
          <FolderKanban className="size-5 text-sky-500" strokeWidth={1.5} />
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {project.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                {project.filteredTasks.length} tasks
              </span>
              <span className="text-xs text-zinc-300 dark:text-zinc-600">•</span>
              <span className={`text-xs ${getHealthColor(project.healthScore)}`}>
                Health {project.healthScore}%
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* People avatars */}
          <div className="flex items-center gap-1">
            {project.people.slice(0, 4).map((person) => (
              <button
                key={person.id}
                onClick={(e) => {
                  e.stopPropagation()
                  onPersonClick?.(person.id)
                }}
                className="size-7 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-[10px] font-medium text-white hover:ring-2 hover:ring-sky-400 transition-all"
                title={`${person.name} (${person.openTasks} open)`}
              >
                {person.name.charAt(0).toUpperCase()}
              </button>
            ))}
            {project.people.length > 4 && (
              <span className="text-xs text-zinc-400 ml-1">+{project.people.length - 4}</span>
            )}
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2 min-w-[100px]">
            <div className="flex-1 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${getHealthBg(project.healthScore)} transition-all`}
                style={{ width: `${completedPercent}%` }}
              />
            </div>
            <span className="text-[11px] text-zinc-400 w-8 text-right">{completedPercent}%</span>
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-5 pb-4">
          {/* People summary */}
          <div className="flex flex-wrap gap-2 mb-4">
            {project.people.map((person) => (
              <button
                key={person.id}
                onClick={() => onPersonClick?.(person.id)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <span className="size-5 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-[9px] font-medium text-white">
                  {person.name.charAt(0).toUpperCase()}
                </span>
                <span className="text-xs text-zinc-600 dark:text-zinc-300">{person.name}</span>
                <span className="text-[10px] text-zinc-400">
                  {person.openTasks}/{person.taskCount}
                </span>
              </button>
            ))}
          </div>

          {/* Task stats */}
          <div className="flex items-center gap-4 mb-3 text-xs">
            <span className="text-zinc-500">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{project.taskStats.open}</span> open
            </span>
            <span className="text-zinc-500">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{project.taskStats.done}</span> done
            </span>
            <span className="text-zinc-500">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{project.taskStats.blocked}</span> blocked
            </span>
          </div>

          {/* Task list */}
          <div className="space-y-1">
            {PRIORITY_ORDER.map((priority) => {
              const tasks = project.filteredTasks.filter((t) => t.priority === priority)
              if (tasks.length === 0) return null
              const style = PRIORITY_STYLE[priority]

              return (
                <div key={priority}>
                  <div className="flex items-center gap-2 py-2">
                    <span className={`size-1.5 rounded-full ${style.dot}`} />
                    <span className={`text-[11px] font-medium ${style.text}`}>
                      {style.label}
                    </span>
                    <span className="text-[11px] text-zinc-400">({tasks.length})</span>
                  </div>
                  {tasks.map((task) => (
                    <ProjectTaskRow
                      key={task.id}
                      task={task}
                      onClick={() => onTaskClick(task.id)}
                      onPersonClick={() => onPersonClick?.(task.userId)}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Project Task Row ── */

interface ProjectTaskRowProps {
  task: Task
  onClick: () => void
  onPersonClick: () => void
}

function ProjectTaskRow({ task, onClick, onPersonClick }: ProjectTaskRowProps) {
  return (
    <div
      onClick={onClick}
      className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm ${task.isOverdue ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
            {task.title}
          </span>
          {task.isOverdue && (
            <span className="text-[10px] font-medium text-red-500 dark:text-red-400 uppercase px-1.5 py-0.5 bg-red-50 dark:bg-red-950/30 rounded">
              Overdue
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
          {task.sourceReference}
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onPersonClick()
          }}
          className="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:underline transition-colors"
        >
          {task.userName}
        </button>
        {task.dueDate && (
          <span className={`text-xs ${task.isOverdue ? 'text-red-500 dark:text-red-400 font-medium' : 'text-zinc-400 dark:text-zinc-500'}`}>
            {formatDate(task.dueDate)}
          </span>
        )}
      </div>
    </div>
  )
}
