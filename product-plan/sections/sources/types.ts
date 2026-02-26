// Sources section types

/** Supported channel types */
export type ChannelType = 'whatsapp' | 'google_meet' | 'email' | 'webhook'

/** Connection status */
export type ConnectionStatus = 'active' | 'paused' | 'error'

/** A supported data ingestion channel */
export interface Channel {
  id: string
  name: string
  type: ChannelType
  description: string
  connectionCount: number
  activeCount: number
  hasErrors: boolean
}

/** A single configured connection within a channel */
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

/** Props for the Sources view */
export interface SourcesProps {
  channels: Channel[]
  connections: Connection[]

  /** Called when user clicks a channel card to view its connections */
  onChannelClick?: (channelId: string) => void

  /** Called when user adds a new connection */
  onAddConnection?: (channelId: string, data: NewConnectionData) => void

  /** Called when user pauses a connection */
  onPauseConnection?: (connectionId: string) => void

  /** Called when user resumes a paused connection */
  onResumeConnection?: (connectionId: string) => void

  /** Called when user edits a connection's settings */
  onEditConnection?: (connectionId: string, data: EditConnectionData) => void

  /** Called when user disconnects/deletes a connection */
  onDeleteConnection?: (connectionId: string) => void

  /** Called when user retries a failed connection */
  onRetryConnection?: (connectionId: string) => void
}

/** Data for creating a new connection */
export interface NewConnectionData {
  label: string
  identifier: string
}

/** Data for editing an existing connection */
export interface EditConnectionData {
  label: string
  identifier: string
}
