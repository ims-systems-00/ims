# Admin Authentication

## 1. Module Overview

**Admin Authentication** is how **internal iMS Systems staff** obtain and manage access to the **platform administration APIs** — a separate channel from organisation-user sign-in (V3 Authentication / regular Authentication).

Administrators are stored as distinct **iMS Admin** accounts (`ims_admins`), not as ordinary product Users. They register with company email addresses, verify email, sign in with email and password, can recover forgotten passwords, continue an active session, and sign out. Successful authentication unlocks backend administration of **partnerships**, **licence requests**, and **organisation suspension / reactivation / payment alerts**.

The module solves the problem of giving **internal operators** a controlled way into staff-only administration without mixing that access with customer organisation login.

Primary users are **iMS internal staff** who register with an allowed company email domain. There is **no dedicated Admin Authentication frontend in this repository**; capabilities are confirmed on the backend under `/admin/...`. Any consuming UI is **outside this monorepo or not confirmed here**.

---

## 2. Features and Capabilities

### Register an iMS Admin account

- **Capability:** Create a new administrator account with first name, last name, email, password, and optional industry, job title, and purpose-of-use.
- **Who uses it:** Prospective internal staff (self-registration API).
- **Outcome:** An **iMS Admin** record is created with **email verification pending**; a verification email is sent with a time-limited confirmation link. Response: *“Registration Process Started.”*
- **Conditions:**
  - Email must end with **`@imssystems.tech`** (enforced in code). Error text incorrectly says **`@imssystems.co.uk`** — **message/code discrepancy**.
  - Email must not already exist on an admin account.
  - Password required (8–50 characters per validation).
  - New accounts default to **`isActive: false`** and verification **Pending**. Role is **not** set during registration.

### Verify administrator email

- **Capability:** Confirm the registration email using the token from the verification message.
- **Who uses it:** Newly registered admins.
- **Outcome:** Verification status becomes **Verified**; verification date set; token cleared. Response: *“Admin account validation complete.”*
- **Conditions:** Valid, non-expired token that matches the stored verification token. Admin must exist for the email in the token.
- **Note:** Successful verification does **not** set `isActive` to true in the inspected update. Login also does **not** require Verified or Active — see Miscellaneous.

### Resend administrator verification email

- **Capability:** Send another verification email for an unverified admin.
- **Who uses it:** Callers supplying the admin’s id.
- **Outcome:** New verification email; *“Admin account verification email sent.”*
- **Conditions:** Admin must exist and must not already be Verified. Resend uses a **different link shape** than initial registration (see UI / discrepancies).

### Sign in as an iMS Admin

- **Capability:** Authenticate with admin email and password.
- **Who uses it:** Existing iMS Admin accounts.
- **Outcome:** Login successful; admin access and refresh credentials returned; refresh cookie set; a **session** record is created for the admin. Admin can then call protected `/admin/...` administration routes with the access credential.
- **Conditions / failures:**
  - Unknown email → *“Admin not registered with this email.”*
  - Wrong password → *“Invalid credentials.”*
  - **Not checked on login (confirmed):** email verification status, `isActive`, or admin **role**.

### Continue an admin session (refresh)

- **Capability:** Renew short-lived admin access without re-entering credentials.
- **Who uses it:** Authenticated admin clients during continued use.
- **Outcome:** New access/refresh pair; *“New pair of newTokens granted.”* Failure (expired/invalid/reuse) requires signing in again; refresh cookie cleared on failure.

### Sign out

- **Capability:** Invalidate the current admin refresh credential and clear the refresh cookie.
- **Who uses it:** Authenticated admins.
- **Outcome:** *“Provided token pair invalidated.”* Admin must sign in again to regain access.

### Recover a forgotten admin password

- **Capability:** Request a recovery email, then set a new password with the recovery proof.
- **Who uses it:** Admins who cannot sign in.
- **Outcome:**
  - Start: *“Recovery email sent for verification.”* (email contains recovery link).
  - Complete: *“Account recovered.”* Password updated; recovery token cleared.
- **Conditions:** Admin must exist for the email; recovery token must be valid, not expired, and match the stored token. New password required (8–50 characters).

---

## 3. User Outcomes / End Results

### For iMS Administrators

- **Create** an internal admin account (domain-restricted email).
- **Verify** email via emailed link / token.
- **Resend** verification if needed.
- **Sign in** to obtain administrator credentials.
- **Continue** working without retyping password while refresh remains valid.
- **Recover** access with emailed reset link and new password.
- **Sign out** and require credentials again.
- **After authentication:** call protected admin APIs to manage partnerships, approve/cancel licence requests, and alert/suspend/reactivate organisations (those actions belong to linked modules; Admin Authentication only enables entry).

### What this module does not provide (confirmed)

- Sign-in for **organisation Users** (that is V3 / regular Authentication).
- A confirmed **Admin Authentication UI** in `ims-systems-frontend` (product `/admin/*` routes are the **customer product** shell, not this staff auth).
- Enforcement at login that the account is verified or active (**fields exist; login does not check them**).
- Role-based gating at login (**role enum exists; not set on register and not checked on login**).

---

## 4. Scope Boundaries

### In scope

- iMS Admin **registration**, **verification**, **resend verification**.
- Admin **login**, **refresh**, **logout**.
- Admin **password recovery**.
- Establishing the authenticated **admin identity** used by subsequent `/admin` APIs.

### Out of scope

- **V3 Authentication / Authentication** — organisation-user account access under `/api/v3/auth`.
- **Partnership / Licence Request / Organisation administration actions** — business operations after admin auth (linked modules).
- **Older `routes/imsadmin` auth** — separate historical admin path using different models under `mongodb/admin`; not this module’s route folder.
- **Product frontend `/admin/...` pages** — organisation-user application layout, not iMS Admin Authentication screens.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **Partnership Program (admin APIs)** | After admin auth + eligibility check, admins can list, accept, soft/hard delete, and restore partnerships. |
| **License Requests (admin APIs)** | Authenticated admins can **approve** or **cancel** licence requests. |
| **Organisation (admin APIs)** | Authenticated admins can send past-due payment alerts, temporarily suspend, or reactivate organisations. |
| **License Request records** | May reference `ims_admins` as the processing admin. |
| **System email** | Sends **email-verification** and **account-recovery** messages for this module. |
| **Sessions** | A session row is created on successful admin login (user = admin id). |
| **V3 / regular Authentication** | **Separate** identity system for organisation users; not used for iMS Admin accounts. |

---

## 6. Current Data Model

Admin Authentication owns a dedicated persistent identity:

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| **iMS Admin (`ims_admins`)** | Internal staff administrator account | Created at registration; used for login, verification, recovery, refresh |
| **Email verification** | Pending/Verified proof of email ownership | Set pending on create; Verified on confirm |
| **Recovery token** | Outstanding password-recovery proof | Set on recovery request; cleared on successful recover |
| **Admin refresh tokens** | Continuable admin sessions | Rotated on login/refresh; reduced on logout |
| **Session** | Login occurrence (user agent) | Created on successful authenticate |
| **Role / isActive** | Intended classification and activation | Present on model; **not enforced by login** in inspected code |

This is **not** the organisation **User** model used by V3 Authentication.

---

## 7. Attributes

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| **Email** | Unique admin sign-in identifier | Must be `@imssystems.tech` at registration |
| **First / last / full name** | Admin identity for display and email greeting | Full name derived from first + last |
| **Password** | Credential for sign-in | Hashed; replaced on recovery |
| **Industry / job title / purpose of use** | Optional profile context at registration | Not used for access checks |
| **Email verification status / token / date** | Whether email was confirmed | Defaults Pending; Verified on confirm |
| **Is active** | Intended active flag | Defaults **false**; not set true on verify; **not checked on login** |
| **Role** | `iMS Admin` or `iMS Standard User` | Enum exists; **not assigned on register; not checked on login** |
| **Recovery token** | Password recovery proof | Cleared after successful recover |
| **Admin refresh tokens** | Session continuation family | Login / refresh / logout |
| **Profile image** | Optional attachment metadata | Not part of auth workflows inspected |

---

## 8. Current UI Layout

**No dedicated Admin Authentication frontend was confirmed in this repository.**

Investigation of `ims-systems-frontend` shows many routes under `/admin/...`, but those belong to the **organisation product application** (dashboard, risks, CRM, etc.) authenticated via **V3 Authentication**, not via `/admin/auth/login` or `x-admin-accesstoken`.

### Backend capabilities without confirmed UI here

| Capability | Backend | Frontend in this repo |
| ---------- | ------- | --------------------- |
| Register | `/admin/registration` | **Not found** |
| Verify registration | `/admin/registration/verification` | **Not found** (emails link to `CLIENT_URL` paths that may overlap product auth screens) |
| Resend verification | `/admin/registration/verification/emails` | **Not found** |
| Login | `/admin/auth/login` | **Not found** |
| Refresh | `/admin/auth/refresh-token` | **Not found** |
| Logout | `/admin/auth/logout` | **Not found** |
| Start recovery | `/admin/recovery` | **Not found** |
| Complete recovery | `/admin/recovery/verification` | **Not found** |

### Email-driven destinations (configured links)

| Flow | Link shape in email (from code) |
| ---- | -------------------------------- |
| Initial verification | `{CLIENT_URL}/auth/account-verification/{token}` |
| Resend verification | `{CLIENT_URL}/accounts/registration-verification/?registration_token=...` |
| Password recovery | `{CLIENT_URL}/auth/setuppassword/{token}` |

These paths **resemble** product Auth screens but use **different tokens/headers** than organisation-user flows. Whether a separate admin UI host consumes them: **Current behavior could not be fully determined from the inspected code** (no matching admin client in this monorepo).

---

## 9. Miscellaneous / Module-Specific Information

### Distinction from regular / V3 Authentication

| Aspect | Admin Authentication | V3 / regular Authentication |
| ------ | -------------------- | --------------------------- |
| **Who** | Internal iMS staff | Organisation users / customers |
| **Identity store** | `ims_admins` | `users` |
| **API mount** | `/admin/...` via `adminRoutes` | `/api/v3/auth` |
| **Email domain rule** | Must be `@imssystems.tech` at register | General users; disposable/MX checks |
| **After login** | Staff admin APIs (partnerships, licences, org controls) | Product app, org selection, onboarding |
| **Credential headers** | `x-admin-accesstoken` / `x-admin-refreshtoken` | Product access/refresh headers/cookies |

### Confirmed administrator access lifecycle

```text
Register (@imssystems.tech) → Verification email → Verify (status Verified)
→ Sign in (email + password) → Admin credentials issued
→ Call protected /admin APIs (partnerships, licence requests, organisations)
→ Refresh while active → Sign out

Separate: Recovery email → New password → Sign in again
```

### How the system distinguishes administrators

1. Account lives in **`ims_admins`**, not Users.
2. Login issues **admin-specific** access/refresh credentials.
3. Protected admin routers require **`adminUserDeserialization`** then **`checkImsAdmin`** (admin id must exist in `ims_admins`).
4. Organisation-user credentials from V3 do **not** satisfy this path.

### Access rules (confirmed)

- **To obtain credentials:** Valid admin email/password on an existing `ims_admins` record.
- **To use post-auth admin APIs:** Present valid admin access credential; admin record must still exist.
- **Registration eligibility:** Email domain `@imssystems.tech` only.
- **Not enforced at login:** Verified status, `isActive`, role.

### Important discrepancies and gaps

| Topic | Observation |
| ----- | ----------- |
| **Domain error message** | Code requires `@imssystems.tech`; message says `@imssystems.co.uk` |
| **Verification / active at login** | Fields exist; login does not require Verified or Active |
| **Role unused for access** | Role enum unused in register/login path |
| **Verification link inconsistency** | Initial vs resend use different URL patterns |
| **Recovery path naming** | `setuppassword` (no hyphen) vs product `setup-password` |
| **No UI in this repo** | Backend-only from investigation |
| **`isActive` never activated** | Defaults false; verify does not flip it — **Observed but business purpose unclear** |

### Related but separate: `routes/imsadmin`

An older **imsadmin** route set exists (signup/signin/signout, tenants, build requests) with different models under `mongodb/admin`. It is **not** the `adminAuth` folder and is out of primary scope; treat as a possible legacy parallel stack — **confirmation required** whether it is still used.

### Behaviour that could not be confidently determined

- Which production frontend or internal tool calls `/admin/auth/*`.
- Whether verified-only or active-only access was intended but left unfinished.
- When/how `role` and `isActive` are supposed to be set for real admins.
- Whether email links are meant to reuse product Auth pages with different headers (unlikely to work without a dedicated client).
