# Dashboard

## Overview

The dashboard provides a high-level management overview of the Watchdog system. It surfaces key KPIs (task counts by priority, problems identified, people goal alignment) as clickable cards that navigate to filtered section views, a compact "attention needed" list of off-goal people, and a recent activity feed — all designed to feel spacious and uncluttered.

## User Flows

- View KPI cards showing high/medium/low priority task counts, total problems identified, and people on-goal vs off-goal counts
- Click any KPI card to navigate to the relevant section (Tasks or People) with the corresponding filter pre-applied
- View an "Attention Needed" list showing people who are off-goal, with their name and top misaligned goal visible
- Click a person in the attention list to navigate to their People detail view
- View a recent activity feed showing the last 5–8 system events
- Click an activity item to navigate to the relevant section

## Design Decisions

- KPI cards in a single row grid — each card is a navigation link to a filtered view
- Task priority cards use established color accents (amber for high, zinc for medium/low)
- Goal alignment shows "X on goal / Y off goal" counts with navigation links
- Attention list is compact with name, role, goal indicator, and misaligned goal name
- Activity feed shows type badge, description, and relative timestamp
- Generous whitespace — the dashboard should feel spacious, not dense

## Data Shapes

**Entities:**
- `DashboardKpi` — KPI card with label, value, trend, color, and navigation link
- `GoalAlignmentSummary` — Aggregate on-goal/off-goal counts with navigation
- `AttentionPerson` — Person needing attention with goal status and misaligned goal
- `ActivityEvent` — System event with type, description, timestamp, and link

## Components Provided

- `Dashboard` — Complete dashboard view with KPI cards, goal alignment, attention list, and activity feed

## Callback Props

| Callback | Triggered When |
|----------|---------------|
| `onNavigate` | User clicks a KPI card or activity item to navigate to a section |
| `onPersonClick` | User clicks a person in the attention list |
