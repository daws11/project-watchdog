import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Router } from 'express'

type UserRole = 'admin' | 'regular'
type UserStatus = 'active' | 'inactive'
type SmtpEncryption = 'none' | 'ssl' | 'starttls'

interface ApiKey {
  id: string
  service: string
  maskedKey: string
  createdAt: string
  lastUsedAt: string | null
}

interface SmtpSettings {
  host: string
  port: number
  username: string
  password: string
  fromAddress: string
  encryption: SmtpEncryption
}

interface SystemUser {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  lastActiveAt: string
  sectionPermissions: string[]
  assignedPeopleIds: string[]
}

interface SectionOption {
  id: string
  label: string
}

interface PersonOption {
  id: string
  name: string
}

interface SettingsSnapshot {
  apiKeys: ApiKey[]
  smtpSettings: SmtpSettings
  users: SystemUser[]
  availableSections: SectionOption[]
  availablePeople: PersonOption[]
}

interface ApiKeyFormData {
  service: string
  key: string
}

interface UserFormData {
  name: string
  email: string
  role: UserRole
  sectionPermissions: string[]
  assignedPeopleIds: string[]
}

const __dirname = dirname(fileURLToPath(import.meta.url))

const samplePath = resolve(
  __dirname,
  '../../../../product-plan/sections/settings/sample-data.json',
)
const sampleData = JSON.parse(readFileSync(samplePath, 'utf-8')) as SettingsSnapshot

let apiKeys: ApiKey[] = [...(sampleData.apiKeys ?? [])]
let smtpSettings: SmtpSettings = sampleData.smtpSettings ?? {
  host: '',
  port: 587,
  username: '',
  password: '',
  fromAddress: '',
  encryption: 'starttls',
}
let users: SystemUser[] = [...(sampleData.users ?? [])]

const availableSections: SectionOption[] = [...(sampleData.availableSections ?? [])]
const availablePeople: PersonOption[] = [...(sampleData.availablePeople ?? [])]

function randomId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function maskKey(raw: string): string {
  const key = raw.trim()
  if (!key) return '****'
  if (key.length <= 8) return '****'
  const first = key.slice(0, Math.min(7, key.length))
  const last = key.slice(-4)
  return `${first}****...${last}`
}

const router = Router()

// GET /api/settings — full settings snapshot
router.get('/', (_req, res) => {
  res.json({
    apiKeys,
    smtpSettings,
    users,
    availableSections,
    availablePeople,
  })
})

// POST /api/settings/api-keys — add API key (stored masked only)
router.post('/api-keys', (req, res) => {
  const body = req.body as Partial<ApiKeyFormData>
  const service = typeof body.service === 'string' ? body.service.trim() : ''
  const key = typeof body.key === 'string' ? body.key.trim() : ''

  if (!service || !key) {
    res.status(400).json({ error: 'service and key are required' })
    return
  }

  const now = new Date().toISOString()
  const apiKey: ApiKey = {
    id: randomId('key'),
    service,
    maskedKey: maskKey(key),
    createdAt: now,
    lastUsedAt: null,
  }

  apiKeys = [apiKey, ...apiKeys]
  res.status(201).json({ apiKey })
})

// DELETE /api/settings/api-keys/:keyId — delete API key
router.delete('/api-keys/:keyId', (req, res) => {
  const keyId = req.params.keyId
  const before = apiKeys.length
  apiKeys = apiKeys.filter((k) => k.id !== keyId)
  if (apiKeys.length === before) {
    res.status(404).json({ error: 'API key not found' })
    return
  }
  res.json({ success: true })
})

// PUT /api/settings/smtp — save SMTP settings
router.put('/smtp', (req, res) => {
  const body = req.body as Partial<SmtpSettings>
  const host = typeof body.host === 'string' ? body.host.trim() : ''
  const port =
    typeof body.port === 'number' && Number.isFinite(body.port) ? body.port : 587
  const username = typeof body.username === 'string' ? body.username.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const fromAddress =
    typeof body.fromAddress === 'string' ? body.fromAddress.trim() : ''
  const encryption: SmtpEncryption =
    body.encryption === 'none' || body.encryption === 'ssl' || body.encryption === 'starttls'
      ? body.encryption
      : 'starttls'

  smtpSettings = { host, port, username, password, fromAddress, encryption }
  res.json({ smtpSettings })
})

// POST /api/settings/smtp/test — test SMTP connection (stub)
router.post('/smtp/test', async (_req, res) => {
  // For now this is a stub that always succeeds. When SMTP sending is wired,
  // replace this with a real connection verification.
  res.json({ success: true })
})

// POST /api/settings/users — create user
router.post('/users', (req, res) => {
  const body = req.body as Partial<UserFormData>
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const role: UserRole = body.role === 'admin' || body.role === 'regular' ? body.role : 'regular'
  const sectionPermissions = Array.isArray(body.sectionPermissions) ? body.sectionPermissions.filter((s) => typeof s === 'string') : []
  const assignedPeopleIds = Array.isArray(body.assignedPeopleIds) ? body.assignedPeopleIds.filter((s) => typeof s === 'string') : []

  if (!name || !email) {
    res.status(400).json({ error: 'name and email are required' })
    return
  }

  const now = new Date().toISOString()
  const user: SystemUser = {
    id: randomId('sysuser'),
    name,
    email,
    role,
    status: 'active',
    lastActiveAt: now,
    sectionPermissions,
    assignedPeopleIds,
  }

  users = [user, ...users]
  res.status(201).json({ user })
})

// PUT /api/settings/users/:userId — edit user
router.put('/users/:userId', (req, res) => {
  const userId = req.params.userId
  const idx = users.findIndex((u) => u.id === userId)
  if (idx === -1) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  const body = req.body as Partial<UserFormData>
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const role: UserRole = body.role === 'admin' || body.role === 'regular' ? body.role : users[idx].role
  const sectionPermissions = Array.isArray(body.sectionPermissions) ? body.sectionPermissions.filter((s) => typeof s === 'string') : users[idx].sectionPermissions
  const assignedPeopleIds = Array.isArray(body.assignedPeopleIds) ? body.assignedPeopleIds.filter((s) => typeof s === 'string') : users[idx].assignedPeopleIds

  if (!name || !email) {
    res.status(400).json({ error: 'name and email are required' })
    return
  }

  const updated: SystemUser = {
    ...users[idx],
    name,
    email,
    role,
    sectionPermissions,
    assignedPeopleIds,
  }

  users = users.map((u) => (u.id === userId ? updated : u))
  res.json({ user: updated })
})

// POST /api/settings/users/:userId/deactivate
router.post('/users/:userId/deactivate', (req, res) => {
  const userId = req.params.userId
  const user = users.find((u) => u.id === userId)
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }
  if (user.status === 'inactive') {
    res.status(400).json({ error: 'User is already inactive' })
    return
  }
  const updated: SystemUser = { ...user, status: 'inactive' }
  users = users.map((u) => (u.id === userId ? updated : u))
  res.json({ user: updated })
})

// POST /api/settings/users/:userId/reactivate
router.post('/users/:userId/reactivate', (req, res) => {
  const userId = req.params.userId
  const user = users.find((u) => u.id === userId)
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }
  if (user.status === 'active') {
    res.status(400).json({ error: 'User is already active' })
    return
  }
  const updated: SystemUser = { ...user, status: 'active' }
  users = users.map((u) => (u.id === userId ? updated : u))
  res.json({ user: updated })
})

export { router as settingsRouter }

