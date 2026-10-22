# Auth0 + OpenFGA cutover checklist (M7)

Use with [AUTH_ROLLOUT_TRACKER.md](./AUTH_ROLLOUT_TRACKER.md) and the phased runbook [PRODUCTION_READINESS_PLAN.md](./PRODUCTION_READINESS_PLAN.md). Stub remains the local default; staging/prod use `auth0-openfga`.

## Staging dual-run

- [x] Auth0 SPA + API + Organizations configured for staging
- [x] Users/orgs linked (`auth0SubjectId` / `auth0OrganizationId`) — see [AUTH0_IDENTITY_BACKFILL.md](./AUTH0_IDENTITY_BACKFILL.md)
- [x] OpenFGA model deployed; `pnpm backfill:openfga-memberships` run — see [OPENFGA_MEMBERSHIP_BACKFILL.md](./OPENFGA_MEMBERSHIP_BACKFILL.md)
- [x] Backend `SECURITY_PROVIDER=auth0-openfga` + Auth0 + OpenFGA env
- [x] Frontend `VITE_SECURITY_PROVIDER=auth0-openfga` + public Auth0 SPA env only
- [x] Login → org switch → API calls with Bearer succeed
- [x] Nav hides modules when `*:read` capability is false
- [ ] Role matrix spot-check (Super Admin / Head of Service / Basic / Auditor) — Ada Super Admin only so far
- [x] Fail-closed: stop OpenFGA briefly → org-scoped actions deny (not allow)
- [x] Rollback drill: flip to `development-stub` → restore `auth0-openfga` (2026-10-16)

## Staging smoke runbook (LIC-01)

> **Status 2026-10-22:** Code prerequisites complete (preflight gate, per-org
> buckets, list scopes, session revocation, invoice module). Local run of
> `pnpm preflight:prod`: 14 pass / 3 warn / 2 fail — both FAILs are local-dev
> config (`CLIENT_URL=http://localhost:3000`, `EMAIL_ENABLED=false`); all
> connectivity probes green. **Execution on a real staging deploy is still
> pending user actions:** (1) deploy backend+frontend to staging with
> `SECURITY_PROVIDER=auth0-openfga`, (2) create the Auth0 Management M2M app
> and set `AUTH0_MGMT_CLIENT_ID/SECRET`, (3) `EMAIL_ENABLED=true` with a real
> provider, (4) Stripe test-mode webhook endpoint/forward.

Run after every staging deploy, before inviting real users. Backend must be
on `SECURITY_PROVIDER=auth0-openfga` with **test-mode** Stripe/Auth0.

### 0. Preflight (automated gate)

```bash
cd ims-systems-v5-backend
pnpm preflight:prod                 # config matrix + connectivity
pnpm preflight:prod --organization-id <orgId>   # also HeadBucket the org bucket
```

Expected: exit 0 (no `FAIL`). `WARN` is acceptable only for documented
staging choices (e.g. mailtrap inbox, `sk_test_` is a PASS). Any `FAIL`
stops the smoke — fix config first. Checks cover: provider≠stub, Auth0
domain/audience/SPA, OpenFGA store+model readable, Mongo ping, Auth0 JWKS,
per-org S3 bucket (`AWS_BUCKET_SUFFIX`), CORS incl. `CLIENT_URL`, email
deliverability (enabled + real provider), Stripe key mode + webhook secret.

### 1. Register + create organisation

1. Sign up a fresh user via the frontend (Auth0 staging tenant).
2. Create an organisation.
   - **Expect:** org appears in the switcher; per-org S3 bucket
     `<orgId><AWS_BUCKET_SUFFIX>` exists (auto-provisioned; verify with
     `pnpm preflight:prod --organization-id <orgId>` or AWS console).

### 2. Go Live (Stripe test mode)

1. Start checkout; pay with test card `4242 4242 4242 4242`, any future
   expiry/CVC.
   - **Expect:** webhook completes checkout → org status live, licence
     counters (users/groups/compliance tools) reflect the purchased plan.
2. Re-open Go Live.
   - **Expect:** resumable checkout returns the existing session (no
     duplicate subscription).

### 3. Invite a second user

1. Users → Add user → invite `smoke2@…` with a role.
   - **Expect:** invitation email arrives (provider inbox); link opens
     `auth/onboard/accept-invitation/<token>`; accepting joins the org with
     the invited role; re-using the link fails (single-use, 72h expiry).

### 4. Cross-organisation isolation (fail-closed spot-check)

1. As the second user, create a second organisation (or use a pre-seeded one).
2. Attempt to open the first org's document/user by URL with the second
   org's context.
   - **Expect:** 403/404 — never data from the other org. Stop OpenFGA
     briefly and repeat one org-scoped action: it must **deny**, not allow.

### 5. Files + Document Management

1. Upload a PDF in Document Management; upload an org logo
   (My Organisation) and a profile picture.
   - **Expect:** uploads land in the per-org bucket; preview renders
     **inline** (signed URLs never force download); sidebar shows the org
     logo only (no name) once uploaded.
2. Request a signature from an external email; open the public signing link
   (`/documents/sign/:token`, 7-day), place + sign.
   - **Expect:** signed copy appears under the document's "Signed document"
     tab with the visual signature stamped; the link dies after use/expiry.

### 6. Email-dependent flows

1. Trigger an audit report send and a welcome/access email.
   - **Expect:** mail arrives at the staging inbox/provider with the report
     attached; nothing is only in server logs.

Record date, tester, org id and any deviation in
[DEV_STUB_PRODUCTION_CUTOVER.md](./DEV_STUB_PRODUCTION_CUTOVER.md) (evidence
log). Do not proceed to production cutover with an open smoke failure.

## Production config

- [ ] `NODE_ENV=production` + `SECURITY_PROVIDER=auth0-openfga` (backend)
- [ ] Matching `VITE_SECURITY_PROVIDER=auth0-openfga` (frontend build)
- [ ] Auth0 domain, audience, issuer configured
- [ ] OpenFGA URL / store / model / credentials on **backend only**
- [ ] CORS allows Vite origin; `Authorization` accepted
- [ ] `x-org-id` optional and validated against token org
- [ ] No stub in production
- [ ] No Management/OpenFGA secrets in Vite
- [ ] Admin Auth0 app **not** wired into org-user audience (D-08)

## Rollback

- Redeploy previous artifacts (known-good stub or M6 hybrid build).
- Non-prod: revert provider flags to `development-stub`.
- Optional shadow / kill-switch only if seniors approved (tracker still `open`).
- Do not force-push or destroy OpenFGA store as first resort — disable provider first.

## D-08 admin boundary

- [ ] No platform-admin Auth0 application Audience shared with org-user API
- [ ] No admin routes mounted on org-user Express app
- [ ] Org-user SPA does not import admin SDK/config
