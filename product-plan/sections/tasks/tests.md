# Test Specs: Tasks

These test specs are **framework-agnostic**. Adapt them to your testing setup.

## Overview
The Tasks section provides a cross-user view of all extracted tasks with list/kanban views, comprehensive filters (search, priority, status, date range, person, source), a task detail modal, a person settings slide-over, and a resizable LLM chat panel docked at the bottom. Tests cover filter interactions, view toggling, modal/slide-over flows, and the chat panel.

---

## User Flow Tests

### Flow 1: View All Tasks in List Mode
**Scenario:** User views the default list of all tasks grouped by priority.

#### Success Path
**Setup:** Render `TasksView` with `tasks` (mix of priorities, some overdue), `people`, `sources`, `messages`, `chatMessages`. Provide mocks for all callbacks.

**Steps:**
1. Verify header: "Tasks" title with subtitle "All tasks across your team"
2. Verify "All Tasks" card header shows total task count
3. Verify "List" toggle is active by default
4. Verify tasks are grouped by priority: "High Priority", "Medium Priority", "Low Priority" with section headers showing dot, label, and count
5. Verify each task row shows: title, summary, source reference, assignee name (clickable sky-colored link), due date, and AI confidence percentage
6. Verify overdue tasks have red title text and "Overdue" badge

**Expected Results:**
- [ ] Task groups sorted internally: overdue first, then by due date, then by creation date
- [ ] Assignee name is rendered as a clickable link (sky-colored text)
- [ ] Confidence displayed as percentage in JetBrains Mono font

---

### Flow 2: View Tasks in Kanban Mode
**Scenario:** User switches to kanban view.

#### Success Path
**Steps:**
1. Click "Kanban" toggle button
2. Verify three columns: High Priority, Medium Priority, Low Priority
3. Verify each card shows: title, summary, assignee name (clickable), due date (or "No date"), confidence
4. Verify overdue cards have red-tinted border and background

**Expected Results:**
- [ ] "Kanban" button has active styling (dark background)
- [ ] Empty columns show "No tasks" placeholder text
- [ ] Assignee name is clickable in kanban cards

---

### Flow 3: Filter by Search
**Scenario:** User searches for tasks by title, summary, assignee, or source reference.

#### Success Path
**Setup:** Render with tasks containing various keywords.

**Steps:**
1. Type "safety" in the "Search tasks..." input
2. Verify only matching tasks are shown
3. Verify "X of Y" count appears in the card header (e.g. "3 of 24")
4. Click the X clear button in the search field
5. Verify all tasks are shown again

**Expected Results:**
- [ ] Search uses fuzzy matching on `title`, `summary`, `userName`, and `sourceReference`
- [ ] Search is case-insensitive
- [ ] X clear button appears when search has text

---

### Flow 4: Filter by Priority and Status Pills
**Scenario:** User uses filter pills to narrow results.

#### Success Path
**Steps:**
1. Click "High" priority pill
2. Verify only high-priority tasks are shown
3. Click "Overdue" status pill
4. Verify only overdue tasks remain
5. Verify "Clear filters" link appears
6. Click "Clear filters"
7. Verify all tasks are shown

**Expected Results:**
- [ ] Priority pills: "All", "High", "Medium", "Low" -- active pill has dark background
- [ ] Status pills: "All", "Open", "In Progress", "Overdue" -- active pill has dark background
- [ ] Multiple filter types combine (AND logic)
- [ ] "Clear filters" resets all filters at once

---

### Flow 5: Filter by Person Dropdown
**Scenario:** User filters tasks to a specific person.

#### Success Path
**Setup:** Render with tasks assigned to multiple people. Provide `people` list.

**Steps:**
1. Open the "All People" dropdown
2. Select "Ahmed Al-Rashid"
3. Verify only Ahmed's tasks are shown
4. Select "All People" to reset

**Expected Results:**
- [ ] Dropdown shows all people from `people` prop
- [ ] Filter matches on `task.userId === selectedPersonId`
- [ ] Count updates in card header

---

### Flow 6: Filter by Source Dropdown
**Scenario:** User filters tasks to a specific source.

#### Success Path
**Setup:** Render with tasks from different sources. Provide `sources` list.

**Steps:**
1. Open the "All Sources" dropdown
2. Select "WhatsApp"
3. Verify only WhatsApp-sourced tasks are shown
4. Select "All Sources" to reset

**Expected Results:**
- [ ] Dropdown shows all sources from `sources` prop
- [ ] Filter matches on `task.sourceId === selectedSourceId`

---

### Flow 7: Filter by Date Range
**Scenario:** User filters tasks by due date range.

#### Success Path
**Steps:**
1. Use the date range picker to set a "from" date and "to" date
2. Verify only tasks with `dueDate` within the range are shown
3. Verify tasks with `dueDate: null` are excluded

**Expected Results:**
- [ ] Date filter uses inclusive range: `dueDate >= from && dueDate <= to`
- [ ] Tasks without due dates are excluded when date filter is active

---

### Flow 8: Task Detail Modal
**Scenario:** User clicks a task to view its details.

#### Success Path
**Setup:** Render with `messages` linked to tasks. Include messages with person references.

**Steps:**
1. Click a task row in list view (or kanban card)
2. Verify `TaskDetailModal` opens with title, summary, priority badge, status badge, due date, confidence, source reference
3. Verify original message and related messages are displayed
4. Click a person reference in a message
5. Click X or overlay to close

**Expected Results:**
- [ ] Modal displays task title as heading
- [ ] Priority badge: High (amber), Medium (zinc), Low (zinc)
- [ ] Status badge: Open (sky), In Progress (violet), Done (emerald)
- [ ] Overdue badge shown if `isOverdue` is true
- [ ] Clicking person reference closes the modal and opens the person settings slide-over (calls `setSettingsPersonId`)
- [ ] Modal closes on X click or overlay click

---

### Flow 9: Person Settings Slide-Over via Assignee Click
**Scenario:** User clicks an assignee name in the task list to open their settings.

#### Success Path
**Setup:** Render with tasks and people.

**Steps:**
1. Click the assignee name link (e.g. "Ahmed Al-Rashid") in a task row
2. Verify the `PersonSettings` slide-over opens from the right
3. Verify the slide-over is populated with the person's data (adapted from Tasks PersonSummary via `toPeoplePersonSummary`)
4. Edit a field and click "Save Changes"
5. Click "Cancel" or overlay to close

**Expected Results:**
- [ ] `onSavePersonSettings` is called with `(personId, data)` on save
- [ ] Slide-over closes after save
- [ ] Clicking assignee in kanban view also opens the slide-over
- [ ] The click does not also open the task detail modal (stopPropagation)

---

### Flow 10: Person Settings via Task Detail Modal
**Scenario:** User opens task detail, then clicks a person reference to open their settings.

#### Success Path
**Steps:**
1. Click a task row to open the task detail modal
2. In the modal, click a person reference link
3. Verify the task detail modal closes
4. Verify the person settings slide-over opens for the referenced person

**Expected Results:**
- [ ] Modal closes first, then slide-over opens
- [ ] The correct person is shown in the slide-over

---

### Flow 11: Chat Panel -- Collapse and Expand
**Scenario:** User interacts with the resizable chat panel.

#### Success Path
**Setup:** Render `TasksView` with `chatMessages: []`.

**Steps:**
1. Verify the chat panel is collapsed by default (thin bar, ~48px height)
2. Verify collapsed bar shows "Ask about these tasks..." placeholder and "Discussing N tasks" count
3. Click the collapsed bar to expand
4. Verify the expanded panel shows: "Discussing N filtered tasks" context indicator, empty message area with "Ask a question about the tasks in view" placeholder, and input field
5. Click "Collapse" button to collapse again

**Expected Results:**
- [ ] Collapsed state height is 48px
- [ ] Expanded state shows conversation area and input field
- [ ] Task count updates when filters change

---

### Flow 12: Chat Panel -- Send Message
**Scenario:** User sends a message in the chat panel.

#### Success Path
**Setup:** Render with `chatMessages` containing existing conversation. Provide mock `onChatSend`.

**Steps:**
1. Expand the chat panel
2. Type "Which tasks are most urgent?" in the input textarea
3. Press Enter (without Shift) to send
4. Verify `onChatSend` is called

**Expected Results:**
- [ ] `onChatSend` is called with `(message, filteredTasks)` where `filteredTasks` is the currently filtered task array
- [ ] Input clears after sending
- [ ] Send button is disabled when input is empty
- [ ] Shift+Enter does NOT send (allows multiline input)
- [ ] User messages are right-aligned with sky background
- [ ] Assistant messages are left-aligned with zinc background
- [ ] Messages scroll to bottom on new message

---

### Flow 13: Chat Panel -- Drag Resize
**Scenario:** User resizes the chat panel by dragging.

#### Success Path
**Steps:**
1. Mouse down on the GripHorizontal drag handle at the top of the chat panel
2. Drag upward to increase panel height
3. Release mouse

**Expected Results:**
- [ ] Panel height increases as user drags up
- [ ] Panel height has minimum of 48px and maximum of 600px
- [ ] Drag handle is always visible

---

## Empty State Tests

### No Tasks in System
**Setup:** Render with `tasks: []`.

**Expected Results:**
- [ ] Text "No tasks in the system." is displayed in the task card
- [ ] Filter toolbar is still visible
- [ ] Chat panel shows "Discussing 0 tasks"

### No Tasks Match Filters
**Setup:** Render with tasks, apply filters that match nothing.

**Expected Results:**
- [ ] Text "No tasks match your filters." is displayed
- [ ] "Clear filters" button is shown below the text
- [ ] Chat panel task count updates to 0

### No Chat Messages
**Setup:** Render with `chatMessages: []` and expand the chat panel.

**Expected Results:**
- [ ] Text "Ask a question about the tasks in view" is centered in the message area

---

## Component Interaction Tests

### Filter Combination
**Setup:** Apply search + priority + status + person + source + date range simultaneously.

**Expected Results:**
- [ ] All filters apply with AND logic
- [ ] Count in header reflects all combined filters
- [ ] "Clear filters" resets all filters to their defaults

### Chat Context Sync
**Setup:** Change filters while the chat panel is expanded.

**Expected Results:**
- [ ] "Discussing N filtered tasks" count updates when filters change
- [ ] `onChatSend` passes the current `filteredTasks` array (not all tasks)

### View Toggle with Active Filters
**Steps:** Apply filters in list view, switch to kanban.

**Expected Results:**
- [ ] Same filters apply in kanban view
- [ ] Filtered results are consistent between views

---

## Edge Cases

### Task with No Due Date
**Setup:** Task with `dueDate: null`.

**Expected Results:**
- [ ] No date displayed in list view
- [ ] Kanban card shows "No date"
- [ ] Task is excluded from date range filters

### Task with Very Long Title/Summary
**Setup:** Task with a 200-character title and summary.

**Expected Results:**
- [ ] Title truncates in list rows
- [ ] Summary truncates to 1 line in list view, 2 lines in kanban cards
- [ ] Full text displays in task detail modal

### Assignee Name Truncation
**Setup:** Task with `userName` that is very long.

**Expected Results:**
- [ ] Assignee link truncates with `max-w-[120px]` in list view
- [ ] Assignee link truncates with `max-w-[100px]` in kanban cards

### Many Filters Active
**Setup:** Activate all filter types at once.

**Expected Results:**
- [ ] "Clear filters" resets: search, priority, status, dateFrom, dateTo, personFilter, sourceFilter
- [ ] Header count accurately reflects combined filtering

---

## Accessibility Checks

- [ ] List/Kanban toggle buttons are keyboard accessible
- [ ] Task rows in list view have focusable task area and separate focusable assignee link
- [ ] Kanban cards have focusable task button and separate focusable assignee link
- [ ] Priority and status filter pills are focusable buttons
- [ ] Person and source dropdowns are native `<select>` elements
- [ ] Search input is accessible with clear button
- [ ] Chat panel: input textarea is focusable, send button has disabled state
- [ ] Chat panel drag handle is mouse-interactive (drag resize)
- [ ] TaskDetailModal: X button and overlay are keyboard accessible
- [ ] PersonSettings slide-over: all form fields are focusable, Cancel/Save buttons work via keyboard
- [ ] Collapsed chat panel bar is a `<button>` element activatable via keyboard

---

## Sample Test Data

```typescript
import type { Task, PersonSummary, SourceSummary, TaskMessage, ChatMessage, TasksProps } from './types'

const mockTasks: Task[] = [
  {
    id: 't1',
    userId: 'p1',
    userName: 'Ahmed Al-Rashid',
    userRole: 'Site Engineer',
    sourceId: 's1',
    sourceName: 'WhatsApp — Operations',
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
    userId: 'p2',
    userName: 'Fatima Hassan',
    userRole: 'Project Manager',
    sourceId: 's2',
    sourceName: 'Email — Inbox',
    title: 'Approve budget revision Q1',
    summary: 'Budget revision request for Zone B needs PM approval.',
    priority: 'medium',
    status: 'in_progress',
    dueDate: '2026-03-01',
    confidence: 0.88,
    sourceReference: 'Email — project@company.com',
    createdAt: '2026-02-18T14:30:00Z',
    isOverdue: false,
  },
  {
    id: 't3',
    userId: 'p1',
    userName: 'Ahmed Al-Rashid',
    userRole: 'Site Engineer',
    sourceId: 's1',
    sourceName: 'WhatsApp — Operations',
    title: 'Update as-built drawings',
    summary: 'Drawings for Zone A fire alarm system need updating.',
    priority: 'low',
    status: 'open',
    dueDate: null,
    confidence: 0.78,
    sourceReference: 'WhatsApp — Operations Group',
    createdAt: '2026-02-10T09:00:00Z',
    isOverdue: false,
  },
]

const mockPeople: PersonSummary[] = [
  { id: 'p1', name: 'Ahmed Al-Rashid', role: 'Site Engineer' },
  { id: 'p2', name: 'Fatima Hassan', role: 'Project Manager' },
]

const mockSources: SourceSummary[] = [
  { id: 's1', name: 'WhatsApp — Operations', type: 'whatsapp' },
  { id: 's2', name: 'Email — Inbox', type: 'email' },
]

const mockMessages: TaskMessage[] = [
  {
    id: 'm1',
    taskId: 't1',
    content: 'Ahmed, review the safety report by Thursday please.',
    sender: 'Fatima Hassan',
    senderId: 'p2',
    timestamp: '2026-02-15T10:00:00Z',
    source: 'WhatsApp',
    isOriginal: true,
    personReferences: [{ name: 'Ahmed Al-Rashid', personId: 'p1' }],
  },
]

const mockChatMessages: ChatMessage[] = [
  { id: 'c1', role: 'user', content: 'Which tasks are overdue?', timestamp: '2026-02-25T10:00:00Z' },
  { id: 'c2', role: 'assistant', content: 'There is 1 overdue task: "Review safety compliance report" assigned to Ahmed Al-Rashid, due Feb 20.', timestamp: '2026-02-25T10:00:05Z' },
]

const mockTasksProps: TasksProps = {
  tasks: mockTasks,
  people: mockPeople,
  sources: mockSources,
  messages: mockMessages,
  chatMessages: mockChatMessages,
  onPersonClick: vi.fn(),
  onSavePersonSettings: vi.fn(),
  onChatSend: vi.fn(),
}
```
