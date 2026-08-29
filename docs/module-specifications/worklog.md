# Worklog

## 1. Module Overview

The **Worklog** module lets staff **clock in and clock out** of a working session, **pause and resume** during the day, and record **priorities at start** and **achievements at end**. Each completed session becomes a persisted **work log** with calculated **total working time** (breaks excluded), location, remote/on-site type, and a pause/resume **timesheet** trail.

Worklog is part of the **Staff Wallet** area alongside Expense Reports and Leaves. It is **not** task time tracking, Jira worklogging, or payroll timesheets. Entries are **owned by the staff member** who clocked in (`created.by`); there is **no link** to Tasks, Activities, Projects, or Jira records in the data model.

Primary users are **individual staff** who clock in/out from the navbar or review their history under **My Wallet → Work Log**. **Line managers** can review direct reports’ worklogs via **Staff Wallets** when backend wallet access rules allow. The module also updates the user’s **shift status** (Clocked in / Paused / Clocked out) on the user profile during the session lifecycle.

---

## 2. Features and Capabilities

### Clock in to start a work session

- **Capability:** Start a new work session by recording work type (Remote or On-site), working location, and priorities for the day.
- **Who uses it:** The logged-in staff member.
- **Outcome:** A worklog record is created with `startTime`, reference `WRKLG-{number}`, and `currentState` Resume; user **shift status** becomes **Clocked in**. If the user already has an **active** session (`endTime` null), the existing session is returned instead of creating a duplicate.
- **Conditions:** Only **one active session per user** at a time. Frontend requires location and priorities on clock-in; backend allows priorities to be optional.

### Pause and resume during a session

- **Capability:** Toggle between working and paused states while clocked in.
- **Who uses it:** The logged-in staff member with an active session.
- **Outcome:** Each pause/resume appends an event to the worklog **timesheet** (`Pause` or `Resume` with timestamp). User **shift status** becomes **Paused** or **Clocked in** accordingly. `currentState` alternates between Pause and Resume.
- **Conditions:** Requires an active session; returns “No active sessions” if none exists.

### Clock out to end a session

- **Capability:** End the active session and optionally record **achievements** for the day.
- **Who uses it:** The logged-in staff member.
- **Outcome:** `endTime` is set; **total break time** and **total work time** (milliseconds) are calculated from start/end and pause/resume events; user **shift status** becomes **Clocked out**.
- **Conditions:** Requires an active session. Achievements are optional on backend; frontend prompts for achievements when clocking out.

### View own worklog history

- **Capability:** Browse a paginated, searchable list of past work sessions.
- **Who uses it:** Staff viewing **My Wallet → Work Log** (`/admin/work-log`).
- **Outcome:** Table shows reference, start date, end date, and type (Remote / On-site). Row click or **Details** opens a detail modal.
- **Conditions:** List filtered by `created.by` = selected wallet user (self by default).

### View a single worklog in detail

- **Capability:** Open one worklog to see clock-in/out times, total hours, location, type, priorities, achievements, staff name, and pause/resume timesheet events.
- **Who uses it:** Staff (own logs) or line managers (direct reports’ logs when access allowed).
- **Outcome:** Detail modal/page shows full session summary. Quick links at bottom navigate to **Raise a risk**, **Raise an incident**, or **Create a task** — these are **navigation shortcuts only**, not stored links on the worklog.
- **Conditions:** Backend enforces **wallet access**: user must own the log or be a **line manager** of the owner (`managedUsers`).

### Line manager review of staff worklogs

- **Capability:** Line managers open a staff member’s wallet from **Staff Wallets** and view their **Work log** tab alongside expenses and leaves.
- **Who uses it:** Users with **Staff Wallets** access (Users create permission on route) who appear as line managers for listed employees.
- **Outcome:** Same worklog list/detail UI scoped to the selected employee’s `created.by` ID.
- **Conditions:** Backend `authWalletAccess` must allow the manager–employee relationship. UI copy on clock-in states line managers may review worklogs from the wallet.

### Active session awareness on login

- **Capability:** On application cache load, fetch the current user’s **active worklog** (if any) and store in local cache.
- **Who uses it:** All logged-in users during session bootstrap.
- **Outcome:** Active session available to global context for shift/status display (partially wired — worklog cache commented out in SuperGlobalContext).
- **Conditions:** Returns null when no active session.

---

## 3. User Outcomes / End Results

### For staff members

- **Start** a work day/session with location, remote/on-site type, and stated priorities.
- **Pause and resume** work during the session without ending it.
- **End** the session and note achievements for the day.
- **See** calculated total hours worked (breaks excluded).
- **Review** past sessions in a searchable history table.
- **Open** session detail including timesheet of pause/resume events.
- **Maintain** a shift status visible on their profile (Clocked in / Paused / Clocked out).

### For line managers

- **Review** direct reports’ worklog history via Staff Wallets (when backend access rules permit).

### What users cannot achieve through Worklog today (confirmed)

- Log time **against a specific task, activity, project, or Jira issue** — no such links exist.
- **Edit** a completed worklog’s priorities, location, or achievements through the UI — no update route exposed (service method exists but unused).
- **Delete** a worklog through the UI — delete exists in service only, not routed.
- Open clock-in reliably from **AdminNavbar** — ClockIn modal is mounted but **no visible trigger** in AdminNavbar dropdown (Work log entry exists in **QuickActions** component, which may not be mounted in all layouts).
- Rely on worklog data for **Dashboard, Stats, or payroll** — no confirmed downstream consumption.

---

## 4. Scope Boundaries

### In scope

- **Clock-in / pause / resume / clock-out** session lifecycle.
- **Persistent worklog records** with reference, times, type, location, priorities, achievements, timesheet, calculated durations.
- **User shift status** updates on clock in, pause/resume, and clock out.
- **Staff Wallet** list and detail UI (My Wallet and manager wallet view).
- **Wallet access control** for viewing another user’s logs.

### Out of scope (handled elsewhere)

- **Task Management** — tasks are not linked to worklogs; detail view only links out to task creation page.
- **Jira Integration** — no worklog sync or reference.
- **Activities / Projects** — no model relationship.
- **Leave management** — separate Staff Wallet module.
- **Expense reports** — separate Staff Wallet module.
- **Payroll or billing** — no confirmed export or calculation use of worklog hours.
- **Organisation-wide analytics** — worklogs are user-scoped, not org-aggregated in this module.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **Staff Wallet (My Wallet)** | Primary UI host — Work Log tab lists and details sessions for the wallet owner. |
| **Staff Wallets (line managers)** | Managers open employee wallet modal to review the same Work Log tab for direct reports. |
| **Users** | Worklog **owner** (`created.by`); **shift.status** updated on clock in/out/pause; profile **locations** supply on-site/remote addresses for clock-in picker. |
| **Expense Reports / Leaves** | Sibling Staff Wallet features sharing wallet access patterns and navigation shell — no data link to worklogs. |
| **Risk / Incident / Task (navigation only)** | Worklog detail shows quick-action links to raise risk, incident, or task — **not stored relationships**. |

**No confirmed links:** Tasks, Activities, Jira Integration, Dashboard, Stats, Charts, Organisation records (worklog model has no organisation field).

---

## 6. Current Data Model

The module owns one persistent entity: the **Worklog** (work session) record.

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| **Worklog** | One clock-in to clock-out working session for a staff member | Created on clock in; closed on clock out |
| **Timesheet event** | A pause or resume timestamp within a session | Embedded array on worklog; used to calculate break time |
| **User shift status** | Current clock state on the user profile | Updated by worklog actions; not owned by Worklog module but affected by it |

Worklogs **persist** after clock out. There is **no separate timesheet module** — timesheet data lives inside each worklog document.

There is **no organisation field** on the worklog model — scoping is by **user (created.by)** only.

---

## 7. Attributes

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| **Reference** | Human-readable session ID | Auto-generated `WRKLG-{ID}` |
| **Type** | Remote or On-site | Set from clock-in remote checkbox |
| **Start time** | When the user clocked in | Default now on create |
| **End time** | When the user clocked out | Null while session active |
| **Current state** | Pause or Resume | Tracks whether user is currently paused mid-session |
| **Location** | Working address selected at clock in | From user profile locations (On-site or Remote lists) |
| **Priorities** | What the user plans to focus on | Captured at clock in |
| **Achievements** | What the user accomplished | Captured at clock out |
| **Timesheet** | Ordered list of Pause/Resume events with timestamps | Drives break-time calculation |
| **Total break time (ms)** | Summed pause duration | Calculated on clock out |
| **Total work time (ms)** | Working duration minus breaks | Calculated on clock out; displayed as hours and minutes |
| **Created by** | Staff member who owns the session | User reference; list/filter key |
| **Created on** | When the record was created | From action log template |
| **Timestamps** | Record created/updated times | System timestamps |

### User shift status (on User record, not Worklog)

| Value | Business meaning |
| ----- | ---------------- |
| **Clocked in** | Active session, not paused |
| **Paused** | Active session, currently paused |
| **Clocked out** | No active session |

---

## 8. Current UI Layout

### Entry points

| Entry | Location | Purpose |
| ----- | -------- | ------- |
| **My Wallet → Work Log** | `/admin/work-log` | Own worklog history table |
| **Staff Wallets** | `/admin/wallets` → employee card → wallet modal → **Work log** tab | Manager views employee history |
| **Quick Actions → Work log** | `QuickActions` navbar component | Opens clock-in modal |
| **ClockIn modal** | Mounted on AdminNavbar and QuickActions | Clock in / pause / resume / clock out |

**Note:** AdminNavbar mounts `ClockIn` but its Quick Actions dropdown only shows **Send Report** — no Work log menu item there. Clock-in may be unreachable unless QuickActions is rendered elsewhere.

### Clock-in modal (“Work log”)

**When clocked out:**
- Prompt to clock in.
- **Location** dropdown (On-site or Remote addresses from user profile).
- **Priority** textarea (required in UI).
- **Working remote** checkbox (switches location list and sets type Remote vs On-site).
- Note: line managers may review worklogs from wallet.
- **Clock in** button.

**When clocked in:**
- Elapsed time since clock-in displayed.
- **Achievements** textarea for clock out.
- **Pause** / **Resume** and **Clock out** buttons.

### Work log history page

- **Table columns:** Reference, Start time, End time, Type, Actions.
- **Search** enabled on table.
- **Pagination** supported.
- **Row click** or **Details** action → detail modal.
- **Loading / error:** Loader while fetching; error message “Could not load work logs”.

### Worklog detail (modal)

- Reference, clock-in/out datetimes, type, location, total hours worked, staff member name.
- Priorities and achievements (or “Nothing logged”).
- **Timesheet** list of Pause/Resume events with times.
- **Action items:** icon links to Risk, Incident, and Task modules (not stored on worklog).

### Empty states

- Table fallback: “No data found”.
- Detail error: “This worklog has been deleted or removed”.

---

## 9. Miscellaneous / Module-Specific Information

### What a Worklog represents

A Worklog is a **personal work-session diary**: when the user started and stopped working, where and how (remote/on-site), what they planned (priorities), what they achieved, and how long they worked net of breaks. It supports **self-documentation and line-manager review**, not project or task accounting.

### Session lifecycle (confirmed)

```
Clock in → [Pause ↔ Resume]* → Clock out → persisted worklog with calculated durations
```

There are **no separate status fields** on the worklog beyond `currentState` (Pause/Resume) while active and presence/absence of `endTime`. Completed sessions are simply records with both start and end times.

### Time calculation

- **Break time:** Sum of intervals between each Pause and following Resume in the timesheet.
- **Work time:** `(end − start) − breaks`, with a variant when clocking out while still paused (uses last pause event time).
- Durations stored as **milliseconds**; UI converts to hours and minutes.

### Access and permissions

- **Worklog API** mounted under `/api/v3/wallets/worklog` (after `authOrgAccess`).
- **Clock in / pause / clock out / active session:** Operate on **current user** only — no impersonation.
- **List / get:** `authWalletAccess` — owner or line manager (`managedUsers` on access control).
- **My Wallet Work Log route:** Incident Management **Read** permission (shared with expense reports/leaves — likely legacy coupling).
- **Staff Wallets route:** Users **Create** permission.
- **Frontend `authWalletAccess`:** Currently **always returns true** (manager check commented out) — backend still enforces access on list/get.

### Service methods not exposed via routes

| Method | Status |
| ------ | ------ |
| `updateWorklog` | Exists (update type, location, priorities, achievements) — **no API route** |
| `deleteWorklog` | Exists (hard delete; resets shift if active) — **no API route** |

### Frontend / backend discrepancies

| Topic | Observation |
| ----- | ----------- |
| **Manager access check** | Frontend `authWalletAccess` always true; backend uses `managedUsers`. |
| **Priorities required** | Frontend required on clock in; backend optional. |
| **Clock-in entry point** | AdminNavbar mounts modal without open trigger; QuickActions has trigger but may not be used in all layouts. |
| **Achievements on clock out** | Frontend `handleClockOut` does not run form validation before submit. |
| **Pause UI state** | Frontend compares `isClockedIn` to `"Resume"` but backend sets shift to `"Clocked in"` / `"Paused"` — pause/resume button visibility may not match paused state correctly. |
| **Typo in service** | `updateWorklog` sets `achivements` field (misspelled) — method unused in routes. |
| **Detail page route** | Detail primarily in modal; full-page route with `match.params.id` supported in component but no dedicated route file found. |

### Behaviour that could not be confidently determined

- Whether **QuickActions** is rendered in any current production layout (component exists; limited imports found).
- Intended **permission coupling** with Incident Management for My Wallet Work Log.
- Whether **total work time** feeds HR, payroll, or reporting outside Staff Wallet.
- Business rules for **managedUsers** population on every login session.
