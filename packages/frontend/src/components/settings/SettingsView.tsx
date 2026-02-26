import { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Key,
  Mail,
  Users,
  Plus,
  Trash2,
  X,
  Eye,
  EyeOff,
  Send,
  Shield,
  ShieldCheck,
  UserCog,
  Check,
  ChevronRight,
  Lock,
  Globe,
  User,
  CircleDot,
} from 'lucide-react'
import type {
  SettingsProps,
  SettingsCategory,
  ApiKey,
  SmtpSettings,
  SmtpEncryption,
  SystemUser,
  UserRole,
  UserFormData,
  SectionOption,
  PersonOption,
} from './types'

/* ── Shared Styles ── */

const HEADING = "text-[13px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500"
const LABEL = 'block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5'
const INPUT = 'w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-300 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-all'
const BTN_PRIMARY = 'inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-sky-500 dark:bg-sky-600 text-white hover:bg-sky-600 dark:hover:bg-sky-500 transition-colors shadow-sm shadow-sky-500/10'
const BTN_GHOST = 'px-4 py-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors'

const SERVICES = ['OpenAI', 'Anthropic', 'WhatsApp Business API', 'Google Cloud', 'Microsoft Graph', 'Custom']

function formatRelativeTime(isoString: string): string {
  const now = new Date()
  const date = new Date(isoString)
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffHours / 24)
  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 30) return `${diffDays}d ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/* ── Category config ── */

const CATEGORIES: { id: SettingsCategory; label: string; sublabel: string; Icon: React.ElementType }[] = [
  { id: 'api_keys', label: 'API Keys', sublabel: 'External service credentials', Icon: Key },
  { id: 'smtp', label: 'SMTP', sublabel: 'Outgoing email config', Icon: Mail },
  { id: 'users', label: 'Users', sublabel: 'Accounts & permissions', Icon: Users },
]

/* ── Main Component ── */

export function SettingsView({
  apiKeys,
  smtpSettings,
  users,
  availableSections,
  availablePeople,
  onAddApiKey,
  onDeleteApiKey,
  onSaveSmtp,
  onTestSmtp,
  onCreateUser,
  onEditUser,
  onDeactivateUser,
  onReactivateUser,
}: SettingsProps) {
  const [category, setCategory] = useState<SettingsCategory>('api_keys')

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-6 pt-6 pb-4 shrink-0">
        {/* Header */}
        <div>
          <h1
            className="text-xl font-bold text-zinc-900 dark:text-zinc-100"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Settings
          </h1>
          <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-0.5">
            Application configuration and user management
          </p>
        </div>
      </div>

      {/* Two-column layout — fills remaining height */}
      <div className="flex-1 mx-6 mb-6 flex rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
          {/* Left sidebar */}
          <nav className="w-56 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/20">
            <div className="p-3 space-y-1">
              {CATEGORIES.map(({ id, label, sublabel, Icon }) => (
                <button
                  key={id}
                  onClick={() => setCategory(id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all group text-left ${
                    category === id
                      ? 'bg-white dark:bg-zinc-800 shadow-sm shadow-zinc-200/50 dark:shadow-none border border-zinc-200/80 dark:border-zinc-700'
                      : 'border border-transparent hover:bg-white/60 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  <span className={`flex items-center justify-center size-8 rounded-lg transition-colors ${
                    category === id
                      ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-500 dark:group-hover:text-zinc-400'
                  }`}>
                    <Icon className="size-4" strokeWidth={1.5} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className={`block text-sm font-medium truncate transition-colors ${
                      category === id
                        ? 'text-zinc-900 dark:text-zinc-100'
                        : 'text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200'
                    }`}>
                      {label}
                    </span>
                    <span className="block text-[11px] text-zinc-400 dark:text-zinc-500 truncate">{sublabel}</span>
                  </div>
                  {category === id && (
                    <ChevronRight className="size-3.5 text-zinc-300 dark:text-zinc-600 shrink-0" strokeWidth={2} />
                  )}
                </button>
              ))}
            </div>
          </nav>

          {/* Right content area */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            {category === 'api_keys' && (
              <ApiKeysPanel apiKeys={apiKeys} onAdd={onAddApiKey} onDelete={onDeleteApiKey} />
            )}
            {category === 'smtp' && (
              <SmtpPanel settings={smtpSettings} onSave={onSaveSmtp} onTest={onTestSmtp} />
            )}
            {category === 'users' && (
              <UsersPanel
                users={users}
                availableSections={availableSections}
                availablePeople={availablePeople}
                onCreate={onCreateUser}
                onEdit={onEditUser}
                onDeactivate={onDeactivateUser}
                onReactivate={onReactivateUser}
              />
            )}
          </div>
      </div>
    </div>
  )
}

/* ── API Keys Panel ── */

function ApiKeysPanel({
  apiKeys,
  onAdd,
  onDelete,
}: {
  apiKeys: ApiKey[]
  onAdd?: (data: { service: string; key: string }) => void
  onDelete?: (keyId: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [formService, setFormService] = useState(SERVICES[0])
  const [formKey, setFormKey] = useState('')

  const handleAdd = () => {
    if (!formKey.trim()) return
    onAdd?.({ service: formService, key: formKey.trim() })
    setFormKey('')
    setAdding(false)
  }

  const handleDelete = (id: string) => {
    onDelete?.(id)
    setDeletingId(null)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-base font-bold text-zinc-900 dark:text-zinc-100"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            API Keys
          </h2>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
            Manage credentials for AI models and external integrations
          </p>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className={BTN_PRIMARY}>
            <Plus className="size-3.5" strokeWidth={2} />
            Add key
          </button>
        )}
      </div>

      {/* Add key form */}
      {adding && (
        <div className="rounded-lg border border-sky-200 dark:border-sky-500/20 bg-sky-50/50 dark:bg-sky-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Plus className="size-3.5 text-sky-500" strokeWidth={2} />
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">New API Key</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Service</label>
              <select value={formService} onChange={(e) => setFormService(e.target.value)} className={INPUT}>
                {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>API Key</label>
              <input
                type="password"
                value={formKey}
                onChange={(e) => setFormKey(e.target.value)}
                placeholder="sk-..."
                className={INPUT}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdd}
              disabled={!formKey.trim()}
              className={`${BTN_PRIMARY} disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              Save key
            </button>
            <button onClick={() => { setAdding(false); setFormKey('') }} className={BTN_GHOST}>Cancel</button>
          </div>
        </div>
      )}

      {/* Keys list */}
      {apiKeys.length === 0 && !adding ? (
        <div className="py-16 text-center">
          <div className="inline-flex items-center justify-center size-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-600 mb-3">
            <Key className="size-5" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-zinc-400 dark:text-zinc-500">No API keys configured</p>
        </div>
      ) : (
        <div className="space-y-2">
          {apiKeys.map((key) =>
            deletingId === key.id ? (
              <div key={key.id} className="rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5 p-4">
                <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-3">
                  Delete the <span className="font-semibold">{key.service}</span> key? This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => handleDelete(key.id)} className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">Delete key</button>
                  <button onClick={() => setDeletingId(null)} className={BTN_GHOST}>Cancel</button>
                </div>
              </div>
            ) : (
              <div
                key={key.id}
                className="group flex items-center gap-4 px-4 py-3.5 rounded-lg border border-zinc-100 dark:border-zinc-800/80 hover:border-zinc-200 dark:hover:border-zinc-700 bg-zinc-50/40 dark:bg-zinc-800/20 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-all"
              >
                {/* Service icon */}
                <div className="flex items-center justify-center size-9 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 shrink-0">
                  <Lock className="size-4" strokeWidth={1.5} />
                </div>

                {/* Service & key */}
                <div className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">{key.service}</span>
                  <span
                    className="block text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 truncate tabular-nums"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {key.maskedKey}
                  </span>
                </div>

                {/* Dates */}
                <div className="text-right shrink-0">
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400">{formatDate(key.createdAt)}</span>
                  <span className="block text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                    Last used {key.lastUsedAt ? formatRelativeTime(key.lastUsedAt) : 'never'}
                  </span>
                </div>

                {/* Delete action */}
                <button
                  onClick={() => setDeletingId(key.id)}
                  className="p-1.5 rounded-md text-zinc-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  title="Delete"
                >
                  <Trash2 className="size-3.5" strokeWidth={1.5} />
                </button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}

/* ── SMTP Panel ── */

function SmtpPanel({
  settings,
  onSave,
  onTest,
}: {
  settings: SmtpSettings
  onSave?: (data: SmtpSettings) => void
  onTest?: () => void
}) {
  const [host, setHost] = useState(settings.host)
  const [port, setPort] = useState(settings.port.toString())
  const [username, setUsername] = useState(settings.username)
  const [password, setPassword] = useState(settings.password)
  const [fromAddress, setFromAddress] = useState(settings.fromAddress)
  const [encryption, setEncryption] = useState<SmtpEncryption>(settings.encryption)
  const [showPassword, setShowPassword] = useState(false)

  const handleSave = () => {
    onSave?.({
      host: host.trim(),
      port: parseInt(port) || 587,
      username: username.trim(),
      password,
      fromAddress: fromAddress.trim(),
      encryption,
    })
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2
          className="text-base font-bold text-zinc-900 dark:text-zinc-100"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          SMTP Configuration
        </h2>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
          Configure outgoing email for notifications and alerts
        </p>
      </div>

      <div className="space-y-5">
        {/* Server */}
        <div>
          <div className={`${HEADING} mb-3 flex items-center gap-2`}>
            <Globe className="size-3" strokeWidth={2} />
            Server
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className={LABEL}>Host</label>
              <input type="text" value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.example.com" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Port</label>
              <input type="text" value={port} onChange={(e) => setPort(e.target.value)} placeholder="587" className={INPUT} />
            </div>
          </div>
        </div>

        {/* Authentication */}
        <div>
          <div className={`${HEADING} mb-3 flex items-center gap-2`}>
            <Lock className="size-3" strokeWidth={2} />
            Authentication
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="user@example.com" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${INPUT} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="size-3.5" strokeWidth={1.5} /> : <Eye className="size-3.5" strokeWidth={1.5} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sender */}
        <div>
          <div className={`${HEADING} mb-3 flex items-center gap-2`}>
            <Mail className="size-3" strokeWidth={2} />
            Sender
          </div>
          <div>
            <label className={LABEL}>From Address</label>
            <input type="text" value={fromAddress} onChange={(e) => setFromAddress(e.target.value)} placeholder="App Name <noreply@example.com>" className={INPUT} />
          </div>
        </div>

        {/* Encryption */}
        <div>
          <label className={LABEL}>Encryption</label>
          <div className="flex gap-2 mt-0.5">
            {(['none', 'ssl', 'starttls'] as SmtpEncryption[]).map((enc) => (
              <button
                key={enc}
                onClick={() => setEncryption(enc)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                  encryption === enc
                    ? 'bg-sky-50 dark:bg-sky-500/10 border-sky-300 dark:border-sky-500/30 text-sky-700 dark:text-sky-300 shadow-sm shadow-sky-500/5'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                {enc === 'starttls' ? 'STARTTLS' : enc === 'ssl' ? 'SSL/TLS' : 'None'}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800/50">
          <button onClick={handleSave} className={BTN_PRIMARY}>
            Save settings
          </button>
          <button
            onClick={onTest}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <Send className="size-3.5" strokeWidth={1.5} />
            Test connection
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Users Panel ── */

const ROLE_CONFIG: Record<UserRole, { label: string; className: string; Icon: React.ElementType }> = {
  admin: {
    label: 'Admin',
    className: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200/80 dark:border-amber-500/20',
    Icon: ShieldCheck,
  },
  regular: {
    label: 'User',
    className: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 border-sky-200/80 dark:border-sky-500/20',
    Icon: Shield,
  },
}

function UsersPanel({
  users,
  availableSections,
  availablePeople,
  onCreate,
  onEdit,
  onDeactivate,
  onReactivate,
}: {
  users: SystemUser[]
  availableSections: SectionOption[]
  availablePeople: PersonOption[]
  onCreate?: (data: UserFormData) => void
  onEdit?: (userId: string, data: UserFormData) => void
  onDeactivate?: (userId: string) => void
  onReactivate?: (userId: string) => void
}) {
  const [slideoverMode, setSlideoverMode] = useState<'closed' | 'create' | 'edit'>('closed')
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null)
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null)

  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formRole, setFormRole] = useState<UserRole>('regular')
  const [formSections, setFormSections] = useState<string[]>([])
  const [formPeople, setFormPeople] = useState<string[]>([])

  const openCreate = () => {
    setFormName(''); setFormEmail(''); setFormRole('regular')
    setFormSections(['dashboard']); setFormPeople([])
    setEditingUser(null); setSlideoverMode('create')
  }

  const openEdit = (user: SystemUser) => {
    setFormName(user.name); setFormEmail(user.email); setFormRole(user.role)
    setFormSections(user.sectionPermissions); setFormPeople(user.assignedPeopleIds)
    setEditingUser(user); setSlideoverMode('edit')
  }

  const closeSlideover = () => { setSlideoverMode('closed'); setEditingUser(null) }

  const handleSubmit = () => {
    const data: UserFormData = {
      name: formName.trim(),
      email: formEmail.trim(),
      role: formRole,
      sectionPermissions: formRole === 'admin' ? availableSections.map((s) => s.id).concat(['settings']) : formSections,
      assignedPeopleIds: formRole === 'admin' ? [] : formPeople,
    }
    if (!data.name || !data.email) return
    if (slideoverMode === 'create') onCreate?.(data)
    else if (editingUser) onEdit?.(editingUser.id, data)
    closeSlideover()
  }

  const toggleSection = (id: string) => setFormSections((p) => p.includes(id) ? p.filter((s) => s !== id) : [...p, id])
  const togglePerson = (id: string) => setFormPeople((p) => p.includes(id) ? p.filter((s) => s !== id) : [...p, id])

  const handleDeactivate = (userId: string) => { onDeactivate?.(userId); setDeactivatingId(null) }

  const activeUsers = users.filter((u) => u.status === 'active')
  const inactiveUsers = users.filter((u) => u.status === 'inactive')

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-base font-bold text-zinc-900 dark:text-zinc-100"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Users
          </h2>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
            {users.length} accounts &middot; {activeUsers.length} active
          </p>
        </div>
        <button onClick={openCreate} className={BTN_PRIMARY}>
          <Plus className="size-3.5" strokeWidth={2} />
          Add user
        </button>
      </div>

      {/* Active users */}
      <div className="space-y-1.5">
        {activeUsers.map((user) =>
          deactivatingId === user.id ? (
            <div key={user.id} className="rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5 p-4">
              <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-3">
                Deactivate <span className="font-semibold">{user.name}</span>? They will lose access to the system.
              </p>
              <div className="flex gap-2">
                <button onClick={() => handleDeactivate(user.id)} className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">Deactivate</button>
                <button onClick={() => setDeactivatingId(null)} className={BTN_GHOST}>Cancel</button>
              </div>
            </div>
          ) : (
            <UserRow key={user.id} user={user} onEdit={() => openEdit(user)} onDeactivate={() => setDeactivatingId(user.id)} />
          )
        )}
      </div>

      {/* Inactive users */}
      {inactiveUsers.length > 0 && (
        <div className="space-y-1.5">
          <div className={`${HEADING} px-1 pt-2`}>Inactive</div>
          {inactiveUsers.map((user) =>
            deactivatingId === user.id ? (
              <div key={user.id} className="rounded-lg border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5 p-4">
                <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-3">
                  Reactivate <span className="font-semibold">{user.name}</span>?
                </p>
                <div className="flex gap-2">
                  <button onClick={() => { onReactivate?.(user.id); setDeactivatingId(null) }} className="px-3 py-1.5 text-sm font-medium rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">Reactivate</button>
                  <button onClick={() => setDeactivatingId(null)} className={BTN_GHOST}>Cancel</button>
                </div>
              </div>
            ) : (
              <UserRow key={user.id} user={user} onEdit={() => openEdit(user)} onReactivate={() => setDeactivatingId(user.id)} />
            )
          )}
        </div>
      )}

      {/* User editor slide-over */}
      {slideoverMode !== 'closed' && createPortal(
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-[1px]" onClick={closeSlideover} />
          <div className="relative w-full max-w-md h-full flex flex-col bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
              <div>
                <h2
                  className="text-base font-bold text-zinc-900 dark:text-zinc-100"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {slideoverMode === 'create' ? 'New User' : 'Edit User'}
                </h2>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                  {slideoverMode === 'create' ? 'Create a new account' : `Editing ${editingUser?.name}`}
                </p>
              </div>
              <button onClick={closeSlideover} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <X className="size-4" strokeWidth={1.5} />
              </button>
            </div>

            {/* Form body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Identity */}
              <div className="space-y-3">
                <div className={`${HEADING} flex items-center gap-2`}>
                  <User className="size-3" strokeWidth={2} />
                  Identity
                </div>
                <div>
                  <label className={LABEL}>Name</label>
                  <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Full name" className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Email</label>
                  <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="user@company.com" className={INPUT} />
                </div>
              </div>

              {/* Role */}
              <div className="space-y-3">
                <div className={`${HEADING} flex items-center gap-2`}>
                  <Shield className="size-3" strokeWidth={2} />
                  Role & Access
                </div>
                <div className="flex gap-2">
                  {(['admin', 'regular'] as UserRole[]).map((role) => (
                    <button
                      key={role}
                      onClick={() => setFormRole(role)}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium rounded-lg border transition-all ${
                        formRole === role
                          ? 'bg-sky-50 dark:bg-sky-500/10 border-sky-300 dark:border-sky-500/30 text-sky-700 dark:text-sky-300 shadow-sm shadow-sky-500/5'
                          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600'
                      }`}
                    >
                      {role === 'admin' ? <ShieldCheck className="size-3.5" strokeWidth={1.5} /> : <Shield className="size-3.5" strokeWidth={1.5} />}
                      {role === 'admin' ? 'Admin' : 'Regular User'}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                  {formRole === 'admin' ? 'Full access to all sections and people.' : 'Scoped to assigned sections and people only.'}
                </p>
              </div>

              {/* Section permissions — regular only */}
              {formRole === 'regular' && (
                <div className="space-y-2.5">
                  <label className={LABEL}>Section Access</label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableSections.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => toggleSection(section.id)}
                        className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                          formSections.includes(section.id)
                            ? 'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20 text-sky-700 dark:text-sky-300'
                            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600'
                        }`}
                      >
                        <span className={`size-3.5 rounded border flex items-center justify-center shrink-0 ${
                          formSections.includes(section.id)
                            ? 'bg-sky-500 dark:bg-sky-600 border-sky-500 dark:border-sky-600'
                            : 'border-zinc-300 dark:border-zinc-600'
                        }`}>
                          {formSections.includes(section.id) && <Check className="size-2 text-white" strokeWidth={3} />}
                        </span>
                        {section.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* People assignment — regular only */}
              {formRole === 'regular' && (
                <div className="space-y-2.5">
                  <label className={LABEL}>Assigned People</label>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 -mt-1">
                    User can only view data for selected people.
                  </p>
                  <div className="space-y-1">
                    {availablePeople.map((person) => (
                      <button
                        key={person.id}
                        onClick={() => togglePerson(person.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs rounded-lg border transition-all ${
                          formPeople.includes(person.id)
                            ? 'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20 text-sky-700 dark:text-sky-300 font-medium'
                            : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-200 dark:hover:border-zinc-700'
                        }`}
                      >
                        <span className={`size-3.5 rounded border flex items-center justify-center shrink-0 ${
                          formPeople.includes(person.id)
                            ? 'bg-sky-500 dark:bg-sky-600 border-sky-500 dark:border-sky-600'
                            : 'border-zinc-300 dark:border-zinc-600'
                        }`}>
                          {formPeople.includes(person.id) && <Check className="size-2 text-white" strokeWidth={3} />}
                        </span>
                        {person.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0 flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={!formName.trim() || !formEmail.trim()}
                className={`${BTN_PRIMARY} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {slideoverMode === 'create' ? 'Create user' : 'Save changes'}
              </button>
              <button onClick={closeSlideover} className={BTN_GHOST}>Cancel</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

/* ── User Row ── */

function UserRow({
  user,
  onEdit,
  onDeactivate,
  onReactivate,
}: {
  user: SystemUser
  onEdit: () => void
  onDeactivate?: () => void
  onReactivate?: () => void
}) {
  const isInactive = user.status === 'inactive'
  const roleConfig = ROLE_CONFIG[user.role]
  const RoleIcon = roleConfig.Icon

  function getInitials(name: string) {
    return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  }

  return (
    <div
      className={`group flex items-center gap-3 px-4 py-3 rounded-lg border transition-all cursor-pointer ${
        isInactive
          ? 'border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/30 dark:bg-zinc-800/10 opacity-60'
          : 'border-zinc-100 dark:border-zinc-800/80 hover:border-zinc-200 dark:hover:border-zinc-700 bg-zinc-50/40 dark:bg-zinc-800/20 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
      }`}
      onClick={onEdit}
    >
      {/* Avatar */}
      <div className={`size-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
        isInactive
          ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500'
          : user.role === 'admin'
            ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
            : 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400'
      }`}>
        {getInitials(user.name)}
      </div>

      {/* Name & email */}
      <div className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{user.name}</span>
        <span className="block text-xs text-zinc-400 dark:text-zinc-500 truncate">{user.email}</span>
      </div>

      {/* Role badge */}
      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${roleConfig.className}`}>
        <RoleIcon className="size-2.5" strokeWidth={2} />
        {roleConfig.label}
      </span>

      {/* Status indicator */}
      <div className="flex items-center gap-1.5 shrink-0 w-16">
        <CircleDot className={`size-3 ${
          user.status === 'active'
            ? 'text-emerald-500 dark:text-emerald-400'
            : 'text-zinc-300 dark:text-zinc-600'
        }`} strokeWidth={2} />
        <span className={`text-[11px] font-medium ${
          user.status === 'active'
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-zinc-400 dark:text-zinc-500'
        }`}>
          {user.status === 'active' ? 'Active' : 'Off'}
        </span>
      </div>

      {/* Last active */}
      <span className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0 w-16 text-right tabular-nums">
        {formatRelativeTime(user.lastActiveAt)}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onEdit}
          className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="Edit"
        >
          <UserCog className="size-3.5" strokeWidth={1.5} />
        </button>
        {user.status === 'active' && onDeactivate && (
          <button
            onClick={onDeactivate}
            className="p-1.5 rounded-md text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            title="Deactivate"
          >
            <X className="size-3.5" strokeWidth={1.5} />
          </button>
        )}
        {user.status === 'inactive' && onReactivate && (
          <button
            onClick={onReactivate}
            className="p-1.5 rounded-md text-zinc-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
            title="Reactivate"
          >
            <Check className="size-3.5" strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  )
}

