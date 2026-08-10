# Harap architecture

## Phase 1 scope

Phase 1 establishes the application boundary, tooling, security baseline, and developer workflow. It deliberately does not contain authentication, database access, resume parsing, or AI behavior.

```text
Browser
  └─ apps/web (React SPA)
       └─ native fetch + TanStack Query
            └─ /api/v1
                 └─ apps/api (Express)

packages/contracts
  └─ shared Zod request/response contracts
```

## Workspace boundaries

- `apps/web` owns browser routes, UI, client-side environment validation, and server-state queries.
- `apps/api` owns HTTP policy, validation, business entry points, secrets, and future integrations.
- `packages/contracts` contains only Zod contracts consumed by more than one application. Types are inferred from the schemas.
- `packages/eslint-config` and `packages/typescript-config` keep quality policy consistent without duplicating configuration.

There is no shared UI or utilities package. Harap currently has one browser client, and no cross-application utility has justified another package.

## Web application

The web app uses React Router Data Mode. Route configuration is separate from rendering, includes a safe error boundary and useful 404 page, and supports lazy route modules. TanStack Query owns remote state. React Context is not used for server data.

The API client uses native `fetch` and validates the health response with the shared Zod schema before the data reaches UI code.

Tailwind CSS v4 is integrated through its Vite plugin. Theme values are CSS-first variables, with a dark-first accessible baseline, visible focus styles, semantic landmarks, and reduced-motion behavior. shadcn/ui components remain local to `apps/web/src/components/ui`.

Production browser source maps are disabled intentionally. Client code and every `VITE_*` value remain public and must never be treated as a security boundary.

## API request flow

```text
request ID
  → Helmet security headers
  → strict CORS allowlist
  → 64 KiB JSON body limit
  → rate limiting
  → structured request logging
  → /api/v1 routes
  → safe 404 response
  → global safe error handler
```

### Security decisions

- **Request IDs:** The API generates a UUID for every request and does not trust a client-provided ID. The same value is returned in the response header and response metadata.
- **Helmet and CSP:** The JSON API uses a deny-by-default CSP and prevents framing. HSTS is enabled only in production so local development is not forced onto HTTPS.
- **CORS:** Requests without an `Origin` header are allowed for non-browser tools. Browser origins must exactly match `CORS_ALLOWED_ORIGINS`; wildcard origins and credentialed CORS are disabled.
- **Body limits:** JSON bodies are limited to 64 KiB during Phase 1. Future upload endpoints will use separate, route-specific limits and content validation.
- **Rate limiting:** The foundation permits 100 requests per IP per minute and returns a contract-shaped `429` response. Authentication and AI endpoints will receive stricter policies in later phases.
- **Logging:** Pino emits structured logs. Request serializers omit headers, and sensitive field/header paths are redacted as defense in depth. Response bodies and resume contents are not logged.
- **Errors:** Known errors use stable codes. Unknown errors are logged server-side and converted to a generic response; clients never receive stacks, paths, environment data, or infrastructure details.
- **Express fingerprinting:** `X-Powered-By` is disabled.

`trust proxy` is intentionally not enabled yet. Railway proxy topology will be verified during deployment before configuring it, because an incorrect value can undermine IP-based rate limiting.

## Environment configuration

Each app validates its environment once when its module graph starts. Validation failures identify variable names but not values. Frontend configuration contains only public variables; backend secrets will be added only in their owning phases.

## Build graph

`@harap/contracts` builds before either application. Turborepo coordinates package scripts but contains no application behavior. CI installs the root lockfile with `--frozen-lockfile`, then runs formatting, linting, type checking, tests, and builds.

## Planned next boundary

Phase 2 will introduce Supabase Auth, profiles, and Row Level Security. It must derive identity from verified credentials and prefer user-context/RLS access. A service-role key will not be added without a concrete privileged backend use case.
