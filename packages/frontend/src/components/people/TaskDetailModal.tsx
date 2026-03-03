import { useMemo, useState, useEffect } from 'react'
import { X, Calendar, TrendingUp, MessageSquare, GitMerge, History, ArrowRightLeft, AlertCircle } from 'lucide-react'
import type { Task, TaskMessage, TaskPriority, TaskStatus } from '../people/types'

interface SimilarTask {
  task: Task & {
    id: number
    status: string
    mergedTaskIds?: number[]
    updateCount?: number
  }
  similarityScore: number
  matchType: string
}

interface TaskHistory {
  taskId: number
  previousDescription: string | null
  newDescription: string
  previousDeadline: string | null
  newDeadline: string | null
  updatedFields: string[]
  updateCount: number
  updatedAt: string
}

interface MergeHistory {
  primaryTask: Task & { mergedTaskIds?: number[] } | null
  mergedTasks: (Task & { parentTaskId?: number })[]
  isMerged: boolean
  parentTask: Task | null
}

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
  const [similarTasks, setSimilarTasks] = useState<SimilarTask[]>([])
  const [taskHistory, setTaskHistory] = useState<TaskHistory | null>(null)
  const [mergeHistory, setMergeHistory] = useState<MergeHistory | null>(null)
  const [loading, setLoading] = useState(false)
  const [mergeLoading, setMergeLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'messages' | 'history' | 'similar'>('messages')

  const { original, related } = useMemo(() => {
    const sorted = [...messages].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    const orig = sorted.find((m) => m.isOriginal) ?? null
    const rel = sorted.filter((m) => !m.isOriginal)
    return { original: orig, related: rel }
  }, [messages])

  const priority = PRIORITY_BADGE[task.priority]
  const status = STATUS_BADGE[task.status]

  // Fetch similar tasks, history, and merge history
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        // Fetch similar tasks
        const similarRes = await fetch(`/api/tasks/${task.id}/similar`)
        if (similarRes.ok) {
          const similarData = await similarRes.json()
          setSimilarTasks(similarData.similarTasks || [])
        }

        // Fetch task history
        const historyRes = await fetch(`/api/tasks/${task.id}/history`)
        if (historyRes.ok) {
          const historyData = await historyRes.json()
          setTaskHistory(historyData)
        }

        // Fetch merge history
        const mergeRes = await fetch(`/api/tasks/${task.id}/merge-history`)
        if (mergeRes.ok) {
          const mergeData = await mergeRes.json()
          setMergeHistory(mergeData)
        }
      } catch (err) {
        console.error('Error fetching task details:', err)
        setError('Failed to load task details')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [task.id])

  const handleMerge = async (taskIdToMerge: number) => {
    setMergeLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tasks/${task.id}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskIdsToMerge: [taskIdToMerge],
          strategy: 'smart_merge',
          reason: 'User initiated merge from UI'
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Failed to merge tasks')
      }

      // Refresh data after merge
      const mergeRes = await fetch(`/api/tasks/${task.id}/merge-history`)
      if (mergeRes.ok) {
        const mergeData = await mergeRes.json()
        setMergeHistory(mergeData)
      }

      // Also refresh similar tasks (the merged one should disappear)
      const similarRes = await fetch(`/api/tasks/${task.id}/similar`)
      if (similarRes.ok) {
        const similarData = await similarRes.json()
        setSimilarTasks(similarData.similarTasks || [])
      }
    } catch (err) {
      console.error('Error merging tasks:', err)
      setError(err instanceof Error ? err.message : 'Failed to merge tasks')
    } finally {
      setMergeLoading(false)
    }
  }

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
            {taskHistory && taskHistory.updateCount > 0 && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-violet-600 dark:text-violet-400 rounded-md border border-violet-200 dark:border-violet-800/40 bg-violet-50 dark:bg-violet-950/30"
                title="Task has been updated"
              >
                <History className="size-3" strokeWidth={1.5} />
                Updated {taskHistory.updateCount} time{taskHistory.updateCount > 1 ? 's' : ''}
              </span>
            )}
            {mergeHistory?.isMerged && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/30"
                title="This task is merged into another"
              >
                <GitMerge className="size-3" strokeWidth={1.5} />
                Merged
              </span>
            )}
            {mergeHistory?.mergedTasks && mergeHistory.mergedTasks.length > 0 && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-sky-600 dark:text-sky-400 rounded-md border border-sky-200 dark:border-sky-800/40 bg-sky-50 dark:bg-sky-950/30"
                title={`Merged ${mergeHistory.mergedTasks.length} task(s)`}
              >
                <GitMerge className="size-3" strokeWidth={1.5} />
                {mergeHistory.mergedTasks.length} merged
              </span>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-md border border-red-200 dark:border-red-800/40">
              <AlertCircle className="size-4" strokeWidth={1.5} />
              {error}
            </div>
          )}

          <p className="text-xs text-zinc-300 dark:text-zinc-600 mt-3">
            {task.sourceReference} · Created {formatDate(task.createdAt)}
          </p>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 mt-4 border-b border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => setActiveTab('messages')}
              className={`px-3 py-2 text-xs font-medium transition-colors relative ${
                activeTab === 'messages'
                  ? 'text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <MessageSquare className="size-3.5" strokeWidth={1.5} />
                Messages
              </span>
              {activeTab === 'messages' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500 rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-2 text-xs font-medium transition-colors relative ${
                activeTab === 'history'
                  ? 'text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <History className="size-3.5" strokeWidth={1.5} />
                History
                {taskHistory && taskHistory.updateCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 text-[10px] bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 rounded-full">
                    {taskHistory.updateCount}
                  </span>
                )}
              </span>
              {activeTab === 'history' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('similar')}
              className={`px-3 py-2 text-xs font-medium transition-colors relative ${
                activeTab === 'similar'
                  ? 'text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <ArrowRightLeft className="size-3.5" strokeWidth={1.5} />
                Similar
                {similarTasks.length > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-full">
                    {similarTasks.length}
                  </span>
                )}
              </span>
              {activeTab === 'similar' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-t-full" />
              )}
            </button>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Loading state */}
          {loading && (
            <div className="py-8 text-center">
              <div className="inline-flex items-center gap-2 text-sm text-zinc-400 dark:text-zinc-500">
                <div className="size-4 border-2 border-zinc-300 dark:border-zinc-600 border-t-transparent rounded-full animate-spin" />
                Loading task details...
              </div>
            </div>
          )}

          {/* Merged task indicator */}
          {!loading && mergeHistory?.isMerged && mergeHistory.parentTask && (
            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/20">
              <div className="flex items-start gap-3">
                <GitMerge className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                <div>
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                    This task has been merged
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                    Merged into: <span className="font-medium">{mergeHistory.parentTask.title || mergeHistory.parentTask.id}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Merged tasks list */}
          {!loading && mergeHistory?.mergedTasks && mergeHistory.mergedTasks.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <GitMerge className="size-4 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} />
                <h3
                  className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Merged Tasks
                </h3>
                <span className="text-xs text-zinc-300 dark:text-zinc-600">{mergeHistory.mergedTasks.length}</span>
              </div>
              <div className="space-y-2">
                {mergeHistory.mergedTasks.map((mergedTask) => (
                  <div
                    key={mergedTask.id}
                    className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50"
                  >
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-2">
                      {mergedTask.title || mergedTask.summary}
                    </p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                      Task #{mergedTask.id} · Status: {mergedTask.status}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* MESSAGES TAB */}
          {activeTab === 'messages' && (
            <>
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
            </>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <>
              {!loading && taskHistory && taskHistory.updateCount > 0 ? (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <History className="size-4 text-violet-500" strokeWidth={1.5} />
                    <h3
                      className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      Task Evolution History
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {/* Timeline */}
                    <div className="relative pl-6 border-l-2 border-violet-200 dark:border-violet-800/40 space-y-4">
                      {/* Current state */}
                      <div className="relative">
                        <span className="absolute -left-[25px] top-1 size-3 rounded-full bg-violet-500 border-2 border-white dark:border-zinc-900" />
                        <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800/40">
                          <p className="text-xs font-medium text-violet-700 dark:text-violet-300">
                            Current ({formatDate(taskHistory.updatedAt)})
                          </p>
                          <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-1">
                            {taskHistory.newDescription}
                          </p>
                          {taskHistory.newDeadline && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                              Deadline: {formatDate(taskHistory.newDeadline)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Previous states */}
                      {taskHistory.previousDescription && (
                        <div className="relative">
                          <span className="absolute -left-[25px] top-1 size-3 rounded-full bg-zinc-300 dark:bg-zinc-600 border-2 border-white dark:border-zinc-900" />
                          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                              Previous Version
                            </p>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 line-through mt-1">
                              {taskHistory.previousDescription}
                            </p>
                          </div>
                        </div>
                      )}

                      {taskHistory.previousDeadline && (
                        <div className="relative">
                          <span className="absolute -left-[25px] top-1 size-3 rounded-full bg-zinc-300 dark:bg-zinc-600 border-2 border-white dark:border-zinc-900" />
                          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                              Previous Deadline
                            </p>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 line-through mt-1">
                              {formatDate(taskHistory.previousDeadline)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                      <p className="text-xs text-zinc-400 dark:text-zinc-500">
                        Total updates: <span className="font-medium text-zinc-600 dark:text-zinc-400">{taskHistory.updateCount}</span>
                      </p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                        Last updated: {formatDateTime(taskHistory.updatedAt)}
                      </p>
                    </div>
                  </div>
                </section>
              ) : (
                <div className="py-8 text-center">
                  <History className="size-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-sm text-zinc-400 dark:text-zinc-500">No update history available for this task.</p>
                </div>
              )}
            </>
          )}

          {/* SIMILAR TASKS TAB */}
          {activeTab === 'similar' && (
            <>
              {!loading && similarTasks.length > 0 ? (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <ArrowRightLeft className="size-4 text-amber-500" strokeWidth={1.5} />
                    <h3
                      className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      Similar Tasks
                    </h3>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                      Potential duplicates or related tasks
                    </span>
                  </div>

                  <div className="space-y-3">
                    {similarTasks.map((similar, index) => (
                      <div
                        key={similar.task.id}
                        className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                                  similar.matchType === 'exact'
                                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                                    : similar.matchType === 'high'
                                    ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                                }`}
                              >
                                {similar.matchType} match
                              </span>
                              <span
                                className="text-[10px] text-zinc-400 dark:text-zinc-500 tabular-nums"
                                style={{ fontFamily: "'JetBrains Mono', monospace" }}
                              >
                                {Math.round(similar.similarityScore * 100)}%
                              </span>
                            </div>
                            <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-2">
                              {similar.task.description}
                            </p>
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                              Task #{similar.task.id} · Status: {similar.task.status}
                            </p>
                          </div>
                          <button
                            onClick={() => handleMerge(similar.task.id as number)}
                            disabled={mergeLoading}
                            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 dark:bg-sky-600 dark:hover:bg-sky-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {mergeLoading ? (
                              <>
                                <div className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Merging...
                              </>
                            ) : (
                              <>
                                <GitMerge className="size-3.5" strokeWidth={1.5} />
                                Merge
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      <strong>Tip:</strong> Merging tasks combines them into one, keeping the most detailed description and earliest deadline.
                    </p>
                  </div>
                </section>
              ) : (
                <div className="py-8 text-center">
                  <ArrowRightLeft className="size-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-sm text-zinc-400 dark:text-zinc-500">No similar tasks found.</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                    This task appears to be unique.
                  </p>
                </div>
              )}
            </>
          )}
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
