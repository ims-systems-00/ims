# Contact IMS

## 1. Module Overview

**Contact IMS** is a **public-facing lead-generation and enquiry capability** for prospective customers interested in iMS Systems. It allows anonymous visitors to submit two types of request:

1. **Demo booking request** — express interest in a product demo, including a preferred date and contact details.
2. **Get Started request** — express interest in starting with iMS, including a requested service and selected management standards.

Business logic is implemented **directly in the Contact IMS route file** (there is no separate controller). After validation, requests are **communicated by email only** — they are **not persisted** by the current route implementation. Success responses tell the submitter that their request has been recorded and that iMS will reach out.

The module sits on the **public API surface** (registered before session authentication middleware), so **no login is required**. It is intended for **prospective customers and website visitors**, not for authenticated organisation users managing in-app records.

**No dedicated Contact IMS UI** was found in the `ims-systems-frontend` application in this repository. The backend endpoints appear designed for an **external public website or API client** (for example the iMS marketing site). Backend capabilities exist without a matching frontend implementation in the admin application.

Database models for website bookings, closed dates, and Get Started requests exist elsewhere in the codebase but are **not connected** to the current Contact IMS routes — **implementation suggests planned persistence or legacy design, but confirmation is required**.

---

## 2. Features and Capabilities

### View booked / unavailable demo dates

- **Capability:** Retrieve dates that should be treated as unavailable for demo booking.
- **Who uses it:** Any anonymous or authenticated caller; intended for a public booking calendar UI if one exists.
- **Outcome:** Returns HTTP 200 with an **empty JSON array** `[]`.
- **Conditions:** **No dates are returned in the current implementation.** No database lookup, no use of the `closeddates` model, and no frontend consumer was found in this repository. With an empty list, a consuming calendar UI would treat **all dates as available** unless it applies its own client-side rules — **requires confirmation** whether an external website implements separate restrictions.

### Submit a demo booking request

- **Capability:** Submit personal, organisation, and contact information together with a **requested demo date** and optional additional notes.
- **Who uses it:** Anonymous prospective customers (public API).
- **Outcome:**
  - Internal iMS team receives an email titled *“iMS great news (New demo booked)”* with organisation name, requested date, and full contact details.
  - Submitting user receives a confirmation email (*“Thank You for Requesting a Demo”*) stating that a representative will contact them **to schedule the demo at a time that best suits them** — the submitted date is a **preference**, not a confirmed appointment.
  - API returns: *“Your request has been recorded, we will reach out to you in due course”*.
- **Conditions:** All required fields must pass validation. **No duplicate-booking prevention**, **no persistence** of the booking, and **no validation that the requested date is still available** (the booked-dates endpoint always returns empty). Multiple users can request the same date.

### Submit a Get Started request

- **Capability:** Submit personal and organisation contact details, a **requested service**, and boolean selections for seven management standards (ISO 27001, ISO 27002, ISO 20000, ISO 45001, ISO 9001, ISO 14001, ISO 22301).
- **Who uses it:** Anonymous prospective customers (public API).
- **Outcome:**
  - Internal iMS team receives an email titled *“iMS great news (New config request)”* with organisation name, contact details, requested service, and the submitted standard flags.
  - API returns: *“Your request has been recorded, we will reach out to you in due course”*.
  - **No confirmation email is sent to the submitting user** in the current implementation.
- **Conditions:** All common contact fields plus `service` and all seven ISO boolean fields are **required** (each must be present as `true` or `false`). Validation does **not** require at least one standard to be selected as `true`. Email dispatch is **not awaited** before the success response — **requires confirmation** whether email failures could occur without the user being notified.

### Receive validation errors on invalid submission

- **Capability:** Reject malformed requests with field-level validation messages.
- **Who uses it:** Any submitter whose request fails schema validation.
- **Outcome:** HTTP 400 with `{ message: "Validation error", errors: { fieldName: "..." } }`.
- **Conditions:** Applies to both demo booking and Get Started submissions.

---

## 3. User Outcomes / End Results

Because **no Contact IMS frontend exists in this repository**, outcomes below apply to **external website visitors or API clients** that call the public endpoints:

- **Create:** Submit a demo booking request or a Get Started / configuration enquiry without logging in.
- **View:** Demo date availability endpoint returns no blocked dates (empty list).
- **Manage:** Submitters **cannot** view, edit, or cancel prior requests through Contact IMS — no retrieval endpoints exist.
- **Change:** No update workflow after submission.
- **Information received:**
  - **Demo booking:** On-screen success message; email confirmation that the demo request was received and that iMS will follow up to arrange a suitable time.
  - **Get Started:** On-screen success message only — **no user email confirmation**.
- **Business actions enabled:** Prospective customers can initiate sales/demo enquiries that reach the iMS internal team by email. Requests are **requests for follow-up**, not confirmed bookings, onboarded organisations, or customer records in iMS.

---

## 4. Scope Boundaries

### In scope

- Public demo booking request submission with email to internal team and confirmation email to submitter.
- Public Get Started / configuration enquiry submission with email to internal team.
- Public booked-dates query (currently always empty).
- Request body validation for both workflows.
- Success and validation-error HTTP responses.

### Out of scope (handled elsewhere)

- **Authenticated product onboarding** — organisation creation, user signup, and onboarding flows in the admin application (`/admin/onboarding`, etc.) are separate.
- **Register Public Interest** — separate public endpoint that **persists** interest registrations and may send product-specific confirmation emails; not part of Contact IMS.
- **Report Bug / Jira Integration** — authenticated in-app product issue reporting for existing customers.
- **Customers / Organisation modules** — Contact IMS does **not** automatically create customer or organisation records.
- **Notifications module** — no in-app notifications are created for Contact IMS submissions.
- **Email Campaign module** — marketing campaigns are separate from these transactional enquiry emails.
- **Calendar / appointment scheduling** — no confirmed calendar booking, reminders, or two-way scheduling in Contact IMS.
- **Lead management UI** — no admin screen in this repository to list or manage Contact IMS submissions.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **Email (transactional)** | Primary output channel. Demo and Get Started requests are delivered to the iMS internal team via email templates; demo submitters also receive a confirmation email. |
| **Register Public Interest** | Related public lead-capture pattern on a separate route; persists registrations and handles duplicate-email checks. **Not integrated** with Contact IMS. |
| **Website data models** (`bookings`, `closeddates`, `getStarted`) | Schemas exist for storing demo bookings, closed dates, and Get Started requests, but **Contact IMS routes do not use them**. Relationship is **structural only / inactive**. |
| **Organisation / Customers / Users** | **No automatic link.** Submissions do not create or update organisation, customer, or user records. |

No confirmed links to Notifications, Billing, Email Campaign, or in-app onboarding workflows.

---

## 6. Current Data Model

Contact IMS **does not persist submitted requests** in the current route implementation. Business information exists only transiently during request processing and in sent emails.

| Entity / concept | Business meaning | Role in Contact IMS |
| ---------------- | ---------------- | ------------------- |
| **Demo booking request** | A prospective customer’s ask to see iMS, with preferred date and contact details | Accepted via API; emailed internally; **not stored** by Contact IMS routes |
| **Requested demo date** | The date the visitor prefers for a demo | Required string on submission; **not validated against availability**; treated as preference in user confirmation email |
| **Get Started request** | A prospective customer’s ask to begin using iMS with a stated service and standards interest | Accepted via API; emailed internally; **not stored** by Contact IMS routes |
| **Service interest** | Which iMS service the enquirer is interested in | Required free-text field on Get Started |
| **Management standard selections** | Which ISO-related standards the organisation is interested in | Seven required boolean flags on Get Started |
| **Unavailable demo date** | A date that should be blocked on a booking calendar | **Not returned** by current booked-dates endpoint; `closeddates` model exists but is unused |

### Unused persistence models (not part of active Contact IMS behavior)

| Model (observed in codebase) | Business meaning | Status |
| ---------------------------- | ---------------- | ------ |
| `bookings` | Stored demo booking records | **Not written** by Contact IMS routes |
| `closeddates` | Dates blocked for demo booking | **Not read** by booked-dates endpoint |
| `getStarted` | Stored Get Started enquiries | **Not written** by Contact IMS routes |

---

## 7. Attributes

### Shared contact attributes (both workflows)

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| **Name** | Submitter’s full name | Required; max 20 characters |
| **Email** | Submitter’s email address | Required; valid email format; max 50 characters |
| **Job title** | Submitter’s role at their organisation | Required |
| **Phone** | Contact phone number | Required; validated as string (no specific format rule observed) |
| **Organisation name** | Prospective customer’s company or institution | Required |

### Demo booking request — additional attributes

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| **Additional information** | Free-text notes from the submitter | Optional; may be empty string |
| **Booked date** | Preferred date for a demo | Required string; **not validated as a calendar date format**; **not checked against availability** |

### Get Started request — additional attributes

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| **Service** | Which iMS service or offering the enquirer wants | Required free-text string |
| **ISO 27001** | Interest flag for ISO 27001 | Required boolean (`true` or `false`) |
| **ISO 27002** | Interest flag for ISO 27002 | Required boolean |
| **ISO 20000** | Interest flag for ISO 20000 | Required boolean |
| **ISO 45001** | Interest flag for ISO 45001 | Required boolean |
| **ISO 9001** | Interest flag for ISO 9001 | Required boolean |
| **ISO 14001** | Interest flag for ISO 14001 | Required boolean |
| **ISO 22301** | Interest flag for ISO 22301 | Required boolean |

**Validation note:** All seven standard flags must be present, but **at least one `true` selection is not enforced**. The internal email lists the submitted boolean values in a fixed order — **Observed but business purpose unclear** whether `true`/`false` literals are the intended internal representation versus standard names.

---

## 8. Current UI Layout

### Main screens / pages

- **No Contact IMS screens, routes, forms, or API service clients** were found in `ims-systems-frontend`.
- The admin application’s onboarding *“Let's get started”* copy is **unrelated** — it refers to authenticated organisation setup, not Contact IMS Get Started enquiries.
- Document Management *“Important Alerts”* banners are **unrelated** UI alerts.

### Demo booking UI

- **Not implemented** in this repository’s frontend. Backend endpoint exists for an external consumer.

### Get Started UI

- **Not implemented** in this repository’s frontend. Backend endpoint exists for an external consumer.

### Date selection UI

- **Not found** in this repository. The booked-dates endpoint returns `[]`, so any external calendar would have **no server-provided blocked dates** from Contact IMS.

### Submission feedback (expected for external clients)

Based on backend responses only (no observed frontend):

| Workflow | Success feedback | User email confirmation | Error feedback |
| -------- | ---------------- | ----------------------- | -------------- |
| Demo booking | HTTP 200 — *“Your request has been recorded, we will reach out to you in due course”* | Yes — thank-you email; demo to be scheduled by representative | HTTP 400 — *“Validation error”* with per-field messages |
| Get Started | HTTP 200 — same success message | **No** | HTTP 400 — *“Validation error”* with per-field messages |
| Booked dates | HTTP 200 — empty array | N/A | HTTP 400 on server error |

### Navigation and workflow

- No in-app navigation to Contact IMS. Intended entry point is **external** (public website or direct API use) — **Current behavior could not be fully determined from the inspected code** for the exact public-site user journey.

### Material empty, loading, or restricted states

- Not applicable within the admin frontend — no UI. Booked-dates “empty state” is effectively **all dates appear available** to any consumer of that endpoint.

---

## 9. Miscellaneous / Module-Specific Information

### Public access model

- Contact IMS routes are registered **before** session deserialization and organisation access middleware.
- **Anonymous visitors can submit** demo and Get Started requests without authentication.
- **No role restrictions**, **no rate limiting**, and **no duplicate-submission prevention** were observed on these routes.
- Submitters **cannot retrieve** past submissions through Contact IMS.

### Demo booking vs confirmed appointment

The user confirmation email explicitly states that an iMS representative will contact the submitter **to schedule the demo at a suitable time**. Combined with:

- no persistence of bookings,
- empty booked-dates response,
- no duplicate prevention,

…the **requested date is a preference communicated to the internal team**, not a confirmed calendar slot. Manual follow-up by the iMS team is the implied operational next step — **inferred from email wording and absence of scheduling logic**, not from an automated workflow in the application.

### Booked dates endpoint — confirmed limitations

| Aspect | Current behavior |
| ------ | ---------------- |
| Response | Always `[]` |
| Database | Does not query `closeddates` or `bookings` models |
| Frontend usage in this repo | None found |
| Effect on availability | Any external UI would see **no blocked dates** from this API |
| Duplicate dates | **Allowed** — same date can be requested by multiple submitters |

**Implementation suggests this is a placeholder or stub** awaiting wiring to closed-date storage — **confirmation is required**.

### Get Started — email behavior difference

| Aspect | Demo booking | Get Started |
| ------ | ------------- | ----------- |
| Internal team email | Yes (awaited) | Yes (**not awaited** before HTTP response) |
| User confirmation email | Yes | **No** |
| Success HTTP message | Same wording for both | Same wording for both |

The shared success message (*“Your request has been recorded…”*) may **overstate** Get Started confirmation from the user’s perspective since no acknowledgement email is sent.

### Internal email recipients

Both workflows email multiple **iMS internal team** addresses (sales/support operations). Demo booking and Get Started use slightly different recipient lists. Recipients are fixed in route configuration, not selectable by the submitter.

### Management standards — backend behavior

- All seven ISO-related fields are **required booleans** on every Get Started submission.
- The frontend mechanism (checkboxes, toggles, etc.) **could not be determined** — no UI in this repository.
- Multiple standards can be marked `true` simultaneously; all `false` is technically valid under current validation.
- Internal email subject describes a *“New config request”*, indicating a **product configuration / onboarding enquiry**, not certification processing.

### Frontend/backend discrepancies

| Area | Backend | Frontend (this repo) |
| ---- | ------- | --------------------- |
| Demo booking form | Implemented | **Not found** |
| Get Started form | Implemented | **Not found** |
| Booked dates for calendar | Endpoint exists (always empty) | **No consumer found** |
| Persistence models | Exist separately | Routes do not use them |
| User email on Get Started | Not sent | N/A |

### Related public module comparison

**Register Public Interest** (`/register-public-interest`) also serves anonymous prospective customers but **persists** registrations, checks duplicate emails, and returns the saved record. Contact IMS is **email-only** and **does not** share that persistence pattern.

### Behavior that could not be confidently determined

- Whether an **external marketing website** (outside this repository) provides the Contact IMS forms and date picker.
- Whether unused `bookings`, `closeddates`, and `getStarted` models reflect **planned** persistence or **legacy** code paths.
- Whether Get Started email failures are acceptable given the non-awaited `sendMail` call.
- Intended business process after internal team receives enquiry emails (CRM, manual scheduling tools, etc.) — **not represented in application code**.

### Authorization note

This section documents the **business-visible access model**, not a security audit. Public anonymous submission is by design for lead generation.
