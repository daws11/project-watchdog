# Project Watchdog - Architecture Documentation

This document provides detailed technical architecture information for developers working on Project Watchdog.

## System Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PROJECT WATCHDOG                                │
└─────────────────────────────────────────────────────────────────────────────┘

  WhatsApp Group
       │                      ┌──────────────────────────────────┐
       │ Inbound messages       │                                  │
       ▼                        │  Outbound (durable outbox)         │
┌─────────────────────┐        │  • send_message commands           │
│   whatsapp-web.js   │        │  • Retry with backoff (1s,2s,4s..) │
│   (wa-ingestor)     │────────┤  • Max 5 attempts                  │
│                     │        │                                  │
│ • Inbound ingest    │        └──────────────────────────────────┘
│ • Outbound send     │
│ • Session mgmt      │
└─────────────────────┘
           │
           ▼
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   Ingestion API     │────▶│   Processing Layer  │────▶│    Storage Layer    │
│                     │     │                     │     │                     │
│ • POST /ingest      │     │ • Batch Processing  │     │ • PostgreSQL        │
│ • GET /commands     │     │ • Task Extraction   │     │ • Drizzle ORM       │
│ • POST /ack         │     │ • Risk Detection    │     │ • pg-boss Queue     │
└─────────────────────┘     │ • Report Generation │     └─────────────────────┘
                            └─────────────────────┘              │
                                                                  │
                                         ┌───────────────────────┘
                                         ▼
                            ┌─────────────────────┐
                            │    Output Layer     │
                            │                     │
                            │ • Dashboard API     │
                            │ • WhatsApp Reports  │
                            │ • Web Frontend      │
                            └─────────────────────┘
```

## Monorepo Structure

```
project-watchdog/
├── packages/
│   ├── shared/                 # Shared types and schemas
│   │   ├── src/
│   │   │   └── schemas.ts      # Zod schemas shared across packages
│   │   └── package.json
│   │
│   ├── backend/                # Express API server
│   │   ├── src/
│   │   │   ├── config/         # Environment configuration
│   │   │   ├── db/             # Database schema, migrations, seeds
│   │   │   │   ├── schema/     # Drizzle table definitions (14 tables)
│   │   │   │   └── migrations/ # SQL migration files
│   │   │   ├── ingest/         # WhatsApp Web ingestion handlers
│   │   │   ├── middleware/     # Express middleware (auth, logging, validation)
│   │   │   ├── prompts/        # LLM prompt templates
│   │   │   ├── queue/          # pg-boss queue initialization
│   │   │   ├── routes/         # API route handlers
│   │   │   ├── scripts/        # Utility scripts (predeploy, tests)
│   │   │   ├── services/       # Business logic services
│   │   │   ├── webhooks/       # Deprecated: kept for historical migration files
│   │   │   ├── workers/        # Background job processors
│   │   │   └── index.ts        # Server entry point
│   │   └── package.json
│   │
│   ├── frontend/               # React web application
│   │   ├── src/
│   │   │   ├── api/            # API client utilities
│   │   │   ├── components/     # React components
│   │   │   ├── pages/          # Page components (11 pages)
│   │   │   └── styles/         # Tailwind CSS configuration
│   │   └── package.json
│   │
│   └── wa-ingestor/            # WhatsApp Web ingestion service
│       ├── src/
│       │   └── index.ts        # Ingestor entry point
│       └── package.json
│
├── package.json                # Root workspace configuration
├── pnpm-workspace.yaml         # pnpm workspace definition
└── .env.example                # Environment variables template
```

## Backend Architecture

### Database Layer (Drizzle ORM)

#### Schema Organization

Each table is defined in its own file under `packages/backend/src/db/schema/`:

```typescript
// Example: packages/backend/src/db/schema/tasks.ts
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  messageId: integer("message_id").references(() => messages.id),
  description: text("description").notNull(),
  owner: text("owner"),
  deadline: timestamp("deadline"),
  status: text("status").$type<'open' | 'done' | 'blocked'>().default('open'),
  confidence: real("confidence"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

#### Relations

```typescript
// Define relations for joined queries
export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  message: one(messages, {
    fields: [tasks.messageId],
    references: [messages.id],
  }),
}));
```

### Service Layer Pattern

Services encapsulate business logic and are organized by domain:

```
services/
├── llm.ts              # LLM client configuration (OpenAI/Moonshot)
├── task-extraction.ts  # Task extraction orchestration
├── task-similarity.ts  # Duplicate task detection
├── task-merger.ts      # Task merging logic
├── risk-detection.ts   # Risk analysis
├── report-generation.ts # Report creation
├── whatsapp-web-ingestor.ts # WhatsApp Web command/outbox service
└── context-enrichment.ts # Context gathering for AI prompts
```

### Queue System (pg-boss)

Job definitions in `packages/backend/src/queue/jobs.ts`:

```typescript
export type JobType =
  | 'PROCESS_BATCH'      // Process message batch for task extraction
  | 'DETECT_RISKS'       // Analyze project for risks
  | 'GENERATE_REPORT'    // Create daily report
  | 'RUN_PROCESSING_RULE'; // Custom rule execution

export interface ProcessBatchJob {
  connectionId: number;
  projectId: number;
  messageIds: number[];
}

export interface DetectRisksJob {
  projectId: number;
  connectionId: number;
}

export interface GenerateReportJob {
  projectId: number;
  connectionId: number;
  date: string;
}
```

Worker registration in `packages/backend/src/index.ts`:

```typescript
import { registerWorkers } from './workers';

// Register all workers on server startup
registerWorkers();
```

### Batch Processing Strategy

The system uses a debounced batch strategy with these parameters:

- **Idle Timeout:** 3 minutes (triggers when no new messages arrive)
- **Hard Cap:** 30 messages (forces immediate processing)
- **Trigger:** Whichever condition is met first

Implementation in `message-processor.ts`:

```typescript
// Pseudocode of batch window logic
class MessageProcessor {
  private buffer: Map<number, BufferedMessage[]> = new Map();
  private timers: Map<number, NodeJS.Timeout> = new Map();

  onMessage(connectionId: number, message: Message) {
    // Add to buffer
    this.buffer.get(connectionId).push(message);

    // Reset timer
    clearTimeout(this.timers.get(connectionId));
    this.timers.set(connectionId, setTimeout(() => {
      this.flush(connectionId);
    }, 3 * 60 * 1000)); // 3 minutes

    // Force flush at 30 messages
    if (this.buffer.get(connectionId).length >= 30) {
      this.flush(connectionId);
    }
  }
}
```

### Middleware Pipeline

```
Request → CORS → Request Logger → Body Parser → Route Handler → Response
                ↓
Protected Routes:
Request → CORS → Request Logger → JWT Auth → RBAC Check → Route Handler → Response
                ↓
Webhook Routes:
Request → CORS → Webhook Token Validation → Route Handler → Response
```

Middleware files:
- `auth.ts` - JWT authentication and role-based access control
- `webhook-auth.ts` - Fonnte webhook token validation
- `request-logger.ts` - Structured request logging

### Route Organization

Routes follow a domain-driven organization:

```
routes/
├── auth.ts           # Authentication (login, logout)
├── dashboard.ts      # Dashboard metrics and KPIs
├── health.ts         # System health checks
├── people.ts         # People management (derived from tasks)
├── processing.ts     # Processing rules and runs
├── projects.ts       # Project CRUD
├── reports.ts        # Report generation and retrieval
├── settings.ts       # Admin settings (API keys, users, SMTP)
├── sources.ts        # Connection management
└── tasks.ts          # Task CRUD and filtering
```

Route registration pattern:

```typescript
// In index.ts
app.use("/api/auth", authRouter);
app.use("/api/health", healthRouter);
app.use("/webhooks/fonnte", validateFonnteWebhook, fonnteWebhookRouter);

// Protected routes
app.use("/api/dashboard", authenticate, dashboardRouter);
app.use("/api/settings", authenticate, requireRole('admin'), settingsRouter);
```

## Worker Architecture

### Worker Lifecycle

```
1. Server Startup
   ↓
2. Register Workers (registerWorkers())
   ↓
3. pg-boss Starts Job Handlers
   ↓
4. Jobs Enqueued (from webhooks, scheduled, or manual)
   ↓
5. Workers Process Jobs
   ↓
6. Results Persisted to Database
```

### Worker Types

#### 1. Message Processor
**File:** `workers/message-processor.ts`

**Responsibilities:**
- Maintain per-connection message buffers
- Implement debounced batching (3min idle / 30msg cap)
- Enqueue `PROCESS_BATCH` jobs

**Key Logic:**
```typescript
// Maintain per-connection buffers
// Reset timer on each new message
// Force flush at hard cap
```

#### 2. Task Extractor
**File:** `workers/task-extractor.ts`

**Responsibilities:**
- Consume `PROCESS_BATCH` jobs
- Fetch messages from database
- Call LLM with task extraction prompt
- Parse structured output
- Insert tasks to database
- Mark messages as processed
- Enqueue `DETECT_RISKS` job

**LLM Integration:**
```typescript
const result = await llm.chat.completions.create({
  model: config.advancedModel,
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ],
  response_format: { type: 'json_object' }
});
```

#### 3. Risk Engine
**File:** `workers/risk-engine.ts`

**Responsibilities:**
- Consume `DETECT_RISKS` jobs
- Two-layer detection:
  - **Rule-based:** Deadline risks, stagnation detection
  - **LLM-based:** Sentiment analysis, blocker detection
- Write risks to database

#### 4. Report Generator
**File:** `workers/report-generator.ts`

**Responsibilities:**
- Triggered by per-minute cron job
- Match connections with current report_time
- Aggregate daily statistics
- Generate narrative with LLM
- Send formatted report via Fonnte

#### 5. Processing Runner
**File:** `workers/processing-runner.ts`

**Responsibilities:**
- Execute custom processing rules
- Support actions: `extract_tasks`, `update_profiles`, `both`
- Record run history

## Frontend Architecture

### State Management (Zustand)

Store organization:

```typescript
// stores/authStore.ts
interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// stores/uiStore.ts
interface UIState {
  sidebarOpen: boolean;
  currentPage: string;
  toggleSidebar: () => void;
  setPage: (page: string) => void;
}
```

### API Client Pattern

```typescript
// api/client.ts
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = useAuthStore.getState().token;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new APIError(response.status, await response.text());
  }

  return response.json();
}
```

### Page Structure

```
pages/
├── DashboardPage.tsx      # KPIs, activity feed, attention people
├── LoginPage.tsx          # Authentication form
├── PeoplePage.tsx         # People list and metrics
├── PersonDetailPage.tsx   # Individual person profile
├── ProjectsPage.tsx       # Project management
├── SourcesPage.tsx        # Connection management
├── TasksPage.tsx          # Task tracking and filtering
├── ProcessingPage.tsx     # Rules and job history
├── SettingsPage.tsx       # Admin configuration
└── HealthPage.tsx         # System health monitoring
```

### Component Hierarchy

```
App
├── Layout
│   ├── Sidebar
│   │   └── Navigation Links
│   ├── Header
│   │   └── User Menu
│   └── Main Content
│       └── Page Component
│           ├── Page Header
│           ├── Filters/Controls
│           ├── Data Table/Cards
│           └── Modals/Overlays
```

## WhatsApp Integration Architecture

The system uses whatsapp-web.js as the sole WhatsApp integration, handling both inbound message ingestion and outbound message sending (daily reports) through a single WhatsApp Web session.

### Data Flow

```
Inbound Flow:
WhatsApp Group → whatsapp-web.js → POST /ingest/whatsapp-web → Messages Table
                                                                         ↓
                                                              pg-boss Queue ← Batch Processor
                                                                         ↓
                                                                   Tasks/Risks Tables

Outbound Flow (Durable Outbox):
Report Generator → sendMessageToGroup() → wa_ingestor_commands Table
                                             (with payload, retry logic)
                                                          ↓
                                         GET /ingest/whatsapp-web/commands ← wa-ingestor
                                                          ↓
                                               Execute sendMessage(groupId, text)
                                                          ↓
                                         POST /ingest/whatsapp-web/commands/:id/ack
                                              { ok: true } or { ok: false, error }
                                                          ↓
                                         On failure: retry with exponential backoff
                                                      (1s → 2s → 4s → 8s → 16s)
```

### Command System

The backend↔ingestor communication uses a command pattern with durable outbox semantics:

**Command Types:**
- `logout` - Force re-authentication
- `reconnect` - Restart WhatsApp client
- `sync_groups` - Sync group list with backend
- `send_message` - Send a message to a specific group

**Retry Logic:**
- Commands with `consumed_at = null` are pending
- `available_at` controls when a failed command becomes available again
- `attempts` tracks retry count (max 5)
- Exponential backoff: 1s, 2s, 4s, 8s, 16s
- Failed commands are logged in `last_error`

### WhatsApp Web Ingestor

```
┌──────────────────────────────────────────────────────────┐
│                  wa-ingestor process                     │
│                                                          │
│  1. Initialize WhatsApp Web client (Puppeteer)           │
│     - Uses LocalAuth for session persistence             │
│     - Scan QR on first run, then auto-login              │
│                                                          │
│  2. Message Handler:                                     │
│     client.on('message', async (msg) => {                │
│       if (msg.from.endsWith('@g.us')) {                  │
│         await postMessageToBackend(msg);                 │
│       }                                                  │
│     });                                                  │
│                                                          │
│  3. Command Polling (every 3s):                          │
│     const commands = await getPendingCommands();         │
│     for (const cmd of commands) {                        │
│       if (cmd.command === 'send_message') {              │
│         const chat = await client.getChatById(payload);  │
│         const result = await chat.sendMessage(text);      │
│         await ackCommand(cmd.id, { ok: true });          │
│       }                                                  │
│     }                                                    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## AI/LLM Architecture

### Provider Abstraction

```typescript
// services/llm.ts
interface LLMConfig {
  provider: 'openai' | 'moonshot';
  defaultModel: string;
  advancedModel: string;
  apiKey: string;
  baseURL?: string;  // For Moonshot
}

export function createLLMClient(config: LLMConfig) {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,  // undefined for OpenAI
  });
}
```

### Prompt Engineering

Prompts are organized by purpose:

```
prompts/
├── task-extraction.ts      # Extract tasks from messages
├── risk-detection.ts       # Identify project risks
├── report-generation.ts    # Generate narrative summaries
├── context-enrichment.ts    # Gather context for AI
└── similarity-detection.ts # Compare task similarity
```

### Context Enrichment Pattern

Before calling the LLM, the system enriches prompts with context:

```typescript
interface TaskExtractionContext {
  projectName: string;
  recentTasks: Task[];
  people: string[];
  conversationHistory: Message[];
}

async function enrichContext(
  projectId: number,
  messages: Message[]
): Promise<TaskExtractionContext> {
  // Query database for relevant context
  const project = await getProject(projectId);
  const recentTasks = await getRecentTasks(projectId, 7);
  const people = await getActivePeople(projectId);

  return {
    projectName: project.name,
    recentTasks,
    people,
    conversationHistory: messages,
  };
}
```

## Security Architecture

### Authentication Flow

```
User Login
    │
    ▼ POST /api/auth/login
┌─────────────┐
│  Validate   │
│ Credentials │
└─────────────┘
    │
    ▼ bcrypt.compare()
┌─────────────┐
│  Generate   │
│    JWT      │
└─────────────┘
    │
    ▼ Return { token, user }
┌─────────────┐
│  Frontend   │
│ localStorage│
└─────────────┘
    │
    ▼ Subsequent requests
┌─────────────┐
│Authorization│
│Bearer <jwt> │
└─────────────┘
```

### RBAC Matrix

| Resource | Admin | Manager | Guest |
|----------|-------|---------|-------|
| Dashboard | Full | Section-permission | ❌ |
| People | Full | Assigned only | ❌ |
| Tasks | Full | Assigned only | ❌ |
| Sources | Full | Read-only | ❌ |
| Processing | Full | Read-only | ❌ |
| Reports | Full | Section-permission | ❌ |
| Settings | Full | ❌ | ❌ |

### Data Encryption

- **At Rest:** API keys encrypted with AES-GCM
- **In Transit:** HTTPS/TLS 1.3
- **Passwords:** bcrypt with salt rounds 12

## Performance Considerations

### Database Optimization

- Indexes on `messages.connection_id`, `messages.processed`
- Indexes on `tasks.project_id`, `tasks.status`, `tasks.owner`
- Indexes on `risks.project_id`, `risks.resolved_at`

### Caching Strategy

Future implementation:
- Redis for dashboard KPIs (5-minute TTL)
- In-memory caching for people list (1-minute TTL)
- Connection pooling (default 10 connections)

### Queue Monitoring

Key metrics to track:
- Queue depth per job type
- Job completion rate
- Average job duration
- Failed job retry count

## Deployment Architecture

### Production Setup

```
┌─────────────────────────────────────────────────────────────┐
│                         Load Balancer                        │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────┐           ┌─────────────────────┐
│   Backend Server 1  │           │   Backend Server 2  │
│   (Node.js + API)   │           │   (Node.js + API)   │
└─────────────────────┘           └─────────────────────┘
              │                               │
              └───────────────┬───────────────┘
                              ▼
              ┌───────────────────────────────┐
              │     PostgreSQL Cluster        │
              │  (Primary + Read Replicas)    │
              └───────────────────────────────┘
```

### Environment Separation

| Environment | Database | LLM Model | WhatsApp |
|-------------|----------|-----------|----------|
| Development | Local Docker | gpt-4.1-mini | Test groups |
| Staging | Staging RDS | gpt-4.1-mini | Test groups |
| Production | Production RDS | gpt-4.1 | Production groups |

## Development Guidelines

### Adding a New Route

1. Create route file in `packages/backend/src/routes/`
2. Add Zod validation schemas in `packages/shared/src/schemas.ts`
3. Register route in `packages/backend/src/index.ts`
4. Add corresponding page in `packages/frontend/src/pages/`
5. Add navigation link in sidebar component

### Adding a New Worker

1. Create worker file in `packages/backend/src/workers/`
2. Define job type in `packages/backend/src/queue/jobs.ts`
3. Register worker in `packages/backend/src/workers/index.ts`
4. Add job enqueue logic where needed

### Database Migrations

```bash
# Generate migration from schema changes
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Create empty migration for manual SQL
pnpm db:generate --custom
```

## Testing Strategy

### Unit Tests

```bash
# Run all tests
pnpm --filter backend test:run

# Run specific test
pnpm --filter backend test:run -- -t "task extraction"
```

### Integration Tests

Test scenarios are defined in `packages/backend/src/test/fixtures/scenarios/`:

```typescript
// Example scenario
export const whatsappGroupScenario: TestScenario = {
  name: 'whatsapp-group-realistic',
  description: 'Realistic WhatsApp group conversation',
  messages: [
    { sender: '628123456789', text: 'ok @john selesaikan desain UI sebelum jumat ya' },
    // ... more messages
  ],
  expectedTasks: [
    { description: 'Complete UI design', owner: 'john', deadline: 'friday' },
  ],
};
```

### Scenario Testing

```bash
# List available scenarios
pnpm --filter backend test:list

# Run specific scenario
pnpm --filter backend test:scenario whatsapp-group-realistic

# Run with verbose logging
pnpm --filter backend test:scenario whatsapp-group-realistic --verbose
```

## Monitoring & Observability

### Logging Levels

- `INFO`: Normal operations (message received, task extracted)
- `WARN`: Recoverable issues (LLM timeout, retry attempt)
- `ERROR`: Failures requiring attention (database error, webhook failure)

### Key Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Webhook response time | < 200ms | > 500ms |
| Task extraction latency | < 5s | > 10s |
| Queue depth | < 100 | > 500 |
| Failed job rate | < 1% | > 5% |

### Health Check Endpoint

```bash
curl http://localhost:3001/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-03-11T10:00:00Z",
  "uptime": 86400,
  "database": {
    "status": "connected",
    "latency": 5
  },
  "queue": {
    "depth": 12,
    "failedJobs": 0
  }
}
```

## Troubleshooting

### Common Issues

**WhatsApp Web QR code not appearing:**
- Check `WA_HEADLESS` setting
- Verify Puppeteer installation
- Check `WA_PUPPETEER_EXECUTABLE_PATH`

**Messages not being processed:**
- Verify webhook URL in Fonnte dashboard
- Check `FONNTE_WEBHOOK_TOKEN` matches
- Review connection status in database

**Tasks not extracting:**
- Verify LLM API key is valid
- Check pg-boss queue is running
- Review worker logs for errors

**Database connection errors:**
- Verify `DATABASE_URL` format
- Check PostgreSQL is running
- Review connection pool settings

---

For more information, see the [API Documentation](./API.md) and [Development Roadmap](./ROADMAP.md).
