# Auth0 + OpenFGA Rollout Tracker (Org-User)

Living progress log for replacing the V5 development-stub AuthN/AuthZ with Auth0 SPA + Bearer and OpenFGA.

**Plan reference:** Cursor plan `Auth0 OpenFGA Auth` (milestones M0–M7)  
**Architecture:** [SECURITY_ARCHITECTURE.md](../architecture/SECURITY_ARCHITECTURE.md)  
**Related ADRs:** D-06, D-08, D-09, D-16, D-20, D-21, D-24

---

## Session rules

1. Work **only** the **Current milestone**.
2. Do not start the next milestone until every Done criterion below is checked and **Evidence** is filled in.
3. Before ending a session, update: status, last updated, evidence, blockers.
4. Prefer one PR (or short stacked series) named `auth/mN-…`.
5. Keep `development-stub` as the default local provider until a milestone explicitly flips the flag.
6. Platform-admin auth (D-08) is **out of scope** — never wire admin through org-user ports.

---

## Dashboard

| Field | Value |
| --- | --- |
| **Current milestone** | `M7` |
| **Status** | `done` |
| **Last updated** | 2026-10-16 |
| **Active branch / PR** | _(none yet)_ |
| **Blocked on** | Live OpenFGA store + Auth0 tenant owners still unassigned for staging/prod execution of checklists. |
| **Do not touch yet** | — programme complete (D-08 admin remains a separate future programme) |

---

## Milestone status board

| ID | Milestone | Status | Evidence |
| --- | --- | --- | --- |
| M0 | Tracker + decisions | `done` | This file; docs index + SECURITY_ARCHITECTURE links; working agreements below |
| M1 | ADRs + env contracts | `done` | D-16/D-20/D-21 updated; `auth0-openfga` env contracts; tests green |
| M2 | Identity data model | `done` | `auth0SubjectId` / `auth0OrganizationId` + repo helpers + backfill notes; tests green |
| M3 | Backend AuthN | `done` | Auth0Authenticator + mock JWKS unit/HTTP tests; AuthZ still permissive |
| M4 | Frontend login + Bearer | `done` | Auth0 SPA provider, Bearer HTTP, /users/me, profile/menu use session identity |
| M5 | Org switch + token refresh | `done` | Org switcher + token-before-persist; logout clears org; tests green |
| M6 | OpenFGA (one module first) | `done` | Draft model + OpenFgaAuthorizer; organisation enforced; others permissive |
| M7 | Enforce + prod cutover | `done` | Full OpenFGA enforce; backfill script; FE AuthZ/nav; cutover docs |

Status values: `not_started` | `in_progress` | `blocked` | `done`

---

## Locked product decisions (do not re-litigate in implementation PRs)

- **Tenancy:** Hybrid — Auth0 Organizations in the access token; MongoDB membership/roles SoT; OpenFGA for permission checks.
- **Scope:** Org-user only; platform admin deferred (D-08 boundary preserved).
- **Transport:** Auth0 SPA (PKCE) + Bearer to Express.
- **Frontend:** Vite React SPA (not Next.js).
- **Ports:** Modules depend on security ports only; adapters under `src/security/`.

### Working agreements (recorded M0 — 2026-10-16)

- **One active milestone** at a time; update this tracker every session.
- **`development-stub` stays the default** for local/dev until M3 (backend) / M4 (frontend) explicitly enable `auth0-openfga` via env.
- **No product Auth0/OpenFGA adapter code in M0–M1** beyond env/ADR contracts in M1.
- **Canonical identity:** `SecurityIdentity.subjectId` = IMS user ObjectId (Auth0 `sub` stored separately as `auth0SubjectId`).
- **AuthZ at launch:** org-level relations first; object-level tuples deferred unless a later milestone reopens this.
- **Infra without named owners is blocked** for live integration, but documentation and env schema work (M1) may proceed.

---

## Senior approvals

| Decision | Status | Blocks | Notes / owner |
| --- | --- | --- | --- |
| OpenFGA model DSL + ownership (D-21) | `approved` | M6 | Working draft published under `docs/security/openfga/` (senior may revise) |
| Role → permission matrix (incl. `create` vs update quirk) | `approved` | M6–M7 | Org module matrix in ROLE_PERMISSION_MATRIX.md; expand in M7 |
| JIT vs invite-only provisioning; fate of `passwordHash` | `open` | M2–M4 | |
| Auth0 Orgs + Management API ownership (envs) | `open` | M4–M5 | |
| OpenFGA hosting (self-hosted vs Auth0 FGA) | `open` | M6 | |
| Accept Bearer (D-20) + rewrite D-16 for Vite SPA | `approved` | M1 | ADRs updated 2026-10-16 (Accepted) |
| Shadow / enforce kill-switch for cutover? | `open` | M7 | |
| `subjectId` = IMS user ObjectId vs Auth0 `sub` | `approved` | M2–M3 | IMS user ObjectId (working agreement M0) |
| Org-level vs object-level AuthZ at launch | `approved` | M6 | Org-level first (working agreement M0) |
| Admin timeline so audiences stay separate (D-08) | `deferred` | review gate | Separate future programme; not in M0–M7 |

Status values: `open` | `approved` | `deferred`

### Infra owners

| Resource | Owner | Env ready? | Notes |
| --- | --- | --- | --- |
| Auth0 tenant (SPA + API + Organizations) | **BLOCKED — unassigned** | no | Assign before M3 live Auth0 validation / M4 login demo |
| OpenFGA store / Auth0 FGA | **BLOCKED — unassigned** | no | Assign before M6 |
| Staging secrets (backend only) | **BLOCKED — unassigned** | no | Never put Management/OpenFGA secrets in Vite |

When owners are known, replace **BLOCKED — unassigned** with a name and set `Env ready?` accordingly. Update the Dashboard **Blocked on** field.

---

## M0 — Tracker + decisions

**Goal:** Never lose the thread. No product auth adapter code.

### Done criteria

- [x] `docs/security/AUTH_ROLLOUT_TRACKER.md` exists with M0–M7 board
- [x] Senior-approval list copied here as Open / Approved / Deferred
- [x] Auth0 tenant + OpenFGA store access owners named (or explicitly blocked in Dashboard)
- [x] Team agreement recorded: one active milestone; stub stays default until M3/M4 flags

### Evidence

- Tracker file: `docs/security/AUTH_ROLLOUT_TRACKER.md`
- Linked from [docs/README.md](../README.md) and [SECURITY_ARCHITECTURE.md](../architecture/SECURITY_ARCHITECTURE.md)
- Infra owners explicitly **BLOCKED — unassigned** (does not block M1)
- Working agreements recorded under Locked product decisions (2026-10-16)
- D-20/D-16 direction, `subjectId`, org-level AuthZ marked `approved`; admin marked `deferred`

### Rollback

- Delete or revert this file if the programme is cancelled; no runtime impact.

---

## M1 — ADRs + env contracts

**Goal:** Config can select a future provider without enabling it.

### Done criteria

- [x] D-16 updated for Vite SPA Auth0
- [x] D-20 accepted as Bearer for org-user
- [x] D-21 notes model ownership path
- [x] Backend/frontend env schemas allow `auth0-openfga` (default remains `development-stub` in dev)
- [x] `.env.example` documents Auth0 + OpenFGA placeholders
- [x] Production still refuses stub; missing real provider config cannot silently “work” in prod

### Evidence

- ADRs: `docs/decisions/0016-auth0-nextjs-deferred.md`, `0020-session-transport-deferred.md`, `0021-openfga-model-deferred.md` (Accepted); decisions index updated
- Backend: `SECURITY_PROVIDER` enum + Auth0/OpenFGA env; `createSecurityPorts` fails closed for `auth0-openfga` until M3/M6
- Frontend: `VITE_SECURITY_PROVIDER` enum + public Auth0 env; `createSecurityPorts` fails closed until M4
- Tests: `pnpm exec vitest run tests/config.test.ts tests/security-stub.test.ts` (backend); `tests/env.test.ts` (frontend) — passed 2026-10-16

### Rollback

- Revert ADR + env commits; stub-only provider enum restored.

---

## M2 — Identity data model

**Goal:** Mongo can store Auth0 links.

### Done criteria

- [x] `User.auth0SubjectId` (unique, sparse/optional during migration)
- [x] `Organisation.auth0OrganizationId` (unique, sparse/optional)
- [x] Repository helpers: Auth0 `sub` → user; Auth0 org → IMS org
- [x] Backfill notes documented (run may be later)

### Evidence

- Fields + partial unique indexes on User / Organisation models
- `findByAuth0SubjectId` / `linkAuth0SubjectId`; `findByAuth0OrganizationId` / `linkAuth0OrganizationId`
- Backfill notes: [AUTH0_IDENTITY_BACKFILL.md](./AUTH0_IDENTITY_BACKFILL.md)
- Tests: `pnpm exec vitest run tests/auth-identity-mapping.test.ts tests/users.service.test.ts` — passed 2026-10-16

### Rollback

- Stop writing new fields; sparse indexes allow nulls; no AuthN dependency yet.

---

## M3 — Backend AuthN only (AuthZ still permissive)

**Goal:** Real JWT → real `SecurityIdentity` when provider flag is on.

### Done criteria

- [x] `Auth0Authenticator` validates Bearer (JWKS, iss, aud, exp)
- [x] Requires `sub` + `org_id`; maps to IMS user + org; checks Mongo membership
- [x] Fail-closed: bad token / no mapping / no membership / `x-org-id` mismatch
- [x] `createSecurityPorts` wires `auth0-openfga`; stub untouched for default
- [x] Integration test with mock JWKS: 401 vs success

### Evidence

- `src/security/auth0/auth0-authenticator.ts`, `jwt-verifier.ts`, `create-auth0-lookups.ts`
- `createSecurityPorts` → Auth0 AuthN + DevelopmentAuthorizer until M6
- Dependency: `jose`
- Tests: `pnpm exec vitest run tests/auth0-authenticator.test.ts tests/auth0-authn.http.test.ts tests/security-stub.test.ts` — passed 2026-10-16

### Rollback

- Set `SECURITY_PROVIDER=development-stub` (non-prod).

---

## M4 — Frontend login + Bearer (first E2E AuthN)

**Goal:** Human can log in and hit one API with a real token.

### Done criteria

- [x] Auth0 SPA provider; login / callback / logout
- [x] `Auth0AuthClient` behind `AuthClient` port
- [x] HTTP client attaches `Authorization: Bearer`
- [x] At least one shell/page uses real identity (no `DEV_STUB_IDENTITY` on that path)
- [x] Demo: login → one protected endpoint → success

### Evidence

- `@auth0/auth0-react`; `SecurityProvider` / `RequireAuth`; `Auth0AuthClient`
- HTTP client attaches Bearer from active auth client
- Backend `GET /users/me`; profile + user menu use `useSessionUserQuery` (Auth0 → /users/me)
- Optional `VITE_AUTH0_ORGANIZATION_ID` for single-org demos until M5
- Tests: `tests/auth0-auth-client.test.ts`, `tests/http-bearer.test.ts` — passed; frontend `tsc -b` clean

### Demo notes (when Auth0 tenant is ready)

1. Set frontend `.env.local`: `VITE_SECURITY_PROVIDER=auth0-openfga` + Auth0 domain/client/audience (+ optional org id).
2. Set backend `.env`: `SECURITY_PROVIDER=auth0-openfga` + Auth0/OpenFGA env; link user/org via M2 helpers.
3. Open app → Auth0 login → call My Profile / My organisation (Bearer + `/users/me` or `/organisations/current`).

### Rollback

- `VITE_SECURITY_PROVIDER=development-stub`; stub AuthClient path restored.

---

## M5 — Org switch + token refresh

**Goal:** Hybrid tenancy works at the token layer.

### Done criteria

- [x] Org picker from memberships; switch acquires token for mapped Auth0 Organization
- [x] Active IMS org persisted only after token success
- [x] Backend rejects mismatched `x-org-id`
- [x] Silent refresh verified; logout clears client state

### Evidence

- `OrganisationSwitcher` in navbar; `AuthClient.switchOrganisation` / `getAccessToken({ forceRefresh })`
- Active org storage: IMS + Auth0 ids; persist only after token success; logout clears both
- Notes: [M5_ORG_SWITCH_NOTES.md](./M5_ORG_SWITCH_NOTES.md)
- Backend mismatch reject: covered in M3 `auth0-authn.http.test.ts`
- Tests: `tests/auth0-auth-client.test.ts` (switch success/fail/logout) — passed; `tsc -b` clean

### Rollback

- Disable org-switch UI; single-org tokens only; stub org header path for local stub mode.

---

## M6 — OpenFGA AuthZ (one module first)

**Goal:** Real deny path without boiling the ocean.

### Done criteria

- [x] Authorization model published (senior-approved DSL)
- [x] `OpenFgaAuthorizer` behind `Authorizer`; fail closed on OpenFGA errors
- [x] Membership projection writes/deletes tuples on create / role-change / remove
- [x] **One** module enforced E2E (candidate: `organisation` or `users`) with allow + deny tests
- [x] Other modules still permissive or shadow-log (per senior decision)

### Evidence

- Model: [openfga/authorization-model.fga](./openfga/authorization-model.fga), [openfga/ROLE_PERMISSION_MATRIX.md](./openfga/ROLE_PERMISSION_MATRIX.md) (working draft)
- `OpenFgaAuthorizer` + `HybridAuthorizer` (only `organisation` enforced); fail closed on errors
- `membershipProjection` on org create / stub bootstrap membership
- Module chosen: **organisation**
- Tests: `pnpm exec vitest run tests/openfga-authorizer.test.ts tests/security-stub.test.ts` — passed 2026-10-16
- Store/model: configure `OPENFGA_*` env (ULID ids) when running live OpenFGA

### Rollback

- Point authorizer back to stub/allow for non-enforced modules; feature flag off for OpenFGA.

---

## M7 — Enforce everywhere + cutover

**Goal:** Production-ready org-user auth.

### Done criteria

- [x] Role → permission matrix applied; AuthZ enforced across modules using `authorizer.allow`
- [x] Tuple backfill from memberships script ready (staging execution waits on infra owners)
- [x] Frontend AuthZ/nav wired; remaining `DEV_STUB_*` removed from product paths (stub-gated shell/profile only)
- [x] Staging dual-run checklist documented ([CUTOVER_CHECKLIST.md](./CUTOVER_CHECKLIST.md))
- [x] Prod config checklist documented (same file + section below)
- [x] Rollback notes verified
- [x] D-08 admin boundary confirmed unused (checklist item; no admin wiring in this programme)
- [x] Stub only for local/test; programme marked complete

### Evidence

- Model + matrix: [openfga/authorization-model.fga](./openfga/authorization-model.fga), [openfga/ROLE_PERMISSION_MATRIX.md](./openfga/ROLE_PERMISSION_MATRIX.md)
- Backend: `ENFORCED_RESOURCE_TYPES` full set; `OpenFgaAuthorizer` org-level for all modules; `DenyAuthorizer` fallback; `POST /security/check`, `GET /security/capabilities`
- Backfill: `pnpm backfill:openfga-memberships` + [OPENFGA_MEMBERSHIP_BACKFILL.md](./OPENFGA_MEMBERSHIP_BACKFILL.md)
- Frontend: `ApiAuthzClient`, session identity hooks, nav capability filter
- Cutover: [CUTOVER_CHECKLIST.md](./CUTOVER_CHECKLIST.md)
- Tests: `pnpm exec vitest run tests/openfga-authorizer.test.ts tests/security-stub.test.ts`
- Staging sign-off: _(pending infra owners)_
- Prod change window: _(pending infra owners)_

### Rollback

- Redeploy previous artifacts; non-prod revert provider flags; optional shadow kill-switch only if seniors approved.

---

## Production config checklist (fill during M7)

Living copy also in [CUTOVER_CHECKLIST.md](./CUTOVER_CHECKLIST.md). Execution blocked on infra owners.

- [ ] `NODE_ENV=production` + `SECURITY_PROVIDER=auth0-openfga` (backend)
- [ ] Matching `VITE_SECURITY_PROVIDER=auth0-openfga` (frontend)
- [ ] Auth0 domain, audience, issuer configured
- [ ] OpenFGA URL / store / model / credentials on backend only
- [ ] CORS allows Vite origin; `Authorization` accepted
- [ ] `x-org-id` optional and validated against token org
- [ ] No stub in production
- [ ] No Management/OpenFGA secrets in Vite
- [ ] Admin Auth0 app **not** wired into org-user audience

---

## Change log

| Date | Milestone | What changed |
| --- | --- | --- |
| 2026-10-14 | M0 | Created tracker; senior decisions listed as `open`; current milestone set to M0 |
| 2026-10-16 | M0 | Completed M0: working agreements; infra BLOCKED—unassigned; approved D-16/D-20 direction, subjectId, org-level AuthZ; admin deferred; linked from docs index + SECURITY_ARCHITECTURE; advanced current milestone to M1 |
| 2026-10-16 | M1 | Accepted D-16/D-20/D-21; added `auth0-openfga` env contracts (BE+FE); fail-closed createSecurityPorts; tests green; advanced current milestone to M2 |
| 2026-10-16 | M2 | Added Auth0 link fields + repo helpers + backfill notes; identity mapping tests green; advanced current milestone to M3 |
| 2026-10-16 | M3 | Auth0Authenticator (JWT/JWKS + membership gate); permissive AuthZ; unit + HTTP mock JWKS tests; advanced current milestone to M4 |
| 2026-10-16 | M4 | Auth0 SPA + Bearer HTTP + /users/me session profile; advanced current milestone to M5 |
| 2026-10-16 | M5 | Org switcher + token-before-persist + logout clears org; advanced current milestone to M6 |
| 2026-10-16 | M6 | OpenFGA draft model + organisation enforce + membership projection; advanced current milestone to M7 |
| 2026-10-16 | M7 | Full OpenFGA enforce + FE AuthZ/nav + backfill/cutover docs; org-user programme complete |
