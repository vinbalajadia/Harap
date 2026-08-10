# Local development

Harap's primary development environment is WSL 2 with Debian Linux. Run Node.js, pnpm, Git, and project scripts from a bash/zsh-compatible WSL shell.

## Prerequisites

Install `nvm` inside Debian and ensure it loads from your shell profile. The repository pins Node.js 24 LTS in `.nvmrc`.

```bash
nvm install
nvm use
node --version

corepack enable
corepack prepare pnpm@11.7.0 --activate
pnpm --version
```

## Start Harap

From the repository root:

```bash
pnpm install

cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env

pnpm dev
```

Open:

- Web: <http://localhost:5173>
- API: <http://localhost:3001>
- Health: <http://localhost:3001/api/v1/health>

Stop both development servers with `Ctrl+C`.

## Environment files

`apps/web/.env.local` contains browser-visible configuration. Every name beginning with `VITE_` is included in client code and must be treated as public.

`apps/api/.env` contains server-only configuration. Phase 1 does not require Supabase or OpenAI credentials.

Real environment files are ignored by Git. Commit only `.env.example` files.

## Common commands

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check
pnpm audit:prod

pnpm --filter @harap/web dev
pnpm --filter @harap/api dev
```

`pnpm check` is the local quality gate and should pass before opening a pull request. CI repeats the checks from a frozen lockfile.

## Repository location in WSL

The current working copy may be under `/mnt/c`. This works, but file watching and dependency-heavy operations are generally faster in the WSL Linux filesystem.

Do not move or delete the current copy while it contains uncommitted work. After the repository has at least one commit, the safest migration is to clone it and verify the clone:

```bash
git status
git log --oneline -5

mkdir -p ~/projects
git clone "/mnt/c/Users/Vin Tristan/Documents/harap" ~/projects/harap
cd ~/projects/harap

git status
git log --oneline -5
nvm use
pnpm install --frozen-lockfile
pnpm check
```

If a remote repository is configured, clone the remote URL instead of the `/mnt/c` path. Keep the original copy until the Linux clone's history, files, checks, and remote configuration have all been verified.

Never copy `node_modules`; install dependencies again inside the Linux filesystem.

## Troubleshooting

### `pnpm` is not found

```bash
nvm use
corepack enable
corepack prepare pnpm@11.7.0 --activate
```

### The API fails during startup

Compare `apps/api/.env` with `apps/api/.env.example`. Validation reports invalid variable names but intentionally does not print their values.

### The web app reports that the API is unavailable

Confirm the API is running and check:

```bash
curl --fail-with-body http://localhost:3001/api/v1/health
```

Also confirm `VITE_API_URL` and the API's `CORS_ALLOWED_ORIGINS` use the expected development URLs.
