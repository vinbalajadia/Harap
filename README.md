# Harap

**Face every interview with confidence.**

Harap is an adaptive AI-powered interview coaching platform for aspiring software engineers. It is being built incrementally as a production-minded internship and portfolio project.

## Phase 1

The current foundation includes:

- a React 19, Vite, React Router, TanStack Query, Tailwind CSS v4, and shadcn/ui web application;
- an Express 5 API with security middleware and structured logging;
- shared Zod API contracts;
- pnpm workspaces orchestrated by Turborepo;
- strict TypeScript, ESLint, Prettier, Vitest, and GitHub Actions CI.

Supabase authentication, database work, resume processing, and OpenAI integration are intentionally deferred to later phases.

## Requirements

- WSL 2 with Debian Linux
- `nvm`
- Node.js 24 LTS
- pnpm 11

## Quick start

```bash
nvm install
nvm use
corepack enable
corepack prepare pnpm@11.7.0 --activate
pnpm install

cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env

pnpm dev
```

Development URLs:

- Web: <http://localhost:5173>
- API: <http://localhost:3001>
- Health: <http://localhost:3001/api/v1/health>

## Commands

```bash
pnpm dev        # Run web and API development servers
pnpm lint       # Run ESLint in every workspace
pnpm typecheck  # Check TypeScript in every workspace
pnpm test       # Run the test suites
pnpm build      # Build all production artifacts
pnpm check      # Run the complete local quality gate
pnpm audit:prod # Audit production dependencies
```

See [local development](docs/local-development.md) for the WSL-first setup and [architecture](docs/architecture.md) for system boundaries and security decisions.
