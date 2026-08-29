# Invitations

## 1. Module Overview

The **Invitations** module enables an organisation to **invite people by email to join the organisation** with a specified **organisation role**. An invitation is a pending offer of membership: it names the recipient’s email, the inviting organisation, and the role the recipient will receive if they accept. When accepted, the recipient becomes an **organisation member** through the **Memberships** module.

The module solves the problem of **onboarding new or existing iMS users into an organisation** without an administrator manually creating full user records and memberships in separate steps. Instead, an authorised user sends an invitation; the recipient receives an email with a link; after signing in, the recipient can join the organisation.

Primary users who **send and manage** invitations are **organisation administrators** — typically **Super Admin** and **Head of Service** roles, who can access invitation management in the **Users** area. **Recipients** interact with invitations through **email links**, the **accept-invitation onboarding screen**, and automatic routing during **system preparation** after login.

Invitations are **organisation-specific**, tied to **licence availability**, and **not** used to assign Functional Units (IAM groups), job titles, or other membership details at invite time — only the **role** is set on the invitation.

---

## 2. Features and Capabilities

### Invite a person to join the organisation

- **Capability:** Send an invitation to an email address, specifying the organisation role the recipient will receive upon acceptance.
- **Who uses it:** Organisation users with permission to invite — backend enforces **Users → invite** RBAC; frontend shows the action to users with **Invitation → create** permission (Super Admin and Head of Service in the default ability rules).
- **Outcome:** A persistent Invitation record is created. An email is sent to the recipient with subject *“iMS Invitation”* containing a personalised link. Success message *“Invitation sent successfully.”* The inviter sees a success notification naming the invited email.
- **Conditions:**
  - Inviter must belong to an organisation with a valid role.
  - **Email and role are required.** Role must be one of the system’s defined organisation roles (Super Admin, Head of Service, Basic User, Auditor, Internal Auditor, External Auditor, External User).
  - **Duplicate invitations blocked** — if the same email already has a pending invitation for this organisation, the request is rejected (*“User is already invited.”*).
  - **Existing members blocked** — if the email already belongs to a user who is a member of this organisation, the request is rejected (*“User already is a member of organisation.”*).
  - **Licence check** — the organisation must have an available user licence for the requested role (Super Admin licences are tracked separately from standard user licences). If insufficient, the request is rejected with a message directing the inviter to request more licences via licence management.
  - Recipient email is normalised to lowercase before storage.

### View sent invitations (organisation administrators)

- **Capability:** Browse a paginated, searchable list of invitations the organisation has sent.
- **Who uses it:** Users with **Invitation → manage** permission (Super Admin and Head of Service in default frontend rules). Shown on the **Invitations** tab within **Users**.
- **Outcome:** Table titled *“Invited people”* showing email, a **Sent** status label, sent/updated date, and action menu.
- **Conditions:** Listing is scoped to the authenticated user’s **organisation** when the user has an organisation context.

### View received invitations (recipients)

- **Capability:** Retrieve invitations addressed to the authenticated user’s email when they have **no organisation context** in their session.
- **Who uses it:** Logged-in users who have pending invitations but are not yet members of any organisation (or partnership).
- **Outcome:** Used by **system preparation** routing to detect pending invitations and redirect the user to the accept-invitation screen.
- **Conditions:** When the session has no `organizationId`, listing filters by the user’s **email address** instead of organisation.

### Resend an invitation

- **Capability:** Regenerate the invitation token and resend the invitation email to the same recipient.
- **Who uses it:** Organisation users with invite permission (backend: **Users → invite**; frontend: users who can access the Invitations tab).
- **Outcome:** A new signed token replaces the previous one. Email is resent with an updated link. Success notification *“Invitation resent”* in the UI. Backend message *“Invitation updated.”*
- **Conditions:** Invitation must exist. Previous token becomes invalid when a new one is issued (token on the record is overwritten).

### Remove (cancel) a pending invitation

- **Capability:** Permanently delete a pending invitation before it is accepted.
- **Who uses it:** Organisation users with invite permission.
- **Outcome:** Invitation record is deleted. UI notification *“Invitation removed”*. Backend message *“Invitation removed.”*
- **Conditions:** Invitation must exist. **Implementation comment suggests a licence is freed on removal, but no licence-decrement code was found.** **[Requires verification]**

### Accept an invitation (recipient)

- **Capability:** Join the inviting organisation with the role specified in the invitation.
- **Who uses it:** The invited person, after **logging in** with an account whose email matches the invitation.
- **Outcome:**
  - An **organisation membership** is created for the user with the invited role.
  - A user licence is consumed for the organisation (via membership creation).
  - The invitation record is **deleted** (consumed on acceptance).
  - User is redirected to the **system preparation screen**, which then routes them to organisation selection or other onboarding steps based on their new membership state.
- **Conditions:**
  - Recipient must be **authenticated** (access token required).
  - Invitation token must be supplied in the request header.
  - Token must be **valid and not expired** (72-hour lifetime).
  - Authenticated user’s email must **match** the email encoded in the invitation token.
  - A **user account must already exist** for that email — acceptance looks up the user record and creates membership with their user ID. **No account-creation step is part of the acceptance handler itself.** Recipients without accounts must register or sign in first (the accept screen redirects unauthenticated users to login with a return URL).
  - **Decline workflow:** **Not implemented.** No decline, reject, or ignore action was found.

### Automatic invitation routing after login

- **Capability:** After login and cache refresh, automatically direct users with pending invitations (and no existing organisation membership or partnership) to the accept-invitation screen.
- **Who uses it:** Any logged-in user in the system preparation flow.
- **Outcome:** Redirect to `/auth/onboard/accept-invitaion/{token}` using the **first** pending invitation returned by the list API.
- **Conditions:** Runs only when the user has **no memberships**, **no partnerships**, and **at least one pending invitation**. Email verification must be complete first.

---

## 3. User Outcomes / End Results

### For organisation administrators

- **Create:** Send email invitations for specific organisation roles to people who are not yet members.
- **View:** See all pending invitations the organisation has sent, with email and date information.
- **Manage:** Resend invitations (refreshes the link/token) or remove invitations that are no longer needed.
- **Change:** Cannot change role or email on an existing invitation — must remove and re-invite.
- **Information received:** Confirmation when invitations are sent, resent, or removed; list of pending invitees.
- **Business actions enabled:** Grow the organisation’s user base in a controlled, licence-aware way without manually provisioning accounts and memberships.

### For invitation recipients

- **Receive:** An email with the inviter’s name, organisation name, and a link to join.
- **View:** On the accept-invitation screen, a welcome message showing who invited them, which organisation, and which role.
- **Accept:** Join the organisation with the specified role by clicking **Join organisation**.
- **Information received:** Personalised invitation context from the token (sender name, organisation name, role).
- **Business actions enabled:** Gain organisation membership and proceed into normal iMS onboarding (organisation selection, dashboard access).

**What users cannot achieve through Invitations today (confirmed):**

- Decline or reject an invitation through the product.
- Accept an invitation without first having a user account and being logged in.
- Assign Functional Units (IAM groups), job titles, or line managers through the invitation itself.
- See a persisted invitation status beyond the UI’s static **Sent** label (no status field on the invitation record).

---

## 4. Scope Boundaries

### In scope

- Creating, listing, resending, and removing **organisation membership invitations** by email.
- Delivering invitation links via **transactional email**.
- **Token-based acceptance** that creates organisation membership with a specified role.
- **Licence availability checks** before sending invitations.
- **Recipient-side routing** to accept invitations during login/onboarding.

### Out of scope (handled elsewhere)

- **Direct user account creation** — administrators can create users directly via the Users module (`createUser` API); this is separate from sending invitations.
- **Membership management after acceptance** — role changes, job title, work location, groups, and removal are handled by the **Memberships** module and user detail screens.
- **Organisation creation** — handled by **Onboarding** / **Organisation** modules.
- **Partnership programme invitations** — separate workflow (Partnership module).
- **Functional Unit (IAM group) assignment** — not part of invitation create or accept.
- **Email verification** — handled by **Authentication**; must be complete before system preparation routes to invitation acceptance.
- **Licence purchasing or allocation** — handled by **License Management**; Invitations only checks availability.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **Users** | Invitations target people by **email**. Acceptance requires an existing **user account** matching that email. Invitation management UI lives within the **Users** screen (Invitations tab and Add user drawer). |
| **Organisation / Our iMS** | Every invitation belongs to one **organisation**. Acceptance adds the recipient as a member of that organisation. |
| **Memberships** | Accepting an invitation **creates a membership** linking the user to the organisation with the invited role. Membership is the durable outcome of a successful invitation. |
| **License Management** | Before sending an invitation, the system checks that the organisation has **available user licences** for the requested role. On acceptance, a licence is **consumed** through membership creation. Insufficient licences block new invitations. |
| **Authentication** | Recipients must **log in** before accepting. The accept screen redirects unauthenticated users to login. **Email verification** must be complete before system preparation routes to invitation acceptance. |
| **Onboarding** | The **accept-invitation page** (`/auth/onboard/accept-invitaion/:token`) and **system preparation** routing are part of the post-login onboarding flow for invited users. |
| **Email / transactional mail** | Invitations are **delivered by email** using the `account-invitation` template, including inviter name, organisation name, and acceptance link. |

No confirmed link to Functional Units (IAM groups), Notifications (beyond email), or Email Campaigns was found for invitation workflows.

---

## 6. Current Data Model

The Invitations module owns one dedicated persistent entity:

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| **Invitation** | A pending offer for a specific email address to join a specific organisation with a specific role. | Represents the **outstanding invite** from creation until acceptance or removal. |

**Relationships (confirmed):**

- Each Invitation belongs to one **Organisation** (via organisation plugin).
- Each Invitation references the **Creator** (user who sent it).
- Each Invitation stores a **signed token** encoding recipient email, organisation, role, sender name, and organisation name.
- On acceptance, the Invitation is **deleted** and a **Membership** record is created instead.

**No separate status, expiration date, or acceptance timestamp fields** exist on the Invitation record. Expiration is enforced through the **JWT token lifetime** (72 hours), not a stored date. The UI displays a static **Sent** label rather than reading a persisted status.

---

## 7. Attributes

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Email | The invited person’s email address. | Required. Normalised to lowercase. Must match the accepting user’s account email. |
| Role | The organisation role the recipient will receive on acceptance. | Required. One of: Super Admin, Head of Service, Basic User, Auditor, Internal Auditor, External Auditor, External User. Frontend invite form offers all except Auditor. |
| Token | Secure signed link credential embedded in the invitation URL and acceptance request. | Required. Regenerated on resend. Expires after **72 hours**. Encodes email, organisation, role, sender name, organisation name. |
| Organisation | The organisation the recipient is invited to join. | Set from inviter’s session. Scopes listing and business rules. |
| Created by | The user who sent the invitation. | Set from inviter’s session on create. |
| Created / updated timestamps | When the invitation was created or last updated (e.g. on resend). | UI “Sent on” column uses `updatedAt`. |

**Token payload attributes (business meaning, not stored separately on the record):**

| Attribute | Business meaning |
| --------- | ---------------- |
| Sender name | Displayed to the recipient as who invited them. |
| Organisation name | Displayed to the recipient as which organisation they are joining. |

---

## 8. Current UI Layout

Invitations does **not** have a standalone top-level navigation entry. It is **embedded within the Users module** under **Our iMS → Users**.

### Main entry points

| Entry point | Path / location | Who sees it |
| ----------- | ----------------- | ----------- |
| **Users → Add user** | `/admin/users` — **Add user** button opens a drawer | Users with **Invitation → create** permission (Super Admin, Head of Service) |
| **Users → Invitations tab** | `/admin/users` — **Invitations** tab | Users with **Invitation → manage** permission (Super Admin, Head of Service) |
| **Accept invitation** | `/auth/onboard/accept-invitaion/:token` | Invitation recipients (after login) |
| **System preparation redirect** | `/auth/preparation-screen` → auto-redirect | Recipients with pending invitations and no membership |

### Invitation creation workflow (Add user drawer)

1. Administrator clicks **Add user** on the Users page.
2. Drawer opens showing **OrganizationalOverview** (licence summary) and the **Invitation form**.
3. Administrator enters **Email** and selects **Role** from dropdown (Super Admin, Head of Service, Basic User, Internal Auditor, External Auditor, External User).
4. Administrator clicks **Confirm**.
5. On success: drawer closes, success notification (*“{email} is invited to your organisation.”*), invitation appears in the Invitations tab list.

### Invitations management view (Invitations tab)

- **Table title:** *Invited people*
- **Columns:** Email, Status (hardcoded **Sent**), Sent on (date/time), Actions
- **Actions menu per row:** **Resend**, **Delete**
- **Search and pagination** supported via shared query handlers
- **Empty state:** Table shows *“No data found”* when no invitations exist

### Recipient acceptance workflow

1. Recipient receives email with invitation link.
2. Recipient must **log in** (or register then log in) — unauthenticated users on the accept page are redirected to login with return URL.
3. Accept page shows:
   - Welcome heading with recipient’s name
   - Message: *“{senderName} has invited you to join {organizationName} as a {role}.”*
   - Illustration image
   - **Join organisation** button
4. On click: acceptance API called; button shows *“Please wait...”* while processing.
5. On success: redirect to **preparation screen**, which refreshes cache and routes based on new membership state (typically organisation selection).

### Material states

| State | Behaviour |
| ----- | --------- |
| **Loading (invite)** | Button shows *“Processing”* while invite submission is in progress |
| **Loading (accept)** | Button shows *“Please wait...”* and is disabled |
| **Success (invite)** | Toast notification with invited email |
| **Success (resend)** | Toast *“Invitation resent”* |
| **Success (remove)** | Toast *“Invitation removed”*; row removed from table |
| **Error** | Handled by shared error handler (toast/alert) — e.g. duplicate invite, insufficient licences, expired token |
| **Restricted** | Invitations tab and Add user button hidden for Basic User, Internal Auditor, External Auditor, External User (frontend ability rules) |

---

## 9. Miscellaneous / Module-Specific Information

### What an Invitation represents

An **Invitation** is a **pending organisation membership offer** sent to an email address. It is **not** a user account, **not** a group assignment, and **not** a generic email notification. Its sole confirmed purpose is to allow a recipient to **join an organisation with a predefined role** after authenticating.

### Invitation lifecycle (confirmed)

```
Created (invitation record saved, email sent)
  → Pending (record exists; token valid up to 72 hours)
    → Accepted → Membership created; invitation deleted
    → Removed → Invitation deleted by administrator
    → Expired → Token rejected on acceptance attempt ("Token expired.")
    → Superseded → Resend issues new token; old link invalid
```

**No decline path** exists. Expired or ignored invitations remain as records until removed by an administrator or accepted before token expiry.

### Licence interaction

- **Before invite:** System verifies the organisation has spare licence capacity for the role.
- **On accept:** Membership creation calls **licence utilisation** (increments used count).
- **On create (comment only):** Code comment states a licence is used at invitation time, but **no licence increment was found** in the create-invitation path. **[Requires verification]** — actual consumption appears to occur at **acceptance** via membership creation.
- **On remove (comment only):** Code comment states a licence is freed, but **no decrement was found**. **[Requires verification]**

### Acceptance prerequisites (critical)

Recipients **must already have an iMS user account** whose email matches the invitation. The acceptance handler looks up the user by email and creates membership — it does **not** create a new user. The email link includes a `hasAccount=true/false` query parameter, but **the frontend accept screen does not read this parameter**. **[Observed but business purpose unclear]** — may have been intended for registration routing that was not implemented.

### User access and permissions

| Action | Backend RBAC | Frontend visibility (default rules) |
| ------ | ------------ | ------------------------------------- |
| Create / resend / remove invitation | **Users → invite** | **Invitation → create** (Add user) / **Invitation → manage** (Invitations tab) — Super Admin, Head of Service |
| List invitations (org) | No RBAC middleware on GET | Invitations tab — Super Admin, Head of Service |
| Accept invitation | Authenticated user; token email must match session user | Any logged-in recipient with matching email |
| View single invitation by ID | No RBAC middleware on GET | **No confirmed UI consumer** |

**Permission naming discrepancy:** Backend uses **Users / invite**; frontend gates UI with **Invitation / create** and **Invitation / manage**. Both layers restrict Basic User and auditor-type roles from invitation management in their default ability definitions, but the **service and action names differ**.

**Potential backend gap:** Backend `enforceRbac` checks `ability.can('invite', 'Users')`. Default abilities grant `MANAGE` on `all` for Basic User with `cannot(MANAGE, Invitation)` — but **Users / invite** is not explicitly blocked for Basic User on the backend. **[Requires verification]** whether Basic User can call the invite API despite the hidden UI.

### Frontend / backend discrepancies

| Area | Backend | Frontend |
| ---- | ------- | -------- |
| Permission service | Users + invite | Invitation + create/manage |
| Invitation status | No persisted status | Hardcoded **Sent** |
| Role options | All ROLES enum values | Auditor omitted from dropdown |
| Licence consumption | At membership creation (accept) | N/A |
| hasAccount URL param | Set in email link | Not read by accept screen |
| Decline invitation | Not implemented | Not implemented |

### Linked modules not involved

- **Functional Units / IAM Groups:** No group assignment on invite or accept.
- **Notifications module:** Email only; no in-app notification for invitations was confirmed.
- **Data Import:** Invitation import validation template exists but contains **no rules** (generated stub only).

### Unclear or partially implemented behaviour

- Whether licences should be consumed at **invite time** or **accept time** (comments vs code differ).
- Whether removing a pending invitation should **free a reserved licence**.
- Whether **Basic User** can invoke invite APIs despite UI restrictions.
- Purpose of **`hasAccount`** query parameter on invitation links.
- Why **Auditor** role is valid in backend validation but omitted from the frontend role dropdown.
