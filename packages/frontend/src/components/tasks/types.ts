export type TaskPriority = 'high' | 'medium' | 'low'

export type TaskStatus = 'open' | 'in_progress' | 'done'

export type SourceType = 'whatsapp' | 'slack' | 'email'

export type ChatRole = 'user' | 'assistant'

export interface Project {
  id: string
  name: string
  healthScore: number
}

export interface ProjectWithTasks extends Project {
  taskStats: { open: number; done: number; blocked: number; total: number }
  people: ProjectPerson[]
  tasks: Task[]
}

export interface ProjectPerson {
  id: string
  name: string
  role: string
  taskCount: number
  openTasks: number
}

export interface Task {
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
  // Extended fields for project view
  projectId?: number
  projectName?: string
  rawStatus?: string
}

export interface PersonSummary {
  id: string
  name: string
  role: string
}

export interface SourceSummary {
  id: string
  name: string
  type: SourceType
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

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  timestamp: string
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

export type ViewMode = 'priority' | 'project'

export interface TasksProps {
  tasks: Task[]
  people: PersonSummary[]
  sources: SourceSummary[]
  messages: TaskMessage[]
  chatMessages: ChatMessage[]
  viewMode?: ViewMode
  onViewModeChange?: (mode: ViewMode) => void
  onPersonClick?: (personId: string) => void
  onSavePersonSettings?: (personId: string, data: PersonSettingsData) => void
  onChatSend?: (message: string, taskContext: Task[]) => void
}
