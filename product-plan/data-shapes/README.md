# UI Data Shapes

These types define the shape of data that the UI components expect to receive as props. They represent the **frontend contract** — what the components need to render correctly.

How you model, store, and fetch this data on the backend is an implementation decision. You may combine, split, or extend these types to fit your architecture.

## Entities

- **DashboardKpi** — A key performance indicator card (used in: dashboard)
- **GoalAlignmentSummary** — Aggregate on-goal/off-goal counts (used in: dashboard)
- **AttentionPerson** — A person needing management attention (used in: dashboard)
- **ActivityEvent** — A recent system event for the activity feed (used in: dashboard)
- **PersonSummary** — Pre-aggregated person with task counts (used in: people, tasks)
- **Task** — An extracted action item assigned to a person (used in: people, tasks)
- **TaskMessage** — A raw message associated with a task (used in: people, tasks)
- **PersonSettingsData** — Editable person identity/role/AI fields (used in: people, tasks)
- **PersonReference** — A person mentioned in a message (used in: people, tasks)
- **ChatMessage** — A message in the LLM chat conversation (used in: tasks)
- **SourceSummary** — Minimal source info for filter dropdowns (used in: tasks)
- **Channel** — A supported data ingestion channel (used in: sources)
- **Connection** — A configured connection within a channel (used in: sources)
- **ProcessingRule** — A configured processing rule (used in: processing)
- **ProcessingRun** — A record of a pipeline execution (used in: processing)
- **RunError** — An error from a processing run (used in: processing)
- **RuleFormData** — Data for creating/editing a rule (used in: processing)
- **ApiKey** — A configured API key for an external service (used in: settings)
- **SmtpSettings** — SMTP email configuration (used in: settings)
- **SystemUser** — A system user account with RBAC (used in: settings)
- **UserFormData** — Data for creating/editing a user (used in: settings)

## Per-Section Types

Each section includes its own `types.ts` with the full interface definitions:

- `sections/dashboard/types.ts`
- `sections/people/types.ts`
- `sections/tasks/types.ts`
- `sections/sources/types.ts`
- `sections/processing/types.ts`
- `sections/settings/types.ts`

## Combined Reference

See `overview.ts` for all entity types aggregated in one file.
