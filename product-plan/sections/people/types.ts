/** Breakdown of a user's active tasks by priority level */
export interface TaskCounts {
  high: number
  medium: number
  low: number
  overdue: number
  total: number
}

/** User activity status */
export type UserStatus = 'active' | 'dormant'

/** Whether a person's tasks align with their stated priorities */
export type GoalStatus = 'on_goal' | 'off_goal'

/** Filter toggle for the people list */
export type PeopleFilter = 'active' | 'all'

/** Sort options for the people list */
export type PeopleSortBy = 'default' | 'name' | 'workload' | 'priority_risk'

/** How a person's task count compares to the team average */
export type TaskLoad = 'above' | 'average' | 'below'

/** Task priority level */
export type TaskPriority = 'high' | 'medium' | 'low'

/** Task status */
export type TaskStatus = 'open' | 'in_progress' | 'done'

/** A single extracted task assigned to a person */
export interface Task {
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

/** Pre-aggregated person summary for the People list view */
export interface PersonSummary {
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
  goalStatus: GoalStatus
}

/** Props for the People list view */
export interface PeopleProps {
  people: PersonSummary[]

  /** Called when user clicks a person row to navigate to their detail page */
  onPersonClick?: (personId: string) => void

  /** Called when search query changes */
  onSearch?: (query: string) => void

  /** Called when filter toggle changes (Active / All) */
  onFilterChange?: (filter: PeopleFilter) => void

  /** Called when sort option changes */
  onSortChange?: (sortBy: PeopleSortBy) => void
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

/** Editable person settings for identity resolution and AI processing */
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

/** Props for the Person detail view */
export interface PersonDetailProps {
  person: PersonSummary
  tasks: Task[]
  messages: TaskMessage[]
  averageTaskCount: number

  /** Called when user clicks back to return to the people list */
  onBack?: () => void

  /** Called when user saves person settings */
  onSaveSettings?: (personId: string, data: PersonSettingsData) => void

  /** Called when a person reference is clicked in the task detail modal */
  onPersonReferenceClick?: (personId: string) => void
}
