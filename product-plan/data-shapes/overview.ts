// =============================================================================
// UI Data Shapes — Combined Reference
//
// These types define the data that UI components expect to receive as props.
// They are a frontend contract, not a database schema. How you model, store,
// and fetch this data is an implementation decision.
// =============================================================================

// -----------------------------------------------------------------------------
// From: sections/dashboard
// -----------------------------------------------------------------------------

export type KpiColor = 'sky' | 'amber' | 'red' | 'default'
export type TrendDirection = 'up' | 'down' | 'neutral'
export type GoalStatus_Dashboard = 'on' | 'off'
export type ActivityEventType = 'processing' | 'task' | 'problem' | 'source' | 'identity'

export interface DashboardKpi {
  id: string
  label: string
  value: number
  trend: string
  trendDirection: TrendDirection
  color: KpiColor
  linkTo: string
  linkFilter: string
}

export interface GoalAlignmentSummary {
  onGoal: number
  offGoal: number
  total: number
  linkTo: string
  linkFilterOnGoal: string
  linkFilterOffGoal: string
}

export interface AttentionPerson {
  personId: string
  name: string
  role: string
  goalStatus: GoalStatus_Dashboard
  misalignedGoal: string
  taskCount: number
  goalMatchCount: number
}

export interface ActivityEvent {
  id: string
  type: ActivityEventType
  description: string
  timestamp: string
  linkTo: string
}

// -----------------------------------------------------------------------------
// From: sections/people
// -----------------------------------------------------------------------------

export interface TaskCounts {
  high: number
  medium: number
  low: number
  overdue: number
  total: number
}

export type UserStatus = 'active' | 'dormant'
export type GoalStatus_People = 'on_goal' | 'off_goal'
export type PeopleFilter = 'active' | 'all'
export type PeopleSortBy = 'default' | 'name' | 'workload' | 'priority_risk'
export type TaskLoad = 'above' | 'average' | 'below'
export type TaskPriority = 'high' | 'medium' | 'low'
export type TaskStatus = 'open' | 'in_progress' | 'done'

export interface Task_People {
  id: string
  userId: string
  title: string
  summary: string
  priority: TaskPriority
  status: TaskStatus
  dueDate: string | null
  confidence: number
  sourceReference: string
  createdAt: string
  isOverdue: boolean
}

export interface PersonSummary_People {
  id: string
  name: string | null
  phone: string
  email: string | null
  aliases: string[]
  role: string | null
  function: string | null
  identifiersLinked: number
  taskCounts: TaskCounts
  lastActivityAt: string
  status: UserStatus
  goalStatus: GoalStatus_People
}

export interface PersonReference {
  name: string
  personId: string | null
}

export interface TaskMessage {
  id: string
  taskId: string
  content: string
  sender: string
  senderId: string | null
  timestamp: string
  source: string
  isOriginal: boolean
  personReferences: PersonReference[]
}

export interface PersonSettingsData {
  name: string
  aliases: string
  email: string
  phone: string
  roleName: string
  roleDescription: string
  priorities: string
  customPrompt: string
}

// -----------------------------------------------------------------------------
// From: sections/tasks
// -----------------------------------------------------------------------------

export type SourceType = 'whatsapp' | 'slack' | 'email'
export type ChatRole = 'user' | 'assistant'

export interface Task_Tasks {
  id: string
  userId: string
  userName: string
  userRole: string
  sourceId: string
  sourceName: string
  title: string
  summary: string
  priority: TaskPriority
  status: TaskStatus
  dueDate: string | null
  confidence: number
  sourceReference: string
  createdAt: string
  isOverdue: boolean
}

export interface PersonSummary_Tasks {
  id: string
  name: string
  role: string
}

export interface SourceSummary {
  id: string
  name: string
  type: SourceType
}

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  timestamp: string
}

// -----------------------------------------------------------------------------
// From: sections/sources
// -----------------------------------------------------------------------------

export type ChannelType = 'whatsapp' | 'google_meet' | 'email' | 'webhook'
export type ConnectionStatus = 'active' | 'paused' | 'error'

export interface Channel {
  id: string
  name: string
  type: ChannelType
  description: string
  connectionCount: number
  activeCount: number
  hasErrors: boolean
}

export interface Connection {
  id: string
  channelId: string
  label: string
  identifier: string
  status: ConnectionStatus
  lastSyncAt: string
  messagesProcessed: number
  error: string | null
  createdAt: string
}

export interface NewConnectionData {
  label: string
  identifier: string
}

export interface EditConnectionData {
  label: string
  identifier: string
}

// -----------------------------------------------------------------------------
// From: sections/processing
// -----------------------------------------------------------------------------

export type RuleAction = 'extract_tasks' | 'update_profiles' | 'both'
export type RunStatus = 'success' | 'partial' | 'failed'

export interface ProcessingRule {
  id: string
  name: string
  description: string
  schedule: string
  channelIds: string[]
  channelNames: string[]
  prompt: string
  action: RuleAction
  enabled: boolean
  lastRunAt: string | null
  lastRunStatus: RunStatus | null
  createdAt: string
}

export interface RunError {
  message: string
  context: string
}

export interface ProcessingRun {
  id: string
  ruleId: string
  ruleName: string
  startedAt: string
  duration: number
  status: RunStatus
  messagesProcessed: number
  tasksExtracted: number
  identitiesResolved: number
  profilesUpdated: number
  errors: RunError[]
}

export interface RuleFormData {
  name: string
  description: string
  schedule: string
  channelIds: string[]
  prompt: string
  action: RuleAction
}

// -----------------------------------------------------------------------------
// From: sections/settings
// -----------------------------------------------------------------------------

export type UserRole = 'admin' | 'regular'
export type SystemUserStatus = 'active' | 'inactive'
export type SmtpEncryption = 'none' | 'ssl' | 'starttls'
export type SettingsCategory = 'api_keys' | 'smtp' | 'users'

export interface ApiKey {
  id: string
  service: string
  maskedKey: string
  createdAt: string
  lastUsedAt: string | null
}

export interface ApiKeyFormData {
  service: string
  key: string
}

export interface SmtpSettings {
  host: string
  port: number
  username: string
  password: string
  fromAddress: string
  encryption: SmtpEncryption
}

export interface SectionOption {
  id: string
  label: string
}

export interface PersonOption {
  id: string
  name: string
}

export interface SystemUser {
  id: string
  name: string
  email: string
  role: UserRole
  status: SystemUserStatus
  lastActiveAt: string
  sectionPermissions: string[]
  assignedPeopleIds: string[]
}

export interface UserFormData {
  name: string
  email: string
  role: UserRole
  sectionPermissions: string[]
  assignedPeopleIds: string[]
}
