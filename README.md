# Project Watchdog

Boilerplate monorepo berbasis pola InvenFlow:

- Frontend: React 18 + Vite + TypeScript + Tailwind CSS
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL + Drizzle ORM
- Shared package: shared types + Zod schema

## Quick Start

```bash
pnpm install
cp .env.example .env
pnpm db:generate
pnpm db:migrate
pnpm dev
```

## Access

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- Health API: `http://localhost:3001/api/health`

## Structure

```text
project-watchdog/
├── packages/
│   ├── shared/
│   ├── backend/
│   └── frontend/
├── package.json
└── pnpm-workspace.yaml
```

## Common Commands

- `pnpm dev` - run all packages in dev mode
- `pnpm build` - build all packages
- `pnpm lint` - lint all packages
- `pnpm predeploy` - run local pre-deployment checklist checks
- `pnpm db:generate` - generate drizzle migration files
- `pnpm db:migrate` - apply drizzle migrations to database
- `pnpm db:seed` - seed initial admin user from env vars
- `pnpm db:push` - push schema directly to database
- `pnpm db:studio` - open drizzle studio

## Pre-deployment

Run local preflight checks before deployment:

```bash
pnpm predeploy
```

Run strict mode (fails if any warning exists):

```bash
pnpm predeploy -- --strict
```

What `pnpm predeploy` validates:
- Drizzle migration files exist in `packages/backend/src/db/migrations`
- PostgreSQL is reachable via `DATABASE_URL`
- Drizzle migrations are applied (`__drizzle_migrations`)
- `JWT_SECRET` exists and has minimum 32 characters
- LLM key presence based on `LLM_PROVIDER` (`OPENAI_API_KEY` or `MOONSHOT_API_KEY`)
- Fonnte token presence (outbound + inbound)
- At least one test connection exists in `connections` table
- Fonnte webhook URL template is printed for dashboard setup

Recommended environment variable minimums:
- `DATABASE_URL` - valid PostgreSQL connection string
- `JWT_SECRET` - minimum 32 characters
- `LLM_PROVIDER` - `"openai"` or `"moonshot"`
- `OPENAI_API_KEY` - required when `LLM_PROVIDER=openai`
- `MOONSHOT_API_KEY` - required when `LLM_PROVIDER=moonshot`
- `FONNTE_API_TOKEN` - required for outbound WhatsApp sends (Fonnte API `Authorization` header)
- `FONNTE_WEBHOOK_TOKEN` - required for inbound webhook validation

Fonnte webhook URL format:

```text
http://<host>:<port>/webhooks/fonnte/receive?token=<FONNTE_WEBHOOK_TOKEN>
```

For local webhook testing, expose your backend with a tunnel (for example ngrok or cloudflared) and use the public HTTPS URL in the Fonnte dashboard.

## Phase 2 Quick Verification (Webhook + Sources)

1. Ensure env vars are set in `.env`:
   - `FONNTE_WEBHOOK_TOKEN`
   - `FONNTE_API_TOKEN`
2. Start backend (`pnpm dev`) and register a WhatsApp source in `/sources` with identifier format `<groupId>@g.us`.
3. Configure webhook in Fonnte dashboard:

```text
https://<public-host>/webhooks/fonnte/receive?token=<FONNTE_WEBHOOK_TOKEN>
```

4. Send a message in the registered group, then verify:
   - new row exists in `messages`
   - `connections.last_sync_at` and `connections.messages_processed` are updated
5. Optional outbound smoke test:

```bash
pnpm fonnte:smoke -- "<groupId>@g.us" "Watchdog smoke test"
```

Notes:
- Legacy env vars are still supported for compatibility: `FONNTE_API_KEY` and `FONNTE_TOKEN`.
- If you previously used `FONNTE_TOKEN` as the API token for outbound calls, move it to `FONNTE_API_TOKEN` and set a separate `FONNTE_WEBHOOK_TOKEN`.
