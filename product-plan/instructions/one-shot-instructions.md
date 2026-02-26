# Watchdog — Complete Implementation Instructions

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

## Testing

Each section includes a `tests.md` file with UI behavior test specs. These are **framework-agnostic** — adapt them to your testing setup.

**For each section:**
1. Read `product-plan/sections/[section-id]/tests.md`
2. Write tests for key user flows (success and failure paths)
3. Implement the feature to make tests pass
4. Refactor while keeping tests green

---

## Product Overview

Watchdog transforms unstructured operational communication — WhatsApp groups, emails, and other sources — into structured, per-user task intelligence. It runs as a scheduled batch engine that extracts tasks, resolves identities, and delivers clean management-ready views so leaders get clarity without reading every message.

### Problems Solved

1. **Communication Chaos** — Operational tasks buried across channels. Watchdog ingests, extracts, and assigns automatically.
2. **Fragmented Identity** — Same person under many names/numbers. Watchdog unifies via fuzzy matching, alias mapping, manual override.
3. **No Task Visibility** — No structured view of responsibilities. Watchdog generates prioritized per-user task lists with AI scoring.
4. **Information Overload** — Watchdog provides minimal, flat, edge-to-edge UI — pure signal.
5. **No Operational Memory** — Watchdog stores versioned raw data with full source traceability.

### Key Features

- Multi-source data ingestion (WhatsApp, email, API feeds, manual uploads)
- Scheduled AI processing pipeline with configurable rules
- Identity resolution engine with fuzzy matching and alias mapping
- AI-powered task extraction with priority, confidence scoring, context summaries
- Per-user task views (list/kanban), manager dashboard, cross-user task view
- LLM chat panel for querying filtered task sets
- Processing run history with error tracking
- Role-based access control with scoped people permissions

### Planned Sections

1. **Dashboard** — Management overview with KPIs, attention list, activity feed
2. **People** — User list with urgency ranking, search/filter, detail view with tasks
3. **Tasks** — Cross-user task view with list/kanban, chat panel, filters
4. **Sources** — Channel cards with connection management
5. **Processing** — Rule configuration and run history
6. **Settings** — API keys, SMTP, user management with RBAC

### Design System

- **Primary:** `sky` — Active states, links, buttons
- **Secondary:** `amber` — High-priority indicators, warnings
- **Neutral:** `zinc` — Surfaces, borders, text
- **Heading font:** Space Grotesk
- **Body font:** Inter
- **Mono font:** JetBrains Mono

### Product Entities

- **User** — Unified identity aggregating fragmented identifiers
- **RawMessage** — Immutable ingested communication
- **Source** — Data ingestion channel
- **Task** — AI-extracted action item with priority, confidence, status
- **ProcessingRun** — Pipeline execution record
- **Alias** — Alternative identifier for a user

---

# Milestone 1: Shell

## Goal

Set up the design tokens and application shell — the persistent chrome that wraps all sections.

## What to Implement

### 1. Design Tokens

- See `product-plan/design-system/tokens.css` for CSS custom properties
- See `product-plan/design-system/tailwind-colors.md` for Tailwind configuration
- See `product-plan/design-system/fonts.md` for Google Fonts setup

**Colors:** sky (primary), amber (secondary), zinc (neutral), emerald (success), violet (in-progress), red (errors)

**Typography:** Space Grotesk (headings), Inter (body), JetBrains Mono (mono)

### 2. Application Shell

Copy shell components from `product-plan/shell/components/`:
- `AppShell.tsx` — Main layout with responsive sidebar
- `MainNav.tsx` — Navigation with icon + label items
- `UserMenu.tsx` — User menu with avatar and dropdown

**Navigation items:** Dashboard (/dashboard), People (/people), Tasks (/tasks), Sources (/sources), Processing (/processing), Settings (/settings, bottom)

**Responsive behavior:** Desktop full sidebar (256px), tablet collapsed (64px icons only), mobile slide-in overlay

## Done When

- [ ] Design tokens configured (colors, fonts loaded)
- [ ] Shell renders with sidebar navigation
- [ ] Navigation links to correct routes with active highlighting
- [ ] User menu with initials avatar and dropdown
- [ ] Responsive on desktop, tablet, mobile
- [ ] Dark mode works correctly

---

# Milestone 2: Dashboard

## Goal

Implement the Dashboard — high-level management overview with KPIs, attention list, and activity feed.

## Overview

Surfaces key KPIs as clickable cards, "attention needed" list of off-goal people, and recent activity feed. Spacious layout with generous whitespace.

**Key Functionality:**
- KPI cards with navigation to filtered section views
- Goal alignment card (on-goal / off-goal counts)
- Attention list of off-goal people
- Activity feed with type badges and timestamps

## Components

- `Dashboard` — Complete dashboard view

## Callback Props

- `onNavigate(path, filter?)` — KPI card or activity click
- `onPersonClick(personId)` — Attention list person click

## User Flows

1. Click KPI card → navigate to section with filter
2. Click attention person → navigate to person detail
3. Click activity item → navigate to relevant section

## Done When

- [ ] KPI cards render and navigate with filters
- [ ] Goal alignment card with on/off counts
- [ ] Attention list with off-goal people
- [ ] Activity feed with type badges
- [ ] Empty states (everyone on goal, no activity)
- [ ] Responsive

---

# Milestone 3: People

## Goal

Implement the People section — high-density operational index with drill-down to person detail.

## Overview

Primary management control surface answering: who is active, who is overloaded, who has risky tasks. Full-width table with urgency ranking, search, filter, sort. Detail page with tasks (list/kanban), person settings slide-over, task detail modal.

**Key Functionality:**
- People list ranked by urgency (overdue → high priority → volume → alpha)
- Search by name, alias, phone, email, role
- Active/All toggle, sort by urgency/name/workload/priority
- Person detail with stat cards, task list/kanban, filters
- Person settings slide-over (identity, role, AI processing)
- Task detail modal with messages and person references

## Components

- `PeopleList`, `PersonRow`, `PersonDetail`, `PersonSettings`, `TaskDetailModal`, `DateRangePicker`

## User Flows

1. Search/filter → find person → click row → view detail page
2. On detail → toggle list/kanban → filter tasks → click task → view modal
3. On detail → open settings → edit role/AI prompt → save
4. In task modal → click person reference → open that person's settings

## Done When

- [ ] People list with search, filter, sort, stat cards
- [ ] Person detail with task list/kanban
- [ ] Person settings slide-over
- [ ] Task detail modal with messages
- [ ] Empty states
- [ ] Responsive

---

# Milestone 4: Tasks

## Goal

Cross-user task view with list/kanban, comprehensive filtering, and LLM chat panel.

## Overview

Single pane of glass across all tasks. List view grouped by priority, kanban with three columns. Rich filtering (search, priority, status, date, person, source). Task detail modal, person settings slide-over, resizable chat panel.

**Prerequisites:** People section components needed (TaskDetailModal, PersonSettings, DateRangePicker are reused).

**Key Functionality:**
- List/kanban toggle with comprehensive filters
- Task detail modal and person settings slide-over
- Resizable LLM chat panel docked to bottom
- Chat context auto-syncs with active filters

## Components

- `TasksView`, `ChatPanel` (reuses People's TaskDetailModal, PersonSettings, DateRangePicker)

## User Flows

1. Filter tasks → view in list or kanban → click task → view detail modal
2. Click assignee name → person settings slide-over
3. Expand chat panel → ask question about filtered tasks → view response

## Done When

- [ ] List and kanban views working
- [ ] All filters functional
- [ ] Task detail modal and person settings
- [ ] Chat panel resizes, sends, shows context count
- [ ] Empty states
- [ ] Responsive

---

# Milestone 5: Sources

## Goal

Channel management with connection CRUD for data ingestion.

## Overview

Channel cards (WhatsApp, Google Meet, Email, Webhook) with connection counts and status. Click card opens modal with connection list and management controls.

**Key Functionality:**
- Channel cards with aggregate status indicators
- Connection management (add, edit, pause/resume, delete, retry)
- Channel-specific form fields for new connections

## Components

- `SourcesView`

## User Flows

1. Click channel card → modal with connections → add/manage connections
2. Failed connection → retry
3. Disconnect → confirm → removed

## Done When

- [ ] Channel cards with connection counts and status
- [ ] Connection modal with CRUD
- [ ] Channel-specific add forms
- [ ] Pause/resume, edit, delete, retry
- [ ] Empty states
- [ ] Responsive

---

# Milestone 6: Processing

## Goal

Rule-based AI processing configuration and run history.

## Overview

Rules table with inline toggle, manual run, create/edit via slide-over. Global run history with stats, status, expandable error details. Filters for rule and status.

**Key Functionality:**
- Rules table with enable/disable, run now, edit, delete
- Create/edit slide-over (name, schedule, channels, prompt, action)
- Run history with expandable detail rows
- Filter history by rule and status

## Components

- `ProcessingView`

## User Flows

1. Create rule via slide-over → appears in table
2. Toggle rule on/off → visual state change
3. Run now → run appears in history
4. Click failed run → expand → view errors

## Done When

- [ ] Rules table with all actions
- [ ] Create/edit slide-over
- [ ] Run history with expandable rows
- [ ] Run history filters
- [ ] Empty states
- [ ] Responsive

---

# Milestone 7: Settings

## Goal

API key management, SMTP configuration, and user management with RBAC.

## Overview

Sidebar navigation with three categories (API Keys, SMTP, Users). API keys: masked display, add/delete. SMTP: form with test connection. Users: table with create/edit/deactivate, role-based section permissions and scoped people access.

**Key Functionality:**
- API key management (view masked, add, delete)
- SMTP configuration with test connection
- User management with admin/regular roles
- Section permissions and people assignment for regular users

## Components

- `SettingsView`

## User Flows

1. Add API key → appears masked in list
2. Configure SMTP → test → save
3. Create regular user → assign sections and people → save
4. Deactivate user → confirm → status changes

## Done When

- [ ] Settings sidebar navigation
- [ ] API keys CRUD
- [ ] SMTP form with test and save
- [ ] User management with roles, permissions, people
- [ ] Deactivate/reactivate
- [ ] Empty states
- [ ] Responsive
