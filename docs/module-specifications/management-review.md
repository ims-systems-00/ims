# Management Review

## 1. Module Overview

Management Review is the organisation’s system for **scheduling, conducting, and recording management review meetings**, and for maintaining **KPI/Objectives** at organisational or business-unit level. In the product UI the module appears under the sidebar group **Reviews**, with two areas: **Schedule** (management review meetings) and **Kpi/Objectives**.

A **Management Review** in this system is a scheduled meeting record—not a live meeting platform—with a title, date, time, recurrence interval, privacy scope, attendee list, file attachments for **agenda** and **minutes**, optional linked tasks, and a completion status. Creating a review can generate **multiple scheduled instances** across a year (monthly, quarterly, etc.), each with its own reference and calendar entry.

Its primary business purpose is to give leadership a structured register of when management reviews occur, who attends, what documents were shared (agenda/minutes files), when reviews were completed, and what follow-up tasks were raised—while KPI/Objectives capture strategic statements used in audits and dashboard reporting.

It solves the problem of ad-hoc review scheduling and scattered meeting documents by centralising review instances, attachments, completion tracking, calendar visibility, notifications, and embedded task management.

Primary users are people with Management Review service access. The **Schedule** list route is limited to Super Admin and Auditor roles; detail pages also allow Head of Service and Basic User. Create, edit, complete, and delete require Management Review create/delete permissions as configured in RBAC. KPI/Objectives uses a separate KPI Objective permission for create/edit/delete on individual KPI records (see also `kpi-objective.md` for KPI-specific detail).

---

## 2. Features and Capabilities

### Schedule management review meetings

- **Capability:** Create one or more review instances by entering title, date, time, interval (Monthly / Quarterly / Half yearly / Yearly), attendees, optional agenda and minutes file uploads, and privacy scope (Organisational or Business unit).
- **Who uses it:** Users with Management Review create permission (Schedule button on list).
- **Outcome:** Backend creates **multiple review records** based on interval (12 for Monthly, 4 for Quarterly, 2 for Half yearly, 1 for Yearly), each with reference `MR-{number}`, spaced across the year from the start date (weekends adjusted forward). Calendar events created (azure). Notifications sent to attendees and to Super Admins (organisational) or Heads of Service (business unit). First instance only receives initial agenda/minutes files if uploaded at create.
- **Conditions:** Interval required on backend. Title, date, time required in UI. Business unit required when privacy is Business unit. Non–global-access users default to Business unit privacy with no privacy picker shown.

### View and browse scheduled reviews

- **Capability:** Paginated list of management reviews with reference, title, status (Scheduled / Completed), scheduled date, and interval; search; filter by status and attendees.
- **Who uses it:** Super Admin and Auditor on Schedule route (read access).
- **Outcome:** Users see organisation-scoped reviews filtered by role/business unit. Row click opens preview drawer; Actions → Details opens full page.
- **Conditions:** List uses organisation scope + business-unit role filter. Commented-out attendee/privacy filter logic exists in controller—**not active**.

### View an individual management review

- **Capability:** Open review in drawer (list) or full detail page with sidebar overview, lifecycle status, attendees, agenda files, minutes files, and embedded tasks.
- **Who uses it:** Users with read access on detail route.
- **Outcome:** Reference, interval, scheduled date/time, attendees (names), downloadable agenda/minutes attachments, completion status if completed, linked tasks.
- **Conditions:** Edit toggle hidden when review is completed.

### Update a management review

- **Capability:** Change title, date, time, privacy, attendees; append new agenda and minutes files via edit form dropzones.
- **Who uses it:** Users with Management Review create permission on incomplete reviews.
- **Outcome:** Review updated; calendar event synced. New files appended to existing agenda/minutes arrays.
- **Conditions:** **Blocked when review is already completed** (backend throws). Business unit and interval cannot be changed in UI after create. Attendees replaced as full list on update (not incremental via separate attendee UI in practice).

### Complete a management review

- **Capability:** Mark review as completed from edit form (“Completed” button with confirmation).
- **Who uses it:** Users with create permission editing an incomplete review.
- **Outcome:** `completed.status` set to true; `completed.by` and `completed.on` recorded. UI switches to read-only (no edit toggle). Status badge shows **Completed** in list.
- **Conditions:** **No requirement** for agenda, minutes, or attendees before completion. Backend date guard references `scheduledDate` field which **does not exist** on model (`date` is used)—guard likely ineffective. **Cannot reopen** after completion. **Cannot edit or delete** completed reviews.

### Remove a management review

- **Capability:** Delete an incomplete review from row actions.
- **Who uses it:** Users with delete permission who are the record creator (UI entity access control).
- **Outcome:** Permanent deletion. Linked tasks sourced from this review are removed (source delete plugin).
- **Conditions:** **Completed reviews cannot be deleted.** Calendar event cleanup hook uses `findOneAndDelete` but service uses `deleteOne`—calendar event may remain.

### Manage agenda documents

- **Capability:** Attach agenda files (S3 documents) to a review.
- **Who uses it:** Users on create/edit form (dropzone) or via dedicated add-agenda API.
- **Outcome:** Files stored in `agenda` attachment array; displayed under Agenda section with download.
- **Conditions:** Agenda items are **file attachments**, not text line items. **No edit** of existing files—add (upload) or remove only. Multiple files supported. **No ordering** field. Delete hidden in UI when review completed. Dedicated `AttachAgendaForm` component exists but is **not mounted** in current UI.

### Manage minutes documents

- **Capability:** Attach minutes files (S3 documents) to a review.
- **Who uses it:** Same pattern as agenda.
- **Outcome:** Files in `minutes` attachment array; displayed under Minutes section.
- **Conditions:** Minutes are **meeting document files**, not structured decision/action records. **Not linked to agenda items**. Add/remove only; no in-place edit. `AttachMinuteForm` component **not mounted** in current UI.

### Manage attendees

- **Capability:** Assign system users as attendees via multi-select on create/edit form.
- **Who uses it:** Users creating or editing a review.
- **Outcome:** Attendee user IDs stored; names shown on detail/drawer. Included in calendar event description and attendee notifications.
- **Conditions:** Attendees must be **existing system users** (not external free-text names in active UI). Separate `addAttendee` / `deleteAttendee` API and `AttendeeForm` exist but **AttendeeForm is not mounted**—standalone attendee add sends `{ name }` which does not match backend user ObjectId expectation. **No duplicate prevention** or attendance tracking.

### Link tasks to a review

- **Capability:** Create and view tasks linked to a management review from detail drawer (Tasks tab) or sidebar action (Link task).
- **Who uses it:** Task Management users within review context.
- **Outcome:** Tasks stored with `source.moduleType: managementreviews` and `source.module: reviewId`. Full task lifecycle applies.
- **Conditions:** Embedded TaskManagement component on detail page and drawer.

### View related documents

- **Capability:** Second tab on Schedule page searches documents linked to management reviews module type.
- **Who uses it:** Users with Document Management read access.
- **Outcome:** Searchable document list filtered to `managementreviews` module type.
- **Conditions:** Tab hidden without Document Management read permission.

### Manage KPI/Objectives (sub-area)

- **Capability:** Add, view, update, and delete KPI/objective statements scoped organisation-wide or by business unit.
- **Who uses it:** Users with KPI Objective permissions (see `kpi-objective.md`).
- **Outcome:** KPI records with reference `KPI-{number}`; displayed on Organisation and Business units tabs under **Kpi/Objectives** sidebar entry.
- **Conditions:** Shares Management Review RBAC service on backend routes; separate KPI Objective permission on frontend for mutations.

---

## 3. User Outcomes / End Results

- **Create:** A series of scheduled management review instances across a chosen interval, with optional agenda/minutes files on the first instance, attendee list, and calendar/notifications.
- **View:** Paginated register of reviews with Scheduled/Completed status, detail with attachments and tasks.
- **Manage:** Edit incomplete reviews; upload additional agenda/minutes; complete reviews; delete own incomplete reviews.
- **Change:** Title, schedule date/time, attendees, privacy; append agenda/minutes files. **Cannot change** interval or business unit after create in UI.
- **Information received:** Notifications when scheduled (attendees; Super Admins or HoS depending on privacy); calendar events on review dates.
- **Business actions enabled:** Record management review cadence; attach evidence (agenda/minutes files); mark reviews complete; raise follow-up tasks; maintain KPI/objective statements. **Not a video/conferencing or live attendance system.**

---

## 4. Scope Boundaries

### In scope

- Management review meeting CRUD, completion, agenda/minutes attachments, attendees (via form), embedded tasks.
- Schedule list, drawer preview, full detail page.
- Calendar integration (auto-created events).
- Notifications on create.
- KPI/Objectives UI under same Reviews sidebar (detailed in `kpi-objective.md`).
- Related Documents tab (Document Management search).
- Dashboard last/next management review dates on dashboard models/reports.

### Out of scope (handled elsewhere)

- **Live meeting hosting** — no conferencing integration.
- **Task execution** — Task Management owns task lifecycle.
- **Document repository CRUD** — Document Management; review only searches related docs.
- **ISO control linking on reviews** — `ComplianceManager` service references `isoControls` fields **not present** on current review schema; **not exposed via API routes**.
- **Text-based agenda line items or structured minutes** — only file attachments.
- **Risk, audit, incident direct links** — no FK from review to those modules (KPI referenced in audits separately).

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| Calendar | Auto-creates/updates azure calendar event on each review at scheduled date with attendee list in description. Read-only in Calendar UI. |
| Task Management | Tasks can be created and listed against a review (`managementreviews` source). Tasks deleted when review deleted. |
| Document Management | Related Documents tab searches docs tagged to management reviews; agenda/minutes are S3 attachments on the review record itself. |
| KPI Objectives | Co-located under Reviews sidebar; organisational KPI text referenced in Audit forms and dashboard reports (see `kpi-objective.md`). |
| Dashboard | Organisation/group dashboard stores `lastManagementReviewDate` and `nextManagementReviewDate`; PDF reports show last/next review dates. |
| User Management | Attendees are system users; user deactivation ownership checks flag reviews where user is attendee/creator. |
| Our IMS (Business units) | Business-unit privacy assigns `group`; list scoped by role/business unit. |
| Notifications | Attendee notifications and organisational/business-unit leadership notifications on new review. |
| Compliance | Create emits compliance checkout event (implementation references `moduleTypes.incidents`—**requires confirmation** if intentional). |

No direct links to Risk Management, Incident Management, Supplier Management, or Assets were identified on the review record itself.

---

## 6. Current Data Model

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| Management Review | A scheduled management review meeting instance | Primary record; one per occurrence in a series |
| Agenda attachment | Uploaded agenda document file | Evidence/agenda pack for the meeting |
| Minutes attachment | Uploaded minutes document file | Record of meeting outcomes as a file |
| Attendee | System user invited to the review | Stored as user reference array |
| Completion record | Who completed the review and when | Embedded `completed.status/by/on` |
| KPI Objective | Strategic KPI/objective statement | Separate record type under same module area |
| Privacy | Organisational vs Business unit visibility | Scopes review and notifications |
| Interval | Recurrence pattern used at create | Monthly/Quarterly/Half yearly/Yearly—generates series |

There is **no separate** Agenda item or Minute text entity—only attachment arrays on the review document.

---

## 7. Attributes

### Management Review

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Reference | Unique ID `MR-{number}` | Auto-generated |
| Title | Review subject/name | Required in UI |
| Date | Scheduled meeting date | Combined with time on create |
| Time | Scheduled time (string) | Required in UI; HH:mm validation |
| Interval | Recurrence used to generate series | Fixed after create in UI |
| Privacy | Organisational or Business unit | Default by user access; no picker on form for global users beyond initial default |
| Group | Business unit | Required for Business unit privacy; locked after create |
| Attendees | Invited users | Multi-select; user ObjectIds |
| Agenda | Array of file attachments | S3-backed documents |
| Minutes | Array of file attachments | S3-backed documents |
| Completed (status, by, on) | Completion tracking | status boolean; false until completed |
| Created (by, on) | Who scheduled and when | Audit metadata |

**Not implemented:** meeting room/location, video link, chairperson role, structured action items, agenda item ordering, minute-to-agenda linkage, reopen flag, soft delete.

### KPI Objective (summary)

See `kpi-objective.md` for full attribute detail. Core fields: reference `KPI-{number}`, value (text), privacy, group, targetValue/currentValue/unit on schema (not exposed in current KPI UI).

---

## 8. Current UI Layout

### Module entry

- Sidebar: collapsible **Reviews** group (review icon).
- Requires `MANAGEMENT_REVIEW` + `READ`.
- Child entries:
  - **Schedule** → `/admin/management-reviews` (Super Admin, Auditor only on route)
  - **Kpi/Objectives** → `/admin/kpiobjective` (Super Admin, HoS, Auditor)

### Schedule page (`/admin/management-reviews`)

**Tabs:**
1. **All Management Reviews** — table + toolbar
2. **Related Documents** — document search (if Document Management read)

**List toolbar:** Search, Filter modal (status: Scheduled/Completed; attendees multi-select), **Schedule** button (create drawer).

**Table columns:** Reference, Title, Status (badge Scheduled/Completed), Timestamp (date), Interval, Actions (Details, Delete if incomplete + creator + delete permission).

**Interactions:**
- Row click → right drawer with Overview / Life Cycle / Tasks tabs
- Schedule → create drawer with full form
- Actions → Details → `/admin/management-reviews/:id`

### Create / edit form (drawer and detail edit mode)

Fields: Business unit (when Business unit privacy), Attendees (multi-select users), Title, Date, Time, Interval (disabled on edit), Agenda dropzone, Minutes dropzone.

Buttons: **Confirm** (create) or **Update** + **Completed** (edit, with confirmation on complete).

**No visible privacy selector** — privacy set programmatically from user global access.

### Detail page (`/admin/management-reviews/:id`)

- **Left sidebar:** Details card (ReviewActions link-task button, ReviewOverview reference/interval/date/time, ReviewStatus lifecycle table)
- **Right panel:** SwitchableView (read ↔ edit when incomplete + CREATE permission)
  - **Read:** Attendees list, Agenda attachments (+ delete per file), Minutes attachments (+ delete), embedded TaskManagement
  - **Edit:** ReviewFormContainer with same form as create

### Drawer preview (from list)

Tabs: Overview (overview + attendees + agenda + minutes), Life Cycle (ReviewStatus), Tasks (TaskManagement).

### KPI/Objectives page

Tabs: Add KPI (if CREATE on KPI_OBJECTIVE), Business units, Organisation — see `kpi-objective.md`.

### Status display

- List: **Scheduled** (incomplete) vs **Completed** badges
- Life Cycle sidebar: rows for Created (Scheduled) and Completed (if applicable) with user name and date

### Search, filter, pagination

- Search: `clientSearch` on reference/title
- Filter: completed status boolean; attendees `in` array
- Pagination: default size 10

### Empty, loading, error, restricted states

- Loading spinner on list and detail fetch
- Detail error: “This management review has been deleted or removed”
- Delete confirm modal on row action
- Complete confirm: “This management review will be completed”
- Edit/delete/attachment delete restricted when completed or without permission
- Schedule list not visible to HoS/Basic on route config (detail route allows them)

### Navigation workflow

```
Reviews → Schedule → list
  → Schedule → create drawer → multiple MR records created → drawer opens first
  → Row click → preview drawer (Overview / Life Cycle / Tasks)
  → Details → full page → edit → Update or Completed
  → Link task → task drawer
Reviews → Kpi/Objectives → org/BU KPI tabs
```

---

## 9. Miscellaneous / Module-Specific Information

### What a Management Review represents

A **planned management review meeting occurrence** in the organisation’s compliance/governance calendar—not a generic meeting room booking. The system tracks **when** it should happen, **who** should attend, **documents** attached as agenda and minutes, **whether** it was marked complete, and **follow-up tasks**—supporting ISO-style management review evidence without providing the meeting itself.

### Management Review lifecycle (confirmed)

| State | Meaning | How entered | Allowed actions |
| ----- | ------- | ----------- | --------------- |
| Scheduled (incomplete) | Review planned, not yet marked done | Default on create | Edit, delete (creator+permission), add/remove agenda/minutes (UI/API), complete |
| Completed | Review marked as conducted/closed | User clicks Completed | Read-only in UI; no edit/delete |

**Transitions:** Scheduled → Completed (one-way). **No reopen.**

**Completion effects:** Sets completion metadata only. Does **not** auto-update calendar event, send notification, or create tasks. Agenda/minutes/attendee add-remove **not blocked by backend** when complete—only edit/delete review and UI delete buttons are restricted.

### Interval / series creation behaviour

When scheduling with interval **Monthly**, the system creates **12 separate review records** with dates calculated monthly from the start date, skipping Saturday/Sunday by moving forward. **Quarterly** → 4 records; **Half yearly** → 2; **Yearly** → 1. Each gets its own reference, calendar event, and notifications. Only the **first** record in the series receives agenda/minutes uploaded at creation time.

### Agenda and Minutes — actual behaviour

| Aspect | Confirmed behaviour |
| ------ | ------------------- |
| What they are | **File attachments** (documents uploaded to S3) |
| Multiple | Yes — arrays of attachments |
| Add | Create form, edit form dropzone (appends on update), or POST add endpoints |
| Edit existing | **Not supported** |
| Remove | DELETE per attachment; UI confirm dialog |
| Order | Not managed |
| Link agenda ↔ minutes | **None** |
| Required for completion | **No** |

### Attendees — actual behaviour

| Aspect | Confirmed behaviour |
| ------ | ------------------- |
| Entity | **System users** (selected from user list) |
| Add | Multi-select on create/edit form (replaces full list on update) |
| Standalone add/remove API | Exists; **no mounted UI** (`AttendeeForm` orphaned) |
| Free-text attendee | API frontend helper sends name object—**incompatible** with backend user ObjectId schema |
| Duplicates | Not prevented |
| Attendance/presence | Not tracked |
| Permissions | Attendees do not gain edit rights on the review |

### Completing a review — what it does

1. Validates not already complete.
2. Attempts date check against `scheduledDate` (undefined on model—**check ineffective**).
3. Sets `completed.status: true`, `completed.by: current user`, `completed.on: now`.
4. Returns populated review.

**Does not require** agenda, minutes, or attendees. **Does not** trigger downstream module updates beyond user-visible status change.

### Frontend vs backend discrepancies

| Topic | Frontend | Backend | Conclusion |
| ----- | -------- | ------- | ---------- |
| Organisational group on create | Checks `"Orgnisational"` typo | Expects `"Organisational"` | Group may always be sent for org reviews |
| Schedule list access | SUPER, AUDITOR only | READ for all with permission | HoS/Basic cannot open list route |
| Standalone attendee add | Name text field (orphaned) | User ObjectId push | Not usable from UI |
| AttachAgenda/Minute forms | Components exist | API works | **Not mounted** — add via main form only |
| Complete date rule | N/A | Uses `scheduledDate` not `date` | Completion date rule **non-functional** |
| Update when complete | Edit hidden | API throws “already updated” | Aligned via UI restriction |
| Calendar on delete | N/A | Hook on findOneAndDelete; delete uses deleteOne | Event may orphan |
| Compliance on create | N/A | Emits with `moduleTypes.incidents` | Likely misconfiguration |
| AgendaButtons loading state | Uses DELETE_MINUTE action key | N/A | Cosmetic bug |

### Unclear or incomplete behaviour

- Whether HoS/Basic users are intended to access Schedule list (route role mismatch vs detail route).
- Whether completion should be allowed only on or after scheduled date (logic appears inverted and uses wrong field).
- Whether `ComplianceManager` ISO linking was planned but never finished (no schema fields, no routes).
- How dashboard last/next review dates are calculated and updated.

### KPI/Objectives within this module

The **Kpi/Objectives** screen is part of the Reviews sidebar and shares Management Review service permissions on the backend. Detailed KPI behaviour is documented in `kpi-objective.md` to avoid duplication; it is included here because it is presented to users as part of the Management Review module area.
