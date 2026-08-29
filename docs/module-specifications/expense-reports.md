# Expense Reports

## 1. Module Overview

The **Expense Reports** module lets staff **claim work-related costs** (travel, accommodation, and other expenses) as a **single report** that is submitted to their **line manager** for approval. It sits under **iHR → My Wallet** as **Expense Report**, and managers can also open a staff member’s reports from **Staff Wallets**.

An expense report is **a collection of line items**, not a single receipt. The user first creates a report (title, description, currency) as a **Draft**, then adds commute, accommodation, and other expense entries (each with its own cost and optional evidence files). When ready, they **Submit** the report. Line managers **Approve** or **Reject** it. The module does **not** pay the claim, raise an invoice, or run payroll.

The module solves the problem of gathering travel and expense claims in one place, attaching proof, and getting a managerial decision — without treating those costs as CRM invoices or as generic attachments on other records.

Primary users are **organisation staff who have line managers assigned on their user profile** (claimants) and **users listed as line managers** (reviewers). Navigation currently uses **Incident Management Read** for My Wallet / Expense Report, and **Users Create** for Staff Wallets — see access notes.

---

## 2. Features and Capabilities

### Create an expense claim (draft report)

- **Capability:** Start a new expense report with title, description, and currency.
- **Who uses it:** Staff using **Claim** on the Expense Report list (My Wallet or a managed staff wallet).
- **Outcome:** A report is created in **Draft** with reference `EXPR-{number}`. The creator’s **line managers** (from their user profile) are copied onto the report. Success: *“Expense report created successfully.”*
- **Conditions:** Backend **requires the creator to have at least one line manager**. If none are assigned, create fails (the UI shows a generic server error). Title is required; description is required in the UI (optional on the backend). Line items cannot be added until the report exists.

### Add and maintain travel (commute) entries

- **Capability:** Add, update, or remove travel lines: one way or round trip; car, air, or public transport; from/to; distance; cost; notes; attachments.
- **Who uses it:** The person preparing the report (typically the creator, via edit form).
- **Outcome:** Travel appears on the report under **Commute**. For car/public transport, a map route picker can **suggest cost** from organisation **mileage rate** and distance (round trip doubles the cost). Air uses location pickers. Distance is stored internally in kilometres; the detail view shows miles.
- **Conditions:** Cost can also be entered manually. On first save, distance from the picker is divided by 1,000 before send; updates send distance as stored — **values may be inconsistent between add and update**. **[Requires verification]** in use.

### Add and maintain accommodation entries

- **Capability:** Add, update, or remove stays: type, location, check-in, check-out, cost, notes, attachments.
- **Who uses it:** Report preparer.
- **Outcome:** Stays appear under **Accommodation**. Dates are entered in the UI and stored as date/time.

### Add and maintain other expense entries

- **Capability:** Add, update, or remove custom expenses: free-text type, description, cost, attachments.
- **Who uses it:** Report preparer.
- **Outcome:** Items appear under **Other expenses**. Type is a free-text category (not a fixed list).

### Attach, view, download, and remove evidence

- **Capability:** Attach files to travel, accommodation, or other expense lines (receipts/proof). View them on the detail screen. Remove a file from a line and delete it from storage.
- **Who uses it:** Report preparer (upload/remove); anyone who can open the report (view/download via shared attachment UI).
- **Outcome:** Evidence is stored as **file metadata on the line item** (not Attachment module records). Upload uses **File Handler**. Removal calls the expense-report API then **File Handler delete**. Modified-by is recorded on the file metadata.
- **Conditions:** Attachments are added when creating/updating a line. There is no report-level attachment list separate from lines.

### View reports in a list and in detail

- **Capability:** Searchable list of reports for a wallet (self or managed staff). Open a drawer or full detail page.
- **Who uses it:** Staff (own wallet); line managers via Staff Wallets or by opening a report they manage.
- **Outcome:** List shows reference, title, created on, submitted on (blank for Draft), status badge. Detail shows description, line tables, evidence, linked tasks, comments, overview (reference, currency, raised by, line managers, submitted on, status, decision date).
- **Conditions:** List is requested for `created.by` = wallet user. Backend allows list/get only if the caller **is that user or is in `managedUsers`**. The frontend list **always adds a filter excluding Draft** because wallet-access helper currently always returns true — **Drafts may not appear in the table**. **[Requires verification]** of intended list behaviour.

### Update report header while not closed

- **Capability:** Change title, description, and currency after create.
- **Who uses it:** Users who can open the edit form (toolbar pencil) while status is not treated as Approved or Rejected.
- **Outcome:** Header fields update. Line items are edited separately in the same form.
- **Conditions:** Backend update has **no wallet ownership check**. UI hides edit when overview status is Approved/Rejected — but status helper is unreliable (see discrepancies), so edit may remain available.

### Submit a draft to line managers

- **Capability:** Send a **Draft** report for review.
- **Who uses it:** The **creator** (entity access: only the creator’s user id). Confirmation: *“This expense report will be sent to your line manager.”*
- **Outcome:** Status becomes **Pending**; submission date is set. Line managers receive an in-app notification to review. Success: title submitted as an expense.
- **Conditions:** Submit button only shows for Draft + creator. Backend submit does **not** re-check ownership or that the report is still Draft.

### Approve or reject a pending report

- **Capability:** Line manager (someone who **manages the creator**) Approve or Reject a **Pending** report.
- **Who uses it:** Users for whom `isManagementByMe` is true (creator id is in the session **managed users** list). Not the creator (backend refuses evaluation when the decision maker is the creator).
- **Outcome:** Status becomes **Approved** or **Rejected**; decision maker and decision date are stored. Creator is notified of the outcome. Confirmations name reference, title, and claimant.
- **Conditions:** UI buttons only for Pending + manager. Backend evaluation **does not require current status to be Pending** — it only requires the evaluator is not the creator. Error *“No pending expense report with that id found.”* is returned as HTTP 200 when the update matches no row (including when someone tries to evaluate their own report).

### Delete a draft report

- **Capability:** Permanently delete a report from the list.
- **Who uses it:** Creator or Super Admin / Head of Service, and only while status is **Draft**, with Incident Management Read (row action).
- **Outcome:** Report removed from the list. Confirmation: *“This expense report will be deleted.”*
- **Conditions:** Backend delete has **no ownership or status check**.

### Link tasks and comment

- **Capability:** Create tasks against the report; comment on an activity timeline.
- **Who uses it:** Users viewing the report. Comments become read-only when status is Approved or Rejected (when status detection works).
- **Outcome:** Follow-up work sits with the claim. Timeline is Activity for module type expense reports.

### Manager view of staff claims (Staff Wallets)

- **Capability:** Users with **Users Create** open Staff Wallets, see people who have them as **line manager**, and open that person’s expense/leave/work-log wallet.
- **Who uses it:** Line managers / HR-style users with that permission.
- **Outcome:** Manager reviews **non-draft** reports for that staff member (given the draft filter). Approve/Reject from the same forms.

---

## 3. User Outcomes / End Results

- **Create:** A draft expense report, then travel, accommodation, and other cost lines with optional receipts.
- **View:** Own claims and (if a manager) staff claims; line-level costs, commute distance in miles, evidence, status, line managers, decision date.
- **Manage:** Edit lines and header before close; submit to line manager; delete drafts from the list.
- **Change:** Pending → Approved or Rejected by a manager who is not the claimant.
- **Information received:** Reference `EXPR-…`, notifications on submit (to line managers) and on review (to claimant), success/error toasts.
- **Business actions enabled:** Staff expense claims with evidence and managerial sign-off — **not** payment, reimbursement posting, or invoicing.

There is **no confirmed report-level total**. Users see **each line’s cost**; they must add them mentally or elsewhere.

---

## 4. Scope Boundaries

### In scope

- Expense report records and embedded travel, accommodation, and other expense lines.
- Draft → submit → approve/reject lifecycle.
- Line-level costs, currency, evidence files.
- Line-manager assignment at create; manager notifications.
- Staff wallet vs my-wallet entry points.
- Tasks and comments linked to a report.

### Out of scope (handled elsewhere)

- **Invoices / CRM billing** — no confirmed connection.
- **Payments or reimbursement payout** — not implemented in this module.
- **Payroll** — not part of expense reports.
- **Leaves and Work logs** — sibling My Wallet features, not expense reports.
- **Staff Alerts** — separate wallet routes.
- **Attachment module** — evidence is file metadata on lines + File Handler, not Attachment registry records.
- **Organisation mileage rate** — configured on Organisation; used only to **suggest** travel cost in the UI.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **Users** | Creator, line managers (copied from user profile), decision maker, managed-users list for manager access. Staff Wallets lists users who have the current user as line manager. |
| **Organisation** | Optional mileage rate used to suggest car/public-transport travel cost. Reports are organisation-scoped on the data model. |
| **File Handler** | Upload evidence, preview/download via shared attachment UI, delete stored file when evidence is removed. |
| **Notifications** | In-app notice to line managers on submit; to claimant on approve/reject (email off). |
| **Activity** | Comments/timeline on the report. |
| **Task Management** | Tasks can be created against an expense report; deleting a report can affect linked tasks (source-delete plugin). |
| **iHR / My Wallet / Staff Wallets** | Product placement: expense reports are a wallet feature alongside leaves and work logs. |

**Invoice / Payment:** **No confirmed relationship.** Expense reports do not create invoices or payment records.

---

## 6. Current Data Model

A **dedicated Expense Reports data model exists** (`expensereports`). Line items are **embedded** on the report, not separate collections.

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| **Expense report** | One claim (title, description, currency, creator, submission) | Primary persistent record. Reference `EXPR-{number}`. |
| **Other expense line** | A miscellaneous cost (type, description, cost, attachments) | Embedded array `expenses`. |
| **Travel line** | A commute (type, transport, from/to, distance, cost, notes, attachments) | Embedded array `travels`. |
| **Accommodation line** | A stay (type, location, check-in/out, cost, notes, attachments) | Embedded array `accommodations`. |
| **Submission** | Draft/Pending/Approved/Rejected (and unused Ongoing), dates, line managers, decision maker | Embedded workflow on the report. |
| **Line attachments** | Evidence file metadata on a line | Embedded; storage via File Handler. |

There is **no stored report total**. Costs default to 0 if omitted.

---

## 7. Attributes

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| **Reference** | Claim identifier (`EXPR-…`) | Assigned on create. Searchable in lists. |
| **Title** | Short name of the claim | Required. |
| **Description** | Narrative of the claim | Required in UI. |
| **Currency** | Currency for amounts | User-selected; default stored as £ if unset. Displayed as stored string (may be symbol or “Name (symbol)”). |
| **Created by / on** | Who raised the claim and when | Creator cannot evaluate their own report. |
| **Submission status** | Draft, Pending, Approved, Rejected (Ongoing in model unused) | Drives submit/approve/delete UI. |
| **Submission date** | When sent to line manager | Set on submit. |
| **Decision date / decision maker** | When and who approved or rejected | Set on evaluate. |
| **Line managers** | Who should review | Copied from claimant’s user record at **create**; not refreshed later. |
| **Expense type / description / cost** | Category, what was spent, amount | Type is free text. Cost user-entered. |
| **Travel type** | One way or Round trip | Round trip doubles mileage-based suggested cost. |
| **Transport** | Car, Air, Public transport | Affects route vs location UI. |
| **From / to / distance** | Journey | Distance stored as km; UI shows miles (× 0.62). |
| **Travel cost** | Amount for that journey | User-entered or suggested from mileage rate × distance. |
| **Accommodation type / location / check-in / check-out / cost / notes** | Stay details | Dates user-provided. |
| **Attachments** | Receipts/proof on a line | File Handler metadata. |
| **Organisation** | Tenant | Set on create from access context. |

---

## 8. Current UI Layout

### Main screens / pages

- **My Wallet → Expense Report:** `/admin/expense-report` under iHR. Table + **Claim** button.
- **Report detail:** `/admin/expense-report/:id` (also opened from row **Details**). Drawer on row click (`expense-report-detail`).
- **Staff Wallets:** `/admin/wallets` — cards of managed staff; modal titled “Expense reports” embeds the wallet (Expenses / Leaves / Work log).
- Create/edit drawers: `create-expense-report`, `edit-expense-report-form`.

### Important sections and views

**List:** Title “Expense reports”, search, pagination, status badges, loading overlay. Columns: Reference, Title, Created on, Submitted on, Status, Actions (Details; Delete if Draft and owner/admin).

**Drawer / detail:** Overview sidebar (reference, currency, raised by, line managers, submitted on, status colours, decision date); description; tables for Expenses, Commute, Accommodations; “Attachments and evidences” per line; tasks; comments.

**Create form:** Title, currency, description, **Claim**. Line sections appear only after the report exists (edit form).

**Edit form:** Same header plus Commute / Accommodation / Other expenses add forms and existing line cards; Update; Submit (Draft + creator); Approve/Reject (Pending + manager).

### Primary actions

Claim; open/edit; add/update/delete lines; attach/remove evidence; Submit; Approve; Reject; Delete draft; Create a task.

### Forms

Header: title, currency, rich-text description. Travel: type, transport, route or from/to, cost, attachments. Accommodation: type, location, check-in/out, cost, notes, attachments. Other expense: type, description, cost, attachments.

### Lists / tables / cards / detail views

Report table; line tables on detail; staff cards in Staff Wallets; line cards on the edit form.

### Navigation and workflow

iHR → My Wallet → Expense Report → Claim → (open report) add lines → Submit → manager notified → manager opens via Staff Wallets or notification → Approve/Reject. Row click opens drawer; Details navigates to full page.

### Material empty, loading, or restricted states

- Loading while fetching list or detail.
- Detail error: *“This expense report has been deleted or removed.”*
- Empty line sections omitted on detail if no rows.
- Table fallback *“No data found”*.
- Buttons show Processing / Saving… while busy.
- Confirmations on submit, approve, reject, delete.
- Edit/switch-to-form hidden when status is Approved or Rejected **if** status helper returns those values (see discrepancies).
- Create fails without line managers (generic error toast).

---

## 9. Miscellaneous / Module-Specific Information

### Confirmed lifecycle

| Status | Meaning | How it is reached | Who |
| ------ | ------- | ----------------- | --- |
| **Draft** | Being prepared; not sent | Default on create | Creator |
| **Pending** | Awaiting line manager | **Submit** | Creator (UI); backend does not enforce Draft |
| **Approved** | Manager accepted the claim | **Approve** | Manager of the creator, not the creator |
| **Rejected** | Manager declined the claim | **Reject** | Same as approve |
| **Ongoing** | Present on the data model | **No confirmed transition** | — |

There is **no payment or reimbursement status**. Approval does not generate an invoice.

### Calculated vs user-provided money

- **User-provided:** report currency; each line’s **cost** (expenses, accommodation; travel if typed).
- **Suggested (UI only):** travel cost from organisation mileage amount × distance (km or miles depending on unit), doubled for round trip. Stored as a normal cost afterwards.
- **Display conversion:** commute distance shown as miles (`km × 0.62`).
- **Not calculated:** report grand total.

### Access (business-visible)

- **Authenticated** organisation session (wallet APIs sit behind org auth).
- **List/get:** caller must be the report creator **or** appear in session **managed users** (backend). Frontend wallet-access helper **always returns true** (real check commented out), so UI filtering of “manager vs self” is **not** enforced in that helper.
- **Nav:** Expense Report / My Wallet use **Incident Management Read** (likely copied from another module). Staff Wallets use **Users Create**.
- **Delete in UI:** Draft + (admin roles or creator).
- **Submit in UI:** Draft + creator.
- **Approve/Reject in UI:** Pending + creator is in managed users.
- **Create:** Claim button is not extra-permission gated beyond reaching the page.
- Expense-report API routes use **empty RBAC arrays** (no Document-style service checks on each verb).

### Relationship with File Handler and Attachment

Evidence uses **File Handler** (upload/download/delete). Metadata is **embedded on the line** using the shared attachment shape. The **Attachment module API is not used**.

### Frontend/backend discrepancies

| Area | Finding |
| ---- | ------- |
| Drafts in the list | Query always excludes Draft because `authWalletAccess` always returns true. |
| Status helper | `getSubmissionStatus` reads status from a **function**, not the current report — overview status, edit lock, and comment lock may be wrong. |
| Evaluate “pending” | Backend does not filter by Pending; message claims it does. |
| Ownership on mutate | Update, delete, submit, line changes have **no** wallet access check. |
| Create error | Missing line manager returns 500 generic message. |
| Permission names | Wallet UI gated as **Incident Management**. |
| Currency select | Options store “Name (symbol)” while default create uses symbol only. |
| Expense attachment URL | Path param named accommodation id on backend; frontend sends expense/travel id — path still matches; removal is by attachment id across all lines of that type. |
| Travel distance | Divided by 1,000 on create only. |
| Line item UI currency | Some cards show **£** regardless of report currency. |
| Notification icons | Approve/reject image switch falls through so rejected icon may always win. **Observed but business purpose unclear** if intentional. |

### Unclear or partially implemented

- Whether **Ongoing** was meant as an in-review state. **Not used.**
- Whether managers should see Drafts. **Implementation currently hides them in the list.**
- Whether submit should be blocked until at least one line exists. **Not enforced.**
- Whether organisation id on create (`organisationId` vs user organisation) is always set. **[Requires verification]**
- Staff Wallets modal still titled “Expense reports” while showing leaves and work logs too.

None further.
