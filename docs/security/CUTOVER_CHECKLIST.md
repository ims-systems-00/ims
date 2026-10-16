# Auth0 + OpenFGA cutover checklist (M7)

Use with [AUTH_ROLLOUT_TRACKER.md](./AUTH_ROLLOUT_TRACKER.md). Stub remains the local default; staging/prod use `auth0-openfga`.

## Staging dual-run

- [ ] Auth0 SPA + API + Organizations configured for staging
- [ ] Users/orgs linked (`auth0SubjectId` / `auth0OrganizationId`) — see [AUTH0_IDENTITY_BACKFILL.md](./AUTH0_IDENTITY_BACKFILL.md)
- [ ] OpenFGA model deployed; `pnpm backfill:openfga-memberships` run — see [OPENFGA_MEMBERSHIP_BACKFILL.md](./OPENFGA_MEMBERSHIP_BACKFILL.md)
- [ ] Backend `SECURITY_PROVIDER=auth0-openfga` + Auth0 + OpenFGA env
- [ ] Frontend `VITE_SECURITY_PROVIDER=auth0-openfga` + public Auth0 SPA env only
- [ ] Login → org switch → API calls with Bearer succeed
- [ ] Nav hides modules when `*:read` capability is false
- [ ] Role matrix spot-check (Super Admin / Head of Service / Basic / Auditor)
- [ ] Fail-closed: stop OpenFGA briefly → org-scoped actions deny (not allow)

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
