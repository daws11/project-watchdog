# Milestone 3: People

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

Implement the People section — a high-density operational index of all identified personnel with drill-down into individual task views.

## Overview

The People section is Watchdog's primary management control surface. It answers three questions instantly: who is active, who is overloaded, and who has high-priority or risky tasks. Clicking a person navigates to a separate detail page with their full task view, person settings, and task detail modal.

**Key Functionality:**
- View all people ranked by urgency (overdue first, then high-priority load)
- Search by name, alias, phone, email, or role with fuzzy matching
- Toggle between Active and All users
- Sort by urgency, name, workload, or priority risk
- Drill down into person detail with full task list (list/kanban views)
- Edit person settings (identity, role, AI processing) via slide-over

## Components Provided

Copy from `product-plan/sections/people/components/`:

- `PeopleList` — Main list view with search, filter, sort, stat cards, and table
- `PersonRow` — Individual person row with task counts and metadata
- `PersonDetail` — Full detail view with tasks (list/kanban), filters, settings slide-over
- `PersonSettings` — Slide-over panel for editing identity/role/AI fields
- `TaskDetailModal` — Modal showing task details, messages, and person references
- `DateRangePicker` — Calendar component with task date dots

## Props Reference

### PeopleList (PeopleProps)

**Data props:**
- `people: PersonSummary[]` — Array of people with task counts, status, goal status

**Callback props:**

| Callback | Triggered When |
|----------|---------------|
| `onPersonClick(personId)` | User clicks a person row |
| `onSearch(query)` | User types in the search field |
| `onFilterChange(filter)` | User toggles Active/All |
| `onSortChange(sortBy)` | User changes sort option |

### PersonDetail (PersonDetailProps)

**Data props:**
- `person: PersonSummary` — The selected person
- `tasks: Task[]` — All tasks for this person
- `messages: TaskMessage[]` — Messages associated with tasks
- `averageTaskCount: number` — Team average for comparison

**Callback props:**

| Callback | Triggered When |
|----------|---------------|
| `onBack()` | User clicks back to return to list |
| `onSaveSettings(personId, data)` | User saves person settings |
| `onPersonReferenceClick(personId)` | User clicks a person reference in task detail |

## Expected User Flows

### Flow 1: Find and View a Person

1. User types "Fatima" in the search field
2. People list filters to matching results
3. User clicks on "Fatima Al-Rashid" row
4. **Outcome:** Navigates to Fatima's detail page showing her tasks

### Flow 2: Review High-Risk People

1. User selects "Priority" from the sort dropdown
2. People list reorders to show highest priority risk first
3. User scans the list — people with high priority + overdue counts appear at top
4. **Outcome:** Manager quickly identifies who needs attention

### Flow 3: Edit Person Settings

1. User is on a person's detail page
2. User clicks the settings icon to open the person settings slide-over
3. User updates the person's role and custom AI prompt
4. User clicks "Save"
5. **Outcome:** Person settings are updated, slide-over closes

### Flow 4: View Task Detail

1. User is on a person's detail page viewing their tasks
2. User clicks on a task row or kanban card
3. Task detail modal opens showing title, summary, priority, source, messages
4. User clicks a person reference in a message
5. **Outcome:** Person settings slide-over opens for the referenced person

## Empty States

- **No people:** Shows "No people found." message
- **No search results:** Shows "No people match your search."
- **Person with no tasks:** Shows empty state in the detail view task list

## Testing

See `product-plan/sections/people/tests.md` for UI behavior test specs.

## Files to Reference

- `product-plan/sections/people/README.md` — Feature overview and design intent
- `product-plan/sections/people/tests.md` — UI behavior test specs
- `product-plan/sections/people/components/` — React components
- `product-plan/sections/people/types.ts` — TypeScript interfaces
- `product-plan/sections/people/sample-data.json` — Test data

## Done When

- [ ] People list renders with real data, ranked by urgency
- [ ] Search filters people by name, alias, phone, email, role
- [ ] Active/All toggle works correctly
- [ ] Sort options change the ordering
- [ ] Person detail page shows stat cards and tasks
- [ ] List/kanban toggle works on detail page
- [ ] Task detail modal opens with full information
- [ ] Person settings slide-over allows editing and saving
- [ ] Empty states display properly
- [ ] Responsive on mobile
