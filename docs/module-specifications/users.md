# Users

## 1. Module Overview

The **Users** module is how an organisation manages the people who use the iMS platform: inviting colleagues, viewing who belongs to the organisation, maintaining profile and employment information, controlling system access, assigning compliance tool access, and safely removing users when they leave.

A **User** in this product is not only a login account. The system separates:

- **Global user identity** — name, email, password, profile image, system-wide access status, and IAM access policies (which business units and platform roles the person can operate under).
- **Organisation membership** — employment-specific information for one organisation: job role, job title, salary, leave entitlement, line managers, work shift, business unit (group) membership, and related HR-oriented fields.

The module solves the problem of keeping an accurate, organisation-scoped directory of people, their employment context, and their relationship to platform access—while coordinating with invitations, licensing, and data ownership across other modules.

Primary users are **Super Admins** and administrators with Users service permissions (create, read, update, delete). Individual users interact with the module mainly through **their own profile** (name, photo, password, theme preferences, business unit switching). Group-level access grant/revoke and adding users to business units are exposed primarily through the **Groups (Our iMS)** module, though they call Users backend capabilities.

---

## 2. Features and Capabilities

### Invite a user to the organisation

- **Capability:** Send an invitation by email with a chosen organisation role (Super Admin, Head of Service, Basic User, Internal Auditor, External Auditor, or External User).
- **Who uses it:** Users with **Invitations → Create** permission (the “Add user” action is gated on Invitations, not Users Create).
- **Outcome:** An invitation record is created and the invitee can complete onboarding to join the organisation. The invited person does not immediately appear as a full member until the invitation/membership workflow completes.
- **Conditions:** Direct user creation through the Users API is **blocked** in the current backend (`authCreatePermission` always returns an error). The product’s supported path is invitation-based onboarding plus membership creation, not the legacy direct-create form.

### Browse and search organisation users

- **Capability:** View a paginated list of users belonging to the current organisation, searchable by name, email, job title, and workplace-related fields.
- **Who uses it:** Users with **Users → Read** permission.
- **Outcome:** Administrators see name, email, job title, user type (membership role), system access status, and last logged-in time. Clicking a row opens the user detail page.
- **Conditions:** The list backend only returns users whose **system access status is Active** and who have a membership in the caller’s organisation. Despite the tab label “All Users”, blocked, deactivated, or non-active-access users are **not** included in this listing. A separate **Invitations** tab appears for users with **Invitations → Manage**.

### View user detail (classified information)

- **Capability:** Open an individual user’s profile showing identity, business unit membership, basic personal information, and employment details including salary.
- **Who uses it:** Users with **Users → Read** for admin views; any logged-in user for their own profile via the navbar.
- **Outcome:** Administrators and the user themselves can review the person’s name, email, avatar, assigned business units, role, job type, job title, salary, country, leave entitlement, TOIL balance, and line managers.
- **Conditions:** The detail page loads **classified information** (full profile plus organisation membership). **Basic information** retrieval exists as a separate backend capability intended to omit sensitive fields, but in the current implementation both basic and classified responses return the same membership object including salary—the distinction is **not materially enforced** on membership data today.

### Edit basic profile information (self-service)

- **Capability:** Change first name and last name on one’s own profile.
- **Who uses it:** The logged-in user viewing their own profile.
- **Outcome:** Display name and legal-style name fields update across the product.
- **Conditions:** Only available when viewing your own profile (“Edit profile” drawer).

### Upload or change profile photo

- **Capability:** Upload and crop a profile image shown on the user card, navbar, and elsewhere the avatar is referenced.
- **Who uses it:** The user themselves (entity access control restricts photo editing to the profile owner).
- **Outcome:** Profile image URL updates after upload to object storage.
- **Conditions:** Dedicated profile-image retrieval endpoint returns an **empty response** (stub). The UI uses the stored image URL directly.

### Manage employment details (administrative)

- **Capability:** Update organisation-scoped employment fields: work location type, job title, salary, country, leave days entitled, line managers, and weekly work-shift hours/time zone.
- **Who uses it:** **Super Admin** only (via “Manage” drawer on Employment details).
- **Outcome:** Membership record updates; changes affect how the person is represented in HR-oriented views and downstream modules that read membership (for example leave entitlement, dashboard people-cost calculations).
- **Conditions:** Employment data lives on **membership**, not on the global user record.

### Change a user’s organisation role

- **Capability:** Change the membership role (for example from Basic User to Head of Service).
- **Who uses it:** **Super Admin**, and only when viewing another user’s profile (not self).
- **Outcome:** Role updates on membership; the user’s refresh tokens are cleared, forcing re-authentication on next activity.
- **Conditions:** Role change does **not** automatically re-check or adjust user license counts in the observed Users-route flow. License consumption/release is tied to membership create/hard-delete in the Membership service.

### Switch active business unit (self-service)

- **Capability:** Switch which business unit (IAM group) the logged-in user is currently operating under.
- **Who uses it:** The user on their own profile, when they belong to multiple business units.
- **Outcome:** Active session context changes to the selected business unit; the page reloads to the dashboard under the new context.
- **Conditions:** Implemented via the **policy signature** backend action, which switches IAM access policy and re-issues tokens—not legal document signing (see Miscellaneous).

### Assign compliance toolkit access

- **Capability:** Grant one or more compliance toolkit licences to a user’s IAM policies (Super Admin, Head of Service, or Auditor policy types).
- **Who uses it:** Users with **Users → Create** permission on the hidden **Tool Access** route (`/admin/users/:id/tools`).
- **Outcome:** Selected compliance tools are granted on matching access policies; **all active sessions for that user are terminated** so new permissions take effect on next login.
- **Conditions:** Available toolkit options come from organisation compliance-tool licensing and IAM policy resources.

### Remove a user from the organisation (delete flow)

- **Capability:** Remove a person from the organisation after checking whether they own data elsewhere, optionally transferring ownership first.
- **Who uses it:** Users with **Invitations → Delete** permission (delete row action—not Users Delete permission).
- **Outcome:** If the user owns records in other modules, the administrator is prompted to transfer ownership to another user before deletion can proceed. If no owned data is found, membership is **hard-deleted**, which **frees one user licence** (or super-user licence depending on role). The user disappears from the organisation list.
- **Conditions:** Delete is **not offered** for the current logged-in user, or for users who still have IAM access policies assigned. The UI delete path removes **membership**, not the global soft-delete user endpoint. Global soft-delete anonymises the account and sets system access to Deactivated but is **not** what the current delete drawer executes.

### Transfer data ownership before removal

- **Capability:** Reassign business records owned by a departing user to another active user.
- **Who uses it:** Administrators during the delete flow when ownership checks flag existing data.
- **Outcome:** Background processing bulk-reassigns ownership across modules (hardware assets, risks, incidents, CIP/OFI, audits, management review attendance, customers, suppliers, document repositories, document nodes, tasks, AI analysis responses). Real-time WebSocket updates show check and transfer progress.
- **Conditions:** Only one ownership transfer per source user should run at a time; a concurrent transfer shows an in-progress state.

### Manage invitations

- **Capability:** View sent invitations, resend invitations, and delete pending invitations from the Users page Invitations tab.
- **Who uses it:** Users with **Invitations → Manage**.
- **Outcome:** Administrators track outstanding invites separate from active members.

### Resend email verification

- **Capability:** Resend verification email to a user whose email is still pending verification.
- **Who uses it:** Administrators from the user list row actions.
- **Outcome:** Verification workflow is restarted for that email address.

### Change password (self-service)

- **Capability:** Change one’s own password by providing the current password and a new password (with confirmation).
- **Who uses it:** Any logged-in user via **Change password** (navbar / auth route).
- **Outcome:** Password updates; system-generated-password flag is set to blocked after a manual change.
- **Conditions:** Administrator **password reset** endpoint exists but returns **empty success without performing reset** (stub). There is no working admin reset flow in the current UI.

### Set appearance preferences

- **Capability:** Toggle dark mode and sidebar colour theme.
- **Who uses it:** Any user via the fixed settings plugin (gear icon).
- **Outcome:** Theme preference persists on the user record and re-applies on load.
- **Conditions:** Preferences are limited to `darkMode` and `activeTheme`.

### Store digital signature (backend only)

- **Capability:** Attach a signature image/file to a user record.
- **Who uses it:** **No Users-module UI** identified for uploading signatures. Backend supports updating `signatureInfo`.
- **Outcome:** Signature data can be stored for use by other modules (for example document signing workflows).
- **Conditions:** **Observed but business purpose unclear** within the Users module itself; likely consumed outside this module.

### Manage working locations (partially implemented)

- **Capability:** Add or remove working locations (type and address) for a user.
- **Who uses it:** Backend supports add/remove on the user record; frontend location form exists but the **Working Locations section is commented out** on the profile page.
- **Outcome:** When used via API, locations are pushed to a `locations` array on the user. Membership also has a separate `workLocations` array that the profile displays when populated from membership—not from the user locations API.
- **Conditions:** **Implementation suggests schema inconsistency** between user-level locations API and membership-level work locations. Current UI does not expose location management.

### Change system access status (grant / revoke)

- **Capability:** Set a user’s platform access to Active or Blocked, with optional time-limited access period recalculation on activation.
- **Who uses it:** Administrators from the **Groups** module member table (grant/revoke actions), not from the Users list (store methods exist but are **not wired** to the Users table UI).
- **Outcome:** Active access sends a welcome email; blocked access sends an access-revoked email. Blocked users in the expired-user bulk job also have sessions cleared.
- **Conditions:** Access statuses are **Active**, **Blocked**, or **Deactivated**. Deactivated is used by global soft-delete.

### Bulk-block expired users (backend)

- **Capability:** Accept a list of users and block each one’s system access, clearing sessions.
- **Who uses it:** **No frontend caller identified** in the current codebase. Requires **Users → Create** permission on the backend route.
- **Outcome:** Listed users are blocked and notified.
- **Conditions:** Intended for automated or administrative expiry handling; **current behavior could not be fully determined** for what populates the request list or triggers the call.

### Add or remove user from a business unit (group)

- **Capability:** Add a user to an additional IAM group (business unit) or remove them from a group.
- **Who uses it:** Administrators from the **Groups** module (add member form, remove from group action).
- **Outcome:** Membership `groups` array updates; group member counts adjust; notification emails sent on add (“new role granted”) and remove (“removed from BU”). Removing yourself from a group returns a session-expired response.
- **Conditions:** Group membership is stored on **membership**, not directly on the user. Distinct from IAM **access policies** (platform role per business unit context).

---

## 3. User Outcomes / End Results

- **Create:** Invite a colleague by email and role; complete membership through the invitation/onboarding flow (not via direct user-create form).
- **View:** Paginated organisation user directory; individual profile with employment and business unit context; pending invitations list; ownership-check results during deletion.
- **Manage:** Employment details and roles (Super Admin); compliance toolkit assignment; invitation resend/delete; optional ownership transfer before removal; group membership and access grant/revoke (via Groups module).
- **Change:** Own name, profile photo, password, and UI theme preferences; switch active business unit when multiple apply.
- **Information received:** User reference (`USR-{number}`), contact details, access status, last login, membership role and HR fields, business unit list, licence consumption implied by membership, and real-time ownership/transfer status during deletion.
- **Business actions enabled:** Onboard staff under licence limits; maintain an authoritative people directory; ensure departing users do not leave orphaned records; align individual access with organisation licensing and compliance tooling; support multi-business-unit operation for users assigned to several groups.

---

## 4. Scope Boundaries

### In scope

- Organisation user directory and profile/detail views under **Our iMS → Users**.
- Invitation-triggered onboarding entry point (“Add user”).
- Self-service profile, photo, password, theme, and business unit switching.
- Super Admin employment and role management on membership.
- Compliance toolkit assignment page.
- Delete flow with ownership check and transfer.
- Backend capabilities for access status, group membership, preferences, signatures, and working locations (where implemented).
- User licence consumption/release via membership lifecycle.

### Out of scope (handled elsewhere)

- **Invitations module** — Owns invitation records, resend/delete API, and invitation acceptance/onboarding completion workflow.
- **Memberships module** — Owns organisation-scoped HR/role record create, update, hard delete, and licence utilisation on create/remove.
- **Groups (Our iMS / IAM Groups)** — Owns business unit structure; primary UI for adding/removing members and granting/revoking system access.
- **Organisation module** — Organisation settings, licence allocation overview shown in add-user drawer.
- **Authentication / login / session management** — Login, token issuance, email verification completion; Users module stores credentials and access flags but does not own the full auth journey.
- **IAM policies and RBAC** — Platform permission policies and role definitions; Users module reads and switches access policies but does not define RBAC rules.
- **Leave, wallet, work shift clocking** — Fields exist on membership and display on profile; operational workflows belong to HR/leave modules.
- **Document policy acknowledgement signing** — Not the same as the Users “policy signature” action (which switches business context).

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **Invitations** | Primary path for adding people; Users UI creates invitations rather than direct users. |
| **Memberships** | Stores per-organisation role, HR fields, and group membership; licence consumed on create and freed on hard delete. |
| **Groups (Our iMS)** | Business units users belong to; UI for add/remove member and grant/revoke system access. |
| **Organisation** | Licence pools (standard users, super users, business units, compliance tools) gate membership creation and toolkit assignment. |
| **Compliance / Compliance Toolkit** | Toolkit assignment grants tool access on IAM policies; terminates user sessions on change. |
| **Risk Management** | Users act as risk owners; ownership checked and transferred on departure. |
| **Incidents** | Users act as incident owners; included in ownership integrity. |
| **CIP (OFI)** | Users act as CIP owners; included in ownership integrity. |
| **Audits** | Users act as auditors on audit records; included in ownership integrity. |
| **Management Review** | Users appear as attendees; flagged on ownership check. |
| **Customers** | Users act as account managers; ownership transferable. |
| **Suppliers** | Users act as buyers; ownership transferable. |
| **Document Management** | Users act as repository or document owners; ownership transferable. |
| **Tasks** | Users as task creators; flagged on ownership check. |
| **Hardware Assets (Inventory)** | Users as asset owners; ownership transferable on departure. |
| **Notifications / Email** | Welcome, access revoked, new role granted, removed from BU emails triggered from Users-related actions. |
| **Leave / HR (membership fields)** | Leave entitlement, TOIL balance, work shift, line managers displayed and editable via membership forms. |
| **Partnerships** | Profile promos and navigation to partner onboarding/dashboard based on organisation partner status. |
| **AI analysis** | Users as creators of AI responses; included in ownership transfer scope. |

---

## 6. Current Data Model

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| **User** | Global person account: identity, credentials, platform access status, profile media, preferences, IAM access policies. | Core entity; one person can belong to multiple organisations via separate memberships. |
| **Membership** | Organisation-specific employment and access context: role, job title, salary, groups, line managers, leave/shift/medical fields. | Joins a User to one Organisation; drives list role column, employment detail page, and licence usage. |
| **Invitation** | Pending request for a person to join the organisation with a proposed role. | Entry point for adding users from the Users UI. |
| **IAM Access Policy (on User)** | Binding between a user and a business unit group with an IAM role/policy—defines which platform context they can switch into. | Shown indirectly via business unit switching and Tool Access; cleared on soft user delete. |
| **System access** | Whether the person may log in and use the platform (Active, Blocked, Deactivated) and optional expiry. | Gates login eligibility; listed as Status in user table. |
| **User licence (organisation pool)** | Count of standard or super-admin seats consumed when membership is created. | Enforced in Membership service, not on blocked Users create route. |
| **Compliance toolkit licence** | Organisation entitlement to compliance tools assigned per user policy. | Updated via Tool Access assignment. |
| **Profile image** | Avatar representing the user in UI and communications. | Self-managed from profile. |
| **Signature** | Stored signature attachment on user. | Backend-only in Users UI; likely used cross-module. |
| **Preferences** | UI theme choices (dark mode, accent colour). | Self-managed via settings plugin. |
| **Working location** | Address/type describing where a user works. | Split/inconsistent between user API locations and membership workLocations; UI not active. |

---

## 7. Attributes

### User (global identity)

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Reference (`USR-{number}`) | Stable user identifier in the organisation directory. | Auto-generated. |
| First name / Last name / Name | Person’s displayed and legal-style name. | Self-editable (name fields); admin can view. |
| Email | Primary contact and login identifier. | Unique; anonymised on soft delete. |
| Email verified status | Whether the person has confirmed their email (`pending` / verified). | Pending users can receive resend verification from list actions. |
| Phone / Phone verified | Contact number and verification state. | Optional; not prominently managed in Users UI. |
| Password | Login credential. | Changed by self-service; admin reset stubbed. |
| System password status | Whether the account still uses a system-generated password (`active` / `blocked`). | Set to blocked after user changes password. |
| User type | Internal vs external classification. | Set at creation; legacy direct-create only. |
| System access status | Login eligibility: Active, Blocked, Deactivated. | Deactivated used for soft-deleted accounts. |
| System access period | Full time or day-limited access window. | Recalculates expiry date when access set to Active. |
| System access expires | When time-limited access ends. | Null for full-time access. |
| Access policies | List of business unit + IAM role bindings the user may switch between. | Cleared on soft delete; drives navbar BU switcher. |
| Profile image | Avatar URL and file metadata. | Self-uploaded. |
| Signature | Signature file attachment. | No Users UI; backend updatable. |
| Preferences (dark mode, active theme) | Visual UI settings. | Updated via settings plugin. |
| Country | Default country on user record. | Membership also has country fields used on profile. |
| Logged in (status, on) | Last login timestamp shown in user list. | Display-only in directory. |
| Created by / Created on | Who invited/created the account and when. | Populated on user creation. |
| Bad attempts / Locked until | Account lockout counters. | Security fields; not surfaced in Users UI. |

### Membership (organisation-scoped)

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Role | Organisation permission tier (Super Admin, Head of Service, Basic User, Internal/External Auditor, External User). | Drives licence type and RBAC; editable by Super Admin. |
| Job title | Professional title within the organisation. | Searchable in user list. |
| Salary | Compensation amount. | Shown on classified profile; intended sensitive field. |
| Work location type | On-site vs Remote employment mode. | Editable in membership form. |
| Work locations | Structured location entries on membership. | Displayed on profile when present; separate from user locations API. |
| Line managers | Other users responsible for this person. | Badges on profile; selectable in membership form. |
| Leave days entitled | Annual leave allocation. | HR field on profile. |
| TOIL balance | Time-off-in-lieu balance. | Displayed on profile. |
| Work shift (status, weekly hours, time zone) | Scheduled working hours pattern. | Editable in membership form. |
| Groups | Business units (IAM groups) the user belongs to. | Shown in BU Information card; managed from Groups module. |
| Medical info | Allergies, blood group, conditions, emergency contacts. | On membership schema; **not exposed** on current Users profile UI. |
| Country | Employment country. | Shown on profile. |

### Invitation

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Email | Invitee address. | Required on invite form. |
| Role | Proposed membership role. | Selected from organisation role list. |

### Licence-related (organisation level)

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Users allocated / used | Standard user seat pool. | Checked and incremented on membership create. |
| Super user allocated / used | Super Admin seat pool. | Separate pool when role is Super Admin. |
| Compliance tools | Named tools with allocated/used counts. | Referenced when assigning toolkits. |
| Groups (business units) allocated / used | Business unit licence pool. | Related to group creation, not per-user listing. |

---

## 8. Current UI Layout

### Main screens / pages

- **Users list** — `/admin/users` under Our iMS sidebar (“Users”). Requires **Users → Create** on route (sidebar visibility); list read uses **Users → Read** on detail route.
- **User detail / profile** — `/admin/users/:id`. Single-page profile layout (no sub-tabs on detail).
- **Tool Access** — `/admin/users/:id/tools`. Hidden route for compliance toolkit assignment.
- **Change password** — `/auth/users/:id/changepassword`. Auth layout, linked from account menu.
- **Own profile** — Same detail route accessed from navbar account dropdown for the current user.

### Important sections and views

**Users list (`Users.jsx`)**

- Navigation tabs: **All Users** (default) and **Invitations** (if Invitations Manage permission).
- Search bar (debounced query to backend).
- **Add user** button opens drawer (requires Invitations Create).

**Users table**

- Columns: Name, Email, Job Title, User Type (role), Status (system access badge), Last Logged In, Actions.
- Row click navigates to detail.
- Row actions menu: Resend email (if email pending), Details, Delete (conditional).

**Add user drawer**

- Organisational licence overview widget (groups/tools hidden in this context).
- Invitation form: Email + Role dropdown → Confirm.

**Invitations tab**

- Separate table of sent invitations with manage/resend/delete actions.

**User profile detail**

- Header: Avatar (camera icon for self), name, email; shortcuts to Organisation(s) and Partnership (permission-gated).
- **BU Information** card: Lists membership groups with type; switch button for own profile when multiple BUs; empty state “No business unit found”; Go Live / Become Partner promos when applicable.
- **Basic Information** card: First name, last name; “Edit profile” drawer (self only).
- **Employment details** card: Role, job type, job title, salary, country, leaves entitled, TOIL balance, line managers; “Change role” and “Manage” drawers (Super Admin, not self for role change).
- **Working Locations** card: **Commented out / not rendered.**

**Delete drawer** (from list row action)

- Ownership check runs automatically via WebSocket feedback.
- If owned data found: transfer form to pick destination user.
- If no owned data: delete confirmation form.
- Transfer in progress: loading state with “Data transfer is in progress” message.

**Tool Access page**

- Single panel “Assign Toolkit” with multi-select toolkit dropdown and Confirm.
- Back link to user context.

**Change password page**

- Old password, new password, confirm password fields; redirects to home on success.

**Account dropdown (global navbar)**

- Loads classified user info for avatar and name.
- Lists access policies / business contexts with switch action (policy signature flow).
- Links to profile and change password.

**Fixed settings plugin (global)**

- Sidebar colour and dark/light mode; persists preferences to user record.

### Primary actions

| Action | Location | Permission / condition |
| ------ | -------- | ---------------------- |
| Add user (invite) | Users list drawer | Invitations Create |
| Search users | Users list | Users Read (implicit) |
| View detail | Row click / row menu | Users Read |
| Resend verification | Row menu | Any user with list access |
| Delete user | Row menu | Invitations Delete; not self; no access policies |
| Edit own name | Profile drawer | Self |
| Upload photo | Profile modal | Self (entity access) |
| Manage employment | Profile drawer | Super Admin |
| Change role | Profile drawer | Super Admin; not self |
| Switch business unit | BU card | Self; multiple groups |
| Assign toolkit | Tool Access page | Users Create |
| Change password | Auth route | Self |
| Grant/revoke access | **Groups module** member table | Users Create (backend) |
| Add/remove from group | **Groups module** | Users Create / Delete |

### Forms

- InvitationForm — email, role.
- UserFormContainer — first/last name (self edit).
- MembershipFormContainer — employment/HR fields (Super Admin).
- ChangeRoleForm — membership role select.
- AvatarUploadForm / PhotoUpload — profile image crop and upload.
- ToolkitForm — multi-select compliance tools.
- TransferForm / DeleteForm — ownership transfer target or confirm delete.
- ChangePassword — password change with validation.

### Lists / tables / cards / detail views

- Paginated DataTable for users (default page size from pagination hook, typically 10).
- Invitations table on second tab.
- Profile uses card layout, not a tabbed detail.

### Navigation and workflow

```text
Sidebar Users → List (search / invite / row actions)
              → Detail profile (edit / employment / BU switch)
              → Tool Access (from external link; route exists)
Navbar account → Own profile / Change password / Switch BU context
Groups module  → Add member / Remove / Grant or Revoke access
Delete flow    → Row Delete → Drawer → Ownership check → Transfer OR Delete membership
```

### Material empty, loading, or restricted states

- **Loading:** Full-height loader while user list or profile loads; toolkit page loader on fetch.
- **Empty BU list:** “No business unit found” on profile.
- **Delete drawer:** “Select a user to delete or transfer ownership” if no user selected.
- **No owned data:** Delete form shown directly after ownership check.
- **Owned data:** Flag message plus transfer form; cannot delete until transfer completes or **implementation suggests** administrator must transfer first.
- **Restricted delete:** Delete action hidden for current user and for users with access policies.
- **Add user:** Button hidden without Invitations Create permission.
- **Invitations tab:** Hidden without Invitations Manage permission.
- **User filter UI (`UserFilter.jsx`):** Built (All active users, Pending verification, Restricted users) but **not mounted** on the Users table—filter definitions exist in code only.

---

## 9. Miscellaneous / Module-Specific Information

### User lifecycle (confirmed states and transitions)

| State | Meaning | How reached | Business effect |
| ----- | ------- | ----------- | ----------------- |
| **Invited** | Invitation sent, not yet a member | Invite from Users UI | Appears on Invitations tab only. |
| **Pending email verification** | Account exists; email not verified | Registration / invite acceptance | “Resend email” available on list. |
| **Active access** | May log in | Default on creation; grant access from Groups | Appears in user directory list. |
| **Blocked access** | Login/access denied | Revoke access; bulk expired job | Access-revoked email; may disappear from Active-only list. |
| **Deactivated** | Soft-deleted global account | `deleteUser` API (not UI delete path) | Name/email anonymised; access policies cleared. |
| **Membership removed** | No longer in organisation | Hard delete membership (UI delete path) | User licence freed; removed from org directory. |

Automatic transitions: time-limited access period can set expiry on activation; bulk expired-user blocking clears sessions when blocking. **What marks a user as “expired” before bulk block could not be fully determined from the inspected code** (no frontend caller found).

### User creation and licensing

- The product **does not** use the legacy direct `POST /users` create flow in normal operation—the permission gate always rejects it as deprecated.
- **User licences** (standard vs super-admin pools) are enforced when **membership is created** after invitation acceptance: organisation must have available seats; one seat is consumed per membership.
- **Role licence** middleware on Users routes is **stubbed/disabled** (authorization always passes). Historical comment indicates role authorization paused after v2.4.1.
- **`useUserLicense` on create route is an empty stub**—licence consumption happens in Membership service instead.

### “Classified” vs “Basic” information

- **Intended:** Classified includes sensitive employment data (salary); basic omits it for wider sharing.
- **Observed today:** Both endpoints return membership with salary; user-level salary field is excluded from queries but is not on the current user schema. Frontend uses classified info for detail page and navbar; basic info is used for lighter session caching elsewhere. **Effective difference is minimal** in current responses.

### “Policy signature” is not legal policy signing

- The **policy signature** action switches the user’s active IAM access policy (business unit / role context), invalidates the refresh token cookie, and returns new access tokens.
- Used from the **account dropdown** and profile BU switch—not for signing compliance policy documents.

### Password management

- **Change password:** Requires current password; rejects reusing the same password; operates on the session user (URL user id ignored).
- **Reset password:** Admin route is a **non-functional stub** returning HTTP 200 with no body.

### Group membership vs role vs access policy

- **Membership role** — Organisation RBAC tier (Super Admin, Basic User, etc.); one per organisation membership.
- **Membership groups** — Business units the person belongs to; can be multiple; managed from Groups module.
- **Access policies (on user)** — IAM bindings allowing platform login context per business unit; user must have policies to appear deletable restrictions-wise; switching policy changes active BU.

These are **not equivalent**—a user can belong to groups via membership while access policies govern authentication context and compliance tool grants.

### Ownership integrity scope

When removing a user, the system scans for ownership or participation in: hardware assets, risks, incidents, CIP, audits (auditor), management reviews (attendee), customers (account manager), suppliers (buyer), document repositories, document tree nodes, tasks (creator), AI responses (creator). Transfer reassigns or updates these to a nominated destination user in background jobs with WebSocket progress.

### Frontend / backend discrepancies

| Topic | Frontend | Backend |
| ----- | -------- | ------- |
| User creation | Invitations only | Direct create blocked |
| User delete | Hard delete membership | Separate soft-delete user endpoint also exists |
| Access grant/revoke | Groups module UI | Users store methods unused in Users table |
| User filters | Component not mounted | List always filters Active access only |
| Working locations | UI commented out | API writes to user.locations; membership has workLocations |
| Admin password reset | No UI | Stub endpoint |
| getAllUsers vs getAllActiveUsers | List uses getAllUsers | Identical implementation |
| Basic vs classified info | Different API calls | Responses effectively the same on membership |
| RBAC on basic/classified routes | Assumes protection | RBAC middleware commented out |
| Tool Access policy lookup | Filter condition bug (`||` instead of `&&`) | **May affect which policy loads** — requires verification |

### Unclear or partially implemented behavior

- **Observed but business purpose unclear:** User-level `locations` API vs membership `workLocations`; which is authoritative long term.
- **Implementation suggests this behavior, but confirmation is required:** Signature image primary use case (likely Document Management).
- **Current behavior could not be fully determined:** What triggers `updateExpiredUsers` bulk block; scheduled job or external caller not found in frontend.
- **Current behavior could not be fully determined:** Full invitation acceptance → membership → access policy assignment chain (crosses Invitations/Auth modules).
- **Role change** does not observe licence rebalancing between standard and super-user pools in the Users/Membership update path inspected.

---

*Specification based on current frontend (`ims-systems-frontend/src/views/ourIms/users/`) and backend (`ims-systems-backend/src/routes/api/users.js`, controllers, services, models) as implemented. No application code was modified to produce this document.*
