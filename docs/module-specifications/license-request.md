# License Request

## 1. Module Overview

The **License Request** module enables an organisation to **request additional iMS licensing capacity and product access** — including user seats, business unit (Functional Unit) seats, super-user seats, compliance toolkits, additional modules (such as CRM), and standalone product flags (Project IMS, IMS Form, CarboCalc).

A license request is **not** a generic software purchase flow or an external license key. It is an **internal organisation licensing change request** that, when processed, **increases the organisation's allocated licence counts** and **adds toolkit or module entitlements** on the organisation record.

The module sits primarily under **Licence Management** (`/admin/licensemanagement`) and is also reachable from the **Organisation** settings screen. **iMS platform administrators** have separate admin endpoints to approve or cancel requests, but the current create workflow **automatically approves and applies licences immediately** after a request is submitted — so organisation users typically experience instant allocation rather than a long-running pending review.

Primary users who **submit** requests are **organisation administrators** (Super Admin and users with Licence Management access). **iMS admins** can **cancel** or **re-approve** pending requests through admin routes. The **Requested** tab UI also exposes **Grant** and **Decline** actions that **do not match** the current organisation API surface (see discrepancies).

---

## 2. Features and Capabilities

### Submit a license request (organisation user)

- **Capability:** Request additional business unit licences, user licences, super-user licences, compliance toolkits, additional modules, and product selections, with an optional message.
- **Who uses it:** Organisation users via **Licence Management → Request licences** (`MakeRequest`) or **Organisation → Request license** drawer (`LicenseForm`).
- **Outcome:**
  - A license request record is created with reference `LR-{number}`.
  - **Licences are applied to the organisation immediately** — the create service calls the approval logic before returning.
  - Email sent to **iMS support/accounts** (`new-ims-licence-request`).
  - Confirmation email sent to organisation **Super Admins** (`license-request-recieved-confirmation`).
  - UI success: *"Licence request sent successfully"* (Licence Management) or *"Licenses allocated successfully."* (Organisation).
- **Conditions:**
  - Request is scoped to the submitter's **organisation**.
  - Quantities are non-negative integers (UI validation).
  - **No request-body validation middleware** on the create route.
  - **MakeRequest** form captures: user licences, business unit licences (for global-access users), compliance toolkits, message. **LicenseForm** (Organisation) additionally captures: super-user count, additional modules, Project IMS / IMS Form / CarboCalc product toggles.

### View organisation license requests

- **Capability:** List and view license requests for the organisation with pagination.
- **Who uses it:** Users accessing **Licence Management → Requested** tab or request detail modal.
- **Outcome:** Table titled *"License requests"* with reference, business unit/user counts, status badge, and detail modal.
- **Conditions:** Listing is **organisation-scoped** with optional **role-based group filter** (Head of Service / Basic User see org + their group; External User sees their group only; Super Admin / auditors see all org requests).

### View a single license request

- **Capability:** Retrieve one request by ID with organisation, creator, and grant details.
- **Who uses it:** Detail modal in **Requested** tab; `getLicensesRequest` API.
- **Outcome:** Shows reference, requested quantities, compliance tools, message, requester, status, grant date when granted.

### Delete a license request

- **Capability:** Permanently remove a license request record.
- **Who uses it:** Authenticated organisation users via DELETE on `/license-requests/:id`. **No confirmed UI consumer** for delete in the inspected frontend.
- **Outcome:** Record removed. Message *"License deleted successfully"*.
- **Conditions:** Record must exist. **No confirmed rollback** of licences already applied if the request was auto-approved.

### Approve a license request (iMS admin — and automatic on create)

- **Capability:** Apply requested licence changes to the organisation and mark the request **Granted**.
- **Who uses it:**
  - **Automatically** on every organisation create request (inside `createRequest` service).
  - **iMS admins** via `POST /admin/ims-license-request/:id/approve`.
- **Outcome:**
  - Organisation **allocated** counts increased: `groups`, `users`, `superUser`.
  - Product flags set: `projectims`, `carbocalc`, `imsforms` when requested.
  - **Compliance toolkits** and **additional modules** appended to organisation licence arrays if not already present.
  - **Compliance tool records created** for each requested toolkit.
  - If organisation has a **Stripe subscription ID**, subscription upgrade attempted.
  - Request `granted.status` → **Granted**; `granted.by` and `granted.on` recorded.
  - Email to organisation Super Admins: *licence-request-processed*.
- **Conditions:** Request must be in **Pending** status. If already granted, approval fails.

### Cancel a license request (iMS admin)

- **Capability:** Cancel a pending license request without applying licence changes (when cancellation occurs before approval).
- **Who uses it:** **iMS admins** via `POST /admin/ims-license-request/:id/cancel` (`checkImsAdmin` middleware).
- **Outcome:** Request `granted.status` set to **Cancled** (typo in implementation; model enum is **Canceled**). Email to organisation Super Admins: *licence-request-cancelled*.
- **Conditions:** Only **Pending** requests can be canceled. **Because create auto-approves**, cancel is only meaningful for requests that remain Pending (e.g. if auto-approve were removed or failed). **[Requires verification]** in normal org-user flow.

### Grant or decline from organisation UI (frontend — not supported by current org API)

- **Capability (UI only):** **Grant** or **Decline** actions on requests with status **Open**.
- **Who uses it:** Users with **Licence Management → ALL** permission when UI shows status **Open**.
- **Outcome:** **Current behavior could not be confirmed as working** — frontend calls `PUT /license-requests/:id/?status=Approve|Declined`, but the organisation API exposes **no PUT route** for approval. Admin approve/cancel uses different paths under `/admin/ims-license-request`.
- **Conditions:** UI checks `granted.status === "Open"`; backend model uses **Pending**, **Granted**, **Canceled** — status **Open** and **Declined** are **not** backend enum values.

---

## 3. User Outcomes / End Results

### For organisation administrators

- **Create:** Request more user seats, business unit seats, super-user seats, compliance toolkits, CRM module, and product add-ons.
- **View:** See submitted requests and their granted status in the **Requested** list.
- **Information received:** Confirmation that the request was sent; organisation licence allocation updated **immediately** on successful create.
- **Business actions enabled:** Expand organisation licensing capacity without manual iMS admin intervention in the current implementation (auto-approve).

### For iMS platform administrators

- **Process:** Approve or cancel **Pending** requests via admin API.
- **Outcome:** Approve applies licence changes; cancel marks request canceled and notifies Super Admins.

**What users cannot achieve through License Request today (confirmed or broken):**

- **Organisation-user manual approve/decline** via the **Requested** tab Grant/Decline buttons (API mismatch).
- **Request without immediate licence effect** — create path auto-approves.
- **Decline** as a persisted status through organisation API (backend uses **Canceled**, not **Declined**).
- **Per-user or per-role licence assignment** — requests change **organisation allocation**, not individual user licences directly.

---

## 4. Scope Boundaries

### In scope

- Creating organisation-level license requests.
- Recording request metadata (quantities, toolkits, modules, products, message).
- Applying licence allocation changes to the organisation on approval.
- Creating compliance toolkit instances when toolkits are granted.
- Optional Stripe subscription upgrade when organisation billing is connected.
- Transactional emails to iMS support, accounts, and organisation Super Admins.
- iMS admin approve/cancel on admin routes.
- Viewing and deleting request records (delete without licence rollback).

### Out of scope (handled elsewhere)

- **Initial onboarding licence selection** during Go Live — local wizard state and organisation setup; not the same as submitting a `/license-requests` record during onboarding (onboarding uses `updateLicenses` in go-live store).
- **Consuming licences** when inviting users or creating Functional Units — **License Manager** / **Invitations** / **Membership** modules.
- **Licence usage display** — **Licence Management → Organisation overview** and **Business units** tabs (IAM groups), not the request record itself.
- **Payment checkout UI** — billing may be updated via Stripe on approval, but License Request is not a payment checkout module.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **Organisation / Our iMS** | Requests change the organisation's **`licenses`** allocation (groups, users, superUser, complianceTools, additionalModules, product flags). Organisation screen embeds **LicenseForm** to submit requests. |
| **Licence Management** | Primary UI host: request form, request list, organisation licence overview, business unit licence table. |
| **Compliance** | Approved requests **create compliance toolkit** records for each requested toolkit name. |
| **Users / Memberships** | Super Admin members receive confirmation and processed/canceled emails. User invitations consume **user/super-user allocation** granted here. |
| **Functional Units (IAM Groups)** | **Business unit licence** count (`groups`) increases organisation allocation used when creating Functional Units. |
| **Invitations** | **User licence** allocation granted through requests enables inviting more users. |
| **Payments / Billing** | On approval, if organisation has **Stripe subscription ID**, subscription upgrade is attempted. Not required for approval to apply licence counts locally. |
| **CRM (additional module)** | Can be requested as **additionalModules**; added to organisation licence list on approval. |
| **IMS Form / Project IMS / CarboCalc** | Optional **product flags** on request; set on organisation licences when approved. |

---

## 6. Current Data Model

The License Request module owns one dedicated persistent entity:

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| **License request** | A recorded ask to increase or extend the organisation's iMS licensing entitlements. | Audit/history of what was requested and whether it was granted or canceled. |

**Embedded concepts on the request:**

| Concept | Business meaning |
| ------- | ---------------- |
| **Granted** | Processing outcome: status, processing admin (if any), processing date. |
| **Created** | Who submitted the request and when. |

**Relationships:**

- Each request belongs to one **organisation**.
- **Created by** references the submitting user.
- **Granted by** references an **iMS admin** when processed through admin routes (null when auto-approved from org create path).

There is **no separate line-item table** — quantities and selections are fields on the single request record.

---

## 7. Attributes

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Reference | Human-readable request ID (`LR-*`). | Auto-generated. |
| Groups | Number of **business unit (Functional Unit) licences** requested. | Added to `organization.licenses.groups.allocated` on approval. |
| Users | Number of **standard user licences** requested. | Added to `organization.licenses.users.allocated` on approval. |
| Super user | Number of **Super Admin user licences** requested. | Added to `organization.licenses.superUser.allocated` on approval. |
| Compliance tools | List of **compliance toolkit** names requested (ISO standards, CQC, ESG, etc.). | Appended to org licences; toolkit records created on approval. |
| Additional modules | Extra modules requested (e.g. **CRM**). | Appended to org `additionalModules` on approval. |
| Project IMS / IMS Form / CarboCalc | Boolean flags for **standalone product** entitlements. | Set on organisation licences when true on approval. |
| Message | Free-text explanation or notes from the requester. | Optional. Rich text in Organisation form. |
| Granted status | Processing state of the request. | **Pending**, **Granted**, **Canceled** (enum); cancel implementation writes **Cancled**. |
| Granted by | iMS admin who approved or canceled (when via admin route). | May be null on auto-approve from org create. |
| Granted on | When the request was processed. | |
| Created by / created on | Requester and submission time. | |
| Organisation | Target organisation receiving licences. | Always submitter's org on create. |

---

## 8. Current UI Layout

License Request does **not** have its own top-level navigation label. It is **embedded in Licence Management** and **Organisation** settings.

### Entry points

| Entry point | Location | Purpose |
| ----------- | -------- | ------- |
| **Licence Management** | `/admin/licensemanagement` — nav item *Licence Management* | Full licensing workspace |
| **Request licences tab** | Licence Management → *Request licences* panel | Submit request (`MakeRequest`) |
| **Requested tab** | Licence Management → *Requested* panel | List past requests |
| **Organisation → Request license** | Organisation drawer `request-license-form` | Full `LicenseForm` with products and super-user counts |

### Licence Management layout (tabbed panels)

Accessible tabs depend on permission:

| Panel | Content |
| ----- | ------- |
| **Organisation overview** | Current licence allocation summary (Super Admin+ with LICENSE_MANAGEMENT ALL) |
| **Business units** | IAM groups and their licence usage |
| **Request licences** | `MakeRequest` form: user licences, business unit licences (global access), compliance toolkits, message |
| **Requested** | `RequestsTable`: reference, name, BU/user columns, status, actions, detail modal |

### Request creation workflows

**MakeRequest (Licence Management):**

1. Enter business unit licences (if organisational/global access), user licences, compliance toolkits, optional message.
2. Click **Confirm**.
3. Success toast; request added to **Requested** table.

**LicenseForm (Organisation drawer):**

1. Select product tiles (IMS Systems default, IMS Form, Project IMS, CarboCalc).
2. Enter super-user, user, and business unit licence counts (with PCM pricing labels in UI).
3. Select additional modules and compliance toolkits (filtered against existing licences).
4. Optional message.
5. Submit → *"Licenses allocated successfully."* and membership cache refresh.

### Request list and detail

- **Table columns:** Reference ID, Name, Business unit licenses, User licenses, Status, Requested date, Actions.
- **Row click / Details:** Opens modal with `LicenseDetail` — reference, quantities, compliance tools, requester, status, grant/decline dates, message.
- **Actions menu:**
  - **Details** — always.
  - **Grant / Decline** — only when UI status is **Open** and user has LICENSE_MANAGEMENT ALL (**likely non-functional** — see discrepancies).
  - **Pending** shows *"iMS managed"* text; other statuses show *"Closed"*.

### Material states

| State | Behaviour |
| ----- | --------- |
| **Processing** | Confirm button shows *"Processing..."* |
| **Success** | Toast: request sent / licenses allocated |
| **Error** | *"Licence request failed"* or generic operation error |
| **Loading** | Detail modal loading spinner; groups load spinner on Licence Management |
| **Empty** | Table shows *"No data found"* |

---

## 9. Miscellaneous / Module-Specific Information

### What a license request represents

A license request is an **organisation-level ask to increase iMS licence allocation and product entitlements**. It changes **how many users, business units, and super users the organisation may onboard**, and **which compliance toolkits, modules, and products** the organisation may use — not licences assigned to named individuals in this step.

### Request lifecycle (confirmed)

```
Submitted (Pending on save)
  → [Auto-approve on create] → Granted (+ org licences updated)

Admin path (when Pending):
  → [Admin approve] → Granted (+ org licences updated)
  → [Admin cancel] → Canceled (no licence change if never approved)

[Delete] → Record removed (no licence rollback confirmed)
```

In the **current org-user create flow**, requests move from **Pending to Granted within the same operation**, so users typically see **Granted** immediately.

### Licence allocation on approval (confirmed)

Approval **automatically**:

1. Increments organisation **allocated** counts for groups, users, and superUser by requested amounts.
2. Enables product flags (`projectims`, `carbocalc`, `imsforms`) when requested.
3. Adds compliance toolkit and additional module names to organisation licence arrays.
4. Creates **compliance toolkit** business records.
5. Optionally updates **Stripe subscription** if configured.

**No separate "fulfillment" step** is required after approval — allocation is immediate. Individual users are **not** auto-assigned seats; administrators use **Invitations** and **Functional Unit** creation within the new allocation limits.

### Relationship to existing licensing

| Licensing concept | How License Request affects it |
| ----------------- | ------------------------------ |
| **User licences** | Increases `licenses.users.allocated` |
| **Super user licences** | Increases `licenses.superUser.allocated` |
| **Business unit / group licences** | Increases `licenses.groups.allocated` |
| **Compliance toolkit licences** | Adds toolkit names to org list; creates toolkit instances |
| **Additional modules (CRM)** | Adds to `licenses.additionalModules` |
| **Product flags** | Sets `projectims`, `imsforms`, `carbocalc` on org |
| **Licence usage (`used` counts)** | **Not changed** by request — usage increments elsewhere when users/units are consumed |

**Leave days entitled to** and other membership fields are **unrelated** to License Request.

### User access and permissions

| Action | Access (confirmed) |
| ------ | ------------------- |
| Navigate to Licence Management | **LICENSE_MANAGEMENT → CREATE** (route policy) |
| See Organisation overview tab | **LICENSE_MANAGEMENT → ALL** |
| Submit request (org API) | Authenticated org member; **no RBAC middleware** on org routes |
| List/view requests | Org-scoped; role-based group filter for some roles |
| Admin approve/cancel | **iMS admin** (`checkImsAdmin`) on `/admin/ims-license-request` |
| UI Grant/Decline | **LICENSE_MANAGEMENT → ALL** when status displays as Open |

### Email notifications

| Trigger | Recipients | Purpose |
| ------- | ---------- | ------- |
| Create | iMS support + accounts mail | New request notification with org and request details |
| Create | Organisation Super Admins | Confirmation that request was received |
| Approve | Organisation Super Admins | Licences processed |
| Cancel (admin) | Organisation Super Admins | Request canceled |

Legacy trigger handlers for in-app notifications (`newLicenseRequestEvent`, `licenseRequestStatusChanged`) exist in the triggers service but **create path uses direct email**, not confirmed in-app notification from those handlers in the current create flow.

### Frontend / backend discrepancies

| Area | Backend | Frontend |
| ---- | ------- | -------- |
| Approve/decline from org UI | No PUT on `/license-requests`; admin uses POST `/admin/ims-license-request/:id/approve` | `PUT` with `status=Approve` / `status=Declined` |
| Request status for actions | **Pending**, **Granted**, **Canceled** | UI action gate uses **Open**; detail shows **Declined** (not in backend enum) |
| Quantity display | Flat numeric `groups`, `users` | Table/detail expect `groups.requested`, `users.requested`, `type` Organisational |
| Auto-approve | **Immediate** on create | UI copy implies request *sent*; Organisation says *allocated successfully* (accurate) |
| Cancel spelling | Enum **Canceled**; code sets **Cancled** | N/A |
| MakeRequest vs LicenseForm | API accepts all fields | MakeRequest omits superUser, products, additionalModules |

### Unclear or partially implemented behaviour

- Whether **delete** should roll back licences already applied by an auto-approved request.
- Whether **Grant/Decline** UI was intended for a removed API or never completed.
- Whether **Pending** status is visible to org users in practice given auto-approve on create.
- Whether admin approve/cancel is used when org create already auto-approves.
