# Harap

**Face every interview with confidence.**

Harap is an adaptive interview-coaching platform for aspiring software engineers. Phase 3 adds a secure, user-reviewed candidate-background layer on top of the existing identity and profile foundation.

## Current capabilities

- email/password registration with email confirmation;
- login, logout, session restoration, and safe intended-route redirects;
- forgot-password and recovery-session password updates;
- protected application routes with an onboarding gate;
- a user-owned coaching profile editable through the Express API;
- server-side Supabase access-token verification;
- PostgreSQL constraints, profile provisioning, Row Level Security, and pgTAP policy tests;
- shared Zod contracts, strict TypeScript, mocked auth/API tests, and CI.
- one private PDF resume per authenticated user, with safe replace and delete controls;
- bounded in-process PDF text extraction without OCR or shell execution;
- backend-only OpenAI structured extraction into skills, technologies, achievements, experience, projects, and education;
- candidate review, correction, manual entry, and explicit confirmation before context becomes ready;
- database and Storage RLS, a 5 MiB limit, route-specific abuse controls, and synthetic automated tests.

Harap does not contain a Supabase service-role key. Browser and API data access use the low-privilege anon key plus the verified user's access token so PostgreSQL and Storage RLS remain authoritative. `OPENAI_API_KEY` is optional, backend-only, and never uses a `VITE_*` name.

## Requirements

- WSL 2 with Debian Linux
- `nvm`
- Node.js 24 LTS
- pnpm 11
- Supabase CLI and Docker-compatible runtime for local database/auth development

## Quick start

```bash
cd "/mnt/c/Users/Vin Tristan/Documents/harap"
source ~/.nvm/nvm.sh
nvm install
nvm use
corepack enable
corepack prepare pnpm@11.7.0 --activate
pnpm install

cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

Set the Supabase URL and anon key in both environment files. To enable automatic resume analysis, also set `OPENAI_API_KEY` in `apps/api/.env`; manual candidate entry remains available without it. Then apply the migrations to a local stack:

```bash
pnpm db:start
pnpm db:reset
pnpm db:test
pnpm dev
```

Development URLs:

- Web: <http://localhost:5173>
- API: <http://localhost:3001>
- Health: <http://localhost:3001/api/v1/health>
- Local Supabase Studio: <http://localhost:54323>
- Local email inbox: <http://localhost:54324>

## Commands

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check
pnpm audit:prod
pnpm db:start
pnpm db:reset
pnpm db:test
```

Read [resume intelligence](docs/resume-intelligence.md), [authentication setup](docs/authentication.md), [database and RLS](docs/database.md), [local development](docs/local-development.md), [architecture](docs/architecture.md), and the [security checklist](docs/security.md) before connecting a hosted Supabase project.
