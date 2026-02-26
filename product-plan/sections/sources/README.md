# Sources

## Overview

A channel management view showing supported data ingestion channels as cards. Each card displays connection count and status, and clicking a card opens a modal listing existing connections with full management controls and the ability to add new connections.

## User Flows

- View all supported channels as cards with connection count and active/inactive status
- Click a channel card to open a modal showing existing connections
- Add a new connection via a form (fields vary by channel type)
- View connection details: status, last sync time, error details
- Pause or resume an individual connection
- Edit connection settings
- Disconnect/delete a connection with confirmation
- See at-a-glance summary of total active connections

## Design Decisions

- Channel cards in responsive grid (2-3 columns desktop, 1 mobile)
- Each card shows channel icon, name, connection count, aggregate status indicator
- Modal with connection list and "Add connection" button
- Connection rows show label, status badge, last sync, action buttons
- Add connection form fields vary by channel type (phone for WhatsApp, email for Email, URL for Webhook, account for Google Meet)
- Error state shows error message and "Retry" action
- Fixed channel set: WhatsApp, Google Meet, Email, Webhook

## Data Shapes

**Entities:**
- `Channel` — Supported ingestion channel with type, connection count, error status
- `Connection` — Configured connection with status, sync time, error info
- `NewConnectionData` — Data for creating a new connection
- `EditConnectionData` — Data for editing an existing connection

## Components Provided

- `SourcesView` — Complete sources page with channel cards and connection management modals

## Callback Props

| Callback | Triggered When |
|----------|---------------|
| `onChannelClick` | User clicks a channel card |
| `onAddConnection` | User submits the add connection form |
| `onPauseConnection` | User pauses a connection |
| `onResumeConnection` | User resumes a paused connection |
| `onEditConnection` | User saves edited connection settings |
| `onDeleteConnection` | User confirms connection deletion |
| `onRetryConnection` | User retries a failed connection |
