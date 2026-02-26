// Processing section types

/** Target action a processing rule performs */
export type RuleAction = 'extract_tasks' | 'update_profiles' | 'both'

/** Processing run status */
export type RunStatus = 'success' | 'partial' | 'failed'

/** A configured processing rule */
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

/** An error encountered during a processing run */
export interface RunError {
  message: string
  context: string
}

/** A record of a single processing run execution */
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

/** Data for creating or editing a processing rule */
export interface RuleFormData {
  name: string
  description: string
  schedule: string
  channelIds: string[]
  prompt: string
  action: RuleAction
}

/** Props for the Processing view */
export interface ProcessingProps {
  rules: ProcessingRule[]
  runs: ProcessingRun[]

  /** Called when user creates a new rule */
  onCreateRule?: (data: RuleFormData) => void

  /** Called when user edits an existing rule */
  onEditRule?: (ruleId: string, data: RuleFormData) => void

  /** Called when user deletes a rule */
  onDeleteRule?: (ruleId: string) => void

  /** Called when user toggles a rule enabled/disabled */
  onToggleRule?: (ruleId: string, enabled: boolean) => void

  /** Called when user triggers a manual run */
  onRunNow?: (ruleId: string) => void
}
