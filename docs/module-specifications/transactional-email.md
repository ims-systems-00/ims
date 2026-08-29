# Transactional Email

## 1. Module Overview

The **Transactional Email** module manages **opt-in notification access invitations** for external email addresses. An organisation user can register an external recipient’s email address, and the system sends a **single-purpose invitation email** asking that person to accept receiving notifications from the inviting organisation on iMS. The recipient must verify via a time-limited link before the address is marked as verified in the system.

In the current implementation, this module is **not** a general transactional-email platform for the whole application. Many other business events (account invitations, password reset, licence requests, partnership emails, etc.) send email through the shared mail service **without** using this module’s records or routes. Transactional Email specifically covers the **notification-access invitation** workflow backed by persistent **txn email** records.

The module is **primarily backend/supporting functionality**. No dedicated frontend screens, management UI, or verification page were found in the current frontend codebase. Organisation users would interact with it only if another UI or integrator calls the backend API; recipients interact via the email link (which points to a frontend route that **does not currently exist**).

Primary intended beneficiaries:

- **Organisation users** who need to invite external contacts to receive organisation notifications.
- **External recipients** who opt in by accepting the invitation email.

---

## 2. Features and Capabilities

### Invite an external email to receive organisation notifications

- **Capability:** Register an external email address for the current organisation and send an invitation email with an acceptance link.
- **Who uses it:** Authenticated organisation session users (via backend API; no confirmed frontend UI).
- **Outcome:** A **txn email** record is created (`isEmailVerified: false`), and the recipient receives an email titled **“iMS Invitation”** (default subject) explaining they have been invited to receive notifications from the inviting organisation, with an **Accept Invitation** button/link.
- **Conditions:**
  - Email must be valid format.
  - If the email already exists **and is verified**, request is rejected — *“An account is already registered with this email.”*
  - If the email already exists **but is not verified**, request is rejected — *“A verification email has already been sent to this address.”* (no automatic resend).
  - Verification link token expires in **10 minutes** (600 seconds).

### Verify notification-access invitation

- **Capability:** Recipient submits the verification token from the invitation link to confirm opt-in.
- **Who uses it:** External recipient (public auth endpoint; no login required).
- **Outcome:** Matching **txn email** record is updated to **`isEmailVerified: true`**.
- **Conditions:** Token must be valid and not expired; a txn email record must exist for the email in the token. Expired or invalid token returns *“This verification has been expired.”*

### View txn email records for the organisation

- **Capability:** List or retrieve individual txn email records belonging to the current organisation.
- **Who uses it:** Authenticated organisation session users (backend API only in current codebase).
- **Outcome:** Paginated list searchable by email, or single record by ID.
- **Conditions:** List is **organisation-scoped**. Single get-by-id uses ID only (organisation filter not applied on get).

### Remove a txn email record

- **Capability:** Permanently delete a txn email record from the catalogue.
- **Who uses it:** Authenticated organisation session users (backend API only).
- **Outcome:** Record is hard-deleted; no soft-delete or audit trail beyond removal response.
- **Conditions:** Record must exist. **No check** whether the address was verified or whether downstream notification delivery depends on it.

---

## 3. User Outcomes / End Results

### For organisation users (via API)

- **Invite** an external email address to opt in to organisation notifications.
- **View** a list of invited addresses and their verification state (via list/get API).
- **Remove** an invited address from the organisation’s txn email catalogue.

### For external recipients

- **Receive** an invitation email naming the inviting organisation.
- **Accept** the invitation by using the verification link (intended workflow).
- **Outcome after verification:** Email address marked verified in the txn email record.

### What users cannot achieve through this module today (confirmed)

- Manage invitations through a **dedicated frontend screen** — none exists.
- Complete verification through the **linked frontend route** — email link targets `/auth/txl-email/verify/{token}` but **no matching frontend route** was found.
- **Resend** an invitation if one is already pending (duplicate unverified email is rejected).
- Rely on verified txn emails for **actual notification delivery** — `isEmailVerified` is set on acceptance but **no other module reads this flag** to send notifications to verified external addresses.
- Send **bulk**, **marketing**, or **campaign** email — that is the **Email Campaign** module.
- Use this module for **password reset**, **account invitation**, **licence requests**, or other system emails — those use separate mail templates outside this module.

---

## 4. Scope Boundaries

### In scope

- **Notification-access invitation** workflow for external email addresses.
- **Persistent txn email records** (email, verification status, organisation, timestamps).
- **Single fixed email template** (`txn-email-invitation` / “iMS Notification Access”).
- **JWT-based verification link** generation and public verification endpoint.
- **Organisation-scoped CRUD** (create, list, get, hard delete) behind authenticated org session.

### Out of scope (handled elsewhere)

- **Email Campaign module** — bulk CRM campaigns to customers (draft, launch, recipients, delivery tracking).
- **Other transactional emails** — welcome, forgot-password, account-invitation, partnership, contact-ims, dashboard reports, etc. sent via shared `sendMail` without txn email records.
- **In-app Notifications module** — user notifications inside the application for logged-in users; does not reference txn email records.
- **Email template management UI** — template is a fixed backend EJS file, not user-editable through this module.
- **SMTP/provider configuration** — infrastructure concern, not this module’s business scope.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **Authentication (v3 Auth)** | Hosts the **public verification endpoint** (`txn-email-verification`) that marks txn emails as verified when the recipient submits the invitation token. |
| **Organisation** | Each txn email record belongs to an organisation; invitation email includes the **inviting organisation’s name**; create/list scoped to session organisation. |
| **Email (shared mail service)** | Delivers the **txn-email-invitation** message using a fixed template; one email type owned by this module’s create flow. |
| **Email Campaign** | **Separate module.** Bulk customer marketing with campaigns, audiences, and delivery records — not txn email invitations. |
| **Notifications (in-app)** | **No confirmed link.** In-app notifications target registered users; txn email verification status is **not used** when creating or sending notifications. |
| **Users / Membership** | **Indirect only.** Duplicate check error message references “account already registered” when email is verified, but txn emails are **separate records** from user accounts. |

---

## 6. Current Data Model

The module owns one persistent business entity: the **Txn Email** record.

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| **Txn Email** | An external email address invited to receive organisation notifications | Created on invite; stores verification state; deleted on hard remove |
| **Organisation link** | Which organisation sent the invitation | Set on create from session; scopes list queries |
| **Verification state** | Whether the recipient accepted the invitation | `false` on create; set `true` after successful token verification |

There is **no separate template record**, **no send-history log**, and **no delivery-status tracking** beyond the verification flag on the txn email record itself.

Email content (subject, body) is **not stored** on the record — it is generated at send time from a fixed template.

---

## 7. Attributes

### Txn Email record

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| **Email address** | External recipient invited to receive notifications | Required; **globally unique** across the system (not per organisation) |
| **Email verified** | Whether the recipient accepted the invitation | Default `false`; set `true` on successful verification |
| **Organisation** | Inviting organisation | Set automatically on create |
| **Created / updated timestamps** | When the record was created or last changed | System timestamps |

### Invitation email content (not persisted on record)

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| **Sender organisation name** | Which organisation invited the recipient | Passed to template at send time from session |
| **Verification link** | One-time acceptance URL | JWT token embedded; expires in 10 minutes; points to frontend path `/auth/txl-email/verify/{token}` |
| **Subject** | Email subject line | Default **“iMS Invitation”** unless overridden in mail config |
| **Message body** | Invitation explanation | Fixed template text: invited to receive notifications from `{organisation}`; **Accept Invitation** button |

### Verification token (transient)

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| **Email** | Recipient address being verified | Encoded in JWT |
| **Organisation** | Inviting organisation context | Encoded in JWT |
| **Expiry** | Time limit to accept | 600 seconds from creation |

---

## 8. Current UI Layout

### Standalone UI

**None identified.** No frontend pages, routes, forms, or API service calls targeting `/txn-emails` or `/txn-email-verification` were found in the frontend codebase.

### Intended recipient verification flow (email link)

- **Email CTA:** “Accept Invitation” button linking to `{CLIENT_URL}/auth/txl-email/verify/{token}`.
- **Expected UI:** A verification screen that submits the token to the auth verification endpoint.
- **Current state:** Frontend auth routes include account verification and password setup, but **no `/auth/txl-email/verify/:token` route** exists. **Implementation suggests the recipient workflow is incomplete.**

### Organisation user interaction

- **Current state:** Invitation create/list/delete would require **direct API use** or an unconfirmed external integrator — no in-product management table, compose form, or history screen.

### Loading, success, and error states (API-level, where observable)

- **Create success:** Response message *“Txl Email sent successfully.”*
- **Create errors:** Duplicate verified/unverified email messages; token signing failure.
- **Verify success:** *“Txn email verified successfully.”*
- **Verify errors:** Expired token; txn email not found.
- **Delete success:** *“Txl Email removed.”*
- **List/get success:** Standard paginated list or single record response.

No user-facing toasts, loaders, or error banners exist without a frontend consumer.

---

## 9. Miscellaneous / Module-Specific Information

### What Transactional Email represents in this product

Unlike the broad set of system emails sent across iMS, this module implements one specific business process: **inviting external email addresses to opt in to receiving notifications from an organisation**, with a persisted record and verification step.

The email template heading is **“iMS Notification Access”**, reinforcing that the business purpose is **notification opt-in**, not marketing or account registration.

### Transactional Email vs Email Campaign

| Aspect | Transactional Email (this module) | Email Campaign |
| ------ | --------------------------------- | -------------- |
| **Purpose** | Opt-in invitation for external notification access | Bulk CRM communication to customers |
| **Audience** | Single external email per invite action | Customer stages and/or selected customers |
| **Trigger** | Manual API create by org user | User launches campaign from CRM UI |
| **Content** | Fixed template | User-composed subject, body, attachments |
| **Persistence** | Txn email record + verification flag | Campaign + delivery records |
| **Frontend** | None confirmed | Full CRM Email Campaign UI |

### Transactional Email vs other system emails

Many auth, onboarding, partnership, and operational emails use the shared mail service directly. Those emails are **transactional in the everyday sense** but **outside this module’s scope** — they do not create txn email records or use `/txn-emails` routes.

### Sending behaviour

| Step | Automatic / manual |
| ---- | ------------------ |
| **Create invite (API call)** | **Manual** — triggered by authenticated org user (or API client) |
| **Send invitation email** | **Automatic** — immediately after record creation on successful create |
| **Mark verified** | **Manual from recipient side** — recipient must submit token via verification endpoint (intended via email link) |

### Duplicate and global uniqueness rules

- Email addresses are **unique system-wide** on the txn email model.
- An address verified once cannot be invited again (treated as already registered).
- A pending (unverified) address cannot receive a second invitation through create — user must wait or an administrator must delete the record first.

### Access and permissions

- **`/txn-emails` routes:** Behind **authOrgAccess** — authenticated organisation session required. **No module-specific RBAC middleware** on individual endpoints.
- **`/auth/txn-email-verification`:** Public (mounted on auth routes before org access middleware). Recipient needs only the token.

### Downstream use of verified emails

**Current behavior could not be fully determined from the inspected code** for how verified txn emails feed notification delivery. The `isEmailVerified` flag is written on verification but **is not read** by the Notification service or other email-sending logic in confirmed code paths. **Implementation suggests the opt-in catalogue may be preparatory or incomplete.**

### Frontend / backend discrepancies

| Topic | Observation |
| ----- | ----------- |
| **Verification page** | Email link targets `/auth/txl-email/verify/{token}`; **no frontend route** implements this. |
| **Management UI** | Full CRUD API exists; **no frontend consumer** found. |
| **Resend pending invite** | Comment in service suggests resend could happen for unverified duplicates; implementation **throws error instead**. |
| **Naming** | API messages use “Txl Email”; model and auth use “Txn email” — inconsistent labelling. |
| **Get by ID** | List is org-scoped; get-by-id does not enforce organisation match. |

### Behaviour that could not be confidently determined

- Which product role or screen was intended to call the create/list/delete API.
- Whether verified txn emails were planned to receive organisation notifications by email (beyond in-app notifications to registered users).
- Whether external integrators or admin tools consume the API outside this repository.
- Business meaning of globally unique email vs organisation-scoped list (one address cannot be invited by two organisations if already in catalogue).
