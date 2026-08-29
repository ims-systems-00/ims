# Leaves

## 1. Module Overview

The **Leaves** module lets organisation staff **request time away from work** — annual leave or sick leave — and route those requests to their **line manager(s)** for approval. It sits under **My Wallet** (alongside Expense Report and Work Log) and can also be opened for a **managed staff member** from **Staff Wallets**.

A leave record is a **dated leave request** with a calculated number of working days, a description, an approval workflow (draft → submitted → approved/rejected), and optional **ongoing sick leave** handling. The module does **not** run payroll, track attendance clocks, or enforce annual entitlement balances automatically.

The module solves the problem of **recording, calculating, approving, and communicating** staff absence in one place, with working-day calculation that excludes weekends and public holidays for the requester's country.

Primary users are **staff who request leave** (claimants) and **line managers** listed on the requester's membership (reviewers). Navigation and access policies currently reference **Incident Management Read** for My Wallet screens — the same placeholder pattern used by Expense Report and Work Log in the inspected frontend.

---

## 2. Features and Capabilities

### Request leave (create draft or ongoing sick leave)

- **Capability:** Create a leave request with type, date range, partial-day fractions, and description.
- **Who uses it:** Staff using **Request** on the Leaves list (My Wallet or a managed staff wallet).
- **Outcome:** A leave record is created with a reference (`AL-{number}` for annual leave, `SIC-{number}` for sick leave). Success: *“Leave request created successfully.”* / UI: *“Leave requested successfully”*.
- **Conditions:**
  - **Type** required: **Annual leave** or **Sick leave** (UI options).
  - **Start date**, **end date** (end ≥ start), **start/end day fractions** (1, 0.75, 0.5, 0.25), and **description** required.
  - Initial submission status: **Draft** (default) or **Ongoing** (when **Ongoing leave** is checked for sick leave).
  - **Line managers** from the requester's profile are copied onto the request for approval routing.
  - Backend **requires a country** on the requester's user record (defaults to United Kingdom / GB if unset) for day calculation.
  - Backend **requires line managers** to be present on the user record fetched at create time. **Implementation note:** line managers are stored on **membership** in the user-management UI, but create reads the **user** document — same pattern as Expense Report. **[Requires verification]** that create succeeds when managers exist only on membership.
  - **Working days (`days`)** are calculated automatically: calendar days minus weekends, minus public holidays for the user's country code, minus partial-day fractions on start and end dates.

### Save and submit sick leave in one step (ongoing)

- **Capability:** For **Sick leave** with **Ongoing leave** checked, create the request and immediately submit it to line managers in one action.
- **Who uses it:** Staff requesting ongoing sick leave.
- **Outcome:** Record created with **Ongoing** status, then submission moves it to **Pending**. Success: *“Leave request submitted to your line manager successfully”*.
- **Conditions:** Only shown when **Ongoing leave** is enabled on the form (sick leave only).

### Update a leave request

- **Capability:** Change type, dates, fractions, and description on an existing request.
- **Who uses it:** The request owner (or user with wallet access to that person's data) while the request is not finally approved or rejected.
- **Outcome:** Updated record returned. Success: *“Leave request updated successfully”*.
- **Conditions:**
  - UI edit is disabled when status is **Approved** or **Rejected**.
  - If dates change, **days** are recalculated on the backend (weekends and holidays excluded; **partial-day fractions may not be reapplied on update** — create path subtracts fractions, update path does not). **[Requires verification]**

### Submit a draft leave request to line managers

- **Capability:** Move a **Draft** (or adjust an **Ongoing**) request to **Pending** for managerial review.
- **Who uses it:** The request owner.
- **Outcome:** Status becomes **Pending**; submission date recorded. For **Ongoing** sick leave where the period includes today, **end date may be adjusted to today** at submission time. Line managers receive an **in-app notification**. Success: *“Leave request submitted to your line manager successfully”*.
- **Conditions:** Submit button shown only for **Draft** requests owned by the current user.

### Approve or reject a pending leave request

- **Capability:** Line manager approves or rejects a submitted request.
- **Who uses it:** Users who **manage** the requester (`managedUsers` in session includes the requester's user ID) when status is **Pending** (and backend also allows **Ongoing**).
- **Outcome:**
  - **Approved:** Status **Approved**; decision maker and decision date recorded. A **calendar event** is created showing the employee's leave period (visible to groups from the requester's access policies). Requester notified in-app.
  - **Rejected:** Status **Rejected**; decision recorded. Requester notified in-app.
  - Success messages: *“This leave request has been approved”* / *“This leave request has been rejected”*.
- **Conditions:**
  - Requester **cannot** approve their own request (backend excludes `created.by` matching the acting user).
  - Confirmation dialog shows requester name and date range before approve/reject.

### Delete a draft leave request

- **Capability:** Permanently remove a leave request that has not left **Draft**.
- **Who uses it:** Request owner or admin with entity access, from the list actions menu.
- **Outcome:** Record deleted. Success: *“Leave request deleted successfully”*.
- **Conditions:** Delete action only offered when status is **Draft**.

### View leave requests in a list

- **Capability:** Browse paginated leave requests for a wallet user (self or managed staff).
- **Who uses it:** Staff and line managers with **wallet access** to the target user.
- **Outcome:** Table shows reference, type, number of days, created date, submitted date, status badge, and actions.
- **Conditions:**
  - List filtered by `created.by` = wallet user ID.
  - When viewing **own** wallet, **Draft** requests are hidden from the default list filter; when viewing a **managed** staff wallet, drafts are included. **[Observed but business purpose unclear]** — may be intentional so managers see all statuses while staff see only submitted items in some views.

### View leave detail

- **Capability:** Open a single leave request with overview metadata, description, activity/comments, and public holidays reference.
- **Who uses it:** Anyone with wallet access to the requester.
- **Outcome:** Detail page or drawer shows reference, type, days, dates, fractions, status, submission date, description, timeline comments, and a **Public holidays** tab for the viewer's country.
- **Conditions:** Full-page detail at `/admin/leaves/:id`; drawer detail from list row click.

### View public holidays (reference)

- **Capability:** Display public holidays for a country and year to help staff plan leave.
- **Who uses it:** Users viewing leave detail drawer (**Public holidays** tab).
- **Outcome:** Table of holiday name, type, and dates for the user's country (from profile) and current year.
- **Conditions:** Uses the holidays API with country code; same holiday library used internally for working-day calculation.

### Comment on a leave request (activity)

- **Capability:** Add timeline comments on a leave request while it is open; read-only timeline after approval or rejection.
- **Who uses it:** Users with access to the leave detail view.
- **Outcome:** Comments stored via the shared **Timeline** component (`moduleType: leaves`).
- **Conditions:** Editable until status is **Approved** or **Rejected**.

---

## 3. User Outcomes / End Results

### For staff (leave requesters)

- **Create:** Start annual or sick leave requests with dates, partial days, and description.
- **View:** See their leave history (excluding own drafts from default list), open detail, and reference public holidays.
- **Manage:** Update draft requests; submit to line managers; delete drafts.
- **Change:** Edit dates, type, and description before final approval/rejection.
- **Information received:** Calculated working days, reference number, submission and decision status, notifications when reviewed.
- **Business actions enabled:** Formally request authorised time off and notify managers without email or spreadsheets.

### For line managers

- **View:** See leave requests for staff they manage (via Staff Wallets or notifications linking to detail).
- **Manage:** Approve or reject **Pending** (and **Ongoing**) requests.
- **Information received:** In-app notification when a request is submitted; requester name, reference, and dates on the request.
- **Business actions enabled:** Make an approve/reject decision that updates status and, on approval, adds leave to the organisation calendar.

**What users cannot achieve through Leaves today (confirmed):**

- Cancel or withdraw a request after submission (no cancel workflow; only delete while **Draft**).
- Decline with reason captured in a dedicated field (rejection sets status only; comments are separate).
- See or enforce **annual leave entitlement balance** against requested days (entitlement is stored on membership but not checked at request time).
- Request leave types beyond **Annual leave** and **Sick leave**.
- Assign leave to Functional Units or groups through this module.

---

## 4. Scope Boundaries

### In scope

- Creating, updating, submitting, approving, rejecting, and deleting (draft) leave requests.
- Working-day calculation excluding weekends and country public holidays.
- Partial-day leave via start/end day fractions.
- Ongoing sick leave creation and submission.
- Line-manager approval workflow and notifications.
- Calendar event creation on approval.
- Public holidays reference display.
- Timeline comments on leave requests.

### Out of scope (handled elsewhere)

- **Payroll, pay deduction, or leave pay rules** — not implemented.
- **Attendance / clock-in** — Work Log and clock features are separate.
- **Annual entitlement administration** — `leaveDaysEntitledTo` on **Membership** (User Management) is informational; not enforced by Leaves.
- **Line manager assignment** — configured on membership in **Users** module.
- **Organisation-wide leave calendar UI** — approved leave creates a calendar event, but there is no dedicated leave calendar screen in Leaves.
- **Expense claims** — **Expense Reports** module under My Wallet.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **Staff Wallet / My Wallet** | Leaves is a **My Wallet** tab alongside Expense Report and Work Log. Same wallet-access pattern (self or managed staff). |
| **Users / Memberships** | **Line managers** for approval are intended to come from the requester's membership. **Country** on the user profile drives holiday exclusion. **Leave days entitled to** is stored on membership and shown on user profile but **not enforced** when requesting leave. |
| **Calendar** | On **approval**, a calendar event is created for the leave period, titled with employee name and leave type, visible to the requester's access-policy groups. |
| **Notifications** | On **submission**, line managers receive in-app notifications. On **approve/reject**, the requester is notified. Email is disabled for these notifications (`email: false`). |
| **Activity / Timeline** | Comments on leave requests use the shared timeline with `moduleType: leaves`. |
| **Organisation** | Leave records are **organisation-scoped** via the org data plugin. |

No confirmed link to Tasks, Functional Units (IAM groups), or Compliance modules for leave workflows.

---

## 6. Current Data Model

The Leaves module owns one primary persistent entity:

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| **Leave request** | A single request for time off over a date range, with calculated working days and an approval workflow. | Core record from creation through approval/rejection. |

**Embedded workflow data** on each leave request (not separate tables):

| Concept | Business meaning |
| ------- | ---------------- |
| **Submission** | Approval workflow state: status, submission date, line managers, decision maker, decision date. |
| **Created** | Who raised the request and when. |

**Relationships (confirmed):**

- Each leave request belongs to one **organisation**.
- Each leave request is created by one **user** (`created.by`).
- **Line managers** on the submission reference user(s) who should review the request.
- On approval, one **calendar event** links back via `systemEventId` and `eventReference: leave`.

There is **no separate leave type catalogue**, **balance ledger**, or **leave policy** entity in this module.

---

## 7. Attributes

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Reference | Human-readable ID (`AL-*` or `SIC-*`). | Auto-generated from type and sequence number. |
| Type | Kind of leave. | **Annual leave** or **Sick leave** in UI. Drives reference prefix. |
| Description | Reason or details for the absence. | Required. Rich text in UI. |
| Start date | First day of leave. | Required. |
| End date | Last day of leave (or estimated end for ongoing sick leave). | Required; label changes to *Estimated end date* when ongoing. |
| Start day fraction | Portion of the first day taken as leave (1, 0.75, 0.5, 0.25). | Used in working-day calculation on create. |
| End day fraction | Portion of the last day taken as leave. | Same options as start fraction. |
| Days (number of days) | Calculated **working days** in the period. | Excludes weekends and public holidays for user's country; adjusted for partial days on create. |
| Submission status | Where the request is in the approval workflow. | **Draft**, **Pending**, **Ongoing**, **Approved**, **Rejected**. |
| Submission date | When the request was sent to line managers. | Set on submit. |
| Line managers | Who should review the request. | Copied from requester profile at create. |
| Decision maker | Who approved or rejected. | Set on evaluation. |
| Decision date | When the decision was made. | Set on evaluation. |
| Created by / created on | Requester and raise date. | From session on create. |
| Organisation | Owning organisation. | Scoped to tenant org. |

**Related attribute outside Leaves module (not enforced here):**

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Leave days entitled to (membership) | Annual leave allowance for the employee. | Edited in **Membership** form; displayed on user profile. **Not validated** against requested days in Leaves. |

---

## 8. Current UI Layout

### Entry points

| Entry point | Location | Purpose |
| ----------- | -------- | ------- |
| **My Wallet → Leaves** | `/admin/leaves` under **My Wallet** nav | Own leave list and requests |
| **Staff Wallets → Leaves panel** | Staff wallet view with `walletId` | Manager views/manages a direct report's leaves |
| **Leave detail page** | `/admin/leaves/:id` | Full detail with edit/approve workflow |
| **Notification link** | `screenIdentifier: leave-request-detail` | Opens leave detail from notification |

### Leaves list (`LeavesTable`)

- **Title:** *Leaves*
- **Toolbar:** **Request** button (opens create drawer)
- **Columns:** Reference, Type, Number of days, Created on, Submitted on, Status (badge), Actions
- **Row click:** Opens right drawer with overview tabs
- **Actions menu:** Details (navigate to full page); **Delete** (draft only, owner/admin)
- **States:** Loading spinner while fetching; *“No data found”* when empty; search enabled

### Create leave (drawer)

- **Fields:** Type (Annual/Sick), Ongoing checkbox (sick only), Description (rich text), Start date + fraction, End date + fraction
- **Actions:** **Request leave** (save draft/ongoing); **Send to line Manager** (ongoing sick only, save + submit)
- **Validation errors** on required fields

### Leave detail drawer (from list)

- **Tabs:** Overview | Details (description) | Activity (timeline comments) | Public holidays
- **Toolbar:** Edit pencil (hidden when Approved/Rejected)

### Leave detail page (`LeaveDetail`)

- **Layout:** Left sidebar (overview metadata) | Right switchable view (read detail ↔ edit form)
- **Edit form:** Same as create with Update, Submit (draft), Approve/Reject (pending, for line managers)
- **Activity:** Timeline comments (editable until approved/rejected)

### Status presentation

| Status | UI presentation |
| ------ | ----------------- |
| Draft | Warning-coloured text in overview |
| Pending | Info-coloured text |
| Approved | Success-coloured text; badge in list |
| Rejected | Badge in list |
| Ongoing | Used for sick leave in progress; can transition to Pending on submit |

### Material states

| State | Behaviour |
| ----- | --------- |
| **Processing** | Buttons show *Processing* / *Please wait...* |
| **Success** | Toast notifications for create, update, submit, approve, reject, delete |
| **Error** | Generic *“Unknown server error occurred”* or fetch failure toasts; detail error *“This leave request has been deleted or removed”* |
| **Confirmation** | Submit, approve, reject, and delete require confirmation dialogs |

---

## 9. Miscellaneous / Module-Specific Information

### What a leave request represents

A **leave request** is an **internal absence request with managerial approval** — not a calendar booking alone, not a payroll instruction, and not an attendance record. Its durable outcomes are: (1) a decision status visible to staff and managers, (2) optional calendar visibility on approval, and (3) notifications to involved parties.

### Leave lifecycle (confirmed)

```
Created (Draft or Ongoing)
  → [Submit] → Pending
  → [Approve] → Approved (+ calendar event)
  → [Reject] → Rejected
  → [Delete] → Removed (Draft only)
```

**Ongoing** sick leave can be created directly (skipping Draft) and then submitted to Pending. There is **no** explicit *Cancelled* or *Withdrawn* status after submission.

### Working-day calculation (business behaviour)

The system calculates **working days** by:

1. Counting calendar days from start to end (inclusive).
2. Subtracting weekend days (Saturday/Sunday).
3. Subtracting public holidays for the requester's **country code** (from user profile, default GB).
4. On **create**, subtracting partial-day adjustments from start and end fractions.

Public holidays are determined using an external holiday library — the same source powers the **Public holidays** reference tab and the `/holidays` API.

### User access and permissions

| Action | Access rule (confirmed) |
| ------ | ------------------------ |
| List / view leave | **Wallet access:** user owns the data (`created.by` = self) **or** user is in `managedUsers` for that owner |
| Create / update / submit / delete / evaluate | Authenticated org member; **no dedicated RBAC middleware** on leave routes (unlike some wallet sub-routes). List/get enforce wallet access; **update/delete/submit/evaluate do not re-check wallet access on backend**. **[Requires verification]** of intended security boundary. |
| Approve / reject (UI) | User's `managedUsers` includes requester's ID (`isManagementByMe`) |
| Delete (UI) | Draft only; owner or admin with entity access |
| Navigation gate | Frontend routes use **Incident Management → Read** access policy (likely placeholder) |

### Calendar integration (on approval)

When a line manager **approves** a request:

- A **calendar event** is created with the leave title, description, start/end dates, and purple colour.
- Event visibility groups come from the **requester's access policies**.
- If calendar creation fails, the API may still return success with a message that the calendar event could not be created but leave was approved. **[Requires verification]** of user-visible handling.

### Notification integration

| Event | Recipients | Message (summary) |
| ----- | ---------- | ------------------- |
| Submission | Line managers | *"{name} has submitted leave request {reference}. Please review."* |
| Approved / Rejected | Requester | *"Your leave request {reference} has been {status} by {decisionMaker}"* |

Notifications link to the leave detail screen. Email is **not** sent for these events.

### Leave entitlement (not enforced)

**Annual leave entitlement** (`leaveDaysEntitledTo`) is stored on the employee's **membership** record, editable in the membership form and visible on the user profile as *"Leaves entitled to"*. The Leaves module **does not** compare requested `days` against this entitlement or block over-use. **[Observed but business purpose unclear]** whether entitlement is intended for future enforcement or display only.

### Frontend / backend discrepancies

| Area | Backend | Frontend |
| ---- | ------- | -------- |
| Line manager source | Reads `lineManagers` from **user** document at create | Line managers configured on **membership** in Users UI |
| Day fraction on update | Recalculates days without fraction adjustment | Sends fractions on update |
| Access control | Wallet check on list/get only | Wallet + `managedUsers` + entity access for UI actions |
| Route access policy | N/A | **Incident Management Read** (placeholder) |
| Delete permission check | No status check on backend | UI restricts to Draft |

### Unclear or partially implemented behaviour

- Whether leave create succeeds when line managers exist only on **membership**, not on the **user** document.
- Whether **Draft** hiding in own-wallet list is intentional product behaviour.
- Whether **Ongoing** status has user-visible meaning beyond sick-leave submission path.
- Full security model for update/evaluate/delete without wallet-access re-validation on backend.
