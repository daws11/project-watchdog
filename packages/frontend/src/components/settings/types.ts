// Settings section types

/** System user role */
export type UserRole = 'admin' | 'regular'

/** System user status */
export type UserStatus = 'active' | 'inactive'

/** SMTP encryption method */
export type SmtpEncryption = 'none' | 'ssl' | 'starttls'

/** Settings category for sidebar navigation */
export type SettingsCategory = 'api_keys' | 'smtp' | 'users'

/** A configured API key for an external service */
export interface ApiKey {
  id: string
  service: string
  maskedKey: string
  createdAt: string
  lastUsedAt: string | null
}

/** Data for creating or editing an API key */
export interface ApiKeyFormData {
  service: string
  key: string
}

/** SMTP configuration */
export interface SmtpSettings {
  host: string
  port: number
  username: string
  password: string
  fromAddress: string
  encryption: SmtpEncryption
}

/** A section available for permission assignment */
export interface SectionOption {
  id: string
  label: string
}

/** A person available for assignment */
export interface PersonOption {
  id: string
  name: string
}

/** A system user account */
export interface SystemUser {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  lastActiveAt: string
  sectionPermissions: string[]
  assignedPeopleIds: string[]
}

/** Data for creating or editing a system user */
export interface UserFormData {
  name: string
  email: string
  role: UserRole
  sectionPermissions: string[]
  assignedPeopleIds: string[]
}

/** Props for the Settings view */
export interface SettingsProps {
  apiKeys: ApiKey[]
  smtpSettings: SmtpSettings
  users: SystemUser[]
  availableSections: SectionOption[]
  availablePeople: PersonOption[]

  /** Called when user adds a new API key */
  onAddApiKey?: (data: ApiKeyFormData) => void

  /** Called when user deletes an API key */
  onDeleteApiKey?: (keyId: string) => void

  /** Called when user saves SMTP settings */
  onSaveSmtp?: (data: SmtpSettings) => void

  /** Called when user tests SMTP connection */
  onTestSmtp?: () => void

  /** Called when user creates a new system user */
  onCreateUser?: (data: UserFormData) => void

  /** Called when user edits an existing system user */
  onEditUser?: (userId: string, data: UserFormData) => void

  /** Called when user deactivates a system user */
  onDeactivateUser?: (userId: string) => void

  /** Called when user reactivates a system user */
  onReactivateUser?: (userId: string) => void
}

