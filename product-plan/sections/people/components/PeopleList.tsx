import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import type {
  PeopleProps,
  PeopleFilter,
  PeopleSortBy,
  PersonSummary,
  TaskLoad,
} from '../types'
import { PersonRow } from './PersonRow'

function matchesSearch(person: PersonSummary, query: string): boolean {
  const q = query.toLowerCase()
  return (
    (person.name?.toLowerCase().includes(q) ?? false) ||
    person.phone.includes(q) ||
    (person.email?.toLowerCase().includes(q) ?? false) ||
    (person.role?.toLowerCase().includes(q) ?? false) ||
    (person.function?.toLowerCase().includes(q) ?? false) ||
    person.aliases.some((a) => a.toLowerCase().includes(q))
  )
}

function sortPeople(people: PersonSummary[], sortBy: PeopleSortBy): PersonSummary[] {
  const sorted = [...people]
  switch (sortBy) {
    case 'name':
      return sorted.sort((a, b) => {
        const nameA = (a.name ?? a.phone).toLowerCase()
        const nameB = (b.name ?? b.phone).toLowerCase()
        return nameA.localeCompare(nameB)
      })
    case 'workload':
      return sorted.sort((a, b) => b.taskCounts.total - a.taskCounts.total)
    case 'priority_risk':
      return sorted.sort(
        (a, b) =>
          b.taskCounts.high + b.taskCounts.overdue -
          (a.taskCounts.high + a.taskCounts.overdue)
      )
    case 'default':
    default:
      return sorted.sort((a, b) => {
        if (b.taskCounts.overdue !== a.taskCounts.overdue)
          return b.taskCounts.overdue - a.taskCounts.overdue
        if (b.taskCounts.high !== a.taskCounts.high)
          return b.taskCounts.high - a.taskCounts.high
        if (b.taskCounts.total !== a.taskCounts.total)
          return b.taskCounts.total - a.taskCounts.total
        const nameA = (a.name ?? a.phone).toLowerCase()
        const nameB = (b.name ?? b.phone).toLowerCase()
        return nameA.localeCompare(nameB)
      })
  }
}

function computeTaskLoad(total: number, average: number): TaskLoad {
  if (total === 0) return 'below'
  const lowerBound = average * 0.9
  const upperBound = average * 1.1
  if (total > upperBound) return 'above'
  if (total < lowerBound) return 'below'
  return 'average'
}

const SORT_OPTIONS: { value: PeopleSortBy; label: string }[] = [
  { value: 'default', label: 'Urgency' },
  { value: 'name', label: 'Name' },
  { value: 'workload', label: 'Workload' },
  { value: 'priority_risk', label: 'Priority' },
]

export function PeopleList({
  people,
  onPersonClick,
  onSearch,
  onFilterChange,
  onSortChange,
}: PeopleProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<PeopleFilter>('active')
  const [sortBy, setSortBy] = useState<PeopleSortBy>('default')

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    onSearch?.(query)
  }

  const handleFilter = (f: PeopleFilter) => {
    setFilter(f)
    onFilterChange?.(f)
  }

  const handleSort = (s: PeopleSortBy) => {
    setSortBy(s)
    onSortChange?.(s)
  }

  const averageTaskCount = useMemo(() => {
    const activePeopleWithTasks = people.filter((p) => p.status === 'active' && p.taskCounts.total > 0)
    if (activePeopleWithTasks.length === 0) return 0
    const sum = activePeopleWithTasks.reduce((acc, p) => acc + p.taskCounts.total, 0)
    return sum / activePeopleWithTasks.length
  }, [people])

  const visiblePeople = useMemo(() => {
    let result = people
    if (filter === 'active') {
      result = result.filter((p) => p.status === 'active')
    }
    if (searchQuery.trim()) {
      result = result.filter((p) => matchesSearch(p, searchQuery.trim()))
    }
    return sortPeople(result, sortBy)
  }, [people, filter, searchQuery, sortBy])

  const activeCount = people.filter((p) => p.status === 'active').length
  const totalTasks = people.reduce((sum, p) => sum + p.taskCounts.total, 0)
  const totalHigh = people.reduce((sum, p) => sum + p.taskCounts.high, 0)
  const totalOverdue = people.reduce((sum, p) => sum + p.taskCounts.overdue, 0)

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1
              className="text-xl font-bold text-zinc-900 dark:text-zinc-100"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              People
            </h1>
            <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
              Management overview for your team
            </p>
          </div>
          <div className="flex items-center border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm overflow-hidden">
            <button
              onClick={() => handleFilter('active')}
              className={`px-3.5 py-1.5 transition-colors ${
                filter === 'active'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium'
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => handleFilter('all')}
              className={`px-3.5 py-1.5 transition-colors ${
                filter === 'all'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium'
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              All
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Active People" value={activeCount} />
          <StatCard label="Total Tasks" value={totalTasks} color="sky" />
          <StatCard label="High Priority" value={totalHigh} color="amber" />
          <StatCard label="Overdue" value={totalOverdue} color="red" />
        </div>

        {/* Search + sort */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400 dark:text-zinc-500"
              strokeWidth={1.5}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name, role, phone, email..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-colors"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => handleSort(e.target.value as PeopleSortBy)}
            className="text-sm text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer shrink-0"
          >
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>Sort: {label}</option>
            ))}
          </select>
        </div>

        {/* People table card */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_minmax(100px,auto)_64px_48px_48px_48px_48px_48px_72px_56px] items-center gap-x-2 px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/30">
            <span className="text-[11px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              Name
            </span>
            <span className="text-[11px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500 text-left">
              Role
            </span>
            <span className="text-[11px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500 text-center">
              Goal
            </span>
            <span className="text-[11px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500 text-right">
              All
            </span>
            <span className="text-[11px] font-medium uppercase tracking-widest text-amber-500/70 dark:text-amber-500/50 text-right">
              High
            </span>
            <span className="text-[11px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500 text-right">
              Med
            </span>
            <span className="text-[11px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500 text-right">
              Low
            </span>
            <span className="text-[11px] font-medium uppercase tracking-widest text-red-400/70 dark:text-red-400/50 text-right">
              Due
            </span>
            <span className="text-[11px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500 text-right">
              vs Avg
            </span>
            <span className="text-[11px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500 text-right">
              Last
            </span>
          </div>

          {/* Rows */}
          {visiblePeople.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <p className="text-sm text-zinc-400 dark:text-zinc-500">
                {searchQuery ? 'No people match your search.' : 'No people found.'}
              </p>
            </div>
          ) : (
            visiblePeople.map((person, i) => (
              <PersonRow
                key={person.id}
                person={person}
                taskLoad={computeTaskLoad(person.taskCounts.total, averageTaskCount)}
                onPersonClick={() => onPersonClick?.(person.id)}
                isLast={i === visiblePeople.length - 1}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color?: 'sky' | 'amber' | 'red' }) {
  const valueColor = {
    sky: 'text-sky-600 dark:text-sky-400',
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
