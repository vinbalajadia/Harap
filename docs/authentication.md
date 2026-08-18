# Supabase authentication

## Hosted project setup

These steps require the project owner in the Supabase Dashboard and are intentionally not automated by Harap:

1. Create or select the Harap Supabase project.
2. Under Authentication providers, enable Email and password sign-in.
3. Require email confirmation. Do not enable anonymous sign-ins.
4. Set the Site URL to the deployed web origin. For local-only work, use `http://localhost:5173`.
5. Add exact redirect URLs for each environment:
   - `http://localhost:5173/auth/callback`
   - `http://localhost:5173/reset-password`
   - `https://<production-origin>/auth/callback`
   - `https://<production-origin>/reset-password`
6. Copy the project URL and legacy anon key into the web and API environment files. Do not copy the service-role key.
7. Apply the committed migration with the Supabase CLI after linking the intended project. Preview first:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push --dry-run
supabase db push
```

Double-check the linked project before `db push`. Never run a destructive remote reset against production.

## Implemented lifecycle

- Registration uses `signUp` with a PKCE-compatible confirmation redirect.
- The check-email screen supports a rate-limit-aware resend action without putting the address in the URL.
- Confirmation returns through `/auth/callback`; Supabase initializes the session from the URL and the route continues to the protected app.
- Login restores the original internal `/app...` destination and rejects external redirect values.
- Sessions persist and auto-refresh through the browser Supabase client. Auth state events update the in-memory API token.
- Logout clears Supabase auth and the TanStack Query cache.
- Forgot-password responses do not reveal whether an account exists.
- Recovery links return to `/reset-password`. Password changes are allowed only after a `PASSWORD_RECOVERY` event.

## API token validation

The web client sends `Authorization: Bearer <access-token>` to protected Express routes. The API calls the official `auth.getUser(accessToken)` method, which makes a request to Supabase Auth and returns an authentic user or a failure. An unverified JWT decode is never used for authorization.

After validation, the API derives ownership from `user.id`. It never reads `userId` from URL parameters or request bodies. Invalid/expired tokens receive a bounded `401`; temporary Auth availability failures receive `503`.

## Manual lifecycle check

After dashboard configuration and migration deployment:

1. Register a fresh address.
2. Confirm the message arrives and the callback establishes a session.
3. Complete onboarding and reload `/app`; confirm the session and profile restore.
4. Edit `/app/profile`, then reload and confirm persistence.
5. Sign out and confirm `/app` redirects to `/login`.
6. Request a recovery email, open the link once, set a new password, sign out, and sign in with it.
7. Try an expired/malformed bearer token against `/api/v1/profile` and confirm a safe `401` response.

Do not claim this hosted lifecycle is verified until these steps have run against the configured Supabase project and email provider.
