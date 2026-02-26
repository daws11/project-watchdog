# Processing

## Overview

A rule-based processing configuration and run history view. Users define processing rules that combine a trigger schedule, source channel(s), an AI prompt, and a target action. The section shows a global run history across all rules, with the ability to drill into a specific rule's execution log.

## User Flows

- View all processing rules in a compact table with name, schedule, channels, action, toggle, last run, quick actions
- Enable or disable a rule via inline toggle
- Trigger a manual "Run now" on any rule
- Create a new rule via slide-over panel (name, schedule, channels, AI prompt, target action)
- Edit an existing rule in the same slide-over
- Delete a rule with confirmation
- View global run history with rule name, timestamp, duration, stats, and status
- Click a run to see detailed stats and error messages
- Filter run history by rule or by status

## Design Decisions

- Rules table in a card with columns for all key fields
- "Add rule" button above the table
- Slide-over from the right for creating/editing rules
- Global run history below rules table as separate card
- Run rows expand inline to show detailed stats and errors
- Filter bar above run history for rule and status filtering
- Pagination for run history
- Empty states for both no rules and no run history

## Data Shapes

**Entities:**
- `ProcessingRule` — Configured rule with schedule, channels, prompt, action, status
- `ProcessingRun` — Execution record with stats, duration, errors
- `RunError` — Error detail with message and context
- `RuleFormData` — Data for creating or editing a rule

## Components Provided

- `ProcessingView` — Complete processing page with rules table, run history, and slide-over editor

## Callback Props

| Callback | Triggered When |
|----------|---------------|
| `onCreateRule` | User submits the create rule form |
| `onEditRule` | User saves edits to an existing rule |
| `onDeleteRule` | User confirms rule deletion |
| `onToggleRule` | User toggles a rule enabled/disabled |
| `onRunNow` | User clicks "Run now" on a rule |
