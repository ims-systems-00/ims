# Authentication

## 1. Module Overview

The **Authentication** module is how people **join iMS, prove their email address, sign in and out, recover forgotten passwords, and keep working without repeatedly entering credentials**. It owns the account-access lifecycle from first registration through verified authenticated use, password recovery, silent session continuation, and sign-out.

It solves the business problem of controlling **who can enter the platform** and under what conditions — before organisation membership, licensing, or operational modules apply. New users create an account with email and password; the product expects them to **verify email** before full product use. Existing users sign in with email and password. Temporary locks apply after repeated failed attempts. Forgotten passwords are recovered through an emailed reset link.

Primary users are **prospective users** (registration), **registered but unverified users**, **verified users signing in**, and **authenticated users** continuing or ending a session. Organisation selection, invitation acceptance, and partnership onboarding happen **after** Authentication succeeds and are owned by other modules, but Authentication routes users into those next steps.

The live product mounts Authentication under `/api/v3/auth` (v3 auth implementation). A parallel older controller/route set with the same core actions also exists; this specification documents **current end-user behaviour** as exercised by the frontend against the mounted auth API.

---

## 2. Features and Capabilities

### Register a new account

- **Capability:** Create a personal account with first name, last name, email, and password.
- **Who uses it:** Prospective users on the registration screen (`/auth/register`).
- **Outcome:** A user record is created immediately with **email verification pending**. A **verification email** is sent with a time-limited confirmation link. The frontend then **signs the user in automatically** with the same credentials and sends them to the system preparation screen.
- **Conditions:**
  - Email must pass format and domain (MX) checks; **disposable emails are rejected**.
  - Email must not already belong to an existing account.
  - Password length is constrained on the form (8–25 characters).
  - Registration does **not** create an organisation or membership — that is a later onboarding step.

### Verify email address

- **Capability:** Confirm ownership of the registered email via a link from the verification message.
- **Who uses it:** Newly registered (or still pending) users.
- **Outcome:** Email verification status becomes **verified** (`varified` in system spelling). The verification token is cleared. The frontend refreshes the session and continues through preparation (organisation / invitation routing).
- **Conditions:**
  - User opens `/auth/account-verification/{token}` and clicks **Confirm**.
  - Link/token must be valid and not expired (signed for a short window at send time).
  - Token in the request must match the token stored on the user.

### Resend verification email

- **Capability:** Request another verification email when the first was missed or expired.
- **Who uses it:** Logged-in users whose email is still pending (preparation screen or protected routes send them to `/auth/resend-account-verification`).
- **Outcome:** Another verification email is sent; success toast *“Verification email sent.”*
- **Conditions:**
  - Account must exist and still be **pending** verification.
  - A **two-minute cooldown** applies after a send (`verificationEmailAfter`); earlier requests are rejected with *“Already an active link has been sent. Please wait for 2 minutes.”*
  - Already-verified users cannot resend (*“User already verified.”*).

### Sign in

- **Capability:** Access the platform with email and password.
- **Who uses it:** Existing users on `/auth/login`.
- **Outcome:** On success, the user receives authenticated access (session established). Frontend shows *Login successful* (or equivalent), stores session data, and navigates to **`/auth/preparation-screen`**, which decides the next destination (verification, invitation, organisation selection, etc.).
- **Conditions / failure outcomes:**
  - Unknown email → *“User does not exist.”*
  - Wrong password → invalid credentials message with remaining attempts warning; **bad attempt count** increases.
  - Too many failed attempts → temporary **account lock** and an **incorrect-login-attempt** email; further grant of access is blocked until the lock expires. Lock duration in code is **five minutes**; the error message text says **“an hour”** — **frontend/backend message inconsistency**.
  - **Blocked** system access, or non–full-time access that has **expired** → *“Access is blocked for this user.”*
  - Backend **does not currently refuse** sign-in solely because email is unverified (that check is commented out). The **frontend** still steers unverified users to resend verification after preparation.

### Recover a forgotten password

- **Capability:** Request a password-reset email by entering the account email.
- **Who uses it:** Users who cannot sign in (`/auth/forgotpassword`).
- **Outcome:** If the email matches a user, a reset email is sent with a link to set a new password. UI confirms that an email was sent. If no user exists → *“User does not exist.”*
- **Conditions:** Reset link points to `/auth/setup-password/{token}` and is short-lived (about **20 minutes**).

### Reset password with emailed link

- **Capability:** Choose a new password using the link from the recovery email.
- **Who uses it:** Users completing forgot-password recovery.
- **Outcome:** Password is updated; a **password-changed** confirmation email is sent; user is returned to **login**. System-generated password status is set to **blocked** (no longer treated as an active system password).
- **Conditions:**
  - Reset token must be valid, not expired, and match the token stored on the user.
  - Frontend requires new password and matching confirmation (8–25 characters).
  - Expired/invalid token → *“This verification has been expired.”* or *“Token is not valid.”*

### Continue an active session (refresh)

- **Capability:** Renew short-lived access without asking the user to type credentials again.
- **Who uses it:** Authenticated users during normal product use (automatic), including after verification and when switching organisation context.
- **Outcome:** Access continues seamlessly when temporary access has expired but the longer-lived refresh credential remains valid. If refresh fails (expired, invalid, or reuse detected), the user is sent to **logout / login** again.
- **Conditions:** Also used when invalid access responses require a retry (401 *“Invalid access token.”*). Some expiry statuses force logout with a session-expired message.

### Sign out

- **Capability:** End the authenticated session deliberately.
- **Who uses it:** Authenticated users via **Log out** in the account menu (`/auth/logout`).
- **Outcome:** Local session data is cleared; server refresh credential is invalidated; user is sent to **`/auth/login`**. UI briefly shows *“Your session has ended. We are logging you out...”*

---

## 3. User Outcomes / End Results

### Prospective and new users

- **Create** an account with name, email, and password.
- **Receive** a verification email and **confirm** the address.
- **Resend** verification if needed (with cooldown).
- **Sign in automatically** right after registration (product UX), then be guided to verify before full use.

### Existing users

- **Sign in** with email and password.
- **Recover** access via forgot-password email and reset form.
- **Continue** working without re-entering credentials while refresh remains valid.
- **Sign out** and require credentials again next time.

### Account states users experience

| State | What the user can do |
| ----- | -------------------- |
| **Registered, email pending** | Can obtain a session (backend allows grant); frontend preparation / protected routing directs them to verify before normal product use |
| **Email verified** | Continues to organisation / invitation / partnership routing after preparation |
| **Temporarily locked** | Cannot complete access grant until lock time passes |
| **System access blocked / expired** | Cannot obtain access (*Access is blocked for this user*) |
| **Signed out / session ended** | Must sign in again |

### What Authentication does not provide today (confirmed)

- Social login, MFA, passkeys, or device/session history UI.
- Creating an organisation as part of registration (onboarding modules own that).
- A dedicated password-**change** screen under Authentication for signed-in users — frontend `changePassword` calls `/auth/changepassword`, but **no matching Authentication route** was found (**frontend/backend discrepancy**).

---

## 4. Scope Boundaries

### In scope

- Account **registration**, **email verification** and **resend**.
- **Sign-in**, **sign-out**, and **session continuation** (refresh).
- **Forgot password** and **password reset**.
- Account **lockout** after failed sign-ins.
- **System access blocked / expired** checks at grant of access.
- Post-sign-in **preparation routing** that enforces verification before full product navigation (frontend).

### Out of scope (handled elsewhere)

- **Organisation** create/switch/go-live — Organisation and onboarding modules (Authentication only establishes identity and may refresh session after org switch).
- **Membership** and **Invitations** — determine which organisations the user joins after verification.
- **Partnership Program** — alternative post-login destination for partners.
- **Users** module — staff profile management, roles, and admin user lifecycle beyond auth fields.
- **Transactional Email** (notification opt-in) — separate invitation/verification product; not account registration.
- **Email Campaign** — marketing, not account access.
- **Admin (iMS Admin) authentication** — separate admin auth routes/controllers.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **Users** | Authentication creates and updates the **user identity** (password, verification, lock state, last login). Sign-in and refresh read that record. |
| **Membership** | After sign-in, preparation loads memberships to decide organisation selection. Access grant embeds organisation/role from membership when an organisation context exists. |
| **Organisation** | Not created during registration. After authentication, users without memberships are steered to organisation onboarding; users with memberships select an organisation. |
| **Invitations** | Unverified-or-verified users with pending invitations and no membership/partnership may be sent to **accept invitation** after preparation. |
| **Partnership Program** | Preparation considers partnership records when choosing next destination. |
| **Email (system mail)** | Delivers **email-verification**, **forgot-password**, **password-changed**, and **incorrect-login-attempt** messages for Authentication workflows. |
| **Onboarding** | Preparation routes into onboard organisation / flow selection / accept invitation after Authentication succeeds. |

---

## 6. Current Data Model

Authentication does **not** own a separate “session” business table for end users. It uses the **User** record and short-lived credentials issued for access.

| Entity / concept | Business meaning | Role in Authentication |
| ---------------- | ---------------- | ---------------------- |
| **User account** | Person who can register and sign in | Created at registration; credentials and verification live here |
| **Email verification state** | Whether the email address has been confirmed | Defaults to **pending**; set to **verified** on confirm |
| **Password** | Secret for sign-in | Set at registration; replaced on reset |
| **Verification / reset tokens** | One-time eligibility for email confirm or password reset | Stored on user; must match request |
| **Bad attempts / lock until** | Failed sign-in tracking and temporary lock | Protects account after repeated wrong passwords |
| **System access** | Whether the account may use the platform | Blocked or expired access prevents grant of session |
| **System password status** | Whether a system-issued password is still “active” | Set to **blocked** after verification or user password reset |
| **Refresh credentials** | Ability to continue a session without re-typing password | Stored as a family of refresh values on the user; invalidated on sign-out |
| **Membership (external)** | Link to an organisation | Used when granting organisation-scoped access after auth |

---

## 7. Attributes

Authentication-relevant attributes on the user account (business meaning only):

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| **First name / Last name / Display name** | Identity shown in communications and profile | Required at registration |
| **Email** | Unique sign-in identifier and delivery address | Lowercased; unique |
| **Password** | Credential for sign-in | Stored hashed; never returned in API responses |
| **Email verified status** | `pending` or verified (`varified`) | Defaults to pending; gates frontend full access |
| **Email verified on** | When verification completed | Set on successful verify |
| **Verification email after** | Earliest time another verification email may be sent | Enforces ~2-minute resend cooldown |
| **Email verification token** | Current outstanding verification proof | Cleared after successful verify |
| **Reset token** | Current outstanding password-reset proof | Set on forgot-password; must match on reset |
| **Bad attempts** | Count of consecutive failed sign-ins | Reset on successful access grant |
| **Locked until** | Temporary ban on access grant | Set after too many failed attempts |
| **System access status / period / expires** | Platform eligibility | Blocked or expired non–full-time access refuses grant |
| **System password status** | Active vs blocked system password | Blocked after verify/reset |
| **Logged in on** | Last successful access grant time | Updated when access is granted |
| **Refresh tokens (family)** | Active session-continuation credentials | Removed/rotated on refresh and sign-out |

---

## 8. Current UI Layout

All primary Authentication screens use the **Auth layout** (branded auth shell) unless noted.

### Registration — `/auth/register`

- Heading: *Hey there!* / *Your digital age adventure starts here.*
- Fields: First name, Last name, Email, Password.
- Primary action: **Sign up** (busy: *Signing up*).
- Link to **Login**.
- On success: auto login → `/auth/preparation-screen`.

### Sign-in — `/auth/login`

- Heading: *Hey there!* / welcome copy.
- Fields: Email, Password.
- Links: **Forgot password?**, **Create an account**.
- Primary action: **Login** (busy: *Logging in*).
- On success: preparation screen (optional `redirect` query preserved for later).

### System preparation — `/auth/preparation-screen`

- Loading/orchestration screen (not a form).
- Priority routing:
  1. Unverified → **Resend verification**
  2. Optional external `redirect` query
  3. No org/partnership but invitations → **Accept invitation**
  4. No org/partnership → **Onboard organisation**
  5. Has memberships → **Organisation selection**
  6. Fallback profile route
- On error → login.

### Verify account — `/auth/account-verification/:token`

- Heading: *Verify Account*
- Instruction to confirm.
- **Confirm** button submits verification, refreshes session, then preparation screen.

### Resend verification — `/auth/resend-account-verification`

- Heading: *Please verify your account.*
- Explains email was sent; **Resend verification** button.
- Reached from preparation and from protected routes when email is pending.

### Forgot password — `/auth/forgotpassword`

- Heading: *Forgot password?*
- Email field; **Send verification email** (copy says verification code; actual delivery is a **reset link**).
- Success copy: email sent to reset password.
- Link back to **Login**.

### Reset password — `/auth/setup-password/:token`

- Heading: *Reset your password*
- New password + confirm; **Confirm** disabled until passwords match.
- On success: redirect to login.

### Sign-out — `/auth/logout`

- Full-page spinner message: session ended / logging out.
- Triggered from account menu **Log out**, and automatically on certain expired-session responses.

### Organisation selection — `/auth/organisation-selection`

- Post-authentication screen (not credential entry): choose membership organisation; continues into product or further onboarding.

---

## 9. Miscellaneous / Module-Specific Information

### Confirmed account-access lifecycle

```text
Register → (auto sign-in) → Preparation
                ↓
         Email pending? → Resend / Verify via email link → Preparation
                ↓
    Invitation / Organisation onboarding / Organisation selection → Product use
                ↓
    Silent session continuation (refresh) while active
                ↓
    Sign-out → Login

Separate path: Forgot password → Email link → Reset password → Login
```

### Verification enforcement: frontend vs backend

- **Frontend:** Preparation and protected routing require verified email before normal product use.
- **Backend grant of access:** Pending-email check is **commented out**, so the API can still issue access for unverified users. Product behaviour relies on frontend gating.

### Mounted API vs listed controller file

- User-specified starting controllers live in `controllers/auth.js`.
- The application currently mounts **`v3auth`** at `/auth` for the same core workflows (registration, sign-in, refresh, sign-out, verification, forgot/reset password).
- Behaviour of the listed capabilities is aligned; v3 adds optional redirect/OAuth-style helpers used for known-host redirects. **No dedicated iMS frontend screens** were found that drive the authorize/token exchange as a primary login path — **Observed but business purpose for end users of this repo is limited / confirmation required** for cross-product login.

### Important inconsistencies and incomplete behaviour

| Topic | Observation |
| ----- | ----------- |
| **Lock duration messaging** | Code locks about **5 minutes**; error text says **“an hour.”** |
| **Forgot-password UI copy** | Mentions “verification code”; email delivers a **reset link**. |
| **Resend verification link base URL** | Resend implementation references an undefined client URL variable when building the link — **Implementation suggests broken or fragile resend link construction; confirmation/fix required.** |
| **Password reset token cleanup** | Successful reset does not clearly clear `resetToken` on the user in the inspected update — **confirmation required** whether reuse of the same link is possible. |
| **Change password API** | Frontend calls `/auth/changepassword`; **no Authentication route** found for it. |
| **Spelling** | Verified status stored as **`varified`** throughout. |

### Access rules summary (business)

- Sign-in requires valid email/password and an account that is not locked and not blocked/expired for system access.
- Full product use in the UI requires **verified email**.
- Organisation-scoped APIs require organisation context obtained after membership/organisation selection (Authentication alone may leave organisation null until then).
- Registration is **not** invitation- or licence-gated; those constrain later onboarding and licensed features, not account creation itself.

### Behaviour that could not be confidently determined

- Whether every production client enforces the same frontend verification gate.
- Full end-user product surface for OAuth authorize/code/token flows outside this frontend.
- Whether password-reset tokens are invalidated after first use beyond matching the stored value.
- Exact ACCESS/REFRESH lifetime values (environment-configured) as experienced by users in each environment.
