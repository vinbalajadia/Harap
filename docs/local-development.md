# Local development

Harap's primary development environment is WSL 2 with Debian Linux. This repository stays at `/mnt/c/Users/Vin Tristan/Documents/harap`; do not move or duplicate it during Phase 3 work.

## Prerequisites

```bash
source ~/.nvm/nvm.sh
nvm install
nvm use
node --version

corepack enable
corepack prepare pnpm@11.7.0 --activate
pnpm --version
supabase --version
docker --version
```

Node.js is pinned by `.nvmrc`. The Supabase CLI needs a running Docker-compatible engine for the local Auth/PostgreSQL stack.

## Environment files

Create ignored local files from the committed examples:

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

Browser (`apps/web/.env.local`):

```dotenv
VITE_APP_ENV=development
VITE_API_URL=/api/v1
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<local-or-hosted-anon-key>
```

API (`apps/api/.env`):

```dotenv
NODE_ENV=development
PORT=3001
CORS_ALLOWED_ORIGINS=http://localhost:5173
LOG_LEVEL=debug
OPENAI_API_KEY=<optional-backend-only-key>
OPENAI_MODEL=gpt-4o-mini
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=<same-low-privilege-anon-key>
```

Never add a service-role key. The anon key is browser-visible and is not a secret; RLS and user access tokens are the authorization boundary. Keep `OPENAI_API_KEY` only in `apps/api/.env` or backend deployment secrets—never in `apps/web` or a `VITE_*` variable. Without it, uploads and manual candidate entry work, while automatic analysis returns a safe unavailable state. Real environment files remain ignored by Git.

In development, Vite proxies the same-origin `/api` path to Express inside WSL. This keeps browser requests on the working web origin while preserving the bearer token and the API's authentication and RLS checks.

## Start the local stack

```bash
pnpm install
pnpm db:start
pnpm db:reset
pnpm db:test
pnpm dev
```

`supabase start` prints the local API URL and anon key. Copy those exact public values into both environment files. `db:reset` rebuilds the database from committed migrations. Local confirmation and recovery messages appear at <http://localhost:54324> rather than being delivered externally.

`pnpm db:reset` deletes data in the local Docker database before replaying migrations. Do not add `--linked` or run a remote reset as part of ordinary development; remote resets can destroy hosted data.

## Quality checks

```bash
pnpm check
pnpm audit:prod
```

Unit/integration tests mock Supabase and make no network calls. `pnpm db:test` is separate because pgTAP runs against the Docker-backed local PostgreSQL instance. CI repeats both categories in separate jobs.

Preview hosted migration changes without applying them:

```bash
supabase db push --dry-run
```

Do not run a real linked `supabase db push` until the migration has been reviewed and explicitly authorized.

## Troubleshooting

### Public environment configuration is invalid

All four `VITE_*` values are required at build/start. Compare `apps/web/.env.local` with the example. Validation reports variable names without printing values.

### API environment configuration is invalid

Both `SUPABASE_URL` and `SUPABASE_ANON_KEY` are required outside tests. The API does not accept `VITE_*` names.

### Confirmation links return to the wrong page

Set the hosted Supabase Site URL and redirect allowlist exactly as described in [authentication setup](authentication.md). Local configuration is already tracked in `supabase/config.toml`.

### Profile requests return 401

Confirm the browser restored a Supabase session and that the web and API applications point at the same Supabase project. Do not decode or replace the access token manually.

### Resume analysis is unavailable

Confirm `OPENAI_API_KEY` exists in `apps/api/.env`, restart `pnpm dev`, and check that `OPENAI_MODEL` names a Responses API model supporting structured output. Do not place the key in the browser environment. The saved PDF remains private and candidate details can be entered manually.

### A PDF cannot be analyzed

Harap supports text-based PDFs only: at most 5 MiB and 20 pages. Image-only scans need OCR, which Phase 3 intentionally does not invoke. Replace the file with a text-based PDF or use manual entry.

### Database commands cannot reach Docker

Start Docker Desktop with WSL integration (or another compatible engine), then confirm `docker info` succeeds inside Debian before running `pnpm db:start`.
