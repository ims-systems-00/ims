# Calendar

## 1. Module Overview

Calendar is the organisation’s shared scheduling view for **Calendar Events**—both user-created appointments and automatically generated events from other business modules (tasks, audits, suppliers, incidents, management reviews, and approved leave).

Its primary business purpose is to give users a visual month/week/day/agenda calendar where they can see when important business activities occur, create standalone events by selecting a time slot, and inspect linked events from elsewhere in the system. Calendar Events are not a separate product module users manage in isolation; they aggregate deadlines, reviews, audits, P1 incidents, meetings, and personal leave into one timeline.

It solves the problem of dates scattered across modules by mirroring key dates onto a single calendar surface, while still allowing ad-hoc events for general scheduling.

Primary users are people with Calendar licence and read access—Super Admins, Heads of Service, and Basic Users per route configuration. Create, edit, and delete of standalone events require Calendar create/delete permissions. Linked events are managed in their source modules, not from Calendar.

---

## 2. Features and Capabilities

### View the organisation calendar

- **Capability:** Browse events on an interactive calendar with default **month** view; navigate dates and switch views (month, week, day, agenda via the built-in calendar toolbar).
- **Who uses it:** Users with Calendar read access and Calendar licence.
- **Outcome:** Events appear as coloured blocks on the grid. User-created events use a default grey styling; linked events use module-specific colours where set (e.g. red for P1 incidents, green for audits, orange for supplier reviews).
- **Conditions:** All organisation events matching role-based visibility rules are loaded on page open (no date-range filter in UI). No search or filter controls.

### Create a standalone Calendar Event

- **Capability:** Click/select a time slot on the calendar to open a create dialog; enter title, start time, end time, and description.
- **Who uses it:** Users with Calendar create permission (slot selection + create modal).
- **Outcome:** A new event is saved and appears on the calendar immediately. Success notification shown.
- **Conditions:** Title required. Date comes from the selected slot; times chosen from 15-minute increment dropdowns (00:00–24:00). Business unit is sent as null for standalone events.

### View an existing event

- **Capability:** Click an event block to open an event details dialog.
- **Who uses it:** Any user who can see the event on the calendar.
- **Outcome:** Title and description shown. For **linked** events (created by another module), fields are read-only and update/delete buttons are hidden. For **standalone** events, title, times, and description are editable.
- **Conditions:** Linked events identified by presence of `systemEventId` on the event.

### Edit a standalone Calendar Event

- **Capability:** Change title, start time, end time, or description.
- **Who uses it:** Users viewing a non-linked event in the edit modal.
- **Outcome:** Event updated on server and reflected in the calendar view.
- **Conditions:** Cannot edit linked/system events from Calendar UI. Edit route requires Calendar create permission on backend (not update).

### Delete a standalone Calendar Event

- **Capability:** Remove an event permanently from the delete button in the edit modal.
- **Who uses it:** Users viewing a non-linked event.
- **Outcome:** Event removed from calendar. Success notification.
- **Conditions:** Linked events cannot be deleted from Calendar; must be removed by deleting/updating the source record (where cleanup hooks exist).

### Automatic events from other modules

- **Capability:** Calendar Events are auto-created when certain records are created or updated in linked modules.
- **Who uses it:** Indirect—all users who can view those events on the calendar.
- **Outcome:** Deadlines, review dates, audit dates, P1 incidents, management review meetings, and approved leave appear without manual calendar entry.
- **Conditions:** Varies by module (see Linked Modules). Updates to source records sync title, description, dates, and sometimes attendees.

---

## 3. User Outcomes / End Results

- **Create:** Standalone calendar entries with title, time range, and description on any selected date slot.
- **View:** Unified calendar of personal/organisational events plus module-generated milestones and deadlines.
- **Manage:** Edit or delete only user-created events from the calendar interface.
- **Change:** Event title, description, start/end times for standalone events only.
- **Information received:** Visual date placement, colour differentiation for some linked event types, read-only detail for system-linked events.
- **Business actions enabled:** See when audits, supplier reviews, task due dates, P1 incidents, management reviews, and approved leave occur alongside custom events. **No reminders, recurring schedules, or conflict detection.**

---

## 4. Scope Boundaries

### In scope

- Calendar page at `/admin/calendar`.
- CRUD for standalone Calendar Events via UI.
- Read-only display of linked Calendar Events from other modules.
- Automatic event creation/update/deletion hooks on source modules.
- Organisation-scoped event list with role-based business-unit filtering (intended).

### Out of scope (handled elsewhere)

- **Source module CRUD** — tasks, audits, suppliers, incidents, management reviews, leave are managed in their own modules; calendar mirrors dates.
- **Email reminders / notifications** — no calendar-specific reminder workflow identified.
- **Recurring events** — not implemented.
- **Attendee management UI** — attendees stored on some linked events but not shown or editable in Calendar UI.
- **Color legend UI** — `ColorIndication` component exists but is **not mounted** on the calendar page.
- **Customer or CRM calendar events** — not identified.
- **Email Campaign scheduling** — separate concept; not on this calendar.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| Task Management | Creates/updates event on task create/update with title `{name} (Task manager)`, due date as start/end, assignees as attendees. Deleted when task deleted via hook — **may not run if delete uses `deleteOne`**. |
| Supplier Management | Creates event on supplier create at **review date** (orange); updates on supplier update. Attendees: users in supplier business unit + system admins. |
| Audit | Creates event on audit create at **start date** (green); updates on audit update. Attendees: users in audit/compliance-body groups + system admins. |
| Incident Management | Creates event for **P1 priority** incidents only at creation date (red); title/description update on incident update. |
| Management Review | Creates/updates event at review **date** (azure) with attendee list in description. |
| Leave (Wallet) | Creates event when leave is **approved** (purple), spanning leave start/end dates; visibility groups from requester’s access policies. |
| Our IMS (Business units) | Intended scoping of event visibility by business unit; **field naming mismatch may affect filtering** — see Miscellaneous. |

---

## 6. Current Data Model

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| Calendar Event | A scheduled item with title, description, start, and end | Primary record |
| System event link | Reference to originating module record | Links auto-generated events; locks edit/delete in UI |
| Event reference type | Module type: supplier, managementreview, audit, incident, task, leave | Determines linked-module behaviour and colour |
| Attendees | Users associated with an event | Stored on linked events; **not shown in Calendar UI** |
| Groups | Business units for visibility (array) | Used correctly for leave events; **may not be set for other linked events** |
| Tags | String tags on schema | **Not used in UI or create flows identified** |

There is **no separate** status, recurrence, or reminder entity.

---

## 7. Attributes

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Title | Event name shown on calendar | Required; auto-generated for linked events |
| Description | Details / message body | Rich text in UI for standalone; module-specific text for linked |
| Start | Start date-time | Required for display; often equals end for single-point linked events |
| End | End date-time | Required; combined with start for duration |
| Color | Visual category | `default`, `orange`, `green`, `red`, `azure`, `purple`, etc. |
| System event ID | Link to source record | When set, UI is read-only |
| Event reference | Source module type | supplier / audit / incident / task / managementreview / leave |
| Attendees | Users tied to the event | Populated on linked events; not editable in Calendar |
| Groups | Business units for visibility | Array; used for leave |
| Created (by, on) | Who created and when | Standalone: current user; linked: source record creator |
| Reference | Internal reference field on schema | Default empty; **not populated** with EC- style ID in pre-validate hook (unlike other modules) |

**Not implemented:** recurrence, all-day flag, timezone, reminders, event status enum, duration as separate field.

---

## 8. Current UI Layout

### Main screens / pages

- **Calendar** — `/admin/calendar`, top-level sidebar entry **Calendar** (Calendar licence + read).

### Calendar views and navigation

- **react-big-calendar** component filling the page.
- **Default view:** Month.
- **Available views:** Month, week, day, and agenda (standard Big Calendar toolbar — not customised away).
- **Navigation:** Built-in toolbar for prev/next/today and view switching.
- **No** search, filter, or colour-legend widget on page (ColorIndication component exists but is unused).

### How events are displayed

- Events render as blocks on the grid with background colour (`bg-secondary` for default, or colour class from event).
- Click event → **Event details** modal.
- Click/drag-select empty slot → **Create event** modal.

### Create event modal

Fields: Event title (text), Start time (dropdown), End time (dropdown), Description (rich text editor). Button: **Create**.

Date is taken from the selected calendar slot; times appended to form full start/end datetimes.

### Edit event modal (“Event details”)

- **Linked events (`systemEventId` present):** Title and description read-only; time fields hidden; **no Update or Delete buttons**.
- **Standalone events:** Title editable; start/end time dropdowns shown; description editable; **Update** and **Delete** buttons.

### Primary actions

- Select slot → create.
- Click event → view (and edit/delete if standalone).
- Toolbar → change view / navigate dates.

### Navigation and workflow

```
Sidebar Calendar → month/week/day/agenda grid
  → Click slot → Create event modal → Create → event appears
  → Click event → Event details modal
      → Standalone: Update or Delete
      → Linked: read-only view only
  → (Elsewhere) Module actions auto-create/update calendar events
```

### Material empty, loading, error, or restricted states

- No explicit empty-state message when no events.
- Failed create/update shows danger notification.
- Linked events cannot be mutated from calendar (restricted by hiding actions).
- Route requires Calendar licence (Partner type) and CALENDAR read; create/delete require respective permissions.

---

## 9. Miscellaneous / Module-Specific Information

### What a Calendar Event represents

A **scheduled occurrence** on the organisation timeline—either a user-defined appointment or an automatic mirror of a business date (due date, review date, audit date, P1 incident, management review meeting, approved leave).

Calendar is primarily a **read-mostly aggregation layer** for module dates, plus a light standalone event notebook.

### Date and time behaviour (confirmed)

| Feature | Implemented? | Notes |
| ------- | ------------ | ----- |
| Start date/time | Yes | Stored as Date; UI uses slot date + time dropdown |
| End date/time | Yes | Same day typical; multi-day possible via slot selection |
| All-day events | No explicit flag | Times still selected on create |
| Multi-day span | Partial | Slot end date used on create; linked events usually start=end |
| Duration field | No | Derived from start/end |
| Recurring events | No | |
| Time zones | No explicit handling | |
| Reminders | No | |
| Drag-resize to change times | No | |
| Date-range API filter | No | Full org list loaded at once |

### Event ownership and visibility

- Events belong to the **organisation** (tenant).
- List retrieval applies `basicRoleScopedFilter`: Super Admin / Auditors see all; Head of Service / Basic User see events where `group` matches their unit or is null; External User sees own group only.
- **Discrepancy:** Schema defines `groups` (array) but most create paths set `group` (singular), which is **not in the schema** and may be ignored by Mongoose. Leave events correctly use `groups`. Visibility filtering may not work as intended for linked events — **requires confirmation**.
- Frontend passes `userId` query parameter on fetch; **backend ignores it** (commented-out attendee/creator filter exists in controller).
- Attendees are stored for linked events but **not used** for UI filtering or display.

### Linked event lifecycle (automatic)

| Source | Created when | Updated when | Deleted when |
| ------ | ------------ | ------------ | ------------ |
| Task | Task create | Task update (due date, title, etc.) | `findOneAndDelete` hook — **may miss `deleteOne` path** |
| Supplier | Supplier create (if not exists) | Supplier update (review date) | Supplier `findOneAndDelete` hook — **may miss `deleteOne`** |
| Audit | Audit create (if not exists) | Audit update | Audit `findOneAndDelete` hook |
| Incident | P1 incident create | Title/description update | Incident `findOneAndDelete` hook |
| Management Review | Review create (if not exists) | Review update (typo: `updateCalendetEvent`) | Management review delete hook |
| Leave | Leave **approved** | N/A identified | N/A identified |

Editing a linked event from Calendar is blocked; changes must be made in the source module (which triggers update hooks).

### Color coding (backend / intended legend)

| Colour | Intended module (ColorIndication component) | Backend usage |
| ------ | --------------------------------------------- | ------------- |
| Red | Incidents | P1 incidents |
| Green | Audits | Audits |
| Orange | Suppliers | Supplier reviews |
| Azure | Management Review | Management reviews |
| Purple | — | Approved leave |
| Default/grey | — | Tasks, standalone events |

ColorIndication dropdown is **not rendered** on the calendar page.

### Frontend vs backend discrepancies (requires confirmation)

| Topic | Frontend | Backend | Conclusion |
| ----- | -------- | ------- | ---------- |
| Event fetch filter | Sends `userId` | Ignored; org + role filter only | Personal calendar not implemented |
| Standalone group | Sends `group: null` | Saved as `group` not in schema | May not affect visibility filter |
| Linked events | Read-only in UI | Same API edit/delete available | Direct API could mutate linked events |
| Edit permission | Implicit via create flow | PUT uses CREATE not UPDATE | Permission naming mismatch |
| getEvent by ID | Service exists | API exists | **Not used** in UI (events loaded in bulk) |
| Validation | Form validation only | Empty Joi schema | No server-side field rules |
| Calendar cleanup on delete | N/A | Hooks on `findOneAndDelete` only | Source deletes via `deleteOne` may orphan events |
| CalenderContent | Stray `on` prop on BigCalendar | N/A | Likely harmless typo |

### Unclear or incomplete behavior

- Whether `group` vs `groups` mismatch prevents business-unit scoping for most linked events.
- Whether task/supplier calendar events are removed when records are deleted via current delete paths.
- Whether management review update hook name typo (`updateCalendetEvent`) prevents sync.
- Whether standalone events without group are visible to all roles or filtered incorrectly.
