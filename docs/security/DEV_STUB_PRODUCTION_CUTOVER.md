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
| **Last updated** | 2026-10-22 (full re-audit of backend `src/app/routes/v1/index.ts` wiring + frontend stub scan) |
| **P0 remaining** | None (U-01…U-03, O-01 done) |
| **Ready for prod (auth0-openfga)** | **P0 clear; C-01/C-02 done** — P1 accepted org-wide lists; LIC-01 app done (preflight + smoke runbook written 2026-10-22; staging execution open). **2026-10-22 integrity bundle done:** A-01, FU-01, U-06, U-07, N-10. **2026-10-22 list scopes done:** L-01…L-10. Remaining from re-audit: N-15/N-17 (invoice-blocked), LIC-01 smoke, N-11 (automation), F-07 (search) |

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
| L-01 | Incidents | `incidents/routes/incident.routes.ts` → `DevAllIncidentsListScopeAdapter` | `done` | 2026-10-22 — real Mongo list scope (see below) |
| L-02 | Risks | `risks/routes/...` → `DevAllRisksListScopeAdapter` | `done` | Same |
| L-03 | Audits | `audits/routes/...` → `DevAllAuditsListScopeAdapter` | `done` | Same |
| L-04 | OFIs | `ofi/routes/...` → `DevAllOfisListScopeAdapter` | `done` | Same |
| L-05 | Customers | `customers/routes/...` → `DevAllCustomersListScopeAdapter` | `done` | Same |
| L-06 | Suppliers | `suppliers/routes/...` → `DevAllSuppliersListScopeAdapter` | `done` | Same |
| L-07 | Activities | `activities/routes/...` → `DevAllActivitiesListScopeAdapter` | `done` | Same |
| L-08 | Calendar | `calendar/...` → `DevAllCalendarListScopeAdapter` | `done` | Same |
| L-09 | KPI objectives | `kpi-objectives/...` → `DevAllKpiObjectivesListScopeAdapter` | `done` | Same |
| L-10 | Management reviews | `management-reviews/...` → `DevAllManagementReviewsListScopeAdapter` | `done` | Same |
| A-01 | Assets (Inventory) referential checks | `assets/routes/assets.routes.ts` → `AcceptAny*` adapters (route defaults, tests only) | `done` | 2026-10-22 — `assets/adapters/lookups.adapter.ts`: owner = org membership, business unit = FU in org, category = org tag applicable to the asset module. Wired in `v1/index.ts` when `SECURITY_PROVIDER=auth0-openfga`; AcceptAny kept for development-stub. Test: `assets-lookups.adapter.test.ts` (3/3) |

**A-01 note (2026-10-22):** Not a list-scope item, but the same severity class: assets can be saved with owner / business-unit / category ids that do not exist (or belong to another org), because the lookup ports are accept-any development adapters (`assets/ports.ts` header: “Real Users / Business Units / Tags modules replace stub adapters later” — those modules now exist).

**P1 decision (2026-10-19):** **Accept org-wide lists temporarily** for staging / early auth0-openfga. OpenFGA org-level `can_read` remains the AuthZ gate; L-01…L-10 stay `todo` until list-scope infra is authorized. Do **not** delete `DevAll*ListScope` until a real scope implementation lands.

**P1 resolved (2026-10-22):** Real Mongo list scopes landed without OpenFGA model changes. `src/security/list-scope/create-list-scope.adapter.ts` resolves one canonical scope from `organisation_memberships` (role) + `unit_memberships` (`listUnitIdsForUser`): Super Admin/Auditor → `all`; Head of Service/Basic → own units + unassigned; no membership/error → own units only (fail closed). `createListScopePorts()` maps it to each module's scope shape; all 10 modules are wired in `v1/index.ts` when `SECURITY_PROVIDER=auth0-openfga` (DevAll remains the development-stub/test default). `getById` in all 10 services now also enforces the scope (404 on out-of-scope), and calendar checks `groupIds`. Test: `list-scope.adapter.test.ts` (7/7); module suites 98/98.

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
- **Done (2026-10-22):** Staging preflight gate `pnpm preflight:prod [--offline] [--organization-id <id>]` (`scripts/preflight-prod.ts` + `src/infrastructure/preflight/prod-preflight.ts`, tests `tests/prod-preflight.test.ts` 6/6) validates the config matrix (provider≠stub, Auth0/OpenFGA, https CLIENT_URL, Stripe key mode + webhook, email deliverability, per-org S3 suffix/CORS) and probes Mongo/Auth0 JWKS/OpenFGA model/S3/Redis/Stripe test prices; exit 1 on any FAIL. Smoke runbook (register → org+bucket → Stripe 4242 Go Live → invite → cross-org isolation → files/sign → email flows) added to [CUTOVER_CHECKLIST.md](./CUTOVER_CHECKLIST.md) § "Staging smoke runbook".
- **Still open:** Executing the smoke on a real staging deploy with Stripe test mode / CLI webhook forward; iMS admin approve/cancel surface (no platform-admin UI in V5).
- **Evidence:** [stripe-payments.md](../module-specifications/stripe-payments.md); tests `stripe-payment.service.test.ts`, `organisation-billing.service.test.ts`.

### FU-01 — Functional-unit group licences always allowed

- [x] Status: `done` (2026-10-22)
- **Evidence:** `functional-units/adapters/organisation-group-licence.adapter.ts` checks `licences.groups` (enforced when allocated > 0, usage always counted via `incrementGroupsUsed`) and is injected in `v1/index.ts` for auth0-openfga; AlwaysAllow kept for development-stub. Test: `functional-unit-group-licence.adapter.test.ts` (3/3).
- **Where:** `functional-units/routes/functional-unit.routes.ts` → `groupLicence: deps.groupLicence ?? new AlwaysAllowGroupLicenceAdapter()`; `v1/index.ts` does **not** pass `groupLicence`.
- **Effect:** Creating a business/functional unit never checks or consumes `organisation.licences.groups` (allocated/used), so group licence limits are not enforced.
- **Fix:** Real `GroupLicencePort` backed by the organisation repository (check `groups.allocated > groups.used`, consume on create), injected from `v1/index.ts` like the compliance licence adapter (auth0-openfga; keep AlwaysAllow for development-stub).

### U-06 — Users ownership integrity is NoOp

- [x] Status: `done` (2026-10-22)
- **Evidence:** `users/adapters/ownership-integrity.adapter.ts` aggregates/transfers ownership across Risks, Incidents, OFIs (ownerId), Audits (auditorId), Tasks (assignees), Management Reviews (attendees), Documents (documentData.owners) — org-scoped, soft-delete aware. Injected in `v1/index.ts` for auth0-openfga. Test: `ownership-integrity.adapter.test.ts` (3/3).
- **Where:** `users/routes/users.routes.ts` → `ownership: deps.ownership ?? new NoOpOwnershipIntegrityAdapter()`; `v1/index.ts` passes only `memberships` to `createUsersModule`.
- **Effect:** `POST /users/:id/ownership-checks` always reports `{ hasOwnedData: false }` and `ownership-transfer` does nothing, so users can be soft-deleted without checking/transferring records they own across modules.
- **Fix:** Real `OwnershipIntegrityPort` aggregating owned records from module repositories (risks, incidents, audits, tasks, documents, …), injected from `v1/index.ts`.

### U-07 — Users compliance-toolkit assignment is NoOp (linked to N-10)

- [x] Status: `done` (2026-10-22)
- **Evidence:** Per-member grants now persist on `organisation_memberships.complianceToolkits`. `users/adapters/compliance-toolkit.adapter.ts` validates requested toolkits against `organisation.licences.complianceTools` and replaces the member's grants; `compliance/adapters/iam-grant.adapter.ts` (N-10) grants a provisioned toolkit to the provisioning member. Both wired in `v1/index.ts`. Test: `compliance-toolkit-assignment.adapter.test.ts` (4/4).
- **Where:** `users/routes/users.routes.ts` → `toolkits: deps.toolkits ?? new NoOpComplianceToolkitAdapter()` (`PUT /users/:id/compliance-tools`).
- **Effect:** Assigning toolkits to a user persists nothing downstream; same gap as compliance-side N-10 (`NoOpComplianceIamGrantAdapter`). Fix both sides together (single toolkit-assignment implementation).

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
| N-05 | Audit promotions | Incident/risk/CIP promotion NoOps | `done` | 2026-10-22 re-audit — `v1/index.ts` wires real inline promotion adapters (`auditIncidentPromotion` → incidents.service, `auditRiskPromotion` → risks.service, `auditCipPromotion` → ofis.service.createFromAuditPromotion). NoOps remain only as route defaults for tests. |
| N-06 | Document files / activity | `NoOpDocument*` if files disabled | `done` | 2026-10-19 — `/files` + `createDocumentFilesAdapter` + activity adapter always wired when config present; auth0 boot warns on `memory`/disabled. Ops: `FILES_ENABLED=true`, `FILES_PROVIDER=local\|s3`. Test: `side-effect-ports.wiring.test.ts`. |
| N-07 | Campaign email | Falls back to NoOp when email system absent | `done` | 2026-10-19 — `createApp` always builds `EmailSystem`; campaigns use `createCampaignEmailAdapter`. Delivery still needs `EMAIL_ENABLED=true` + provider credentials. Boot warns when auth0-openfga and email disabled. |
| N-08 | Report-bug email | NoOp if email not passed | `done` | 2026-10-19 — `createReportBugEmailAdapter` from EmailSystem in module compose; `createApp` always passes email. Same ops as N-07 (`EMAIL_ENABLED` + credentials). Test: `side-effect-ports.wiring.test.ts` + `report-bug.http.test.ts`. |
| N-09 | Org Go Live side effects | `NoOpOrganisationGoLiveSideEffectsAdapter` default | `done` | Compliance provisioning, Stripe checkout, support email, per-org S3 buckets (`files-bucket-side-effects.adapter.test.ts` 6/6) and — 2026-10-22 — **Auth0 Organization creation/linking**: optional port `ensureAuth0Organisation` + `organisation/adapters/auth0-organisation.adapter.ts` creates/links via the Management API at org create **and** Go Live (idempotent, best-effort), composed in `create-app` when `AUTH0_MGMT_*` configured. Tests: `auth0-session-org.adapters.test.ts` |
| N-10 | Compliance IAM grant | `NoOpComplianceIamGrantAdapter` | `done` | 2026-10-22 — `createComplianceIamGrantAdapter` grants provisioned toolkits on the actor's membership (`complianceToolkits`); wired in `v1/index.ts`. See U-07. |
| N-11 | Compliance automation | `NoOpComplianceAutomationAdapter` | `todo` | Automation runner — **infra not built** |
| N-12 | Users account emails | `NoOpUserNotificationAdapter` (route default, tests only) | `done` | 2026-10-22 — `users/adapters/user-notification.adapter.ts` sends welcome / access-revoked / verification emails via EmailSystem; wired in `v1/index.ts`. Delivery still gated by `EMAIL_ENABLED`. Test: `user-notification.adapter.test.ts` (2/2) |
| N-13 | Users session clearing | `NoOpSessionAdapter` (`clearSessionsForUser` on access revoke/deactivate) | `done` | 2026-10-22 — Auth0 Management API client (`security/auth0/auth0-management-api.ts`, M2M client-credentials) + `users/adapters/session.adapter.ts` revokes grants/sessions on revoke/delete/block; wired in `v1/index.ts` when `AUTH0_MGMT_*` configured (else NoOp + preflight warn). Stateless access tokens remain valid until expiry — keep API token lifetime short. Tests: `auth0-management-api.test.ts`, `auth0-session-org.adapters.test.ts` |
| N-14 | Audit extract reports | `NoOpAuditReportAdapter` (route default, tests only) | `done` | 2026-10-22 — `audits/adapters/report.adapter.ts` builds the extract report (summary, identifications, embedded risks, OFIs; HTML-escaped) and emails it with an HTML attachment via EmailSystem; wired in `v1/index.ts`. Test: `audit-report.adapter.test.ts` (3/3) |
| N-15 | Customer invoice stats (CRM) | `NoOpCustomerInvoiceStatsAdapter` — not passed in `v1/index.ts` customers composition | `blocked` | Found 2026-10-22. **No Invoice module exists in V5 yet** (`docs/module-specifications/invoice.md` only) — wire when it lands |
| N-16 | Customer interaction stats (CRM) | `NoOpCustomerInteractionStatsAdapter` (route default, tests only) | `done` | 2026-10-22 — `customers/adapters/interaction-stats.adapter.ts` aggregates customer-module Activities by manager over 7/30 days (totals, customers engaged, top 5 with names); wired in `v1/index.ts`. Test: `customer-interaction-stats.adapter.test.ts` (2/2) |
| N-17 | Stats: invoices + org targets | `UnavailableInvoicesAdapter` (always `[]`) and `DevNoOrgTargetsAdapter` (P1–P4 resolution targets always `null`) in `stats/adapters/module-ports.adapter.ts` | `blocked` | Found 2026-10-22. Invoices blocked on Invoice module (N-15); org incident-resolution targets are not modelled on the organisation record yet |

---

## P4 — Frontend demo / stub UX

Allowed when `VITE_SECURITY_PROVIDER=development-stub`. Must not be the auth0-openfga experience.

| ID | Item | Where | Status | Blocked on |
| --- | --- | --- | --- | --- |
| F-01 | `DEV_STUB_*` identity helpers | `security/development-stub.ts`, session hooks, user-menu | `n/a_stub_only` if gated | None — keep gated |
| F-02 | Document signature **localStorage demo** | ~~`use-document-signatures-store.ts`~~ (deleted) | `done` | 2026-10-22 — Real signatures API shipped: `document-signatures` routes, pdf-lib stamping, hashed access tokens, public signing page (`/documents/sign/:token`), signed-copy previews. localStorage demo store + demo tab deleted. |
| F-03 | Document “demo tab” placeholders | ~~`document-demo-tab-panel.tsx`~~ (deleted) | `done` | 2026-10-22 — Replaced by real tabs: Versions, Signatures, Signed document, Audit trail (Activities), Share. |
| F-06 | Account-menu **Change Password** | `shared/layout/user-menu.tsx` | `done` | 2026-10-22 — menu item opens a confirmation dialog and sends the Auth0 `dbconnections/change_password` email via the existing `requestPasswordReset` flow (same as forgot-password); disabled only in development-stub or when the session user has no email. |
| F-07 | Navbar global search | `shared/layout/app-navbar.tsx` (disabled `SearchInput`, “Search (coming soon)”) | `todo` | Product scope — global search not built |
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

1. ~~**U-01 → U-02 → U-03**~~ — done 2026-10-19  
2. ~~**O-01**~~ — done 2026-10-19  
3. ~~**F-04 / F-05**~~ — done 2026-10-19  
4. ~~**N-01 … N-04**~~ — done 2026-10-19  
5. ~~**A-01**~~ — done 2026-10-22  
6. ~~**FU-01 / U-07 + N-10**~~ — done 2026-10-22  
7. ~~**U-06**~~ — done 2026-10-22  
8. ~~**N-12 / N-14 / N-16**~~ — done 2026-10-22  
9. **P1 list-scope decision** — product call: accept org-wide lists temporarily **or** build list-scope infra then L-01…L-10  
10. **LIC-01 staging smoke execution** (preflight + runbook ready), **N-11 / N-15 / N-17 / F-07** — need automation/invoice/search infra or product decisions. ~~N-13 / N-09 remainder / F-06~~ done 2026-10-22 via the Auth0 Management API client (needs `AUTH0_MGMT_*` M2M credentials in staging/prod env)  

---

## Definition of done (auth0-openfga production)

- [x] No runtime path uses `DevAllActiveUsersMembershipAdapter` when provider is auth0-openfga  
- [x] Users list for org A never returns users who only belong to org B  
- [x] P1 either fixed or explicitly accepted in writing (org-wide list policy)  
- [x] No `DevAllComplianceLicencesAdapter` on auth0-openfga compliance path (LIC-01 Stripe app path done; preflight gate + smoke runbook written, staging execution open)  
- [x] No FE localStorage “demo signatures” as the production path (2026-10-22 — real signatures API, F-02)  
- [ ] `development-stub` mode still boots and works for local testing  
- [ ] Staging smoke: register → onboard → Go Live → `/users` shows **only** that org’s members  

---

## Modules added since 2026-10-19 — audited 2026-10-22

New modules composed in `v1/index.ts` after the original inventory. All use **real** repositories/services; remaining gaps are the shared ops gates, not demo adapters.

| Module | Wiring verdict | Remaining gate |
| --- | --- | --- |
| Invitations (`/invitations`) | Real membership/organisation/user adapters; email via `createInvitationEmailAdapter(EmailSystem)` | Delivery only when `EMAIL_ENABLED=true` (adapter NoOps only if EmailSystem absent, which `createApp` never does) |
| Partnerships (`/partnerships`) | Real repositories + referral stats + dashboard | Notification email uses the same shared EmailSystem gate |
| Licence requests (`/licence-requests`) | Real records, auto-approve allocation, Stripe upgrade, support/Super Admin emails, recipients adapter | LIC-01 staging Stripe smoke execution still open (preflight `pnpm preflight:prod` + runbook ready) |
| Files (`/files`) | Real local/S3 object storage, org-bucket scoping, signed URLs; profile/org image uploads store bucket+key | `FILES_PROVIDER=memory` is test-only — server boot warns in auth0-openfga mode (`src/app/server.ts`) |
| Document signatures | Real API + stamping + token signing (see F-02) | — |
| Profile picture / org logo + sidebar branding | Real File Handler upload → `profileImage.bucket` / `logoStorage`; fresh view URLs in UI | — |

**Config gates (not adapters):** even with every adapter wired, live delivery/behaviour still requires `EMAIL_ENABLED=true` (+ provider credentials), `STRIPE_ENABLED=true` for payments, and `FILES_ENABLED=true` with `FILES_PROVIDER=local|s3`. Boot warnings exist for the files/email gates in auth0-openfga mode.

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
| 2026-10-22 | A-01 / FU-01 / U-06 / U-07 / N-10 | Integrity + entitlement bundle implemented: real assets lookups, group-licence check/consume, per-member toolkit grants (+ compliance IAM grant), cross-module ownership check/transfer. All auth0-openfga-gated in `v1/index.ts` (stub keeps dev adapters). Tests: `assets-lookups.adapter.test.ts`, `functional-unit-group-licence.adapter.test.ts`, `compliance-toolkit-assignment.adapter.test.ts`, `ownership-integrity.adapter.test.ts` (13/13); regression: assets/FU/users/compliance suites pass (94/95 — 1 known pre-existing `organisation.http` failure). Backend `tsc` clean. |
| 2026-10-22 | N-12 / N-14 / N-16 | User lifecycle emails, audit extract report generation+delivery, and CRM interaction analytics wired (EmailSystem / Activities-backed). Tests: `user-notification.adapter.test.ts`, `audit-report.adapter.test.ts`, `customer-interaction-stats.adapter.test.ts` (7/7); regression users/audits/customers/activities 104/104. Backend `tsc` clean. Remaining adapter gaps: N-13 (Auth0 session revocation), N-15/N-17 (Invoice module), N-11 (automation runner), N-09 remainder (Auth0 org + bucket provisioning), P1 list scopes. |
| 2026-10-22 | N-09 (buckets) | Per-org S3 bucket auto-provisioning at org create + Go Live (`ensureFileStorage` port + `createFilesBucketSideEffectsAdapter` in create-app composition; Files-service bucket-name resolution mirrored; best-effort, logged, idempotent). Tests: `files-bucket-side-effects.adapter.test.ts` + existing provisioning/go-live suites (16/16); org/files regression 38/39 (1 known pre-existing `organisation.http` failure). Backend `tsc` clean. |
| 2026-10-22 | Full re-audit | Re-scanned every `NoOp*` / `DevAll*` / `AcceptAny*` / `AlwaysAllow*` class against `v1/index.ts` composition + FE stub scan. **Closed:** F-02, F-03, N-05 (audit promotions wired). **Opened:** A-01 (assets accept-any), FU-01 (group licences), U-06 (ownership), U-07 (user toolkit assignment), N-12…N-17 (user emails/sessions, audit reports, customer invoice/interaction stats, stats invoices/targets), F-06 (change password), F-07 (global search). **Clarified:** N-09 compliance provisioning is wired; Auth0-org + per-org bucket provisioning remain. New modules (invitations, partnerships, licence-requests, signatures, files) audited — real adapters, shared config gates only. |
| 2026-10-22 | L-01…L-10 | Real Mongo list scopes for all 10 modules (`security/list-scope/create-list-scope.adapter.ts`): role from organisation membership + unit ids from unit memberships, fail-closed; wired auth0-only in `v1/index.ts`; `getById` scope enforcement added in all 10 services. Tests: `list-scope.adapter.test.ts` 7/7, module http suites 98/98, backend `tsc` clean. |
| 2026-10-22 | LIC-01 (preflight) | `pnpm preflight:prod` gate added (`scripts/preflight-prod.ts`, `src/infrastructure/preflight/prod-preflight.ts`): pure config matrix + connectivity probes (Mongo, Auth0 JWKS, OpenFGA model, per-org S3 HeadBucket, Redis, Stripe test prices), exit 1 on FAIL. Tests `tests/prod-preflight.test.ts` 6/6 + config 11/11; backend `tsc` clean; offline run against dev `.env` correctly FAILs `CLIENT_URL` http + `EMAIL_ENABLED=false`. Staging smoke runbook (7 steps w/ expected results) added to [CUTOVER_CHECKLIST.md](./CUTOVER_CHECKLIST.md). **Remaining:** execute smoke on a real staging deploy. |
