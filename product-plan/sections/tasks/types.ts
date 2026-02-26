// Tasks section types
// Reuses TaskPriority, TaskStatus, PersonReference, TaskMessage, PersonSettingsData
// from the People section types for consistency.

/** Task priority level */
export type TaskPriority = 'high' | 'medium' | 'low'

/** Task status */
export type TaskStatus = 'open' | 'in_progress' | 'done'

/** Source type for filter dropdown */
export type SourceType = 'whatsapp' | 'slack' | 'email'

/** Chat message role */
export type ChatRole = 'user' | 'assistant'

/** A single extracted task with denormalized assignee and source info */
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
}

/** Minimal person info for the assignee filter dropdown and inline display */
export interface PersonSummary {
  id: string
  name: string
  role: string
}

/** Minimal source info for the source filter dropdown */
export interface SourceSummary {
  id: string
  name: string
  type: SourceType
}

/** A person referenced within a message */
export interface PersonReference {
  name: string
  personId: string | null
}

/** A raw message associated with a task */
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

/** A single message in the LLM chat conversation */
export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  timestamp: string
}

/** Editable person settings (same shape as People section) */
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

/** Props for the Tasks view */
export interface TasksProps {
  tasks: Task[]
  people: PersonSummary[]
  sources: SourceSummary[]
  messages: TaskMessage[]
  chatMessages: ChatMessage[]

  /** Navigate to a person's detail page */
  onPersonClick?: (personId: string) => void

  /** Save updated person settings from the slide-over */
  onSavePersonSettings?: (personId: string, data: PersonSettingsData) => void

  /** Send a chat message to the LLM */
  onChatSend?: (message: string, taskContext: Task[]) => void
}
