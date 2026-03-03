import { useMemo, useState, type ElementType, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  MessageCircle,
  Video,
  Mail,
  Webhook,
  X,
  Plus,
  Pause,
  Play,
  Pencil,
  Trash2,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Clock,
} from 'lucide-react'
import type {
  SourcesProps,
  Channel,
  Connection,
  ChannelType,
  ConnectionStatus,
  ProjectOption,
} from './types'

const CHANNEL_ICON: Record<ChannelType, ElementType> = {
  whatsapp: MessageCircle,
  google_meet: Video,
  email: Mail,
  webhook: Webhook,
}

const CHANNEL_COLOR: Record<ChannelType, { bg: string; icon: string; ring: string }> = {
  whatsapp: {
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    icon: 'text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-200 dark:ring-emerald-500/20',
  },
  google_meet: {
    bg: 'bg-sky-50 dark:bg-sky-500/10',
    icon: 'text-sky-600 dark:text-sky-400',
    ring: 'ring-sky-200 dark:ring-sky-500/20',
  },
  email: {
    bg: 'bg-violet-50 dark:bg-violet-500/10',
    icon: 'text-violet-600 dark:text-violet-400',
    ring: 'ring-violet-200 dark:ring-violet-500/20',
  },
  webhook: {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    icon: 'text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-200 dark:ring-amber-500/20',
  },
}

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { label: string; className: string; dotClass: string }
> = {
  active: {
    label: 'Active',
    className:
      'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
    dotClass: 'bg-emerald-500',
  },
  paused: {
    label: 'Paused',
    className:
      'text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700',
    dotClass: 'bg-zinc-400',
  },
  error: {
    label: 'Error',
    className:
      'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20',
    dotClass: 'bg-red-500',
  },
}

const CHANNEL_FIELDS: Record<ChannelType, { label: string; placeholder: string }> = {
  whatsapp: { label: 'Phone number', placeholder: '+971501234567' },
  google_meet: { label: 'Google account', placeholder: 'user@company.com' },
  email: { label: 'Email address', placeholder: 'inbox@company.com' },
  webhook: { label: 'Webhook URL', placeholder: 'https://api.example.com/hooks/...' },
}

function formatRelativeTime(isoString: string): string {
  const now = new Date()
  const date = new Date(isoString)
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffHours / 24)

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return '1 day ago'
  if (diffDays < 30) return `${diffDays} days ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return n.toString()
}

export interface SourcesViewProps extends SourcesProps {
  projects: ProjectOption[]
}

export function SourcesView({
  channels,
  connections,
  projects,
  onChannelClick,
  onSyncChannel,
  onAddConnection,
  onPauseConnection,
  onResumeConnection,
  onEditConnection,
  onDeleteConnection,
  onRetryConnection,
}: SourcesViewProps) {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [formLabel, setFormLabel] = useState('')
  const [formIdentifier, setFormIdentifier] = useState('')
  const [formProjectId, setFormProjectId] = useState<string>('')
  const [syncing, setSyncing] = useState(false)

  const selectedChannel = channels.find((c) => c.id === selectedChannelId) ?? null
  const channelConnections = useMemo(
    () => connections.filter((c) => c.channelId === selectedChannelId),
    [connections, selectedChannelId]
  )

  const totalActive = channels.reduce((sum, c) => sum + c.activeCount, 0)
  const totalConnections = channels.reduce((sum, c) => sum + c.connectionCount, 0)
  const totalErrors = channels.filter((c) => c.hasErrors).length

  const openChannel = (channelId: string) => {
    onChannelClick?.(channelId)
    setSelectedChannelId(channelId)
    setAddingTo(null)
    setEditingId(null)
    setDeletingId(null)
  }

  const closeModal = () => {
    setSelectedChannelId(null)
    setAddingTo(null)
    setEditingId(null)
    setDeletingId(null)
    setFormLabel('')
    setFormIdentifier('')
    setSyncing(false)
  }

  const startAdd = () => {
    setAddingTo(selectedChannelId)
    setEditingId(null)
    setFormLabel('')
    setFormIdentifier('')
    setFormProjectId(projects[0]?.id.toString() || '')
  }

  const startEdit = (conn: Connection) => {
    setEditingId(conn.id)
    setAddingTo(null)
    setFormLabel(conn.label)
    setFormIdentifier(conn.identifier)
    // Project ID will be fetched from connection data if available
    setFormProjectId('')
  }

  const cancelForm = () => {
    setAddingTo(null)
    setEditingId(null)
    setFormLabel('')
    setFormIdentifier('')
    setFormProjectId('')
  }

  const handleSubmitAdd = () => {
    if (!formLabel.trim() || !formIdentifier.trim() || !addingTo) return
    onAddConnection?.(addingTo, { 
      label: formLabel.trim(), 
      identifier: formIdentifier.trim(),
      projectId: formProjectId ? parseInt(formProjectId) : undefined,
    })
    cancelForm()
  }

  const handleSubmitEdit = () => {
    if (!formLabel.trim() || !formIdentifier.trim() || !editingId) return
    onEditConnection?.(editingId, { 
      label: formLabel.trim(), 
      identifier: formIdentifier.trim(),
      projectId: formProjectId ? parseInt(formProjectId) : undefined,
    })
    cancelForm()
  }

  const handleDelete = (connectionId: string) => {
    onDeleteConnection?.(connectionId)
    setDeletingId(null)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-6 space-y-6">
        {/* Header */}
        <div>
          <h1
            className="text-xl font-bold text-zinc-900 dark:text-zinc-100"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Sources
          </h1>
          <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
            Manage data ingestion channels and connections
          </p>
        </div>

        {/* Summary stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard label="Total Connections" value={totalConnections} />
          <StatCard label="Active" value={totalActive} color="emerald" />
          <StatCard
            label="Channels with Errors"
            value={totalErrors}
            color={totalErrors > 0 ? 'red' : undefined}
          />
        </div>

        {/* Channel cards grid */}
        {channels.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 text-center">
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              No channels configured.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {channels.map((channel) => (
              <ChannelCard key={channel.id} channel={channel} onClick={() => openChannel(channel.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Channel detail modal — portal to escape shell overflow */}
      {selectedChannel &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 dark:bg-black/50" onClick={closeModal} />
            <div className="relative w-full max-w-lg max-h-[80vh] flex flex-col rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl">
              {/* Modal header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                <ChannelIcon type={selectedChannel.type} size="sm" />
                <div className="flex-1 min-w-0">
                  <h2
                    className="text-base font-bold text-zinc-900 dark:text-zinc-100"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {selectedChannel.name}
                  </h2>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                    {selectedChannel.description}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="size-4" strokeWidth={1.5} />
                </button>
              </div>

              {/* Connection list */}
              <div className="flex-1 overflow-y-auto">
                {channelConnections.length === 0 && !addingTo ? (
                  <div className="px-5 py-12 text-center">
                    <p className="text-sm text-zinc-400 dark:text-zinc-500">
                      No connections configured yet.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                    {channelConnections.map((conn) =>
                      editingId === conn.id ? (
                        <ConnectionForm
                          key={conn.id}
                          channelType={selectedChannel.type}
                          label={formLabel}
                          identifier={formIdentifier}
                          projectId={formProjectId}
                          projects={projects}
                          onLabelChange={setFormLabel}
                          onIdentifierChange={setFormIdentifier}
                          onProjectChange={setFormProjectId}
                          onSubmit={handleSubmitEdit}
                          onCancel={cancelForm}
                          submitLabel="Save"
                        />
                      ) : deletingId === conn.id ? (
                        <div key={conn.id} className="px-5 py-4">
                          <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-3">
                            Disconnect <span className="font-medium">{conn.label}</span>? This will stop syncing and remove this connection.
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDelete(conn.id)}
                              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                            >
                              Disconnect
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
                        <ConnectionRow
                          key={conn.id}
                          connection={conn}
                          onPause={() => onPauseConnection?.(conn.id)}
                          onResume={() => onResumeConnection?.(conn.id)}
                          onEdit={() => startEdit(conn)}
                          onDelete={() => setDeletingId(conn.id)}
                          onRetry={() => onRetryConnection?.(conn.id)}
                        />
                      )
                    )}
                    {addingTo && (
                      <ConnectionForm
                        channelType={selectedChannel.type}
                        label={formLabel}
                        identifier={formIdentifier}
                        projectId={formProjectId}
                        projects={projects}
                        onLabelChange={setFormLabel}
                        onIdentifierChange={setFormIdentifier}
                        onProjectChange={setFormProjectId}
                        onSubmit={handleSubmitAdd}
                        onCancel={cancelForm}
                        submitLabel="Add"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Modal footer */}
              {!addingTo && !editingId && (
                <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
                  <div className="flex items-center justify-between gap-3">
                    {selectedChannel.type === 'whatsapp' && (
                      <button
                        onClick={() => {
                          if (!selectedChannelId || syncing) return
                          setSyncing(true)
                          try {
                            onSyncChannel?.(selectedChannelId)
                          } finally {
                            // best-effort UI cooldown; actual refresh handled by parent page
                            window.setTimeout(() => setSyncing(false), 1500)
                          }
                        }}
                        disabled={syncing}
                        className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Sync WhatsApp groups from the logged-in WhatsApp Web session"
                      >
                        <RotateCcw className="size-3.5" strokeWidth={2} />
                        {syncing ? 'Syncing…' : 'Sync groups'}
                      </button>
                    )}

                    <button
                      onClick={startAdd}
                      className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-sky-500 dark:bg-sky-600 text-white hover:bg-sky-600 dark:hover:bg-sky-500 transition-colors"
                    >
                      <Plus className="size-3.5" strokeWidth={2} />
                      Add connection
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

/* ── Sub-components ── */

function StatCard({ label, value, color }: { label: string; value: number; color?: 'emerald' | 'red' }) {
  const valueColor =
    color === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-400'
      : color === 'red'
        ? 'text-red-500 dark:text-red-400'
        : 'text-zinc-900 dark:text-zinc-100'

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

function ChannelIcon({ type, size = 'md' }: { type: ChannelType; size?: 'sm' | 'md' }) {
  const Icon = CHANNEL_ICON[type]
  const color = CHANNEL_COLOR[type]
  const dims = size === 'sm' ? 'size-8' : 'size-11'
  const iconSize = size === 'sm' ? 'size-4' : 'size-5'

  return (
    <div className={`${dims} rounded-lg ${color.bg} ring-1 ${color.ring} flex items-center justify-center shrink-0`}>
      <Icon className={`${iconSize} ${color.icon}`} strokeWidth={1.5} />
    </div>
  )
}

function ChannelCard({ channel, onClick }: { channel: Channel; onClick: () => void }) {
  const hasConnections = channel.connectionCount > 0

  let statusIcon: ReactNode
  let statusText: string
  let statusClass: string

  if (!hasConnections) {
    statusIcon = <CircleDot className="size-3.5" strokeWidth={1.5} />
    statusText = 'Not connected'
    statusClass = 'text-zinc-400 dark:text-zinc-500'
  } else if (channel.hasErrors) {
    statusIcon = <AlertTriangle className="size-3.5" strokeWidth={1.5} />
    statusText = 'Has errors'
    statusClass = 'text-red-500 dark:text-red-400'
  } else if (channel.activeCount === channel.connectionCount) {
    statusIcon = <CheckCircle2 className="size-3.5" strokeWidth={1.5} />
    statusText = 'All active'
    statusClass = 'text-emerald-600 dark:text-emerald-400'
  } else {
    statusIcon = <Clock className="size-3.5" strokeWidth={1.5} />
    statusText = `${channel.activeCount} of ${channel.connectionCount} active`
    statusClass = 'text-amber-500 dark:text-amber-400'
  }

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors group"
    >
      <div className="flex items-start gap-4">
        <ChannelIcon type={channel.type} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3
              className="text-sm font-bold text-zinc-900 dark:text-zinc-100"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {channel.name}
            </h3>
            {hasConnections && (
              <span
                className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {channel.connectionCount} {channel.connectionCount === 1 ? 'connection' : 'connections'}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
            {channel.description}
          </p>
          <div className={`flex items-center gap-1.5 mt-3 ${statusClass}`}>
            {statusIcon}
            <span className="text-xs font-medium">{statusText}</span>
          </div>
        </div>
      </div>
    </button>
  )
}

function ConnectionRow({
  connection,
  onPause,
  onResume,
  onEdit,
  onDelete,
  onRetry,
}: {
  connection: Connection
  onPause: () => void
  onResume: () => void
  onEdit: () => void
  onDelete: () => void
  onRetry: () => void
}) {
  const status = STATUS_CONFIG[connection.status]

  return (
    <div className="px-5 py-4 space-y-2">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
              {connection.label}
            </span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${status.className}`}>
              <span className={`size-1.5 rounded-full ${status.dotClass}`} />
              {status.label}
            </span>
          </div>
          <p
            className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 truncate tabular-nums"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {connection.identifier}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {connection.status === 'error' && (
            <button
              onClick={onRetry}
              className="p-1.5 rounded-md text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              title="Retry"
            >
              <RotateCcw className="size-3.5" strokeWidth={1.5} />
            </button>
          )}
          {connection.status === 'active' && (
            <button
              onClick={onPause}
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Pause"
            >
              <Pause className="size-3.5" strokeWidth={1.5} />
            </button>
          )}
          {connection.status === 'paused' && (
            <button
              onClick={onResume}
              className="p-1.5 rounded-md text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
              title="Resume"
            >
              <Play className="size-3.5" strokeWidth={1.5} />
            </button>
          )}
          <button
            onClick={onEdit}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Edit"
          >
            <Pencil className="size-3.5" strokeWidth={1.5} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-md text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            title="Disconnect"
          >
            <Trash2 className="size-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-4 text-[11px] text-zinc-400 dark:text-zinc-500">
        <span>Synced {formatRelativeTime(connection.lastSyncAt)}</span>
        <span
          className="tabular-nums"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {formatNumber(connection.messagesProcessed)} messages
        </span>
      </div>

      {/* Error message */}
      {connection.error && (
        <div className="flex items-start gap-2 mt-1 p-2.5 rounded-lg bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20">
          <AlertTriangle className="size-3.5 text-red-500 dark:text-red-400 mt-0.5 shrink-0" strokeWidth={1.5} />
          <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">
            {connection.error}
          </p>
        </div>
      )}
    </div>
  )
}

function ConnectionForm({
  channelType,
  label,
  identifier,
  projectId,
  projects,
  onLabelChange,
  onIdentifierChange,
  onProjectChange,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  channelType: ChannelType
  label: string
  identifier: string
  projectId: string
  projects: ProjectOption[]
  onLabelChange: (v: string) => void
  onIdentifierChange: (v: string) => void
  onProjectChange: (v: string) => void
  onSubmit: () => void
  onCancel: () => void
  submitLabel: string
}) {
  const fields = CHANNEL_FIELDS[channelType]

  return (
    <div className="px-5 py-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-800/20">
      <div>
        <label className="block text-[11px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1.5">
          Connection name
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="e.g. Operations Group"
          className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-colors"
        />
      </div>
      <div>
        <label className="block text-[11px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1.5">
          {fields.label}
        </label>
        <input
          type="text"
          value={identifier}
          onChange={(e) => onIdentifierChange(e.target.value)}
          placeholder={fields.placeholder}
          className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-colors"
        />
      </div>
      {projects.length > 0 && (
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1.5">
            Assign to Project
          </label>
          <select
            value={projectId}
            onChange={(e) => onProjectChange(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-colors cursor-pointer"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
            Messages from this connection will be classified under this project
          </p>
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onSubmit}
          disabled={!label.trim() || !identifier.trim()}
          className="px-3.5 py-2 text-sm font-medium rounded-lg bg-sky-500 dark:bg-sky-600 text-white hover:bg-sky-600 dark:hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {submitLabel}
        </button>
        <button
          onClick={onCancel}
          className="px-3.5 py-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

