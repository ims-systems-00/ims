# Incident Management

## 1. Module Overview

Incident Management is the organisation’s register for recording, owning, tracking, escalating, and resolving incidents (including non-conformities promoted from completed audits).

Its primary business purpose is to give users a structured way to log what happened, assign ownership, set priority, capture affected services and notification methods, attach supporting evidence, link relevant compliance controls, escalate for senior attention, and close incidents with a documented resolution.

It solves the problem of informal or untracked incident handling by keeping a searchable, organisation-scoped register with lifecycle status, ownership, activity history, resolution timing, and connections to related business records (audits, suppliers, customers, compliance controls, tasks, and documents).

Primary users are people with Incident Management access—typically Super Admins, Heads of Service, Basic Users, and Auditors (read-focused)—subject to Incident Management licence and permission checks. Exact role-to-permission mapping for every action: **Unclear — requires confirmation** (see Miscellaneous for observed frontend/backend permission inconsistencies).

---

## 2. Features and Capabilities

### Raise (create) an incident

- **Capability:** Create an incident with title, description, business unit, priority, owner, optional category, method of notification, affected service, privacy scope, and attachments. Optionally link to a source module (standalone, supplier, customer, or audit context via headers).
- **Who uses it:** Users with Incident Management create permission (Raise button).
- **Outcome:** A new incident is stored with a unique reference (`INC-{number}`), creation metadata, and optional source link. The assigned owner is notified by email. P1 incidents additionally create a calendar event for the business unit and system administrators. An activity entry records creation. Compliance automation may be triggered to scan for auto-link opportunities.
- **Conditions:** Backend requires title and description. Frontend additionally requires business unit, owner, priority, and title minimum length (8 characters). Privacy defaults to Business unit unless marked organisational.

### View, search, filter, and open incidents

- **Capability:** Browse a paginated list of incidents; search; filter by status (Open, Escalated, Resolved), business unit, date range, and owners; open an incident in a detail drawer or full detail page.
- **Who uses it:** Users with Incident Management read access and applicable licence.
- **Outcome:** Users see incidents they are allowed to access for their organisation, including reference, business unit, title, priority, status, raised date, and owner. List visibility is further limited by business unit for some roles.
- **Conditions:** **Backend list hard-filters to standalone incidents** (`source.moduleType: incidents`). Frontend default list query also requests audit-sourced incidents, but the backend filter may exclude them from list results — audit-sourced records are typically opened via direct links from Audit. Embedded views (supplier, customer) pass scoped module filters.

### Update an incident

- **Capability:** Change incident details such as title, description, owner, priority, method of notification, affected service, category, privacy, resolution text, and add further attachments.
- **Who uses it:** Users with Incident Management create permission (update uses create permission on backend).
- **Outcome:** The incident reflects the new information. New attachments are appended. Owner changes record ownership-transfer activity. Linked calendar event title/description updated for P1 incidents.
- **Conditions:** Resolved incidents cannot be updated. Title is disabled in the UI when the incident is sourced from an audit. Business unit cannot be changed on edit in the UI.

### Resolve an incident

- **Capability:** Mark an incident as resolved and record resolution text.
- **Who uses it:** Users who can edit the incident (via Resolved checkbox on the edit form).
- **Outcome:** Resolved status is set with who resolved it, when, and resolution time (duration from creation to resolution). Activity records resolution. When resolved via the general update path used by the UI, Super Admins, Heads of Service, creator, and owner may receive resolve notifications. After resolution, edit, escalate, nudge, attachment delete, and ISO link/unlink are blocked in the UI; timeline comments become read-only.
- **Conditions:** Cannot resolve twice. **Current UI path:** resolution is applied through the general update action with `resolveStatus: true` and resolution text, not through the dedicated resolution endpoint (which exists but is unused in the main UI). Dedicated resolution endpoint does not trigger the same notification bus event as the update path — **requires confirmation** of intended notification behavior.

### Escalate an incident

- **Capability:** Escalate an incident for senior attention.
- **Who uses it:** Users for whom the UI shows escalate (permission checks differ by location — see Miscellaneous).
- **Outcome:** Escalated status is set with who escalated and when. Super Admins and Heads of Service are notified (including by email). An activity entry records escalation. One-way latch — cannot re-escalate.
- **Conditions:** Escalation blocked if already resolved or already escalated. Backend ignores request body (session user recorded as escalator).

### Delete an incident

- **Capability:** Remove an incident from the register.
- **Who uses it:** Users with Incident Management delete permission; UI further limits delete to organisation admins or the incident creator.
- **Outcome:** The incident is permanently deleted. Tasks sourced from that incident are also removed. P1 calendar event removed.
- **Conditions:** UI blocks delete when resolved. Backend does not enforce resolved guard on delete — **requires confirmation** if API-only delete of resolved incidents is possible.

### Assign or transfer incident ownership

- **Capability:** Set or change the incident owner when creating or updating an incident.
- **Who uses it:** Users who can create or update incidents.
- **Outcome:** Owner is recorded. On assignment or transfer, the new owner is notified (on create). Ownership changes recorded in activity history.
- **Conditions:** Frontend requires owner on create.

### Nudge the incident owner

- **Capability:** Send a nudge notification asking the owner to look at the incident.
- **Who uses it:** Users who can act on a non-resolved incident.
- **Outcome:** Owner receives a nudge notification. Cooldown applies via next-nudge time (approximately 24 hours).
- **Conditions:** Not available for resolved incidents.

### Attach and remove supporting files

- **Capability:** Add attachments when creating or updating an incident; remove individual attachments.
- **Who uses it:** Users on create/edit forms (add); users with delete permission (remove).
- **Outcome:** Files associated with the incident or removed. Adding attachments on update produces attachment-added activity. Frontend also deletes the file from storage on attachment remove.
- **Conditions:** Attachment removal hidden/disabled in UI when resolved. Backend does not block attachment delete on resolved incidents.

### Link and unlink compliance controls

- **Capability:** Associate compliance toolkits and control clauses with an incident, or remove those associations. Compliance module can also link an incident as control evidence (reverse direction).
- **Who uses it:** Users with compliance read access in the UI; backend authorises incident-side link/unlink with Incident Management read permission.
- **Outcome:** Incident shows linked compliance controls. Link/unlink produces compliance-link events for activity. Compliance evidence records can reference the incident.
- **Conditions:** Not allowed when incident is resolved (backend enforced). ISO validation on routes is commented out.

### Create and manage linked tasks

- **Capability:** Create or view tasks associated with an incident.
- **Who uses it:** Users working an incident who have task capabilities.
- **Outcome:** Tasks linked to the incident (`moduleType` incidents). Deleting the incident removes tasks sourced from it.
- **Conditions:** Task behaviour primarily owned by Task Management. **Unclear:** task create drawer in list table may pass wrong module type — **requires confirmation**.

### Manage incident categories (tags)

- **Capability:** Maintain tags/categories applicable to incidents, and assign a category on an incident.
- **Who uses it:** Users on the Incident Categories tab and on the raise/edit form.
- **Outcome:** Incidents classified with organisation tags used for filtering and display.

### View related documents

- **Capability:** Browse documents related to the incidents module type.
- **Who uses it:** Users with Document Management read permission (tab shown only then).
- **Outcome:** Related documents discoverable from within Incident Management.

### Export an incidents report

- **Capability:** Download a CSV report of incidents (reference, business unit, title, description, notification method, affected service, priority, owner, privacy, resolution, raised/resolved/escalated dates and actors).
- **Who uses it:** Backend supports users with Incident Management read permission; report may be group-scoped for non-global-access users.
- **Outcome:** CSV file of up to the most recent 100 matching standalone incidents.
- **Conditions:** **Current UI does not expose this action.** Backend report capability exists.

### View incident summary on dashboards

- **Capability:** See incident charts/stats and navigate to the incidents list.
- **Who uses it:** Dashboard users with access to incident statistics.
- **Outcome:** High-level visibility of incident volume and resolution performance.

### Analyse an incident with AI assistance

- **Capability:** Open an AI analytical assistant for a selected incident from the list drawer toolbar.
- **Who uses it:** Users who pass toolbar permission gate (currently tied to Risk Management create permission — likely unintended).
- **Outcome:** Analytical guidance; not persisted as formal workflow state.

### Embedded incident views (supplier / customer)

- **Capability:** View and raise incidents scoped to a supplier or customer from those modules’ detail pages.
- **Who uses it:** Users with Incident Management read/create in those contexts.
- **Outcome:** Filtered incident list and create with source linkage to supplier or customer.

---

## 3. User Outcomes / End Results

- **Create:** A structured incident record with reference, priority, ownership, and optional links to source modules, attachments, and categories.
- **View:** Searchable/filterable register and detailed views of description, resolution, priority, lifecycle status, attachments, activity, tasks, and linked compliance controls.
- **Manage:** Categories, linked tasks, related documents (when permitted), and compliance associations.
- **Change:** Incident details and attachments until resolved; ownership transfers.
- **Information received:** Status (Open / Escalated / Resolved), lifecycle who/when metadata, resolution time, notifications on assignment, escalation, resolution (via update path), and nudges; activity history and comments (read-only once resolved).
- **Business actions enabled:** Formal incident logging and ownership; priority-based handling (including P1 calendar visibility); escalation to senior roles; documented closure with resolution; evidence linkage for compliance; operational follow-up via tasks.

---

## 4. Scope Boundaries

### In scope

- The organisational incident register (create, read, update, delete).
- Priority (P1–P4), ownership, privacy scope, and lifecycle flags (resolved, escalated).
- Resolution text and resolution time measurement.
- Attachments on incidents.
- Linking/unlinking compliance controls; incident as compliance control evidence.
- Incident-side entry points for tasks, categories, related documents, nudges, AI analysis, dashboard stats, CSV export (backend).
- Embedded incident lists for suppliers and customers.
- P1 calendar events tied to incidents.

### Out of scope (handled elsewhere)

- **Audit non-conformity capture during audit conduct** — belongs to Audit; on completion promoted to Incident records with audit source link.
- **Compliance control administration** — Compliance module owns frameworks; Incident links controls and serves as evidence.
- **Task lifecycle** — Task Management.
- **Document content management** — Document Management.
- **Organisation SLA targets for P1–P4 resolution times** — configured in organisation settings; used for stats/comparison, not incident CRUD UI.
- **CQC complaints/whistleblowing** — separate module despite similar terminology.
- **Supplier-nested incident API routes** — commented out on backend; UI uses generic incident API with source headers.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| Audit | Non-conformities promoted to incidents on audit completion with source link; audit UI links to incident detail; audit-sourced incidents show audit context and locked title in UI. |
| Compliance | Incidents linkable as control evidence; incidents can link ISO controls; compliance automation triggered on incident create. |
| Tasks | Create/view tasks sourced from an incident; deleting incident removes sourced tasks. |
| Documents | Related Documents tab; document tree nodes linkable as control evidence. |
| Tags / Categories | Optional category on incident; Incident Categories tab. |
| Supplier Management | Embedded incident list/create scoped to supplier source. |
| CRM / Customers | Embedded incident panel scoped to customer source (live customers). |
| Calendar | P1 incidents create/update/delete calendar events. |
| Notifications | Owner assign, escalate, resolve (update path), nudge. |
| Dashboard / Stats | Incident charts, resolution metrics, supplier incident stats. |
| AI Analytical Assistant | Optional analyse experience from list drawer. |
| Organisation settings | P1–P4 resolution time targets for performance comparison. |

---

## 6. Current Data Model

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| Incident | An organisational incident / non-conformity record | Primary record users raise, own, escalate, resolve, and review |
| Lifecycle flags (resolved / escalated) | Boolean status with actor and timestamp | Drive status display, locks, and notifications |
| Resolution | Text describing how the incident was closed | Required for meaningful closure; shown when resolved |
| Resolution time | Duration from creation to resolution | Calculated on resolve; shown in overview |
| Attachment | Supporting file on the incident | Evidence and supporting material |
| Compliance link (toolkits + clauses) | Associated compliance frameworks and controls | Shows which controls relate to the incident |
| Source link | Optional originating module and record | Standalone, audit, supplier, or customer origin |
| Linked task | Task sourced from the incident | Operational follow-up (Tasks module) |
| Category / tag | Classification label | Filtering and overview |

There is **no** separate multi-value “status” field — status is derived from resolved and escalated flags: **Open** (not resolved, not escalated), **Escalated** (escalated and not resolved), **Resolved** (resolved).

---

## 7. Attributes

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Reference | User-facing identifier | Generated as `INC-{number}` |
| Title | Short name of the incident | Required; min 8 chars in UI; locked when audit-sourced |
| Description | Full description | Required; rich text in UI |
| Business unit (group) | Organisational unit | Required in UI; not editable after create |
| Priority | Urgency level | P1–P4; default P3 on backend, P1 default in UI form; P1 triggers calendar event |
| Owner | Person responsible | Required in UI |
| Method of notification | How the incident was reported | Optional |
| Affected service | Service impacted | Optional |
| Category (tags and categories) | Additional classification | Optional |
| Privacy | Organisational vs business-unit scope | Organisational / Business unit; **backend list filtering by privacy unclear** |
| Resolution | Closure narrative | Shown when resolving |
| Resolved (status, by, on) | Whether closed, who, when | Locks further mutation |
| Resolution time | Time to resolve | Milliseconds from create to resolve |
| Escalated (status, by, on) | Whether escalated, who, when | One-way; blocks re-escalation |
| Attachments | Supporting files | Add on create/update; remove individually |
| Linked compliance toolkits / clauses | Related compliance controls | Cannot change when resolved |
| Source (module type / module) | Originating record | incidents, audits, suppliers, customers |
| Supplier | Supplier association | When supplier-sourced |
| Raised by / on | Creator and timestamp | Set on create |
| Updated by / on | Last update metadata | Set on update |
| Next nudge at | Nudge cooldown | ~24h after nudge |
| Organisation | Tenant scope | Always applied |

---

## 8. Current UI Layout

### Main screens / pages

- **Incidents list** — `/admin/incidentmanagement`, sidebar label **Incidents**.
- **Incident detail page** — `/admin/incidentmanagement/:id` (not shown in sidebar).
- Entry also from dashboard widget, audit non-conformity links (post-completion), compliance linked-incident cards, staff wallet/work log.
- **Embedded:** Supplier detail tab, CRM customer detail panel (scoped lists).

### Important sections and views

**List page tabs**

1. **All Incidents** — searchable/filterable table and drawers.
2. **Incident Categories** — tags manager for incidents.
3. **Related Documents** — only if Document Management read access.

**List table columns:** Reference, Business Unit, Title, Priority (colour-coded P1–P4), Status (Open / Escalated / Resolved), Raised, Owner, Actions.

**Detail drawer tabs:** Details, Activity, Life Cycle, Tasks (if read access), Linked controls.

**Full detail page tabs:** Description, Activity, Task.

**Details content:** Overview (reference, business unit, priority, owner, raised by, affected service, notification method, resolution time when resolved, audit/supplier source when present), description, resolution (when present), attachments, linked compliance stripes.

### Primary actions

- Raise incident (create drawer).
- Open detail drawer (row click) or full Details page (row actions).
- Edit / update / resolve (edit drawer or description tab edit; Resolved checkbox + resolution field).
- Escalate, Nudge, Delete (row/drawer/detail actions; restricted when resolved).
- Link / unlink compliance controls.
- Create / link task.
- Analyse (AI assistant).
- Delete attachment.

### Forms

Single raise/edit form (`IncidentForm.jsx`):

- Business unit, Title, Method of notification, Affected service, Priority, Incident owner, Category, Privacy (organisational checkbox on create), Description, Attachments.
- On edit: Resolution field (when Resolved checked), Resolved checkbox.
- Filter form: status presets, business units, date range, owners.

### Lists / tables / cards / detail views

- Primary presentation is a data table.
- Drawer/detail use bordered sections; compliance controls as stripes/cards.
- Lifecycle table in Life Cycle tab (`IncidentStatus`).

### Navigation and workflow

```
Open Incidents from sidebar (or dashboard/audit/compliance links)
  → Raise incident or select existing one
  → Optionally nudge, escalate, link controls, link tasks, or run AI analysis
  → Edit to update details and/or mark Resolved with resolution text
  → Resolved: read-only comments; most mutating actions hidden
  → Delete (if permitted and not resolved in UI)
```

No multi-step wizard.

### Material empty, loading, or restricted states

- Loading placeholders while list, detail, or linked controls load.
- Empty table: “No data found”.
- Empty description/affected service/notification: empty-state messaging.
- Missing incident on detail: “This incident has been deleted or removed.”
- Empty linked controls: “There are no controls linked to this.”
- Restricted: without create permission, no Raise/edit; without delete permission, no delete/attachment delete/escalate (in some UI locations); resolved incidents suppress edit, escalate, nudge, attachment delete.
- Nudge disabled during cooldown; already escalated shows feedback.

---

## 9. Miscellaneous / Module-Specific Information

### Terminology

- **Incident** in this module includes standalone raised incidents and audit-promoted non-conformities (audit-sourced).
- **NC / non-conformity** — Audit terminology; becomes an incident record on audit completion with audit source link.
- **Open / Escalated / Resolved** — UI status derived from `resolved.status` and `escalated.status` (Open = neither resolved nor shown as escalated).

### Important business rules (observed)

- Resolved is the main lock: blocks update, escalation, ISO link/unlink (backend); UI also blocks edit, nudge, escalate, attachment delete.
- Escalation is one-way and blocked if resolved or already escalated.
- P1 priority creates a calendar event on create.
- Deleting an incident removes tasks sourced from it.
- List visibility by role (backend): Super Admin, External Auditor, Internal Auditor see all org incidents; Head of Service and Basic User see incidents in their business unit plus incidents with no business unit; External User sees only their business unit.
- Backend list and report hard-filter `source.moduleType: incidents` — audit-sourced incidents may not appear in main list API results despite frontend filter intent.

### Frontend vs backend discrepancies (current behaviour — requires confirmation)

| Topic | Frontend evidence | Backend evidence | Business conclusion |
| ----- | ----------------- | ---------------- | ------------------- |
| Resolve path | Edit form → `updateIncident` with `resolveStatus` | Dedicated `/resolution` also exists; triggers different notification set | UI uses update path; notification behavior may differ from dedicated endpoint |
| List includes audit-sourced | Default filter requests `incidents` + `audits` | Controller hard-filters `source.moduleType: incidents` only | Audit-sourced incidents likely **absent from main list**; accessed via audit links |
| Escalate permission | Table: DELETE on Incident; drawer: DELETE on Risk Management; detail: no explicit gate | CREATE on escalation route | Inconsistent UI permission gates |
| Edit/analyse toolbar | Risk Management CREATE | Incident CREATE for update | Toolbar may be hidden incorrectly or over-permissive |
| CSV export | No UI | Report download supported | Export implemented server-side but not exposed in UI |
| Delete resolved | UI blocks | Backend delete has no resolved guard | API may allow delete when UI does not |
| Task drawer module type | List drawer passes `moduleType="audits"` | Tasks expect `incidents` | Task linkage from list drawer may be wrong |
| ISO link on backend | N/A | `mainChannel` import may be missing in compliance service | Link/unlink may fail at runtime — **requires confirmation** |
| Report CSV owner column | N/A | Column mapping bug | Owner may be empty in export |
| Privacy field | UI captures Organisational/Business unit | No query filter on privacy found | Cross-BU visibility rules for “organisational” incidents **unclear** |

### Priority and SLA context

- Priorities P1–P4 are selectable on incidents.
- Organisation settings define target resolution times per priority; dashboard/stats may compare actual `resolutionTime` against these targets — not enforced as hard blocks in incident workflow.

### Backend-only or partially exposed behavior

- P1 calendar auto-sync.
- Compliance automation queue on create.
- Data import validation for incidents.
- Stats endpoint for dashboards.
- Dual resolve notification paths (update vs `/resolution`).
- External identity RBAC bypass for API integrations.

### Unclear or incomplete behavior

- Whether ISO control link/unlink works reliably (import and duplicate `$push` issues reported in backend).
- Whether dedicated `resolveIncident` endpoint is intentionally deprecated in favor of update.
- Exact notification recipients for resolve via update vs `/resolution`.
- Whether organisational privacy affects who can see an incident beyond business-unit list filtering.
