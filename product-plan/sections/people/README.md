# People

## Overview

The People section is Watchdog's primary management control surface — a high-density, edge-to-edge operational index of all identified personnel. It answers three questions instantly: who is active, who is overloaded, and who has high-priority or risky tasks. Clicking a person navigates to a separate detail page with their full task view.

## User Flows

- Scan the full people list ranked by urgency (overdue first, then high-priority load, then volume, then alphabetical)
- Search for a person by name, alias, phone, email, or role using fuzzy matching
- Toggle between Active and All users to filter dormant or taskless people
- Sort the list by name, workload, or priority risk
- Click a person row to navigate to their detail page
- View person detail with stat cards and full task list (list or kanban view)
- Filter tasks by priority, status, and date range
- Click a task to open a task detail modal with messages and source references
- Open person settings slide-over to edit identity, role, and AI processing fields

## Design Decisions

- Full-width, edge-to-edge layout with flat vertically-stacked rows
- No avatars, badges, colored pills, or dropdown menus — typography hierarchy carries structure
- Density target: 15–25 visible rows per screen without crowding
- Person detail uses stat cards for task breakdown, with list/kanban toggle
- Task detail modal shows original message and related messages with person references
- Person settings slide-over with tag input for aliases

## Data Shapes

**Entities:**
- `PersonSummary` — Person with name, contact info, aliases, task counts, status, goal status
- `Task` — Extracted task with priority, status, due date, confidence, source reference
- `TaskMessage` — Raw message with sender, content, source, person references
- `PersonSettingsData` — Editable identity, role, and AI processing fields
- `PersonReference` — A person mentioned in a message
- `TaskCounts` — Breakdown of tasks by priority level

## Components Provided

- `PeopleList` — Main list view with search, filter, sort, and stat cards
- `PersonRow` — Individual person row with task counts and metadata
- `PersonDetail` — Full detail view with tasks (list/kanban), filters, settings slide-over
- `PersonSettings` — Slide-over panel for editing person identity/role/AI fields
- `TaskDetailModal` — Modal showing task details, messages, and person references
- `DateRangePicker` — Calendar component with task date dots

## Callback Props

### PeopleList (PeopleProps)

| Callback | Triggered When |
|----------|---------------|
| `onPersonClick` | User clicks a person row |
| `onSearch` | User types in the search field |
| `onFilterChange` | User toggles Active/All filter |
| `onSortChange` | User changes sort option |

### PersonDetail (PersonDetailProps)

| Callback | Triggered When |
|----------|---------------|
| `onBack` | User clicks back to return to the list |
| `onSaveSettings` | User saves person settings |
| `onPersonReferenceClick` | User clicks a person reference in task detail modal |
