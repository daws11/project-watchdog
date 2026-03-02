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

## WhatsApp ingestion (whatsapp-web.js, no Docker)

This repo can run WhatsApp ingestion without Fonnte inbound webhooks by using a separate process (`packages/wa-ingestor`) powered by `whatsapp-web.js`.

- **Backend endpoint**: `POST /ingest/whatsapp-web` (protected by `X-Ingest-Token`)
- **Ingestor**: logs into WhatsApp Web, listens for **group text messages**, forwards them to the backend endpoint
- **Session persistence**: stored in `WA_SESSION_DIR` (default `.wa-session/`, ignored by git)

### One-time setup (QR login)

1. Set these env vars in `.env`:
   - `WHATSAPP_INGEST_TOKEN`
   - `BACKEND_INGEST_URL` (default: `http://127.0.0.1:3001/ingest/whatsapp-web`)
   - `WA_SESSION_DIR` (default: `.wa-session`)
   - `WA_HEADLESS` (recommended `true` on servers)
2. Install dependencies:

```bash
pnpm install
```

3. Start backend + ingestor:

```bash
pnpm dev
```

4. In the ingestor logs, scan the QR code once. After that, the session persists on disk and survives restarts.

Notes:
- If your pnpm is configured to **ignore dependency build scripts**, Puppeteer may not download Chromium. In that case, set `WA_PUPPETEER_EXECUTABLE_PATH` to a system Chrome/Chromium path, or allow the Puppeteer postinstall via `pnpm approve-builds`.

### Run in production with PM2

1. Build packages:

```bash
pnpm build
```

2. Start both processes:

```bash
pm2 start ecosystem.config.cjs
pm2 logs
```

3. Persist PM2 startup (optional):

```bash
pm2 save
pm2 startup
```

### Settings UI (QR + control)

Admin users can open **Settings → WhatsApp Web** to:
- view runtime status (`online/offline`, state, last heartbeat)
- see QR code when re-authentication is required
- trigger **Force re-login** (logout) or **Reconnect**

This UI talks to backend admin endpoints:
- `GET /api/settings/whatsapp-web`
- `POST /api/settings/whatsapp-web/logout`
- `POST /api/settings/whatsapp-web/reconnect`

### Cutover checklist (from Fonnte inbound -> whatsapp-web.js)

- Ensure `connections.identifier` contains the group ids you want (format: `<groupId>@g.us`).
- Deploy and start backend + `watchdog-wa-ingestor` (PM2).
- Send a **text message** in a registered group and verify:
  - ingestor logs show the message was forwarded
  - backend inserts a row in `messages`
  - processing continues to produce `tasks`
- Disable/ignore Fonnte inbound webhook URLs once verified (you can keep Fonnte outbound if still used).

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
