# Milestone 2: Dashboard

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

Implement the Dashboard — a high-level management overview showing KPIs, attention list, and activity feed.

## Overview

The dashboard provides a spacious management overview of the Watchdog system. It surfaces key KPIs as clickable cards that navigate to filtered section views, a compact "attention needed" list of off-goal people, and a recent activity feed — all designed to feel uncluttered with generous whitespace.

**Key Functionality:**
- View KPI cards showing task counts by priority, problems identified, and goal alignment
- Click any KPI card to navigate to the relevant section with a filter pre-applied
- View "Attention Needed" list of people who are off-goal
- Click a person in the attention list to navigate to their detail view
- View a recent activity feed with type badges and relative timestamps
- Click an activity item to navigate to the relevant section

## Components Provided

Copy from `product-plan/sections/dashboard/components/`:

- `Dashboard` — Complete dashboard view with KPI cards, goal alignment card, attention list, and activity feed

## Props Reference

**Data props:**

- `kpis: DashboardKpi[]` — Array of KPI cards with label, value, trend, color, and navigation link
- `goalAlignment: GoalAlignmentSummary` — On-goal/off-goal counts with navigation links
- `attentionPeople: AttentionPerson[]` — People needing attention with goal status
- `activityFeed: ActivityEvent[]` — Recent system events

**Callback props:**

| Callback | Triggered When |
|----------|---------------|
| `onNavigate(path, filter?)` | User clicks a KPI card or activity item |
| `onPersonClick(personId)` | User clicks a person in the attention list |

## Expected User Flows

### Flow 1: Navigate via KPI Card

1. User views the KPI cards showing task counts and goal alignment
2. User clicks the "High Priority" KPI card
3. **Outcome:** Navigates to `/tasks` with `?priority=high` filter applied

### Flow 2: View Off-Goal Person

1. User sees the "Attention Needed" list with people who are off-goal
2. User clicks on a person's name in the list
3. **Outcome:** Navigates to that person's detail view in the People section

### Flow 3: Follow Activity Item

1. User sees the "Recent Activity" feed with type-badged events
2. User clicks on a "Processing" event
3. **Outcome:** Navigates to the Processing section

## Empty States

- **No attention needed:** Shows centered "Everyone is on goal" message with a target icon
- **No recent activity:** Shows "No recent activity" in the activity feed card

## Testing

See `product-plan/sections/dashboard/tests.md` for UI behavior test specs.

## Files to Reference

- `product-plan/sections/dashboard/README.md` — Feature overview and design intent
- `product-plan/sections/dashboard/tests.md` — UI behavior test specs
- `product-plan/sections/dashboard/components/` — React components
- `product-plan/sections/dashboard/types.ts` — TypeScript interfaces
- `product-plan/sections/dashboard/sample-data.json` — Test data

## Done When

- [ ] Dashboard renders with real KPI data
- [ ] KPI cards navigate to correct sections with filters
- [ ] Goal alignment card shows on-goal/off-goal counts with navigation
- [ ] Attention list shows off-goal people
- [ ] Activity feed shows recent events with type badges
- [ ] Empty states display properly
- [ ] All callback props are wired to working functionality
- [ ] Responsive on mobile
