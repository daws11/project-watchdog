# Watchdog — Product Overview

## Summary

Watchdog transforms unstructured operational communication — WhatsApp groups, emails, and other sources — into structured, per-user task intelligence. It runs as a scheduled batch engine that extracts tasks, resolves identities, and delivers clean management-ready views so leaders get clarity without reading every message.

### Problems Solved

1. **Communication Chaos** — Operational tasks are buried across WhatsApp groups, email threads, and internal channels. Watchdog automatically ingests raw communication data, extracts actionable tasks, and assigns them to unified user profiles.

2. **Fragmented Identity** — The same person appears under different names, phone numbers, nicknames, and email addresses. Watchdog's identity resolution engine unifies fragmented identities through fuzzy matching, phone normalization, alias mapping, and manual overrides.

3. **No Task Visibility** — Managers have no structured view of responsibilities, deadlines, or priorities. Watchdog generates prioritized, per-user task lists with AI-assigned priority levels, confidence scores, deadlines, and context summaries.

4. **Information Overload** — Existing tools add complexity rather than clarity. Watchdog provides a minimal, flat, edge-to-edge interface with zero clutter — pure signal.

5. **No Operational Memory** — When conversations scroll past, context is lost. Watchdog stores all raw data versioned for traceability, links every extracted task back to its source message, and maintains a complete processing history.

### Key Features

- Multi-source data ingestion (WhatsApp exports, email threads, API feeds, manual uploads)
- Scheduled AI processing pipeline (daily batch extraction at configurable times)
- Identity resolution engine with fuzzy matching, alias mapping, and manual override
- AI-powered task extraction with priority, confidence scoring, and context summaries
- Per-user task views switchable between list and kanban layouts
- Manager dashboard with high-level metrics across all users
- Per-user custom AI prompts for behavioral interpretation rules
- Processing run history with versioning, stats, and error tracking
- Full source traceability from task back to original message

## Planned Sections

1. **Dashboard** — High-level management overview showing key metrics — total open tasks, overdue count, high-priority items, and recent processing status across all users.
2. **People** — Searchable list of all identified users with unified profiles, inline editing of attributes, and drill-down into individual task views.
3. **Tasks** — Cross-user task view with list and kanban layouts, filterable by priority, status, assignee, and due date — providing a single pane of glass across all extracted tasks.
4. **Sources** — Data ingestion management for uploading and forwarding raw communication data, with source status and history tracking.
5. **Processing** — Processing run history and configuration — view past runs with stats and errors, configure scheduling, and trigger manual processing runs.
6. **Settings** — Application-level configuration including API key management, SMTP email settings, and user management with role-based access control.

## Product Entities

- **User** — A unified identity representing a real person in the organization. Aggregates fragmented identifiers into a single profile.
- **RawMessage** — A single piece of ingested communication stored in its original form. Immutable foundation that tasks are extracted from.
- **Source** — A configured data ingestion channel (WhatsApp group export, email inbox, API endpoint). Tracks origin, type, and status.
- **Task** — A structured action item extracted by the AI pipeline from raw messages. Carries title, context summary, priority, confidence score, status, and due date.
- **ProcessingRun** — A record of a single execution of the AI processing pipeline. Captures stats, errors, and audit trail.
- **Alias** — An alternative identifier for a user — nickname, secondary phone number, or alternate email.

### Relationships

- User has many Task, User has many Alias
- Task belongs to User, Task references RawMessage
- RawMessage belongs to Source, Source has many RawMessage
- ProcessingRun produces many Task, Task belongs to ProcessingRun

## Design System

**Colors:**
- Primary: `sky` — Active states, links, primary buttons, selected items
- Secondary: `amber` — High-priority indicators, warning accents
- Neutral: `zinc` — All neutral surfaces, borders, text, backgrounds

**Typography:**
- Heading: Space Grotesk
- Body: Inter
- Mono: JetBrains Mono

## Implementation Sequence

Build this product in milestones:

1. **Shell** — Set up design tokens and application shell (sidebar navigation, user menu)
2. **Dashboard** — Management overview with KPIs, attention list, activity feed
3. **People** — User list with urgency ranking, search/filter, detail view with tasks
4. **Tasks** — Cross-user task view with list/kanban, chat panel, filters
5. **Sources** — Channel cards with connection management
6. **Processing** — Rule configuration and run history
7. **Settings** — API keys, SMTP, user management with RBAC

Each milestone has a dedicated instruction document in `product-plan/instructions/`.
