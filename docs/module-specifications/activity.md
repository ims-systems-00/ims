# Activity

## 1. Module Overview

The **Activity** module is **not a standalone business area** with its own navigation or dedicated screens. In iMS, an **Activity** is a **timeline entry** attached to another business record — a comment, note, or interaction left by a user, or an **automated system message** recorded when something meaningful happens to that record.

Its primary business purpose is to give users a **shared history and conversation** on records they work with: what was said, what changed, and who did it. Activities appear inside other modules as an **Activity**, **Interactions**, or **Comments** panel (depending on context), forming a chronological feed on the parent record.

The module solves the problem of scattered communication and untracked changes by keeping manual notes and system-generated events in one place, linked to the record they relate to (for example an incident, task, customer, risk, document, or compliance control).

Primary users are **any authenticated organisation user** who can access the parent record’s detail view. Users add manual comments where permitted; the system adds automated entries when supported business events occur (creation, escalation, ownership change, document authorisation, task completion, and similar).

---

## 2. Features and Capabilities

### View activity timeline on a parent record

- **Capability:** See a chronological feed of manual comments and automated system messages for a specific business record.
- **Who uses it:** Users viewing the Activity / Interactions / Comments tab (or equivalent section) on a supported parent record.
- **Outcome:** Users understand what has happened on the record and any discussion attached to it.
- **Conditions:** Activities are loaded by **parent module type** and **parent record ID**. Feed is paginated; users can load older entries with **View more**. Empty state: *“No activities found”*.

### Add a manual comment (interaction)

- **Capability:** Post a rich-text comment on a parent record, including formatted text, media links, and @-mentions of other users.
- **Who uses it:** Users with access to the parent record’s editable Activity panel.
- **Outcome:** A new manual Activity appears at the top of the timeline; success notification *“Comment added successfully”* (or *“Comment added successfully ”* in some document flows).
- **Conditions:** Comment text (`value`) is required. Button label is **Add comment** in the shared Timeline UI; CRM Customers use **Interactions** context; OFI/CIP detail uses **Action** labelling in places. **Read-only** mode hides the comment box (for example when a task is complete, an incident is resolved, or an OFI is implemented).

### Edit own manual comment

- **Capability:** Change the text of a comment the current user originally posted.
- **Who uses it:** The user who created the comment, when the timeline is not read-only.
- **Outcome:** Updated comment content is saved; notification *“Comment updated successfully”*.
- **Conditions:** **Edit** and **Delete** controls appear only on **non-automated** activities where `created.by` matches the current session user. Inline edit replaces the comment display with the rich-text editor.

### Delete own manual comment

- **Capability:** Permanently remove a comment the current user posted.
- **Who uses it:** The comment author, when the timeline is not read-only.
- **Outcome:** Comment disappears from the timeline; notification *“Comment deleted successfully”*.
- **Conditions:** Only manual (non-automated) activities. No confirmation dialog observed before delete.

### View automated system activities

- **Capability:** See system-generated timeline entries describing business events (for example *“{User} raised this incident”*, *“{User} escalated this incident”*, *“{User} created this task”*).
- **Who uses it:** Any user viewing the timeline on the parent record.
- **Outcome:** Automated entries appear with a system icon, the event message as the heading, and a formatted timestamp. Some entries include **extra log** cards with additional detail (for example ownership history, authorisation notes).
- **Conditions:** Automated entries cannot be edited or deleted from the UI. They are created by backend event handlers when supported events fire in other modules.

### View document audit trail (read-only variant)

- **Capability:** Open a drawer labelled **Audit trail** showing automated and manual activities for a document, filtered by document **thread ID** across versions.
- **Who uses it:** Users working in Document Management on a document tree node.
- **Outcome:** Scrollable history of document-related activities; loads more on scroll to bottom.
- **Conditions:** Read-only presentation (no edit/delete in this drawer). Uses the same Activity data but filtered by `metaInfo.threadId` rather than only a single document node ID.

### Retrieve a single activity (backend)

- **Capability:** Fetch one activity record by ID.
- **Who uses it:** Backend/API consumers only.
- **Outcome:** Returns the full activity with populated creator and linked module.
- **Conditions:** **No frontend screen** currently calls single-activity retrieval; all user-facing views use the paginated list filtered by parent record.

---

## 3. User Outcomes / End Results

- **Create:** Users can add rich-text comments (interactions, evidence notes, actions) on supported parent records while those records remain open for discussion.
- **View:** Users can read a mixed timeline of their team’s comments and system-recorded events on incidents, tasks, risks, OFIs, customers, compliance controls, documents, expense reports, leave requests, CQC records, and other supported entities.
- **Manage:** Users can edit or delete **their own** manual comments when the timeline is not read-only.
- **Change:** Only the comment **text** (`value`) can be updated; no other activity fields are editable from the UI.
- **Information received:** Users see who posted manual comments (name and avatar), when entries were created (relative time for manual comments, full date/time for automated entries), and optional structured sub-cards for extra event detail.
- **Business actions enabled:** Collaborative discussion on operational records; auditable history of key lifecycle events; compliance evidence comments on control clauses; customer interaction logging in CRM; document authorisation and versioning history.

---

## 4. Scope Boundaries

### In scope

- Timeline comments and automated event entries linked to a parent record via **module type** and **module ID**.
- Rich-text comment creation, self-service edit, and self-service delete.
- Paginated listing scoped to organisation and parent record.
- Automated activity creation triggered by business events in linked modules.
- Read-only timeline mode when parent records reach certain completed/resolved states.
- Document audit trail view filtered by document thread.

### Out of scope (handled elsewhere)

- **Parent module workflows** — incidents, tasks, risks, customers, documents, etc. own the primary record lifecycle; Activity only records commentary and event history on those records.
- **Calendar / scheduling** — Activities have timestamps but are not calendar events, have no start/end schedule, and do not appear on the Calendar module.
- **Tasks** — separate module; task assignment and completion are tracked on Tasks, though task lifecycle events generate Activities.
- **Notifications** — a notification helper exists in the Activity service but is **not invoked** when comments are created; parent modules use the Notifications module separately for alerts.
- **CarboCalc “Activity Summary Report”** — unrelated reporting on carbon emission calculation categories; not this Activity module.
- **Email Campaign “activity-status”** — unrelated to this module.
- **Standalone Activity management screen** — no global Activity list or Activity-only navigation exists.

---

## 5. Linked Modules

Activities are always **linked to a parent record**. The table below lists modules where Timeline UI and/or automated activity creation were confirmed.

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **Incident Management** | Timeline tab **Activity** on incidents; automated entries on create, escalate, ownership change, resolve. Read-only when incident is resolved. |
| **Task Management** | Timeline tab **Activity** on tasks; automated entries on create, acceptance, in progress, completion, linking. Read-only when task is complete. |
| **Risk Management** | Timeline **Activity** on risks; automated entries on create, accept, mitigate, escalate, ownership change. |
| **OFI (CIP)** | Timeline under **Actions** on OFI records; automated entries on create, implement, ownership change, in progress. Manual comment on OFI can trigger OFI status → **In Progress** (backend follow-up). Read-only when OFI is implemented. |
| **CRM / Customers** | Section **Interactions with the customer** / tab **Interactions**; manual customer interaction logging. |
| **Compliance** | Tab **Activity** with header *“Comments (State evidences against this clause)”* on control statuses; automated entries when controls become compliant or are linked/unlinked. |
| **Document Management** | Comments and **Audit trail** on document tree nodes; automated entries for authorisation requests/reviews, versions, revisions, signatures, sharing, conformance, attachments. Document rejection flow can add manual comment via Activity API. |
| **Staff Wallet — Leave** | Timeline **Activity** on leave requests. |
| **Staff Wallet — Expense Report** | Timeline **Activity** on expense reports. |
| **CQC — Significant Events** | Timeline **Activity** on significant event records. |
| **CQC — Site / Tool Control Details** | Timeline **Activity** on CQC detail records. |
| **AI Analytical Assistant** | Passes `moduleType` context when linking analysis sources — **Observed but business purpose unclear** for end-user Activity UI. |
| **Organisation** | All activities are scoped to the user’s active organisation. |
| **Users** | Manual activities record **created by**; rich-text editor supports @-mentions; automated messages name the acting user. |
| **Groups** | Activities store a group reference; listing applies role-based group filtering for some roles. |

**Modules with backend automated activity support but no confirmed Timeline UI in frontend investigation:** IMS Projects, IMS Project Work Packages, CarboCalc calculations, CarboCalc carbon reduction initiatives (activities created from event handlers).

**Observed discrepancy:** Some document views pass `moduleType="documents"` or `"docversiondetails"`, which are **not** in the Activity model’s allowed module-type list — those timelines may not load or persist activities correctly.

---

## 6. Current Data Model

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| **Activity** | A single timeline entry (manual comment or automated event message) on a parent business record. | Core record; always tied to one parent via module type and module ID. |
| **Parent record (module link)** | The business entity the activity belongs to (incident, task, customer, document node, etc.). | Defines which timeline the activity appears in; populated when activity is loaded for display context. |
| **Activity content (`value`)** | The main text — user comment (rich text) or system-generated event summary. | Primary user-visible information. |
| **Extra log entry** | Optional structured sub-record with title, description, icon, and image for additional automated event detail. | Embedded in automated activities (for example ownership history, authorisation notes). |
| **Creator** | User who posted a manual comment or who triggered an automated entry. | Shown as author avatar/name for manual entries; referenced in automated message text. |
| **Assignment (stored but largely unused)** | Intended owner/assignee with assignment date. | Model field exists; creation always sets assignee to null — **not used in current UI workflow**. |
| **Meta information** | Optional extra context (for example document `threadId` for cross-version audit trail). | Used to group document activities across versions. |

There is **no separate Activity status**, category, priority, or lifecycle entity. An activity either exists or has been deleted.

---

## 7. Attributes

### Activity

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| **Module type** | Which kind of parent record this activity belongs to (for example `incidents`, `tasks`, `customers`, `documenttrees`, `controlstatuses`, `cips`). | Required; determines which record’s timeline shows the entry. Fixed enum on backend. |
| **Module (parent ID)** | The specific parent record instance. | Required; together with module type scopes the timeline query. |
| **Value** | Comment body or automated event message text. | Required. Only field editable via update. Supports rich text for manual entries. |
| **Is automated** | Whether the entry was system-generated (`true`) or user-written (`false`). | Controls UI behaviour: automated entries are read-only with system icon; manual entries show author and edit/delete for creator. |
| **Icon source** | Image URL for automated entry avatar. | Used for system events (notification-style icons). |
| **Extra logs** | Array of supplementary detail cards (title, description, icon, image). | Optional; common on ownership changes, document authorisation, and similar automated events. |
| **Meta info** | Additional scoping data. | Document workflows use `threadId` to aggregate audit trail across document versions. |
| **Group** | Business unit / group association. | Stored; creation sets `null`; org listing may filter by user role/group. |
| **Organisation** | Tenant organisation owning the activity. | Set automatically from session. |
| **Assigned to / assigned on** | Intended assignee and assignment timestamp. | **Not populated in current create flow**; frontend form schema references owner but no owner picker is rendered and value is not sent. |
| **Created by / created on** | User who created the activity and timestamp. | Manual: current user. Automated: user associated with the triggering event. |
| **Created at / updated at** | System timestamps. | Used for ordering and display. |

### Attributes not present (confirmed absent)

| Concept | Notes |
| ------- | ----- |
| **Activity status** (planned, in progress, completed, etc.) | No status field or lifecycle on Activity records. |
| **Title / subject line** | Message text is in `value` only. |
| **Category or type (manual)** | No user-selected activity category. |
| **Start / end date or scheduling** | Timestamps only; not schedulable events. |
| **Participants list** | @-mentions exist in rich text but no separate participants entity. |
| **Recurrence** | Not supported. |

---

## 8. Current UI Layout

### Main screens / pages

There is **no standalone Activity page or sidebar entry**. Activity functionality is embedded via the shared **Timeline** component inside parent module detail views (full page or drawer).

Confirmed Timeline placements include:

| Parent module | UI label / section |
| ------------- | ------------------ |
| Incidents | Tab **Activity** |
| Tasks | Tab **Activity** |
| Risks | Tab **Activity** |
| OFI (CIP) | Section under **Actions** |
| CRM Customers | **Interactions with the customer** / tab **Interactions** |
| Compliance controls | Tab **Activity** — *“Comments (State evidences against this clause)”* |
| Document tree nodes | **Document activity** panel; **Comments** on some document views |
| Document (legacy panel) | **Comments** (read-only) |
| Document audit trail | **Audit trail** drawer button |
| Leave requests | Tab **Activity** |
| Expense reports | Tab **Activity** |
| CQC significant events | Tab **Activity** |
| CQC tool/site details | Tab **Activity** |

### Important sections and views

Each timeline consists of:

1. **Comment composer** (top) — rich-text `TextEditor` with mention suggestions, **Add comment** button (hidden in `readOnly` mode).
2. **Activity feed** — vertical list of entries using the Activity UI component.
3. **View more** — link at bottom when more pages exist.

**Manual entry display:** Author name, profile image, relative time (*“X time ago”*), formatted comment body, **Edit** / **Delete** for own entries.

**Automated entry display:** Event message as name line, system icon as avatar, full formatted date/time as subheading; optional **ExtraLog** cards below for supplementary detail.

### Primary actions

| Action | Location | Conditions |
| ------ | -------- | ---------- |
| **Add comment** | Top of timeline | Not read-only; valid non-empty text |
| **Edit** | Footer of own manual entry | Not read-only; not automated |
| **Delete** | Footer of own manual entry | Not read-only; not automated |
| **Update / Cancel** | Inline editor when editing | During edit mode |
| **View more** | Bottom of feed | When pagination has next page |

### Forms

- Single rich-text editor for create and edit.
- Validation: comment text required (labelled **Activity** in schema).
- Owner/assignee fields exist in form schema but **no owner input is rendered** — assignment is not part of the current user workflow.

### Lists / tables / cards / detail views

- Chronological feed (newest loaded first on page 1; **View more** appends older pages).
- No table, filter, search, or sort controls on the Activity timeline itself.
- Document audit trail drawer: scroll-to-load-more pattern instead of **View more** button.

### Navigation and workflow

1. User opens a supported parent record (incident, task, customer, etc.).
2. User selects the **Activity** / **Interactions** / **Comments** tab or section.
3. Timeline loads activities for that record’s `moduleType` + `moduleId`.
4. User adds comment, or reads automated history, or edits/deletes own comments.
5. When parent record reaches a closed state (task complete, incident resolved, OFI implemented), timeline switches to **read-only** — composer and edit/delete hidden.

### Material empty, loading, or restricted states

- **Loading:** Full loader while activities fetch; **Saving...** / spinner on edit/delete; **Loading** on View more.
- **Empty:** Centred *“No activities found”*.
- **Load failure:** Toast *“Failed to load activities”*.
- **Create failure:** Toast *“Failed to add comment”*.
- **Update failure:** Toast *“Failed to update comment”*.
- **Delete failure:** Toast *“Failed to delete comment”*.
- **Read-only:** No composer; no edit/delete — enforced by parent record state in Incident, Task, and OFI views.
- **Document activity (no selection):** *“No activity to show”* when no document node is selected.
- **Permission gating:** Timeline visibility follows parent module access; Activity API routes have **no module-specific RBAC** — only standard authenticated organisation access.

---

## 9. Miscellaneous / Module-Specific Information

### Confirmed business meaning

An **Activity** is a **record-level timeline entry**: either a **user comment** (collaboration, evidence, customer interaction, OFI action note) or an **automated audit message** (system narration of a business event on that record). It is **not** user session tracking, a global audit log, a task, or a calendar event.

### Manual vs automated

| Type | Created by | Editable | Typical content |
| ---- | ---------- | -------- | --------------- |
| **Manual** (`isAutomated: false`) | User via Timeline | Yes — own entries only | Rich-text comments, @-mentions |
| **Automated** (`isAutomated: true`) | Backend event handlers | No | Short event sentences + optional extra log cards |

### Automated events (confirmed examples)

Automated activities are created when supported events occur, including but not limited to:

- **Incidents:** created, escalated, ownership changed, resolved
- **Tasks:** created, accepted/declined, in progress, completed, linked
- **Risks:** created, accepted, mitigated, escalated, ownership changed
- **OFIs:** created, implemented, ownership changed, in progress
- **Compliance controls:** became compliant, control linked/unlinked
- **Documents:** authorisation requested/reviewed, version/revision added, signed, shared, conformance, attachment added
- **IMS Projects / work packages:** create and update events (backend)
- **AI analysis:** conducted, deleted
- **Misc:** nudge owner, attachment attached to data

Exact message wording is generated from the acting user’s name and the event context (for example *“{Name} escalated this incident.”*).

### Business side-effect on create

When a manual or automated activity is created for an **OFI (`cips`)** parent record, the backend runs a follow-up that sets the OFI status to **In Progress**. This is the only confirmed cross-module state change triggered by Activity creation.

### Activity lifecycle

Activities have **no status workflow**. The only state change is **creation** or **hard deletion** (manual comments by author). Automated entries persist until deleted — **no UI or routine to delete automated entries** was found.

Parent record state affects **whether users can add or edit** comments (read-only timeline), not the activity record’s own status.

### Ownership and assignment

- **Creator** is recorded and used for edit/delete permissions and display.
- **Assignee** field exists in the data model but is **always null on create**; the frontend owner schema is unused.
- **No participant list** beyond @-mentions embedded in comment text.

### Date and scheduling

- Activities store **creation timestamp** only.
- Manual comments show **relative time**; automated entries show **full formatted date/time**.
- **No due dates, start/end times, or recurrence.**

### Visibility and listing rules

- List queries require **module type** and **module (parent ID)**.
- Results are scoped to the user’s **organisation**.
- Role-based filter: **Head of Service** and **Basic User** see activities in their group or with null group; **External User** sees only their group; **Super Admin**, **External Auditor**, and **Internal Auditor** have no additional group filter on the query.
- Default pagination; frontend loads page 1 then appends via **View more**.

### Cross-layer discrepancies

| Topic | Observation |
| ----- | ----------- |
| **Single activity retrieval** | Backend supports get-by-ID; frontend never uses it. |
| **Update scope** | Backend updates only `value`; matches frontend. |
| **Delete restrictions** | UI restricts delete to own manual comments; backend delete has no author or automated check — **implementation suggests any authenticated user who knows an activity ID could delete it via API**. |
| **Validation** | Backend validation schema is an **empty stub**; comment required only on frontend. |
| **RBAC** | Activity routes have **no enforceRbac** middleware unlike many other modules. |
| **Notifications on comment** | `createNotifications` exists in Activity service but is **never called** from `createActivity`. |
| **Assignment / owner** | Model and form schema support assignee; **not implemented** in create flow or UI. |
| **Document module types** | Some document UI passes `documents` / `docversiondetails` module types **not in the Activity enum** — likely broken or legacy. |
| **Timeline props** | Parent views pass props (`editLabel`, `horizontalSpacing`, `containerClass`, `module`) that **Timeline.jsx does not consume** — no effect on behaviour. |
| **CarboCalc activity report** | Name collision only; unrelated to this module. |

### Behaviour that could not be fully determined

- Whether IMS Project frontend views will gain Timeline UI (backend already creates project activities).
- Full list of every event handler still active vs legacy duplicate handlers under `events/` and `eventsV2/`.
- Whether organisation-level text-tracking middleware on create/update surfaces anywhere user-visible beyond Activity timeline.

### Terminology by context

- **Activity** — generic label (incidents, tasks, risks, leave, expense, CQC, compliance tab name).
- **Interactions** — CRM customer-facing label for the same Timeline capability.
- **Comments** — document and compliance contexts.
- **Action** — OFI detail placeholder/label for manual entries.
- **Audit trail** — read-only document history drawer using Activity data filtered by thread.
