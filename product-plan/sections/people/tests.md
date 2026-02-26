# Test Specs: People

These test specs are **framework-agnostic**. Adapt them to your testing setup.

## Overview
The People section includes two views: a **People List** (high-density index of all personnel with search, filter, and sort) and a **Person Detail** page (task list/kanban, filters, person settings slide-over, and task detail modal). Tests cover navigation between views, all filter/sort combinations, sub-components (PersonSettings, TaskDetailModal), and empty states.

---

## User Flow Tests

### Flow 1: People List -- Browse and Navigate
**Scenario:** User scans the people list and clicks a person to navigate to their detail page.

#### Success Path
**Setup:** Render `PeopleList` with `people` containing 5+ `PersonSummary` items (mix of active/dormant, varying task counts). Provide mock `onPersonClick`.

**Steps:**
1. Verify the page header shows "People" with subtitle "Management overview for your team"
2. Verify stat cards display: "Active People", "Total Tasks" (sky), "High Priority" (amber), "Overdue" (red)
3. Verify column headers are visible: Name, Role, Goal, All, High, Med, Low, Due, vs Avg, Last
4. Verify each person row shows name (or phone fallback), role, goal status indicator, task count columns, load indicator, and last activity
5. Click on a person row

**Expected Results:**
- [ ] `onPersonClick` is called with the person's `id`
- [ ] Stat cards show correct aggregated values
- [ ] Active filter is selected by default ("Active" button has dark background)
- [ ] Default sort is "Urgency" (overdue first, then high-priority, then total tasks, then alphabetical)

---

### Flow 2: People List -- Search
**Scenario:** User searches for a person by name, alias, phone, email, or role.

#### Success Path
**Setup:** Render with people including: `{ name: 'Ahmed Al-Rashid', phone: '+971501234567', email: 'ahmed@company.com', aliases: ['Abu Ahmed'], role: 'Site Engineer' }`.

**Steps:**
1. Type "Ahmed" in the search field (placeholder: "Search by name, role, phone, email...")
2. Verify filtered results include "Ahmed Al-Rashid"
3. Clear the search and type "+971501"
4. Verify "Ahmed Al-Rashid" still appears (phone match)
5. Clear and type "Abu Ahmed"
6. Verify match via alias

**Expected Results:**
- [ ] `onSearch` callback is called with each query value
- [ ] Search matches against: `name`, `phone`, `email`, `role`, `function`, and `aliases`
- [ ] Search is case-insensitive
- [ ] Results update in real-time as the user types

#### Failure Path: No Results
**Setup:** Render with people. Type a query that matches no one (e.g. "zzzzz").

**Expected Results:**
- [ ] Empty state text "No people match your search." is displayed
- [ ] The table card still renders (with empty body)

---

### Flow 3: People List -- Filter Toggle (Active / All)
**Scenario:** User toggles between Active and All people views.

#### Success Path
**Setup:** Render with 3 active people and 2 dormant people.

**Steps:**
1. Verify default filter is "Active" and only active people are shown
2. Click "All" toggle button
3. Verify all 5 people are now visible
4. Click "Active" to switch back

**Expected Results:**
- [ ] `onFilterChange` is called with `'active'` or `'all'`
- [ ] Active filter button has dark background styling when selected
- [ ] Dormant users are visually de-emphasized (if visible in "All" mode)

---

### Flow 4: People List -- Sort
**Scenario:** User changes the sort order of the people list.

#### Success Path
**Setup:** Render with people having different task counts and names.

**Steps:**
1. Verify default sort dropdown shows "Sort: Urgency"
2. Change sort to "Name"
3. Verify list is alphabetically sorted
4. Change to "Workload"
5. Verify list is sorted by total task count descending
6. Change to "Priority"
7. Verify list is sorted by (high + overdue) count descending

**Expected Results:**
- [ ] `onSortChange` is called with the selected sort key
- [ ] Sort options are: "Urgency", "Name", "Workload", "Priority"
- [ ] Default urgency sort: overdue first, then high-priority, then total tasks, then alphabetical

---

### Flow 5: Person Detail -- View Tasks in List Mode
**Scenario:** User views a person's tasks grouped by priority in list mode.

#### Success Path
**Setup:** Render `PersonDetail` with a `person`, `tasks` (mix of high/medium/low, some overdue), `messages`, and `averageTaskCount: 5`.

**Steps:**
1. Verify "Back to People" link with ArrowLeft icon is visible
2. Verify person name is displayed as heading
3. Verify settings gear icon is present
4. Verify contact info (phone, email, aliases, identifiers linked) is displayed
5. Verify stat cards show: Total Tasks, High Priority (amber), Medium, Low, Overdue (red), vs Team Avg
6. Verify "List" view toggle is active by default
7. Verify tasks are grouped by priority: "High Priority", "Medium Priority", "Low Priority" with section headers
8. Verify each task row shows title, summary, source reference, due date, and AI confidence percentage
9. Verify overdue tasks have red title text and "Overdue" badge

**Expected Results:**
- [ ] Tasks within each priority group are sorted: overdue first, then by due date, then by creation date
- [ ] The "Tasks" card header shows filtered count when filters are active
- [ ] `onBack` is called when "Back to People" is clicked

---

### Flow 6: Person Detail -- Kanban View
**Scenario:** User switches to kanban view.

#### Success Path
**Setup:** Same as Flow 5.

**Steps:**
1. Click the "Kanban" toggle button
2. Verify a 3-column layout appears: High Priority, Medium Priority, Low Priority
3. Verify each kanban card shows: title, summary, due date, AI confidence
4. Verify overdue cards have red-tinted border and background

**Expected Results:**
- [ ] "Kanban" button has active styling
- [ ] Empty columns show "No tasks" placeholder
- [ ] Cards are clickable

---

### Flow 7: Person Detail -- Task Filters
**Scenario:** User filters tasks by search, priority, status, and date range.

#### Success Path
**Setup:** Render with 10+ tasks spanning different priorities, statuses, and dates.

**Steps:**
1. Type "safety" in the "Search tasks..." input
2. Verify only tasks matching "safety" in title, summary, or source reference are shown
3. Click the "X" button in the search field to clear
4. Click the "High" priority filter pill
5. Verify only high-priority tasks are shown
6. Click the "Overdue" status filter pill
7. Verify only overdue tasks are shown
8. Set a date range using the date picker
9. Verify the filter count "X of Y" appears in the card header
10. Click "Clear filters" link
11. Verify all tasks are shown again

**Expected Results:**
- [ ] Priority filter pills: "All", "High", "Medium", "Low" -- active pill has dark background
- [ ] Status filter pills: "All", "Open", "In Progress", "Overdue" -- active pill has dark background
- [ ] Search uses fuzzy matching on title, summary, and source reference
- [ ] "Clear filters" link appears when any filter is active
- [ ] Filter count display: "X of Y" (e.g. "3 of 12")

#### Failure Path: No Tasks Match Filters
**Steps:** Apply filters that match no tasks.

**Expected Results:**
- [ ] Text "No tasks match your filters." is displayed
- [ ] A "Clear filters" button is shown below the text

---

### Flow 8: Task Detail Modal
**Scenario:** User clicks a task to view its details and messages.

#### Success Path
**Setup:** Render `PersonDetail` with tasks and messages linked by `taskId`. Include messages with `isOriginal: true` and `personReferences` containing `{ name: 'Fatima', personId: 'p2' }`.

**Steps:**
1. Click a task row or kanban card
2. Verify the `TaskDetailModal` opens with: title, summary, priority badge, status badge, overdue badge (if applicable), due date with calendar icon, AI confidence percentage, source reference, and creation date
3. Verify the "Original Message" section shows the original message with sender, source, timestamp, and content
4. Verify the "Related Messages" section shows other messages with a count
5. Verify person references are rendered as clickable links
6. Click a person reference link (e.g. "Fatima")
7. Click the X button or overlay to close the modal

**Expected Results:**
- [ ] Modal displays priority badge with correct color: High (amber), Medium (zinc), Low (zinc)
- [ ] Modal displays status badge: Open (sky), In Progress (violet), Done (emerald)
- [ ] Overdue badge is displayed only when `task.isOverdue` is true
- [ ] `onPersonReferenceClick` is called with `'p2'` when person reference is clicked
- [ ] Modal closes on overlay click or X button click
- [ ] Person references without `personId` render as non-clickable spans

#### Edge Case: No Messages
**Setup:** Task with no linked messages.

**Expected Results:**
- [ ] Text "No messages linked to this task." is displayed in the modal body

---

### Flow 9: Person Settings Slide-Over
**Scenario:** User opens person settings, edits fields, and saves.

#### Success Path
**Setup:** Render `PersonDetail` with a person. Provide mock `onSaveSettings`.

**Steps:**
1. Click the settings gear icon next to the person name
2. Verify the `PersonSettings` slide-over opens from the right
3. Verify the header says "Person Settings"
4. Verify three sections: "Identity", "Role", "AI Processing"
5. Verify Identity fields are pre-populated: Full Name, Aliases (tag input), Email, Phone
6. Verify Role fields: Role Name, Description textarea
7. Verify AI Processing fields: Priorities textarea, Custom Prompt textarea
8. Add an alias by typing "Abu Ali" and pressing Enter
9. Verify the alias tag appears
10. Remove an alias by clicking the X on its tag
11. Edit the Role Name field
12. Click "Save Changes"
13. Click "Cancel" to close without saving

**Expected Results:**
- [ ] `onSaveSettings` is called with `(personId, { name, aliases, email, phone, roleName, roleDescription, priorities, customPrompt })`
- [ ] Aliases field supports tag input: Enter to add, Backspace to remove last, X button on tags
- [ ] Slide-over closes after save
- [ ] Clicking overlay closes the slide-over
- [ ] Clicking "Cancel" closes without calling `onSaveSettings`

---

## Empty State Tests

### People List -- No People
**Setup:** Render `PeopleList` with `people: []`.

**Expected Results:**
- [ ] Text "No people found." is shown in the table area
- [ ] Stat cards show 0 for all values
- [ ] Search and filter controls are still visible

### People List -- No Active People
**Setup:** Render with only dormant people and "Active" filter selected.

**Expected Results:**
- [ ] Text "No people found." is shown
- [ ] Switching to "All" shows the dormant people

### Person Detail -- No Tasks
**Setup:** Render `PersonDetail` with `tasks: []`.

**Expected Results:**
- [ ] Text "No active tasks." is displayed in the tasks card
- [ ] No filter toolbar is shown (filters are hidden when `tasks.length === 0`)
- [ ] Stat cards show 0 for task counts

---

## Component Interaction Tests

### Task Load Indicator
**Setup:** Render people with varying task counts against a known average.

**Expected Results:**
- [ ] Person with total > average * 1.1 shows load as "above" (symbol triangle up, amber color)
- [ ] Person with total between average * 0.9 and average * 1.1 shows "average" (em dash, zinc)
- [ ] Person with total < average * 0.9 shows "below" (triangle down, sky)
- [ ] Person with 0 tasks shows "below"

### Person Row -- Phone Fallback
**Setup:** Render a person with `name: null` and `phone: '+971501234567'`.

**Expected Results:**
- [ ] The phone number is displayed as the primary identifier in the name column

### Person Row -- Goal Status Indicator
**Setup:** Render people with `goalStatus: 'on_goal'` and `goalStatus: 'off_goal'`.

**Expected Results:**
- [ ] On-goal people show an emerald dot
- [ ] Off-goal people show a red dot

### View Mode Toggle Persistence
**Steps:** Switch to Kanban view, apply filters, switch back to List view.

**Expected Results:**
- [ ] View mode persists independently of filter state
- [ ] Filters apply to both list and kanban views simultaneously

---

## Edge Cases

### Very Long Person Name
**Setup:** Person with name "Muhammad bin Abdullah Al-Khalifa Al-Rashid".

**Expected Results:**
- [ ] Name is truncated in list rows
- [ ] Full name displays in the detail page header

### Person with Many Aliases
**Setup:** Person with `aliases: ['Abu Ahmed', 'The Boss', 'Site Lead', 'Ahmed Senior', 'AK']`.

**Expected Results:**
- [ ] Aliases display as "aka Abu Ahmed, The Boss, Site Lead, Ahmed Senior, AK" in the detail header
- [ ] Tag input in settings shows all tags with scrollable container

### Many Tasks (100+)
**Setup:** Render PersonDetail with 100 tasks.

**Expected Results:**
- [ ] Scrolling works correctly in both list and kanban views
- [ ] Filters perform well and update in real-time

### Task with No Due Date
**Setup:** Task with `dueDate: null`.

**Expected Results:**
- [ ] No date is shown in list view
- [ ] Kanban card shows "No date" text
- [ ] Task cannot be "overdue"

---

## Accessibility Checks

- [ ] People list rows are focusable buttons reachable via Tab
- [ ] Person rows have `focus-visible` ring styling
- [ ] Search input is labeled with placeholder text
- [ ] Filter toggle buttons (Active/All) are keyboard accessible
- [ ] Sort dropdown is a native `<select>` element (accessible by default)
- [ ] "Back to People" is focusable and keyboard activatable
- [ ] Settings gear button has `title="Person settings"`
- [ ] List/Kanban toggle buttons are keyboard accessible
- [ ] Task rows and kanban cards have `focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400`
- [ ] TaskDetailModal overlay closes on click; X button is keyboard accessible
- [ ] PersonSettings slide-over: overlay click closes; all form inputs are focusable
- [ ] Tag input in PersonSettings supports Enter to add and Backspace to remove

---

## Sample Test Data

```typescript
import type { PersonSummary, Task, TaskMessage, PersonDetailProps, PeopleProps } from './types'

const mockPeople: PersonSummary[] = [
  {
    id: 'p1',
    name: 'Ahmed Al-Rashid',
    phone: '+971501234567',
    email: 'ahmed@company.com',
    aliases: ['Abu Ahmed'],
    role: 'Site Engineer',
    function: 'MEP',
    identifiersLinked: 3,
    taskCounts: { high: 3, medium: 5, low: 2, overdue: 1, total: 10 },
    lastActivityAt: new Date(Date.now() - 3600000).toISOString(),
    status: 'active',
    goalStatus: 'off_goal',
  },
  {
    id: 'p2',
    name: 'Fatima Hassan',
    phone: '+971502345678',
    email: 'fatima@company.com',
    aliases: [],
    role: 'Project Manager',
    function: 'Operations',
    identifiersLinked: 2,
    taskCounts: { high: 1, medium: 3, low: 4, overdue: 0, total: 8 },
    lastActivityAt: new Date(Date.now() - 7200000).toISOString(),
    status: 'active',
    goalStatus: 'on_goal',
  },
  {
    id: 'p3',
    name: null,
    phone: '+971503456789',
    email: null,
    aliases: [],
    role: null,
    function: null,
    identifiersLinked: 1,
    taskCounts: { high: 0, medium: 0, low: 0, overdue: 0, total: 0 },
    lastActivityAt: new Date(Date.now() - 604800000).toISOString(),
    status: 'dormant',
    goalStatus: 'on_goal',
  },
]

const mockTasks: Task[] = [
  {
    id: 't1',
    userId: 'p1',
    title: 'Review safety compliance report',
    summary: 'Electrical safety audit findings need review before next inspection deadline.',
    priority: 'high',
    status: 'open',
    dueDate: '2026-02-20',
    confidence: 0.92,
    sourceReference: 'WhatsApp — Operations Group',
    createdAt: '2026-02-15T10:00:00Z',
    isOverdue: true,
  },
  {
    id: 't2',
    userId: 'p1',
    title: 'Order replacement circuit breakers',
    summary: 'Procurement request for Zone B electrical panel replacement.',
    priority: 'medium',
    status: 'in_progress',
    dueDate: '2026-03-05',
    confidence: 0.85,
    sourceReference: 'WhatsApp — Operations Group',
    createdAt: '2026-02-18T14:30:00Z',
    isOverdue: false,
  },
  {
    id: 't3',
    userId: 'p1',
    title: 'Update as-built drawings',
    summary: 'Drawings for Zone A fire alarm system need updating.',
    priority: 'low',
    status: 'open',
    dueDate: null,
    confidence: 0.78,
    sourceReference: 'Email — project@company.com',
    createdAt: '2026-02-10T09:00:00Z',
    isOverdue: false,
  },
]

const mockMessages: TaskMessage[] = [
  {
    id: 'm1',
    taskId: 't1',
    content: 'Ahmed, please review the safety report ASAP. The inspection is next week and we need your sign-off.',
    sender: 'Fatima Hassan',
    senderId: 'p2',
    timestamp: '2026-02-15T10:00:00Z',
    source: 'WhatsApp',
    isOriginal: true,
    personReferences: [{ name: 'Ahmed Al-Rashid', personId: 'p1' }],
  },
  {
    id: 'm2',
    taskId: 't1',
    content: 'Noted, I will have it done by Thursday. Can you ask Khalid to send the updated appendix?',
    sender: 'Ahmed Al-Rashid',
    senderId: 'p1',
    timestamp: '2026-02-15T10:15:00Z',
    source: 'WhatsApp',
    isOriginal: false,
    personReferences: [{ name: 'Khalid', personId: null }],
  },
]

const mockPeopleListProps: PeopleProps = {
  people: mockPeople,
  onPersonClick: vi.fn(),
  onSearch: vi.fn(),
  onFilterChange: vi.fn(),
  onSortChange: vi.fn(),
}

const mockPersonDetailProps: PersonDetailProps = {
  person: mockPeople[0],
  tasks: mockTasks,
  messages: mockMessages,
  averageTaskCount: 6,
  onBack: vi.fn(),
  onSaveSettings: vi.fn(),
  onPersonReferenceClick: vi.fn(),
}
```
