# Self-signup + organisation onboard (Auth0)

**Policy (2026-10-17):** Org-user access allows **self-registration**. Auth0 owns identity/credentials; V5 owns login/register/forgot-password **UI and routing** via embedded forms (BFF).

## Product flow

1. Person opens **`/register`**, **`/login`**, or **`/forgot-password`** (V5 pages — no app sidebar).
2. Submits email/password on V5 forms. The **backend** calls Auth0 Authentication APIs (Database connection). Credentials never stored in IMS.
3. Backend returns Auth0 tokens; SPA stores them and calls `/api/v1/*` with Bearer (unchanged).
4. After auth:
   - **No IMS memberships** → `/onboard/organisation` (create tenant → flow selection → Go Live).
   - **Has memberships** → product shell; first org auto-selected when needed.
5. Backend **JIT-provisions** an IMS user from the Auth0 `sub` (+ email) on first authenticated API call.

Universal Login / `loginWithRedirect` is **not** the primary email/password path.

## Auth0 dashboard checklist (required)

### Database connection

1. **Authentication → Database** (e.g. `Username-Password-Authentication`) → enable **Sign Ups**.
2. Note the connection name — set as backend `AUTH0_DB_CONNECTION`.
3. On that connection → **Applications**: enable both your **SPA** app and the **BFF Regular Web** app.
4. If signup fails with Auth0’s vague **“Invalid sign up”** (shown as-is in the UI), operators should check in order:
   - Sign Ups enabled (step 1)
   - SPA client enabled on this connection (step 3) — `AUTH0_SPA_CLIENT_ID` must be that SPA
   - **Security → Bot Detection**: for local BFF signup without captcha, disable Bot Detection (or allowlist)
   - Duplicate email: Auth0 may return `user_exists` (mapped to 409) or, in some cases, only “Invalid sign up”

### BFF application (password grant)

Create or reuse a **Regular Web Application** dedicated to the V5 backend (client secret stays on the server only):

1. **Grant Types** (Application → Advanced → Grant Types): enable **Password** (Resource Owner) and **Refresh Token**.
2. Authorize the app for your API audience (`AUTH0_AUDIENCE`).
3. Auth0 may require the connection / app to be marked **Highly Trusted** for Resource Owner Password Grant — without this, `POST /auth/login` will fail with an Auth0 grant error.
4. Copy **Client ID** + **Client Secret** into backend env (`AUTH0_ROPG_CLIENT_ID` / `AUTH0_ROPG_CLIENT_SECRET`).

### Public SPA client (signup / change-password)

1. Keep the existing SPA application for optional later social/redirect.
2. Auth0 `dbconnections/signup` and `dbconnections/change_password` need a **public** `client_id` (no secret in the browser).
3. Set backend `AUTH0_SPA_CLIENT_ID` to that SPA Client ID (or the same id if one app is used for both where Auth0 allows it).

### Self-serve org binding

1. **Do not** require an Auth0 Organization on every login for self-serve tenants.
2. Leave `VITE_AUTH0_ORGANIZATION_ID` **empty** for multi-tenant self-signup.
3. Use it only for single-org demos.

## Backend env (never `VITE_*`)

```env
SECURITY_PROVIDER=auth0-openfga
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://your-api-audience
AUTH0_ISSUER=                 # optional; defaults to https://${AUTH0_DOMAIN}/

# Database connection name
AUTH0_DB_CONNECTION=Username-Password-Authentication

# Public SPA client id — signup + forgot-password Auth0 endpoints
AUTH0_SPA_CLIENT_ID=

# Confidential app — Resource Owner Password + refresh_token grants
AUTH0_ROPG_CLIENT_ID=
AUTH0_ROPG_CLIENT_SECRET=
```

## Frontend env

```env
VITE_SECURITY_PROVIDER=auth0-openfga
VITE_API_BASE_URL=http://127.0.0.1:3001/api/v1
# Still required for auth0-openfga mode (optional social / redirect later):
VITE_AUTH0_DOMAIN=...
VITE_AUTH0_CLIENT_ID=...
VITE_AUTH0_AUDIENCE=...
# Prefer empty for self-signup:
VITE_AUTH0_ORGANIZATION_ID=
```

Never put Auth0 **client secrets** in `VITE_*`.

## V5 auth session API

| Endpoint | Behaviour |
| --- | --- |
| `POST /api/v1/auth/register` | Auth0 signup + password grant → tokens |
| `POST /api/v1/auth/login` | Password grant → tokens |
| `POST /api/v1/auth/forgot-password` | Auth0 change_password email; generic success (no enumeration) |
| `POST /api/v1/auth/refresh` | Refresh-token grant → new access token |

These routes are **public** (no Bearer). Rate limiting is a follow-up if abuse appears.

## What V5 owns vs Auth0

| Concern | Owner |
| --- | --- |
| `/login`, `/register`, `/forgot-password` UI | V5 |
| Password storage / verification | Auth0 |
| Token exchange (BFF) | V5 backend |
| IMS user record (JIT) | V5 backend |
| Create organisation / Go Live | V5 |
| Invite-only gate | **Removed** as default product policy |

## Manual smoke (after Auth0 grants + env)

1. Set backend `AUTH0_*` BFF vars and `SECURITY_PROVIDER=auth0-openfga`; frontend `VITE_SECURITY_PROVIDER=auth0-openfga`.
2. **Register** a new email on `/register` → lands authenticated → **no memberships** → `/onboard/organisation`.
3. Complete create org → flow selection → **Go Live** (OpenFGA still up).
4. **Logout**, then **login** on `/login` with the same credentials → workspace (membership selected).
5. **Forgot password** on `/forgot-password` → generic success; check Auth0/email inbox for reset mail.

Automated coverage: backend `tests/auth-session.http.test.ts`; frontend `tests/bff-auth-client.test.ts`, `tests/login-page.test.tsx`, `tests/register-page.test.tsx`.

## Follow-ups (not in this slice)

- Auth0 Custom Domain branding.
- Auto-create Auth0 Organization + membership when IMS org is created (Management API).
- Fully removing `@auth0/auth0-react` if unused after cutover.
- HTTP rate limits on `/auth/*`.
