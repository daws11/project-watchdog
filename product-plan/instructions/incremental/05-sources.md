# Milestone 5: Sources

> **Provide alongside:** `product-overview.md`
> **Prerequisites:** Milestone 1 (Shell) complete

---

## About This Handoff

**What you're receiving:**
- Finished UI designs (React components with full styling)
- Product requirements and user flow specifications
- Design system tokens (colors, typography)
- Sample data showing the shape of data components expect
- Test specs focused on user-facing behavior

**Your job:**
- Integrate these components into your application
- Wire up callback props to your routing and business logic
- Replace sample data with real data from your backend
- Implement loading, error, and empty states

The components are props-based — they accept data and fire callbacks. How you architect the backend, data layer, and business logic is up to you.

---

## Goal

Implement the Sources section — channel cards with connection management for data ingestion.

## Overview

The Sources section manages data ingestion channels. It displays supported channels (WhatsApp, Google Meet, Email, Webhook) as cards with connection counts and status indicators. Clicking a card opens a modal listing existing connections with full CRUD controls and the ability to add new connections.

**Key Functionality:**
- View channel cards with connection count and aggregate status
- Open channel modal to see and manage connections
- Add new connections with channel-specific form fields
- Pause, resume, edit, and delete connections
- Retry failed connections
- See total active connections summary

## Components Provided

Copy from `product-plan/sections/sources/components/`:

- `SourcesView` — Complete sources page with channel cards and connection management modals

## Props Reference

**Data props:**
- `channels: Channel[]` — Supported channels with type, connection count, error status
- `connections: Connection[]` — All connections across channels

**Callback props:**

| Callback | Triggered When |
|----------|---------------|
| `onChannelClick(channelId)` | User clicks a channel card |
| `onAddConnection(channelId, data)` | User adds a new connection |
| `onPauseConnection(connectionId)` | User pauses a connection |
| `onResumeConnection(connectionId)` | User resumes a paused connection |
| `onEditConnection(connectionId, data)` | User edits connection settings |
| `onDeleteConnection(connectionId)` | User confirms deletion |
| `onRetryConnection(connectionId)` | User retries a failed connection |

## Expected User Flows

### Flow 1: Add a WhatsApp Connection

1. User clicks the "WhatsApp" channel card
2. Modal opens showing existing WhatsApp connections
3. User clicks "Add Connection"
4. User enters a label and phone number
5. User clicks "Connect"
6. **Outcome:** New connection appears in the list with "Active" status

### Flow 2: Handle a Failed Connection

1. User sees a channel card with an error indicator
2. User clicks the card to open the connections modal
3. User sees a connection with "Error" status and error details
4. User clicks "Retry"
5. **Outcome:** `onRetryConnection` callback fires

### Flow 3: Disconnect a Source

1. User opens a channel modal and clicks "Disconnect" on a connection
2. Confirmation prompt appears
3. User confirms
4. **Outcome:** Connection is removed from the list

## Empty States

- **Channel with no connections:** Shows empty state with "No connections yet" and a prominent "Add Connection" button
- **All channels healthy:** No error indicators on any card

## Testing

See `product-plan/sections/sources/tests.md` for UI behavior test specs.

## Files to Reference

- `product-plan/sections/sources/README.md` — Feature overview and design intent
- `product-plan/sections/sources/tests.md` — UI behavior test specs
- `product-plan/sections/sources/components/` — React components
- `product-plan/sections/sources/types.ts` — TypeScript interfaces
- `product-plan/sections/sources/sample-data.json` — Test data

## Done When

- [ ] Channel cards render with correct connection counts
- [ ] Channel status indicators show all-active, some-errors, or none-connected
- [ ] Connection modal opens with list of connections
- [ ] Add connection form works with channel-specific fields
- [ ] Pause/resume, edit, and delete actions work
- [ ] Retry works for failed connections
- [ ] Empty states display properly
- [ ] Responsive on mobile
