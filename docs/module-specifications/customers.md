# Customer Management

## 1. Module Overview

Customer Management is the organisation’s CRM register for recording, tracking, and progressing customer relationships—from early prospects through to live contractual customers.

Its primary business purpose is to give users a structured way to maintain customer master data (organisation details, contacts, address, contract information, account manager assignment), move customers through a sales pipeline (Organisation profile / stage), attach supporting documents, record interactions, and—once live—view linked invoices, incidents, tasks, and per-customer analytics.

It solves the problem of fragmented customer information by centralising customer records, pipeline status, account ownership, and related operational follow-up in one place, with a personalised “MY CRM” dashboard for account managers.

Primary users are people with CRM licence and access—typically Super Admins, Heads of Service, Basic Users, and Auditors (read-focused)—subject to CRM permission checks and role-based business-unit list scoping. Exact role-to-permission mapping for every action: **Unclear — requires confirmation** (see Miscellaneous).

---

## 2. Features and Capabilities

### Register (create) a customer

- **Capability:** Create a customer with business unit, organisation name, registration number, logo, organisation profile (stage), address, contacts, source, contract value, probability (non-live stages), account manager, category, attachments, and notes. For Live stage, contract start/end dates and review date are required; account number is optional.
- **Who uses it:** Users with CRM create permission (Add button on list).
- **Outcome:** A new customer is stored with reference `CUS-{number}`. User is redirected to the detail drawer after create. Attachments and logo are stored on the record.
- **Conditions:** Backend requires customer name and primary email in schema. Frontend validates extensively by stage (address fields for pipeline stages; contract dates for Live; reason for loss when status is Lost). Creating or updating to Live stage shows a confirmation (“going live”). Account manager must be selected from users in the chosen business unit.

### View, search, filter, and open customers

- **Capability:** Browse a paginated list of customers; search by reference, name, email, or service provision; filter by preset stage/status, business unit, account manager, and category; open a customer in a detail drawer or full detail page.
- **Who uses it:** Users with CRM read access and applicable licence.
- **Outcome:** Users see reference, business unit, organisation name, organisation profile (stage badge), account manager, last updated, and updated by. Row click opens drawer; row menu links to full detail page.
- **Conditions:** List is organisation-scoped and further limited by role-based business-unit filter (Super Admin / Auditors see all; Head of Service / Basic User see own group plus unassigned; External User sees own group only). Preset filters include All customers, My customers (current user as account manager), Live, Prospects, Warm leads, Qualified, and Proposals.

### Update a customer

- **Capability:** Change customer details, move between pipeline stages (including “Go live”), update status (non-live), change account manager, append attachments, and update logo.
- **Who uses it:** Users who can open the edit form (drawer pencil or full-page switchable edit view). UI edit tab on full page checks CRM UPDATE permission; create drawer and toolbar edit are less strictly gated.
- **Outcome:** Customer reflects new information. New attachments are appended. Stage, status, or account manager changes trigger in-app notifications (and email for new account manager assignment).
- **Conditions:** Backend update uses CRM CREATE permission, not UPDATE. Moving to Live requires confirmation in UI. Lost status requires reason for loss in UI.

### Delete a customer

- **Capability:** Remove a customer from the register.
- **Who uses it:** Users with CRM delete permission; UI further limits delete to organisation admins or the record creator, and only when stage is not Live.
- **Outcome:** Customer is permanently deleted. Linked tasks sourced from that customer are also removed (backend cascade).
- **Conditions:** Backend delete has no stage or creator check. Linked invoices and incidents are **not** cascade-deleted — **requires confirmation** whether they remain orphaned.

### Manage attachments

- **Capability:** Add attachments on create/update via dropzone; view attachments on detail/drawer; remove individual attachments.
- **Who uses it:** Users on customer form (add); users with CRM delete permission (remove via delete button on attachment).
- **Outcome:** Files stored on the customer record. Remove deletes from record via dedicated endpoint; UI also deletes from file storage.
- **Conditions:** Attachments added on create as part of payload; on update appended via push. No separate add-attachment route.

### View per-customer overview (Live customers)

- **Capability:** See invoice status, finance overview (amounts by invoice status), and incidents overview (open vs resolved) for a Live customer.
- **Who uses it:** Users viewing customer detail drawer or full detail page when customer stage is Live.
- **Outcome:** Pie charts and counts for invoice statuses, invoice amounts, and incident resolution. Empty states when no data.
- **Conditions:** Overview fetched when customer is opened. Backend aggregates invoices linked to customer and incidents with source module type `customers`.

### View account manager overview (“MY CRM”)

- **Capability:** Personalised dashboard for the logged-in user as account manager: contract lifecycle counts this month, live customer value metrics, customer counts by stage, invoice analytics this month, email campaign stats, and customer interaction analytics.
- **Who uses it:** Users with CRM read access on `/admin/customers/overview` (sidebar **MY CRM**).
- **Outcome:** Cards and charts summarising the current user’s managed portfolio, campaigns, and interactions. Empty message when no analytics data.
- **Conditions:** API uses current session user ID as manager ID. Overview data also loaded in background on the main Customers list page but only displayed on MY CRM screen.

### Record customer interactions

- **Capability:** Add timeline comments labelled as interactions on customer detail/drawer.
- **Who uses it:** Users viewing customer detail.
- **Outcome:** Activity history on the customer record. Interactions feed into account manager interaction analytics (weekly/monthly).
- **Conditions:** Uses shared Timeline component with module type `customers`.

### Link tasks to a customer

- **Capability:** Create and view tasks linked to the customer record.
- **Who uses it:** Users with Task Manager access from customer detail, drawer actions, or link-task button.
- **Outcome:** Embedded task list scoped to the customer; tasks can be created from drawer form.
- **Conditions:** Task Management module; source link `customers` + customer ID.

### Manage customer incidents (Live customers)

- **Capability:** View and manage incidents linked to the customer.
- **Who uses it:** Users with CRM read and Incident Management read when customer stage is Live.
- **Outcome:** Full incident workflow scoped to the customer on detail page tab and drawer tab.
- **Conditions:** Tab/panel only appears for Live customers with both permissions.

### Manage customer invoices (Live customers)

- **Capability:** View and manage invoices for the customer.
- **Who uses it:** Users with CRM read when customer stage is Live.
- **Outcome:** Invoice list and workflow embedded on customer detail page and drawer.
- **Conditions:** Invoices are a separate CRM submodule but accessed in context of Live customers.

### Manage customer categories

- **Capability:** Maintain tags/categories applicable to customers from a tab on the Customers list page.
- **Who uses it:** Users with access to Tags and Categories manager for module `customers`.
- **Outcome:** Categories available for assignment on customer form.
- **Conditions:** Shared Tags and Categories module; not customer CRUD itself.

---

## 3. User Outcomes / End Results

- **Create:** Customer records with pipeline stage, contacts, contract details, account manager, logo, attachments, and category.
- **View:** Organisation-wide or filtered customer list, detail drawer, full detail page, per-customer analytics (Live), and personal MY CRM dashboard.
- **Manage:** Pipeline progression (prospect to live), status changes (open/closed/lost/abandoned), account manager assignment, attachments, interactions, linked tasks, incidents, and invoices.
- **Change:** Customer details until deleted; stage transitions including go-live confirmation; lost-customer reason capture.
- **Information received:** Notifications on stage change, status change, and new account manager assignment; interaction and invoice/incident analytics on detail and MY CRM views.
- **Business actions enabled:** Track sales pipeline; assign and monitor account managers; manage live customer contracts; coordinate follow-up via tasks, incidents, and invoices from one customer record.

---

## 4. Scope Boundaries

### In scope

- Customer register at `/admin/customers` and MY CRM at `/admin/customers/overview`.
- Customer CRUD, attachments, pipeline stage/status model, account manager assignment.
- Per-customer overview (invoices + incidents for Live customers).
- Account manager overview (personalised analytics dashboard).
- Embedded tasks, incidents (Live), invoices (Live), timeline interactions.
- Customer categories tab (via Tags and Categories).
- Role-based list scoping by business unit.
- Cascade delete of linked tasks when customer deleted.

### Out of scope (handled elsewhere)

- **Invoices submodule** — separate CRM routes/UI; accessed from Live customer context.
- **Email Campaign submodule** — separate CRM routes/UI; campaign metrics appear in MY CRM analytics only.
- **CRM organisation initiation** — separate `initiateCrm` endpoint for licence/toolkit setup.
- **Task Management CRUD** — embedded UI; task lifecycle owned by Task module.
- **Incident Management CRUD** — embedded UI; incident lifecycle owned by Incident module.
- **Tags and Categories administration** — shared module; customer tab is an entry point.
- **Organisation signup email** (`new-customer-signup`) — organisation onboarding, not CRM customer creation.
- **Calendar review events** — suppliers create calendar events on review date; **no equivalent identified for customers**.
- **`isChampion` flag** — present on model; **not exposed in UI or business logic**.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| Task Management | Embedded task list and create; tasks link via source; deleted when customer deleted. |
| Incident Management | Embedded incidents tab for Live customers; incidents link via source module type `customers`. |
| Invoices (CRM) | Embedded invoice tab for Live customers; invoice analytics feed per-customer overview and MY CRM. |
| Email Campaign (CRM) | Campaign counts and trends in MY CRM analytics for campaigns created by the account manager. |
| Tags and Categories | Customer categories tab; category assigned on customer form. |
| Timeline / Activity | Customer interactions recorded and counted in interaction analytics. |
| Notifications | Stage change, status change, and account manager assignment events. |
| Users | Account manager (ownership controller), creator, updater. |
| Our IMS (Business units) | Customers belong to a business unit; list scoping by group; account manager filtered by unit membership. |

---

## 6. Current Data Model

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| Customer | An organisation being tracked from prospect to live contract | Primary record |
| Organisation profile (stage) | Pipeline position: Prospect, Warm lead, Qualified, Proposal, Live | Sales progression |
| Status | Open, Closed, Lost, Abandoned (primarily non-live pipeline) | Outcome of pipeline engagement |
| Account manager | Internal user responsible for the customer | Assignment and MY CRM scoping |
| Business unit (group) | Which part of the organisation owns the customer | Scoping and account manager selection |
| Category (tagsAndCategories) | Optional classification tag | Filtering and grouping |
| Attachment | Supporting file on the customer | Evidence or reference material |
| Logo | Customer organisation logo image | Visual identification |
| Contract details | Value, start/end dates, review date, account number | Live customer commercial terms |
| Probability | Likelihood of conversion (10–90%) | Pipeline forecasting for non-live stages |
| Source | How the customer was acquired | Marketing/sales attribution |
| Reason for loss | Explanation when status is Lost | Post-mortem on failed deals |
| Customer overview data | Aggregated invoice and incident metrics | Live customer insight |
| Account manager overview data | Aggregated portfolio metrics for one manager | Personal CRM dashboard |

---

## 7. Attributes

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Reference | User-facing identifier | `CUS-{number}` |
| Organisation name (name) | Customer organisation name | Required |
| Registration number (companyNumber) | Company registration | Optional |
| Logo | Organisation logo image | Default placeholder if none |
| Business unit (group) | Owning business function | Required in UI |
| Organisation profile (stage) | Prospect / Warm lead / Qualified / Proposal / Live | Default Prospect; alias “Organisational profile” |
| Status | Open / Closed / Lost / Abandoned | Hidden in form when Live |
| Probability | Conversion likelihood | 10–90% in 10% steps; non-live only |
| Address (building, street, town, post code) | Customer location | Required in UI for pipeline stages |
| Primary contact / email | Main contact person and email | Required |
| Secondary contact / email | Alternate contact | Secondary email required if secondary contact provided (edit form) |
| Phone number | Contact phone | Required in UI |
| Source | Acquisition channel | Required in UI for pipeline stages |
| Service provision | Description of services | Rich text |
| Contract value | Commercial value (£) | Required in UI |
| Account manager | Assigned internal owner | Required; filtered by business unit |
| Account number | Customer account identifier | Live stage only |
| Contract start / end date | Contract period | Required when Live |
| Review date | Contract review date | Required when Live; shown in overview sidebar |
| Category (tagsAndCategories) | Optional tag | Searchable on form |
| Attachments | Supporting files | Add on create/update |
| Notes | Internal notes | Rich text |
| Reason for loss | Why deal was lost | Required when status is Lost |
| Created / updated (by, on) | Audit trail | Creator can delete in UI (non-live) |
| isChampion | Flag on model | **Not used in UI** — observed but business purpose unclear |

---

## 8. Current UI Layout

### Main screens / pages

- **Customers list** — `/admin/customers`, sidebar CRM → **Customers**.
- **MY CRM overview** — `/admin/customers/overview`, sidebar CRM → **MY CRM**.
- **Customer detail page** — `/admin/customers/:id` (hidden from sidebar).

### Important sections and views

**List page tabs:** All Customers (table) | Customers Categories (tags manager).

**List table columns:** Reference, Business Unit, Organisation, Organisation Profile (badge), Account Manager, Last Updated, Updated By, Actions.

**List toolbar:** Search, Filter modal, Add button.

**Filter modal:** Status presets (multi-select), Business unit (multi), Account Managers (multi), Category (multi); Apply / Clear.

**Detail drawer tabs:** Overview | Details | (Incidents — Live + permissions) | (Invoices — Live).

**Full detail page panels:** Details (default) | Manage incidents (Live) | Invoice (Live).

**Detail sidebar:** CRMActions (link task), CustomerOverview metadata, CustomerStatus (account manager, contract info).

**Details content:** Lost banner + reason; Live analytics charts (invoice status, finance, incidents); organisation profile; address/contacts; category; attachments; notes; embedded tasks; timeline interactions.

**MY CRM page:** Stat cards (contracts started/ending/review this month, highest contract value); Live customers section (total/average/highest/lowest contract value); contract values chart; customer count table by stage; invoice charts this month; interaction analytics (weekly/monthly toggle); email campaign section (active/closed/latest, 6-month trend).

### Primary actions

- Add customer (drawer form).
- Row click → detail drawer; row menu → full detail page.
- Edit (drawer pencil or full-page switch view).
- Delete (row menu, non-live, creator/admin).
- Create task (drawer dropdown / detail sidebar).
- Remove attachment (delete permission).
- Add interaction (timeline on detail).

### Forms

**Customer create/edit:** Business unit, Organisation name, Registration number, Logo upload, Organisation profile, Address fields, Contacts, Phone, Category, Source, Contract value, Probability (non-live), Service provision, Account manager, Status (non-live), Account number + contract dates (Live), Reason for loss (Lost), Attachments dropzone, Notes. Submit labelled Create / Go live / Update / Go live.

### Navigation and workflow

```
Sidebar CRM → Customers → list (search/filter)
  → Add → create drawer → detail drawer
  → Row click → drawer OR Details → full page
  → Edit / Go live (stage → Live with confirmation)
  → Live: analytics, invoices tab, incidents tab, tasks, interactions
  → Delete (non-live, creator/admin)

Sidebar CRM → MY CRM → account manager dashboard (session user)
```

### Material empty, loading, or restricted states

- Loading on list, detail, overview fetch, MY CRM.
- Empty table: “No data found”.
- Full detail error: “This customer has been deleted or removed”.
- MY CRM empty: “You have no analytics at this moment”.
- Analytics empty states per chart (“No invoice/finance/incidents analytics available”).
- Lost customer banner on detail.
- Incidents/Invoices tabs hidden unless Live (and incident tab needs Incident Management read).
- Delete hidden for Live customers and non-creators/non-admins.
- Create gated by CREATE permission; attachment delete by DELETE permission.

---

## 9. Miscellaneous / Module-Specific Information

### Terminology

- **Organisation profile** — UI label for pipeline **stage** (Prospect through Live).
- **Go live** — Moving stage to Live; triggers confirmation and exposes contract fields, invoice/incident tabs, and per-customer analytics.
- **MY CRM** — Personal account manager dashboard, not an aggregate of all organisation customers.
- **Account manager** — A user (not a separate role entity) assigned as customer owner; drives “My customers” filter and MY CRM analytics scope.

### Important business rules (observed)

- Reference auto-generated as `CUS-{ID}` on save.
- List uses organisation scope + `basicRoleScopedFilter` by role/business unit.
- Stage/status/account manager changes emit notifications to account manager, creator, and Heads of Service (stage/status); new account manager also receives email.
- Customer delete cascades to linked tasks only.
- Attachments on update are appended, not replaced.
- Backend customer validation schema is empty (no server-side Joi rules beyond model required fields).
- Update route enforces CRM **CREATE** permission, not UPDATE or DELETE.

### Customer overview (`getCustomerOverview`)

Per-customer endpoint returns: total invoice count, incidents grouped by resolved/open, invoice amounts and counts grouped by invoice status. Frontend displays three pie-chart sections for Live customers. Total invoice count is returned but **not shown as a separate metric in UI** — **requires confirmation** if intentional.

### Account manager overview (`getAccountManagerOverview`)

Returns for a given manager ID: customers grouped by stage (count + contract value sum); invoices this month by status (count + amount); contracts started/ending/review this month; highest-value customer overall; highest/lowest live customer by contract value; active/closed campaign counts; campaigns per month (last 6 months); latest campaign name; weekly and monthly interaction analytics (total interactions, customers engaged, top 5 customers by interaction count). Frontend maps this to MY CRM charts and cards. API is called with **current session user ID** — managers cannot view another manager’s overview through the UI.

### Frontend vs backend discrepancies (requires confirmation)

| Topic | Frontend | Backend | Conclusion |
| ----- | -------- | ------- | ---------- |
| Update permission | Detail amend tab checks UPDATE | Route uses CREATE | Mismatch; users with CREATE but not UPDATE may edit via backend |
| Delete scope | Non-live + creator/admin | No stage/creator check | UI narrower than backend |
| deleteCustomer API call | Awaits service call | Service omits `return` on http.delete | Delete may appear to succeed before server completes |
| getCustomer by ID | N/A | No organisation filter on find | Cross-org access by ID possible |
| Validation | Extensive form rules | Empty Joi schema | Server accepts minimal validation |
| Edit toolbar button | No permission gate | CREATE on update route | Edit may be visible without clear permission |
| MY CRM loading state | Uses LOAD_OVERVIEW action key | loadMyOverview uses LOAD_MY_OVERVIEW | Loading indicator may not show correctly |
| tables.js | Legacy column defs | CRMTable uses inline columns | tables.js unused for current list |
| isChampion | N/A | Model field only | Not user-facing |
| Calendar on review date | N/A | No calendar hook on customer model | Unlike suppliers, no auto review reminder |

### Unclear or incomplete behavior

- Whether invoices and incidents remain when customer is deleted.
- Whether S3 files (logo, attachments) are cleaned up on customer delete.
- Business purpose of `isChampion` field.
- Whether account manager overview should be callable for managers other than session user (backend allows any managerId; UI fixes to self).
