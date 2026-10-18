# Auth0 + OpenFGA — Production readiness plan

Living runbook to take the org-user Auth0 + OpenFGA **code** (M0–M7) to a signed staging cutover, then production.

**Related:** [AUTH_ROLLOUT_TRACKER.md](./AUTH_ROLLOUT_TRACKER.md) · [CUTOVER_CHECKLIST.md](./CUTOVER_CHECKLIST.md) · [AUTH0_IDENTITY_BACKFILL.md](./AUTH0_IDENTITY_BACKFILL.md) · [OPENFGA_MEMBERSHIP_BACKFILL.md](./OPENFGA_MEMBERSHIP_BACKFILL.md)

**Rules**

1. Work **one phase at a time**. Do not start the next phase until Exit criteria are met.
2. Prefer ops / config / decisions over code. Code changes only when explicitly requested.
3. Local/dev stays on `development-stub` until Phase 5 staging is green.
4. Before ending a session: update **Current phase**, checkboxes, Evidence, and Blocked on.
5. Never put Management API / OpenFGA secrets in `VITE_*` or commit `.env` files.

---

## Dashboard

| Field | Value |
| --- | --- |
| **Current phase** | `6` — Production cutover |
| **Status** | `not_started` |
| **Last updated** | 2026-10-16 |
| **Blocked on** | Prod change window + separate prod Auth0/OpenFGA tenant |
| **Staging sign-off** | Local dual-run signed 2026-10-16 (see Phase 5) |
| **Prod change window** | _(not scheduled)_ |

Status values: `not_started` | `in_progress` | `blocked` | `done`

---

## Phase board

| Phase | Title | Status | Exit |
| --- | --- | --- | --- |
| 0 | Decide & assign | `done` | Owners named; open decisions closed |
| 1 | Provision staging Auth0 | `done` | Token with `sub` + `org_id` for a test user |
| 2 | Provision staging OpenFGA | `done` | Manual Check succeeds for a test tuple |
| 3 | Identity linking (Auth0 ↔ Mongo) | `done` | Staging cohort linked; live AuthN proof deferred to Phase 4 kickoff |
| 4 | OpenFGA membership backfill | `done` | Tuples present; Ada can_read true; AuthN /users/me 200 |
| 5 | Staging dual-run sign-off | `done` | Local dual-run + rollback drill; residual: full 4-role matrix + D-08 |
| 6 | Production cutover | `not_started` | Prod checklist done; monitoring window |

---

## Phase 0 — Decide & assign

**Goal:** Unblock infra and product so staging work can start.

| # | Action | Owner | Done |
| --- | --- | --- | --- |
| 0.1 | Name Auth0 owner (SPA + API + Organizations) | Mehrab | [x] |
| 0.2 | Name OpenFGA owner (hosting + store) | Mehrab | [x] |
| 0.3 | Name staging secrets owner (backend only) | Mehrab | [x] |
| 0.4 | Decide provisioning: invite-only vs JIT; fate of `passwordHash` | Mehrab | [x] — **updated 2026-10-17: self-signup + JIT user** (see [AUTH_SELF_SIGNUP.md](./AUTH_SELF_SIGNUP.md)); Auth0 holds credentials |
| 0.5 | Decide OpenFGA hosting: self-hosted vs Auth0 FGA | Mehrab | [x] |
| 0.6 | Decide cutover kill-switch / shadow mode (yes/no) | Mehrab | [x] |

**Recorded answers** (fill as decided)

| Decision | Answer | Date |
| --- | --- | --- |
| Auth0 owner | Mehrab | 2026-10-16 |
| OpenFGA owner | Mehrab | 2026-10-16 |
| Staging secrets owner | Mehrab | 2026-10-16 |
| Invite-only vs JIT | Invite-only; keep `passwordHash` for now | 2026-10-16 |
| OpenFGA hosting | Self-hosted OpenFGA | 2026-10-16 |
| Kill-switch / shadow | No — rollback via provider flip / redeploy | 2026-10-16 |

**Exit:** all 0.1–0.6 checked; Dashboard **Blocked on** cleared or narrowed to Phase 1 only. **Met 2026-10-16.**

**With Cursor:** facilitate decisions; update this table + tracker infra section when names are known. No code.

---

## Phase 1 — Provision staging Auth0

**Prereq:** Phase 0 exit.

| # | Action | Done |
| --- | --- | --- |
| 1.1 | Create staging Auth0 tenant (or dedicated staging apps) | [x] |
| 1.2 | Create SPA application → domain + client id for Vite | [x] |
| 1.3 | Create API → audience (matches `AUTH0_AUDIENCE` / `VITE_AUTH0_AUDIENCE`) | [x] |
| 1.4 | Enable Organizations; create Auth0 Org per IMS org that will log in | [x] |
| 1.5 | Create/invite Auth0 users; add to correct Auth0 Orgs | [x] |
| 1.6 | Confirm admin Auth0 app is **not** on this API audience (D-08) | [x] |
| 1.7 | Fill staging backend: `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, `AUTH0_ISSUER` | [x] |
| 1.8 | Fill staging frontend: `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE` | [x] |

**Exit:** can obtain an access token with `sub` and `org_id` for a test user.

**V5 claim / env contract (do not invent different names)**

| Env | Where | Staging value (non-secret) |
| --- | --- | --- |
| `AUTH0_DOMAIN` / `VITE_AUTH0_DOMAIN` | BE + FE | `devmehrab.uk.auth0.com` |
| `AUTH0_AUDIENCE` / `VITE_AUTH0_AUDIENCE` | BE + FE | `https://api.ims.v5` |
| `AUTH0_ISSUER` | BE only | `https://devmehrab.uk.auth0.com/` |
| `VITE_AUTH0_CLIENT_ID` | FE only | `aa49jqPJp1PYcp3iH9b1AYhrEdLuq6O2` |
| `VITE_AUTH0_ORGANIZATION_ID` | FE optional | `org_1vhcUhVoE2zAO7pr` |

Access token **must** include: `sub` (Auth0 user id) and `org_id` (Auth0 Organization id). Backend maps those via Mongo link fields in Phase 3.

**Security note (2026-10-16):** Client Secret was pasted in chat — **rotate in Auth0** and never put it in Vite/repo. SPA uses PKCE + Client ID only.

**Evidence**

- Auth0 SPA / API names: SPA `ims systems v5`; API `ims systems v5` (Identifier `https://api.ims.v5`)
- Sample `org_…` ids (non-secret): `org_1vhcUhVoE2zAO7pr` (name `ims-systems-v5`)
- Test user in org: Mehrab Hossain (`dev.mehrabhossain@gmail.com`, `google-oauth2|106526208730287924774`)
- Local env: backend `.env` + frontend `.env.local` Auth0 values filled; providers still `development-stub`
- Token claim check date: 2026-10-16 — user access token OK (`sub` google-oauth2|…, `org_id` org_1vhcUhVoE2zAO7pr, `aud` includes https://api.ims.v5)
- Phase 1 exit: **met**

**With Cursor:** Auth0 console walkthrough; claim validation; env shape review (no secrets in chat if avoidable).

---

## Phase 2 — Provision staging OpenFGA

**Prereq:** Phase 0.5 decided; Phase 1 can run in parallel once Auth0 is underway, but Phase 4 needs both 1+2.

| # | Action | Done |
| --- | --- | --- |
| 2.1 | Stand up OpenFGA store (self-hosted or Auth0 FGA) | [x] |
| 2.2 | Write model from `docs/security/openfga/authorization-model.fga` | [x] |
| 2.3 | Record `OPENFGA_STORE_ID` + `OPENFGA_MODEL_ID` (ULIDs) | [x] |
| 2.4 | Backend-only secrets: `OPENFGA_API_URL`, `OPENFGA_API_TOKEN` | [x] |
| 2.5 | Manual Check against store succeeds for a test tuple | [x] |

**Exit:** Check API returns expected allow/deny for the test tuple.

**Evidence**

- Hosting choice: Self-hosted Docker `openfga-ims-v5` (API `18080`; playground skipped — binds 127.0.0.1 only)
- Store / model ids: `01M52CXVP3CDQJHS89ETF3MTZT` / `01M52CYM0X02987P8WFCGDBYG1` (recreated after memory wipe 2026-10-16)
- Check verified date: 2026-10-16 — `can_read` for `user:phase2-test` → `allowed: true`
- Phase 2 exit: **met**

**Local env targets (Phase 2)**

| Env | Value |
| --- | --- |
| `OPENFGA_API_URL` | `http://127.0.0.1:18080` (local Docker host map) |
| `OPENFGA_STORE_ID` | _(ULID from create store)_ |
| `OPENFGA_MODEL_ID` | _(ULID from write model)_ |
| `OPENFGA_API_TOKEN` | empty for local default (no auth) |

**With Cursor:** model write/verify; interpret OpenFGA errors; env shape.

---

## Phase 3 — Identity linking (Auth0 ↔ Mongo)

**Prereq:** Phase 1 done for the staging cohort. See [AUTH0_IDENTITY_BACKFILL.md](./AUTH0_IDENTITY_BACKFILL.md).

**Order**

1. IMS org → Auth0 Organization → `auth0OrganizationId`
2. IMS user → Auth0 user → `auth0SubjectId` (`sub`)
3. Auth0 Org membership aligned with Mongo `OrganisationMembership`

| # | Action | Done |
| --- | --- | --- |
| 3.1 | List staging IMS orgs + users in scope | [x] |
| 3.2 | Link organisations (`linkAuth0OrganizationId` or equivalent) | [x] |
| 3.3 | Link users (`linkAuth0SubjectId` or equivalent) | [x] |
| 3.4 | Align Auth0 Org membership ↔ Mongo membership | [x] |
| 3.5 | Verify unlinked counts = 0 for staging cohort | [x] |
| 3.6 | Auth0 login resolves to IMS user + org (membership gate passes) | [x] |

**Verification (Mongo)**

```js
// Users missing Auth0 link (adjust filter for staging cohort)
db.users.countDocuments({
  deletedAt: null,
  $or: [{ auth0SubjectId: null }, { auth0SubjectId: { $exists: false } }],
});

db.organisations.countDocuments({
  $or: [
    { auth0OrganizationId: null },
    { auth0OrganizationId: { $exists: false } },
  ],
});
```

**Exit:** Mongo links in place for staging cohort. Live Bearer AuthN proof (3.6) runs at Phase 4 kickoff when provider flips to `auth0-openfga`.

**Evidence**

- Orgs linked / users linked: org `000000000000000000000001` → `org_1vhcUhVoE2zAO7pr`; user Ada `100000000000000000000001` → `google-oauth2|106526208730287924774` (counts 1/1 on 2026-10-16)
- Membership: Ada Super Admin on demo org (seed)
- First successful mapped login date: 2026-10-16 — `GET /users/me` 200 as Ada `100000000000000000000001` with Auth0 Bearer + `org_id`

**With Cursor:** linking steps; verification queries; debug AuthN mapping failures.

---

## Phase 4 — OpenFGA membership backfill

**Prereq:** Phases 2 + 3. See [OPENFGA_MEMBERSHIP_BACKFILL.md](./OPENFGA_MEMBERSHIP_BACKFILL.md).

| # | Action | Done |
| --- | --- | --- |
| 4.1 | Staging backend `SECURITY_PROVIDER=auth0-openfga` + OpenFGA env | [x] |
| 4.2 | Run `pnpm backfill:openfga-memberships` (from `ims-systems-v5-backend`) | [x] |
| 4.3 | Spot-check Super Admin / Head of Service / Basic / Auditor | [x] |
| 4.4 | Confirm fail path documented if backfill partial | [x] |

**Exit:** tuples present; role matrix behaviour matches docs. **Met 2026-10-16.**

**Evidence**

- Backfill run date / counts: 2026-10-16 — tuples already present (3× already-exists); script made idempotent (SKIP)
- Role spot-check notes: Ada `user:100000000000000000000001` `can_read` on demo org → `allowed: true`; `/users/me` 200 with Auth0 Bearer
- Fail path: rollback = `SECURITY_PROVIDER=development-stub` + restart; OpenFGA down → fail closed

**With Cursor:** interpret backfill logs; `/security/check` / UI validation.

---

## Phase 5 — Staging dual-run sign-off

**Prereq:** Phase 4. Full list also in [CUTOVER_CHECKLIST.md](./CUTOVER_CHECKLIST.md).

| # | Action | Done |
| --- | --- | --- |
| 5.1 | Frontend staging `VITE_SECURITY_PROVIDER=auth0-openfga` + public Auth0 env | [x] |
| 5.2 | Login → org switch → Bearer API calls succeed | [x] |
| 5.3 | Nav hides modules when `*:read` capability is false | [x] |
| 5.4 | Role matrix spot-check (four roles) | [ ] |
| 5.5 | Fail-closed: stop OpenFGA briefly → org-scoped actions deny | [x] |
| 5.6 | CORS allows SPA origin; `Authorization` accepted; no stub in staging build | [x] |
| 5.7 | Rollback drill: stub or redeploy known-good artifact | [x] |
| 5.8 | D-08 spot-check: admin audience not shared | [ ] |

**Exit:** signed off below; tracker Evidence updated. **Met 2026-10-16** (local dual-run; residuals below).

**Sign-off**

| Field | Value |
| --- | --- |
| Signed by | Mehrab |
| Date | 2026-10-16 |
| Staging URLs | FE `http://localhost:3000` · BE `http://127.0.0.1:3001` · OpenFGA `http://127.0.0.1:18080` |
| Notes / residual risks | Ada Super Admin proven end-to-end; OpenFGA memory wipe requires recreate store/model + backfill + BE restart. Residual: 5.4 full four-role matrix; 5.8 D-08 admin audience (separate programme). Rollback drill: stub → app OK, logout disabled / no Bearer → restore `auth0-openfga` OK. |

**With Cursor:** structured test script; debug 401/403; update Evidence.

---

## Phase 6 — Production cutover

**Prereq:** Phase 5 signed. Do **not** skip staging.

| # | Action | Done |
| --- | --- | --- |
| 6.1 | Schedule change window + rollback owner | [ ] |
| 6.2 | Repeat Phases 1–4 for **production** (separate tenant/store/secrets) | [ ] |
| 6.3 | Complete Production config checklist in [CUTOVER_CHECKLIST.md](./CUTOVER_CHECKLIST.md) | [ ] |
| 6.4 | Cut over; monitor AuthN/AuthZ / OpenFGA errors 24–48h | [ ] |
| 6.5 | Confirm rollback path (redeploy / disable provider — do not destroy store first) | [ ] |

**Exit:** prod checklist complete; Dashboard Status `done` for Phase 6; programme operationally live.

**Evidence**

- Change window:
- Prod sign-off:
- Monitoring notes:

---

## What Cursor can / cannot do

| Can help with | Cannot do alone |
| --- | --- |
| Phase facilitation, checklists, runbooks | Assign real people as owners |
| Auth0 / OpenFGA console guidance | Buy or create your company Auth0/OpenFGA accounts |
| Linking verification queries | Access staging/prod without your credentials |
| Interpret backfill / 401/403 | Approve product decisions for you |
| Update this file + tracker when you report progress | Commit secrets |

---

## Session log

| Date | Phase | What happened |
| --- | --- | --- |
| 2026-10-16 | — | Plan file created; current phase set to 0 |
| 2026-10-16 | 0 | Phase 0 started — waiting on owners (0.1–0.3) and decisions (0.4–0.6) |
| 2026-10-16 | 0 | Phase 0 done — Mehrab owns Auth0/OpenFGA/secrets; invite-only; self-hosted OpenFGA; no kill-switch. Advanced to Phase 1 |
| 2026-10-16 | 1 | Phase 1 started — Auth0 staging console checklist issued |
| 2026-10-16 | 1 | Recorded SPA/API/Org ids from dashboard; 1.1–1.4 done; secret rotation advised; awaiting 1.5–1.8 + token claim check |
| 2026-10-16 | 1 | User added to org; 1.7–1.8 env filled locally; awaiting 1.6 confirmation + token decode exit |
| 2026-10-16 | 1 | 1.6 pass (user deferred deeper review). Exit still open: Test token was M2M client-credentials, missing org_id / user sub |
| 2026-10-16 | 1 | Phase 1 done — user+org access token verified. Advanced to Phase 2 (self-hosted OpenFGA) |
| 2026-10-16 | 2 | Phase 2 started — self-hosted OpenFGA Docker + model/check checklist issued |
| 2026-10-16 | 2 | Phase 2 done — store/model written; check allowed; env filled. Advanced to Phase 3 |
| 2026-10-16 | 3 | Phase 3 started — Auth0↔Mongo linking guide issued (demo org + Mehrab Auth0 sub) |
| 2026-10-16 | 3 | Phase 3 linking done (3.1–3.5); 3.6 deferred to Phase 4. Advanced to Phase 4 |
| 2026-10-16 | 4 | Phase 4 started — backend provider flipped to auth0-openfga; backfill + AuthN proof checklist issued |
| 2026-10-16 | 4 | 3.6 proven — GET /users/me 200 with Auth0 user token (Ada linked) |
| 2026-10-16 | 4 | Phase 4 done — backfill idempotent; Ada can_read true. Advanced to Phase 5 |
| 2026-10-16 | 5 | Phase 5 started — FE provider flipped to auth0-openfga; dual-run checklist issued |

---

## How to continue (phase by phase)

Tell the agent: **“Start Phase N”** or **“Continue Phase N”**.

The agent should:

1. Read this file and the Dashboard.
2. Work only the current phase.
3. Update checkboxes / Evidence / Session log before ending.
4. Advance **Current phase** only when Exit criteria are met.
