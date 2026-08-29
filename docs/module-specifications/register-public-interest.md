# Register Public Interest

## 1. Module Overview

The **Register Public Interest** module enables **anonymous visitors** to **register their interest in an iMS product** before it is generally available or as an early-access sign-up. A submitter provides their **name**, **email**, **company name**, and the **product** they are interested in. The system **persists** the registration, prevents duplicate registrations for the same email, and — for at least one confirmed product — sends a **confirmation email** promising early access.

In the current implementation, the module is primarily a **product waiting-list / early-access registration** mechanism. The confirmed product-specific workflow is for **CarboCalc (Carbon Calculator)** (`product` value `"carbon-calculator"`), which triggers an email thanking the submitter and stating predicted availability and exclusive early access.

The module is **public** (no login required) and is intended for use by **external prospective customers** — typically via a **marketing website or landing page outside this repository**, not through the authenticated iMS admin application.

Primary users:

- **Anonymous visitors** — submit interest once per email address.
- **iMS business/operations** — benefit from a persisted list of interested parties in the database; **no in-app review UI** was found in this codebase.

---

## 2. Features and Capabilities

### Register product interest (public submission)

- **Capability:** Submit a registration expressing interest in a named iMS product, with personal and company contact details.
- **Who uses it:** **Unauthenticated visitors** — no user account or organisation context required.
- **Outcome:**
  - A **Register Public Interest** record is **saved** to the database.
  - HTTP **201 Created** response with message *“Interest registered successfully”* and the saved record in the response body.
  - If `product` is **`carbon-calculator`**, a **confirmation email** is sent to the submitter (*“Carbo-Calc Interest Registered Successfully.”*).
- **Conditions:**
  - **Name** — required; max 20 characters.
  - **Email** — required; valid email format; max 50 characters; normalised to lowercase before storage.
  - **Company name** — required; max 30 characters.
  - **Product** — required string (free-text in validation; no fixed enum enforced at validation layer).
  - **Duplicate email blocked** — if the email already exists on a registration record, the request is rejected (*“An email is already registered.”*).

### Product-specific confirmation email (CarboCalc)

- **Capability:** Automatically acknowledge CarboCalc interest registrations by email.
- **Who uses it:** Triggered for submitters whose `product` value is exactly **`carbon-calculator`**.
- **Outcome:** Email to the submitter stating:
  - Thank you for registering interest in the **Carbon Calculator**.
  - Predicted availability (**July** — static copy in template).
  - **Exclusive early access** when the product becomes available.
  - Contact **support@imssystems.tech** for questions.
- **Conditions:** Only this exact product string triggers the email. **Other product values persist the record but send no confirmation email** in the inspected code.

### Duplicate registration prevention

- **Capability:** Ensure each email address can register interest only once across all products.
- **Who uses it:** System enforcement on every submission.
- **Outcome:** Second submission with the same email is rejected with a clear error message.
- **Conditions:** Uniqueness is on **email only**, not on email + product combination. A person cannot register interest in a second product with the same email without changing email or removing the existing record (no removal API exists).

---

## 3. User Outcomes / End Results

### For anonymous visitors (submitter)

- **Register:** Express interest in an iMS product with name, email, company, and product identifier.
- **Receive:** HTTP success confirmation and, for **CarboCalc** registrations, a **confirmation email** about early access.
- **Cannot:** Register twice with the same email; view or edit a previous registration through the product; see submission status beyond the immediate API response.

### For iMS (business)

- **Collect:** A persistent list of people and companies interested in products (at minimum CarboCalc early access).
- **Prevent:** Duplicate sign-ups from the same email.
- **Cannot (in this codebase):** Review registrations through an admin UI; receive automatic internal notification emails on new registrations; change registration status; export or process registrations through a dedicated workflow.

### What users cannot achieve today (confirmed)

- Register interest while logged into iMS through an in-app form (**no frontend in this repository**).
- Register the same email for a different product after an initial registration.
- Receive a confirmation email for products other than **`carbon-calculator`** (unless added in future code).
- View, update, or cancel a registration after submission.
- Trigger creation of a **user account**, **organisation**, **customer**, or **partnership** record from registration.

---

## 4. Scope Boundaries

### In scope

- **Public, anonymous** registration of interest in an iMS **product**.
- **Persistence** of registration records (name, email, company, product).
- **Email uniqueness** enforcement.
- **Product-conditional confirmation email** for CarboCalc (`carbon-calculator`).
- Validation and error responses for invalid or duplicate submissions.

### Out of scope (handled elsewhere)

- **Contact IMS** — separate public module for demo booking and Get Started enquiries; **email-only**, **does not persist** submissions, different fields and workflows.
- **Authenticated onboarding** — user registration, organisation creation, go-live, and partnership application in the admin/onboarding application.
- **Customers / CRM** — no automatic customer or lead record creation from Register Public Interest.
- **Organisation / Licensing** — CarboCalc as a **licence flag** on organisations is separate; interest registration does **not** grant or activate licences.
- **Notifications module** — no in-app notifications for new registrations.
- **Email Campaign module** — marketing campaigns are separate from this transactional confirmation.
- **Internal lead management UI** — no list, review, approve, or export screen in this repository.
- **Partnership Program** — separate application workflow for becoming a referral partner.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **Email (transactional)** | Sends **register-interest-success** confirmation to the submitter when product is `carbon-calculator`. **No internal team notification email** was found. |
| **Contact IMS** | Related **public lead-capture** pattern for prospective customers. Contact IMS is **email-only without persistence**; Register Public Interest **persists** records and enforces duplicate emails. **Not integrated** — separate routes and data. |
| **Organisation / CarboCalc (licensing)** | CarboCalc exists as a **product and organisation licence flag** elsewhere in the product. Register Public Interest captures **pre-launch interest** only; it does **not** create organisations or enable CarboCalc access. |
| **Users / Authentication** | **No relationship.** Submissions are anonymous; no user account is created or linked. |

No confirmed links to Customers, CRM, Notifications, Invitations, or Partnership Program workflows.

---

## 6. Current Data Model

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| **Register Public Interest** | A single public sign-up expressing interest in an iMS product, with submitter contact details | **Central persisted record** owned by this module |

Each record represents **one person’s one-time registration** (enforced by unique email). There is **no status field**, **no reviewer**, and **no processing stage** on the record — lifecycle is **submitted and stored** only.

| Related concept | Relationship |
| ------------- | ------------ |
| **User account** | **Not created** |
| **Organisation** | **Not created** |
| **Customer / CRM lead** | **Not created** |

---

## 7. Attributes

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| **Name** | Submitter’s name | Required; max 20 characters |
| **Email** | Submitter’s email address | Required; valid email; max 50 characters; stored lowercase; **unique** across all registrations |
| **Company name** | Submitter’s organisation or company | Required; max 30 characters |
| **Product** | Which iMS product the person is interested in | Required free-text string; **`carbon-calculator`** triggers CarboCalc confirmation email; other values persist without observed email |
| **Created / updated timestamps** | When the registration was submitted | System-maintained (`timestamps: true`) |

**Not present on the model (confirmed absent):**

- Phone, job title, message, or additional notes.
- Status (pending, approved, contacted, etc.).
- Reviewer or processing metadata.
- Link to user ID or organisation ID.

---

## 8. Current UI Layout

### Main screens / pages

- **No Register Public Interest screens, routes, forms, or API service clients** were found in **`ims-systems-frontend`**.
- The admin application includes **CarboCalc** product navigation when an organisation holds a `carbocalc` licence, but that is **unrelated** to the public interest registration workflow.
- CarboCalc and carbon-calculator branding assets exist in the frontend build, but **no form submits to `/register-public-interest`**.

### Entry points

- **Backend public API:** `POST /api/v3/register-public-interest/` (mounted **before** authentication middleware).
- **Intended consumer:** **External website or landing page** (e.g. imssystems.tech marketing site) — **Current behavior could not be fully determined from the inspected code** for the exact public-site form layout and CTA placement.

### Form layout (inferred from backend validation only)

A conforming external form would collect:

| Field | Required | Constraints |
| ----- | -------- | ----------- |
| Name | Yes | Max 20 characters |
| Email | Yes | Valid email; max 50 characters |
| Company name | Yes | Max 30 characters |
| Product | Yes | String; use `carbon-calculator` for CarboCalc workflow |

### Submission workflow (backend-confirmed)

1. Visitor completes form on external page (assumed).
2. Client sends POST with JSON body.
3. Server validates fields.
4. Server checks email not already registered.
5. Server saves record.
6. Server sends CarboCalc confirmation email if `product === "carbon-calculator"`.
7. Server returns 201 with saved record.

### Success, error, and loading states

Based on backend behaviour only (no observed frontend):

| Outcome | HTTP | Message / behaviour |
| ------- | ---- | ------------------- |
| **Success** | 201 Created | *“Interest registered successfully”*; body includes saved `registerPublicInterest` object |
| **Validation error** | 400 Bad Request | Joi validation message (field-level) |
| **Duplicate email** | 400 Bad Request | *“An email is already registered.”* |
| **CarboCalc confirmation** | N/A (side effect) | Email subject *“Carbo-Calc Interest Registered Successfully.”* |
| **Other products** | 201 | Record saved; **no confirmation email** observed |

Loading states, inline field validation UI, and post-submit thank-you pages **could not be determined** from this repository.

### Internal management UI

- **None found.** No admin screen lists, searches, or processes Register Public Interest records in this codebase.

---

## 9. Miscellaneous / Module-Specific Information

### What “Public Interest” means in this application

**Public Interest** = a **prospective customer’s expression of interest in a specific iMS product**, captured anonymously and stored for follow-up (early access list). It is **not**:

- A newsletter subscription (no list-management or unsubscribe workflow).
- A Contact IMS demo or Get Started enquiry (different module, no persistence).
- A partnership application.
- A sales order or licence purchase.

The **confirmed product workflow** in code is **CarboCalc / Carbon Calculator** early-access registration.

### Submission workflow (complete, confirmed)

```
Anonymous visitor (external form)
  → POST register-public-interest
  → Validate name, email, companyName, product
  → Reject if email already exists
  → Save Register Public Interest record
  → If product === "carbon-calculator": send confirmation email to submitter
  → Return 201 with saved record
```

**No further lifecycle** — no status transitions, internal review queue, or automated follow-up tasks in application code.

### Post-submission outcomes (confirmed)

| Outcome | Occurs? |
| ------- | ------- |
| Record persisted in database | **Yes** |
| Confirmation email to submitter | **Yes**, only for `carbon-calculator` |
| Email to internal iMS staff | **No** (not found) |
| In-app notification | **No** |
| User account created | **No** |
| Organisation created | **No** |
| Customer / CRM record created | **No** |
| Partnership request created | **No** |
| Task or follow-up workflow started | **No** |
| CarboCalc licence granted | **No** |

### Access model

- **Public** — route registered before `deserializeUser` and `authOrgAccess`; no authentication required.
- **No rate limiting** or CAPTCHA observed on the route.
- **No admin or authenticated endpoints** for list, get, update, or delete registrations in the customer API or admin routes inspected.

### Product field behaviour

- Validation accepts **any required string** for `product`.
- Only **`carbon-calculator`** has special business logic (confirmation email).
- **Other product values** may be stored for future use, but **no email or workflow** was found for them — **[Requires verification]** whether external forms submit other product identifiers.

### Email content note

The CarboCalc confirmation template includes **static marketing copy** (predicted **July** availability, exclusive early access). This is **not dynamically generated** from submission data beyond sending to the submitter’s email address. The template does **not** personalise with the submitter’s name (empty `{}` payload passed to sendMail).

### Comparison with Contact IMS

| Aspect | Register Public Interest | Contact IMS |
| ------ | ------------------------ | ----------- |
| Persistence | **Yes** | **No** (email only) |
| Duplicate prevention | **Yes** (email unique) | **No** |
| Submitter confirmation email | CarboCalc only | Demo booking yes; Get Started no |
| Internal team email | **No** | **Yes** |
| Auth required | **No** | **No** |

### Frontend / backend discrepancy

| Area | Backend | Frontend (this repo) |
| ---- | ------- | --------------------- |
| Registration form | Implemented | **Not found** |
| API client service | N/A | **Not found** |
| Success / error UI | API responses only | **Not found** |
| Internal review UI | No API for listing | **Not found** |

**Implementation suggests** the form lives on an **external marketing website** — confirmation required.

### Behaviour that could not be confidently determined

- Exact public website page, form design, and product options shown to visitors.
- Whether iMS staff access persisted registrations through **database tools**, a **separate admin application**, or manual processes outside this codebase.
- Whether registrations for products other than `carbon-calculator` are used in practice.
- How `req.accessControl` tenant/database connection behaves for unauthenticated requests on this route (record persistence depends on model connection setup at runtime).
