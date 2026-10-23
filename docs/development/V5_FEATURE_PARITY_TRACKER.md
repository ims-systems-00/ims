# V5 Feature Parity Tracker (V4 → V5)

Living checklist of **major / medium** V4 capabilities that are either missing in V5 or present but incomplete. Tiny polish and correctly overridden `DevAll`/`NoOp` adapters (when `SECURITY_PROVIDER=auth0-openfga`) are out of scope — see [DEV_STUB_PRODUCTION_CUTOVER.md](../security/DEV_STUB_PRODUCTION_CUTOVER.md) for security stub cutover.

**How to use**

1. When a gap is closed: tick the box, set **Status** → `done`, add date / PR / notes under Evidence.
2. Prefer one checkbox per shippable product surface (module or clearly scoped capability).
3. Re-scan V4 (`ims-systems-backend` / `ims-systems-frontend`) before claiming “nothing left” for a family of features.

**Last reviewed:** 2026-10-23

---

## Summary

| Bucket | Open | Notes |
| ------ | ---- | ----- |
| Absolutely absent | see §1 | No dedicated module / routes / product UI |
| Present but incomplete | see §2 | Code or UI exists; end-to-end behaviour partial or gated |

---

## 1. Absolutely absent in V5

No dedicated module, routes, or product UI today. Specs may exist under `docs/module-specifications/`.

### Product modules

- [ ] **CQC** — Status: `open`
  - **V4:** Care toolkit — KLOE ratings, complaints / whistleblowing / significant events / safeguarding registers, site notices (`controllers/cqc`, `views/cqc`).
  - **Spec:** [cqc.md](../module-specifications/cqc.md)
  - **Evidence:** —

- [ ] **AI / Alice** — Status: `open`
  - **V4:** Record-level GPT analysis + saved analyses; Analyse actions on risk / incident / audit / CIP.
  - **Spec:** [ai.md](../module-specifications/ai.md)
  - **Evidence:** —

- [x] **Staff Wallet — Leaves** — Status: `done`
  - **V4:** Annual/sick leave requests, working-day calc, manager approve/reject.
  - **Spec:** [leaves.md](../module-specifications/leaves.md)
  - **Evidence:** 2026-10-23 — `/leaves` (My Wallet) + BE CRUD/submit/evaluate/holidays; calendar on approve; line managers on membership (`PUT /users/:id/line-managers`). Staff Wallets shell still open.

- [ ] **Staff Wallet — Expense Reports** — Status: `open`
  - **V4:** Draft → submit expense claims with line items + evidence; manager approval.
  - **Spec:** [expense-reports.md](../module-specifications/expense-reports.md)
  - **Evidence:** —

- [ ] **Staff Wallet — Worklog** — Status: `open`
  - **V4:** Clock in/out, pause/resume, priorities/achievements, shift status.
  - **Spec:** [worklog.md](../module-specifications/worklog.md)
  - **Evidence:** —

- [ ] **Staff Wallets (manager view)** — Status: `open`
  - **V4:** Open a managed staff member’s leave / expense / worklog (`views/staffWallet/wallets`).
  - **Evidence:** —

- [ ] **Project Management (IMS Project)** — Status: `open`
  - **V4:** Projects, work packages, budgets, membership, reports (`imsProject`, `views/projectManagement`).
  - **Evidence:** —

- [ ] **Carbo Calc (CC)** — Status: `open`
  - **V4:** GHG Scope 1–3 calculator, DEFRA factors, SECR/ISO reports, reduction initiatives.
  - **Spec:** [cc.md](../module-specifications/cc.md)
  - **Evidence:** —

- [ ] **IMS Form** — Status: `open`
  - **V4:** Configurable org forms + submissions API (limited admin UI).
  - **Spec:** [ims-form.md](../module-specifications/ims-form.md)
  - **Evidence:** —

### Platform / admin / public

- [ ] **iMS Admin / platform admin** — Status: `open`
  - **V4:** Platform login; KPI template/clone; admin licence & org tooling (`views/imsAdmin`, `adminAuth`).
  - **Spec:** [admin-authentication.md](../module-specifications/admin-authentication.md)
  - **Notes:** Cutover LIC-01 also calls out missing approve/cancel surface for licence requests.
  - **Evidence:** —

- [x] **Contact IMS** — Status: `done`
  - **V4:** Public demo booking + Get Started lead emails.
  - **Spec:** [contact-ims.md](../module-specifications/contact-ims.md)
  - **Evidence:** 2026-10-23 — public `/contact` + `/api/v1/contact-ims` (book-date / get-started / booked-dates stub).

- [x] **Register Public Interest** — Status: `done`
  - **V4:** Public waitlist (e.g. CarboCalc); persist + confirm email.
  - **Spec:** [register-public-interest.md](../module-specifications/register-public-interest.md)
  - **Evidence:** 2026-10-23 — public `/register-interest` + `/api/v1/register-public-interest` (persist + CarboCalc email).

- [ ] **Guidelines / product tours** — Status: `open`
  - **V4:** In-app guided tours (`views/guidelines`).
  - **Evidence:** —

- [ ] **Statics API** — Status: `open`
  - **V4:** Shared constants (`getConstants` — countries, roles, etc.).
  - **Spec:** [statics.md](../module-specifications/statics.md)
  - **Notes:** V5 FE may hardcode locally; no `/statics` module.
  - **Evidence:** —

- [ ] **Tenants** — Status: `open`
  - **V4:** Platform environment registry + cross-tenant scheduled jobs.
  - **Spec:** [tenants.md](../module-specifications/tenants.md)
  - **Evidence:** —

- [ ] **Report templates / scheduled dashboard emails** — Status: `open`
  - **V4:** HTML org/BU dashboard report payloads for email dispatch (`reportTemplates`).
  - **Evidence:** —

- [ ] **IAM policy / role admin UI** — Status: `open`
  - **V4:** Org-facing IAM policy/role screens (`views/ourIms/policies|roles`).
  - **Notes:** V5 AuthZ is OpenFGA — no equivalent editor UI; may be intentional product change.
  - **Evidence:** —

### Integrations / niche

- [ ] **Xero integration** — Status: `open`
  - **V4:** Integrations nav entry (route itself looked half-wired).
  - **Evidence:** —

- [ ] **Standalone Evidence library** — Status: `open`
  - **V4:** General evidence CRUD used from compliance / audit / incident UIs (`evidence/*`).
  - **Notes:** V5 has compliance **control-evidence** only — not a general library.
  - **Evidence:** —

- [ ] **Staff Alerts** — Status: `open`
  - **V4:** API to raise location alerts; little/no nav UI.
  - **Spec:** [staff-alerts.md](../module-specifications/staff-alerts.md)
  - **Evidence:** —

- [ ] **Markers** — Status: `open`
  - **V4:** Cross-module mark-for-delete / hard-delete ops.
  - **Evidence:** —

### Renamed / replaced (do not track as absent)

| V4 | V5 |
| -- | -- |
| CIP | OFI (`modules/ofi`) |
| Attachment / File Handler | Files + document adapters |
| Jira Report Bug (primary UX was email) | Report Bug (`modules/report-bug`) |
| Membership | Organisation membership + Users |

---

## 2. Present in V5 but incomplete / not fully wired

Code or UI exists; end-to-end product behaviour is partial, ops-gated, or missing a surface.

### Build-first queue (low hassle — no new infra / no product invention)

These can ship by wiring existing APIs + established FE patterns. Build in this order:

| Priority | Item | Why low hassle |
| -------- | ---- | -------------- |
| ~~**P1**~~ | ~~CRM Invoices standalone UI~~ | **Done 2026-10-23** — `/invoices` + CRM nav. |
| ~~**P2**~~ | ~~Global search — depth~~ | **Done 2026-10-23** — results open record sheets / document nodes. |
| ~~**P3**~~ | ~~Data Import — small UX polish~~ | **Done 2026-10-23** — step strip, mapping readiness, per-sheet progress, clearer API errors. History/websocket still deferred. |

**Deferred from “build first” (hassle / blockers):**

| Item | Why not first |
| ---- | ------------- |
| Charts Phase 2 | Needs product decision on execution + Dashboard coupling |
| Compliance auto-implement | Needs catalogue module→control mapping (undefined in V5 data) |
| Stripe staging smoke | Needs staging deploy + webhook forward (user/ops) |
| Licence platform-admin UI | Needs whole iMS-admin surface (greenfield) |
| Auth0 Mgmt / Email / Files | Ops credentials / env — not code features |
| OpenFGA ListObjects | Accepted design limitation |

### Product surfaces

- [ ] **Charts — Phase 1 only** — Status: `partial` · Build: `deferred`
  - **There:** Backend CRUD for chart definitions (`modules/charts`, `/charts`).
  - **Missing:** Pipeline execution, Stats/Dashboard coupling, **FE module / nav**.
  - **Evidence:** —

- [x] **CRM Invoices — standalone UI** — Status: `done` · Build: **`P1`**
  - **There:** Full BE CRUD/send/download; customer-sheet Invoices panel; customer/stats invoice adapters.
  - **Missing:** ~~Standalone `/invoices` list/detail routes + sidebar nav~~.
  - **Evidence:** 2026-10-23 — `/invoices` list page + CRM nav + create/view sheet (send / mark paid / PDF / delete draft).

- [ ] **Compliance automation — auto-implement** — Status: `partial` · Build: `deferred`
  - **There:** Post-provision scan runner + BullMQ + initiator notify (N-11).
  - **Missing:** Catalogue **module → control** automation mapping so controls can be auto-implemented.
  - **Evidence:** —

- [x] **Data Import — UX polish (P3)** — Status: `done` · Build: **`P3`**
  - **There:** BE + FE wizard for 8 modules; schema / validate / migrate; Super Admin + completion notifications.
  - **P3 shipped:** Wizard step strip; mapping readiness badges + unmapped-required highlight; empty business-function warning; per-sheet validate/migrate progress; Zod detail lines in API error toasts.
  - **Still deferred:** Import history UI; websocket live progress; BullMQ always-on; non-CSV formats.
  - **Evidence:** 2026-10-23 — Data Import UX polish on wizard page.

- [x] **Global search — depth** — Status: `done` · Build: **`P2`**
  - **There:** `GET /search` + navbar UI; org-scoped, authorizer-checked; fixed module set.
  - **Missing:** ~~Deep-link to record sheets~~ (expand searchable set still optional later).
  - **Evidence:** 2026-10-23 — routes now `/risks?risk=`, `/incidents?incident=`, `/audits/{internal|external}?audit=`, `/suppliers?supplier=`, `/customers?customer=`, `/users?user=`, `/documents/repositories/:repo/nodes/:id`.

### Billing / admin / ops gates

- [ ] **Stripe / Go Live — staging smoke** — Status: `partial` · Build: `ops`
  - **There:** Checkout / portal / webhooks when `STRIPE_ENABLED`.
  - **Missing:** Full staging smoke (LIC-01); card path inert when Stripe disabled.
  - **See:** [CUTOVER_CHECKLIST.md](../security/CUTOVER_CHECKLIST.md), [DEV_STUB_PRODUCTION_CUTOVER.md](../security/DEV_STUB_PRODUCTION_CUTOVER.md)
  - **Evidence:** —

- [ ] **Licence requests — platform-admin approve/cancel** — Status: `partial` · Build: `deferred`
  - **There:** Org-side request/history, auto-approve, Stripe seat sync, emails.
  - **Missing:** iMS-admin approve/cancel UI (no platform-admin surface in V5).
  - **Evidence:** —

- [ ] **Auth0 Management API credentials** — Status: `partial` (ops) · Build: `ops`
  - **There:** Session revoke (N-13) + Auth0 Organisation provisioning (N-09) adapters.
  - **Missing:** Live behaviour until `AUTH0_MGMT_CLIENT_ID/SECRET` set (else NoOp + preflight warn).
  - **Evidence:** —

- [ ] **Email delivery enabled in staging/prod** — Status: `partial` (ops) · Build: `ops`
  - **There:** EmailSystem composed for campaigns, report-bug, invoices, invitations, etc.
  - **Missing:** `EMAIL_ENABLED=true` + provider credentials (boot warns under auth0-openfga).
  - **Evidence:** —

- [ ] **Files / S3 fully configured** — Status: `partial` (ops) · Build: `ops`
  - **There:** Files module + document/file adapters; per-org bucket side effects when S3.
  - **Missing:** `FILES_ENABLED=true` + `FILES_PROVIDER=local|s3` (memory is test-only).
  - **Evidence:** —

### Accepted limitations (track, do not treat as “bugs”)

- [ ] **OpenFGA per-resource ListObjects** — Status: `accepted` · Build: `wontfix`
  - **There:** Org-level OpenFGA + Mongo BU list scopes (L-01…L-10) in auth0-openfga.
  - **Not planned (current design):** Per-resource FGA types / ListObjects for every record.
  - **Evidence:** Stub-elimination Phase 1 — Mongo scope design superseded ListObjects expansion.

---

## 3. Done recently (reference)

Tick items in §1/§2 when you close them; optionally mirror major closes here for changelog skim.

| Date | Item | Notes |
| ---- | ---- | ----- |
| 2026-10-22 | List scopes L-01…L-10, Auth0 Mgmt client, N-13/N-09/F-06, org targets, Invoice MVP, invoice stats, compliance automation scan, global search | Stub-elimination build on `feat/file-handler` |
| 2026-10-23 | Data Import BE + FE wizard + sidebar | Queue/history/websocket still deferred |
| 2026-10-23 | CRM Invoices standalone UI (P1) | `/invoices` list + sheet + CRM sidebar entry |
| 2026-10-23 | Global search depth (P2) | Search hits open module sheets / document detail |
| 2026-10-23 | Data Import UX polish (P3) | Step strip, readiness badges, per-sheet progress, clearer API errors |
| 2026-10-23 | Staff Wallet — Leaves | `/leaves` wizard + approve flow; membership line managers |
| 2026-10-23 | Contact IMS + Register Public Interest | Public lead APIs + thin `/contact` and `/register-interest` pages |

---

## Related docs

- [DEV_STUB_PRODUCTION_CUTOVER.md](../security/DEV_STUB_PRODUCTION_CUTOVER.md) — security stub inventory
- [CUTOVER_CHECKLIST.md](../security/CUTOVER_CHECKLIST.md) — staging smoke runbook
- [MODULE_SPECIFICATION_REFERENCE.md](../module-specifications/MODULE_SPECIFICATION_REFERENCE.md)
- [MODULE_DEVELOPMENT_GUIDE.md](./MODULE_DEVELOPMENT_GUIDE.md)
