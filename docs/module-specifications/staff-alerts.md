# Staff Alerts

## 1. Module Overview

**Staff Alerts** is a **backend-only, partially implemented** capability in iMS. It is routed under the **Staff Wallet** API area and persists short-lived operational records when a staff member raises an alert associated with a **location**.

A **Staff Alert** in this system is **not** the same as a **Notification**. Notifications are per-user in-app messages created automatically or manually by other modules and shown in the global bell panel. A Staff Alert is a separate persisted record with its own reference (`ALT-{number}`), creator, location, optional resolution text, and model fields for follow-up actions and closure that are **not currently exposed through supported update flows**.

The module’s apparent business purpose is to let staff **raise a location-based alert** that can later be **resolved** and, in the data model, **closed** or annotated with actions — consistent with a staff welfare, lone-worker, or “alert my organisation from where I am” workflow. However, **no user-facing UI** was found in the frontend, **no recipient or audience selection** exists on the record, and **no automatic delivery** (Notifications, email, pop-ups, or push) is triggered when an alert is created.

Primary intended users **cannot be confirmed from the current product UI** because Staff Alerts are not surfaced in navigation or screens. Backend access requires an authenticated organisation session (same as other organisation-scoped APIs) but **no role-based permission checks** are applied to Staff Alert routes. **Observed but business purpose unclear** — the success message *“People alerted successfully”* implies notifying others, but the implementation stores only creator and location with no recipient mechanism.

---

## 2. Features and Capabilities

### Raise a staff alert (create)

- **Capability:** Record that a staff member has raised an alert from a stated location.
- **Who uses it:** Any authenticated API caller with a valid organisation session — **no dedicated UI or RBAC gate observed**.
- **Outcome:** A new Staff Alert record is created with reference `ALT-{ID}`, the alerting user (`alertedBy`), alert timestamp (server-set), and location text. Response message: *“People alerted successfully.”*
- **Conditions:** Creation accepts `alertedBy` (user who raised the alert) and `location` (free-text location). Controller passes organisation ID from the session, but the creation service **does not persist organisation** on the record — **requires confirmation** whether organisation scoping is intended. Input validation in the controller is a stub that always passes.

### List staff alerts

- **Capability:** Retrieve a paginated list of Staff Alerts filtered by the user who raised them.
- **Who uses it:** Authenticated API callers supplying a `userId` query parameter.
- **Outcome:** Paginated list of alerts with populated creator details (name, email, profile image), plus pagination metadata. Response message: *“Alert retrived successfully.”* (sic)
- **Conditions:** Query is scoped to `"alerted.by": userId` from the request query string — alerts are listed **by creator**, not by recipient (no recipient field exists). Supports standard list query options: `page`, `size`, `sort`, and text search on **reference** via shared filter utilities. **Does not filter by organisation** in the list query despite the model supporting an organisation field — **requires confirmation** of intended access scope.

### View a single staff alert

- **Capability:** Retrieve one Staff Alert by its record ID.
- **Who uses it:** Authenticated API callers who know the alert ID.
- **Outcome:** Full alert record with populated user references for creator, action authors, and closer (when present).
- **Conditions:** No additional ownership or organisation check beyond session authentication — **requires confirmation** whether cross-user or cross-organisation access is intended.

### Update alert resolution

- **Capability:** Set or change **resolution** text on an existing Staff Alert.
- **Who uses it:** Authenticated API callers.
- **Outcome:** Updated alert returned with resolution field changed. Response message: *“Alert updated successfully.”*
- **Conditions:** **Only `resolution` is updatable** through the supported update operation. Model fields for **actions**, **closed status**, **location**, and **creator** are not changeable via the current update path.

### Delete a staff alert

- **Capability:** Permanently remove a Staff Alert record by ID.
- **Who uses it:** Authenticated API callers.
- **Outcome:** Record deleted; deleted record returned in response. Response message: *“Alert deleted successfully.”*
- **Conditions:** Hard delete (not soft delete). **No observed effect** on Notifications or other modules. No restriction based on alert age, closure state, or creator.

### Record follow-up actions (model only — not API-supported)

- **Capability:** **Not currently available** through supported create/update operations.
- **Who uses it:** N/A
- **Outcome:** The data model defines an `actions` array (action text, creator, timestamp) but no controller/service path creates or appends actions.
- **Conditions:** **Implementation suggests this behavior, but confirmation is required** — may be planned for a future workflow step.

### Close an alert (model only — not API-supported)

- **Capability:** **Not currently available** through supported update operations.
- **Who uses it:** N/A
- **Outcome:** The data model defines `closed` (boolean status, who closed, when) defaulting to not closed, but no API sets these fields.
- **Conditions:** **Implementation suggests this behavior, but confirmation is required**.

---

## 3. User Outcomes / End Results

Because **no frontend screens** implement Staff Alerts today, end-user outcomes are **limited to what an API-integrated client could achieve**:

- **Create:** An authorised caller can persist a location-based alert attributed to a specific user (`alertedBy`).
- **View:** A caller can list alerts raised by a given user (`userId` query) or fetch one alert by ID.
- **Manage:** A caller can delete an alert permanently.
- **Change:** A caller can update **resolution text** only.
- **Information received:** Alert reference, who raised it and when, location, resolution (if set), timestamps, and populated user display fields for related users. **Recipients do not receive anything automatically.**
- **Business actions enabled:** **Current behavior could not be fully determined from the inspected code** for end-user business value without a consuming UI or delivery mechanism. The stored record could support audit or welfare workflows once a client and audience logic exist.

---

## 4. Scope Boundaries

### In scope

- Persisted Staff Alert records (`ALT-{ID}` reference).
- Create with creator and location.
- Paginated list filtered by alerting user.
- Single-record retrieval.
- Resolution text update.
- Permanent deletion.
- User population on creator and related user fields when returning records.

### Out of scope (handled elsewhere)

- **Notifications module** — in-app bell alerts, pop-ups, WebSocket push, nudge, and manual broadcast notices. Staff Alerts **do not** create Notifications in the current implementation.
- **Toast / popup UI alerts** (`useAlerts`, `AlertContext`, SweetAlert dialogs) — ephemeral frontend feedback, unrelated to Staff Alert records.
- **Document Management “Important Alerts”** — inline banners for pending authorisation/signature, unrelated.
- **Dashboard incident resolution alerts** — performance flags when resolution times exceed organisation targets, unrelated.
- **Email account past-due alerts** — billing email templates, unrelated.
- **Staff Wallet UI flows** (expense reports, leaves, work logs, clock-in) — separate wallet capabilities; no Staff Alert UI or service calls observed in the wallet frontend.
- **Recipient / audience selection** — not implemented on Staff Alert records.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **Staff Wallet** | Staff Alert routes and data model live under the Staff Wallet API namespace and wallet data area. Conceptually adjacent (staff operational tooling) but **no workflow integration** — wallet screens do not create or display Staff Alerts. |
| **Users** | Each alert is attributed to a user who raised it (`alerted.by`). User name, email, and profile image are populated when alerts are returned. Model also references users for action authors and closer when those fields are populated. |
| **Organisation** | Model includes organisation via shared org-data plugin, and create controller passes session organisation ID, but organisation is **not saved on create** and **not enforced on read/update/delete** in current service logic — relationship is **structurally present, operationally inactive**. |
| **Notifications** | **Unrelated in current implementation.** No code path creates Notifications when Staff Alerts are created, updated, or deleted. Notifications remain the product’s delivery channel for module events; Staff Alerts are standalone records without delivery. |

No confirmed links to Incidents, Risks, Tasks, Functional Units, Roles, or other workflow modules were found.

---

## 6. Current Data Model

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| **Staff Alert** | A record that a staff member raised an alert associated with a location, optionally resolved or closed | Primary persisted entity |
| **Alert reference** | Human-readable identifier `ALT-{number}` auto-assigned on create | Used for search in list queries and identification |
| **Alerting user** (`alerted.by` / `alerted.on`) | Who raised the alert and when | Required on create; list filter key |
| **Location** | Free-text description of where the alert applies | Required on create |
| **Resolution** | Text describing how or that the alert was resolved | Only field updatable via supported update |
| **Action entry** (in `actions[]`) | A follow-up note or step taken on the alert | Defined on model; **not creatable via current API** |
| **Closed state** (`closed`) | Whether the alert is closed, by whom, and when | Defined on model defaulting to open; **not settable via current API** |
| **Organisation** | Tenant scope for the record | On model schema; **not reliably populated or queried** in current operations |

There is **no separate recipient entity**, **no audience record**, and **no link to a parent business record** (incident, task, etc.) on the Staff Alert schema.

---

## 7. Attributes

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| **Reference** (`ALT-{ID}`) | Stable alert identifier for lookup and list search | Auto-generated before save |
| **Alerted by** | The staff member who raised the alert | Required on create (`alertedBy` in request body); populated with name, email, avatar on read |
| **Alerted on** | When the alert was raised | Set automatically to current server time on create |
| **Location** | Where the staff member was or where the alert applies | Free-text string; required on create |
| **Resolution** | Narrative resolution or outcome of the alert | Optional; only attribute changeable via update |
| **Actions** | Chronological follow-up steps or notes | Each entry has text, author, and timestamp on model; **not writable via current API** |
| **Closed status** | Whether the alert is formally closed | Defaults to not closed; includes closer and close time on model; **not writable via current API** |
| **Organisation** | Owning organisation | On schema; **not persisted on create in current service** |
| **Created / updated timestamps** | System audit times | Automatic timestamps on record |

Attributes **not present** (confirmed absent from model and API): alert title, message body, priority, severity, category, status (beyond closed boolean), expiry date, recipient list, role/Functional Unit audience, delivery status, read status, link to source record.

---

## 8. Current UI Layout

### Main screens / pages

- **No dedicated Staff Alerts screen, route, navigation entry, or frontend service** was found in the codebase.
- Staff Wallet navigation (`My Wallet`, `Staff Wallets`) exists in frontend source but is **commented out** from the main application routes, so wallet screens (expense reports, leaves, work log) may not be reachable in the default build. **None of those wallet screens reference Staff Alerts.**

### Important sections and views

- None for Staff Alerts.

### Primary actions

- None exposed to end users for create, list, view, update resolution, or delete.

### Forms

- None.

### Lists / tables / cards / detail views

- None.

### Navigation and workflow

- No user workflow from login to Staff Alerts. API endpoints exist under the organisation-authenticated Staff Wallet API path (`/wallets/alerts`) for programmatic use only.

### Material empty, loading, or restricted states

- Not applicable — no UI. Related but **unrelated UI patterns** elsewhere: SweetAlert pop-ups (`useAlerts`), navbar Notifications bell, and document “Important Alerts” banners serve different purposes.

---

## 9. Miscellaneous / Module-Specific Information

### Staff Alert vs Notification — confirmed distinction

| Concept | Staff Alert | Notification |
| ------- | ----------- | ------------ |
| **Purpose** | Persist a location-based alert record with creator | Deliver an in-app message to a specific user |
| **Audience** | No recipient field; list by creator only | One record per recipient user |
| **Delivery** | None | Bell panel, optional pop-up, WebSocket, sometimes email |
| **Trigger** | Manual API create only | Module events, nudge, admin broadcast |
| **UI** | None | Global bell + System Defaults broadcast table |
| **Lifecycle** | Resolution update; closed/actions on model only | Sent, read, pop-up states |

The modules are **separate and currently unconnected**.

### Alert lifecycle (confirmed vs model-only)

| State / concept | Confirmed in current behavior |
| ---------------- | ----------------------------- |
| **Created** | Yes — on create with timestamp |
| **Listed / viewed** | Yes — via API |
| **Updated (resolution)** | Yes — resolution text only |
| **Deleted** | Yes — permanent removal |
| **Closed** | Model field only — **not set via API** |
| **Action logged** | Model array only — **not set via API** |
| **Delivered / read** | **Not applicable** — no delivery mechanism |

### Authorization and access

- Routes use **empty RBAC middleware arrays** — no `enforceRbac` checks unlike some other wallet routes (for example CQC PDP forms).
- Organisation session middleware applies globally before wallet routes, so unauthenticated callers are blocked.
- Individual alert fetch, update, and delete **do not verify** that the caller is the creator or belongs to the alert’s organisation.

### Partial implementation indicators

- Success message *“People alerted successfully”* without recipient or notification logic.
- Model fields (`actions`, `closed`) with no corresponding service methods.
- Organisation passed on create but not stored.
- List query filters by `userId` query param rather than defaulting to the current session user.
- Staff Wallet frontend routes commented out at application level.

### Frontend/backend discrepancies

| Area | Backend | Frontend |
| ---- | ------- | -------- |
| Full CRUD (create, list, get, update resolution, delete) | Implemented | **Not implemented** — no API client, hooks, or screens |
| Staff Wallet navigation | N/A | Routes exist in source but are **disabled** in main `routes.js` |
| “People alerted” outcome | Create endpoint succeeds | **No user-visible outcome** — no notification or UI |
| Organisation scoping | Model supports; queries do not enforce | N/A |

### Behavior that could not be confidently determined

- **Business purpose of “location”** — free text only; unclear whether this maps to premises, GPS, remote work site, or clock-in location.
- **Intended audience** for “People alerted successfully” — no recipient model or notification hook found.
- **Whether organisation scoping is a bug or incomplete feature** — org field on schema vs omitted on create and list.
- **Whether actions and closed fields are legacy or planned** — present on schema, absent from API.
- **Whether any external/mobile client consumes these endpoints** — not discoverable from this repository alone.
