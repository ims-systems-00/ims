# KPI Objective

## 1. Module Overview

KPI Objective is the organisation’s register for defining and maintaining Key Performance Indicators and objectives at **organisational** or **business-unit** level.

Its primary business purpose is to give leaders a simple way to record what the organisation or a business unit is aiming to achieve, view those statements grouped by scope, and reference them elsewhere (audits, dashboard reports). In the current UI, a KPI Objective is essentially a **free-text statement** (the “KPI/Objective” field) with privacy scoping—not an actively tracked performance metric with user-facing targets or progress.

It solves the problem of scattered strategic goals by centralising KPI/objective statements under Management Review, with optional business-unit assignment and notification to Heads of Service when a new business-unit KPI is added.

Primary users are people with Management Review and KPI Objective access—Super Admins, Heads of Service, and Auditors (read-focused) per route configuration. Create/edit/delete on individual records is further limited to the creator with KPI Objective permissions.

---

## 2. Features and Capabilities

### Add a KPI/Objective

- **Capability:** Create a KPI or objective statement with privacy (Organisational or Business unit) and, for business-unit scope, select the business unit.
- **Who uses it:** Users with KPI Objective create permission (Add KPI tab).
- **Outcome:** A new record is stored with reference `KPI-{number}`, the objective text, privacy, and optional group. Heads of Service for that business unit are notified when a business-unit KPI is created.
- **Conditions:** Non–global-access users can only choose Business unit privacy. Organisational privacy requires global access in the UI. Backend route requires Management Review CREATE permission.

### View KPI/Objectives by organisation

- **Capability:** See all KPI/objectives scoped as **Organisational**.
- **Who uses it:** Users with Management Review read access on the KPI/Objectives screen.
- **Outcome:** List of cards showing reference, objective text, creator, and date. Empty state: “Your organisation has no KPI/Objective(s) set up.”
- **Conditions:** Client-side filter on `privacy === "Organisational"`.

### View KPI/Objectives by business unit

- **Capability:** Select a business unit and view KPI/objectives assigned to that unit.
- **Who uses it:** Users with Management Review read access.
- **Outcome:** Filtered list of business-unit KPI cards for the selected unit. Empty state when unit has none.
- **Conditions:** Client-side filter on matching `group._id`.

### Update a KPI/Objective

- **Capability:** Change the KPI/objective text (and privacy is sent on update but privacy fields are hidden in edit form).
- **Who uses it:** Record creator with KPI Objective update permission.
- **Outcome:** Updated text reflected in list. No notification on update.
- **Conditions:** Inline edit on card; only creator sees edit button. Backend update route uses Management Review CREATE permission.

### Delete a KPI/Objective

- **Capability:** Permanently remove a KPI/objective.
- **Who uses it:** Record creator with KPI Objective delete permission.
- **Outcome:** Record removed from list after confirmation.
- **Conditions:** Backend requires Management Review DELETE. No cascade behaviour identified.

### Reference organisational KPIs in Audit

- **Capability:** Display organisational KPI/objective statements (no group) when creating/editing an audit.
- **Who uses it:** Audit users; KPI list loaded alongside audit data.
- **Outcome:** Read-only numbered list of organisational KPI text in the audit form for context.
- **Conditions:** Filters organisational KPIs where `group` is absent/null. Does not create or link audit records to KPI entities.

### Include KPIs in dashboard reports

- **Capability:** Organisational and business-unit KPI objective **text values** appear in exported organisation and business-function dashboard PDF reports.
- **Who uses it:** Dashboard report recipients (indirect).
- **Outcome:** Report includes a list of KPI/objective statements for the relevant scope.
- **Conditions:** Backend dashboard service queries KPI records by privacy/group; no progress or target values included in reports.

---

## 3. User Outcomes / End Results

- **Create:** Organisational or business-unit KPI/objective statements with reference ID.
- **View:** All KPIs grouped by Organisation tab or filtered by business unit; read-only reference in Audit forms.
- **Manage:** Creator can edit text or delete their own records.
- **Change:** Objective wording (value field); privacy/group fixed after create in UI (privacy controls only on create form).
- **Information received:** Notification to Heads of Service when a new business-unit KPI is assigned to their unit.
- **Business actions enabled:** Document strategic targets at org or unit level; align audits and dashboard reporting with stated objectives. **Active performance measurement against targets is not available in the current UI.**

---

## 4. Scope Boundaries

### In scope

- Standalone KPI/Objectives screen under Management Review → Reviews → **Kpi/Objectives** (`/admin/kpiobjective`).
- CRUD for central `kpiobjectives` records (text + privacy + business unit).
- Organisation vs business-unit views.
- Notifications on new business-unit KPI.
- Read-only consumption in Audit form and dashboard report exports.

### Out of scope (handled elsewhere)

- **Supplier embedded KPI notes** — separate `{ value }` subdocuments on supplier records via Supplier Management routes; same label in UI but **not** the central KPI Objective module.
- **Management Review meetings** — separate submodule (scheduling, minutes, agendas).
- **Target/current value tracking UI** — fields exist on backend model but **no frontend exposure**.
- **Module linking UI** — backend supports `moduleType`/`module` on records; **not used** by Management Review create form.
- **Compliance toolkit KPI columns** — ISO compliance data model references; not this module’s CRUD UI.
- **IMS Projects work-package progress** — separate progress-percentage feature.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| Management Review | Parent navigation group; KPI Objectives live under Reviews alongside meetings. |
| Audit | Loads organisational KPI list for read-only display in audit create/edit form. |
| Dashboard / Reporting | Organisation and business-function dashboard PDF reports include KPI objective text lists. |
| Notifications | New business-unit KPI notifies Heads of Service for that unit. |
| Our IMS (Business units) | Business-unit KPIs scoped to a group; org-wide KPIs have no group. |
| Users | Creator owns edit/delete rights; creator shown on each card. |
| Task / Risk / CIP / others | Backend model allows `moduleType`/`module` linking; **no current UI workflow** for attaching KPIs to these entities from the KPI module. |

**Note:** Supplier Management exposes similarly named “KPI/Objective” notes on supplier records via a different API and data store. That is **not** part of this module.

---

## 6. Current Data Model

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| KPI Objective | A stated KPI or objective (primarily free text) | Primary record |
| Privacy | Organisational vs Business unit scope | Determines visibility grouping |
| Business unit (group) | For business-unit KPIs — which unit owns the objective | Filtering and notifications |
| Reference | User-facing identifier | `KPI-{number}` |
| Target value | Numeric target (backend) | **Not exposed in UI** |
| Current value | Numeric actual (backend) | **Not exposed in UI** |
| Progress percentage | Derived ratio (backend) | **Not exposed in UI** |
| Module link (moduleType / module) | Optional link to another record | **Supported in backend; unused in Management Review UI** |

There is **no separate** target, measurement history, or evaluation-period entity in user-facing behaviour.

---

## 7. Attributes

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Reference | User-facing identifier | `KPI-{number}` |
| KPI/Objective (value) | The objective statement text | Required; only field users routinely edit |
| Privacy | Organisational / Business unit | Default Organisational in backend; UI create default Business unit |
| Business unit (group) | Owning unit for business-unit KPIs | Null for organisational KPIs |
| Target value | Numeric target | Default 0; **no UI** |
| Current value | Numeric actual progress | Default 0; **no UI** |
| Progress percentage | Calculated % of target | Auto on save when target > 0; **no UI** |
| Unit | Measurement unit string | **No UI** |
| Module type / module | Link to another business record | Enum supports many module types; **not set from KPI UI** |
| Created (by, on) | Who added the KPI and when | Creator can edit/delete |
| Status (Completed) | Set in model pre-save when progress ≥ 100% | **Not in schema; likely not persisted** — requires confirmation |

---

## 8. Current UI Layout

### Main screens / pages

- **KPI/Objectives** — `/admin/kpiobjective`, sidebar **Reviews** → **Kpi/Objectives** (Management Review licence + read).

### Important sections and views

**Tab navigation:**

1. **Add KPI** (visible only with KPI Objective CREATE) — create form.
2. **Business units** — business-unit selector + filtered KPI cards.
3. **Organisation** (default tab) — all organisational KPI cards.

**KPI card (list item):** Creator avatar/name and date; reference + objective text; edit (pencil) and delete (trash) for creator only.

**No dedicated detail page** — individual `getKpiObjective` API exists but is **not used** in frontend.

### Primary actions

- Add KPI (create form submit).
- Select business unit (business units tab).
- Edit inline (switches card to form with Update/Cancel).
- Delete with confirmation modal.

### Forms

**Create form:** Privacy dropdown (Organisational only for global-access users; otherwise Business unit only); Business unit selector (when Business unit privacy); KPI/Objective text field; Add KPI button.

**Edit form:** KPI/Objective text only (privacy/group not re-editable in UI); Update / Cancel.

### Navigation and workflow

```
Reviews → Kpi/Objectives
  → Add KPI tab: set privacy + unit + text → create → appears in Organisation or Business units tab
  → Organisation tab: view/edit/delete organisational KPIs
  → Business units tab: pick unit → view/edit/delete unit KPIs
  → (Elsewhere) Audit form shows organisational KPI text read-only
  → (Elsewhere) Dashboard PDF reports list KPI text
```

### Material empty, loading, or restricted states

- Loading spinner on initial fetch (Business units tab).
- Empty organisation: “Your organisation has no KPI/Objective(s) set up.”
- Empty business unit: “The business unit currently have no KPI/Objective setup for them.”
- Add KPI tab hidden without KPI Objective CREATE.
- Edit/delete hidden for non-creators.
- Non–global-access users cannot create Organisational KPIs in UI.

---

## 9. Miscellaneous / Module-Specific Information

### Terminology

- **KPI/Objective** in UI — the free-text statement field (`value`), not a measured metric in practice.
- **Organisational** vs **Business unit** privacy — determines which tab displays the record and whether a group is assigned.
- Backend messages refer to “KPI metric” — UI uses “KPI/Objective”; same entity.

### Measurement, progress, and performance behaviour

**Explicit finding:** The backend model and service support numeric **target value**, **current value**, and auto-calculated **progress percentage** (with validation that current ≤ target on update). The model pre-save hook also attempts to set a “Completed” status when progress reaches 100%.

**However, the current frontend does not expose any of these fields.** Users cannot enter targets, record actuals, view progress bars, or mark achievement through the UI. Create/update from Management Review sends only `value`, `privacy`, and `group`.

**Conclusion:** KPI Objectives are **stored and displayed as textual objectives**, not actively measured or tracked in the user-facing product. Backend measurement infrastructure exists but is **unintegrated** with the UI.

### Important business rules (observed)

- List retrieval is organisation-scoped with role-based business-unit filter (`basicRoleScopedFilter`).
- Search on list supports reference and title fields server-side; frontend fetches all records without pagination parameters.
- New business-unit KPI notifies Heads of Service for that group (in-app only, no email).
- Edit/delete restricted to creator in UI; backend delete has no creator check.
- RBAC on routes uses **MANAGEMENT_REVIEW** service; UI permission checks use **KPI_OBJECTIVE** service for create/update/delete tab and buttons.

### Supplier “KPI/Objective” (separate implementation)

Supplier detail pages include an “Add KPI/Objective” form and list using **supplier embedded notes** (`supplier.kpiObjectives[]` with `{ value }` only), via `POST/DELETE .../suppliers/:id/kpi-objectives`. This is **not** the central KPI Objective module and has no privacy, reference, target, or progress fields. Documented here because the UI label overlaps.

### Frontend vs backend discrepancies (requires confirmation)

| Topic | Frontend | Backend | Conclusion |
| ----- | -------- | ------- | ---------- |
| Create payload | value, privacy, group only | Accepts moduleType, module, targetValue, unit; validation schema requires moduleType/module | Validation **not wired** in controller; create works without links |
| Organisational group | Sets group null when privacy `"Orgnisational"` (typo) | Expects `"Organisational"` | Organisational KPIs may incorrectly retain a group — **requires confirmation** |
| Update permission | KPI_OBJECTIVE UPDATE | Route uses MANAGEMENT_REVIEW CREATE | Permission mismatch |
| Route access | MANAGEMENT_REVIEW READ | Same on GET | KPI_OBJECTIVE used only for mutating UI gates |
| Target/progress | Not shown | Model + update validation | Measurement dead in UI |
| getKpiObjective | Service defined | API exists | No detail page |
| Status Completed | N/A | pre-save sets status not in schema | Likely not persisted |
| Pagination/search | Loads all KPIs | Supports page, size, sort, search | Frontend ignores server pagination |

### Unclear or incomplete behavior

- Whether `moduleType`/`module` are populated by data import or any non-UI path.
- Whether organisational KPIs with a group set (due to typo) appear correctly in Audit filter (`!kpi.group`).
- Business purpose of unused `unit` and linking fields without UI.
- Whether “Completed” status was intended for a future achievement workflow.
