# Milestone 6: Processing

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

Implement the Processing section — rule-based configuration and run history for the AI processing pipeline.

## Overview

The Processing section lets users define processing rules that combine a trigger schedule, source channels, an AI prompt, and a target action. It shows a rules table with quick actions and a global run history with detailed stats and error tracking.

**Key Functionality:**
- View processing rules in a table with schedule, channels, action, status
- Enable/disable rules via inline toggle
- Trigger manual "Run now" on any rule
- Create and edit rules via slide-over panel
- Delete rules with confirmation
- View global run history with stats and status
- Expand run rows to see detailed stats and errors
- Filter run history by rule or status

## Components Provided

Copy from `product-plan/sections/processing/components/`:

- `ProcessingView` — Complete processing page with rules table, run history, and slide-over editor

## Props Reference

**Data props:**
- `rules: ProcessingRule[]` — Configured processing rules
- `runs: ProcessingRun[]` — Historical processing run records

**Callback props:**

| Callback | Triggered When |
|----------|---------------|
| `onCreateRule(data)` | User submits the create rule form |
| `onEditRule(ruleId, data)` | User saves edits to a rule |
| `onDeleteRule(ruleId)` | User confirms rule deletion |
| `onToggleRule(ruleId, enabled)` | User toggles a rule on/off |
| `onRunNow(ruleId)` | User clicks "Run now" |

## Expected User Flows

### Flow 1: Create a Processing Rule

1. User clicks "Add Rule" button
2. Slide-over opens with empty form
3. User fills in: name, schedule, selects channels, writes AI prompt, chooses action
4. User clicks "Save"
5. **Outcome:** New rule appears in the rules table

### Flow 2: Trigger Manual Run

1. User finds a rule in the table
2. User clicks the "Run now" button on that rule
3. **Outcome:** `onRunNow` callback fires, run appears in history after completion

### Flow 3: Investigate a Failed Run

1. User sees a run with "Failed" status in the run history
2. User clicks the run row to expand it
3. Detailed stats and error messages are visible
4. **Outcome:** User understands what went wrong

### Flow 4: Disable a Rule

1. User toggles the enabled switch on a rule
2. Rule becomes disabled (visually de-emphasized)
3. **Outcome:** Rule will not run on its schedule until re-enabled

## Empty States

- **No rules:** Shows empty state encouraging user to create their first rule
- **No run history:** Shows message that no runs have been executed yet

## Testing

See `product-plan/sections/processing/tests.md` for UI behavior test specs.

## Files to Reference

- `product-plan/sections/processing/README.md` — Feature overview and design intent
- `product-plan/sections/processing/tests.md` — UI behavior test specs
- `product-plan/sections/processing/components/` — React components
- `product-plan/sections/processing/types.ts` — TypeScript interfaces
- `product-plan/sections/processing/sample-data.json` — Test data

## Done When

- [ ] Rules table renders with all columns
- [ ] Enable/disable toggle works inline
- [ ] Run now triggers the callback
- [ ] Create/edit rule slide-over works
- [ ] Delete rule shows confirmation
- [ ] Run history shows stats and status
- [ ] Run rows expand to show details and errors
- [ ] Run history filters work (by rule, by status)
- [ ] Empty states display properly
- [ ] Responsive on mobile
