import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface DateRangePickerProps {
  from: string
  to: string
  onFromChange: (v: string) => void
  onToChange: (v: string) => void
  taskDates: Set<string>
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function formatShort(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function todayStr() {
  const n = new Date()
  return toDateStr(n.getFullYear(), n.getMonth(), n.getDate())
}

export function DateRangePicker({ from, to, onFromChange, onToChange, taskDates }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(() => {
    if (from) return new Date(from + 'T00:00:00').getFullYear()
    return new Date().getFullYear()
  })
  const [viewMonth, setViewMonth] = useState(() => {
    if (from) return new Date(from + 'T00:00:00').getMonth()
    return new Date().getMonth()
  })
  const [selectingTo, setSelectingTo] = useState(false)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const dropdownWidth = 280
    let left = rect.right - dropdownWidth
    if (left < 8) left = 8
    setDropdownPos({ top: rect.bottom + 6, left })
  }, [])

  useEffect(() => {
    if (!open) return
    updatePosition()
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false)
        setSelectingTo(false)
      }
    }
    document.addEventListener('mousedown', handler)
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      document.removeEventListener('mousedown', handler)
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open, updatePosition])

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  const handleDayClick = (dateStr: string) => {
    if (!from || (from && to) || !selectingTo) {
      onFromChange(dateStr)
      onToChange('')
      setSelectingTo(true)
    } else {
      if (dateStr < from) {
        onFromChange(dateStr)
        onToChange('')
      } else {
        onToChange(dateStr)
        setSelectingTo(false)
        setOpen(false)
      }
    }
  }

  const clearDates = () => {
    onFromChange('')
    onToChange('')
    setSelectingTo(false)
    setOpen(false)
  }

  const goToToday = () => {
    const now = new Date()
    setViewYear(now.getFullYear())
    setViewMonth(now.getMonth())
  }

  // Build calendar grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth)

  const cells: { day: number; dateStr: string; currentMonth: boolean }[] = []

  // Previous month padding
  if (firstDay > 0) {
    const pm = viewMonth === 0 ? 11 : viewMonth - 1
    const py = viewMonth === 0 ? viewYear - 1 : viewYear
    const pmDays = getDaysInMonth(py, pm)
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = pmDays - i
      cells.push({ day: d, dateStr: toDateStr(py, pm, d), currentMonth: false })
    }
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, dateStr: toDateStr(viewYear, viewMonth, d), currentMonth: true })
  }

  // Next month padding to fill rows
  const totalRows = Math.ceil(cells.length / 7)
  const totalCells = totalRows * 7
  const nm = viewMonth === 11 ? 0 : viewMonth + 1
  const ny = viewMonth === 11 ? viewYear + 1 : viewYear
  for (let d = 1; cells.length < totalCells; d++) {
    cells.push({ day: d, dateStr: toDateStr(ny, nm, d), currentMonth: false })
  }

  const today = todayStr()
  const hasValue = from || to

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 text-xs border rounded-lg transition-colors shrink-0 ${
          open
            ? 'border-sky-400 ring-2 ring-sky-500/20 bg-white dark:bg-zinc-900'
            : hasValue
              ? 'border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-300'
              : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800'
        }`}
      >
        <Calendar className="size-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" strokeWidth={1.5} />
        {hasValue ? (
          <span>{from ? formatShort(from) : '...'} — {to ? formatShort(to) : '...'}</span>
        ) : (
          <span className="text-zinc-400 dark:text-zinc-500">Date range</span>
        )}
      </button>

      {/* Dropdown calendar (portal) */}
      {open && dropdownPos && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] w-[280px] bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-4"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
        >
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors"
            >
              <ChevronLeft className="size-4" strokeWidth={1.5} />
            </button>
            <span
              className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors"
            >
              <ChevronRight className="size-4" strokeWidth={1.5} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-0.5">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500 py-1.5">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {cells.map(({ day, dateStr, currentMonth }, i) => {
              const hasTask = taskDates.has(dateStr)
              const isFrom = dateStr === from
              const isTo = dateStr === to
              const selected = isFrom || isTo
              const inRange = from && to && dateStr > from && dateStr < to
              const isToday = dateStr === today

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleDayClick(dateStr)}
                  className={`
                    relative flex flex-col items-center justify-center h-9 text-xs transition-colors
                    ${isFrom ? 'rounded-l-lg' : ''}
                    ${isTo ? 'rounded-r-lg' : ''}
                    ${selected && !inRange ? 'rounded-lg' : ''}
                    ${!currentMonth
                      ? 'text-zinc-300 dark:text-zinc-600 hover:text-zinc-400 dark:hover:text-zinc-500'
                      : selected
                        ? 'bg-sky-500 dark:bg-sky-600 text-white font-semibold'
                        : inRange
                          ? 'bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300'
                          : isToday
                            ? 'font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/20'
                            : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }
                  `}
                >
                  <span className="leading-none">{day}</span>
                  {hasTask && currentMonth && (
                    <span
                      className={`absolute bottom-1 size-1 rounded-full ${
                        selected
                          ? 'bg-white/80'
                          : 'bg-sky-500 dark:bg-sky-400'
                      }`}
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* Selecting hint */}
          {from && !to && selectingTo && (
            <p className="text-center text-[10px] text-sky-500 dark:text-sky-400 mt-2">
              Click an end date
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={clearDates}
              className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              Clear
            </button>
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-sky-500 dark:bg-sky-400" />
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">has tasks</span>
            </div>
            <button
              type="button"
              onClick={goToToday}
              className="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
            >
              Today
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
