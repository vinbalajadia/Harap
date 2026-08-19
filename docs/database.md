# Profiles, resumes, and RLS

## Schema

`public.profiles.id` is both the primary key and a foreign key to the stable primary key `auth.users.id`, with `on delete cascade`.

The row stores:

- nullable onboarding fields: `display_name`, `experience_level`, `target_role`, preferred programming `preferred_language`, and `interview_goal`;
- non-null `onboarding_completed`, defaulting to `false`;
- non-null `created_at` and `updated_at` timestamps.

Check constraints bound text lengths and restrict experience/language values. A completed row must contain every onboarding field. The API computes completion after merging a partial update, while PostgreSQL independently rejects inconsistent completed rows.

## Profile provisioning

The `on_auth_user_created` trigger inserts a skeletal profile in the same transaction as a new Auth user. The migration also backfills existing Auth users. Because a failed trigger can block signup, its body is intentionally small and covered by pgTAP.

The authenticated role also has a self-only insert policy and limited insert grant. This lets the API recover an unexpectedly missing row without a service-role key. It still cannot create a row for another user.

## Authorization layers

RLS is enabled and contains separate policies for authenticated users to select, insert, and update only where `auth.uid() = id`. There is no delete policy and the anon role receives no profile privileges.

Column grants further limit authenticated writes to the profile preference fields and `onboarding_completed`. Users cannot update `id`, `created_at`, or `updated_at`. The API additionally allowlists camelCase profile request fields with a strict Zod schema.

The repository creates a request-scoped Supabase client with:

- the project anon key in the `apikey` header; and
- the verified user access token in the `Authorization` header.

PostgreSQL therefore executes with the user's `authenticated` role and applies RLS. No query is made with a service-role bypass.

## Migration and policy tests

The schema source of truth is:

```text
supabase/migrations/20260810000100_create_profiles.sql
```

The independent pgTAP suite is:

```text
supabase/tests/database/profiles_rls.test.sql
```

Run locally:

```bash
pnpm db:start
pnpm db:reset
pnpm db:test
```

The suite verifies table/primary-key structure, trigger provisioning, self-only reads, owned updates, and cross-user update denial. `.github/workflows/database.yml` runs the same migration reset and tests in CI.

## Resume model

`public.resumes` stores one active row per `user_id`. The row contains safe file metadata, a generated private `storage_path`, SHA-256 content digest, constrained workflow status, bounded candidate JSONB, safe failure code, confirmation/analysis timestamps, and audit timestamps. Full extracted PDF text is intentionally not persisted.

Candidate data is JSONB for Phase 3 because the application reads, validates, edits, and confirms it as one bounded document. Its strict shared Zod schema supplies application-level shape and size limits; PostgreSQL independently requires a JSON object. This avoids premature join-heavy tables while leaving a future normalization migration possible if analytics require it.

The status constraint allows only `uploaded`, `processing`, `review_required`, `ready`, or `failed`. A lifecycle constraint couples status with candidate data, failure code, and confirmation timestamp so misleading combinations cannot be stored. The foreign key cascades on Auth-user deletion; the API delete flow removes the private object before deleting the row.

## Resume database and Storage authorization

Authenticated users can select, insert, update, and delete only the row whose `user_id` equals `auth.uid()`. Column grants and strict API contracts add defense in depth. A unique constraint enforces one active resume per user.

Migration `supabase/migrations/20260818000100_create_resumes.sql` creates or configures a private `resumes` bucket with a 5 MiB size limit and `application/pdf` MIME allowlist. Storage policies require the first path segment to equal `auth.uid()`; select, update, and delete also require Storage ownership. Objects follow `user-id/resume-id/source.pdf`. No public URL is produced.

`supabase/tests/database/resumes_rls.test.sql` verifies user A/user B/anonymous isolation for rows and objects, plus private-bucket and size-limit configuration. Run it with the same local `pnpm db:start`, `pnpm db:reset`, and `pnpm db:test` commands above.
