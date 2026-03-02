# Watchdog Backend Development Roadmap

## Overview

This document serves as a phased development guideline for building the Watchdog backend — an AI-driven project risk intelligence platform that operates via WhatsApp group messages. The backend will transform unstructured WhatsApp conversations into structured project insights including task detection, risk identification, and automated reporting.

## Current State

**Backend:**
- Framework: Express + TypeScript + Drizzle ORM
- Status: Phase 4 implementation is in place — AI processing pipeline (queue + task extraction + risk detection), reporting/outbound jobs, and real dashboard queries are wired
- Database: Phase 1 schema completed (10 core tables with Drizzle migrations); Phase 2-4 tables (`connections`, `messages`, `processing_*`, `tasks`, `risks`, `reports`) are used by live backend flows

**Frontend:**
- Framework: React + React Router + Tailwind CSS
- Status: 9 pages are wired (`/login` + 8 app pages) and `apiFetch` now attaches bearer auth token
- Pages: Login, Dashboard, People, PersonDetail, Tasks, Sources, Processing, Settings, Health

**Missing Components:**
- Rule scheduler UX/validation improvements (cron builder, validation)
- Full RBAC rollout and permission-aware frontend routing (Phase 6 hardening)

---

## System Architecture

```mermaid
flowchart TD
    WA[WhatsApp Group] -->|webhook| Fonnte[Fonnte API]
    Fonnte -->|POST /webhooks/fonnte/receive| WebhookHandler
    WebhookHandler -->|validate + store| MessagesTable[(messages)]
    WebhookHandler -->|enqueue| Queue[pg-boss Queue]
    Queue -->|batch window 3min/30msg| TaskWorker[Task Extractor]
    Queue -->|after extraction| RiskEngine[Risk Engine]
    TaskWorker -->|Kimi K2 structured output| TasksTable[(tasks)]
    RiskEngine -->|rule-based + Kimi K2| RisksTable[(risks)]
    CronTick[Per-Minute Queue Tick] -->|match connection report_time| ReportWorker[Report Generator]
    ReportWorker -->|Kimi K2 narrative| ReportsTable[(reports)]
    ReportWorker -->|send summary| FonnteOutbound[Fonnte Send API]
    FonnteOutbound --> WA
    Frontend[React Frontend] -->|REST API| ExpressRoutes[Express Routes]
    ExpressRoutes --> DB[(PostgreSQL)]
```

---

## Key Design Decisions

### Batch Window Strategy
**Decision:** Idle timeout of 3 minutes since last message per group, with a hard cap at 30 messages — whichever fires first.

**Rationale:** WhatsApp conversations cluster naturally in bursts followed by quiet periods. An idle timeout aligns processing triggers with natural conversation pauses, avoiding mid-flow interruptions while preventing indefinite delays in active groups.

**Implementation:** Debounced pg-boss delayed jobs — each incoming message reschedules a 3-minute delayed job; when 30 messages accumulate, force-flush immediately.

### LLM Selection
**Decision:** Kimi K2 via OpenAI-compatible SDK

**Configuration:**
- Base URL: `https://api.moonshot.cn/v1`
- API Key: `MOONSHOT_API_KEY`
- Model: `moonshot-v1-32k` or `moonshot-v1-128k`

**Usage:**
- Stage 1 (Task Extraction): Structured output with Zod schema
- Stage 2 (Risk Detection): Rule-based + LLM-augmented analysis
- Stage 3 (Report Generation): Narrative summarization

### Queue System
**Decision:** pg-boss (PostgreSQL-backed job queue)

**Rationale:** Leverages existing PostgreSQL infrastructure without introducing Redis. Provides job persistence, retries, and scheduling capabilities suitable for MVP scale.

### Daily Reports
**Decision:** Automatic via pg-boss cron job

**Implementation:** Configurable report time per connection (`report_time` field). Default: 18:00 local time. Report includes tasks created/resolved, active risks, message volume, and AI-generated narrative summary. Automatically sent to WhatsApp group via Fonnte.

### WhatsApp Group Registration
**Decision:** Manual registration via Sources UI

**Process:**
1. User navigates to Sources page
2. Clicks "Add Connection" for WhatsApp channel
3. Enters label (e.g., "Project Alpha Group")
4. Enters identifier: Fonnte group ID (e.g., `6281234567890-1609459200@g.us`)
5. Group ID obtained from Fonnte dashboard → Device → Groups

**Future Enhancement:** "Test Connection" button that sends confirmation message to group for immediate feedback.

---

## Development Phases

### Phase 1 — Foundation: Database Schema & Environment

**Goal:** Establish complete database schema and environment configuration. All subsequent phases depend on this foundation.

**Status:** Implemented
- Schema files are present under `packages/backend/src/db/schema/`
- Migration generated: `packages/backend/src/db/migrations/0000_lowly_quasar.sql`
- Seeding script added: `packages/backend/src/db/seed.ts`

**Frontend Pages Affected:** None (infrastructure only)

#### Database Schema Files

Create under `packages/backend/src/db/schema/`:

**1. projects.ts**
```typescript
{
  id: serial (PK)
  name: text
  health_score: integer (0-100)
  created_at: timestamp
  updated_at: timestamp
}
```

**2. connections.ts**
```typescript
{
  id: serial (PK)
  project_id: integer (FK → projects.id)
  channel_type: text ('whatsapp' | 'email' | 'google_meet' | 'webhook')
  label: text
  identifier: text (Fonnte group ID: xxx@g.us)
  status: text ('active' | 'paused' | 'error')
  last_sync_at: timestamp
  messages_processed: integer
  error: text (nullable)
  report_time: text (HH:MM format, default: '18:00')
  created_at: timestamp
}
```

**3. messages.ts**
```typescript
{
  id: serial (PK)
  connection_id: integer (FK → connections.id)
  project_id: integer (FK → projects.id)
  sender: text (WhatsApp number)
  push_name: text (sender display name)
  message_text: text
  message_hash: text (sha256 for deduplication)
  is_group: boolean
  fonnte_date: timestamp
  processed: boolean (default: false)
  created_at: timestamp
}
```

**4. tasks.ts** (replace existing)
```typescript
{
  id: serial (PK)
  project_id: integer (FK → projects.id)
  message_id: integer (FK → messages.id, nullable)
  description: text
  owner: text (assignee name)
  deadline: timestamp (nullable)
  status: text ('open' | 'done' | 'blocked')
  confidence: real (0.0-1.0, AI confidence score)
  created_at: timestamp
  updated_at: timestamp
}
```

**5. risks.ts**
```typescript
{
  id: serial (PK)
  project_id: integer (FK → projects.id)
  type: text ('deadline' | 'stagnation' | 'blockers' | 'sentiment')
  severity: text ('low' | 'medium' | 'high' | 'critical')
  explanation: text
  recommendation: text
  created_at: timestamp
  resolved_at: timestamp (nullable)
}
```

**6. reports.ts**
```typescript
{
  id: serial (PK)
  project_id: integer (FK → projects.id)
  date: date (unique per project)
  narrative: text (AI-generated summary)
  new_tasks: integer
  resolved_tasks: integer
  active_risks: integer
  created_at: timestamp
}
```

**7. processing_rules.ts**
```typescript
{
  id: serial (PK)
  name: text
  description: text
  schedule: text (cron format)
  channel_ids: text[] (connection IDs)
  prompt: text (custom AI prompt)
  action: text ('extract_tasks' | 'update_profiles' | 'both')
  enabled: boolean (default: true)
  created_at: timestamp
}
```

**8. processing_runs.ts**
```typescript
{
  id: serial (PK)
  rule_id: integer (FK → processing_rules.id)
  status: text ('running' | 'success' | 'error')
  started_at: timestamp
  finished_at: timestamp (nullable)
  output: jsonb (nullable)
  error: text (nullable)
}
```

**9. api_keys.ts**
```typescript
{
  id: serial (PK)
  service: text ('openai' | 'fonnte' | 'smtp')
  masked_key: text (last 4 chars visible)
  created_at: timestamp
}
```

**10. users.ts**
```typescript
{
  id: serial (PK)
  name: text
  email: text (unique)
  password_hash: text
  role: text ('admin' | 'manager')
  section_permissions: text[] (page access)
  assigned_people_ids: text[]
  active: boolean (default: true)
  created_at: timestamp
}
```

#### Environment Configuration

**Update `packages/backend/src/config/env.ts`:**
- Add `MOONSHOT_API_KEY` (Kimi K2)
- Add `FONNTE_API_KEY` (outbound messages)
- Add `FONNTE_TOKEN` (webhook validation)
- Add `JWT_SECRET` (authentication)

**Update `.env.example`:**
```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/project_watchdog

# Backend
PORT=3001
NODE_ENV=development

# Frontend
VITE_API_URL=http://localhost:3001

# AI / LLM
MOONSHOT_API_KEY=your_moonshot_api_key_here

# WhatsApp Integration
FONNTE_API_KEY=your_fonnte_api_key_here
FONNTE_TOKEN=your_fonnte_webhook_token_here

# Authentication
JWT_SECRET=your_jwt_secret_here

# Initial admin seeding
SEED_ADMIN_NAME=Watchdog Admin
SEED_ADMIN_EMAIL=admin@watchdog.local
SEED_ADMIN_PASSWORD=change_me_before_seeding
```

#### Migration Commands
```bash
pnpm db:generate  # Generate migration files
pnpm db:migrate   # Apply migrations
pnpm db:seed      # Seed initial admin user
```

---

### Phase 2 — WhatsApp Ingestion & Sources Persistence

**Goal:** Enable real WhatsApp message ingestion via Fonnte webhook and persist source connections to database.

**Status:** Implemented in codebase (deployment validation still required in target environment)

**Frontend Pages Unlocked:** `/sources` (SourcesPage — real DB persistence)

#### New Files

**1. packages/backend/src/webhooks/fonnte.ts**

Webhook endpoint: `POST /webhooks/fonnte/receive`

Responsibilities:
- Validate `FONNTE_TOKEN` via webhook auth middleware (`validateFonnteWebhook`)
- Deduplicate messages via `message_hash` (SHA-256 of `sender + group + date + message`)
- Lookup connection by Fonnte `group` field → retrieve `project_id`
- Insert raw message to `messages` table with `processed: false`
- Return HTTP 200 immediately (Fonnte requirement)
- Asynchronously enqueue batch processing job
- Ignore non-actionable payloads safely (`non-group`, `non-text`, oversized, malformed)
- Keep DB unique constraint on `message_hash` as final dedupe guard under concurrency

Expected Fonnte payload:
```json
{
  "device": "628123456789",
  "message": "ok @john selesaikan desain UI sebelum jumat ya",
  "sender": "628111@s.whatsapp.net",
  "pushname": "Budi",
  "is_group": true,
  "group": "628xxx-1234@g.us",
  "date": 1740000000,
  "type": "text"
}
```

**2. packages/backend/src/services/fonnte.ts**

Outbound message service wrapping Fonnte send API.

Methods:
- `sendMessage(target: string, message: string): Promise<SendMessageResponse>`

HTTP client:
- `POST https://api.fonnte.com/send`
- Headers: `Authorization: ${FONNTE_API_KEY}`
- Body: `{ target: groupId, message: "..." }`
- Input validation: non-empty API key, target, and message
- Error handling: throws on non-2xx or `status: false` responses

**3. packages/backend/src/scripts/fonnte-smoke.ts**

Smoke script for outbound verification:
- `pnpm fonnte:smoke -- "<groupId>@g.us" "Watchdog smoke test"`

#### Updated Files

**packages/backend/src/routes/sources.ts**

Drizzle-backed persistence and validation:

- `GET /api/sources` → Query `connections` table and map to frontend contract (`channels[]`, `connections[]`)
- `POST /api/sources/:channelId/connections` → Insert to `connections` table
- `PUT /api/sources/connections/:connectionId` → Update connection
- `POST /api/sources/connections/:connectionId/pause` → Update status to 'paused'
- `POST /api/sources/connections/:connectionId/resume` → Update status to 'active'
- `POST /api/sources/connections/:connectionId/retry` → Clear error, set status to 'active'
- `DELETE /api/sources/connections/:connectionId` → Delete connection
- Validation hardening:
  - WhatsApp identifier must end with `@g.us`
  - Duplicate `identifier` per channel returns `409`
  - Consistent `404`/`400` handling for invalid IDs and missing records

**packages/backend/src/index.ts**

Register webhook route:
```typescript
import { fonnteWebhookRouter } from "./webhooks/fonnte";
import { validateFonnteWebhook } from "./middleware/webhook-auth";
app.use("/webhooks/fonnte", validateFonnteWebhook, fonnteWebhookRouter);
```

**packages/backend/src/workers/message-processor.ts**

Batch handoff resilience:
- Idle flush remains 3 minutes with hard cap 30 messages
- Timer-triggered flushes now catch/log async errors to avoid unhandled rejections

#### Testing
1. Configure Fonnte webhook URL in dashboard: `https://yourdomain.com/webhooks/fonnte/receive?token=YOUR_TOKEN`
2. Send test message in connected WhatsApp group
3. Verify message appears in `messages` table
4. Check Sources page displays connections from database
5. Run outbound smoke check: `pnpm fonnte:smoke -- "<groupId>@g.us" "Watchdog smoke test"`

---

### Phase 3 — AI Processing Pipeline

**Goal:** Implement asynchronous AI processing pipeline with task extraction and risk detection.

**Frontend Pages Unlocked:** `/processing` (ProcessingPage — real rule execution + job history)

#### New Files

**1. packages/backend/src/queue/index.ts**

pg-boss initialization and configuration:
- Database connection via `DATABASE_URL`
- Job retention policy
- Retry settings
- Worker registration

**2. packages/backend/src/queue/jobs.ts**

Job type definitions:
```typescript
type JobType = 
  | 'PROCESS_BATCH'     // Process message batch for task extraction
  | 'DETECT_RISKS'      // Analyze project for risks
  | 'GENERATE_REPORT';  // Create daily report

interface ProcessBatchJob {
  connectionId: number;
  projectId: number;
  messageIds: number[];
}

interface DetectRisksJob {
  projectId: number;
}

interface GenerateReportJob {
  projectId: number;
  date: string;
}
```

**3. packages/backend/src/services/kimi.ts**

Kimi K2 client using OpenAI-compatible SDK:
```typescript
import OpenAI from "openai";

const kimi = new OpenAI({
  apiKey: process.env.MOONSHOT_API_KEY,
  baseURL: "https://api.moonshot.cn/v1",
});

export { kimi };
```

**4. packages/backend/src/prompts/task-extraction.ts**

System prompt for task extraction:
```typescript
const systemPrompt = `You are an AI project assistant. Analyze WhatsApp group messages and extract actionable tasks. Messages may be in Indonesian, English, or mixed. Output valid JSON only.`;

const responseSchema = z.object({
  tasks: z.array(z.object({
    description: z.string(),
    assignee: z.string().nullable(),
    deadline: z.string().nullable(),
    confidence: z.number().min(0).max(1),
  }))
});
```

**5. packages/backend/src/prompts/risk-detection.ts**

System prompt for risk detection:
```typescript
const systemPrompt = `You are a project risk analyst. Given recent project messages and task status, identify risks. Output JSON only.`;

const responseSchema = z.object({
  risks: z.array(z.object({
    type: z.enum(['deadline', 'stagnation', 'blockers', 'sentiment']),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    explanation: z.string(),
    recommendation: z.string(),
  }))
});
```

**6. packages/backend/src/workers/message-processor.ts**

Batch window manager implementing debounced processing:

Strategy:
- Maintain per-connection message buffer
- On message receipt: add to buffer, schedule delayed job (3 min)
- On new message: reschedule delayed job (reset timer)
- Force flush when buffer reaches 30 messages
- Create `PROCESS_BATCH` job with all buffered message IDs

**7. packages/backend/src/workers/task-extractor.ts**

Consumes `PROCESS_BATCH` jobs:
1. Fetch messages from `messages` table by IDs
2. Format messages with context (project name, existing open tasks)
3. Call Kimi K2 with task extraction prompt
4. Parse structured output (Zod validation)
5. Insert extracted tasks to `tasks` table
6. Mark messages as `processed: true`
7. Enqueue `DETECT_RISKS` job for project

**8. packages/backend/src/workers/risk-engine.ts**

Two-layer risk detection:

**Layer 1 — Rule-based (fast):**
- Deadline risk: Tasks with `deadline < now()` and `status = 'open'`
- Stagnation risk: Tasks with no updates for >24 hours
- Immediate writes to `risks` table

**Layer 2 — LLM-based (rich):**
- Analyze recent messages for keywords: "macet", "blocked", "masalah", "belum selesai"
- Sentiment analysis for morale issues
- Call Kimi K2 with risk detection prompt
- Write soft-signal risks to `risks` table

#### Updated Files

**packages/backend/src/routes/processing.ts**

Replace in-memory data with database queries:

- `GET /api/processing` → Query `processing_rules` + `processing_runs` tables
- `POST /api/processing/rules` → Insert to `processing_rules` table
- `PUT /api/processing/rules/:ruleId` → Update rule
- `DELETE /api/processing/rules/:ruleId` → Delete rule and cascade runs
- `POST /api/processing/rules/:ruleId/toggle` → Update `enabled` field
- `POST /api/processing/rules/:ruleId/run` → Create `processing_run` record, enqueue custom job via pg-boss

Contract notes:
- `processing_rules.channel_ids` should use channel type values (`whatsapp`, `google_meet`, `email`, `webhook`)
- Processing run statuses should be represented as `running` | `success` | `error`

#### Package Dependencies

Add to `packages/backend/package.json`:
```json
{
  "dependencies": {
    "pg-boss": "^10.1.5",
    "openai": "^4.80.0"
  }
}
```

#### Testing
1. Send message batch to WhatsApp group
2. Verify batch job created after 3 minutes or 30 messages
3. Check `tasks` table for extracted tasks
4. Verify `risks` table populated with detected risks
5. Review Processing page for rule execution history

---

### Phase 4 — Reporting & Outbound

**Goal:** Implement automated daily report generation and WhatsApp notification delivery.

**Frontend Pages Unlocked:** `/dashboard` (real KPIs, activity feed)

#### New Files

**1. packages/backend/src/prompts/report-generation.ts**

System prompt for narrative generation:
```typescript
const systemPrompt = `You are a project reporting assistant. Generate a concise daily summary in narrative form. Use natural language suitable for WhatsApp delivery.`;

const responseSchema = z.object({
  narrative: z.string(),
  highlights: z.array(z.string()),
  concerns: z.array(z.string()),
});
```

**2. packages/backend/src/workers/report-generator.ts**

Scheduled pg-boss cron job worker:

Schedule: Configurable per connection via `report_time` field (default: daily at 18:00)

Process:
1. Query connections with `status = 'active'` and matching report time
2. For each connection:
   - Aggregate today's stats: new tasks, resolved tasks, active risks, message count
   - Fetch recent messages for context
   - Call Kimi K2 with report generation prompt
   - Insert report to `reports` table
   - Format narrative for WhatsApp (emoji + line breaks)
   - Call `fonnte.sendMessage(groupId, formattedReport)`

Report format example:
```
📊 *Daily Report — Project Alpha*
📅 February 26, 2026

✅ *Tasks Completed:* 5
📋 *New Tasks:* 3
⚠️ *Active Risks:* 2 (1 high, 1 medium)
💬 *Messages Processed:* 47

*Summary:*
Team made good progress on UI design. API testing completed ahead of schedule. Risk alert: deployment to staging is blocked due to environment config issues. Recommendation: prioritize DevOps support tomorrow morning.

---
Generated by Watchdog 🐕
```

**3. packages/backend/src/routes/reports.ts**

New route file:
- `GET /api/reports` → List all reports with pagination
- `GET /api/reports/:date` → Get report for specific date (across all projects or filtered)

#### Updated Files

**packages/backend/src/routes/dashboard.ts**

Replace sample-data with real database queries:

**KPIs:**
```typescript
{
  activeTasks: count(tasks WHERE status = 'open'),
  overdueTasks: count(tasks WHERE deadline < now() AND status = 'open'),
  activeRisks: count(risks WHERE resolved_at IS NULL),
  completionRate: (count(tasks WHERE status = 'done') / count(tasks)) * 100
}
```

**Goal Alignment:**
Query `projects` table with aggregated health scores

**Attention People:**
Derive from `tasks` grouped by `owner`, annotate with overdue count and risk severity

**Activity Feed:**
Union query:
- Recent tasks created (`tasks.created_at`)
- Recent risks detected (`risks.created_at`)
- Recent messages received (`messages.created_at`)

Order by timestamp DESC, limit 50

**packages/backend/src/index.ts**

Register reports route:
```typescript
import { reportsRouter } from "./routes/reports";
app.use("/api/reports", reportsRouter);
```

#### Testing
1. Manually trigger report generation: `POST /api/processing/rules/:ruleId/run` with cron-based rule
2. Verify report written to `reports` table
3. Check WhatsApp group receives formatted report
4. Visit Dashboard page — verify KPIs display real data
5. Test activity feed shows mixed events (tasks/risks/messages/processing runs)

---

### Phase 5 — Full Frontend Wiring

**Goal:** Replace all remaining mock data with real database queries across all routes.

**Frontend Pages Unlocked:** `/people`, `/people/:id`, `/tasks`, `/health`

#### Updated Files

**1. packages/backend/src/routes/people.ts**

**Data Strategy:** Derive people from unique `tasks.owner` values (dynamic people list based on task assignments)

- `GET /api/people` → Query tasks grouped by `owner`, aggregate:
  - `id`: stable encoded owner identifier (`encodeURIComponent(owner.toLowerCase())`)
  - `name`: owner name
  - `role`: Inferred from task types or default "Team Member"
  - `openTaskCount`: count(tasks WHERE owner = X AND status = 'open')
  - `riskLevel`: max(risks.severity) for tasks owned by X
  - `lastActiveAt`: max(tasks.updated_at) for owner X
  - Return with associated tasks and messages

- `GET /api/people/:id` → Query single person's full profile:
  - Person summary (id = owner name)
  - All tasks WHERE owner = :id
  - All messages WHERE message mentions @:id
  - `averageTaskCount`: avg(task count) across all people for comparison

- `PUT /api/people/:personId/settings` → Upsert person preferences in `people_settings` table

**2. packages/backend/src/routes/tasks.ts**

Replace empty arrays with full Drizzle queries:

- `GET /api/tasks` → Query `tasks` table with joins:
  ```sql
  SELECT tasks.*, 
         projects.name as project_name,
         connections.label as source_label
  FROM tasks
  LEFT JOIN projects ON tasks.project_id = projects.id
  LEFT JOIN messages ON tasks.message_id = messages.id
  LEFT JOIN connections ON messages.connection_id = connections.id
  ORDER BY tasks.created_at DESC
  ```

- Include related data:
  - `people`: Derived from distinct `tasks.owner`
  - `sources`: Query `connections` table
  - `messages`: Query `messages` table filtered by task `message_id`
  - `chatMessages`: For AI chat interface (future: implement RAG query on message history)

**3. packages/backend/src/routes/settings.ts**

Wire to database tables:

- `GET /api/settings`:
  - `apiKeys`: Query `api_keys` table (return masked keys only)
  - `smtpSettings`: Query `smtp_settings` table or env vars
  - `users`: Query `users` table
  - `availableSections`: Static array of page routes
  - `availablePeople`: Derived from distinct `tasks.owner`

- `POST /api/settings/api-keys`:
  - Encrypt actual key with AES-GCM
  - Store only last 4 chars in `masked_key`
  - Insert encrypted payload (`encrypted_key`, `iv`, `auth_tag`) to `api_keys` table

- `DELETE /api/settings/api-keys/:keyId`:
  - Delete from `api_keys` table

- `PUT /api/settings/smtp`:
  - Create `smtp_settings` table if not exists
  - Upsert SMTP configuration

- `POST /api/settings/smtp/test`:
  - Attempt SMTP connection with nodemailer
  - Return success/error

- `POST /api/settings/users`, `PUT /api/settings/users/:userId`:
  - Hash password with bcrypt
  - Insert/update `users` table

- `POST /api/settings/users/:userId/deactivate`, `reactivate`:
  - Update `active` field in `users` table

**4. packages/backend/src/routes/health.ts**

Extend health check with system metrics:

```typescript
{
  status: "healthy" | "degraded" | "error",
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
  database: {
    status: "connected" | "disconnected",
    latency: <ping time in ms>
  },
  queue: {
    depth: <pg-boss queue length>,
    failedJobs: <count of failed jobs in last 24h>
  },
  webhook: {
    lastReceivedAt: <timestamp of most recent message>,
    messagesProcessed: <total count from messages table>
  },
  ai: {
    lastJobStatus: "success" | "error",
    lastJobCompletedAt: <timestamp>
  }
}
```

Query `processing_runs` table for AI job status.

#### Additional Schema (if needed)

**smtp_settings table:**
```typescript
{
  id: serial (PK)
  host: text
  port: integer
  username: text
  password: text (encrypted)
  from_address: text
  encryption: text ('none' | 'ssl' | 'starttls')
  updated_at: timestamp
}
```

**people_settings table:**
```typescript
{
  id: serial (PK)
  person_id: text (unique, stable encoded owner id)
  name: text
  aliases: text[]
  email: text
  phone: text
  role_name: text
  role_description: text
  priorities: text
  custom_prompt: text
  updated_at: timestamp
  created_at: timestamp
}
```

#### Testing
1. Visit `/people` — verify people list derived from task owners
2. Click person detail — verify task history and metrics
3. Visit `/tasks` — verify tasks display with project and source context
4. Visit `/settings` — verify API keys stored securely (masked)
5. Visit `/health` — verify all metrics display real data
6. Add/edit user via Settings — verify password hashed in DB

---

### Phase 6 — Authentication & Security Hardening

**Goal:** Implement JWT authentication, role-based access control, and security hardening.

**Frontend Pages Unlocked:** `/settings` (real user management with RBAC)

#### New Files

**1. packages/backend/src/middleware/auth.ts**

JWT authentication middleware:
```typescript
import jwt from "jsonwebtoken";

interface JwtPayload {
  userId: number;
  email: string;
  role: 'admin' | 'regular';
}

export const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireRole = (role: 'admin' | 'regular') => {
  return (req, res, next) => {
    if (req.user.role !== role && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};
```

**2. packages/backend/src/routes/auth.ts**

Authentication routes:
- `POST /api/auth/login` — Verify email/password, return JWT
  - Query `users` table by email
  - Compare hashed password with bcrypt
  - Generate JWT with 7-day expiration
  - Return: `{ token, user: { id, name, email, role } }`

- `POST /api/auth/register` — Create new user (admin-only or first user)
- `POST /api/auth/refresh` — Refresh JWT before expiration
- `GET /api/auth/me` — Get current user profile

**3. packages/backend/src/middleware/webhook-auth.ts**

Fonnte webhook authentication middleware:
```typescript
export const validateFonnteWebhook = (req, res, next) => {
  const token = req.query.token || req.headers['x-fonnte-token'];
  
  if (token !== process.env.FONNTE_TOKEN) {
    console.warn('[SECURITY] Invalid Fonnte webhook token attempt');
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  next();
};
```

**4. packages/backend/src/middleware/request-logger.ts**

Request logging for audit trail:
```typescript
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      user: req.user?.email || 'anonymous',
      ip: req.ip,
      timestamp: new Date().toISOString(),
    });
  });
  
  next();
};
```

#### Updated Files

**packages/backend/src/index.ts**

Apply authentication middleware:
```typescript
import { authenticate, requireRole } from "./middleware/auth";
import { requestLogger } from "./middleware/request-logger";
import { authRouter } from "./routes/auth";

// Public routes
app.use("/api/auth", authRouter);
app.use("/api/health", healthRouter);

// Webhook routes (separate auth)
app.use("/webhooks/fonnte", validateFonnteWebhook, fonnteWebhookRouter);

// Request logging (after auth)
app.use(requestLogger);

// Protected routes
app.use("/api/dashboard", authenticate, dashboardRouter);
app.use("/api/people", authenticate, peopleRouter);
app.use("/api/tasks", authenticate, tasksRouter);
app.use("/api/sources", authenticate, sourcesRouter);
app.use("/api/processing", authenticate, processingRouter);
app.use("/api/reports", authenticate, reportsRouter);

// Admin-only routes
app.use("/api/settings", authenticate, requireRole('admin'), settingsRouter);
```

**packages/backend/src/routes/settings.ts**

Update API key storage to runtime lookup:
- Store Fonnte API key in `api_keys` table
- Update `fonnte.ts` service to query `api_keys` table instead of env var
- Keep `FONNTE_TOKEN` in env (webhook validation only)

**packages/backend/src/webhooks/fonnte.ts**

Add security measures:
- Request logging via middleware
- Rate limiting per group (prevent spam attacks)
- Message size validation (reject >4KB messages)
- Group whitelist check (only process registered connection groups)

#### RBAC Matrix

| Route | Admin | Regular | Guest |
|-------|-------|---------|-------|
| `/api/auth/*` | ✅ | ✅ | ✅ |
| `/api/health` | ✅ | ✅ | ✅ |
| `/api/dashboard` | ✅ | ✅ (section-permission) | ❌ |
| `/api/people` | ✅ | ✅ (section + assigned-people scope) | ❌ |
| `/api/tasks` | ✅ | ✅ (section + assigned-people scope) | ❌ |
| `/api/sources` | ✅ | ✅ (section-permission) | ❌ |
| `/api/processing` | ✅ | ✅ (section-permission) | ❌ |
| `/api/reports` | ✅ | ✅ (section-permission) | ❌ |
| `/api/settings` | ✅ | ❌ | ❌ |
| `/webhooks/*` | Public (token-auth) | Public (token-auth) | Public (token-auth) |

#### Package Dependencies

Add to `packages/backend/package.json`:
```json
{
  "dependencies": {
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1"
  },
  "devDependencies": {
    "@types/jsonwebtoken": "^9.0.7",
    "@types/bcrypt": "^5.0.2"
  }
}
```

#### Testing
1. `POST /api/auth/login` with valid credentials → receive JWT
2. Call protected endpoint without token → 401 Unauthorized
3. Call protected endpoint with valid token → 200 OK
4. Regular user attempts to access `/api/settings` → 403 Forbidden
5. Admin user accesses all routes → 200 OK
6. Send webhook with invalid token → 401 Unauthorized
7. Send webhook with valid token → 200 OK, message processed

---

## Frontend Integration Summary

### API Endpoints Mapped to Frontend Pages

| Frontend Page | Backend Routes | Phase Unlocked |
|--------------|----------------|----------------|
| `/dashboard` | `GET /api/dashboard` | Phase 4 |
| `/people` | `GET /api/people` | Phase 5 |
| `/people/:id` | `GET /api/people/:id`, `PUT /api/people/:id/settings` | Phase 5 |
| `/tasks` | `GET /api/tasks` | Phase 5 |
| `/sources` | `GET /api/sources`, `POST /api/sources/:channelId/connections`, `PUT/DELETE /api/sources/connections/:id` | Phase 2 |
| `/processing` | `GET /api/processing`, `POST /api/processing/rules`, `PUT/DELETE /api/processing/rules/:id`, `POST /api/processing/rules/:id/toggle`, `POST /api/processing/rules/:id/run` | Phase 3 |
| `/settings` | `GET /api/settings`, `POST/DELETE /api/settings/api-keys`, `PUT /api/settings/smtp`, `POST/PUT /api/settings/users/:id` | Phase 5, Phase 6 (full RBAC) |
| `/health` | `GET /api/health` | Phase 5 |

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant DB
    
    User->>Frontend: Enter email/password
    Frontend->>Backend: POST /api/auth/login
    Backend->>DB: Query users table
    DB-->>Backend: User record
    Backend->>Backend: Verify password hash
    Backend->>Backend: Generate JWT
    Backend-->>Frontend: { token, user }
    Frontend->>Frontend: Store token in localStorage
    Frontend->>Backend: GET /api/dashboard (Authorization: Bearer <token>)
    Backend->>Backend: Verify JWT
    Backend->>DB: Query dashboard data
    DB-->>Backend: Aggregated data
    Backend-->>Frontend: Dashboard response
    Frontend->>User: Display dashboard
```

---

## Migration & Deployment Checklist

### Pre-deployment
- [ ] Run `pnpm predeploy` for local preflight validation
- [ ] Database migrations generated and tested
- [ ] All environment variables documented
- [ ] Fonnte webhook URL configured in dashboard
- [ ] Test WhatsApp group created and connected
- [ ] Kimi K2 API key obtained and validated
- [ ] PostgreSQL connection string verified
- [ ] JWT secret generated (min 32 chars)
- [ ] Encryption key generated (min 32 chars)

### Phase 1 Deployment
- [x] Run `pnpm db:generate` to create migrations
- [x] Run `pnpm db:migrate` to apply schema
- [x] Verify all tables exist in PostgreSQL
- [x] Seed initial admin user via SQL or seed script (`pnpm db:seed`)

### Phase 2 Deployment
- [x] Configure Fonnte webhook URL with token parameter
- [ ] Send test message to verify webhook receipt (environment-specific)
- [ ] Check `messages` table populated (environment-specific)
- [x] Test Sources UI connection CRUD operations
- [x] Add outbound smoke script (`pnpm fonnte:smoke`)

### Phase 3 Deployment
- [x] Install pg-boss and OpenAI SDK dependencies
- [x] Start pg-boss workers on server startup (`message-processor`, `processing-runner`, `task-extractor`, `risk-engine`)
- [x] Wire manual run endpoint to enqueue real processing jobs (`RUN_PROCESSING_RULE`)
- [x] Align Processing API/UI contracts (run status + channel IDs) and expose real run history ordering
- [x] Keep webhook batch handoff active (3-minute idle / 30-message cap) into `PROCESS_BATCH`

### Phase 4 Deployment
- [x] Switch report scheduling to per-minute tick + per-connection `report_time` matching
- [x] Enqueue `GENERATE_REPORT` with project-scoped due connection IDs
- [x] Persist generated reports and send outbound WhatsApp summaries via Fonnte
- [x] Replace dashboard placeholders with DB-backed KPIs and mixed activity feed payload

### Phase 5 Deployment
- [x] Verify all frontend pages load real data
- [x] Test People page with derived people list
- [x] Test task filtering and search
- [x] Verify Health page shows system metrics

### Phase 6 Deployment
- [x] Generate JWT secret: `openssl rand -base64 32`
- [x] Add authentication middleware to all routes
- [x] Create initial admin user
- [x] Test login flow from frontend
- [x] Verify RBAC: admin vs regular access
- [x] Test API key management in Settings
- [x] Enable encrypted API key storage with runtime lookup for Fonnte

---

## Monitoring & Observability

### Key Metrics to Track

**Webhook Health:**
- Message receipt rate (messages/hour)
- Webhook response time (< 200ms target)
- Failed webhook attempts (invalid token)

**AI Processing:**
- Batch processing latency (time from last message to task extraction)
- Task extraction accuracy (confidence scores)
- LLM API error rate
- Token usage per day

**Queue Performance:**
- Job queue depth
- Job completion rate
- Failed job retry count
- Average job duration by type

**Database:**
- Connection pool utilization
- Query performance (slow queries > 100ms)
- Table sizes (growth trends)

### Logging Strategy

**Structured Logging:**
```typescript
{
  level: 'info' | 'warn' | 'error',
  timestamp: ISO8601,
  service: 'webhook' | 'worker' | 'api',
  event: 'message_received' | 'task_extracted' | 'risk_detected',
  metadata: { projectId, connectionId, userId, duration, ... }
}
```

**Error Tracking:**
- Webhook validation failures → Alert ops team
- LLM API errors → Retry with exponential backoff
- Database connection errors → Circuit breaker pattern
- Job failures → Store in `processing_runs` with error details

---

## Future Enhancements (Post-MVP)

### Phase 7 — Advanced Features
- **Multi-project task dependencies**: Track cross-project blockers
- **Sentiment analysis dashboard**: Team morale trends over time
- **Predictive deadline estimation**: ML model based on historical task completion
- **Voice message transcription**: Integrate speech-to-text for voice notes
- **MCP bridge support**: Enable external tool integrations

### Phase 8 — Scale & Performance
- **Read replicas**: Separate PostgreSQL read/write workloads
- **Redis caching**: Cache dashboard KPIs and frequent queries
- **Horizontal scaling**: Load balancer + multiple backend instances
- **CDN integration**: Serve frontend static assets via CDN
- **Message history retention**: Archive old messages to cold storage

### Phase 9 — Enterprise Features
- **SSO integration**: SAML/OAuth for enterprise auth
- **Custom webhooks**: Allow users to push events to external systems
- **Advanced reporting**: PDF export, scheduled email reports
- **Audit logging**: Compliance-grade activity tracking
- **Multi-tenancy**: Isolate data per organization

---

## Conclusion

This roadmap provides a structured, phased approach to building the Watchdog backend from foundation to production-ready system. Each phase unlocks specific frontend functionality while building upon previous phases' infrastructure.

**Recommended Development Order:**
1. Complete Phase 1 in full (cannot proceed without schema)
2. Implement Phase 2 to validate webhook ingestion
3. Build Phase 3 for core AI functionality
4. Add Phase 4 for reporting and dashboard
5. Complete Phase 5 to activate all pages
6. Harden with Phase 6 for production deployment

**Estimated Timeline:**
- Phase 1: 2-3 days
- Phase 2: 3-4 days
- Phase 3: 5-7 days
- Phase 4: 3-4 days
- Phase 5: 4-5 days
- Phase 6: 3-4 days

**Total: 20-27 days for full backend implementation**

For questions or clarification on any phase, refer to the PRD at `/Users/yanuar/Documents/project-watchdog/PRD.md` or the frontend exploration outputs.
