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
pnpm db:push
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
- `pnpm db:generate` - generate drizzle migration files
- `pnpm db:push` - push schema directly to database
- `pnpm db:studio` - open drizzle studio
