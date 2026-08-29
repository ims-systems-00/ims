# Notifications

## 1. Module Overview

Notifications is the organisation’s **in-app alerting system** that informs users about business events, assignments, escalations, reminders, and organisational notices. It is not a standalone sidebar module; it appears as a **global bell icon** in the admin navigation bar and as supporting UI in System Defaults (manual broadcast notices) and email deep-links.

A **Notification** in this system is a persisted message record tied to an individual user, with title, message text, optional link to a source business record (task, risk, incident, etc.), icon, and three independent state tracks: **sent**, **read**, and **popup**. Notifications are created **automatically** when other modules trigger business events (task assignment, risk escalation, management review scheduling, document approval, etc.) and **manually** by administrators sending organisation-wide notices.

Its primary business purpose is to draw users’ attention to work requiring action, keep assignees and owners informed of changes, support nudge/reminder workflows on overdue or stalled records, and provide a navigable history of alerts linked back to the relevant module screen.

It solves the problem of users missing updates across many modules by centralising alerts in one bell panel, optionally showing important items as modal pop-ups on login, pushing real-time updates via WebSocket, and optionally sending email with a deep link back into the product.

Primary users are **all authenticated users** who receive notifications addressed to them. Manual broadcast creation is available to users with Our IMS create permission on the System Defaults screen. Most notification routes have **RBAC middleware commented out**—access relies on session authentication and user-scoped queries.

---

## 2. Features and Capabilities

### View personal notifications (bell panel)

- **Capability:** Open a right-hand drawer listing the user’s notifications with title, message, icon, relative timestamp, and unread indicator.
- **Who uses it:** Any logged-in user via the navbar bell icon.
- **Outcome:** User sees paginated notification history (10 per page, infinite scroll loads more). Unread items show a blue dot (⦿). Badge on bell shows count of **unsent** notifications (not unread count).
- **Conditions:** Fetches notifications where `user` equals current user ID. Opening the panel marks all unsent notifications as **sent**.

### Open a notification and navigate to source

- **Capability:** Click a notification card to mark it read and navigate to the linked business record when a valid `screenIdentifier` and params exist.
- **Who uses it:** User clicking a notification in the bell panel.
- **Outcome:** Read status updated; drawer closes; browser navigates to the resolved admin route (e.g. task detail, risk detail, incident detail).
- **Conditions:** Link resolution depends on route `screenIdentifier` matching frontend routes and user having access to that route. If no link resolves, card href is `#`.

### Receive real-time notifications

- **Capability:** New notifications appear at the top of the list without refresh when pushed via WebSocket.
- **Who uses it:** Connected users.
- **Outcome:** Incoming `new-notification` socket event prepends to local list.
- **Conditions:** Requires active WebSocket connection. Sound alert is commented out in code.

### Important popup alerts on load

- **Capability:** Notifications with `popUp.status: unread` display as sequential modal alert dialogs when notifications are loaded.
- **Who uses it:** Recipients of high-priority notifications (nudges, some assignments, etc.).
- **Outcome:** Each popup shows message text and custom icon; user confirms through dialogs one by one; after all shown, **bulk popup status** marks all user popups as read.
- **Conditions:** Only notifications explicitly created with `popUpStatus: unread` trigger this. Schema default for popUp is **read**, so most notifications skip popups unless set at creation.

### Mark notifications as read

- **Capability:** Individual read status update when user clicks a notification.
- **Who uses it:** User interacting with bell panel.
- **Outcome:** `read.status` becomes `read` with timestamp; blue dot removed.
- **Conditions:** No bulk read UI. Read does not auto-set on popup dismiss alone (popup uses separate popUp status).

### Mark notifications as sent (acknowledge delivery to panel)

- **Capability:** When user opens the bell drawer, all their unsent notifications become sent.
- **Who uses it:** Automatic on drawer open.
- **Outcome:** Badge count clears. Represents that the user has opened the notification panel, not that they read each item.
- **Conditions:** Bulk update for current user ID.

### Send manual organisation notice (push notification)

- **Capability:** Administrator composes a short message (max 150 chars) and selects audience (All users / Heads of service) on System Defaults → Push notification panel.
- **Who uses it:** Users accessing Organisation → System Defaults with Our IMS create permission (backend route).
- **Outcome:** **Implementation sends to every user in the organisation** regardless of audience selection (audience logic commented out on backend). Each user gets a notification titled **Notice** with `referenceType: notifications`. Table shows sent notices created by current user (`actor=true` filter).
- **Conditions:** Frontend audience selector **does not affect** backend behaviour — **requires confirmation** whether intentional.

### Nudge a person (reminder)

- **Capability:** From Risk, Incident, Task, or Continual Improvement Plan (CIP/OFI) screens, authorised users send a reminder to the record owner or assignees.
- **Who uses it:** Users with nudge UI on risk row actions, risk detail, incident, CIP, task detail.
- **Outcome:** Target users receive an in-app notification (popup unread + email for some types) with nudge icon and message naming who nudged and which record. Activity log entry “nudged the owner.” Source record gets `nextNudgeAt` set to 24 hours ahead.
- **Conditions:** Blocked if `nextNudgeAt` is in the future (24-hour cooldown). UI disables nudge button and shows “Already nudged” when cooldown active.

### Email notification deep link

- **Capability:** Some notifications (notably nudges via eventsV2) also send email with link to `/admin/notificaion-redirection/?notification={id}&user={userId}`.
- **Who uses it:** Email recipients.
- **Outcome:** Redirect page loads notification, verifies user matches query param, navigates to linked screen.
- **Conditions:** Typo in path (`notificaion`). Mismatched user ID redirects to home.

### Filter notification history (admin broadcast view)

- **Capability:** System Defaults push notification table queries notifications created by the admin (`actor=true`, `push=true`).
- **Who uses it:** System Defaults viewers.
- **Outcome:** Table of broadcast notices with message, creator, date.
- **Conditions:** Separate from end-user bell panel query.

---

## 3. User Outcomes / End Results

- **Receive:** Automatic alerts when business events affect the user (assignment, escalation, approval, schedule, etc.).
- **View:** Personal notification history in the bell panel with pagination and real-time updates.
- **Act:** Click through to the related task, risk, incident, document, supplier, audit, or other linked record.
- **Acknowledge:** Opening the panel clears the “new” badge (sent status); clicking items marks them read.
- **Be reminded:** Nudge sends a targeted popup + notification (and often email) to owners/assignees with 24-hour repeat limit.
- **Broadcast:** Admins can send organisation-wide notice messages (currently to all org users).
- **Business actions enabled:** Stay informed across modules without visiting each module; prompt action on owned work; organisational announcements. **Not** a chat, SMS, or mobile push notification system.

---

## 4. Scope Boundaries

### In scope

- In-app notification records per user.
- Bell panel UI in admin navbar.
- Sent, read, and popup state management.
- WebSocket push of new notifications.
- Modal popup sequence for important alerts.
- Nudge API and UI on selected modules.
- Manual broadcast notices (System Defaults).
- Email deep-link redirect page.
- Automatic notification creation via module event handlers.

### Out of scope (handled elsewhere)

- **Toast messages** (`react-notifications-component` via `useNotification` hook) — ephemeral UI feedback for form success/error, not persisted notifications.
- **Email Campaign module** — marketing/bulk email; separate from in-app notifications.
- **Activity timeline** — separate activity feed; nudge also writes activity but activity is not the notification module.
- **Calendar reminders** — no notification-specific reminder schedule.
- **Browser/OS push notifications** — not implemented.
- **Dedicated Notifications sidebar page** — none; only bell drawer and System Defaults admin table.

---

## 5. Linked Modules

Notifications are **cross-cutting**. Confirmed source modules and trigger types:

| Linked Module | Business events that create notifications | Typical recipients |
| ------------- | ----------------------------------------- | ------------------ |
| Task Management | New assignee, task completed, status change, nudge assignees | Assignees, creator |
| Risk Management | New owner, escalation, mitigation, nudge owner | Owner, Super Admins |
| Incident Management | New owner, escalation, resolution, P1 supplier alert, nudge owner | Owner, investigators, admins |
| Continual Improvement (CIP/OFI) | New owner, implemented, nudge owner | Owner |
| Audit | New audit event | Relevant users |
| Management Review | New review scheduled, notify attendees | Attendees, Super Admins, HoS |
| KPI Objectives | New KPI created | Heads of Service (business unit) |
| Supplier Management | New buyer assigned, compliant supplier | Buyer, Super Admins |
| Document Management | Repository owner, new version, revision, authorisation, signature, conformance | Owners, authorisers, signers |
| CRM / Customers | Customer updates, invoices | Relevant users |
| Leave / Expense (Wallet) | Submission, review outcome | Approvers, submitter |
| License Requests (Our IMS) | New request, status change | Admins |
| CQC (Compliance) | Safeguarding, significant events, whistleblow, complaints | Investigators, shared users |
| Data Import | Initiate, complete | Triggering user |
| User Management | Data ownership transfer, referential integrity complete | Affected users |
| Compliance (Control status) | Control compliance updates | Relevant users |
| IMS Projects | Project events | Project stakeholders |
| Manual broadcast | Admin notice | All org users (current implementation) |

Each notification stores `referenceType`, `referenceModule`, `screenIdentifier`, and `params` (typically `{ id, group }`) to enable navigation back to the source record.

---

## 6. Current Data Model

| Entity / concept | Business meaning | Role |
| ---------------- | ---------------- | ---- |
| Notification | A single alert to one user | Primary persisted record |
| Recipient (`user`) | The user who receives the alert | One notification per recipient per event |
| Creator (`created.by`) | Who or what triggered the alert | User or system on behalf of module action |
| Reference type | Source module category | e.g. tasks, risks, incidents, notifications (broadcast) |
| Reference module | Link to specific source record | ObjectId of task, risk, etc. |
| Screen identifier | Frontend route key for navigation | Maps to admin path |
| Params | Route parameter values | Usually record ID and group |
| Sent state | Whether user has opened the bell panel since creation | unsent → sent |
| Read state | Whether user clicked/read the item | unread → read |
| Popup state | Whether modal popup still needs showing | unread → read (separate from read state) |
| Icon | Visual category image URL | Module/event-specific or default |
| Nudge metadata (on source records) | `nextNudgeAt` cooldown | Not on notification; on risk/task/incident/CIP |

There is **no separate** notification type enum, priority field, or expiry date on the notification model.

---

## 7. Attributes

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Title | Short heading in bell panel | e.g. “Task management”, “Notice”, “Risk management” |
| Message (`msg`) | Body text describing the event | Full sentence with reference numbers where applicable |
| User | Recipient | One user per record |
| Group | Business unit context | Often null; sometimes set |
| Reference type | Source module | Enum of module types (tasks, risks, incidents, etc.) |
| Reference module | Linked record ID | Enables deep navigation |
| Screen identifier | Target UI screen | Must match frontend route config |
| Params | Navigation parameters | `{ id, group }` or `{ groupId, id }` |
| Sent (status, on) | Panel acknowledgement | Default **unsent**; badge counts unsent |
| Read (status, on) | User read the item | Default **unread**; blue dot in UI |
| PopUp (status, on) | Modal popup shown or pending | Default **read** in schema; nudges set **unread** |
| Icon | Notification image | Default or event-specific (nudge, etc.) |
| Created (by, on) | When alert was generated | Timestamp for “time ago” display |
| Reference | Internal reference string | Default empty |
| isOrganizational | Org-wide flag | Default false; **not observed** driving distinct UI behaviour |
| Organisation | Tenant scope | Via org plugin on list |

**Not implemented:** priority, category labels, expiry, user-dismiss without read, notification grouping/threading.

---

## 8. Current UI Layout

### Global access (all admin pages)

- **Bell icon** in top navbar (`AdminNavbar` → `Notifications` component).
- Red superscript badge shows count of notifications where `sent.status === "unsent"`.
- Clicking bell:
  1. Calls **update sent status** (marks all unsent as sent for current user).
  2. Opens **right drawer** (`notification-panel`, ~30% width).

### Bell drawer contents

- Scrollable list of notification cards.
- Each card: icon image, title, message, relative time (`timePassedSinceCreated`), blue dot if `read.status === "unread"`.
- Click card: marks **read**, closes drawer, navigates via link if resolvable.
- Infinite scroll: loads next page when scrolled to bottom (if `hasNextPage`).
- Empty state: “You have no notifications at the moment”.
- Loading spinner while fetching.

### Popup alerts (modal)

- On notification load, items with `popUp.status === "unread"` trigger sequential **SweetAlert-style modals** showing message and icon.
- After all modals confirmed, **bulk popup status** API marks all user popups read.
- Separate from bell drawer; can appear before user opens bell.

### Nudge UI (embedded in source modules)

| Module | Location | Behaviour |
| ------ | -------- | --------- |
| Risk Management | Row actions menu, detail sidebar | Confirm modal → nudge owner; disabled if `nextNudgeAt` in future |
| Incident Management | Incident actions | Nudge owner with cooldown |
| Task Management | Task detail (via store/hook) | Nudge assignees |
| CIP / OFI | ContinualImprovementAction | Nudge owner with cooldown |

Nudge button uses nudge icon; tooltip shows target name or “Already nudged”.

### Manual broadcast (System Defaults)

- Path: Organisation area → **System Defaults** panel → **Push notification** section.
- **Form:** Message (textarea, max 150), Audience dropdown (All users / Heads of service), Confirm button.
- **Table:** Message, Created by, Created on — lists notices sent by current admin (`push=true`, `actor=true` filter).
- No dedicated “Notifications” sidebar entry.

### Email deep-link page

- Invisible route: `/admin/notificaion-redirection?notification={id}&user={userId}`.
- Validates user access, fetches notification, redirects to linked screen or home on error.

### Toast notifications (not this module)

- `NotificationContext` + `useNotification` show short-lived toasts (success/danger) for form operations — **separate from persisted notification records**.

### Permission / restricted states

- Most notification API routes have RBAC **commented out** — any authenticated session can call with user ID.
- Manual create requires **OUR_IMS CREATE** (not NOTIFICATIONS service).
- Navigation from notification respects target route `accessPolicy` via `authUser` check in link resolver.

---

## 9. Miscellaneous / Module-Specific Information

### Notification lifecycle (confirmed states)

```
Created (sent=unsent, read=unread, popUp=read|unread)
    │
    ├─► [WebSocket] → appears in bell list (real-time)
    ├─► [popUp=unread] → modal popup sequence on load → bulk popUp=read
    ├─► User opens bell panel → all unsent → sent (badge clears)
    └─► User clicks notification → read=read → navigate to source (if link exists)
```

| State | Values | Meaning | User-visible effect |
| ----- | ------ | ------- | ------------------- |
| Sent | unsent / sent | User has not / has opened bell panel | Badge count |
| Read | unread / read | User has not / has clicked notification | Blue dot |
| PopUp | unread / read | Modal alert pending / shown | Blocking modals on login |

States are **independent** — marking sent does not mark read; popup dismiss does not mark read.

### What “sent” means

**Not email delivery.** Sent means the user has **opened the notification panel** at least once since the notification arrived. Until then, the bell badge increments. This is an acknowledgement that the alert reached the user’s notification tray, not that they read the content.

### What “popup” means

**In-app modal dialogs** (SweetAlert), not browser push notifications. Used for higher-attention items (especially nudges). After user confirms each modal, bulk API marks popup read so they are not shown again. Default schema value is `read`, so only notifications explicitly created with popup unread participate.

### What “nudge” means

A **manual reminder** from one user to another to look at a specific business record (risk, incident, task, or CIP). Predefined message template includes nudger name, record reference, and title. Creates standard notification(s) with nudge icon and popup unread; may send email. **24-hour cooldown** per record via `nextNudgeAt`. Also logs activity on the source record.

**Supported modules:** risks, incidents, tasks, cips.

### Notification creation paths

| Path | Trigger | User-facing? |
| ---- | ------- | ------------ |
| Module event handlers (eventsV2 + Trigger service) | Business actions across modules | Automatic |
| `nudgePeople` API | User nudge button | Manual |
| `createNotifications` API | System Defaults form | Manual (admin) |
| `NotificationService.notify` / `notifyV2` | Called from handlers | Internal |

Users do **not** compose arbitrary notifications to colleagues from the bell UI—only admins broadcast notices and modules auto-generate alerts.

### Recipients and visibility

- Each notification belongs to **one user** (`user` field).
- Multi-recipient events create **one notification record per recipient**.
- List API filters by `userId` query param (current user in UI).
- Organisation scoping on list via `paginateByOrg`.
- Users cannot view another user’s notifications through the standard UI (email link checks user ID match).
- **No role-based admin view** of all users’ notifications identified.

### Frontend vs backend discrepancies

| Topic | Frontend | Backend | Conclusion |
| ----- | -------- | ------- | ---------- |
| Broadcast audience | All users / HoS selector | Sends to **all org users**; audience switch commented out | Audience selector ineffective |
| Badge count | Counts `sent=unsent` | Same field | Not unread count — user may see dot after badge clears |
| Task nudge type (useTask hook) | `nudgeToLookAtTask` | Handler expects `nudge-to-look-at-task` | **Nudge may fail** from that code path |
| createNotifications RBAC | Implicit via form access | Requires OUR_IMS CREATE | Not NOTIFICATIONS service |
| GET/PUT notification routes | Used freely | RBAC commented out | Weak authorization on state updates |
| popUp default | Expects unread for important items | Schema default **read** | Most auto-notifications skip popup unless explicitly set |
| Email redirect URL | `notificaion-redirection` typo | Same | Consistent typo |
| Push notification table filter | `actor=true` (creator) | Filters `created.by` when actor param set | Shows admin’s sent broadcasts only |

### Unclear or incomplete behaviour

- Whether broadcast-to-all-users behaviour is intentional vs unfinished audience filtering.
- Full inventory of which event handlers set `popUpStatus: unread` vs default read.
- Whether `IMS_SERVICES.NOTIFICATIONS` in IAM policies is used anywhere on routes (policies exist; routes mostly unguarded).
- Whether CQC-specific notification fetch on site details is actively used in production UI.

### Distinction: toast vs notification record

The product uses two “notification” concepts:

1. **Persisted notifications** (this module) — bell panel, database records, states, links.
2. **Toast notifications** (`Store.addNotification`) — transient 2-second UI messages for operation feedback.

Documentation and investigation should not conflate them.
