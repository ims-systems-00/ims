# Jira Integration

## 1. Module Overview

The **Jira Integration** module in iMS provides a **customer support issue reporting channel** for organisation users to submit bugs, feature requests, enhancements, and questions to the iMS product team. In the product UI this appears as **Report Bug** (`/admin/reportissue`), not as a general Jira workspace.

Despite the module name and Jira client libraries in the backend, the **primary user-facing workflow does not create Jira tickets today**. When a user submits a report, the application **emails** the iMS support team and sends a confirmation email to the reporter. Backend endpoints also exist to **list and retrieve Jira issues** from a central Atlassian instance, but **no frontend screen currently uses those read operations**.

The module solves the problem of giving customers a structured way to report product issues from within iMS, automatically including reporter and organisation context, without requiring users to connect their own Jira accounts.

Primary users are authenticated organisation members with **Our iMS Read** permission and the **Incident Management partner licence** (as configured in navigation): Super Admin, Head of Service, Basic User, and Auditor roles.

Jira access is **centrally configured** on the server (fixed Atlassian host and service account). Users do not connect Jira, select projects, or manage credentials in the application.

---

## 2. Features and Capabilities

### Submit a product issue report (Report Bug)

- **Capability:** Submit a structured issue report with category, title, and description.
- **Who uses it:** Users with access to the **Report Bug** sidebar entry.
- **Outcome:** Success message *“Your response has been recorded. One of the iMS systems administrator will contact you soon”*; reporter receives confirmation email; iMS support receives forwarded email with report details and reporter context.
- **Conditions:** **Category**, **Title** (minimum 8 characters), and **Description** are required. Categories: Bug, Feature request, Enhancement, Question. Submission is manual — there is no automatic ticket creation from incidents, risks, tasks, or other modules.

### Receive email confirmation of submission

- **Capability:** Reporter automatically receives acknowledgement that the report was recorded.
- **Who uses it:** The submitting user (email from session).
- **Outcome:** Email with subject *“Confirmation - Your Bug Report has Been Recorded”* explaining the team will review and follow up via support@imssystems.tech.
- **Conditions:** Sent only when submission succeeds.

### Forward report to iMS support (backend)

- **Capability:** Automatically notify iMS support with full report and reporter context.
- **Who uses it:** Backend process triggered by submission; not a user action.
- **Outcome:** Email to iMS support addresses with summary, description, type, reporter name, email, organisation name, business unit identifier, and optional contact field.
- **Conditions:** Triggered on successful `createTicket` processing.

### List Jira issues (backend only — no user UI)

- **Capability:** Search Jira for issues matching a predefined query and return paginated results.
- **Who uses it:** **No frontend consumer observed.** API-only capability.
- **Outcome:** Returns Jira issue search results (up to 30 per request, optional `startAt` offset).
- **Conditions:** Uses authenticated session; queries a **hardcoded Jira project and filter** (see Miscellaneous). Does not filter by the current user’s organisation in the JQL observed.

### Retrieve individual Jira issue (backend only — no user UI)

- **Capability:** Fetch one Jira issue by key or ID from the central Atlassian instance.
- **Who uses it:** **No frontend consumer observed.** API-only capability.
- **Outcome:** Returns full Jira issue payload from external API.
- **Conditions:** Requires issue identifier in request path. **No observed access check** tying the issue to the requesting user’s organisation.

---

## 3. User Outcomes / End Results

- **Create:** Users can report a product bug, feature request, enhancement, or question from within iMS.
- **View:** Users see a submission form and success confirmation; they do **not** see a list of their reports or Jira ticket status in the application.
- **Manage:** Users cannot update, assign, close, or delete reports from iMS.
- **Change:** No edit workflow after submission.
- **Information received:** Confirmation that the report was recorded and that an administrator will contact them; email confirmation with follow-up guidance.
- **Business actions enabled:** Structured product feedback channel to iMS support with automatic reporter and organisation context; reduces need for users to email support manually.

---

## 4. Scope Boundaries

### In scope

- **Report Bug** screen and submission form.
- Email forwarding to iMS support on submission.
- Email confirmation to reporter.
- Backend Jira API client for listing and retrieving issues (unused by current UI).
- Central server-side Jira configuration.

### Out of scope (handled elsewhere or not implemented)

- **Operational module ticketing** — incidents, risks, tasks, audits, OFIs, CQC, etc. do **not** create Jira tickets through this module.
- **User Jira connection / OAuth** — no user-facing Jira account linking.
- **Jira project selection** — not exposed to users.
- **Ticket lifecycle management in iMS** — no update, assign, comment, or close from the application.
- **Bidirectional Jira synchronization** — no webhooks or status sync observed.
- **Local ticket storage** — no dedicated ticket database model.
- **Viewing submitted reports in iMS** — list/detail Jira endpoints exist but have no UI.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **Our iMS** | Navigation permission (**Our iMS Read**) gates access to Report Bug. |
| **Organisation / Users** | Reporter name, email, organisation name, and organisation ID are automatically included in support emails from the user session. |
| **Functional Units** | User’s business unit ID (`groupId`) is included in the forwarded support email as context. |
| **Incident Management (licensing)** | Report Bug navigation requires **Incident Management partner licence** — licensing gate only; **no workflow link** to incident records. |
| **Email / Notifications** | Submission uses email templates for support forward and user confirmation. |

**No confirmed links** to Risk Management, Incidents, Audits, OFI, Tasks, Compliance, CQC, CRM, or Suppliers for Jira ticket creation or retrieval.

---

## 6. Current Data Model

The Jira Integration module **does not own a persisted ticket entity** in the application database. No Jira-related MongoDB model was found.

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| **Issue report (transient)** | In-memory payload built from form + session on submission | Passed to email templates; returned in API response; **not saved locally** |
| **Jira issue (external)** | Issue record in central Atlassian Jira instance | Retrieved only by backend list/get endpoints; not stored in iMS |
| **Email notification** | Forwarded support request and user confirmation | Actual persistence of the “ticket” from the user’s perspective today |

Submission workflow:

1. User completes Report Bug form.
2. Backend builds issue object from form fields + session user context.
3. Emails sent to support and reporter.
4. API returns success with issue object in response — **no local database write**.

---

## 7. Attributes

### User-submitted report (form)

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Category | Type of report: Bug, Feature request, Enhancement, or Question | Required; sent as `type` |
| Title | Short summary of the issue | Required; minimum 8 characters; sent as `summary` |
| Description | Detailed explanation, steps to reproduce, expected vs actual behaviour | Required; supports @-mention suggestions in UI |

### Automatically attached context (on submission)

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Reporter name | Name of submitting user | From session |
| Reporter email | Contact email for follow-up | From session; confirmation sent here |
| Organisation name | Customer organisation | From session |
| Organisation ID | Internal organisation identifier | Appended to organisation name in support email |
| Business unit | User’s Functional Unit ID | From session `groupId`; included in support email |
| Contact | Additional contact detail | Accepted by backend body but **not collected in current form** |

### Jira issue (external, list/get endpoints only)

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Issue key / ID | Jira identifier | Used by get endpoint |
| Jira fields | Status, summary, description, etc. | Returned as raw Jira API payload — **not displayed in iMS UI** |

---

## 8. Current UI Layout

### Standalone Jira Integration screen

**None dedicated to Jira.** User-facing functionality is the **Report Bug** screen only.

### Report Bug (`/admin/reportissue`)

**Navigation:** Sidebar entry **Report Bug** (bug icon).

**Layout:** Single column (half-width on desktop) with heading *“Report an issue”* and instructional italic text asking users to describe what happened, steps to reproduce, expected behaviour, and actual outcome.

**Form fields:**

- **Category** — dropdown: Bug, Feature request, Enhancement, Question.
- **Title** — text input.
- **Description** — large textarea (14 rows) with user @-mention suggestions.

**Primary action:** **Create** button (shows *Processing* while submitting).

**Success state:** Toast/notification *“Your response has been recorded. One of the iMS systems administrator will contact you soon”*.

**Error state:** *“Unknown server error occurred”* on failure.

**Empty / loading:** No list view; form starts empty. No dedicated loading skeleton beyond button processing state.

**Restricted access:** Hidden without **Our iMS Read** permission and **Incident Management partner licence** (navigation configuration).

### Ticket list or detail UI

**None observed.** No frontend calls to list or retrieve Jira tickets. Users cannot view ticket status, Jira keys, or open issues in Jira from the application.

---

## 9. Miscellaneous / Module-Specific Information

### Actual business purpose vs module name

The module is named **Jira Integration**, but the **only confirmed user workflow** is **Report Bug** — a **support request / product feedback form** delivered by email. The `createTicket` operation **does not call the Jira API** to create issues; it only sends emails. Jira client code is used for **read** endpoints that have **no frontend**.

### Jira connection and configuration

| Aspect | Behaviour |
| ------ | --------- |
| User connection | **None** — users do not connect Jira accounts |
| Organisation configuration | **None** — no per-organisation Jira settings in UI |
| Server configuration | Central Atlassian host and service credentials on backend; API token from environment variable |
| Project selection | **Not user-facing**; list query hardcoded to project **CS** |
| Legacy config file | Alternate `jira-connector` config exists but **is not used** by the active controller |

Users have **no visibility** into Jira configuration.

### Ticket creation workflow (confirmed cross-layer)

1. User opens **Report Bug** and completes form.
2. Frontend posts category, title, description to jira-integration API.
3. Backend builds issue object with session user context.
4. Backend sends **bug-report-forward** email to iMS support.
5. Backend sends **bug-report-confirmation** email to reporter.
6. API returns `{ message: "Issue created.", issue }` — **misleading message**; no Jira issue is created.

### Ticket listing workflow (backend only)

- JQL observed: `project = CS AND status = Reported AND tenant ~ localhost order by created DESC`
- **Implementation suggests this is development or placeholder configuration** — `tenant ~ localhost` does not match production multi-tenant behaviour.
- Reporter user is loaded from database but **not used** in the JQL filter.
- Max 30 results; `startAt` pagination parameter supported.

### Synchronization

| Direction | Supported? |
| --------- | ---------- |
| Create in Jira from iMS | **No** (email only) |
| Read from Jira | **Yes** (API only, no UI) |
| Update Jira from iMS | **No** |
| Jira webhooks / status sync | **No** |
| Local ticket storage | **No** |

Integration is **one-way read-capable at API level** but **effectively email-only** from the user’s perspective.

### Ticket lifecycle inside the application

| Action | Supported in iMS? |
| ------ | ----------------- |
| Submit report | **Yes** |
| View own reports | **No** |
| View Jira ticket list | **No UI** |
| Open individual ticket | **No UI** |
| Update / assign / close | **No** |
| Delete | **No** |

External ticket management, if any, happens outside iMS (email/Jira directly by support team).

### Access and security

- Jira-integration routes sit **after** organisation access middleware — authenticated organisation session required.
- Routes have **no module-specific RBAC** enforcement (empty middleware arrays on routes).
- Frontend gates **Report Bug** via **Our iMS Read** and partner licence on navigation.
- `getTicket` retrieves any issue key supplied — **no observed check** that the requester owns or should see that issue.

### Frontend / backend discrepancies

| Topic | Discrepancy |
| ----- | ----------- |
| Module naming | Called Jira Integration; user UI is **Report Bug**; create does not use Jira |
| Success message | API says *“Issue created”*; user sees *“response has been recorded”*; neither creates a Jira ticket |
| Read endpoints | Backend supports list/get Jira issues; **frontend never calls them** |
| Contact field | Backend accepts `contact`; form does not collect it |
| Unused code | `getJira()` connector config unused; `reporter` loaded but unused in list; `console.log` in create handler |

### Unclear or unconfirmed behaviour

- Whether support staff manually create Jira tickets from forwarded emails (**Observed but business purpose unclear** — outside application scope).
- Intended production JQL for `getTickets` — current query appears non-production.
- Whether list/get endpoints were built for a planned UI that was never shipped (**Implementation suggests this behavior, but confirmation is required**).
- Whether any external system consumes the list/get APIs directly.
