// Dashboard section types

export type KpiColor = 'sky' | 'amber' | 'red' | 'default'
export type TrendDirection = 'up' | 'down' | 'neutral'
export type GoalStatus = 'on' | 'off'
export type ActivityEventType = 'processing' | 'task' | 'problem' | 'source' | 'identity'

export interface DashboardKpi {
  id: string
  label: string
  value: number
  /** Change indicator, e.g. "+3", "-2", "0" */
  trend: string
  trendDirection: TrendDirection
  color: KpiColor
  /** Section route to navigate to on click */
  linkTo: string
  /** Query string filter to apply on navigation */
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
  goalStatus: GoalStatus
  /** The primary goal this person is failing to align with */
  misalignedGoal: string
  /** Total tasks assigned to this person */
  taskCount: number
  /** How many of their tasks align with their configured goals */
  goalMatchCount: number
}

export interface ActivityEvent {
  id: string
  type: ActivityEventType
  description: string
  /** ISO 8601 timestamp */
  timestamp: string
  /** Section route to navigate to on click */
  linkTo: string
}

export interface DashboardProps {
  kpis: DashboardKpi[]
  goalAlignment: GoalAlignmentSummary
  attentionPeople: AttentionPerson[]
  activityFeed: ActivityEvent[]

  /** Navigate to a section route, optionally with a filter query string */
  onNavigate?: (path: string, filter?: string) => void
  /** Navigate to a specific person's detail view */
  onPersonClick?: (personId: string) => void
}
