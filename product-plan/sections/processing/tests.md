# Test Specs: Processing

These test specs are **framework-agnostic**. Adapt them to your testing setup.

## Overview
The Processing section has two tabs: **Rules** (CRUD for processing rules with enable/disable toggle and manual run trigger) and **Run History** (filterable paginated table of processing runs with expandable detail rows). Tests cover the tab toggle, rule management, the slide-over editor, run history filtering/pagination, and run row expansion.

---

## User Flow Tests

### Flow 1: View Rules Tab
**Scenario:** User views all configured processing rules.

#### Success Path
**Setup:** Render `ProcessingView` with `rules` containing 3+ rules (mix of enabled/disabled, various last run statuses). Provide `runs`. Mock all callbacks.

**Steps:**
1. Verify header: "Processing" title with subtitle "Configure processing rules and view run history"
2. Verify tab toggle: "Rules" and "Run History" -- "Rules" is active by default
3. Verify "Add rule" button is visible (only when Rules tab is active)
4. Verify stat cards: "Rules" (count), "Total Runs" (sky), "Successful" (emerald), "Failed" (red if > 0)
5. Verify each rule row displays: toggle switch, rule name, last run status badge, schedule with Clock icon, channel chips (colored icons), action type label, "Last run X ago" text, and action buttons (Run now, Edit, Delete)

**Expected Results:**
- [ ] Enabled rules are full opacity; disabled rules have `opacity-50`
- [ ] Toggle switch: sky-500 background when enabled, zinc-300 when disabled
- [ ] Status badges: Success (emerald), Partial (amber), Failed (red)
- [ ] Channel chips show correct icons: WhatsApp (MessageCircle/emerald), Google Meet (Video/sky), Email (Mail/violet), Webhook (Webhook/amber)
- [ ] Action labels: "Extract tasks", "Update profiles", "Tasks + Profiles"

---

### Flow 2: Toggle Rule Enabled/Disabled
**Scenario:** User enables or disables a rule.

#### Success Path
**Setup:** Render with a mix of enabled and disabled rules.

**Steps:**
1. Click the toggle switch on an enabled rule
2. Click the toggle switch on a disabled rule

**Expected Results:**
- [ ] `onToggleRule` is called with `(ruleId, false)` when disabling
- [ ] `onToggleRule` is called with `(ruleId, true)` when enabling
- [ ] Visual toggle state changes immediately

---

### Flow 3: Trigger Manual Run
**Scenario:** User triggers a manual "Run now" on a rule.

#### Success Path
**Steps:**
1. Click the Run now button (Play icon, `title="Run now"`) on a rule row

**Expected Results:**
- [ ] `onRunNow` is called with `ruleId`

---

### Flow 4: Create a New Rule
**Scenario:** User creates a new processing rule via the slide-over panel.

#### Success Path
**Steps:**
1. Click "Add rule" button
2. Verify slide-over opens from the right with title "New Rule"
3. Verify form fields: Rule name, Description, Schedule (placeholder: "e.g. every 6 hours, daily at 06:00"), Source channels (multi-select buttons: WhatsApp, Google Meet, Email, Webhook), Target action (3 buttons: "Extract tasks", "Update profiles", "Tasks + Profiles"), and AI Prompt textarea
4. Verify schedule defaults to "every 6 hours"
5. Verify default action is "Extract tasks"
6. Fill in: name "Task Extraction -- All Channels", schedule "every 6 hours", select WhatsApp and Email channels, keep default action, enter a prompt
7. Click "Create rule"

**Expected Results:**
- [ ] `onCreateRule` is called with `{ name, description, schedule, channelIds, prompt, action }`
- [ ] Slide-over closes after creation
- [ ] Channel selection: clicking a channel toggles it; selected channels have sky-highlighted styling
- [ ] Action selection: only one action can be selected at a time

#### Failure Path: Incomplete Form
**Steps:** Try to submit with missing required fields (name, schedule, prompt, or no channels).

**Expected Results:**
- [ ] "Create rule" button is disabled (`disabled:opacity-40 disabled:cursor-not-allowed`)
- [ ] `onCreateRule` is NOT called

#### Cancel Create
**Steps:** Click "Cancel" or click overlay.

**Expected Results:**
- [ ] Slide-over closes
- [ ] No callback is fired

---

### Flow 5: Edit an Existing Rule
**Scenario:** User edits a rule via the slide-over panel.

#### Success Path
**Setup:** Render with existing rules.

**Steps:**
1. Click the Edit button (Pencil icon, `title="Edit"`) on a rule
2. Verify slide-over opens with title "Edit Rule"
3. Verify form is pre-populated with the rule's current values (name, description, schedule, channelIds, prompt, action)
4. Modify the schedule to "every 4 hours"
5. Click "Save changes"

**Expected Results:**
- [ ] `onEditRule` is called with `(ruleId, updatedData)`
- [ ] Slide-over closes after save
- [ ] Pre-populated values match the original rule exactly

---

### Flow 6: Delete a Rule
**Scenario:** User deletes a rule with confirmation.

#### Success Path
**Steps:**
1. Click the Delete button (Trash2 icon, `title="Delete"`) on a rule
2. Verify the rule row is replaced by a confirmation message: 'Delete [rule name]? This cannot be undone.'
3. Click the "Delete" confirmation button (red)

**Expected Results:**
- [ ] `onDeleteRule` is called with `ruleId`
- [ ] Confirmation UI disappears

#### Cancel Delete
**Steps:** Click "Cancel" on the confirmation.

**Expected Results:**
- [ ] Original rule row is restored
- [ ] `onDeleteRule` is NOT called

---

### Flow 7: View Run History Tab
**Scenario:** User switches to the Run History tab to view processing runs.

#### Success Path
**Setup:** Render with `runs` containing 25+ runs with various statuses.

**Steps:**
1. Click "Run History" tab
2. Verify "Add rule" button is hidden
3. Verify filter toolbar: search input ("Search by rule name..."), rule dropdown ("All rules"), status dropdown ("All statuses"), action type dropdown ("All types"), date range (From/To inputs)
4. Verify run table with column headers: (expand), Rule, Status, Date, Time, Msgs, Tasks, IDs, Profiles
5. Verify each run row shows: rule name, status badge, date, time, messages processed, tasks extracted, identities resolved, profiles updated
6. Verify pagination: "Rows per page" selector (10/25/50/100), "X-Y of Z" range, Prev/Next buttons

**Expected Results:**
- [ ] Runs are sorted by date descending (most recent first)
- [ ] Status badges: Success (emerald/CheckCircle2), Partial (amber/AlertTriangle), Failed (red/XCircle)
- [ ] Default pagination shows 10 rows per page
- [ ] Zero values in stat columns use muted color (zinc-300)

---

### Flow 8: Filter Run History
**Scenario:** User filters runs by rule, status, action type, date range, and search.

#### Success Path
**Steps:**
1. Type "Task Extraction" in the search field
2. Select a specific rule from the rule dropdown
3. Select "Failed" from the status dropdown
4. Select "Extract tasks" from the action type dropdown
5. Set a "From" date and "To" date
6. Verify filtered results and "Clear filters" link appears
7. Click "Clear filters"

**Expected Results:**
- [ ] Search filters by rule name (case-insensitive substring match)
- [ ] Rule dropdown filters by `ruleId`
- [ ] Status dropdown filters by `run.status`
- [ ] Action type dropdown filters by the associated rule's `action` field
- [ ] Date range filters by `run.startedAt` (inclusive)
- [ ] All filters combine with AND logic
- [ ] "Clear filters" resets all filters
- [ ] Pagination resets to page 0 when any filter changes

---

### Flow 9: Expand a Run Row
**Scenario:** User clicks a run to see details.

#### Success Path -- Run with Errors
**Setup:** Run with `status: 'partial'` or `'failed'` and `errors` array populated.

**Steps:**
1. Click a run row
2. Verify the row expands showing error details
3. Verify each error shows: AlertTriangle icon, error message, and context

**Expected Results:**
- [ ] ChevronRight rotates to ChevronDown when expanded
- [ ] Error messages are displayed in red error boxes
- [ ] Each error shows `message` and `context` text

#### Success Path -- Run without Errors
**Setup:** Run with `status: 'success'` and `errors: []`.

**Steps:**
1. Click the run row

**Expected Results:**
- [ ] Expanded area shows "Completed in Xm Ys with no errors."
- [ ] Duration is formatted: seconds only (e.g. "45s"), or minutes+seconds (e.g. "2m 15s")

#### Toggle Collapse
**Steps:** Click an expanded run row again.

**Expected Results:**
- [ ] Row collapses, detail area is hidden
- [ ] Only one run can be expanded at a time

---

### Flow 10: Pagination
**Scenario:** User navigates through paginated run history.

#### Success Path
**Setup:** Render with 35 runs.

**Steps:**
1. Verify page 1 shows "1-10 of 35"
2. Click "Next"
3. Verify page 2 shows "11-20 of 35"
4. Click "Prev"
5. Verify back to page 1
6. Change "Rows per page" to 25
7. Verify "1-25 of 35"

**Expected Results:**
- [ ] "Prev" is disabled on first page
- [ ] "Next" is disabled on last page
- [ ] Changing rows per page resets to first page
- [ ] Available options: 10, 25, 50, 100

---

## Empty State Tests

### No Rules
**Setup:** Render with `rules: []`.

**Expected Results:**
- [ ] Text "No processing rules configured yet." is displayed in the rules card
- [ ] "Add rule" button is still visible

### No Runs
**Setup:** Render with `runs: []` on the Run History tab.

**Expected Results:**
- [ ] Text "No processing runs yet." is displayed
- [ ] Pagination still renders showing "0 of 0"

### No Runs Match Filters
**Setup:** Apply filters that match no runs.

**Expected Results:**
- [ ] Text "No runs match the selected filters." is displayed
- [ ] "Clear filters" is available

---

## Component Interaction Tests

### Tab Toggle
**Steps:** Switch between Rules and Run History tabs.

**Expected Results:**
- [ ] Active tab button has dark background
- [ ] "Add rule" button is visible only on Rules tab
- [ ] Tab state is preserved when switching back

### Stat Card Values
**Setup:** Render with specific run data.

**Expected Results:**
- [ ] "Rules" shows `rules.length`
- [ ] "Total Runs" shows `runs.length`
- [ ] "Successful" shows count of runs with `status === 'success'`
- [ ] "Failed" shows count of runs with `status === 'failed'`; uses red color if > 0, zinc otherwise

### Channel Multi-Select in Editor
**Steps:** In the slide-over, click WhatsApp, then Email, then WhatsApp again.

**Expected Results:**
- [ ] First click selects WhatsApp (sky styling)
- [ ] Second click additionally selects Email
- [ ] Third click deselects WhatsApp
- [ ] `formChannelIds` reflects the current selection

### Duration Formatting
**Setup:** Runs with various durations.

**Expected Results:**
- [ ] 45 seconds: "45s"
- [ ] 90 seconds: "1m 30s"
- [ ] 120 seconds: "2m"
- [ ] 3723 seconds: "62m 3s"

---

## Edge Cases

### Rule with No Last Run
**Setup:** Rule with `lastRunAt: null` and `lastRunStatus: null`.

**Expected Results:**
- [ ] No "Last run" text is displayed
- [ ] No status badge next to the rule name

### Many Channel Chips on a Rule
**Setup:** Rule with all 4 channels selected.

**Expected Results:**
- [ ] All 4 channel chips wrap gracefully in the rule row

### Pagination with Filter Changes
**Setup:** Be on page 3, then apply a filter that reduces results to fewer than 30.

**Expected Results:**
- [ ] Page resets to page 0 (or the last available page)
- [ ] No "page out of bounds" error

### Slide-Over and Delete Simultaneously
**Setup:** Open the slide-over for editing, then try to delete a different rule.

**Expected Results:**
- [ ] Both actions should be independent -- slide-over stays open while delete confirmation appears in the rule list

---

## Accessibility Checks

- [ ] Tab toggle buttons (Rules / Run History) are keyboard accessible
- [ ] "Add rule" button is keyboard accessible
- [ ] Toggle switches for enabling/disabling rules are `<button>` elements
- [ ] Action buttons (Run now, Edit, Delete) have `title` attributes
- [ ] Slide-over: overlay click closes; X button is keyboard accessible; all form fields are focusable
- [ ] Channel selection buttons and action buttons in slide-over are keyboard accessible
- [ ] "Create rule" / "Save changes" buttons have disabled state for incomplete forms
- [ ] Run history rows are `<button>` elements (clickable to expand)
- [ ] Pagination controls: Prev/Next buttons have disabled states
- [ ] Filter dropdowns are native `<select>` elements
- [ ] Date inputs are native `<input type="date">` elements

---

## Sample Test Data

```typescript
import type { ProcessingRule, ProcessingRun, ProcessingProps, RuleFormData } from './types'

const mockRules: ProcessingRule[] = [
  {
    id: 'rule1',
    name: 'Task Extraction — All Channels',
    description: 'Extract tasks from all connected channels every 6 hours',
    schedule: 'every 6 hours',
    channelIds: ['ch_whatsapp', 'ch_email', 'ch_google_meet'],
    channelNames: ['WhatsApp', 'Email', 'Google Meet'],
    prompt: 'Extract actionable tasks from the messages. Identify assignees, deadlines, and priority levels.',
    action: 'extract_tasks',
    enabled: true,
    lastRunAt: new Date(Date.now() - 3600000).toISOString(),
    lastRunStatus: 'success',
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'rule2',
    name: 'Profile Enrichment',
    description: 'Update person profiles based on conversation context',
    schedule: 'daily at 02:00',
    channelIds: ['ch_whatsapp'],
    channelNames: ['WhatsApp'],
    prompt: 'Analyze messages to identify roles, responsibilities, and relationships between people.',
    action: 'update_profiles',
    enabled: true,
    lastRunAt: new Date(Date.now() - 86400000).toISOString(),
    lastRunStatus: 'partial',
    createdAt: '2026-01-20T10:00:00Z',
  },
  {
    id: 'rule3',
    name: 'Webhook Data Processing',
    description: 'Process incoming webhook payloads',
    schedule: 'every 1 hour',
    channelIds: ['ch_webhook'],
    channelNames: ['Webhook'],
    prompt: 'Parse webhook payloads and extract task data.',
    action: 'both',
    enabled: false,
    lastRunAt: null,
    lastRunStatus: null,
    createdAt: '2026-02-01T10:00:00Z',
  },
]

const mockRuns: ProcessingRun[] = [
  {
    id: 'run1',
    ruleId: 'rule1',
    ruleName: 'Task Extraction — All Channels',
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    duration: 127,
    status: 'success',
    messagesProcessed: 48,
    tasksExtracted: 7,
    identitiesResolved: 2,
    profilesUpdated: 0,
    errors: [],
  },
  {
    id: 'run2',
    ruleId: 'rule2',
    ruleName: 'Profile Enrichment',
    startedAt: new Date(Date.now() - 86400000).toISOString(),
    duration: 245,
    status: 'partial',
    messagesProcessed: 120,
    tasksExtracted: 0,
    identitiesResolved: 5,
    profilesUpdated: 3,
    errors: [
      { message: 'Rate limit exceeded for OpenAI API', context: 'Processing batch 3 of 5' },
    ],
  },
  {
    id: 'run3',
    ruleId: 'rule1',
    ruleName: 'Task Extraction — All Channels',
    startedAt: new Date(Date.now() - 172800000).toISOString(),
    duration: 15,
    status: 'failed',
    messagesProcessed: 0,
    tasksExtracted: 0,
    identitiesResolved: 0,
    profilesUpdated: 0,
    errors: [
      { message: 'WhatsApp API connection refused', context: 'Fetching messages from Operations Group' },
      { message: 'Email IMAP authentication failed', context: 'Connecting to project@company.com' },
    ],
  },
]

const mockProcessingProps: ProcessingProps = {
  rules: mockRules,
  runs: mockRuns,
  onCreateRule: vi.fn(),
  onEditRule: vi.fn(),
  onDeleteRule: vi.fn(),
  onToggleRule: vi.fn(),
  onRunNow: vi.fn(),
}
```
