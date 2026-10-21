# Dev / demo stub cutover — Auth0+OpenFGA production

Living inventory of **demo / DevAll / NoOp defaults** that must not remain active when `SECURITY_PROVIDER=auth0-openfga` (and matching `VITE_SECURITY_PROVIDER=auth0-openfga`).

**Related:** [PRODUCTION_READINESS_PLAN.md](./PRODUCTION_READINESS_PLAN.md) · [CUTOVER_CHECKLIST.md](./CUTOVER_CHECKLIST.md) · [AUTH_ROLLOUT_TRACKER.md](./AUTH_ROLLOUT_TRACKER.md) · [LICENCE_SOURCE_OF_TRUTH.md](./LICENCE_SOURCE_OF_TRUTH.md)

---

## Policy (locked)

| Mode | Rule |
| --- | --- |
| `SECURITY_PROVIDER=development-stub` | **Keep stubs.** App must work for local/UI testing without Auth0 or OpenFGA. |
| `SECURITY_PROVIDER=auth0-openfga` | **Zero demo/dev stub behaviour on live paths.** Real AuthN, AuthZ, memberships, scopes, and side-effect ports. |
| `NODE_ENV=production` | `development-stub` is already **forbidden** by env validation. |

Stubs may **exist in the codebase** as classes for stub mode / tests. What must not happen in auth0-openfga mode is wiring those stubs as the **default runtime** for org-user traffic.

---

## How to use this file

1. Work **one module (or one P0 item) at a time**.
2. Prompt example: *“Fix DEV_STUB cutover item U-01 (Users membership) for auth0-openfga; keep development-stub working.”*
3. After each fix: tick the box, set **Status** → `done`, note PR / date under Evidence.
4. Do not mark an item `done` if auth0-openfga still falls back to `DevAll*` / fake membership / demo stores.
5. If blocked on missing infra, leave Status `blocked` and fill **Blocked on**.

Status values: `todo` | `in_progress` | `blocked` | `done` | `n/a_stub_only`

---

## Dashboard

| Field | Value |
| --- | --- |
| **Last updated** | 2026-10-19 |
| **P0 remaining** | None (U-01…U-03, O-01 done) |
| **Ready for prod (auth0-openfga)** | **P0 clear; C-01/C-02 done** — P1 accepted org-wide lists; LIC-01 app done (Stripe staging smoke open) |

---

## Severity legend

| Tier | Meaning |
| --- | --- |
| **P0** | Cross-tenant / identity leak risk — **blocker** |
| **P1** | Within-org over-visibility (`DevAll*ListScope`) — fix before serious multi-role prod |
| **P2** | Entitlement / licence stubs — commercial / product correctness |
| **P3** | NoOp side effects (email, calendar, promotion) — incomplete product, usually not a tenant leak |
| **P4** | Frontend demo UX / placeholders |
| **OK** | Intentionally stub-only when `development-stub`; must not run in auth0-openfga |

---

## P0 — Membership / identity (cross-tenant blockers)

### U-01 — Users directory uses `DevAllActiveUsersMembershipAdapter`

- [x] Status: `done`
- **Risk:** `GET /users` (and member checks) treat **every Active Mongo user** as a member of the caller’s org.
- **Where:**
  - Default: `ims-systems-v5-backend/src/modules/users/routes/users.routes.ts`
  - Wired: `createUsersModule({ authorizer })` only — `ims-systems-v5-backend/src/app/routes/v1/index.ts`
  - Adapter: `ims-systems-v5-backend/src/modules/users/ports.ts` (`DevAllActiveUsersMembershipAdapter`)
- **Fix for auth0-openfga:** Inject a real `MembershipLookupPort` backed by organisation memberships (existing org membership repository / Mongo), selected when `SECURITY_PROVIDER=auth0-openfga`. Keep Dev adapter for `development-stub`.
- **Blocked on:** Nothing fundamental — real membership store already exists under organisation module. Needs wiring + tests.
- **Evidence:** 2026-10-19 — `createOrganisationMembershipLookupAdapter` injected from `v1/index.ts` when `SECURITY_PROVIDER=auth0-openfga`; DevAll remains default for development-stub. Test: `organisation-membership-lookup.adapter.test.ts`. Smoke: auth0-openfga Users list scoped to `organisation_memberships` only.

### U-02 — Functional units reuse DevAll users membership

- [x] Status: `done`
- **Risk:** Same fake “all active users are members” for FU user/member flows.
- **Where:** `ims-systems-v5-backend/src/modules/functional-units/routes/functional-unit.routes.ts` (constructs `DevAllActiveUsersMembershipAdapter`)
- **Fix:** Share the same real membership lookup as U-01 in auth0-openfga mode.
- **Blocked on:** U-01 pattern (same port).
- **Evidence:** 2026-10-19 — same adapter injected into `createFunctionalUnitModule` via `v1/index.ts` when auth0-openfga.

### U-03 — Tasks module constructs DevAll users membership

- [x] Status: `done`
- **Risk:** Task assignee / membership-adjacent paths can assume all users are in-org.
- **Where:** `ims-systems-v5-backend/src/modules/tasks/routes/task.routes.ts`
- **Fix:** Same as U-01/U-02 — inject real membership lookup in auth0-openfga.
- **Blocked on:** U-01.
- **Evidence:** 2026-10-19 — same adapter injected into `createTaskModule` via `v1/index.ts` when auth0-openfga.

### O-01 — Organisation `GET /current` auto-provisions stub tenant

- [x] Status: `done`
- **Risk / behaviour:** Dev-oriented auto-provision of a fixed stub organisation when seed missing.
- **Where:** `organisation.service.ts` / `organisation.repository.ts` (comments reference development-stub / seed:demo)
- **Fix:** Gate stub auto-provision strictly behind `SECURITY_PROVIDER=development-stub`. Never in auth0-openfga.
- **Blocked on:** None.
- **Evidence:** 2026-10-19 — `allowStubOrganisationAutoProvision` only when `SECURITY_PROVIDER=development-stub` in `v1/index.ts`. Test: `organisation-stub-auto-provision.test.ts`. Smoke: development-stub still bootstraps `/organisations/current`; auth0-openfga returns 404 if org missing.

---

## P1 — `DevAll*ListScope` (within-org “see everything”)

These adapters resolve `{ mode: "all" }`. Lists are usually still filtered by **`organizationId`**, so this is **not** the same as the Users cross-tenant leak — but every caller with module `read` can see **all org records**, not a real BU/role visibility subset.

**Infra note:** OpenFGA today is largely **org-level** relations (`can_read` on organisation). True row-level / BU list scopes need either:

- OpenFGA **ListObjects** (or equivalent) + model relations for resources, **or**
- Mongo filters from membership / functional-unit membership.

Until that exists, items below may be **`blocked`** on “list-scope infra”.

| ID | Module | Default adapter location | Status | Blocked on |
| --- | --- | --- | --- | --- |
| L-01 | Incidents | `incidents/routes/incident.routes.ts` → `DevAllIncidentsListScopeAdapter` | `todo` | List-scope design (OpenFGA ListObjects and/or BU filters) |
| L-02 | Risks | `risks/routes/...` → `DevAllRisksListScopeAdapter` | `todo` | Same |
| L-03 | Audits | `audits/routes/...` → `DevAllAuditsListScopeAdapter` | `todo` | Same |
| L-04 | OFIs | `ofi/routes/...` → `DevAllOfisListScopeAdapter` | `todo` | Same |
| L-05 | Customers | `customers/routes/...` → `DevAllCustomersListScopeAdapter` | `todo` | Same |
| L-06 | Suppliers | `suppliers/routes/...` → `DevAllSuppliersListScopeAdapter` | `todo` | Same |
| L-07 | Activities | `activities/routes/...` → `DevAllActivitiesListScopeAdapter` | `todo` | Same |
| L-08 | Calendar | `calendar/...` → `DevAllCalendarListScopeAdapter` | `todo` | Same |
| L-09 | KPI objectives | `kpi-objectives/...` → `DevAllKpiObjectivesListScopeAdapter` | `todo` | Same |
| L-10 | Management reviews | `management-reviews/...` → `DevAllManagementReviewsListScopeAdapter` | `todo` | Same |

**P1 decision (2026-10-19):** **Accept org-wide lists temporarily** for staging / early auth0-openfga. OpenFGA org-level `can_read` remains the AuthZ gate; L-01…L-10 stay `todo` until list-scope infra is authorized. Do **not** delete `DevAll*ListScope` until a real scope implementation lands.

---

## P2 — Entitlement / licence stubs

### C-01 — Compliance licences always “all toolkits”

- [x] Status: `done`
- **Where:** `compliance/routes/compliance.routes.ts` → `DevAllComplianceLicencesAdapter`
- **Effect:** Every compliance toolkit appears licensed.
- **Fix:** Real `ComplianceLicencePort` reading `organisation.licences.complianceTools` (see SoT).
- **Blocked on:** None.
- **Evidence:** 2026-10-19 — `createOrganisationComplianceLicenceAdapter` injected in `v1/index.ts` when `SECURITY_PROVIDER=auth0-openfga`; DevAll kept for development-stub. SoT: [LICENCE_SOURCE_OF_TRUTH.md](./LICENCE_SOURCE_OF_TRUTH.md). Test: `organisation-compliance-licence.adapter.test.ts`. Smoke: Go Live with one toolkit → compliance list shows only that toolkit.

### C-02 — Compliance evidence links always allowed

- [x] Status: `done`
- **Where:** `compliance/routes/compliance.routes.ts` → `DevAllowEvidenceLinksAdapter` (default when omitted)
- **Effect:** Linked risk/incident/CIP/document ids were not validated (or OpenFGA stub `getById` fail-closed).
- **Fix:** `createComplianceEvidenceLinkAdapter` uses org-scoped repository existence (risk/incident/ofi/document-tree); wired from `v1/index.ts`. Action AuthZ remains Compliance create. DevAllow only when adapter omitted.
- **Blocked on:** None.
- **Evidence:** 2026-10-19 — repo-based integrity (no stub identity). Test: `compliance-evidence-link.adapter.test.ts`.

### LIC-01 — FE licence request / Stripe “demo allocation”

- [ ] Status: `partial` (app done; staging smoke pending)
- **Where:** FE `request-licence-sheet.tsx`, `organisation-licences-panel.tsx`
- **Fix:** Real billing / request workflow per [stripe-payments.md](../module-specifications/stripe-payments.md).
- **Done (2026-10-19):** Backend `STRIPE_ENABLED` + FE Card payment / Manage billing session redirects; licence request upgrades Stripe when subscribed.
- **Done (2026-10-21):** Full Licence Request module — `licence-requests` records with `LR-` references, auto-approve (record stays `Pending` if allocation/Stripe fails), support + Super Admin emails, org-side history in the Licenses panel.
- **Still open:** Staging smoke with Stripe test mode / CLI webhook forward; iMS admin approve/cancel surface (no platform-admin UI in V5).
- **Evidence:** [stripe-payments.md](../module-specifications/stripe-payments.md); tests `stripe-payment.service.test.ts`, `organisation-billing.service.test.ts`.

---

## P3 — NoOp side-effect ports (incomplete product)

Safe to ship only if product accepts “feature does nothing.” For auth0-openfga “100% actual,” each used path needs a live adapter.

Wire what already exists in `v1/index.ts` first; leave NoOp only when the integration truly does not exist.

| ID | Area | Examples | Status | Blocked on |
| --- | --- | --- | --- | --- |
| N-01 | Notifications | Several modules default `NoOp*NotificationAdapter` unless v1 wires live adapter | `done` | Audited 2026-10-19 — risks/incidents/audits/ofi/tasks/docs/compliance/suppliers/customers/kpi/MR wired in `v1/index.ts`. Users welcome-email port remains NoOp (no live adapter yet; not N-01 scope). |
| N-02 | Calendar mirrors | `NoOp*CalendarAdapter` defaults | `done` | Audited 2026-10-19 — task/incident/audit/supplier/MR calendar adapters wired in `v1/index.ts`. |
| N-03 | Task cleanup / source tasks | Some `NoOp*TaskAdapter` remain if not injected | `done` | Audited 2026-10-19 — risk/incident/audit/ofi/supplier/customer/MR task cleanup adapters wired via `createTasksSourceCleanupAdapter`. |
| N-04 | Compliance mirrors | Risk/incident/OFI ↔ compliance NoOps (some wired in v1, verify auth0 path) | `done` | Audited 2026-10-19 — risk/incident/ofi compliance link holders + compliance risk/incident/ofi mirrors wired in `v1/index.ts` (same path for auth0-openfga). |
| N-05 | Audit promotions | Incident/risk/CIP promotion NoOps | `todo` | Cross-module promotion design |
| N-06 | Document files / activity | `NoOpDocument*` if files disabled | `done` | 2026-10-19 — `/files` + `createDocumentFilesAdapter` + activity adapter always wired when config present; auth0 boot warns on `memory`/disabled. Ops: `FILES_ENABLED=true`, `FILES_PROVIDER=local\|s3`. Test: `side-effect-ports.wiring.test.ts`. |
| N-07 | Campaign email | Falls back to NoOp when email system absent | `done` | 2026-10-19 — `createApp` always builds `EmailSystem`; campaigns use `createCampaignEmailAdapter`. Delivery still needs `EMAIL_ENABLED=true` + provider credentials. Boot warns when auth0-openfga and email disabled. |
| N-08 | Report-bug email | NoOp if email not passed | `done` | 2026-10-19 — `createReportBugEmailAdapter` from EmailSystem in module compose; `createApp` always passes email. Same ops as N-07 (`EMAIL_ENABLED` + credentials). Test: `side-effect-ports.wiring.test.ts` + `report-bug.http.test.ts`. |
| N-09 | Org Go Live side effects | `NoOpOrganisationGoLiveSideEffectsAdapter` default | `partial` | 2026-10-19 — Card Checkout + invoice support email wired; Auth0 org / compliance auto-provision / S3 bucket still open |
| N-10 | Compliance IAM grant | `NoOpComplianceIamGrantAdapter` | `todo` | Membership toolkit assignment — **likely needs infra** |
| N-11 | Compliance automation | `NoOpComplianceAutomationAdapter` | `todo` | Automation runner — **infra not built** |

---

## P4 — Frontend demo / stub UX

Allowed when `VITE_SECURITY_PROVIDER=development-stub`. Must not be the auth0-openfga experience.

| ID | Item | Where | Status | Blocked on |
| --- | --- | --- | --- | --- |
| F-01 | `DEV_STUB_*` identity helpers | `security/development-stub.ts`, session hooks, user-menu | `n/a_stub_only` if gated | None — keep gated |
| F-02 | Document signature **localStorage demo** | `use-document-signatures-store.ts`, signature dialogs | `todo` | Real signatures API / storage — **infra/API missing** |
| F-03 | Document “demo tab” placeholders | `document-demo-tab-panel.tsx` | `todo` | Product scope for those tabs |
| F-04 | Upload/sheets falling back to stub subject | e.g. `upload-document-sheet.tsx`, `new-version-sheet.tsx` | `done` | 2026-10-19 — owners/authorisers use `useSessionProfileUserId` / `useSessionSubjectId` (no hard-coded `DEV_STUB_IDENTITY`). |
| F-05 | Repository workspace demo-seed labels / stub subject | `repository-workspace.tsx` | `done` | 2026-10-19 — authorisation decide uses session subject; demo-seed label kept only as display map for historical seed ids. |

---

## OK — Must remain for `development-stub` only

Do **not** delete these; gate them.

| Item | Purpose |
| --- | --- |
| `DevelopmentAuthenticator` / `DevelopmentAuthorizer` | BE stub security |
| FE `DevelopmentAuthClient` / `DevelopmentAuthzClient` | FE stub security |
| `DevAllActiveUsersMembershipAdapter` | Directory usable without membership data |
| `DevAll*ListScopeAdapter` | Module lists without BU scope infra |
| `DevAllComplianceLicencesAdapter` | Toolkits without licence SoT |
| `pnpm seed:demo` + fixed demo ObjectIds | Local UI review |
| Env forbid: stub in `NODE_ENV=production` | Already enforced |

**Acceptance for stub mode:** With `SECURITY_PROVIDER=development-stub` (and FE match), login bypass / always-auth, create/list core modules, and Users directory remain usable without Auth0/OpenFGA.

---

## Suggested fix order (module-by-module prompts)

Use this order when asking the agent to implement:

1. **U-01 → U-02 → U-03** — real org membership for Users / FU / Tasks  
2. **O-01** — no stub org auto-create in auth0-openfga  
3. **F-04 / F-05** — FE session subject (quick)  
4. **N-01 … N-04** — wire existing notification/calendar/task/compliance adapters  
5. **P1 list-scope decision** — product call: accept org-wide lists temporarily **or** build list-scope infra then L-01…L-10  
6. **C-01 wire** — SoT done ([LICENCE_SOURCE_OF_TRUTH.md](./LICENCE_SOURCE_OF_TRUTH.md)); inject org `complianceTools` adapter for auth0-openfga  
7. **LIC-01 / F-02 / N-09…N-11** — only after billing / signatures / automation infra exists  

---

## Definition of done (auth0-openfga production)

- [x] No runtime path uses `DevAllActiveUsersMembershipAdapter` when provider is auth0-openfga  
- [x] Users list for org A never returns users who only belong to org B  
- [x] P1 either fixed or explicitly accepted in writing (org-wide list policy)  
- [x] No `DevAllComplianceLicencesAdapter` on auth0-openfga compliance path (LIC-01 Stripe app path done; staging smoke open)  
- [ ] No FE localStorage “demo signatures” as the production path  
- [ ] `development-stub` mode still boots and works for local testing  
- [ ] Staging smoke: register → onboard → Go Live → `/users` shows **only** that org’s members  

---

## Evidence log

| Date | Item | Note |
| --- | --- | --- |
| 2026-10-19 | — | Inventory created from codebase scan (defaults + DevAll / NoOp / FE demo) |
| 2026-10-19 | U-01 | Real org membership lookup for Users (auth0-openfga); adapter + v1 wire + test |
| 2026-10-19 | U-02 / U-03 | Same membership adapter injected into FU + Tasks |
| 2026-10-19 | O-01 | Stub org auto-provision gated to development-stub only |
| 2026-10-19 | F-04 / F-05 | FE document sheets/workspace use session subject/profile ids |
| 2026-10-19 | N-01…N-04 | Audit: live notification/calendar/task/compliance adapters already wired in v1 |
| 2026-10-19 | P1 | Decision: accept org-wide `DevAll*ListScope` temporarily; L-01…L-10 remain backlog |
| 2026-10-19 | N-06 | Files module + document files/activity adapters hardened; prefer `FILES_PROVIDER=local\|s3` on auth0-openfga |
| 2026-10-19 | N-07 | EmailSystem always composed in createApp; campaign adapter live; enable EMAIL_* for real delivery |
| 2026-10-19 | N-08 | Report-bug uses createReportBugEmailAdapter(EmailSystem); NoOp only when email omitted |
| 2026-10-19 | Licence SoT | [LICENCE_SOURCE_OF_TRUTH.md](./LICENCE_SOURCE_OF_TRUTH.md) — `org.licences.complianceTools` unlocks C-01 wire (LIC-01 still Stripe) |
| 2026-10-19 | C-01 | Org complianceTools adapter wired for auth0-openfga; DevAll stub-only |
| 2026-10-19 | C-02 | Evidence-link adapter uses org-scoped repos (+ documents); no OpenFGA stub getById |
| 2026-10-19 | LIC-01 / N-09 | Stripe + FE redirects + `/auth/preparation-screen` return + invoice Go Live notify; staging smoke / Auth0 org / toolkit provision remain |
