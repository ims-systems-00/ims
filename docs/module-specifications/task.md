# Task Management

## 1. Module Overview

Task Management is the organisation’s system for creating, assigning, accepting, tracking, and completing work items—both standalone tasks and tasks linked to other business records (risks, audits, incidents, suppliers, improvement plans, customers, expense reports, management reviews, and more).

Its primary business purpose is to give users a structured way to define what needs to be done, assign it to individuals or to a business unit as a team task, record due dates and priority, attach supporting files, track assignee acceptance, nudge owners, and mark work complete—with visibility through a dedicated task list, dashboard to-do widgets, and top-task analytics.

It solves the problem of action items scattered across modules by providing a unified task register with lifecycle status, assignee workflow, optional source linking, calendar integration, notifications, and embedded task UI inside many other modules.

Primary users are people with Task Manager licence and access—typically Super Admins, Heads of Service, and Basic Users. Task list visibility is personalised: users see tasks they created or are assigned to. Exact permission enforcement at the API layer is weaker than the UI suggests — **requires confirmation** (see Miscellaneous).

---

## 2. Features and Capabilities

### Create a task

- **Capability:** Create a task with name, description, due date, priority (High / Medium / Low), optional attachments, and either individual assignees or a team task tied to a business unit.
- **Who uses it:** Users from the standalone Tasks module (Create button), dashboard create drawers, embedded forms in other modules (risk, audit, incident, supplier, CIP, CRM, expense reports, management review, AI assistant), with optional link to the source record.
- **Outcome:** A new task is stored with reference `TSK-{number}`, default status Pending, assignees set to Pending acceptance. Assignees are notified (including email). A calendar event is created on the due date. If linked to another module, activity is recorded on both task and source. Source link stored when created from embedded context.
- **Conditions:** Backend requires task name and teamPriority flag. Frontend also requires description and due date. Team tasks require a business unit; backend auto-assigns all users in that business unit as assignees. Individual tasks use explicitly selected assignees.

### View, search, filter, and open tasks

- **Capability:** Browse a paginated list of tasks the user created or is assigned to; search; filter by status presets (my tasks, complete, incomplete, in progress, pending, assigned to me), due date, priority, and assignee; open a task in a detail drawer or full detail page.
- **Who uses it:** Users with route access (Task Manager licence + IAM Groups read on list route).
- **Outcome:** Users see reference, task name, assignees, priority, status, due date, and actions. Embedded task lists in other modules additionally filter by source module and record.
- **Conditions:** Backend list/get restricts to creator OR assignee. Embedded views pass `source.moduleType` and `source.module` filters.

### Update a task

- **Capability:** Change task name, description, due date, priority, team/individual assignment, business unit (team tasks), and append attachments.
- **Who uses it:** Task creator (full edit rights); assignees have limited rights (UI blocks non-creators from changing priority, group, assignees, due date).
- **Outcome:** Task reflects new information. New assignees notified. Calendar event updated. New attachments trigger activity. Completed tasks cannot be updated.
- **Conditions:** Backend blocks update when status is Complete. UI uses entity access control for field-level restrictions.

### Accept or decline a task assignment

- **Capability:** Assignee responds Yes (Accepted) or No (Declined) to an assignment.
- **Who uses it:** Users who appear in the task’s assignee list with Pending acceptance.
- **Outcome:** Assignee acceptance updated. On Accepted, task-level status moves to In progress (first acceptance). Creator notified. Activity logged. Declined assignees see decline messaging; task may remain active for other assignees.
- **Conditions:** Cannot accept/decline completed tasks. Backend uses `userId` from request body — **not verified against session user** (security gap). No requirement that all assignees accept before completion on backend.

### Complete a task

- **Capability:** Mark a task as complete.
- **Who uses it:** Task creator or any assignee in the UI (Complete button, Mark as complete in drawer/row actions).
- **Outcome:** Status becomes Complete with who completed and when. Creator notified. Activity logged on task and linked source module if present. Further edit, acceptance changes, and attachment delete blocked in UI.
- **Conditions:** Backend rejects if already Complete. Backend does not enforce assignee-only or acceptance-first rules — **UI assumes creator/assignee; backend is broader**.

### Delete a task

- **Capability:** Remove a task from the register.
- **Who uses it:** Task creator only (UI).
- **Outcome:** Task permanently deleted. Calendar event cleanup may not run — **requires confirmation**.
- **Conditions:** UI typically only while not complete. Backend delete has no creator check.

### Nudge assignees

- **Capability:** Send a nudge notification asking assignees to look at the task.
- **Who uses it:** Users from row actions, detail sidebar, drawer actions, dashboard popovers.
- **Outcome:** Assignees receive nudge notification. Cooldown via next-nudge time (~24 hours).
- **Conditions:** Not available for completed tasks in UI. Uses generic notifications API, not task routes.

### Attach and remove supporting files

- **Capability:** Add attachments on create/update; remove individual attachments.
- **Who uses it:** Users on task form (add); users on detail/drawer when not complete (remove).
- **Outcome:** Files stored on task record. Remove also deletes from file storage in UI. Attachment-added activity on update (not on create).
- **Conditions:** Attachment delete disabled in UI when task complete. Backend attachment delete has no role check.

### View dashboard to-do and top-task analytics

- **Capability:** See assigned non-declined tasks on organisation/business-function dashboards; fetch top 3 individual and top 3 team incomplete tasks for current user.
- **Who uses it:** Dashboard users with Task Manager read permission (widget gating).
- **Outcome:** Quick visibility of personal workload. Analytics returns up to 3 team tasks (user is assignee or creator, team priority, not complete) and 3 individual tasks (user is creator, not team, not complete).
- **Conditions:** Dedicated `TaskAnalytics` component exists but is **not imported anywhere** — analytics API may be unused in main UI. Org dashboard uses separate `todoLists` query.

### Comment on task activity

- **Capability:** Add timeline comments on task detail/drawer Activity tab.
- **Who uses it:** Users viewing non-complete tasks (editable); read-only when complete.
- **Outcome:** Activity history on task. Uses shared Timeline component with tasks module type.

### Embedded tasks in other modules

- **Capability:** View task list, create tasks, and link tasks to the parent record from Risk, Audit, Incident, Supplier, CIP, CRM, Expense Reports, Management Review, and AI Assistant contexts.
- **Who uses it:** Users with Task Manager and parent-module access as applicable.
- **Outcome:** Tasks appear scoped to source record; detail shows link back to parent. Deleting parent record deletes linked tasks (backend cascade).

---

## 3. User Outcomes / End Results

- **Create:** Action items with reference, priority, due date, assignees or team scope, optional attachments, and optional link to a business record.
- **View:** Personalised task list (created or assigned), filters, dashboard to-do, detail with overview, acceptance workflow, attachments, and activity.
- **Manage:** Assignment acceptance/decline, updates, nudges, completion, deletion (creator).
- **Change:** Task details and assignees until Complete; team vs individual assignment model.
- **Information received:** Assignee notifications and emails, acceptance/status updates, completion notification to creator, calendar events on due dates, activity on task and linked modules.
- **Business actions enabled:** Track work across the organisation; link operational follow-up to risks, audits, incidents, suppliers, and other modules; surface workload on dashboards.

---

## 4. Scope Boundaries

### In scope

- Standalone task register at `/admin/tasks`.
- Task lifecycle: Pending → (assignee acceptance) → In progress → Complete.
- Individual and team (business-unit) assignment models.
- Assignee acceptance (Accepted / Declined / Pending).
- Attachments, nudges, calendar events, notifications, activity.
- Embedded task UI and source linking in other modules.
- Dashboard to-do lists and top-task analytics endpoint.
- Cascade delete when source module record deleted.

### Out of scope (handled elsewhere)

- **Timeline/activity infrastructure** — shared component; not task CRUD.
- **Notification delivery** — shared notifications module.
- **Calendar module administration** — tasks create/update events automatically.
- **IAM group membership resolution** — used for team auto-assignment; group admin is Our IMS.
- **Compliance module** — no task UI integration identified in frontend.
- **authPersonalization middleware** — defined but not mounted; list scoping hardcoded in getTasks instead.
- **Formal project management** (Gantt, dependencies, sprints) — not present.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| Risk Management | Embedded task tab/drawer; tasks link via source; deleted when risk deleted. |
| Audit | Embedded tasks; source link to audit record. |
| Incident Management | Embedded tasks; source link to incident. |
| Supplier Management | Embedded tasks; source link to supplier. |
| CIP | Embedded tasks; source link to improvement plan. |
| CRM / Customers | Embedded tasks on customer records. |
| Expense Reports | Embedded tasks on expense reports. |
| Management Review | Embedded tasks on review meetings. |
| Document Management | TaskContextProvider wrapper; document module context. |
| Dashboard | To-do widget, create/detail drawers, links to full task list. |
| AI Analytical Assistant | Can pre-fill and create linked tasks from analysis content. |
| Calendar | Due dates create/update calendar events for assignees. |
| Notifications | Assign, complete, accept/decline, nudge events. |
| Users | Assignees, creator, completer; ownership transfer on user offboarding. |

---

## 6. Current Data Model

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| Task | A work item to be done | Primary record |
| Assignee entry | User assigned to the task with acceptance state | Individual assignment workflow |
| Team task flag | Task assigned to a business unit (all group members become assignees) | Alternative assignment model |
| Task status (completed.status) | Pending / In progress / Complete at task level | Lifecycle progression |
| Assignee acceptance | Pending / Accepted / Declined per assignee | Assignment response |
| Attachment | Supporting file on the task | Evidence or reference material |
| Source link | Optional originating module and record | Embeds task in parent business context |
| Linked calendar event | Calendar entry on due date | Reminder/scheduling |

---

## 7. Attributes

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Reference | User-facing identifier | `TSK-{number}` |
| Name (Task) | Short title of the work item | Required |
| Description | Full details of what needs to be done | Required in UI; rich text |
| Due date | When the task is due | Required in UI and schema |
| Priority | High / Medium / Low | Default Medium |
| Team task (teamPriority) | Whether task is assigned to a business unit collectively | If true, assignees auto-populated from group |
| Business unit (group) | For team tasks — which unit owns the work | Required when team task |
| Assigned to | List of users with acceptance state each | Hidden in UI when team task; multi-select otherwise |
| Assignee acceptance | Pending / Accepted / Declined | Per assignee |
| Status (task-level) | Pending / In progress / Complete | Shown as Status in list |
| Completed (by, on) | Who marked complete and when | Set on completion |
| Attachments | Supporting files | Add on create/update; remove individually |
| Source (module type / module) | Linked parent record | e.g. risks, audits, incidents, suppliers |
| Created (by, on) | Who raised the task and when | Creator can delete in UI |
| Next nudge at | Cooldown for nudge | ~24h after nudge |
| Organisation | Tenant scope | Always applied |

---

## 8. Current UI Layout

### Main screens / pages

- **Tasks list** — `/admin/tasks`, sidebar **Tasks**.
- **Task detail page** — `/admin/tasks/:id` (hidden from sidebar).
- **Dashboard widgets** — to-do list, links to `/admin/tasks` (organisation and business-function dashboards).

### Important sections and views

**List page:** Search, filter modal, data table (Reference, Task, Assigned to, Priority, Status, Due date, Actions), pagination. Row click opens detail drawer.

**Detail drawer tabs:** Overview | Details | Activity.

**Full detail page:** Left sidebar (nudge action, overview metadata); right switchable read/edit view with linked module link, acceptance workflow (Accept/Decline), description, assignees, attachments, timeline comments.

**Dashboard to-do:** Compact list of assigned non-declined incomplete tasks with actions (complete, delete, nudge).

### Primary actions

- Create task (standalone or embedded drawer).
- Open detail drawer or full page.
- Edit (creator or accepted assignee per UI rules).
- Accept / Decline assignment.
- Complete / Mark as complete.
- Delete (creator, while not complete).
- Nudge assignees.
- Add/remove attachments.

### Forms

**Task create/edit:** Task name, Priority, Description, Team task checkbox, Business unit (if team), Assigned to multi-select (if not team), Due date, Attachments dropzone.

**Filter:** Status presets, Due before date, Priority, Assignee.

### Navigation and workflow

```
Create task (standalone or from parent module)
  → Assignees notified; calendar event created
  → Assignee Pending → Accept or Decline
  → On accept: task In progress
  → Work: edit, attachments, comments, nudge
  → Creator or assignee Complete → status Complete (locked)
  → Creator may Delete while incomplete
```

### Material empty, loading, or restricted states

- Loading on list, detail, dashboard to-do.
- Detail error: “This task has been deleted or removed.”
- Dashboard empty: no widget or “No data available” messaging.
- Completed: edit hidden, timeline read-only, attachment delete disabled.
- Non-creators blocked from editing priority/group/assignees/due in form.

---

## 9. Miscellaneous / Module-Specific Information

### Terminology

- **Team task** — assigned to a business unit; all users in that unit become assignees automatically (backend).
- **Individual task** — explicit assignee selection.
- **Status in list** — maps to task-level `completed.status` (Pending / In progress / Complete), not assignee acceptance alone.

### Important business rules (observed)

- List and get: user must be creator OR assignee.
- Update blocked when Complete.
- Accept moves task to In progress (task-level) on first Accepted response.
- Complete sets task-level status to Complete.
- Team task create/update re-resolves assignees from business unit membership (creator excluded on update).
- Deleting source records (risk, incident, audit, etc.) deletes linked tasks.
- RBAC middleware for TASK_MANAGER is **commented out** on all task routes — reliance on session auth + list scoping only.

### authPersonalization

Middleware exists to verify query `userId` matches session user before personalised reads. **Not mounted on any route.** Effective personalization is hardcoded in `getTasks`/`getTask` (creator or assignee filter). No separate frontend API call.

### Task analytics (`topTaskAnalytics`)

`GET /analytics/toptasks` returns up to 3 incomplete team tasks and 3 incomplete individual tasks for the current user. Frontend `TaskAnalytics.jsx` consumes this but is **not imported** in the app — analytics may be unused in production UI. Org dashboard uses separate todo list query instead.

### Frontend vs backend discrepancies (requires confirmation)

| Topic | Frontend | Backend | Conclusion |
| ----- | -------- | ------- | ---------- |
| RBAC | Route uses IAM_GROUPS READ + Task licence | TASK_MANAGER enforceRbac commented out | API mutations less restricted than IAM suggests |
| Complete | Creator + assignees | Any authenticated user with task id | UI narrower than backend |
| Accept/decline | Assignee UI | userId from body, not session | Possible impersonation of assignee response |
| authPersonalization | Not used | Not mounted | Dead code |
| Status string | Mostly "Complete" | "Complete" | Some UI checks "Completed" — may never match |
| Calendar on delete | N/A | deleteOne vs findOneAndDelete hook | Calendar event may orphan |
| TaskAnalytics component | Defined | API exists | Component orphaned |
| Route service | IAM_GROUPS READ | N/A | Unusual vs TASK_MANAGER direct check |

### Unclear or incomplete behavior

- Whether all assignees must accept before complete (UI suggests acceptance workflow matters; backend does not enforce).
- Initial list filter when no default preset in filters.js.
- Whether team task assignee list includes creator on create (backend comment suggests creator not excluded on create).
