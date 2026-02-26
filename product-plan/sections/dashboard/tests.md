# Test Specs: Dashboard

These test specs are **framework-agnostic**. Adapt them to your testing setup.

## Overview
The Dashboard provides a management overview with KPI cards, a goal alignment summary, an "Attention Needed" list of off-goal people, and a recent activity feed. All elements are navigable -- clicking KPI cards, attention rows, and activity rows should trigger navigation to the relevant section.

---

## User Flow Tests

### Flow 1: KPI Card Navigation
**Scenario:** User clicks a KPI card to navigate to a filtered section view.

#### Success Path
**Setup:** Render `Dashboard` with `kpis` containing at least one card (e.g. `{ id: 'kpi-high', label: 'High Priority', value: 5, trend: '+2', trendDirection: 'up', color: 'amber', linkTo: '/tasks', linkFilter: 'priority=high' }`). Provide a mock `onNavigate` callback.

**Steps:**
1. Locate the KPI card displaying "High Priority" with value "5"
2. Click the card

**Expected Results:**
- [ ] `onNavigate` is called with arguments `('/tasks', 'priority=high')`
- [ ] The card shows a chevron icon on hover
- [ ] The card has `focus-visible` ring styling when focused via keyboard

#### Edge Case: Neutral Trend
**Setup:** KPI with `trend: '0'` and `trendDirection: 'neutral'`.

**Expected Results:**
- [ ] No trend indicator (arrow + text) is rendered when `trend` is `'0'`

---

### Flow 2: Goal Alignment Card Interaction
**Scenario:** User clicks on-goal or off-goal counts to navigate to filtered People view.

#### Success Path
**Setup:** Render with `goalAlignment: { onGoal: 8, offGoal: 3, total: 11, linkTo: '/people', linkFilterOnGoal: 'goal=on', linkFilterOffGoal: 'goal=off' }`. Provide mock `onNavigate`.

**Steps:**
1. Locate the "People on Goal" card
2. Verify it displays "8" (emerald colored) and "3" (red colored) with "off" label
3. Click the "8" on-goal count
4. Click the "3" off-goal count

**Expected Results:**
- [ ] Clicking on-goal count calls `onNavigate('/people', 'goal=on')`
- [ ] Clicking off-goal count calls `onNavigate('/people', 'goal=off')`
- [ ] A progress bar is visible showing the on-goal percentage
- [ ] Off-goal count "3" is rendered in red since `offGoal > 0`

#### Edge Case: No Off-Goal People
**Setup:** `goalAlignment` with `offGoal: 0`, `onGoal: 5`, `total: 5`.

**Expected Results:**
- [ ] Off-goal count text uses muted color (zinc-400), not red
- [ ] No progress bar is rendered when `offGoal` is 0

---

### Flow 3: Attention Needed List
**Scenario:** User views off-goal people and clicks one to navigate to their detail view.

#### Success Path
**Setup:** Render with `attentionPeople` containing at least two items, e.g. `{ personId: 'p1', name: 'Ahmed Al-Rashid', role: 'Site Engineer', goalStatus: 'off', misalignedGoal: 'Safety compliance reviews', taskCount: 12, goalMatchCount: 4 }`. Provide mock `onPersonClick`.

**Steps:**
1. Locate the "Attention Needed" section header with the AlertTriangle icon
2. Verify the count badge shows the number of attention people
3. Verify "Ahmed Al-Rashid" row displays name, role "Site Engineer", misaligned goal "Safety compliance reviews", and ratio "4/12"
4. Verify the red dot indicator is present
5. Click the "Ahmed Al-Rashid" row

**Expected Results:**
- [ ] `onPersonClick` is called with `'p1'`
- [ ] The "View all" link is visible and clicking it calls `onNavigate` with the off-goal filter
- [ ] Rows show hover highlight state
- [ ] Goal match ratio displayed as `goalMatchCount/taskCount`

---

### Flow 4: Recent Activity Feed
**Scenario:** User views recent system events and clicks one to navigate.

#### Success Path
**Setup:** Render with `activityFeed` containing events of different types: `{ id: 'ev1', type: 'task', description: 'New task extracted for Ahmed', timestamp: '<recent ISO>', linkTo: '/tasks/t1' }`, and events with types `processing`, `problem`, `source`, `identity`.

**Steps:**
1. Locate the "Recent Activity" section header
2. Verify each event shows a colored type badge (e.g. "Task" in sky, "Processing" in violet, "Problem" in red, "Source" in amber, "Identity" in emerald)
3. Verify the event description is displayed
4. Verify relative timestamp is shown (e.g. "5m ago", "2h ago")
5. Click the task event row

**Expected Results:**
- [ ] `onNavigate` is called with `'/tasks/t1'`
- [ ] Type badges use correct labels: "Processing", "Task", "Problem", "Source", "Identity"
- [ ] Timestamps render in relative format

---

## Empty State Tests

### Empty Attention List
**Setup:** Render with `attentionPeople: []`.

**Expected Results:**
- [ ] A Target icon (emerald) is displayed
- [ ] Text "Everyone is on goal" is shown
- [ ] The "View all" link is still visible in the header

### Empty Activity Feed
**Setup:** Render with `activityFeed: []`.

**Expected Results:**
- [ ] Text "No recent activity" is displayed in the activity card

### All Empty
**Setup:** Render with `kpis: []`, `goalAlignment` with zeros, `attentionPeople: []`, `activityFeed: []`.

**Expected Results:**
- [ ] The KPI grid renders with only the Goal Alignment card (no KPI cards)
- [ ] Both Attention and Activity sections show their empty states
- [ ] No errors or layout breaks

---

## Component Interaction Tests

### KPI Card Color Mapping
**Setup:** Render KPI cards with each `color` value: `'sky'`, `'amber'`, `'red'`, `'default'`.

**Expected Results:**
- [ ] `sky` color KPI shows value in sky-600/sky-400
- [ ] `amber` color KPI shows value in amber-500/amber-400
- [ ] `red` color KPI shows value in red-500/red-400
- [ ] `default` color KPI shows value in zinc-900/zinc-100

### Trend Direction Colors
**Setup:** Render KPI cards with different `trendDirection` and `color` combinations.

**Expected Results:**
- [ ] `trendDirection: 'up'` with `color: 'red'` or `'amber'` shows trend in red (bad -- more problems is bad)
- [ ] `trendDirection: 'down'` with `color: 'red'` or `'amber'` shows trend in emerald (good)
- [ ] `trendDirection: 'up'` with `color: 'sky'` or `'default'` shows trend in neutral zinc
- [ ] `trendDirection: 'down'` with `color: 'sky'` shows trend in emerald

### Relative Time Formatting
**Setup:** Render activity events with various timestamps.

**Expected Results:**
- [ ] Timestamp < 1 minute ago renders as "Just now"
- [ ] Timestamp 5 minutes ago renders as "5m ago"
- [ ] Timestamp 3 hours ago renders as "3h ago"
- [ ] Timestamp 1 day ago renders as "Yesterday"
- [ ] Timestamp 4 days ago renders as "4d ago"
- [ ] Timestamp > 7 days ago renders as formatted date (e.g. "12 Jan")

---

## Edge Cases

### Many KPI Cards
**Setup:** Render with 4+ KPI cards plus the goal alignment card.

**Expected Results:**
- [ ] Grid adapts responsively: 2 cols on mobile, 3 on sm, 5 on lg
- [ ] No overflow or wrapping issues

### Long Person Names in Attention List
**Setup:** Render with an attention person with a very long name and long misaligned goal text.

**Expected Results:**
- [ ] Name is truncated with ellipsis
- [ ] Misaligned goal text is truncated with ellipsis
- [ ] Layout does not break

### Large KPI Values
**Setup:** Render KPI with `value: 99999`.

**Expected Results:**
- [ ] Value renders with tabular-nums for alignment
- [ ] No overflow in the card

---

## Accessibility Checks

- [ ] All KPI cards are `<button>` elements and focusable via Tab
- [ ] KPI cards have `focus-visible:ring-2 focus-visible:ring-sky-500` on keyboard focus
- [ ] Attention rows are `<button>` elements with `focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400`
- [ ] Activity rows are `<button>` elements with `focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400`
- [ ] Goal alignment card counts are `<button>` elements with `focus-visible:ring-2 focus-visible:ring-sky-500`
- [ ] All interactive elements are reachable via keyboard navigation
- [ ] Attention row ratio has a `title` attribute: `"X of Y tasks align with goals"`

---

## Sample Test Data

```typescript
import type { DashboardKpi, GoalAlignmentSummary, AttentionPerson, ActivityEvent, DashboardProps } from './types'

const mockKpis: DashboardKpi[] = [
  { id: 'kpi-high', label: 'High Priority', value: 5, trend: '+2', trendDirection: 'up', color: 'amber', linkTo: '/tasks', linkFilter: 'priority=high' },
  { id: 'kpi-medium', label: 'Medium Priority', value: 12, trend: '-1', trendDirection: 'down', color: 'default', linkTo: '/tasks', linkFilter: 'priority=medium' },
  { id: 'kpi-low', label: 'Low Priority', value: 23, trend: '0', trendDirection: 'neutral', color: 'default', linkTo: '/tasks', linkFilter: 'priority=low' },
  { id: 'kpi-problems', label: 'Problems', value: 3, trend: '+1', trendDirection: 'up', color: 'red', linkTo: '/tasks', linkFilter: 'status=problem' },
]

const mockGoalAlignment: GoalAlignmentSummary = {
  onGoal: 8,
  offGoal: 3,
  total: 11,
  linkTo: '/people',
  linkFilterOnGoal: 'goal=on',
  linkFilterOffGoal: 'goal=off',
}

const mockAttentionPeople: AttentionPerson[] = [
  { personId: 'p1', name: 'Ahmed Al-Rashid', role: 'Site Engineer', goalStatus: 'off', misalignedGoal: 'Safety compliance reviews', taskCount: 12, goalMatchCount: 4 },
  { personId: 'p2', name: 'Fatima Hassan', role: 'Project Manager', goalStatus: 'off', misalignedGoal: 'Budget tracking and approvals', taskCount: 8, goalMatchCount: 2 },
]

const mockActivityFeed: ActivityEvent[] = [
  { id: 'ev1', type: 'task', description: 'New task extracted for Ahmed Al-Rashid', timestamp: new Date(Date.now() - 300000).toISOString(), linkTo: '/tasks/t1' },
  { id: 'ev2', type: 'processing', description: 'WhatsApp processing completed — 48 messages', timestamp: new Date(Date.now() - 3600000).toISOString(), linkTo: '/processing/run1' },
  { id: 'ev3', type: 'problem', description: 'Identity conflict detected: 2 profiles may be the same person', timestamp: new Date(Date.now() - 7200000).toISOString(), linkTo: '/people/conflicts' },
  { id: 'ev4', type: 'source', description: 'WhatsApp connection sync completed', timestamp: new Date(Date.now() - 86400000).toISOString(), linkTo: '/sources/whatsapp' },
  { id: 'ev5', type: 'identity', description: 'Phone +971501234567 linked to Ahmed Al-Rashid', timestamp: new Date(Date.now() - 172800000).toISOString(), linkTo: '/people/p1' },
]

const mockDashboardProps: DashboardProps = {
  kpis: mockKpis,
  goalAlignment: mockGoalAlignment,
  attentionPeople: mockAttentionPeople,
  activityFeed: mockActivityFeed,
  onNavigate: vi.fn(),
  onPersonClick: vi.fn(),
}
```
