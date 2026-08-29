# Invoice

## 1. Module Overview

The **Invoice** module is part of **CRM (Customer Relationship Management)**. It enables an organisation’s CRM users to create, manage, send, and track **customer invoices** — formal billing documents issued from the organisation to a **CRM Customer** for goods or services described on the invoice.

Its primary business purpose is to support the **customer billing workflow within CRM**: preparing an invoice with line items and VAT, delivering it to the customer’s contacts by email with a PDF attachment, tracking whether it has been sent and paid, and giving internal users visibility through lists, detail views, notifications, and dashboard analytics.

The module solves the problem of scattered customer billing by tying each invoice to a specific **Customer** record, reusing customer contact details and account manager information, and applying the **Organisation’s** branding, address, VAT number, and bank details on the invoice document.

Primary users are **CRM users** with the appropriate CRM permissions — typically account managers and CRM administrators. Invoices are accessed mainly from a **Customer** record’s **Invoice** panel; a standalone invoice list route also exists but is not shown in main navigation. **External customers** receive invoices by email; they do not use the iMS application to view or pay invoices through an in-app payment flow.

---

## 2. Features and Capabilities

### Create a customer invoice

- **Capability:** Create a new invoice for a CRM Customer with a payment due date, one or more line items (item description, unit price, quantity, VAT rate), invoice-level discount percentage, and calculated totals (subtotal, VAT, total).
- **Who uses it:** Users with **CRM → Create** permission, working from a Customer context.
- **Outcome:** A new invoice is stored with status **Draft**, reference **INV-{ID}**, and the customer’s **account manager** recorded on the invoice. The customer’s account manager receives an in-app notification that an invoice was created.
- **Conditions:** Invoice creation is designed to run in the context of a selected **Customer** (customer ID and group are taken from that customer). Creating from the standalone invoice route without a customer context would leave required billing parties unset — **the implemented UI always embeds invoices inside Customer detail views.**

### View invoice list

- **Capability:** View a paginated, searchable table of invoices showing reference, created date, created by, due date, total amount, and status.
- **Who uses it:** Users with **CRM → Read** permission.
- **Outcome:** Users see invoices scoped to their organisation, filtered to a specific customer when opened from that customer’s Invoice panel.
- **Conditions:** **Super Admin**, **External Auditor**, and **Internal Auditor** roles see organisation-wide invoices. **Head of Service** and **Basic User** roles see invoices in their group or with no group. **External User** roles see only their group’s invoices. Search matches invoice **reference**. Default page size is 10.

### View invoice detail

- **Capability:** Open a single invoice to see full billing information: organisation (“Billed from”), customer (“Billed to”), line items, discount, VAT, total, due date, and bank details (in preview/read mode).
- **Who uses it:** Users with **CRM → Read** permission.
- **Outcome:** Users review the invoice as it would appear on the PDF, and access actions appropriate to the invoice status.
- **Conditions:** Detail opens in a **right-hand drawer** from the list row click, or on a dedicated full-page route (`/admin/invoices/:id`). Loading errors show *“This invoice has been deleted or removed.”*

### Update a draft invoice

- **Capability:** Change due date, line items, discount, and recalculated totals on an invoice that has not yet been sent.
- **Who uses it:** Users with **CRM → Create** permission (backend permission for update).
- **Outcome:** Draft invoice content is saved with updated calculations.
- **Conditions:** **Frontend restricts editing to Draft status only.** The backend update operation does **not** check status — **implementation suggests a Sent or Paid invoice could be modified via direct API access** even though the UI prevents it.

### Delete a draft invoice

- **Capability:** Permanently remove an invoice from the system.
- **Who uses it:** Users with **CRM → Delete** permission who are either an **admin** or the **creator** of the invoice.
- **Outcome:** The invoice record is hard-deleted and disappears from lists.
- **Conditions:** **Frontend shows Delete only for Draft invoices.** Backend delete has **no status restriction** — **implementation suggests non-Draft invoices could be deleted via direct API access.** Deletion does not retain payment history separately; the invoice record is removed.

### Save and send an invoice

- **Capability:** Create (or update) an invoice and immediately send it to the customer in one action.
- **Who uses it:** Users with **CRM → Create** permission for save; **CRM → Delete** permission for the send step (backend permission mapping).
- **Outcome:** Invoice is saved, a PDF is generated and emailed to the customer’s **primary contact email** (and **secondary contact email** if present), invoice status becomes **Sent**, and the customer’s account manager is notified in-app.
- **Conditions:** User must confirm before send; confirmation message names the customer’s primary (and secondary) email addresses. For an existing Draft, **Update and send** runs update then send.

### Send or resend an invoice

- **Capability:** Email an invoice PDF to the customer’s contacts; for already-Sent invoices, resend without changing financial content.
- **Who uses it:** Users with **CRM → Delete** permission (backend permission for send/resend).
- **Outcome:** Customer contacts receive an email with subject/body indicating the invoice was sent via iMS Systems, with the PDF attached. Status is set (or remains) **Sent**. Recipient emails on the invoice record are overwritten with primary/secondary contact details from the customer at send time.
- **Conditions:** Resend is available from the UI when status is **Sent**. Send can be triggered multiple times. Email includes a **payment link placeholder** (`https://localhost.com/auth/payments/`) — **no working in-app customer payment page was found in the codebase.**

### Mark an invoice as paid

- **Capability:** Manually record that a Sent invoice has been paid.
- **Who uses it:** Users with **CRM → Delete** permission (backend permission for payment).
- **Outcome:** Invoice status changes from **Sent** to **Paid**. The customer’s account manager receives an in-app notification that the invoice was marked paid.
- **Conditions:** Only allowed when status is **Sent**. This is **not** an integrated card or bank payment — it is an internal status change by a CRM user. **Partial payments are not supported.** UI label: **“Mark as paid”** with confirmation *“This invoice will be marked as paid.”*

### Download invoice PDF

- **Capability:** Download a PDF copy of the invoice reflecting current stored data.
- **Who uses it:** Users with **CRM → Delete** permission (backend permission for download).
- **Outcome:** User receives a PDF named `Invoice#00{ID}-{date}.pdf` containing organisation and customer details, line items, totals, and bank details.
- **Conditions:** Available for any saved invoice from the detail view regardless of status. PDF is generated on demand from the same template used for email delivery.

### View invoice analytics (customer and dashboard)

- **Capability:** See aggregated invoice counts and amounts by status for a customer; see organisation-level CRM dashboard charts for invoice volume and value over recent months.
- **Who uses it:** CRM users viewing **Customer** analytics or the **CRM Management** dashboard widget.
- **Outcome:** Customer overview shows a pie chart of invoice counts by status (Draft, Sent, Paid) and per-status counts. Dashboard shows monthly invoice count and total amount for **Sent** invoices over the last 12 months.
- **Conditions:** Customer analytics empty state: *“No invoice analytics available at the moment.”* Dashboard invoice stats include only **Sent** invoices in monthly aggregates.

---

## 3. User Outcomes / End Results

- **Create:** A CRM user can create a Draft invoice for a customer with line items, VAT, discount, due date, and calculated total in GBP (£).
- **View:** A CRM user can list invoices (globally within their access scope, or filtered to one customer), open detail in a drawer or full page, and see status colour-coded (Draft = red, Sent = amber, Paid = green).
- **Manage:** A CRM user can send invoices by email, resend Sent invoices, download PDFs, and mark Sent invoices as paid.
- **Change:** A CRM user can edit and delete **Draft** invoices from the UI; update due date, items, discount, and totals.
- **Information received:** The customer’s primary (and optional secondary) contact receives an email with PDF invoice attachment. The customer’s **account manager** receives in-app notifications when invoices are created, sent, or marked paid.
- **Business actions enabled:** Track billing per CRM customer; document what was billed and when payment is due; confirm payment receipt internally; support CRM reporting on invoice pipeline (Draft / Sent / Paid) and monthly Sent invoice revenue.

---

## 4. Scope Boundaries

### In scope

- Customer-scoped invoice creation, listing, detail, update, delete, send, resend, download, and manual paid marking.
- Line-item billing with VAT and discount calculations.
- PDF generation with organisation and customer branding/details.
- Email delivery of invoice PDFs to customer contacts.
- Invoice status lifecycle: Draft → Sent → Paid.
- In-app notifications to the customer’s account manager on create, send, and paid events.
- CRM dashboard and customer-level invoice analytics.

### Out of scope (handled elsewhere)

- **CRM Customers** — customer master data, contacts, account manager, and customer stage; invoices are always tied to a Customer record.
- **Organisation profile** — company name, logo, address, VAT number, company number, office email, and bank details used on invoices; maintained in the **Organisation** module.
- **Organisation subscription billing / Stripe checkout** — platform licence and subscription payments for becoming a customer; handled by **Organisation** / **Licence Management** / payment checkout flows, not CRM invoices.
- **External customer self-service portal** — no implemented customer-facing payment page linked from invoice emails.
- **General user management** — CRM permissions and roles are governed by the **Users** / access-control model.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **CRM / Customers** | Each invoice belongs to one CRM Customer; customer contacts receive emailed invoices; customer account manager is stored on the invoice and notified of invoice activity. Invoices are primarily accessed from the Customer detail **Invoice** panel. |
| **Organisation** | The active organisation is the invoice **issuer** (“Billed from”): logo, name, address, registration/VAT numbers, office email, and bank details appear on invoices and PDFs. |
| **Users** | Invoice **created by** and **updated by** users are recorded. The customer’s **account manager** (a user) is copied onto the invoice at creation and receives notifications. |
| **Groups** | Invoices carry a **group** reference from the customer; role-based listing filters restrict which invoices some users can see by group. |
| **Notifications** | Creating, sending, and marking an invoice paid triggers in-app notifications to the customer’s account manager, linking to invoice detail. |
| **CRM Dashboard / Stats** | Organisation CRM dashboard widgets show monthly count and total amount of **Sent** invoices. Customer overview analytics aggregate invoice counts and amounts by status. |
| **Incident Management** | Shares the Customer detail screen layout but no direct invoice-to-incident business link was identified. |

---

## 6. Current Data Model

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| **Invoice** | A billing document from the organisation to a CRM Customer for specified items/services, with due date, totals, and lifecycle status. | Central record for the entire invoicing workflow. |
| **Invoice line item (entry)** | One billed row: description, unit price, quantity, VAT rate, VAT amount, and line subtotal. | Embedded within an invoice; drives subtotal, VAT, and total calculations. |
| **Invoice calculations** | Aggregated financial summary: total amount, total VAT figure, and discount percentage. | Stored on the invoice; displayed on UI and PDF; sent to backend on create/update. |
| **Invoice recipient contacts (emails)** | Name and email pairs identifying who the invoice was sent to. | Populated automatically from customer primary/secondary contacts when an invoice is sent; stored on the invoice after send. |
| **Invoice reference** | Human-readable identifier `INV-{ID}` derived from a sequential numeric ID. | Used in lists, notifications, and business correspondence. |
| **Customer (linked)** | The billed party; provides name, address, logo, contacts, account manager, and group. | Required parent entity; not duplicated as a separate invoice-recipient entity. |
| **Organisation (linked)** | The billing issuer; provides branding and bank/payment instructions on documents. | Resolved at PDF/email generation time from the user’s active organisation. |
| **Account manager (linked user)** | The CRM user responsible for the customer relationship. | Copied from the customer at invoice creation; notification recipient for invoice events. |

There is no separate **Payment** entity for CRM invoices — payment is represented only by the invoice **status** changing to **Paid**.

---

## 7. Attributes

### Invoice

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| **ID** (numeric) | Sequential invoice number; displayed as `Invoice#00{ID}` in UI and PDF. | Auto-generated. |
| **Reference** | Formal reference code `INV-{ID}`. | Auto-set before save; searchable in list. |
| **Status** | Where the invoice is in its lifecycle: **Draft**, **Sent**, or **Paid**. | Default **Draft**. |
| **Customer** | The CRM Customer being billed. | Required at creation. |
| **Group** | Business unit / group associated with the customer and invoice. | Taken from customer; used in access scoping. |
| **Organisation** | The tenant organisation issuing the invoice. | Set from the creator’s active organisation. |
| **Account manager** | CRM user responsible for the customer. | Copied from customer at creation. |
| **Due date** | Date by which payment is expected. | Editable while Draft in UI. |
| **Entries (line items)** | Collection of billed items (see below). | At least one line expected for a meaningful invoice; UI validates item fields in edit mode. |
| **Calculations — total** | Final invoice amount in GBP after discount. | Required; computed in UI from line items and discount %. |
| **Calculations — vatFigure** | Total VAT amount across line items. | Aggregated in UI; stored on invoice. |
| **Calculations — discount** | Invoice-level discount as a percentage (0–100). | Applied to sum of line subtotals before arriving at total. |
| **Emails** | Recipient name/email pairs used when the invoice was sent. | Set on send from customer contacts. |
| **Created (by / on)** | Which user created the invoice and when. | Shown in list as created date and created by. |
| **Updated (by / on)** | Which user last updated the invoice (e.g. on send or mark paid) and when. | Used in notification messages for send/paid events. |

### Invoice line item (entry)

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| **Item** | Description of the product or service. | Required in UI validation (non-empty text). |
| **Unit price** | Price per unit in GBP. | UI requires minimum 1. |
| **Units (quantity)** | Number of units billed. | UI requires minimum 1. |
| **VAT rate (%)** | VAT percentage applied to the line. | 0–100 in UI validation. |
| **VAT figure (£)** | Calculated VAT amount for the line. | Auto-calculated in UI: unit price × quantity × VAT rate / 100. |
| **Subtotal (£)** | Line total including VAT. | Auto-calculated: (unit price × quantity) + VAT figure. |

### Attributes not present (confirmed absent)

| Concept | Notes |
| ------- | ----- |
| **Currency field** | Amounts are displayed and documented in **GBP (£)** only; no multi-currency support observed. |
| **Issue date (separate from created date)** | No distinct issue date; **created date** is shown in lists. |
| **Partial payment amount** | Not supported; status is either Sent or fully Paid. |
| **Payment method / transaction ID** | Not stored on CRM invoices. |
| **Overdue / cancelled statuses** | Not implemented in status enum. |

---

## 8. Current UI Layout

### Main screens / pages

- **Customer detail — Invoice panel:** Primary entry point. Within a CRM Customer record (full page or drawer), a panel labelled **Invoice** embeds the full invoice module scoped to that customer.
- **Standalone invoice list:** Route `/admin/invoices` exists under the admin layout with screen identifier `invoices`, but the route is **`invisible: true`** (not shown in sidebar navigation). Same table/drawer experience as the customer panel, but without a pre-selected customer unless passed in.
- **Standalone invoice detail page:** Route `/admin/invoices/:id` renders the invoice form in full-page layout (same content as the drawer detail).

All invoice routes require **CRM → Read** access policy.

### Important sections and views

- **Invoice table:** Columns — Reference, Created date, Created by, Due date, Total (£), Status (colour-coded), Actions menu.
- **Invoice detail drawer / page:** Card-style invoice layout with:
  - **Billed from** — organisation logo, name, address, email, registration number, VAT number, account manager as point of contact.
  - **Billed to** — customer logo, reference and name, address, company registration (if present), primary and secondary contacts, payment due date.
  - **Line items table** — Items/Service provisions, Price, Quantity, VAT(%), VAT(£), Amount (£); discount row; total VAT; total amount.
  - **Bank details** — shown in preview (non-edit) mode from organisation bank details.
  - **Footer** — “Thank you for your business with {organisation name}” and Powered by iMS branding.

### Primary actions

| Action | Where | Availability (UI) |
| ------ | ----- | ------------------- |
| **Create** | Table toolbar button | **CRM → Create**; opens create drawer |
| **View Details** | Row actions menu | Always; navigates to `/admin/invoices/:id` |
| **Delete** | Row actions menu | Draft only; **CRM → Delete**; admin or invoice creator |
| **Row click** | Table row | Opens detail drawer |
| **Save** | Detail/create form | New invoice only |
| **Update** | Detail form | Draft only |
| **Edit / Preview** | Detail form | Draft only — toggles edit vs read-only preview |
| **Save and send** | Detail/create form | New or Draft; confirmation dialog |
| **Resend** | Detail form | Sent status |
| **Mark as paid** | Detail form | Sent status; confirmation dialog |
| **Download** | Detail form | Any saved invoice |

### Forms

- **Create invoice drawer:** Opens from **Create** button; contains the full `InvoiceForm` pre-filled with the current customer’s group, customer ID, today’s due date, empty line items, and zero calculations.
- **Invoice form validation (frontend):** Requires customer, group, total, due date, and entries; line items validate item text, minimum unit price/units, VAT rate bounds, and discount 0–100%.

### Lists / tables / cards / detail views

- **ReactTable** with search, filters dropdown, pagination (top), default 10 rows per page.
- **Filters dropdown** exposes labels copied from customer staging (**All**, **Customers live**, **Prospects**, **Warm leads**, **Qualified**, **Proposals**) — **Observed but business purpose unclear for invoices; these filters appear designed for customer stage, not invoice status, and may not meaningfully filter invoice data.**
- **Customer analytics card:** Pie chart **Invoice status** with per-status counts when the customer has invoices; otherwise empty state message.

### Navigation and workflow

1. User opens a **Customer** → **Invoice** panel.
2. User clicks **Create** → create drawer → adds line items → **Save** (Draft) or **Save and send** (creates + emails + Sent).
3. User clicks a table row → detail drawer → can **Update**, **Save and send**, **Download**, **Resend**, or **Mark as paid** depending on status.
4. User can open **View Details** for full-page view at `/admin/invoices/:id`.
5. Notification click (account manager) can deep-link to invoice detail via screen identifier `invoice-detail`.

### Material empty, loading, or restricted states

- **Loading:** Full-page/table loader while invoices load; spinner on delete action for the affected row; “Downloading…” / “Processing…” on form buttons during operations.
- **Empty table:** Displays *“No data found”* when no invoices match.
- **Detail error:** *“This invoice has been deleted or removed”* when load fails.
- **Permission-gated:** Create button wrapped in **Can** (CRM Create). Delete gated by CRM Delete plus creator/admin check. Send, pay, download, and resend require CRM Delete at API level — **no separate frontend permission gates on those buttons beyond being able to open the invoice.**
- **Status-based UI:** Edit controls hidden for Sent and Paid; **Mark as paid** only for Sent; **Resend** only for Sent; **Delete** only for Draft in UI.

---

## 9. Miscellaneous / Module-Specific Information

### Invoice lifecycle (confirmed)

| Status | Meaning | Typical transition |
| ------ | ------- | ------------------ |
| **Draft** | Invoice created but not emailed to the customer. | Default on create. |
| **Sent** | PDF emailed to customer contacts; invoice awaiting payment. | Set when send (or save-and-send / resend) completes successfully. |
| **Paid** | CRM user has manually confirmed payment received. | Set when **Mark as paid** is used on a Sent invoice. |

There are **no** implemented statuses for overdue, cancelled, viewed, failed payment, or partial payment. **Due date is informational** — no automatic overdue transition was found.

### Send and delivery workflow

1. System loads organisation profile and customer details.
2. PDF is generated from an invoice HTML template (A4 portrait) including both parties’ details, line items, totals, and organisation bank details.
3. Email is sent using the **customer-invoice** template to primary contact (and secondary if email exists), with PDF attached.
4. Email body states who sent the invoice and from which organisation; a **payment link** is included but points to a **hardcoded placeholder URL** — **not a functional payment endpoint in this codebase.**
5. Invoice status set to **Sent**; `emails` array updated with contact names/emails.
6. Temporary PDF files are removed after send.
7. Account manager receives in-app notification (email notification disabled for these events).

### Payment workflow (confirmed)

- Payment is **manual internal bookkeeping**, not payment-gateway processing.
- Only CRM users with appropriate permissions can mark an invoice paid from the UI.
- No customer self-service payment flow exists in the application for CRM invoices.
- Marking paid does **not** change customer stage, organisation licence status, or subscription state — it updates invoice status and notifies the account manager only.

### Financial calculation rules (UI)

- Per line: VAT figure = unit price × quantity × (VAT rate / 100); subtotal = (unit price × quantity) + VAT figure.
- Invoice total VAT = sum of line VAT figures.
- Invoice total = sum of line subtotals minus discount percentage applied to that sum.
- All amounts presented in **£ (GBP)**.

### Permission mapping (observed)

| Business action | Frontend permission check | Backend RBAC |
| --------------- | ------------------------- | ------------ |
| Create / Save / Update | CRM **Create** | Create for POST and PUT update |
| Read list/detail | CRM **Read** | Read |
| Delete | CRM **Delete** (+ creator/admin in UI) | Delete |
| Send / Resend / Mark paid / Download | No separate frontend gate | CRM **Delete** |

**Implementation suggests send, payment, and download are classified under the Delete permission on the backend**, which may not match intuitive business permission naming.

### Cross-layer discrepancies

| Topic | Observation |
| ----- | ------------- |
| **Edit after send** | UI blocks editing for Sent/Paid; backend update has no status guard. |
| **Delete after send** | UI blocks delete for Sent/Paid; backend delete has no status guard. |
| **Payment error handling** | Backend payment service returns an error tuple when status is not Sent, but the controller always responds with success — **implementation suggests invalid payment attempts may still return HTTP 200.** Frontend shows success notification before checking for errors in some flows. |
| **Validation** | Backend invoice validation schema is an **empty stub**; controller bypasses validation with `isValid: true`. Business rules are enforced mainly on the frontend. |
| **Invoice list filters** | Filter labels reference customer pipeline stages, not invoice attributes — **likely non-functional or misconfigured for invoices.** |
| **Payment link in email** | Placeholder localhost URL — customers cannot pay through iMS from the email link today. |
| **mapToInvoiceModel** | When loading an invoice for editing, **vatFigure may be omitted** from mapped calculations — **could affect displayed VAT if a Draft were re-opened for edit.** |

### Behaviour that could not be fully determined

- Whether the standalone `/admin/invoices` route is linked from anywhere in navigation other than direct URL or notifications.
- Whether invoice PDF generation succeeds when organisation **bank details** are missing (template references bank fields without observed fallback).
- Full org-ownership enforcement on **get single invoice by ID** beyond CRM Read RBAC — service lookup is by ID only.

### Terminology

- **Invoice#00{ID}** — user-facing display number (prefix `00` plus numeric ID).
- **INV-{ID}** — system reference code used in search and notifications.
- **Mark as paid** — internal confirmation of payment receipt, not automated payment capture.
