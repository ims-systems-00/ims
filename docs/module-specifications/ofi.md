# OFI (Opportunity for Improvement)

> **Terminology note:** In the codebase this module is technically named **`cip`** (Continual Improvement Plan). The product-facing business term is **OFI — Opportunity for Improvement**. References such as `OFI-{number}`, UI labels (“All OFI”, “Raise”), API success messages (“OFI created”), and the core field `opportunityForImprovement` confirm this meaning. This specification uses **OFI** as the primary business term. The underlying routes, models, and code identifiers remain `cip` and are not renamed.

## 1. Module Overview

The **OFI (Opportunity for Improvement)** module is how an organisation records, tracks, and closes improvement opportunities identified during operations, audits, or day-to-day management. An OFI captures what could be improved, who owns follow-through, supporting evidence, linked compliance controls, related tasks, and whether the improvement has been implemented.

Its primary business purpose is to turn improvement ideas into accountable, traceable records with a clear lifecycle—from initial raise through in-progress work to implemented closure—while connecting improvement activity to ISO/compliance controls, audits, tasks, documents, and notifications.

The module solves the problem of improvement actions living in informal notes or audit appendices by centralising them as numbered records (`OFI-{number}`) scoped to a business unit, with owner assignment, activity history, and implementation confirmation.

Primary users are staff with **Continual Improvement Plan** access (Super Admin, Head of Service, Basic User, Auditor roles). Creating, editing, implementing, and linking controls require **Create** permission; deletion requires **Delete** permission (with additional creator/admin checks in the UI). The sidebar route requires a **partner CIP licence** in addition to RBAC.

---

## 2. Features and Capabilities

### Raise an OFI manually

- **Capability:** Create a new improvement opportunity with title, description (opportunity for improvement), owner, business unit, optional cost, and optional attachments.
- **Who uses it:** Users with **Continual Improvement Plan → Create** permission.
- **Outcome:** A new OFI appears in the list with reference `OFI-{number}`, status **Pending**, and the assigned owner is notified (in-app and email).
- **Conditions:** Title and opportunity-for-improvement description are required. Owner and business unit are required in the UI form. Business unit cannot be changed after creation in the UI. Initial implementation status is **Pending**.

### View and browse OFIs

- **Capability:** View a paginated, searchable list of organisation OFIs with reference, business unit, title, status, raised date, and owner; open detail in a drawer or full page.
- **Who uses it:** Users with **Continual Improvement Plan → Read** permission.
- **Outcome:** Users find and open OFIs relevant to their organisation; row click opens a detail drawer; **Details** row action opens the full detail page.
- **Conditions:** List is organisation-scoped with role-based filtering on the backend. Search covers reference, title, and opportunity-for-improvement text. Filter modal supports status (Pending / In progress / Implemented), business unit, and owner.

### View OFI detail

- **Capability:** Inspect full OFI information: overview (reference, business unit, owner, raiser, cost, audit source link if applicable), rich-text improvement description, attachments, activity timeline, lifecycle status, linked tasks, and linked ISO/compliance controls.
- **Who uses it:** Any user with read access.
- **Outcome:** Users understand context, progress, and relationships before editing or implementing.
- **Conditions:** Detail drawer has tabs: Details, Activity, Life Cycle, Tasks, Linked controls. Full page (`/admin/cip/:id`) provides a similar split layout with sidebar overview. Audit-sourced OFIs show audit short detail and a link to the source audit; title and description fields are read-only when sourced from a completed audit.

### Edit an OFI

- **Capability:** Update title, owner, cost, opportunity-for-improvement description, and add new attachments.
- **Who uses it:** Users with **Create** permission on non-implemented OFIs.
- **Outcome:** Record reflects updated ownership and content; owner change triggers a new-owner notification.
- **Conditions:** **Implemented OFIs cannot be edited** (backend rejects updates). Audit-sourced OFIs lock title and description in the form. New attachments are appended on update; existing attachments are not replaced in bulk. Business unit is locked after create in the UI.

### Implement an OFI

- **Capability:** Mark an OFI as **Implemented**, recording who implemented it and when.
- **Who uses it:** Users with **Create** permission, via **Implement** button on the edit form (drawer or detail page).
- **Outcome:** Status becomes **Implemented**; implementation is final for editing, linking controls, and deletion; Heads of Service receive in-app notification; activity log records implementation.
- **Conditions:** Frontend first saves pending form changes, then calls the implementation endpoint. Already-implemented OFIs are rejected. Implementation is **not reversible** in the current implementation.

### Delete an OFI

- **Capability:** Permanently remove a non-implemented OFI from the organisation register.
- **Who uses it:** Users with **Delete** permission who are either organisation admin or the original creator.
- **Outcome:** OFI removed from list; detail shows “deleted or removed” error if revisited.
- **Conditions:** UI blocks delete for **Implemented** OFIs. Backend delete has no implemented-state guard (discrepancy—UI is stricter).

### Nudge the OFI owner

- **Capability:** Send a reminder notification to the assigned owner to review the OFI.
- **Who uses it:** Users from list row actions or detail action bar.
- **Outcome:** Owner receives a nudge notification; 24-hour cooldown per OFI (`nextNudgeAt`).
- **Conditions:** Owner must be assigned for list nudge; detail nudge shows cooldown tooltip if recently nudged.

### Manage attachments

- **Capability:** Add supporting files on create or update; view and download attachments on detail; delete individual attachments on non-implemented OFIs.
- **Who uses it:** Create flow for add; **Delete** permission for remove.
- **Outcome:** Files stored in object storage; attachment metadata on the OFI; delete removes association **and** deletes the file from storage.
- **Conditions:** Cannot delete attachments on implemented OFIs (UI hides delete button).

### Link and unlink ISO / compliance controls

- **Capability:** Associate one or more compliance standard controls (ISO clauses) with an OFI for traceability.
- **Who uses it:** Users with compliance toolkit access, via **Select Compliance Control(s)** picker.
- **Outcome:** Controls appear on the **Linked controls** tab as compliance stripes; linking/unlinking emits compliance link activity events.
- **Conditions:** Cannot link or unlink on **Implemented** OFIs. Multiple controls can be linked to one OFI. UI links controls only (toolkit array passed empty); backend supports toolkit IDs as well.

### Create linked tasks

- **Capability:** Create tasks associated with the OFI from the link-actions menu.
- **Who uses it:** Users with task creation access from OFI detail toolbar.
- **Outcome:** Task is created with `moduleType` pointing to the OFI; tasks appear on the **Tasks** tab.
- **Conditions:** Available only while OFI is not implemented (toolbar hidden after implementation).

### Record activity and progress comments

- **Capability:** Add timeline comments/actions on the **Activity** tab while the OFI is not implemented.
- **Who uses it:** Users viewing non-implemented OFIs.
- **Outcome:** First activity on an OFI automatically moves status from **Pending** to **In Progress** (backend side effect). Implemented OFIs show read-only timeline.
- **Conditions:** Activity tab uses shared Timeline component with module type `cips`.

### Browse related documents

- **Capability:** Second main tab **Related Documents** searches document management for documents linked to OFI module type.
- **Who uses it:** Users with **Document Management → Read** permission.
- **Outcome:** Organisation documents associated with OFIs are discoverable from the OFI area.

### AI analysis (analytical assistant)

- **Capability:** Run AI-assisted analysis on the open OFI from the detail drawer toolbar.
- **Who uses it:** Users with **Create** permission on non-implemented OFIs.
- **Outcome:** Analytical assistant panel opens with OFI as source context.
- **Conditions:** Hidden after implementation.

### Receive OFIs from audit completion

- **Capability:** When an audit is completed, embedded improvement items recorded during the audit are promoted to standalone OFI records linked to that audit.
- **Who uses it:** Automatic on audit completion (Audit module workflow).
- **Outcome:** Each audit OFI becomes a full OFI record with the same identifier, audit business unit, audit as source, and auditor as creator; appears in the OFI module list.
- **Conditions:** While audit is in progress, OFIs exist only as embedded subdocuments on the audit (managed from Audit module, not the OFI list). Title/description locked after promotion when source is audit.

---

## 3. User Outcomes / End Results

- **Create:** Raise improvement opportunities manually or inherit them from completed audits.
- **View:** Search, filter, and open OFIs; see status, owner, business context, and source audit where applicable.
- **Manage:** Edit ownership and details; add attachments; link compliance controls and tasks; comment on activity.
- **Change:** Move OFIs through Pending → In Progress (via activity) → Implemented (explicit implementation action).
- **Information received:** Reference number, owner/raiser identity, implementation timestamp, linked controls, task list, notifications on assign and implement.
- **Business actions enabled:** Close the loop on audit findings and improvement ideas; demonstrate compliance linkage; nudge accountable owners; feed dashboard statistics (opportunities vs improvements per business unit).

---

## 4. Scope Boundaries

### In scope

- Standalone OFI records in the Continual Improvement Plan module (`/admin/cip`).
- Manual raise, list, detail, edit, implement, delete (non-implemented).
- Attachments, ISO control linking, tasks, activity timeline, nudge, AI analyser.
- Related documents tab.
- Promotion of audit-embedded OFIs to standalone records on audit completion.
- Notifications on owner assign and implementation.
- Organisation/dashboard statistics counting OFIs and implementations.

### Out of scope (handled elsewhere)

- **Audit module (in-progress OFIs)** — Add/edit/delete embedded OFIs on an open audit before completion.
- **Task Management** — Task execution workflow once linked.
- **Compliance module** — Control definitions; OFI only links to existing controls.
- **Document Management** — Document storage; OFI exposes search for linked documents.
- **Notifications module** — Delivery mechanism for nudges and assign/implement alerts.
- **User ownership transfer** — Departing user OFI ownership included in user deletion transfer queue (Users module).

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **Audit** | Primary source: embedded OFIs on open audits promoted to standalone OFIs on audit completion; audit reference shown on OFI detail. |
| **Compliance / ISO Controls** | OFIs link to compliance control clauses for standards traceability; link/unlink blocked after implementation. |
| **Task Management** | Tasks created from and listed against an OFI; tasks can reference OFI as source module. |
| **Document Management** | Documents can be associated with OFI module type; Related Documents tab searches them. |
| **Notifications** | Owner assignment, implementation (to Heads of Service), and nudge reminders. |
| **Users** | Owner and raiser are users; ownership transfer on user removal. |
| **Groups (Business units)** | Each OFI scoped to one business unit. |
| **Dashboard / Statistics** | Counts opportunities and implemented improvements per business unit. |
| **Activity / Timeline** | Comments and automated activity entries; first comment triggers In Progress. |
| **Risk, Incident, and others (API-level source)** | Backend create validation accepts optional source module types (tasks, risks, incidents, management reviews, etc.); **manual UI create does not set source**—relationship is primarily via audit promotion and cross-module linking plugins. |

---

## 6. Current Data Model

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| **OFI (cip record)** | A numbered improvement opportunity with title, description, owner, status, and business unit. | Core entity; reference `OFI-{ID}`. |
| **Implementation status** | Pending, In Progress, or Implemented with implementer and date when closed. | Drives lifecycle, edit restrictions, and reporting. |
| **Owner** | User accountable for the improvement. | Required on manual create; notified on assign. |
| **Source link** | Optional reference to originating module (e.g. audit). | Set automatically for audit-promoted OFIs; empty for manual raises. |
| **Attachment** | Supporting file metadata on the OFI. | Evidence or context; add on create/update, delete individually. |
| **ISO control link (`isoControls`)** | Compliance clause (and optional toolkit) IDs linked to the OFI. | Compliance traceability. |
| **Activity / actions** | Timeline comments and automated system activities. | Progress tracking; triggers In Progress. |
| **Linked tasks** | Tasks associated via module link. | Work breakdown for delivering the improvement. |
| **Nudge metadata** | Last nudge timestamp for cooldown. | Prevents repeated nudges within 24 hours. |

---

## 7. Attributes

### OFI (core record)

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Reference (`OFI-{number}`) | Unique improvement identifier. | Auto-generated. |
| Title | Short name of the improvement opportunity. | Required; locked if audit-sourced. |
| Opportunity for improvement | Full description of what should improve and why. | Required rich text; locked if audit-sourced. |
| Owner | User responsible for delivery. | Required on manual create; change notifies new owner. |
| Business unit (group) | Organisational unit the OFI belongs to. | Set at create; locked in UI after create. |
| Cost | Optional estimated cost (£ in UI display). | Optional integer. |
| Implementation status | Pending, In Progress, or Implemented. | Default Pending. |
| Implemented by / on | Who closed the OFI and when. | Set only on implementation. |
| Created by / on | Who raised the OFI and when. | Shown as “Raised by” / “Raised”. |
| Source module type / module | Originating record (e.g. audit). | Populated for audit-promoted OFIs. |
| Actions (embedded) | Legacy action entries with value and creator. | **Observed but business purpose unclear** in current UI—timeline uses separate Activity service. |

### Attachment

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| File metadata | Storage key, name, modifier. | Added via dropzone on create/edit. |

### ISO control link

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Clauses | Compliance control record IDs. | Multi-link supported. |
| Toolkits | Compliance toolkit/service names. | Supported in API; UI passes empty toolkit array. |

### Filter / list display attributes

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Status badge | Pending / In progress / Implemented | From `implemented.status`. |
| Last logged in / raised date | When OFI was created. | List column “Raised”. |

---

## 8. Current UI Layout

### Terminology in the current UI

| Location | Label used |
| -------- | ---------- |
| Sidebar navigation | **OFI** (route `/admin/cip`) |
| Main tab | **All OFI** |
| Page heading (table) | **OFI** |
| Detail page heading | **OFI details** |
| Create button | **Raise** |
| Form field | **Opportunity for improvement** |
| Notifications / delete modals | **OFI** |
| Some toast messages | Mix of “CIP” and “OFI” (legacy inconsistency) |

Internal code folders use `cip` and `ContinualImprovementPlan` naming; user-visible labels predominantly say **OFI**.

### Main screens / pages

- **OFI list** — `/admin/cip` with tabs **All OFI** and **Related Documents** (if document permission).
- **OFI detail page** — `/admin/cip/:id` (full page with sidebar + main content).
- **Detail drawer** — Opens from list row click without leaving the list.

### List layout

- Search input + **Filter** modal (status, business unit, owner).
- **Raise** button (Create permission) opens create drawer.
- Table columns: Reference, Business unit, Title, Status, Raised, Assigned owner, Actions.
- Pagination (default page size 10).
- Row actions: Details, Nudge (non-implemented), Delete (non-implemented, Delete permission + admin or creator).

### Detail drawer layout

- Header with reference/title; toolbar (edit, link actions, analyse) when not implemented.
- Tabs:
  - **Details** — Overview table, improvement description, attachments, audit source block.
  - **Activity** — Timeline (editable if not implemented).
  - **Life Cycle** — Status history table (Pending / In progress / Implemented rows).
  - **Tasks** — Embedded task management.
  - **Linked controls** — Compliance stripes with remove action.

### Full detail page layout

- Left sidebar: action bar (nudge, link controls, link task), overview, lifecycle status.
- Right main: switchable view between read-only formatted description + attachments and edit form (Implement + Update buttons when permitted).
- Sections for tasks, timeline, linked controls similar to drawer.

### Forms

- **Create/edit form:** Business unit, title, owner, cost, rich-text opportunity for improvement, attachment dropzone.
- **Edit drawer:** Same form with **Update** and **Implement** buttons.

### Material empty, loading, or restricted states

- **Loading:** Full-height loader on list and detail fetch.
- **Empty linked controls:** “There are no controls linked to this”.
- **Deleted OFI detail:** Error handler message “This OFI has been deleted or removed”.
- **Implemented OFI:** Edit toolbar, link actions, attachment delete, and nudge hidden/disabled.
- **Nudge cooldown:** Tooltip “Already nudged {owner}” when within 24 hours.
- **Partner licence:** Route gated by CIP partner licence in addition to RBAC.

---

## 9. Miscellaneous / Module-Specific Information

### CIP vs OFI — confirmed meanings

| Term | Meaning in this product |
| ---- | ------------------------ |
| **OFI (Opportunity for Improvement)** | The business object: a numbered improvement opportunity an organisation tracks and closes. |
| **CIP (Continual Improvement Plan)** | The technical module name (`cip` routes/models), RBAC service `CONTINUAL_IMPROVEMENT_PLAN`, and partner licence key. The “plan” is the organisational register/workflow container for OFIs—not a separate user-facing entity from an OFI record. |

### OFI lifecycle (confirmed)

| Status | Meaning | How entered |
| ------ | ------- | ----------- |
| **Pending** | Newly raised; no activity yet. | Default on create. |
| **In Progress** | Work has started (comments/activity recorded). | Automatic when first timeline activity is added. |
| **Implemented** | Improvement delivered and formally closed. | User clicks **Implement**; records implementer and timestamp. |

Transitions:
- Pending → In Progress: automatic (activity follow-up).
- Any non-implemented → Implemented: manual implement action (preceded by save in UI).
- Implemented → (none): **final**—no revert.

### What implementing an OFI does (confirmed)

1. Sets `implemented.status` to **Implemented**, with current user and timestamp.
2. Blocks further edits, ISO linking/unlinking, and UI deletion.
3. Notifies all **Heads of Service** in the organisation (in-app; email disabled for this event).
4. Creates automated activity log entry.
5. Emits implementation event for notification/activity handlers.

Implement does **not** automatically complete linked tasks or unlink controls—it only closes the OFI record itself.

### Audit as OFI source (confirmed workflow)

**During audit:** Auditors add embedded OFIs (title + description only) on the audit record via Audit module API.

**On audit completion:** Each embedded OFI is copied to the standalone `cips` collection with the same ID, audit as source, auditor as creator, and audit’s business unit. These then appear in the OFI module and retain a read-only link back to the audit.

**Observed gap:** Audit-promoted OFIs may be created **without an owner** until manually assigned in the OFI module.

### Attachment workflow (full trace)

| Step | Behaviour |
| ---- | --------- |
| Add on create | Files uploaded via dropzone; metadata sent in create payload. |
| Add on edit | New files appended via update (`$push` on attachments array). |
| View | Attachment list on detail with download. |
| Delete | DELETE attachment endpoint removes from array; frontend also deletes file from S3 storage. |

### ISO control relationship (confirmed)

Controls represent entries from the organisation’s **Compliance toolkit** (ISO clauses, CQC, ESG, etc.). Linking an OFI to controls provides audit/compliance traceability—showing which standard requirements relate to an improvement action. Multiple controls per OFI. Same control could theoretically link to many OFIs. Linking uses **Read** permission on the OFI route (not Create). Unlink uses PUT on the same path.

### Frontend / backend discrepancies

| Topic | Frontend | Backend |
| ----- | -------- | ------- |
| Delete implemented OFI | Blocked | No status check on delete |
| Toast messages | Mix of “CIP” and “OFI” | API messages use “OFI” |
| Create error toast | Says “Failed to raise risk” | — |
| ISO link permission | Compliance auth + Read route | Read action on link routes |
| Audit OFI owner | May show “Unassigned” | Promotion omits owner field |

### Unclear or partially implemented behavior

- **Observed but business purpose unclear:** `actions` array on OFI schema vs Activity timeline—whether both are intended long term.
- **Observed but business purpose unclear:** `escalated` fields referenced in overview UI but not on core schema inspected—may never populate.
- **Implementation suggests this behavior, but confirmation is required:** Whether backend create with `moduleType` from other modules (risks, incidents, etc.) is used by any UI besides audit promotion.
- **Current behavior could not be fully determined:** Full post-implementation reporting impact beyond dashboard stats and HoS notification.

---

*Specification based on current frontend (`ims-systems-frontend/src/views/cip/`) and backend (`ims-systems-backend/src/routes/api/cip.js`, services, models) as implemented. No application code was modified to produce this document.*
