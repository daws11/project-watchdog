# Milestone 4: Tasks

> **Provide alongside:** `product-overview.md`
> **Prerequisites:** Milestone 1 (Shell) and Milestone 3 (People) complete

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

Implement the Tasks section — a cross-user task view with list/kanban layouts, comprehensive filtering, and an LLM chat panel.

## Overview

The Tasks section provides a single pane of glass across all extracted tasks in the system. It combines list/kanban views with rich filtering (priority, status, person, source, date range), a task detail modal, a person settings slide-over, and a resizable LLM chat panel docked to the bottom for querying the filtered task set.

**Key Functionality:**
- View all tasks in list view (grouped by priority) or kanban view (three columns)
- Filter by search, priority, status, date range, person, and source
- Open task detail modal with messages and source references
- Open person settings slide-over by clicking assignee names
- Resize and use the LLM chat panel to ask questions about filtered tasks

## Components Provided

Copy from `product-plan/sections/tasks/components/`:

- `TasksView` — Complete tasks page with list/kanban, filters, modals, chat panel
- `ChatPanel` — Resizable chat panel with conversation thread and input

**Note:** TasksView reuses `TaskDetailModal`, `PersonSettings`, and `DateRangePicker` from the People section. Ensure the People section components are available at `../../people/components/`.

## Props Reference

**Data props:**
- `tasks: Task[]` — Denormalized tasks with assignee name/role and source name
- `people: PersonSummary[]` — For the person filter dropdown
- `sources: SourceSummary[]` — For the source filter dropdown
- `messages: TaskMessage[]` — For task detail modal
- `chatMessages: ChatMessage[]` — LLM conversation history

**Callback props:**

| Callback | Triggered When |
|----------|---------------|
| `onPersonClick(personId)` | User clicks a person name to navigate |
| `onSavePersonSettings(personId, data)` | User saves person settings from slide-over |
| `onChatSend(message, taskContext)` | User sends a message in the chat panel |

## Expected User Flows

### Flow 1: Filter and Browse Tasks

1. User sees all tasks in the default list view grouped by priority
2. User clicks "High" priority pill to filter
3. User selects a specific person from the person dropdown
4. Filtered count updates ("Showing X of Y tasks")
5. **Outcome:** User sees only high-priority tasks for the selected person

### Flow 2: View Task Details

1. User clicks a task row in the list view
2. Task detail modal opens showing title, summary, priority/status badges, due date, confidence, source reference, and messages
3. User reads the original message and related messages
4. **Outcome:** User understands the full context of the task

### Flow 3: Ask the AI About Tasks

1. User applies some filters to narrow the task set
2. User clicks on the chat bar at the bottom ("Ask about these tasks...")
3. Chat panel expands showing "Discussing 12 tasks"
4. User types "Which tasks are most urgent?" and sends
5. **Outcome:** LLM response appears in the chat thread

### Flow 4: Edit Person Settings from Tasks

1. User clicks a person's name in the task list
2. Person settings slide-over opens from the right
3. User updates the person's custom AI prompt
4. User clicks "Save"
5. **Outcome:** Settings saved, slide-over closes

## Empty States

- **No tasks:** Shows empty state message
- **No filter matches:** Shows "No tasks match your filters" with a clear filters link
- **Chat panel collapsed:** Shows thin bar with "Ask about these tasks..." placeholder

## Testing

See `product-plan/sections/tasks/tests.md` for UI behavior test specs.

## Files to Reference

- `product-plan/sections/tasks/README.md` — Feature overview and design intent
- `product-plan/sections/tasks/tests.md` — UI behavior test specs
- `product-plan/sections/tasks/components/` — React components
- `product-plan/sections/tasks/types.ts` — TypeScript interfaces
- `product-plan/sections/tasks/sample-data.json` — Test data

## Done When

- [ ] Tasks render in list view grouped by priority
- [ ] Kanban view shows three columns (High/Medium/Low)
- [ ] All filters work (search, priority, status, date, person, source)
- [ ] Task detail modal shows full information
- [ ] Person settings slide-over opens from assignee clicks
- [ ] Chat panel resizes and sends messages
- [ ] Chat context indicator shows filtered task count
- [ ] Empty states display properly
- [ ] Responsive on mobile
