# Test Specs: Sources

These test specs are **framework-agnostic**. Adapt them to your testing setup.

## Overview
The Sources section displays supported data ingestion channels (WhatsApp, Google Meet, Email, Webhook) as cards. Clicking a card opens a modal listing existing connections with full CRUD management. Tests cover channel cards, the connection modal, add/edit/delete flows, pause/resume, retry, and all connection states.

---

## User Flow Tests

### Flow 1: View Channel Cards
**Scenario:** User views the source channels overview.

#### Success Path
**Setup:** Render `SourcesView` with `channels` containing all 4 types (whatsapp, google_meet, email, webhook) with varying connection counts and error states. Provide `connections` array.

**Steps:**
1. Verify header: "Sources" title with subtitle "Manage data ingestion channels and connections"
2. Verify stat cards: "Total Connections", "Active" (emerald), "Channels with Errors" (red if > 0)
3. Verify 4 channel cards in a responsive grid
4. For each card, verify: channel icon, channel name, connection count ("N connections"), description, and status indicator

**Expected Results:**
- [ ] WhatsApp card shows MessageCircle icon with emerald coloring
- [ ] Google Meet card shows Video icon with sky coloring
- [ ] Email card shows Mail icon with violet coloring
- [ ] Webhook card shows Webhook icon with amber coloring
- [ ] Card with no connections shows "Not connected" status (CircleDot icon, zinc color)
- [ ] Card with all active connections shows "All active" status (CheckCircle2 icon, emerald)
- [ ] Card with errors shows "Has errors" status (AlertTriangle icon, red)
- [ ] Card with mixed active/paused shows "X of Y active" status (Clock icon, amber)

---

### Flow 2: Open Channel Modal
**Scenario:** User clicks a channel card to view its connections.

#### Success Path
**Setup:** Render with a WhatsApp channel that has 3 connections (1 active, 1 paused, 1 error).

**Steps:**
1. Click the WhatsApp channel card
2. Verify a modal opens with: channel icon, channel name as heading, description, and close (X) button
3. Verify connection list shows all 3 connections
4. Verify each connection row displays: label, identifier (monospace), status badge (Active/Paused/Error with colored dot), sync time, message count, and action buttons
5. Verify the "Add connection" button is visible in the modal footer
6. Click X button to close
7. Click overlay to close

**Expected Results:**
- [ ] Modal opens centered on screen (portal to `document.body`)
- [ ] Active connection shows: green "Active" badge, Pause and Edit and Disconnect buttons
- [ ] Paused connection shows: gray "Paused" badge, Resume and Edit and Disconnect buttons
- [ ] Error connection shows: red "Error" badge, Retry and Edit and Disconnect buttons, plus error message box

---

### Flow 3: Add a New Connection
**Scenario:** User adds a new connection to a channel.

#### Success Path
**Setup:** Open the WhatsApp channel modal.

**Steps:**
1. Click "Add connection" button in the modal footer
2. Verify a form appears with fields: "Connection name" (placeholder: "e.g. Operations Group") and channel-specific field (for WhatsApp: "Phone number" with placeholder "+971501234567")
3. Verify the "Add" submit button is disabled when fields are empty
4. Fill in label: "Operations Group" and identifier: "+971501234567"
5. Click "Add" button

**Expected Results:**
- [ ] `onAddConnection` is called with `(channelId, { label: 'Operations Group', identifier: '+971501234567' })`
- [ ] Form clears and closes after successful submission
- [ ] "Add connection" button is hidden while the form is visible

#### Channel-Specific Fields
**Expected Results:**
- [ ] WhatsApp: field label "Phone number", placeholder "+971501234567"
- [ ] Google Meet: field label "Google account", placeholder "user@company.com"
- [ ] Email: field label "Email address", placeholder "inbox@company.com"
- [ ] Webhook: field label "Webhook URL", placeholder "https://api.example.com/hooks/..."

#### Failure Path: Empty Fields
**Steps:** Click "Add" with one or both fields empty.

**Expected Results:**
- [ ] "Add" button remains disabled (`disabled:opacity-40 disabled:cursor-not-allowed`)
- [ ] `onAddConnection` is NOT called

#### Cancel Add
**Steps:** Click "Cancel" while the add form is visible.

**Expected Results:**
- [ ] Form closes, fields are cleared
- [ ] "Add connection" button reappears

---

### Flow 4: Edit a Connection
**Scenario:** User edits an existing connection's label and identifier.

#### Success Path
**Setup:** Open channel modal with existing connections.

**Steps:**
1. Click the Edit button (pencil icon, `title="Edit"`) on a connection row
2. Verify the row is replaced by an edit form pre-populated with the connection's current label and identifier
3. Modify the label
4. Click "Save" button

**Expected Results:**
- [ ] `onEditConnection` is called with `(connectionId, { label: updatedLabel, identifier: updatedIdentifier })`
- [ ] Form closes after save
- [ ] "Save" button is disabled if fields are empty

#### Cancel Edit
**Steps:** Click "Cancel" while editing.

**Expected Results:**
- [ ] Edit form closes, original connection row is shown again
- [ ] No callback is fired

---

### Flow 5: Delete/Disconnect a Connection
**Scenario:** User disconnects (deletes) a connection with confirmation.

#### Success Path
**Setup:** Open channel modal with existing connections.

**Steps:**
1. Click the Disconnect button (trash icon, `title="Disconnect"`) on a connection
2. Verify a confirmation message appears: "Disconnect [label]? This will stop syncing and remove this connection."
3. Click the "Disconnect" confirmation button (red)

**Expected Results:**
- [ ] `onDeleteConnection` is called with `connectionId`
- [ ] Confirmation UI disappears

#### Cancel Delete
**Steps:** Click "Cancel" on the delete confirmation.

**Expected Results:**
- [ ] Confirmation UI disappears, original connection row is shown
- [ ] `onDeleteConnection` is NOT called

---

### Flow 6: Pause and Resume a Connection
**Scenario:** User pauses an active connection and resumes a paused one.

#### Pause
**Setup:** Connection with `status: 'active'`.

**Steps:**
1. Click the Pause button (`title="Pause"`)

**Expected Results:**
- [ ] `onPauseConnection` is called with `connectionId`

#### Resume
**Setup:** Connection with `status: 'paused'`.

**Steps:**
1. Click the Resume button (Play icon, `title="Resume"`)

**Expected Results:**
- [ ] `onResumeConnection` is called with `connectionId`

---

### Flow 7: Retry a Failed Connection
**Scenario:** User retries a connection that is in error state.

#### Success Path
**Setup:** Connection with `status: 'error'` and `error: 'Authentication token expired'`.

**Steps:**
1. Verify the error message is displayed in a red error box with AlertTriangle icon
2. Click the Retry button (RotateCcw icon, `title="Retry"`)

**Expected Results:**
- [ ] `onRetryConnection` is called with `connectionId`
- [ ] Error message text matches `connection.error`

---

## Empty State Tests

### Channel with No Connections
**Setup:** Open a channel modal where the channel has 0 connections.

**Expected Results:**
- [ ] Text "No connections configured yet." is displayed
- [ ] "Add connection" button is visible in the footer

### No Channels with Errors
**Setup:** Render with all channels having `hasErrors: false`.

**Expected Results:**
- [ ] "Channels with Errors" stat card shows "0" in default (zinc) color

---

## Component Interaction Tests

### Stat Card Calculations
**Setup:** Render with channels of varying connection counts and active counts.

**Expected Results:**
- [ ] "Total Connections" = sum of all `channel.connectionCount`
- [ ] "Active" = sum of all `channel.activeCount`
- [ ] "Channels with Errors" = count of channels where `hasErrors === true`

### Connection Status Actions
**Setup:** Render connections with each status.

**Expected Results:**
- [ ] `status: 'active'` shows Pause button, no Resume or Retry
- [ ] `status: 'paused'` shows Resume button, no Pause or Retry
- [ ] `status: 'error'` shows Retry button, no Pause or Resume
- [ ] Edit and Disconnect buttons are always visible regardless of status

### Message Count Formatting
**Setup:** Connections with `messagesProcessed` values: 500, 1500, 12500.

**Expected Results:**
- [ ] 500 renders as "500 messages"
- [ ] 1500 renders as "1.5k messages"
- [ ] 12500 renders as "12.5k messages"

### Relative Time Formatting
**Setup:** Connections with various `lastSyncAt` values.

**Expected Results:**
- [ ] < 1 hour ago: "Just now"
- [ ] 3 hours ago: "3h ago"
- [ ] 1 day ago: "1 day ago"
- [ ] 5 days ago: "5 days ago"
- [ ] > 30 days ago: formatted date (e.g. "12 Jan")

---

## Edge Cases

### Add and Edit at Same Time
**Setup:** Click "Add connection" then click Edit on an existing connection.

**Expected Results:**
- [ ] The add form closes, edit form opens (mutual exclusivity)
- [ ] Only one form is visible at a time

### Delete While Editing
**Setup:** Start editing a connection, then click Disconnect on a different one.

**Expected Results:**
- [ ] Edit form closes, delete confirmation for the other connection appears

### Long Connection Label/Identifier
**Setup:** Connection with a 100-character label and 200-character identifier.

**Expected Results:**
- [ ] Label truncates with ellipsis
- [ ] Identifier truncates with ellipsis (monospace)
- [ ] Layout does not break

### Modal Scroll with Many Connections
**Setup:** Channel with 20+ connections.

**Expected Results:**
- [ ] Connection list scrolls within the modal
- [ ] Modal has max-height of 80vh
- [ ] Header and footer remain fixed

---

## Accessibility Checks

- [ ] Channel cards are `<button>` elements with full hover and focus states
- [ ] Modal backdrop click closes the modal
- [ ] Modal close button (X) is keyboard accessible
- [ ] Connection action buttons (Pause, Resume, Edit, Disconnect, Retry) all have `title` attributes
- [ ] Form inputs in add/edit are focusable
- [ ] Add/Save/Disconnect buttons have clear disabled states
- [ ] Cancel buttons are keyboard accessible
- [ ] "Add connection" button is accessible with Plus icon and text label

---

## Sample Test Data

```typescript
import type { Channel, Connection, SourcesProps } from './types'

const mockChannels: Channel[] = [
  { id: 'ch1', name: 'WhatsApp', type: 'whatsapp', description: 'Monitor WhatsApp groups and direct messages', connectionCount: 3, activeCount: 2, hasErrors: true },
  { id: 'ch2', name: 'Google Meet', type: 'google_meet', description: 'Transcribe and analyze meeting recordings', connectionCount: 1, activeCount: 1, hasErrors: false },
  { id: 'ch3', name: 'Email', type: 'email', description: 'Scan inboxes for task-related communication', connectionCount: 2, activeCount: 2, hasErrors: false },
  { id: 'ch4', name: 'Webhook', type: 'webhook', description: 'Receive data from external integrations', connectionCount: 0, activeCount: 0, hasErrors: false },
]

const mockConnections: Connection[] = [
  {
    id: 'conn1',
    channelId: 'ch1',
    label: 'Operations Group',
    identifier: '+971501234567',
    status: 'active',
    lastSyncAt: new Date(Date.now() - 1800000).toISOString(),
    messagesProcessed: 1247,
    error: null,
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'conn2',
    channelId: 'ch1',
    label: 'Safety Alerts',
    identifier: '+971502345678',
    status: 'paused',
    lastSyncAt: new Date(Date.now() - 86400000).toISOString(),
    messagesProcessed: 312,
    error: null,
    createdAt: '2026-01-20T10:00:00Z',
  },
  {
    id: 'conn3',
    channelId: 'ch1',
    label: 'Management Chat',
    identifier: '+971503456789',
    status: 'error',
    lastSyncAt: new Date(Date.now() - 7200000).toISOString(),
    messagesProcessed: 890,
    error: 'Authentication token expired. Please re-authenticate the WhatsApp Business API.',
    createdAt: '2026-01-25T10:00:00Z',
  },
  {
    id: 'conn4',
    channelId: 'ch2',
    label: 'Team Meetings',
    identifier: 'meetings@company.com',
    status: 'active',
    lastSyncAt: new Date(Date.now() - 3600000).toISOString(),
    messagesProcessed: 56,
    error: null,
    createdAt: '2026-02-01T10:00:00Z',
  },
  {
    id: 'conn5',
    channelId: 'ch3',
    label: 'Project Inbox',
    identifier: 'project@company.com',
    status: 'active',
    lastSyncAt: new Date(Date.now() - 600000).toISOString(),
    messagesProcessed: 2340,
    error: null,
    createdAt: '2026-01-10T10:00:00Z',
  },
  {
    id: 'conn6',
    channelId: 'ch3',
    label: 'HR Inbox',
    identifier: 'hr@company.com',
    status: 'active',
    lastSyncAt: new Date(Date.now() - 1200000).toISOString(),
    messagesProcessed: 780,
    error: null,
    createdAt: '2026-01-12T10:00:00Z',
  },
]

const mockSourcesProps: SourcesProps = {
  channels: mockChannels,
  connections: mockConnections,
  onChannelClick: vi.fn(),
  onAddConnection: vi.fn(),
  onPauseConnection: vi.fn(),
  onResumeConnection: vi.fn(),
  onEditConnection: vi.fn(),
  onDeleteConnection: vi.fn(),
  onRetryConnection: vi.fn(),
}
```
