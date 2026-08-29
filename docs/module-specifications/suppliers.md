# Supplier Management

## 1. Module Overview

Supplier Management is the organisation’s register for recording, tracking, and governing third-party suppliers—covering contract and contact details, SLA and contract documents, onboarding files, KPI objectives, compliance status, and supplier-linked incidents.

Its primary business purpose is to give users a structured way to maintain supplier records against business units, assign internal buyers, track procurement value and contract dates, attach evidence of SLAs and contracts (used to derive a compliance flag), schedule supplier reviews on the calendar, and monitor supplier-related incidents through the shared Incident Management module.

It solves the problem of fragmented supplier information by centralising supplier master data, documentation, KPI notes, compliance indicators, and incident history in one place, with dashboard statistics for procurement value, compliance posture, and supplier incident counts.

Primary users are people with Supplier Management access—typically Super Admins, Heads of Service, Basic Users, and Auditors (read-focused)—subject to Supplier Management licence and permission checks. Exact role-to-permission mapping for every action: **Unclear — requires confirmation** (see Miscellaneous).

---

## 2. Features and Capabilities

### Register (create) a supplier

- **Capability:** Create a supplier with name, account manager, account number, email, buyer, business unit, service provision description, contract value, contract start/end dates, review date, and optional SLA, contract, and onboarding file attachments.
- **Who uses it:** Users with Supplier Management create permission (Add button).
- **Outcome:** A new supplier is stored with a unique reference (`SUP-{number}`). If SLA and/or contract files are present at creation, the supplier is marked compliant. The assigned buyer is notified. A calendar review event is created on the review date for the business unit and system administrators.
- **Conditions:** Backend requires name, account manager, account number, email, service provision, contract value, and contract start date. Frontend additionally requires buyer and marks contract end date as mandatory in the UI.

### View, search, filter, and open suppliers

- **Capability:** Browse a paginated list of suppliers; search; filter by business unit and logged-by (creator); open a supplier in a detail drawer or full detail page.
- **Who uses it:** Users with Supplier Management read access and applicable licence.
- **Outcome:** Users see suppliers for their organisation including reference, business unit, supplier name, account manager, compliant flag (Yes/No), and actions. List visibility is further limited by business unit for some roles.
- **Conditions:** Detail page route licence check uses Risk Management licence in route config — **requires confirmation** (possible copy-paste error vs Supplier Management licence on list route).

### Update a supplier

- **Capability:** Change supplier details and append further SLA, contract, or onboarding attachments via the edit form.
- **Who uses it:** Users with Supplier Management create permission (update uses create permission on backend; toolbar gated by CREATE in UI).
- **Outcome:** Supplier reflects new information. New files are appended to existing attachment arrays. If SLA or contract files remain, supplier stays/becomes compliant and compliant-supplier notification may fire to Super Admins. Buyer change notifies the new buyer. Calendar review event is updated.
- **Conditions:** Business unit cannot be changed on edit in the UI. Edit form resets file arrays when loading existing supplier — **requires confirmation** whether empty arrays on update clear server-side files.

### Delete a supplier

- **Capability:** Remove a supplier from the register.
- **Who uses it:** Users with Supplier Management delete permission; UI further limits delete to organisation admins or the record creator.
- **Outcome:** Supplier is permanently deleted. Tasks sourced from that supplier are also removed.
- **Conditions:** Calendar event cleanup on delete may not run — **requires confirmation** (delete path vs calendar hook mismatch).

### Manage SLA documents

- **Capability:** Attach SLA files when creating/updating a supplier, or via dedicated add-SLA endpoint; remove individual SLA files.
- **Who uses it:** Users on supplier form (add); users with delete permission (remove via delete button).
- **Outcome:** SLA files stored on the supplier record. Presence of any SLA or contract file sets `isCompliant` to true. Removing the last SLA and last contract file sets compliant to false.
- **Conditions:** Dedicated `POST .../slas` route reads query parameters while UI attach form sends body — attach forms are **not mounted** in UI; SLA add in practice is via create/update dropzones. **Possible bug:** SLA delete button may call wrong store function name (`deleteSla` vs `deleteSLAs`).

### Manage contract documents

- **Capability:** Attach contract files on create/update or via dedicated add-contract endpoint; remove individual contract files.
- **Who uses it:** Same pattern as SLAs.
- **Outcome:** Contract files stored on supplier. Contributes to compliance flag same as SLAs.
- **Conditions:** Dedicated attach contract forms not mounted; primary path is create/update form dropzones.

### Manage onboarding files

- **Capability:** Attach onboarding files on create/update or via dedicated add endpoint; remove individual onboarding files.
- **Who uses it:** Users on supplier form and delete buttons.
- **Outcome:** Onboarding documents stored on supplier. **Do not affect** the compliance flag.
- **Conditions:** Dedicated attach onboarding forms not mounted in UI.

### Manage KPI objectives

- **Capability:** Add free-text KPI/objective entries to a supplier; remove individual entries.
- **Who uses it:** Users on supplier detail page and drawer KPI tab.
- **Outcome:** KPI objectives stored as embedded text values on the supplier. No automated measurement or scoring — storage and display only.
- **Conditions:** No permission gate on KPI delete in UI. Update/edit of existing KPI not implemented (add/remove only).

### Manage supplier-linked incidents

- **Capability:** View, raise, edit, resolve, escalate, and delete incidents associated with a supplier.
- **Who uses it:** Users with Incident Management permissions within the embedded incident UI on supplier detail/drawer.
- **Outcome:** Incidents are **not** embedded on the supplier document. They are standard Incident Management records with `source.moduleType: suppliers` and `source.module: supplierId`. Full incident lifecycle applies (Open / Escalated / Resolved). Supplier overview in incident UI shows supplier context.
- **Conditions:** Legacy nested supplier incident API routes are **commented out** on backend. UI uses generic `/incidents` API with `x-moduleType` / `x-moduleId` headers. Supplier-specific incident service methods in frontend are unused.

### Link tasks to a supplier

- **Capability:** Create and view tasks associated with a supplier.
- **Who uses it:** Users with task capabilities from supplier actions or Tasks tab.
- **Outcome:** Tasks linked with `moduleType: suppliers`. Deleted when supplier is deleted.

### View related documents

- **Capability:** Browse documents related to the suppliers module type from list page and Related Documents tab.
- **Who uses it:** Users with Document Management read permission (tab shown only then).
- **Outcome:** Related documents discoverable within Supplier Management context.

### View supplier statistics on dashboard

- **Capability:** See procurement value, supplier compliance percentage/risk level, and supplier-linked incident counts on organisation dashboard.
- **Who uses it:** Dashboard users consuming supplier stats API.
- **Outcome:** High-level supplier posture visibility. **Note:** one dashboard chart uses hardcoded placeholder data — **requires confirmation**.

---

## 3. User Outcomes / End Results

- **Create:** Supplier master record with reference, contract/commercial details, buyer assignment, optional documentation, and derived compliance status.
- **View:** Searchable/filterable supplier register; detail views of service provision, attachments, KPIs, compliance flag, linked incidents, and tasks.
- **Manage:** SLA, contract, and onboarding files; KPI objective text entries; supplier-linked incidents via embedded Incident Management.
- **Change:** Supplier details and appended attachments until deleted; buyer reassignment with notification.
- **Information received:** Compliant Yes/No indicator; buyer and review notifications; calendar review events; dashboard stats on procurement, compliance, and incidents.
- **Business actions enabled:** Centralised supplier register; evidence of SLAs/contracts for compliance tracking; review scheduling; supplier-scoped incident handling; procurement visibility on dashboard.

---

## 4. Scope Boundaries

### In scope

- Supplier CRUD (create, read, update, delete).
- Embedded SLA, contract, and onboarding file arrays on supplier records.
- KPI objective text entries on supplier records.
- Derived compliance flag from SLA/contract presence.
- Calendar review events tied to suppliers.
- Embedded Incident Management UI scoped to supplier source.
- Embedded tasks and related documents entry points.
- Supplier stats for dashboard (procurement, compliance, incidents).

### Out of scope (handled elsewhere)

- **Standalone Incident Management register** — owns incident lifecycle; supplier module links via source.
- **Formal SLA monitoring/measurement** — files stored; no automated SLA breach detection identified.
- **Contract approval/renewal workflow** — dates stored; no renewal automation identified.
- **Management Review KPI module** — separate module; supplier KPI objectives are embedded text only, not linked.
- **Partner organisation onboarding (Our IMS)** — separate partner registration fields.
- **Legacy nested `/suppliers/:id/incidents` API** — commented out; not active path.
- **Carbon/CC calculations** — may reference supplier name as string; not supplier FK management.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| Incident Management | Supplier-linked incidents are standard incident records with source pointing to supplier; embedded UI on supplier detail/drawer. |
| Task Management | Tasks created/viewed with supplier as source; cascade delete when supplier removed. |
| Document Management | Related Documents tab and searchable documents for suppliers module type. |
| Calendar | Review date creates/updates calendar events for supplier reviews. |
| Notifications | Buyer assignment and compliant-supplier events. |
| Dashboard / Stats | Procurement value, compliance %, risk level, supplier incident aggregates via stats API. |
| Users | Buyer field references internal user; ownership transfer on user offboarding. |
| Risk / CIP | Can reference suppliers as source module type (cascade patterns in plugins). |

---

## 6. Current Data Model

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| Supplier | A third-party vendor/partner record | Primary register entry |
| SLA file (embedded) | SLA document attachment | Compliance evidence; stored in `slaFiles` array |
| Contract file (embedded) | Contract document attachment | Compliance evidence; stored in `contractFiles` array |
| Onboarding file (embedded) | Onboarding document | Supporting documentation; does not affect compliance |
| KPI objective (embedded) | Free-text performance/objective note | User-maintained expectations; not measured automatically |
| Compliance flag (`isCompliant`) | Derived boolean | True when at least one SLA or contract file exists |
| Supplier-linked incident | Incident record with supplier source | Managed via Incident Management, not embedded on supplier |
| Linked task | Task with supplier source | Operational follow-up |

There is **no** separate SLA, Contract, Onboarding, or KPI database entity — all are embedded on the supplier document except incidents (separate collection).

---

## 7. Attributes

### Supplier (main record)

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Reference | User-facing identifier | `SUP-{number}` |
| Name | Supplier organisation name | Required |
| Business unit (group) | Owning organisational unit | Optional on backend create; required in UI; not editable after create |
| Account manager | Supplier-side contact name | Required |
| Account number | Supplier account identifier | Required |
| Email | Supplier contact email | Required |
| Buyer | Internal user responsible for the supplier | Required in UI |
| Service provision | Description of services supplied | Required |
| Contract value | Monetary value of contract | Required; shown with £ in UI |
| Contract start date | Contract commencement | Required |
| Contract end date | Contract expiry | Optional on backend; marked mandatory in UI |
| Review date | Next/scheduled supplier review | Drives calendar event |
| SLA files | SLA document attachments | Affects compliance |
| Contract files | Contract document attachments | Affects compliance |
| Onboarding files | Onboarding documents | No compliance effect |
| KPI objectives | List of `{ value: text }` entries | Add/remove only |
| Is compliant | Whether SLA and/or contract files exist | Server-derived; shown as Yes/No in list/overview |
| Created (by, on) | Who registered supplier and when | Audit |
| Organisation | Tenant scope | Always applied |

### Supplier-linked incident (Incident Management record)

Uses standard incident attributes (title, description, priority, owner, resolution, etc.) with source linking to supplier — see Incident Management specification for incident fields. Not duplicated here.

---

## 8. Current UI Layout

### Main screens / pages

- **Suppliers list** — `/admin/suppliermanagement`, sidebar **Suppliers**.
- **Supplier detail page** — `/admin/suppliermanagement/:id` (hidden from sidebar).
- Entry from dashboard supplier widgets (compliance/incidents summaries).

### Important sections and views

**List page tabs**

1. **All Suppliers** — searchable/filterable table, drawers.
2. **Related Documents** — if Document Management read access.

**List table columns:** Reference, Business Unit, Supplier Name, Account Manager, Compliant (Yes/No), Actions.

**List-page drawers:** Supplier detail, edit supplier, create supplier, add task.

**Drawer detail tabs:** Overview, Details (attachments if present), KPI/Objectives, Incidents (embedded Incident Management), Tasks.

**Full detail page panels:** **Details** (sidebar overview + actions, switchable read/edit, service provision, KPI list/add, contracts, SLAs, onboarding, tasks) | **Manage incidents** (embedded Incident Management scoped to supplier).

### Primary actions

- Add supplier (create drawer).
- Row click → detail drawer; Details → full page.
- Edit supplier (drawer pencil or switchable view on full page).
- Delete supplier (row actions with confirmation).
- Delete individual SLA, contract, or onboarding file.
- Add/remove KPI objectives.
- Raise/manage incidents via embedded incident UI.
- Create/link task.

### Forms

**Supplier create/edit:** Business unit, Supplier name, Account manager, Account number, Email, Buyer, Contract value, Contract start/end dates, Review date, Service provision, SLA files dropzone, Contract files dropzone, Onboarding files dropzone.

**KPI add:** KPI/Objective text (single value field).

**Filter:** Business units (multi), Logged by (multi).

**Supplier incidents:** Standard Incident Management form when embedded (see Incident specification).

### Lists / tables / cards / detail views

- Primary list is a data table with compliant badge.
- Detail shows attachment lists with delete buttons per file.
- KPI entries shown as cards with delete.
- Embedded incident table from Incident Management module.

### Navigation and workflow

```
Sidebar Suppliers → list (search/filter)
  → Add → create drawer → detail drawer
  → Row click → drawer OR Details → full page
  → Edit supplier / manage files / KPIs
  → Manage incidents tab/panel → full incident workflow scoped to supplier
  → Link tasks
```

### Material empty, loading, or restricted states

- Loading on list and detail fetch.
- Empty table: “No data found”.
- Full detail error: “This supplier has been deleted or removed”.
- Drawer without supplier data renders minimal/empty.
- Delete attachment requires DELETE permission.
- Create gated by CREATE; delete by DELETE + admin/creator.
- Related Documents tab hidden without Document Management read.

---

## 9. Miscellaneous / Module-Specific Information

### Terminology

- **Compliant** in UI — means the supplier has at least one SLA **or** contract file attached (`isCompliant`), not a full compliance assessment workflow.
- **KPI Objective** — free-text note on the supplier; not connected to Management Review KPI tracking or automated metrics.
- **Supplier incident** — standard Incident Management record linked via source to the supplier, not an embedded sub-record.

### Important business rules (observed)

- `isCompliant = true` when `slaFiles.length > 0 OR contractFiles.length > 0`.
- `isCompliant = false` only when **both** SLA and contract arrays are empty.
- Onboarding files never affect compliance.
- Buyer change triggers notification to new buyer.
- Becoming compliant (via files) can notify Super Admins.
- List uses role-based business-unit filtering (same pattern as other modules).
- Supplier delete cascades to linked tasks.

### Frontend vs backend discrepancies (requires confirmation)

| Topic | Frontend | Backend | Conclusion |
| ----- | -------- | ------- | ---------- |
| Supplier incidents | Embedded Incident API + headers | Nested `/suppliers/:id/incidents` **commented out** | Active path is generic incidents with supplier source |
| Dedicated SLA add route | Unused attach forms; body `{ slaFile }` | Controller reads `req.query` | Dedicated route likely broken; use create/update dropzones |
| SLA delete button | May call `deleteSla` | Store exports `deleteSLAs` | Possible runtime error on SLA delete |
| Detail route licence | `RISK_MANAGEMENT` | N/A | May block users with supplier licence only |
| `getSupplierIncidents` in store | Still called on fetch | Route inactive | Dead/failing call; result discarded |
| Stats chart | Hardcoded values in one chart component | Live stats API exists | Chart may not reflect real data |
| Edit form file arrays | Reset to empty on load | Update appends via `$push` | Whether update clears files unclear |
| Get/update by ID | N/A | No org filter on get/update/delete | Cross-org access by ID possible |

### Backend-only or partially exposed

- `GET /stats/supplier` for dashboard.
- Legacy supplier incident controller/service code (unreachable).
- `P1_INCIDENT_SUPPLIER_EVENT` notification only in legacy incident path — not wired to main incident create.
- Data import validation stub.
- Buyer ownership transfer on user deletion (queue).
- Digital maturity scoring includes supplier compliance.

### Unclear or incomplete behavior

- Whether calendar events are removed when supplier is deleted.
- Whether dedicated attach routes work if re-enabled.
- Intentional detail-page Risk Management licence vs Supplier Management licence on list.
- Whether automated KPI tracking or SLA performance monitoring exists anywhere (not found in supplier module).
