# Membership

## 1. Module Overview

The **Membership** module manages the **relationship between a user and an organisation**. A membership record represents that a specific person belongs to a specific organisation, with an assigned **organisation role**, employment-related information, and links to **Business Units (Functional Units / IAM groups)**.

Membership is **not** a paid subscription, a user account, or an invitation. It is the **persistent link** that makes a user an organisation member and enables them to **check in** to that organisation’s iMS environment, receive an organisation-scoped session (role, organisation context, default Business Unit), and participate in organisation workflows.

The module solves the problem of **connecting people to organisations** in a multi-tenant product where one person may belong to **multiple organisations**, each with different roles and employment details. It also holds **HR and wallet-related context** (job title, work location, line managers, leave entitlement, working hours, country) used across user profiles and downstream modules such as **Leaves** and **My Wallet**.

Primary users and roles:

- **All authenticated users** — view their own memberships and **select which organisation** to work in after login.
- **Super Admin** — manage another member’s **employment details**, **change organisation role**, and **remove members** from the organisation (via the Users area).
- **System workflows** — **Invitations** (acceptance creates membership), **Organisation onboarding** (founder receives Super Admin membership), and **authentication** (token refresh embeds membership context).

Membership is **organisation-specific**. A user may hold **one membership per organisation**. Membership is distinct from the **user identity** (account) and from **pending invitations** (invitations are consumed when membership is created).

---

## 2. Features and Capabilities

### Establish organisation membership

- **Capability:** Create a membership linking a user to an organisation with a specified organisation role.
- **Who uses it:** System workflows rather than a dedicated end-user “join” screen — **invitation acceptance**, **organisation creation**, and (in principle) authenticated API callers with organisation context.
- **Outcome:** A membership record is created. A **user licence** is consumed for the organisation (Super Admin licences tracked separately from standard user licences). The user can subsequently appear in the organisation’s user list and select that organisation after login.
- **Conditions:**
  - **User, organisation, and role are required.**
  - **Duplicate membership blocked** — if the same user already has membership in the same organisation, creation is rejected (*“User is already a member of the organisation.”*).
  - **Licence check** — the organisation must have an available licence for the requested role. If insufficient, creation is rejected (*“Organisation doesn't have enough licenses to add user(s).”*).
  - On create via the membership API controller, the organisation is taken from the **caller's current organisation session context**.
  - **Confirmed creation paths:**
    - **Invitation acceptance** — Invitations module calls membership creation with the invited user, organisation, and role from the invitation token, then deletes the invitation.
    - **Organisation onboarding** — when a user creates a new organisation, they receive membership as **Super Admin** of that organisation.
  - **No frontend screen directly calls membership creation.** New members typically arrive through **invitations** or **organisation setup**.

### View own memberships (organisation selection)

- **Capability:** List all organisation memberships belonging to the authenticated user.
- **Who uses it:** Any logged-in user during **system preparation** and on **organisation selection** and **Organisation** screens.
- **Outcome:** The user sees each organisation they belong to (name, logo, role, customer/partner indicators) and can choose which organisation context to enter.
- **Conditions:** Listing is scoped to the **authenticated user’s user ID** — users see only **their own** memberships, not a full org member directory.

### Retrieve a single membership

- **Capability:** Load full membership details for a specific membership record.
- **Who uses it:** The application session layer when refreshing membership cache after login, organisation switch, or Business Unit switch.
- **Outcome:** Current membership data (organisation, role, groups, employment fields) is cached client-side and drives UI such as employment details and Business Unit information.
- **Conditions:** Requires a valid membership identifier (typically from the access token’s `membershipId`).

### Check in to an organisation (switch organisation context)

- **Capability:** Change the active organisation session to one of the user’s memberships.
- **Who uses it:** Any user with multiple memberships, from **organisation selection** after login or the **Organisation** page sidebar.
- **Outcome:** Access token is refreshed with the selected organisation’s `organizationId`, **organisation role**, `membershipId`, and default or selected **Business Unit (`groupId`)**. User is routed to the customer dashboard, partner dashboard, or onboarding flow depending on organisation type.
- **Conditions:** User must have an existing membership in the target organisation. Confirmation dialog shown when switching from the Organisation page.

### Check in to a Business Unit (switch group context)

- **Capability:** Within the current organisation, switch active **Business Unit** context to one assigned on the user’s membership.
- **Who uses it:** Users viewing **their own profile** who belong to one or more Business Units listed on their membership.
- **Outcome:** Session refreshes with the selected `groupId`. Page reloads to the dashboard under the new Business Unit context.
- **Conditions:** Business Unit must appear in the membership’s **groups** list. Assignment of users to groups is handled through **Users / IAM Groups** workflows, not through the membership form itself.

### View membership-derived information on user profiles

- **Capability:** Display organisation membership details for a user within the current organisation.
- **Who uses it:** Users viewing profiles in the **Users** module; all viewers see read-only employment summary; **Super Admin** sees management actions.
- **Outcome:** Profile shows **Employment details** (role, job type/work location, job title, salary, country, leave entitlement, TOIL balance, line managers) and **BU Information** (Business Units from membership groups).
- **Conditions:** Profile load joins the user with their membership for the **currently active organisation** only.

### Update employment details

- **Capability:** Edit membership-held employment and working-hours information for a member of the current organisation.
- **Who uses it:** **Super Admin** only (frontend `authSuperUser` check).
- **Outcome:** Membership fields updated: work location type, job title, salary, line managers, annual leave entitlement, country, and weekly operating hours (per day, with timezone). Success notification *“Employment details updated.”*
- **Conditions:**
  - Work location type is required (On-site or Remote).
  - Job title is required in the frontend form.
  - Operating hours section is shown only when editing an existing membership (not on empty create).
  - **Super Admin cannot edit their own role** through the change-role action (button hidden when viewing own profile).

### Change organisation role

- **Capability:** Change the **organisation role** on a member’s membership.
- **Who uses it:** **Super Admin** viewing another user’s profile.
- **Outcome:** Membership role updated. The affected user’s **refresh tokens are cleared**, forcing re-authentication on next refresh. Success notification *“Role updated for this user.”*
- **Conditions:**
  - Role must be one of: Super Admin, Head of Service, Basic User, Internal Auditor, External Auditor, External User. (**Auditor** role exists in backend enums but is not offered in the change-role form.)
  - **Licence rebalancing on role change was not observed** — changing between Super Admin and standard roles does not appear to adjust licence counts. **[Requires verification]**

### Remove a member from the organisation (hard delete)

- **Capability:** Permanently end a user’s membership in the current organisation.
- **Who uses it:** **Super Admin** through the **Users → delete process** drawer (after ownership checks).
- **Outcome:** Membership record is **permanently deleted**. Organisation **user licence is freed** (decremented). **Business Unit member counts** on affected groups are recalculated. User disappears from the organisation user list. Success notification confirms removal.
- **Conditions:**
  - Frontend uses **hard delete** only; soft delete/restores are not exposed in the UI.
  - If the user owns data that must be transferred, the delete process may require **ownership transfer** first (Users module workflow).
  - Removing membership **does not delete the user account** globally — only the organisation relationship ends.
  - **Self-service “leave organisation” was not found.** Members cannot remove their own membership through a dedicated UI.

### Soft delete and restore (backend only)

- **Capability:** Move a membership to trash (soft delete) or restore it.
- **Who uses it:** No user-facing UI was found. Backend endpoints exist.
- **Outcome:** Soft delete marks membership deleted via the soft-delete plugin; restore reverses it.
- **Conditions:** **Observed but business purpose unclear** — no frontend usage confirmed. Soft-delete handler implementation may not fully await membership lookup before deleting. **[Requires verification]**

### Licence consumption and release

- **Capability:** Tie membership creation and hard removal to organisation **user licence** counts.
- **Who uses it:** Automatic on membership create and hard remove.
- **Outcome:** Creating membership increments `used` licence count (Super Admin vs standard user pools). Hard removal decrements the count for the member’s role at removal time.
- **Conditions:** Licence must be available before create. Role must be specified for licence accounting.

---

## 3. User Outcomes / End Results

### For any authenticated member

- **View:** All organisations they belong to, with organisation name, role, and type indicators (customer/partner).
- **Select:** Which organisation to work in after login or from the Organisation page.
- **Switch:** Active Business Unit within the current organisation (when groups are assigned on their membership).
- **See:** Their own employment details, Business Units, and TOIL balance on their user profile.
- **Information received:** Organisation-scoped session (role, organisation name, membership identifier, default Business Unit) after check-in.
- **Business actions enabled:** Access organisation-specific iMS features according to their **organisation role** and **Business Unit** context.

### For Super Admin

- **View:** Employment and Business Unit information for any member in the current organisation.
- **Manage:** Employment details (job title, work location, salary, line managers, leave entitlement, country, working hours) for members.
- **Change:** Another member’s organisation role (not their own via the same control).
- **Remove:** Members from the organisation through the controlled delete process (hard membership removal).
- **Information received:** Confirmation when employment details or roles are updated, or when a member is removed.
- **Business actions enabled:** Maintain accurate HR context for members, control organisation role assignment, and offboard users from the organisation while freeing licences.

### What users cannot achieve through Membership today (confirmed)

- Create membership directly from a standalone Membership screen (creation is workflow-driven).
- Browse all organisation members via the membership list API (that API returns **only the caller’s** memberships).
- Decline or manage invitations (Invitations module).
- Leave an organisation voluntarily through a dedicated “leave” action.
- Edit membership employment details without **Super Admin** access.
- Use soft delete / restore of membership from the UI.
- Assign Business Units through the membership edit form (assignment is via **IAM Groups / Users** add-to-group flows).
- Edit **medical information**, **work locations**, or **TOIL balance** through the membership UI (TOIL is display-only; medical info and work locations have no confirmed frontend editor).

---

## 4. Scope Boundaries

### In scope

- The **user–organisation membership relationship** and its persistent record.
- **Organisation role** on membership (Super Admin, Head of Service, Basic User, auditor variants, External User).
- **Employment and HR context** stored on membership (job title, work location, salary, line managers, leave entitlement, country, working hours, TOIL balance).
- **Business Unit (IAM group) references** on membership and session switching into assigned groups.
- **Membership lifecycle** operations: create, update employment info, change role, hard remove; backend soft delete/restore.
- **Licence consumption and release** tied to membership create/remove.
- **Organisation check-in** and membership listing for the authenticated user.
- **Session embedding** of membership context (organisation, role, membership ID, group).

### Out of scope (handled elsewhere)

- **User account identity** (name, email, password, verification) — **Users** / **Authentication** modules.
- **Pending invitations** — **Invitations** module (membership is the outcome of acceptance).
- **Organisation profile, billing, go-live** — **Organisation** module (membership list appears on Organisation page but org settings are separate).
- **Partnership programme membership** — **Partnership** module (parallel concept for partners).
- **iMS Project memberships** — separate project-scoped membership under **iMS Projects** (`/ims-projects/{projectId}/memberships`).
- **IAM policy and permission definitions** — **IAM** module (membership role drives high-level org RBAC; fine-grained policies are separate).
- **Adding/removing users from Business Units** — **IAM Groups / Users** (`addUserToGroup`, `removeUserFromGroup`), which update the membership’s `groups` array.
- **Grant/revoke iMS system access** (Active/Blocked) — **Users** module; distinct from organisation membership removal.
- **Licence purchasing and allocation** — **License Management** (Membership only consumes/releases licences).

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **Users** | Membership attaches organisation-specific employment and role data to a **user account**. User list and profile screens load membership for the active organisation. Member removal runs through Users delete process. |
| **Organisation** | Every membership belongs to one **organisation**. Organisation creation automatically creates founder membership. Organisation page lists the user’s memberships for check-in. |
| **Invitations** | Accepting an invitation **creates membership** with the invited role and organisation, then removes the invitation. Invitations cannot coexist with an active membership for the same user–organisation pair. |
| **Authentication / Session** | Token refresh resolves membership for the selected organisation and embeds `organizationId`, `role`, `membershipId`, and `groupId` in the session. Role change clears refresh tokens. |
| **License Management** | Membership create consumes a user licence; hard remove frees one. Insufficient licences block membership creation. |
| **IAM Groups (Functional Units / Business Units)** | Membership stores assigned **groups**. Users switch Business Unit context from profile. Add/remove group membership updates the membership record and group member counts. |
| **Leaves / My Wallet** | Membership holds **line managers**, **leave entitlement**, **country**, and **TOIL balance** intended to support leave and wallet workflows. **[See Miscellaneous — line manager data source discrepancy]** |
| **Onboarding** | System preparation uses membership count to route users (organisation selection, create organisation, accept invitation). |
| **Partnership** | Parallel routing for partner organisations after organisation check-in; not stored on the same membership model. |

---

## 6. Current Data Model

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| **Membership** | The link between one **user** and one **organisation**, including org role and employment context | Central record owned by this module |
| **User (member)** | The person who holds membership (`invitedUserId`) | Member side of the relationship; account persists after membership removal |
| **Organisation** | The org the member belongs to | Host side of the relationship; scopes all membership data |
| **Business Unit (Group)** | Functional unit assignments stored as references on membership | Enables BU check-in and profile display; counts updated on hard remove |
| **Line manager (User reference)** | Other users designated as line managers for this member in this organisation | Stored on membership; shown on profile |
| **Organisation role** | High-level role (Super Admin, Head of Service, etc.) | Determines session role and broad access; set at membership create, changeable by Super Admin |

Membership records use **soft-delete** capability at the data layer (trash/restore), but the product’s primary removal path is **hard delete**. There is **no separate membership status enum** (such as Active/Suspended) — an existing, non-deleted record represents active membership.

---

## 7. Attributes

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| **Member (user)** | The person who belongs to the organisation | Required; one membership per user per organisation |
| **Organisation** | Which organisation the member belongs to | Required; scopes all other membership data |
| **Organisation role** | The member’s role within the organisation (e.g. Super Admin, Basic User) | Required at creation; drives session role and licence pool |
| **Work location type** | Whether the member works on-site or remote | Default On-site; editable by Super Admin |
| **Job title** | The member’s job title in this organisation | Default “Not set”; editable; shown in Users list |
| **Salary** | Salary figure associated with the member in this organisation | Default 0; optional in form; visible on profile |
| **Line managers** | Users who manage this member in this organisation | Used for approval workflows (e.g. leaves); editable by Super Admin |
| **Annual leave entitlement** | Number of leave days entitled | Default 0; editable by Super Admin |
| **Country** | Member’s country (name and code) for this organisation context | Default United Kingdom / GB; editable by Super Admin |
| **Working hours (work shift)** | Weekly schedule — per-day start/end times and timezone | Optional per-day slots; visible to line managers per form copy; timezone captured from browser on save |
| **Work shift status** | Clock state (Clocked in / Paused / Clocked out) | On model; **no membership UI editor found** |
| **TOIL balance** | Time off in lieu balance | Display-only on profile; **no edit UI found** |
| **Medical information** | Allergies, blood group, conditions, emergency contacts, etc. | On model; **no frontend editor found** |
| **Work locations** | Structured work location entries | On model; location UI on profile appears **commented out / not active** |
| **Business Units (groups)** | IAM groups / Functional Units the member belongs to within the organisation | Managed via group assignment flows; displayed on profile; enables BU switch |
| **Created / updated timestamps** | When the membership was created or last changed | System-maintained |

---

## 8. Current UI Layout

Membership has **no standalone module page**. Functionality is **embedded** in authentication onboarding, organisation management, and user profile screens.

### Main screens / pages

- **`/auth/organisation-selection`** — Post-login organisation picker listing the user’s memberships.
- **`/admin/organisation`** — Organisation settings page with a sidebar listing the user’s memberships and check-in controls.
- **`/admin/users/{id}`** (User profile) — Employment details, Business Units, and Super Admin management actions for the viewed user’s membership in the **current organisation**.
- **System preparation** (`/auth/system-preparation`) — Loads memberships in the background to decide routing (organisation selection, onboarding, or invitation acceptance).

### Important sections and views

- **Organisation selection list** — Card/list of organisation names; customer/partner icons where applicable; click to check in.
- **Organisation page membership sidebar** — Organisation logo, current role, list of all memberships with switch button for non-active orgs; active org marked with indicator.
- **User profile — Employment details card** — Read-only grid: role, job type, job title, salary, country, leaves entitled, TOIL balance, line manager badges.
- **User profile — BU Information card** — Lists Business Units from membership groups; switch-into-BU button on own profile; empty state *“No business unit found”*.
- **Users table** — Job title and user type (role) columns derived from membership for the active organisation (not a raw membership list).

### Primary actions

- **Check in to organisation** — From organisation selection or Organisation sidebar (with confirmation on Organisation page).
- **Switch Business Unit** — From own profile BU list.
- **Manage employment details** — Super Admin opens drawer *“Manage”* on Employment details card.
- **Change role** — Super Admin opens *“Change role”* drawer (hidden for own profile).
- **Remove member** — Super Admin via Users delete-process drawer (hard membership delete after ownership checks).

### Forms

- **MembershipForm** (drawer) — Job title, working place, salary, line managers (multi-select), country, annual leave entitlement, operating hours (Mon–Sun checkboxes with start/end times). Submit label *“Update”*.
- **ChangeRoleForm** (drawer) — Role dropdown with confirm button; shows current role as helper text.

### Lists / tables / cards / detail views

- Membership list for **self only** on organisation selection and Organisation sidebar (not an org-wide member directory).
- Org-wide members appear in the **Users** table, enriched with membership role and job title.

### Navigation and workflow

1. User logs in → system preparation loads memberships (and invitations/partnerships).
2. If memberships exist → **organisation selection** → user picks org → token refresh with membership context → dashboard or partner/onboarding route.
3. Super Admin opens **Users** → user profile → manages employment or role → optional delete process to remove membership.
4. User with multiple orgs opens **Organisation** page → switches org from sidebar.

### Material empty, loading, or restricted states

- **Loading:** Organisation selection shows spinner *“Please wait until we prepare the system for you…”* while memberships load.
- **Empty BU list:** *“No business unit found”* on profile.
- **Restricted actions:** Employment manage and change-role buttons visible only to **Super Admin**; change-role hidden when viewing own profile.
- **Delete confirmation:** User must type `delete` to confirm removal in delete process.
- **Errors:** Failed membership load during org choice may redirect to login (error handling in org choice hook). Employment update and role change show generic error handling via notification system.

---

## 9. Miscellaneous / Module-Specific Information

### Terminology

- **Membership** = user ↔ organisation relationship (not subscription, not invitation, not global user account).
- **`invitedUserId`** on the membership record identifies the **member user** — a historical field name; the user is a full member after creation, not necessarily someone with a pending invitation.
- **Organisation role** on membership is the product’s primary **organisation-scoped RBAC role** (Super Admin, Head of Service, etc.), embedded in the access token. This is related to but separate from **IAM policies** and **accessPolicies** on the user record.

### Membership lifecycle

| State / event | Confirmed behavior |
| ------------- | ------------------ |
| **Created** | Via invitation acceptance, organisation creation, or membership create API |
| **Active** | Default — no explicit status field; record exists and is not soft-deleted |
| **Updated** | Employment details or role changed by Super Admin |
| **Soft-deleted** | Backend support via soft-delete plugin; **no UI** |
| **Hard-deleted (removed)** | Permanent removal; licence freed; group member counts updated |
| **Left (self-initiated)** | **Not implemented** as a user-facing workflow |

There are **no formal membership statuses** such as Suspended or Inactive on the membership record itself. User **system access** (Active/Blocked) is a separate Users-module concept.

### Relationship with Invitations (confirmed)

- Accepting an invitation **creates membership** and **deletes** the invitation.
- Membership cannot be created twice for the same user–organisation pair (same check blocks duplicate invitations at invite time).
- Membership can be created **without** a prior invitation (organisation founder path).
- Removing membership **does not** recreate or affect invitations.

### Access and permissions (confirmed)

- Membership API routes require **authentication** but are mounted **before** organisation-access middleware — listing always filters to the **caller’s own** memberships.
- **Super Admin** (session role) controls employment edit, role change, and member removal in the frontend.
- **No dedicated RBAC middleware** was observed on individual membership route handlers beyond authentication and validation.
- Organisation-scoped user profile APIs require **organisation session context** (`authOrgAccess`) to join membership for the active org.

### Frontend / backend discrepancies

| Topic | Observation |
| ----- | ----------- |
| **Delete user from Users store** | `useStore.deleteUser` passes `membership.invitedUserId` (user ID) to hard delete instead of `membership._id`. The **delete process drawer** uses the correct membership ID. The broken path in main store **does not appear wired to row actions**; confirmed removal path is delete process. |
| **Soft delete** | Backend endpoints exist; frontend only calls **hard delete**. Soft-delete service method may not properly await membership fetch. |
| **Role change vs licences** | Role update does not adjust licence counts between Super Admin and standard pools. |
| **Line managers / country for Leaves** | Membership stores **line managers** and **country** (membership form updates membership). **Leaves** service reads **line managers from the User model**, which does not define that field — leave creation may fail with *“No line manager assigned”* even after membership update. **Country** exists on both User and Membership models; which source Leaves uses in practice is inconsistent. **[Requires verification]** |
| **Org choice hook** | `useOrgChoice` has membership fetch in `useEffect` **commented out**; `OrgChoiceScreen` uses `useMemberships` hook instead (active path). |

### Data on model without confirmed UI

- **Medical information**, **work locations**, **work shift clock status** — present on membership model; no active edit/display workflow found beyond TOIL read-only display.
- **Auditor** role — valid in backend enums for create/validation; not offered in frontend change-role dropdown.

### iMS Project membership

Project-scoped memberships under **iMS Projects** are a **separate business concept** (user ↔ project). They share naming but are not part of this organisation Membership module.
