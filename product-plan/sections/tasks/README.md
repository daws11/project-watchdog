# Tasks

## Overview

The Tasks section provides a cross-user view of all extracted tasks in the system. It combines list/kanban task views with filtering capabilities, a task detail modal, a person settings slide-over, and a resizable LLM chat panel docked to the bottom of the page for querying the currently filtered task set.

## User Flows

- View all tasks across all people in a list view (default) or kanban view via segmented control
- Filter tasks using: fuzzy search, priority pills, status pills, date range picker, person/assignee dropdown, and source dropdown
- See the filtered count and clear all filters in one click
- Click a task row or kanban card to open a task detail modal
- Click a person's name to open the person settings slide-over
- Resize the chat panel at the bottom by dragging a handle up/down
- Type a message in the chat panel to query the LLM about filtered tasks
- View the LLM's response in a scrollable conversation thread

## Design Decisions

- Page header has title and subtitle only — no stat cards (focus on task list and chat)
- Filter toolbar includes search, date range, priority pills, status pills, person dropdown, source dropdown
- List view groups tasks by priority with group headers
- Kanban view uses three columns (High/Medium/Low)
- Assignee names are clickable links that open person settings (not navigation)
- Chat panel is full-width, fixed to bottom, collapsed by default (~48px thin bar)
- Chat context auto-syncs with filters ("Discussing N tasks" indicator)
- Reuses TaskDetailModal, PersonSettings, and DateRangePicker from People section

## Data Shapes

**Entities:**
- `Task` — Denormalized task with assignee name/role and source name
- `PersonSummary` — Minimal person info for filter dropdown
- `SourceSummary` — Minimal source info for filter dropdown
- `ChatMessage` — LLM chat conversation message
- `TaskMessage` — Raw message for task detail modal
- `PersonSettingsData` — Editable person settings
- `PersonReference` — Person mentioned in a message

## Components Provided

- `TasksView` — Complete tasks page with list/kanban, filters, modals, chat panel
- `ChatPanel` — Resizable chat panel with conversation thread and input

## Callback Props

| Callback | Triggered When |
|----------|---------------|
| `onPersonClick` | User clicks a person name to navigate to detail |
| `onSavePersonSettings` | User saves person settings from slide-over |
| `onChatSend` | User sends a message in the chat panel |
