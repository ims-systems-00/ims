# V5 Feature Parity Tracker (V4 → V5)

Living checklist of **major / medium** V4 capabilities that are **real, user-facing product surfaces** and are either missing in V5 or present but incomplete.

**Rule:** Only track work users can actually do in V4 (nav / screens / clear workflows). Code that exists without a proper UI or end-to-end behaviour is **out of scope** — see §4 Exclusions.

Tiny polish and correctly overridden `DevAll`/`NoOp` adapters (when `SECURITY_PROVIDER=auth0-openfga`) are also out of scope — see [DEV_STUB_PRODUCTION_CUTOVER.md](../security/DEV_STUB_PRODUCTION_CUTOVER.md).

**How to use**

1. When a gap is closed: tick the box, set **Status** → `done`, add date / PR / notes under Evidence.
2. Prefer one checkbox per shippable product surface (module or clearly scoped capability).
3. Re-scan V4 (`ims-systems-backend` / `ims-systems-frontend`) before claiming “nothing left” for a family of features.
4. Do **not** re-add §4 exclusions without product confirmation that V4 usage is real.

**Last reviewed:** 2026-10-23

---

## Summary

| Bucket | Notes |
| ------ | ----- |
| Absolutely absent | §1 — real V4 product modules / surfaces missing in V5 |
| Present but incomplete | §2 — code or UI exists; end-to-end behaviour partial or gated |
| Excluded | §4 — V4 code without proper user functionality (do not build) |

---

## 1. Absolutely absent in V5

No dedicated module, routes, or product UI today. Specs may exist under `docs/module-specifications/`.

### Product modules

- [ ] **CQC** — Status: `open`
  - **V4:** Care toolkit — KLOE ratings, complaints / whistleblowing / significant events / safeguarding registers, site notices (`views/cqc`).
  - **Spec:** [cqc.md](../module-specifications/cqc.md)
  - **Evidence:** —

- [x] **AI / Alice** — Status: `done`
  - **V4:** Record-level GPT analysis + saved analyses; Analyse on risk / incident / audit.
  - **Spec:** [ai.md](../module-specifications/ai.md)
  - **Evidence:** 2026-10-23 — BE `/api/v1/ai` + FE Analytical Assistant on risk / incident / audit. CIP Analyse left non-functional (same as V4 — not a V5 gap).

- [x] **Staff Wallet — Leaves** — Status: `done`
  - **V4:** Annual/sick leave requests, working-day calc, manager approve/reject.
  - **Spec:** [leaves.md](../module-specifications/leaves.md)
  - **Evidence:** 2026-10-23 — `/leaves` + BE CRUD/submit/evaluate/holidays; line managers on membership. Sidebar iHR temporarily hidden in V5 UI (route still exists).

- [ ] **Staff Wallet — Expense Reports** — Status: `open`
  - **V4:** Draft → submit expense claims with line items + evidence; manager approval (`views/staffWallet/expenseReport`).
  - **Spec:** [expense-reports.md](../module-specifications/expense-reports.md)
  - **Evidence:** —

- [ ] **Staff Wallet — Worklog** — Status: `open`
  - **V4:** Clock in/out, pause/resume, priorities/achievements, shift status (`views/staffWallet/workLog`).
  - **Spec:** [worklog.md](../module-specifications/worklog.md)
  - **Evidence:** —

- [ ] **Staff Wallets (manager view)** — Status: `open`
  - **V4:** Open a managed staff member’s leave / expense / worklog (`views/staffWallet/wallets`).
  - **Evidence:** —

- [ ] **Project Management (IMS Project)** — Status: `open`
  - **V4:** Projects, work packages, budgets, membership, reports (`views/projectManagement`).
  - **Evidence:** —

- [ ] **Carbo Calc (CC)** — Status: `open`
  - **V4:** GHG Scope 1–3 calculator (dedicated `cc-frontend-master`), DEFRA factors, SECR/ISO reports, reduction initiatives.
  - **Spec:** [cc.md](../module-specifications/cc.md)
  - **Evidence:** —

### Platform / admin / UX

- [ ] **iMS Admin / platform admin** — Status: `open`
  - **V4:** Platform login; KPI template/clone; admin licence & org tooling (`views/imsAdmin`, `adminAuth`).
  - **Spec:** [admin-authentication.md](../module-specifications/admin-authentication.md)
  - **Notes:** Also covers licence-request approve/cancel for platform ops.
  - **Evidence:** —

- [x] **Contact IMS** — Status: `done`
  - **V4:** Public demo booking + Get Started lead emails.
  - **Spec:** [contact-ims.md](../module-specifications/contact-ims.md)
  - **Evidence:** 2026-10-23 — public `/contact` + `/api/v1/contact-ims`.

- [x] **Register Public Interest** — Status: `done`
  - **V4:** Public waitlist (e.g. CarboCalc); persist + confirm email.
  - **Spec:** [register-public-interest.md](../module-specifications/register-public-interest.md)
  - **Evidence:** 2026-10-23 — public `/register-interest` + API.

- [ ] **Guidelines / product tours** — Status: `open`
  - **V4:** In-app guided tours (`views/guidelines` — Business Units, Users, Premises, Repositories).
  - **Evidence:** —

- [ ] **IAM policy / role admin UI** — Status: `open`
  - **V4:** Org-facing IAM policy/role screens (`views/ourIms/policies|roles`).
  - **Notes:** V5 AuthZ is OpenFGA — may become an intentional product change rather than a 1:1 port. Confirm with product before building.
  - **Evidence:** —

- [ ] **Dashboard report email (manual + scheduled subscribers)** — Status: `open`
  - **V4:** Quick Actions “Send Report” + organisation report-subscriber scheduled PDFs (Dashboard / Organisation settings).
  - **Notes:** Track as dashboard/org capability, not a standalone “report templates” module.
  - **Evidence:** —

---

## 2. Present in V5 but incomplete / not fully wired

Code or UI exists; end-to-end product behaviour is partial, ops-gated, or missing a surface.

### Deferred product / data work

| Item | Why deferred |
| ---- | ------------ |
| Compliance auto-implement | Needs catalogue module→control mapping (undefined in V5 data) |
| Stripe staging smoke | Needs staging deploy + webhook forward (ops) |
| Licence platform-admin approve/cancel | Needs iMS-admin surface (§1) |
| Auth0 Mgmt / Email / Files | Ops credentials / env — not code features |
| OpenFGA ListObjects | Accepted design limitation |

### Product surfaces

- [x] **CRM Invoices — standalone UI** — Status: `done`
  - **Evidence:** 2026-10-23 — `/invoices` list + CRM nav + sheet.

- [ ] **Compliance automation — auto-implement** — Status: `partial` · Build: `deferred`
  - **There:** Post-provision scan runner + BullMQ + initiator notify (N-11).
  - **Missing:** Catalogue **module → control** automation mapping so controls can be auto-implemented.
  - **Evidence:** —

- [x] **Data Import — UX polish** — Status: `done`
  - **Evidence:** 2026-10-23 — wizard polish; KPI objectives added to import targets. History/websocket still deferred (nice-to-have).

- [x] **Global search — depth** — Status: `done`
  - **Evidence:** 2026-10-23 — search hits open module sheets / document detail.

### Billing / admin / ops gates

- [ ] **Stripe / Go Live — staging smoke** — Status: `partial` · Build: `ops`
  - **There:** Checkout / portal / webhooks when `STRIPE_ENABLED`.
  - **Missing:** Full staging smoke (LIC-01).
  - **See:** [CUTOVER_CHECKLIST.md](../security/CUTOVER_CHECKLIST.md)

- [ ] **Licence requests — platform-admin approve/cancel** — Status: `partial` · Build: `deferred`
  - **There:** Org-side request/history, auto-approve, Stripe seat sync, emails.
  - **Missing:** iMS-admin approve/cancel UI (depends on §1 iMS Admin).

- [ ] **Auth0 Management API credentials** — Status: `partial` (ops)
  - **Missing:** Live behaviour until `AUTH0_MGMT_CLIENT_ID/SECRET` set.

- [ ] **Email delivery enabled in staging/prod** — Status: `partial` (ops)
  - **Missing:** `EMAIL_ENABLED=true` + provider credentials.

- [ ] **Files / S3 fully configured** — Status: `partial` (ops)
  - **Missing:** `FILES_ENABLED=true` + `FILES_PROVIDER=local|s3`.

### Accepted limitations

- [ ] **OpenFGA per-resource ListObjects** — Status: `accepted` · Build: `wontfix`
  - **Not planned:** Per-resource FGA types / ListObjects for every record (Mongo BU list scopes instead).

---

## 3. Done recently (reference)

| Date | Item | Notes |
| ---- | ---- | ----- |
| 2026-10-22 | List scopes, Auth0 Mgmt, N-13/N-09, Invoice MVP, compliance scan, global search | Stub-elimination |
| 2026-10-23 | Data Import BE + FE + KPI objectives target | History/websocket deferred |
| 2026-10-23 | CRM Invoices standalone UI | `/invoices` |
| 2026-10-23 | Global search depth | Deep-link to sheets |
| 2026-10-23 | Data Import UX polish | Step strip, readiness, progress |
| 2026-10-23 | Staff Wallet — Leaves | Approve flow + line managers |
| 2026-10-23 | Contact IMS + Register Public Interest | Public lead surfaces |
| 2026-10-23 | AI / Alice | Risk / incident / audit assistant |

---

## 4. Exclusions (do not build for “parity”)

These appear in V4 code (or old tracker notes) but **lack a proper user-facing workflow**. Building them in V5 would invent product that V4 customers do not actively use.

| Item | Why excluded |
| ---- | ------------ |
| **Staff Alerts** | API-only; no nav/UI; no recipient/delivery (“people alerted” is misleading). Spec: [staff-alerts.md](../module-specifications/staff-alerts.md) |
| **IMS Form** | Forms API + licence marketing flag; **no form builder / fill UI**. Spec: [ims-form.md](../module-specifications/ims-form.md) |
| **Xero integration** | Integrations nav half-wired (route reused Risk Management component). |
| **Charts module** | Backend chart-definition registry only; **no Charts UI**; dashboards use Stats/Dashboard instead. Spec: [charts.md](../module-specifications/charts.md) |
| **Standalone Evidence / Attachment library** | No standalone nav product; evidence is embedded on parent records (V5 already covers control-evidence / module attachments). |
| **Markers** | Internal mark-for-delete ops — not a user module. |
| **Statics API** | Shared constants service; V5 FE can hardcode/localise — not a product surface. |
| **Tenants registry UI** | Platform env registry / jobs; **no confirmed org-user UI**. Spec: [tenants.md](../module-specifications/tenants.md) |
| **AI Analyse on CIP** | V4 button exists with `template={null}` — non-functional there too. |
| **Data-import validators for ~45 extra modules** | Backend-only; V4 wizard exposed a small set (V5 now includes KPI objectives among wizard targets). |

---

## Related docs

- [DEV_STUB_PRODUCTION_CUTOVER.md](../security/DEV_STUB_PRODUCTION_CUTOVER.md) — security stub inventory
- [CUTOVER_CHECKLIST.md](../security/CUTOVER_CHECKLIST.md) — staging smoke runbook
- [MODULE_SPECIFICATION_REFERENCE.md](../module-specifications/MODULE_SPECIFICATION_REFERENCE.md)
- [MODULE_DEVELOPMENT_GUIDE.md](./MODULE_DEVELOPMENT_GUIDE.md)
