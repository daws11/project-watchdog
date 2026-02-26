import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  Plus,
  Play,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Search,
  MessageCircle,
  Video,
  Mail,
  Webhook,
} from 'lucide-react'
import type {
  ProcessingProps,
  ProcessingRule,
  ProcessingRun,
  RuleAction,
  RuleFormData,
  RunStatus,
} from '../types'

/* ── Constants ── */

const ACTION_LABELS: Record<RuleAction, string> = {
  extract_tasks: 'Extract tasks',
  update_profiles: 'Update profiles',
  both: 'Tasks + Profiles',
}

const RUN_STATUS_CONFIG: Record<RunStatus, { label: string; className: string; Icon: React.ElementType }> = {
  success: {
    label: 'Success',
    className: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
    Icon: CheckCircle2,
  },
  partial: {
    label: 'Partial',
    className: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',
    Icon: AlertTriangle,
  },
  failed: {
    label: 'Failed',
    className: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20',
    Icon: XCircle,
  },
}

const CHANNEL_ICON: Record<string, React.ElementType> = {
  WhatsApp: MessageCircle,
  'Google Meet': Video,
  Email: Mail,
  Webhook: Webhook,
}

const CHANNEL_COLOR: Record<string, string> = {
  WhatsApp: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10',
  'Google Meet': 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10',
  Email: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10',
  Webhook: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10',
}

const ALL_CHANNELS = [
  { id: 'ch_whatsapp', name: 'WhatsApp' },
  { id: 'ch_google_meet', name: 'Google Meet' },
  { id: 'ch_email', name: 'Email' },
  { id: 'ch_webhook', name: 'Webhook' },
]

function formatRelativeTime(isoString: string): string {
  const now = new Date()
  const date = new Date(isoString)
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffHours / 24)

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return '1 day ago'
  if (diffDays < 30) return `${diffDays}d ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/* ── Main Component ── */

type Tab = 'rules' | 'history'

export function ProcessingView({
  rules,
  runs,
  onCreateRule,
  onEditRule,
  onDeleteRule,
  onToggleRule,
  onRunNow,
}: ProcessingProps) {
  const [activeTab, setActiveTab] = useState<Tab>('rules')
  const [slideoverMode, setSlideoverMode] = useState<'closed' | 'create' | 'edit'>('closed')
  const [editingRule, setEditingRule] = useState<ProcessingRule | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null)

  // Run history filters
  const [runSearch, setRunSearch] = useState('')
  const [runFilterRule, setRunFilterRule] = useState<string>('all')
  const [runFilterStatus, setRunFilterStatus] = useState<string>('all')
  const [runFilterAction, setRunFilterAction] = useState<string>('all')
  const [runDateFrom, setRunDateFrom] = useState('')
  const [runDateTo, setRunDateTo] = useState('')

  // Form state
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formSchedule, setFormSchedule] = useState('')
  const [formChannelIds, setFormChannelIds] = useState<string[]>([])
  const [formPrompt, setFormPrompt] = useState('')
  const [formAction, setFormAction] = useState<RuleAction>('extract_tasks')

  // Build a rule lookup for action filtering
  const ruleById = useMemo(() => {
    const map: Record<string, ProcessingRule> = {}
    for (const r of rules) map[r.id] = r
    return map
  }, [rules])

  const filteredRuns = useMemo(() => {
    let result = [...runs].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    )
    if (runSearch.trim()) {
      const q = runSearch.toLowerCase()
      result = result.filter((r) => r.ruleName.toLowerCase().includes(q))
    }
    if (runFilterRule !== 'all') {
      result = result.filter((r) => r.ruleId === runFilterRule)
    }
    if (runFilterStatus !== 'all') {
      result = result.filter((r) => r.status === runFilterStatus)
    }
    if (runFilterAction !== 'all') {
      result = result.filter((r) => {
        const rule = ruleById[r.ruleId]
        return rule?.action === runFilterAction
      })
    }
    if (runDateFrom) {
      const from = new Date(runDateFrom)
      result = result.filter((r) => new Date(r.startedAt) >= from)
    }
    if (runDateTo) {
      const to = new Date(runDateTo)
      to.setHours(23, 59, 59, 999)
      result = result.filter((r) => new Date(r.startedAt) <= to)
    }
    return result
  }, [runs, runSearch, runFilterRule, runFilterStatus, runFilterAction, runDateFrom, runDateTo, ruleById])

  const openCreate = () => {
    setFormName('')
    setFormDescription('')
    setFormSchedule('every 6 hours')
    setFormChannelIds([])
    setFormPrompt('')
    setFormAction('extract_tasks')
    setEditingRule(null)
    setSlideoverMode('create')
  }

  const openEdit = (rule: ProcessingRule) => {
    setFormName(rule.name)
    setFormDescription(rule.description)
    setFormSchedule(rule.schedule)
    setFormChannelIds(rule.channelIds)
    setFormPrompt(rule.prompt)
    setFormAction(rule.action)
    setEditingRule(rule)
    setSlideoverMode('edit')
  }

  const closeSlideover = () => {
    setSlideoverMode('closed')
    setEditingRule(null)
  }

  const handleSubmit = () => {
    const data: RuleFormData = {
      name: formName.trim(),
      description: formDescription.trim(),
      schedule: formSchedule.trim(),
      channelIds: formChannelIds,
      prompt: formPrompt.trim(),
      action: formAction,
    }
    if (!data.name || !data.schedule || !data.prompt || data.channelIds.length === 0) return

    if (slideoverMode === 'create') {
      onCreateRule?.(data)
    } else if (slideoverMode === 'edit' && editingRule) {
      onEditRule?.(editingRule.id, data)
    }
    closeSlideover()
  }

  const handleDelete = (ruleId: string) => {
    onDeleteRule?.(ruleId)
    setDeletingId(null)
  }

  const toggleChannel = (channelId: string) => {
    setFormChannelIds((prev) =>
      prev.includes(channelId) ? prev.filter((id) => id !== channelId) : [...prev, channelId]
    )
  }

  const totalRuns = runs.length
  const successRuns = runs.filter((r) => r.status === 'success').length
  const failedRuns = runs.filter((r) => r.status === 'failed').length

  const hasActiveRunFilters =
    runSearch.trim() !== '' ||
    runFilterRule !== 'all' ||
    runFilterStatus !== 'all' ||
    runFilterAction !== 'all' ||
    runDateFrom !== '' ||
    runDateTo !== ''

  const clearRunFilters = () => {
    setRunSearch('')
    setRunFilterRule('all')
    setRunFilterStatus('all')
    setRunFilterAction('all')
    setRunDateFrom('')
    setRunDateTo('')
  }

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
              Processing
            </h1>
            <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
              Configure processing rules and view run history
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Tab toggle */}
            <div className="flex items-center border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm overflow-hidden">
              <button
                onClick={() => setActiveTab('rules')}
                className={`px-3.5 py-1.5 transition-colors ${
                  activeTab === 'rules'
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium'
                    : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                Rules
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3.5 py-1.5 transition-colors ${
                  activeTab === 'history'
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium'
                    : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                Run History
              </button>
            </div>
            {activeTab === 'rules' && (
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-sky-500 dark:bg-sky-600 text-white hover:bg-sky-600 dark:hover:bg-sky-500 transition-colors"
              >
                <Plus className="size-3.5" strokeWidth={2} />
                Add rule
              </button>
            )}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Rules" value={rules.length} />
          <StatCard label="Total Runs" value={totalRuns} color="sky" />
          <StatCard label="Successful" value={successRuns} color="emerald" />
          <StatCard label="Failed" value={failedRuns} color={failedRuns > 0 ? 'red' : undefined} />
        </div>

        {/* ── Rules Tab ── */}
        {activeTab === 'rules' && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
            {rules.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <p className="text-sm text-zinc-400 dark:text-zinc-500">
                  No processing rules configured yet.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {rules.map((rule) =>
                  deletingId === rule.id ? (
                    <div key={rule.id} className="px-5 py-4">
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-3">
                        Delete <span className="font-medium">{rule.name}</span>? This cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="px-3 py-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <RuleRow
                      key={rule.id}
                      rule={rule}
                      onToggle={(enabled) => onToggleRule?.(rule.id, enabled)}
                      onRunNow={() => onRunNow?.(rule.id)}
                      onEdit={() => openEdit(rule)}
                      onDelete={() => setDeletingId(rule.id)}
                    />
                  )
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Run History Tab ── */}
        {activeTab === 'history' && (
          <RunHistoryTab
            runs={filteredRuns}
            rules={rules}
            runSearch={runSearch}
            onSearchChange={setRunSearch}
            runFilterRule={runFilterRule}
            onFilterRuleChange={setRunFilterRule}
            runFilterStatus={runFilterStatus}
            onFilterStatusChange={setRunFilterStatus}
            runFilterAction={runFilterAction}
            onFilterActionChange={setRunFilterAction}
            runDateFrom={runDateFrom}
            onDateFromChange={setRunDateFrom}
            runDateTo={runDateTo}
            onDateToChange={setRunDateTo}
            hasActiveFilters={hasActiveRunFilters}
            onClearFilters={clearRunFilters}
            expandedRunId={expandedRunId}
            onToggleExpand={(id) => setExpandedRunId(expandedRunId === id ? null : id)}
          />
        )}
      </div>

      {/* Rule editor slide-over */}
      {slideoverMode !== 'closed' &&
        createPortal(
          <div className="fixed inset-0 z-50 flex justify-end">
            <div
              className="absolute inset-0 bg-black/30 dark:bg-black/50"
              onClick={closeSlideover}
            />
            <div className="relative w-full max-w-md h-full flex flex-col bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-xl">
              {/* Slide-over header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                <h2
                  className="text-base font-bold text-zinc-900 dark:text-zinc-100"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {slideoverMode === 'create' ? 'New Rule' : 'Edit Rule'}
                </h2>
                <button
                  onClick={closeSlideover}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="size-4" strokeWidth={1.5} />
                </button>
              </div>

              {/* Form */}
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1.5">
                    Rule name
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Task Extraction — All Channels"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-colors"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1.5">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Brief description of what this rule does"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-colors"
                  />
                </div>

                {/* Schedule */}
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1.5">
                    Schedule
                  </label>
                  <input
                    type="text"
                    value={formSchedule}
                    onChange={(e) => setFormSchedule(e.target.value)}
                    placeholder="e.g. every 6 hours, daily at 06:00"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-colors"
                  />
                </div>

                {/* Channels */}
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">
                    Source channels
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_CHANNELS.map((ch) => {
                      const selected = formChannelIds.includes(ch.id)
                      const Icon = CHANNEL_ICON[ch.name] ?? Webhook
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => toggleChannel(ch.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                            selected
                              ? 'bg-sky-50 dark:bg-sky-500/10 border-sky-300 dark:border-sky-500/30 text-sky-700 dark:text-sky-300 font-medium'
                              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600'
                          }`}
                        >
                          <Icon className="size-3.5" strokeWidth={1.5} />
                          {ch.name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Action */}
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">
                    Target action
                  </label>
                  <div className="flex gap-2">
                    {(Object.entries(ACTION_LABELS) as [RuleAction, string][]).map(
                      ([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setFormAction(value)}
                          className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                            formAction === value
                              ? 'bg-sky-50 dark:bg-sky-500/10 border-sky-300 dark:border-sky-500/30 text-sky-700 dark:text-sky-300 font-medium'
                              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600'
                          }`}
                        >
                          {label}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Prompt */}
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1.5">
                    AI Prompt
                  </label>
                  <textarea
                    value={formPrompt}
                    onChange={(e) => setFormPrompt(e.target.value)}
                    placeholder="Instructions for the AI processing pipeline..."
                    rows={6}
                    className="w-full px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-colors resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0 flex gap-2">
                <button
                  onClick={handleSubmit}
                  disabled={
                    !formName.trim() ||
                    !formSchedule.trim() ||
                    !formPrompt.trim() ||
                    formChannelIds.length === 0
                  }
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-sky-500 dark:bg-sky-600 text-white hover:bg-sky-600 dark:hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {slideoverMode === 'create' ? 'Create rule' : 'Save changes'}
                </button>
                <button
                  onClick={closeSlideover}
                  className="px-4 py-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

/* ── Sub-components ── */

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color?: 'sky' | 'emerald' | 'red'
}) {
  const valueColor =
    {
      sky: 'text-sky-600 dark:text-sky-400',
      emerald: 'text-emerald-600 dark:text-emerald-400',
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

function RuleRow({
  rule,
  onToggle,
  onRunNow,
  onEdit,
  onDelete,
}: {
  rule: ProcessingRule
  onToggle: (enabled: boolean) => void
  onRunNow: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const statusConfig = rule.lastRunStatus ? RUN_STATUS_CONFIG[rule.lastRunStatus] : null

  return (
    <div className={`px-5 py-4 ${!rule.enabled ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggle(!rule.enabled)}
          className={`relative mt-0.5 shrink-0 w-8 h-[18px] rounded-full transition-colors ${
            rule.enabled ? 'bg-sky-500 dark:bg-sky-600' : 'bg-zinc-300 dark:bg-zinc-600'
          }`}
        >
          <span
            className={`absolute top-[2px] size-[14px] rounded-full bg-white transition-transform shadow-sm ${
              rule.enabled ? 'left-[16px]' : 'left-[2px]'
            }`}
          />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {rule.name}
            </span>
            {statusConfig && (
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${statusConfig.className}`}
              >
                <statusConfig.Icon className="size-2.5" strokeWidth={2} />
                {statusConfig.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
              <Clock className="size-3" strokeWidth={1.5} />
              {rule.schedule}
            </span>
            <div className="flex items-center gap-1">
              {rule.channelNames.map((name) => {
                const Icon = CHANNEL_ICON[name] ?? Webhook
                const color = CHANNEL_COLOR[name] ?? 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800'
                return (
                  <span
                    key={name}
                    className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${color}`}
                  >
                    <Icon className="size-2.5" strokeWidth={1.5} />
                    {name}
                  </span>
                )
              })}
            </div>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {ACTION_LABELS[rule.action]}
            </span>
          </div>
          {rule.lastRunAt && (
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1.5">
              Last run {formatRelativeTime(rule.lastRunAt)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onRunNow} className="p-1.5 rounded-md text-zinc-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-colors" title="Run now">
            <Play className="size-3.5" strokeWidth={1.5} />
          </button>
          <button onClick={onEdit} className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" title="Edit">
            <Pencil className="size-3.5" strokeWidth={1.5} />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-md text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" title="Delete">
            <Trash2 className="size-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Run History Tab ── */

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100]
const COL_HEADER = 'text-[11px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500'
const GRID_COLS = 'grid grid-cols-[20px_1fr_80px_72px_56px_56px_56px_56px_72px] items-center gap-x-3'

function RunHistoryTab({
  runs,
  rules,
  runSearch,
  onSearchChange,
  runFilterRule,
  onFilterRuleChange,
  runFilterStatus,
  onFilterStatusChange,
  runFilterAction,
  onFilterActionChange,
  runDateFrom,
  onDateFromChange,
  runDateTo,
  onDateToChange,
  hasActiveFilters,
  onClearFilters,
  expandedRunId,
  onToggleExpand,
}: {
  runs: ProcessingRun[]
  rules: ProcessingRule[]
  runSearch: string
  onSearchChange: (v: string) => void
  runFilterRule: string
  onFilterRuleChange: (v: string) => void
  runFilterStatus: string
  onFilterStatusChange: (v: string) => void
  runFilterAction: string
  onFilterActionChange: (v: string) => void
  runDateFrom: string
  onDateFromChange: (v: string) => void
  runDateTo: string
  onDateToChange: (v: string) => void
  hasActiveFilters: boolean
  onClearFilters: () => void
  expandedRunId: string | null
  onToggleExpand: (id: string) => void
}) {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Reset to first page when filters change
  const totalPages = Math.max(1, Math.ceil(runs.length / rowsPerPage))
  const safePage = Math.min(page, totalPages - 1)
  if (safePage !== page) setPage(safePage)

  const paginatedRuns = runs.slice(safePage * rowsPerPage, (safePage + 1) * rowsPerPage)
  const rangeStart = runs.length === 0 ? 0 : safePage * rowsPerPage + 1
  const rangeEnd = Math.min((safePage + 1) * rowsPerPage, runs.length)

  return (
    <>
      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400 dark:text-zinc-500"
            strokeWidth={1.5}
          />
          <input
            type="text"
            value={runSearch}
            onChange={(e) => { onSearchChange(e.target.value); setPage(0) }}
            placeholder="Search by rule name..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-colors"
          />
        </div>
        <select
          value={runFilterRule}
          onChange={(e) => { onFilterRuleChange(e.target.value); setPage(0) }}
          className="text-sm text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer shrink-0"
        >
          <option value="all">All rules</option>
          {rules.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <select
          value={runFilterStatus}
          onChange={(e) => { onFilterStatusChange(e.target.value); setPage(0) }}
          className="text-sm text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer shrink-0"
        >
          <option value="all">All statuses</option>
          <option value="success">Success</option>
          <option value="partial">Partial</option>
          <option value="failed">Failed</option>
        </select>
        <select
          value={runFilterAction}
          onChange={(e) => { onFilterActionChange(e.target.value); setPage(0) }}
          className="text-sm text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer shrink-0"
        >
          <option value="all">All types</option>
          <option value="extract_tasks">Extract tasks</option>
          <option value="update_profiles">Update profiles</option>
          <option value="both">Tasks + Profiles</option>
        </select>
      </div>

      {/* Date range row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0">From</label>
          <input
            type="date"
            value={runDateFrom}
            onChange={(e) => { onDateFromChange(e.target.value); setPage(0) }}
            className="text-sm text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0">To</label>
          <input
            type="date"
            value={runDateTo}
            onChange={(e) => { onDateToChange(e.target.value); setPage(0) }}
            className="text-sm text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
          />
        </div>
        {hasActiveFilters && (
          <button
            onClick={() => { onClearFilters(); setPage(0) }}
            className="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors ml-auto"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Run table */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
        {/* Column headers */}
        <div className={`${GRID_COLS} px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/30`}>
          <span />
          <span className={COL_HEADER}>Rule</span>
          <span className={`${COL_HEADER} text-center`}>Status</span>
          <span className={`${COL_HEADER} text-right`}>Date</span>
          <span className={`${COL_HEADER} text-right`}>Time</span>
          <span className={`${COL_HEADER} text-right`}>Msgs</span>
          <span className={`${COL_HEADER} text-right`}>Tasks</span>
          <span className={`${COL_HEADER} text-right`}>IDs</span>
          <span className={`${COL_HEADER} text-right`}>Profiles</span>
        </div>

        {paginatedRuns.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              {hasActiveFilters ? 'No runs match the selected filters.' : 'No processing runs yet.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {paginatedRuns.map((run) => (
              <RunTableRow
                key={run.id}
                run={run}
                isExpanded={expandedRunId === run.id}
                onToggle={() => onToggleExpand(run.id)}
              />
            ))}
          </div>
        )}

        {/* Pagination footer */}
        <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 dark:text-zinc-500">Rows per page</span>
            <select
              value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0) }}
              className="text-xs text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
            >
              {ROWS_PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span
              className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {rangeStart}–{rangeEnd} of {runs.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(0, safePage - 1))}
                disabled={safePage === 0}
                className="px-2 py-1 text-xs rounded-md text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
                disabled={safePage >= totalPages - 1}
                className="px-2 py-1 text-xs rounded-md text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function RunTableRow({
  run,
  isExpanded,
  onToggle,
}: {
  run: ProcessingRun
  isExpanded: boolean
  onToggle: () => void
}) {
  const status = RUN_STATUS_CONFIG[run.status]
  const date = new Date(run.startedAt)
  const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-3 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors"
      >
        <div className={GRID_COLS}>
          {isExpanded ? (
            <ChevronDown className="size-3.5 text-zinc-400" strokeWidth={1.5} />
          ) : (
            <ChevronRight className="size-3.5 text-zinc-400" strokeWidth={1.5} />
          )}

          <span className="text-sm text-zinc-900 dark:text-zinc-100 font-medium truncate">
            {run.ruleName}
          </span>

          <span className="flex justify-center">
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${status.className}`}
            >
              <status.Icon className="size-2.5" strokeWidth={2} />
              {status.label}
            </span>
          </span>

          <span
            className="text-[11px] text-zinc-400 dark:text-zinc-500 tabular-nums text-right"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {dateStr}
          </span>

          <span
            className="text-[11px] text-zinc-400 dark:text-zinc-500 tabular-nums text-right"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {timeStr}
          </span>

          <span
            className={`text-sm tabular-nums text-right ${
              run.messagesProcessed > 0 ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-300 dark:text-zinc-600'
            }`}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {run.messagesProcessed}
          </span>

          <span
            className={`text-sm tabular-nums text-right ${
              run.tasksExtracted > 0 ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-300 dark:text-zinc-600'
            }`}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {run.tasksExtracted}
          </span>

          <span
            className={`text-sm tabular-nums text-right ${
              run.identitiesResolved > 0 ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-300 dark:text-zinc-600'
            }`}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {run.identitiesResolved}
          </span>

          <span
            className={`text-sm tabular-nums text-right ${
              run.profilesUpdated > 0 ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-300 dark:text-zinc-600'
            }`}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {run.profilesUpdated}
          </span>
        </div>
      </button>

      {isExpanded && run.errors.length > 0 && (
        <div className="px-5 pb-4 pl-11 space-y-2">
          {run.errors.map((err, i) => (
            <div
              key={i}
              className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20"
            >
              <AlertTriangle className="size-3.5 text-red-500 dark:text-red-400 mt-0.5 shrink-0" strokeWidth={1.5} />
              <div>
                <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">
                  {err.message}
                </p>
                <p className="text-[10px] text-red-400 dark:text-red-500 mt-0.5">
                  {err.context}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {isExpanded && run.errors.length === 0 && (
        <div className="px-5 pb-4 pl-11">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Completed in {formatDuration(run.duration)} with no errors.
          </p>
        </div>
      )}
    </div>
  )
}
