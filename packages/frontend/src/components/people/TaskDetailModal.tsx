import { useMemo } from 'react'
import { X, Calendar, TrendingUp, MessageSquare } from 'lucide-react'
import type { Task, TaskMessage, TaskPriority, TaskStatus } from '../people/types'

interface TaskDetailModalProps {
  task: Task
  messages: TaskMessage[]
  onClose: () => void
  onPersonReferenceClick?: (personId: string) => void
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
    ' · ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const PRIORITY_BADGE: Record<TaskPriority, { label: string; className: string }> = {
  high: { label: 'High', className: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40' },
  medium: { label: 'Medium', className: 'bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700' },
  low: { label: 'Low', className: 'bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700' },
}

const STATUS_BADGE: Record<TaskStatus, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800/40' },
  in_progress: { label: 'In Progress', className: 'bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800/40' },
  done: { label: 'Done', className: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40' },
}

export function TaskDetailModal({ task, messages, onClose, onPersonReferenceClick }: TaskDetailModalProps) {
  const { original, related } = useMemo(() => {
    const sorted = [...messages].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    const orig = sorted.find((m) => m.isOriginal) ?? null
    const rel = sorted.filter((m) => !m.isOriginal)
    return { original: orig, related: rel }
  }, [messages])

  const priority = PRIORITY_BADGE[task.priority]
  const status = STATUS_BADGE[task.status]

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh]">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/15 dark:bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2
                className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-snug"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {task.title}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5">
                {task.summary}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
            >
              <X className="size-5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md border ${priority.className}`}>
              {priority.label}
            </span>
            <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md border ${status.className}`}>
              {status.label}
            </span>
            {task.isOverdue && (
              <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-md border bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/40">
                Overdue
              </span>
            )}
            {task.dueDate && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-500 dark:text-zinc-400 rounded-md border border-zinc-200 dark:border-zinc-700">
                <Calendar className="size-3" strokeWidth={1.5} />
                {formatDate(task.dueDate)}
              </span>
            )}
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-400 dark:text-zinc-500 rounded-md border border-zinc-200 dark:border-zinc-700"
              title="AI confidence"
            >
              <TrendingUp className="size-3" strokeWidth={1.5} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {Math.round(task.confidence * 100)}%
              </span>
              confidence
            </span>
          </div>

          <p className="text-xs text-zinc-300 dark:text-zinc-600 mt-3">
            {task.sourceReference} · Created {formatDate(task.createdAt)}
          </p>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Original message */}
          {original && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="size-4 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} />
                <h3
                  className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Original Message
                </h3>
              </div>
              <MessageCard
                message={original}
                isOriginal
                onPersonReferenceClick={onPersonReferenceClick}
              />
            </section>
          )}

          {/* Related messages */}
          {related.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="size-4 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} />
                <h3
                  className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Related Messages
                </h3>
                <span className="text-xs text-zinc-300 dark:text-zinc-600">{related.length}</span>
              </div>
              <div className="space-y-2.5">
                {related.map((msg) => (
                  <MessageCard
                    key={msg.id}
                    message={msg}
                    onPersonReferenceClick={onPersonReferenceClick}
                  />
                ))}
              </div>
            </section>
          )}

          {/* No messages state */}
          {!original && related.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm text-zinc-400 dark:text-zinc-500">No messages linked to this task.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MessageCard({
  message,
  isOriginal,
  onPersonReferenceClick,
}: {
  message: TaskMessage
  isOriginal?: boolean
  onPersonReferenceClick?: (personId: string) => void
}) {
  return (
    <div className={`rounded-xl border p-4 ${
      isOriginal
        ? 'border-sky-200 dark:border-sky-900/40 bg-sky-50/50 dark:bg-sky-950/10'
        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
    }`}>
      {/* Sender + meta */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
            {message.sender}
          </span>
          <span className="text-xs text-zinc-300 dark:text-zinc-600 shrink-0">·</span>
          <span className="text-xs text-zinc-400 dark:text-zinc-500 truncate">
            {message.source}
          </span>
        </div>
        <span
          className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0 tabular-nums"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {formatDateTime(message.timestamp)}
        </span>
      </div>

      {/* Content */}
      <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
        {message.content}
      </p>

      {/* Person references */}
      {message.personReferences.length > 0 && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/50">
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">Referenced:</span>
          <div className="flex flex-wrap gap-1.5">
            {message.personReferences.map((ref, i) => (
              ref.personId ? (
                <button
                  key={i}
                  onClick={() => onPersonReferenceClick?.(ref.personId!)}
                  className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30 rounded-md hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-colors"
                >
                  {ref.name}
                </button>
              ) : (
                <span
                  key={i}
                  className="inline-flex items-center px-2 py-0.5 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-md"
                >
                  {ref.name}
                </span>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
