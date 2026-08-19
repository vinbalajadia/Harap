# Harap architecture

## Phase 3 system boundary

```text
Browser
  └─ apps/web (React SPA)
       ├─ Supabase Auth SDK → Supabase Auth
       └─ bearer access token → apps/api (Express)
                                  ├─ auth.getUser(token) → Supabase Auth
                                  ├─ anon key + user token → PostgREST → PostgreSQL RLS
                                  ├─ anon key + user token → private Storage RLS
                                  └─ PDF.js → bounded text → OpenAI structured output

packages/contracts
  └─ shared Zod profile, resume, candidate-data, and API response contracts
```

The browser owns interactive authentication through the official Supabase SDK. The API owns profile and resume HTTP policy and never trusts identity fields from the browser. PostgreSQL and Storage RLS independently enforce the same ownership rule.

## Workspace boundaries

- `apps/web` owns public/authenticated routes, auth screens, the resume review experience, the in-memory current access token, and client-side form validation.
- `apps/api` verifies bearer access tokens, derives `userId`, validates API input, and accesses profiles, resume records, and private objects through a user-scoped Supabase client.
- `packages/contracts` contains shared Zod schemas for profile, resume, candidate-data, and response shapes.
- `supabase/migrations` is the version-controlled database source of truth.
- `supabase/tests/database` tests profile provisioning plus database and Storage ownership independently of Express.

React Context contains only session identity and auth actions. TanStack Query owns remote profile and resume state. This prevents Context from becoming a second, stale server-state cache.

## Resume processing boundary

```text
authenticated multipart request
  → one 5 MiB in-memory file limit
  → extension + MIME + %PDF- signature checks
  → generated user-id/resume-id/source.pdf path
  → private Storage upload
  → user-owned resume row
  → private Storage download on explicit analysis
  → PDF.js (20 pages, 40,000 characters, 10-second bound)
  → backend-only OpenAI Responses structured output
  → shared Zod validation
  → review_required candidate JSONB
  → user edit and explicit confirmation
  → ready candidate context
```

Extracted text exists only during one analysis request. It is neither stored nor logged. Candidate JSONB is deliberately denormalized because Phase 3 reads and edits the context as a single bounded document; normalized tables can be introduced later if analytics or independent entity queries justify them.

## Authenticated API request flow

```text
request ID
  → Helmet and strict CORS
  → 64 KiB JSON limit and rate limiting
  → redacted structured logging
  → Authorization: Bearer parser
  → Supabase Auth getUser(accessToken)
  → typed request.auth
  → Zod body validation
  → thin controller
  → profile service
  → user-scoped repository
  → PostgreSQL RLS
  → contract-validated response
```

`request.auth` retains only `userId` and optional email. The access token is kept separately in response-local request state only long enough to propagate the user's RLS context; it is never returned or persisted and is covered by logger redaction. The full Supabase user response is not attached.

## Route policy

Public routes are `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/auth/callback`, and `/check-email`.

`/app`, `/app/onboarding`, `/app/profile`, and `/app/resume` require a restored Supabase session. After identity is known, the profile query decides routing:

- incomplete profiles go to `/app/onboarding`;
- completed profiles cannot re-enter onboarding and continue to `/app`;
- loading and query errors render explicit states rather than redirecting, which prevents loops.

## Security decisions

- The API calls `supabase.auth.getUser(accessToken)`, which validates with Supabase Auth; it does not authorize from an unverified JWT decode.
- Neither app accepts a `userId` for profile or resume ownership. The verified token is the only identity source.
- The API uses the anon key, never a service-role key. Its database client also carries the user access token, so RLS applies.
- Profile responses are parsed at both backend persistence and frontend HTTP boundaries.
- Auth provider errors are translated into bounded messages; raw provider responses, tokens, passwords, and internal paths are not shown or logged.
- Production browser source maps remain disabled. Every `VITE_*` value is public.
- Password reset UI requires Supabase's `PASSWORD_RECOVERY` event, not merely any signed-in session.

### CSRF, XSS, and rate limits

Harap sends bearer tokens in the `Authorization` header and does not use ambient authentication cookies. A cross-site form cannot attach that header, and strict CORS blocks unapproved browser origins, so cookie-oriented CSRF middleware would not add protection to the current transport. This decision must be revisited if authentication moves to cookies.

Supabase owns supported session persistence. Harap does not copy tokens into a custom local-storage key; it mirrors only the current access token in memory for API requests. Preventing XSS remains important, so the app uses React's escaped rendering, contains no `dangerouslySetInnerHTML`, disables production source maps, and maintains dependency checks.

Registration, login, confirmation, resend, and recovery calls go directly to Supabase and use its provider rate limits. Harap-owned endpoints remain behind the Phase 1 API limit of 100 requests per IP per minute. Resume upload is additionally limited to 5 requests per IP per hour and analysis to 10 per IP per hour. The AI client disables automatic retries and uses a 20-second request timeout.

Phase 1 request IDs, deny-by-default API CSP, CORS allowlisting, body limits, rate limiting, safe error envelopes, and structured logging remain in place.
