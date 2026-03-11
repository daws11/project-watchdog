# Project Watchdog

An AI-driven project risk intelligence platform that transforms unstructured WhatsApp conversations into structured project insights.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## Overview

Project Watchdog monitors WhatsApp group conversations, automatically extracts actionable tasks using AI, detects project risks, generates daily reports, and provides a comprehensive web dashboard for project oversight.

### Key Features

- **WhatsApp Message Integration** - Uses whatsapp-web.js for both inbound message ingestion and outbound sending (daily reports) via a single WhatsApp Web session
- **AI-Powered Task Extraction** - Uses LLM (OpenAI GPT-4.1 or Moonshot/Kimi K2) to identify tasks, assignees, and deadlines from conversations
- **Intelligent Risk Detection** - Analyzes task deadlines, stagnation, and blockers to identify project risks
- **Automated Daily Reports** - Generates narrative summaries and sends them back to WhatsApp groups via the durable outbox (with automatic retry on failure)
- **Web Dashboard** - React-based interface for managing projects, tasks, people, and monitoring system health

## Tech Stack

### Monorepo Structure

```
project-watchdog/
├── packages/
│   ├── backend/           # Express + TypeScript API
│   ├── frontend/          # React + Vite + Tailwind CSS
│   ├── shared/            # Shared types and Zod schemas
│   └── wa-ingestor/       # WhatsApp Web ingestion service
├── package.json           # Root workspace configuration
└── pnpm-workspace.yaml    # pnpm workspace definition
```

### Backend (`packages/backend/`)
- **Framework:** Express.js 5.1.0 with TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **Queue System:** pg-boss (PostgreSQL-backed job queue)
- **AI/LLM:** OpenAI SDK (supports OpenAI and Moonshot/Kimi K2)
- **Authentication:** JWT + bcrypt
- **Validation:** Zod

### Frontend (`packages/frontend/`)
- **Framework:** React 19 with TypeScript
- **Build Tool:** Vite 7
- **Styling:** Tailwind CSS 3.4
- **State Management:** Zustand
- **Routing:** React Router DOM
- **Icons:** Lucide React

### WhatsApp Ingestor (`packages/wa-ingestor/`)
- **Library:** whatsapp-web.js for WhatsApp Web automation
- **Authentication:** QR code-based login with session persistence

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- PostgreSQL 14+

### Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd project-watchdog
```

2. **Install dependencies:**
```bash
pnpm install
```

3. **Configure environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Set up the database:**
```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

5. **Start development servers:**
```bash
pnpm dev
```

The application will be available at:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`
- Health Check: `http://localhost:3001/api/health`

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/project_watchdog

# Backend
PORT=3001
NODE_ENV=development

# Frontend
VITE_API_URL=http://localhost:3001

# AI / LLM
# Choose provider: "moonshot" (Kimi) or "openai"
LLM_PROVIDER=openai

# OpenAI (required when LLM_PROVIDER=openai)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_DEFAULT_MODEL=gpt-4.1-mini
OPENAI_ADVANCED_MODEL=gpt-4.1

# Moonshot / Kimi (required when LLM_PROVIDER=moonshot)
MOONSHOT_API_KEY=your_moonshot_api_key_here
MOONSHOT_DEFAULT_MODEL=moonshot-v1-32k
MOONSHOT_ADVANCED_MODEL=moonshot-v1-128k

# WhatsApp Web Integration (whatsapp-web.js)
WHATSAPP_INGEST_TOKEN=your_internal_ingest_token_here
BACKEND_INGEST_URL=http://127.0.0.1:3001/ingest/whatsapp-web
WA_SESSION_DIR=.wa-session
WA_HEADLESS=true

# Authentication
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_32_plus_char_encryption_key_here

# Initial Admin Seeding
SEED_ADMIN_NAME="Watchdog Admin"
SEED_ADMIN_EMAIL=admin@watchdog.local
SEED_ADMIN_PASSWORD=change_me_before_seeding
```

## Common Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run all packages in development mode |
| `pnpm build` | Build all packages for production |
| `pnpm lint` | Lint all packages |
| `pnpm db:generate` | Generate Drizzle migration files |
| `pnpm db:migrate` | Apply database migrations |
| `pnpm db:seed` | Seed initial admin user from env vars |
| `pnpm db:push` | Push schema changes directly to database |
| `pnpm db:studio` | Open Drizzle Studio for database management |
| `pnpm predeploy` | Run pre-deployment validation checks |

## WhatsApp Integration (whatsapp-web.js)

The system uses whatsapp-web.js for all WhatsApp communication - both receiving messages and sending daily reports.

### Architecture

```
Backend (Workers/Reports)        Backend (Ingest API)              WhatsApp Web Client
       │                                 │                                  │
       │  sendMessageToGroup()           │  GET /ingest/whatsapp-web        │
       │ ──────────────────────────────> │ ──────────────────────────────>  │
       │                                 │     { commands }                 │  Process commands
       │                                 │                                  │  (send_message)
       │                                 │  POST /ingest/whatsapp-web       │
       │                                 │  (status, messages, acks)         │
       │                                 │ <──────────────────────────────  │
       │                                 │                                  │
```

### Setup

1. Set environment variables for the ingestor:
   - `WHATSAPP_INGEST_TOKEN` - Internal auth token
   - `BACKEND_INGEST_URL` - Backend endpoint (default: `http://127.0.0.1:3001/ingest/whatsapp-web`)
   - `WA_SESSION_DIR` - Session persistence directory (default: `.wa-session`)
   - `WA_HEADLESS` - Run browser in headless mode (default: `true` for production)

2. Start the development server (`pnpm dev` starts both backend and ingestor)

3. Scan the QR code displayed in terminal on first run

4. Session persists in `WA_SESSION_DIR` for subsequent runs

### Outbound Messaging (Durable Outbox)

The system uses a durable outbox pattern for sending messages:
- Reports are queued as `send_message` commands in the database
- Commands include retry logic with exponential backoff (1s, 2s, 4s, 8s, 16s)
- Max 5 attempts before giving up
- Failed messages can be inspected via the `wa_ingestor_commands` table

**Admin UI Controls:**
Navigate to **Settings → WhatsApp Web** to:
- View runtime status (online/offline, ready/not-ready)
- Scan QR code for re-authentication
- Force logout or reconnect

## Pre-Deployment Checklist

Run the pre-deployment validation script before deploying:

```bash
pnpm predeploy
```

This validates:
- Database migrations exist and are applied
- PostgreSQL is reachable
- JWT_SECRET meets minimum length (32+ characters)
- LLM API keys are present
- Fonnte tokens are configured
- At least one connection exists in the database

For strict mode (fails on any warning):
```bash
pnpm predeploy -- --strict
```

## Database Schema

The system uses 14 core tables:

| Table | Purpose |
|-------|---------|
| `users` | Admin and manager accounts |
| `projects` | Project definitions |
| `connections` | WhatsApp/email/webhook connections |
| `messages` | Ingested WhatsApp messages |
| `tasks` | Extracted tasks with confidence scores |
| `risks` | Detected risks with severity levels |
| `reports` | Generated daily reports |
| `processing_rules` | Rules for message processing |
| `processing_runs` | Processing job tracking |
| `people_settings` | Personnel configuration |
| `api_keys` | API key storage |
| `smtp_settings` | Email configuration |
| `wa_ingestor_commands` | Commands for WhatsApp ingestor |

## Workers & Background Jobs

The system runs several background workers:

1. **message-processor** - Processes incoming messages and manages batch windows
2. **processing-runner** - Runs processing rules on messages
3. **task-extractor** - Extracts tasks from messages using LLM
4. **risk-engine** - Analyzes tasks for risks
5. **report-generator** - Generates daily reports and sends to WhatsApp

## API Endpoints

### Public Endpoints
- `POST /api/auth/login` - User authentication
- `GET /api/health` - System health check
- `POST /webhooks/fonnte/receive` - Fonnte webhook receiver

### Protected Endpoints (JWT Required)
- `GET /api/dashboard` - Dashboard metrics
- `GET /api/projects` - Project management
- `GET /api/tasks` - Task CRUD operations
- `GET /api/people` - People management
- `GET /api/sources` - Connection management
- `GET /api/processing` - Processing rules
- `GET /api/reports` - Report access
- `GET /api/settings` - Admin settings (admin only)

For detailed API documentation, see [API.md](./API.md).

## Testing

Run the test suite:
```bash
pnpm --filter backend test:run
```

Run specific test scenarios:
```bash
pnpm --filter backend test:scenario <scenario-name>
```

List available test scenarios:
```bash
pnpm --filter backend test:list
```

## Architecture

For detailed architecture information, see [ARCHITECTURE.md](./ARCHITECTURE.md).

```
WhatsApp Group → whatsapp-web.js → Ingest Handler → Messages Table
                                 ↑                         ↓
                                 │              pg-boss Queue ← Message Processor
                                 │                         ↓
                                 │           ┌────────────┴────────────┐
                                 │           ↓                         ↓
                                 │ Task Extractor (LLM)      Risk Detection Engine
                                 │           ↓                         ↓
                                 │      Tasks Table              Risks Table
                                 │           └────────────┬────────────┘
                                 │                        ↓
                                 │           Report Generator (Scheduled)
                                 │                        ↓
                                 └─────────── send_message command → Durable Outbox
                                                          (with retry logic)
```

## Development Roadmap

See [ROADMAP.md](./ROADMAP.md) for detailed development phases and future enhancements.

**Current Status:** Phases 1-5 implemented, Phase 6 security hardening complete.

## Security Notes

- Fonnte uses unofficial WhatsApp integration — use a secondary phone number
- Store all tokens and keys in environment variables
- JWT secret must be at least 32 characters
- API keys are encrypted at rest
- Webhook endpoints validate tokens
- Rate limiting is applied to prevent abuse

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues and feature requests, please use the GitHub issue tracker.

---

**Built with care by the Project Watchdog team.**
