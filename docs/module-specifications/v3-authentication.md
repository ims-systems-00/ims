# V3 Authentication

## 1. Module Overview

**V3 Authentication** is the **live account-access and cross-application sign-in surface** for iMS. It is mounted at `/api/v3/auth` and is the API the current product frontend uses for registration, email verification, sign-in, password recovery, session continuation, and sign-out.

Beyond those account-access workflows, V3 also provides a **connected-application handoff**: another iMS product (or known host) can obtain a login URL, a short-lived **authorization code** after the user authenticates, and then exchange that code for an authenticated session. This supports a shared identity across related applications such as the main iMS app, Carbo Calc, Project iMS, Go Zero, and IMS Forms (as listed in the known-hosts catalogue).

**What “V3” means in this codebase (confirmed):**

- It is the **version of the Authentication API currently mounted** for user-facing product traffic (`apiRoutes` wires `/auth` to `v3auth`, not the older `routes/api/auth.js`).
- It uses the **`v3Auth` service layer** (`RegistrationService` / `AuthService` under `services/v3Auth`), not the older `services/account` stack used by the unmounted `controllers/auth.js`.
- It is **not** a separate product brand in the UI; the same auth screens under `/auth/*` in this repository call V3.
- It **extends** classic account access with **authorize / authorization-code / token** handoff and **transactional email invitation acceptance**.

Primary users and parties:

- **Prospective and existing users** of the iMS accounts experience (registration, login, verification, password recovery).
- **Authenticated users** continuing or ending a session.
- **Connected applications** (known hosts) that start a sign-in handoff and later complete access with an authorization code.
- **External notification invitees** who accept a transactional email invitation (opt-in), via a public verification action hosted on V3.

---

## 2. Features and Capabilities

### Register a new account

- **Capability:** Create a personal account with first name, last name, email, and password.
- **Who uses it:** Prospective users on `/auth/register` (this frontend).
- **Outcome:** User record created with **email verification pending**; verification email sent using the **request origin** (or configured client URL) in the confirmation link. Frontend then **auto-signs the user in** and sends them to system preparation.
- **Conditions:** Disposable emails rejected; email format and domain (MX) validated; email must be unique. Does **not** create organisation or membership.

### Verify email address

- **Capability:** Confirm ownership of the registered email via the emailed link.
- **Who uses it:** Users with pending verification (`/auth/account-verification/:token`).
- **Outcome:** Email status set to verified (`varified`); verification token cleared; frontend refreshes session and continues preparation routing.
- **Conditions:** Token must be valid, not expired, and match the stored verification token.

### Resend verification email

- **Capability:** Send another verification email while status remains pending.
- **Who uses it:** Users directed to `/auth/resend-account-verification`.
- **Outcome:** New verification email; success *“Verification email sent.”*
- **Conditions:** Account exists and is still pending; **~2-minute cooldown** between sends. Already verified users cannot resend.

### Sign in with email and password

- **Capability:** Authenticate with email and password and establish a product session.
- **Who uses it:** Existing users on `/auth/login`.
- **Outcome:** Login successful; access and refresh credentials issued (including http-only cookies in V3); frontend stores session and goes to **preparation**. Optional **`redirect_uri`** (when supplied and allowed) also produces a **`redirectUri`** containing an authorization code for a connected-application return.
- **Conditions / failures:** Unknown user; invalid password (attempt counting and temporary lock); locked account; blocked or expired system access. Backend does **not** currently refuse grant solely for pending email (check commented out); **frontend** still steers unverified users to resend verification after preparation.

### Recover forgotten password

- **Capability:** Request a password-reset email.
- **Who uses it:** Users on `/auth/forgotpassword`.
- **Outcome:** Reset email with link to `/auth/setup-password/{token}` built from the **request origin** when available. Unknown email → *“User does not exist.”*

### Reset password

- **Capability:** Set a new password using the emailed reset proof.
- **Who uses it:** Users completing recovery.
- **Outcome:** Password updated; password-changed email sent; system-password status blocked; UI returns to login.
- **Conditions:** Token valid, not expired, and matching the stored reset token.

### Continue an active session (refresh)

- **Capability:** Renew short-lived access without re-entering credentials; optionally refresh with organisation / group context headers.
- **Who uses it:** Authenticated product use (automatic); organisation switch flows.
- **Outcome:** Continued access when refresh remains valid. Failure → logout / must sign in again.

### Sign out

- **Capability:** End the authenticated session.
- **Who uses it:** Users via account menu **Log out** (`/auth/logout`).
- **Outcome:** Local session cleared; refresh credential invalidated; access cookies cleared; user sent to login.

### Start connected-application authorization (`authorize`)

- **Capability:** Give a **connected application** the URL where the user should sign in, carrying the application’s return address.
- **Who uses it:** External / sibling product clients (not driven by screens in this frontend repository).
- **Outcome:** Response returns an **`authUrl`** pointing at the **IMS Accounts** login page for the current environment, with `redirect_uri` attached as a query parameter. Query may also include `response_type`, `client_id`, and `state`, but **only `redirect_uri` is used** when building the returned login URL.
- **Conditions:** `redirect_uri` must be a URI on an **allowed known host**. There is **no user consent / approve / deny screen** in this flow — authorization here means **“send the user to Accounts login so they can authenticate and return.”**

### Issue an authorization code for an already signed-in user (`authCode`)

- **Capability:** For a user who is **already authenticated**, produce a short-lived **authorization code** embedded in a return URL.
- **Who uses it:** Authenticated callers / clients that need to hand identity to another known host (requires an authenticated request).
- **Outcome:** Returns a `redirect_uri` with a `code` query parameter identifying the user’s email for a limited time (~20 minutes).
- **Conditions:** User must already be signed in. `redirect_uri` must pass known-host validation. **No dedicated UI** in this frontend.

### Exchange an authorization code for a session (`token`)

- **Capability:** Complete the connected-application handoff by exchanging an authorization code for a full authenticated session (same style of outcome as password sign-in).
- **Who uses it:** Connected applications after receiving `code` on their redirect URL.
- **Outcome:** Session established (*“Login successful.”*); access and refresh credentials issued. Invalid code → unauthorised.
- **Conditions:** Valid, unexpired authorization code that maps to an existing user email. **No UI in this frontend** — backend/client-facing.

### Accept transactional email invitation (`txnEmailInvitation`)

- **Capability:** Mark an external **notification-access** invitation as accepted when the recipient submits the invitation token.
- **Who uses it:** Recipients of Transactional Email invitations (public endpoint).
- **Outcome:** Matching **txn email** record set to verified; *“Txn email verified successfully.”*
- **Conditions:** Valid non-expired token; txn email record must exist. This does **not** create a full user account and is **not** the same as organisation member invitations. Invitation **creation** is owned by the **Transactional Email** module; V3 only hosts **acceptance**.

---

## 3. User Outcomes / End Results

### Account access (this product)

- Register, verify (or resend), sign in, recover password, stay signed in via refresh, and sign out.
- After sign-in, preparation routes into verification, invitation acceptance, organisation onboarding, or organisation selection as applicable.

### Connected-application handoff

- A known product can **start** sign-in by obtaining an Accounts login URL (`authorize`).
- After the user authenticates (or if already signed in via `authCode`), the product receives a **code** on its redirect URL.
- The product **completes** access by exchanging the code (`token`) and receiving a session equivalent to login.

### Notification opt-in acceptance

- An invited external address can **accept** notification access without becoming a full platform user through V3’s verification endpoint.

### What users cannot do through V3 alone today (confirmed)

- Approve or deny a rich “scopes / permissions” consent screen — **none exists**.
- Manage connected applications as a catalogue in this UI.
- Complete transactional email acceptance through a dedicated page in this frontend (link target exists in email; verification page for `/auth/txl-email/verify` **not found** here).
- Rely on the older unmounted `controllers/auth` route stack for live traffic — it is **not** mounted in `apiRoutes`.

---

## 4. Scope Boundaries

### In scope

- All account-access workflows exposed by `v3auth` (registration through sign-out).
- Connected-application **authorize → code → token** handoff.
- Optional `redirect_uri` on password sign-in that returns a code-bearing redirect.
- Public **transactional email invitation acceptance**.
- Origin-aware verification and password-reset link construction.

### Out of scope

- **Older Authentication controller** (`controllers/auth` + `services/account`) — parallel/legacy implementation; **not** the live mount.
- **iMS Admin authentication** — separate admin auth.
- **Organisation / Membership / Invitations / Partnership / Onboarding** business processes after preparation (V3 only authenticates and routes).
- **Transactional Email** catalogue create/list/delete — owned by that module; V3 only accepts invitation tokens.
- **Email Campaign** and other non-auth mail.

---

## 5. Linked Modules

| Linked Module / capability | Business relationship |
| -------------------------- | --------------------- |
| **Users** | Account identity, password, verification, lock, and refresh credential family live on the user. |
| **Membership / Organisation** | After login, preparation and refresh may attach organisation context; grant embeds membership role when present. |
| **Invitations** | Post-login routing may send users to accept org invitations — separate from txn email invitations. |
| **Partnership Program** | Preparation may consider partnership status for next destination. |
| **Onboarding** | Destination after verified authentication when no organisation yet. |
| **Transactional Email** | Creates notification-access invites and emails; V3 **`txnEmailInvitation`** completes acceptance. |
| **System email** | Verification, forgot-password, password-changed, incorrect-login-attempt, and txn-email-invitation templates. |
| **Connected known hosts** | Carbo Calc, Project iMS, Go Zero, IMS Forms, IMS Systems Frontend, and IMS Accounts — allowed redirect destinations / Accounts login host. |

---

## 6. Current Data Model

V3 Authentication does not introduce a separate “authorization request” store. It uses **User** account state, **short-lived codes** carried in URLs, and **Txn Email** records for notification opt-in.

| Entity / concept | Business meaning | Role in V3 Authentication |
| ---------------- | ---------------- | ------------------------- |
| **User account** | Person who registers and signs in | Core identity for all account-access flows |
| **Email verification state** | Pending vs verified | Defaults pending; set verified on confirm |
| **Password / reset token** | Sign-in secret and recovery proof | Registration, sign-in, forgot/reset |
| **Bad attempts / lock until** | Failed sign-in protection | Temporary lock after repeated failures |
| **System access** | Whether the account may use the platform | Blocks grant when blocked/expired |
| **Refresh credential family** | Session continuity | Refresh and sign-out |
| **Authorization code (transient)** | Short-lived proof of identity for handoff | Created for redirect; consumed by `token`; **not persisted** as a business record |
| **Txn Email record** | External address invited for notifications | Verified by `txnEmailInvitation` |
| **Membership (external)** | Organisation link | Used when granting org-scoped session context |

---

## 7. Attributes

### Account access

| Attribute | Business meaning | Workflow |
| --------- | ---------------- | -------- |
| **Email / password** | Sign-in identity and secret | Registration, sign-in, reset |
| **Email verified status / on** | Whether email was confirmed | Verify, preparation gating |
| **Verification / reset tokens** | Outstanding proof for confirm or reset | Verify, resend, forgot, reset |
| **Verification email after** | Resend cooldown | Resend verification |
| **Bad attempts / locked until** | Lockout state | Sign-in |
| **System access status / period / expires** | Platform eligibility | Grant of access |
| **System password status** | System-issued password still active? | Cleared/blocked after verify or reset |
| **Refresh tokens** | Continuable sessions | Refresh, sign-out |
| **Logged in on** | Last successful grant | Sign-in / token / refresh grant |

### Connected-application handoff

| Attribute | Business meaning | Workflow |
| --------- | ---------------- | -------- |
| **Redirect URI** | Where the user/client should return after Accounts login | `authorize`, `authCode`, optional sign-in |
| **Authorization code** | Temporary identity proof for the return destination | Produced by sign-in/`authCode`; consumed by `token` |
| **Client id / response type / state** | Accepted on `authorize` query | **Observed but not used** when building `authUrl` — business effect unclear |

### Transactional invitation

| Attribute | Business meaning | Workflow |
| --------- | ---------------- | -------- |
| **Invitation token** | Proof from the notification invite email | `txnEmailInvitation` |
| **Txn email verified flag** | Recipient accepted notifications | Set true on accept |

---

## 8. Current UI Layout

### Consumed by this repository’s frontend (account access)

Same Auth layout screens used against `/api/{version}/auth` (V3 mount):

| Screen | Path | Role |
| ------ | ---- | ---- |
| Register | `/auth/register` | Sign up → auto login → preparation |
| Login | `/auth/login` | Email/password; forgot/create links |
| Preparation | `/auth/preparation-screen` | Routes by verification / invitation / org |
| Verify | `/auth/account-verification/:token` | Confirm button |
| Resend verification | `/auth/resend-account-verification` | Resend button |
| Forgot password | `/auth/forgotpassword` | Email → reset mail |
| Setup password | `/auth/setup-password/:token` | New password + confirm → login |
| Logout | `/auth/logout` | Clears session → login |
| Organisation selection | `/auth/organisation-selection` | Post-auth org choice |

**Note:** Login in this frontend does **not** send `redirect_uri`. Connected-app return after login is therefore **not completed by these screens** unless another client or Accounts host does so.

### No UI in this frontend (backend / external-client facing)

| Capability | UI in this repo |
| ---------- | ---------------- |
| **`authorize`** | None — returns login URL for IMS Accounts host |
| **`authCode`** | None — authenticated API only |
| **`token`** | None — client exchanges code for session |
| **`txnEmailInvitation`** | None — email link targets `/auth/txl-email/verify/{token}` but **no matching route** found here |

There is **no** consent/deny authorization screen and **no** connected-app admin UI in the inspected frontend.

---

## 9. Miscellaneous / Module-Specific Information

### V3 vs standard (legacy) Authentication

| Aspect | V3 Authentication (live) | Legacy Authentication (`controllers/auth` + `routes/api/auth.js`) |
| ------ | ------------------------ | ------------------------------------------------------------------ |
| **Mounted for product API** | Yes — `/api/v3/auth` | **No** — route file present but not wired in `apiRoutes` |
| **Service layer** | `services/v3Auth` | `services/account` |
| **Cookies on login** | Access + refresh (`__imsat__`, `__imsrt__`) | Refresh cookie in inspected controller; access mainly in response body |
| **Registration links** | Prefer **request origin** as client URL | Relies on configured client URL in older registration path |
| **Password reset links** | Prefer **request origin** | Configured `CLIENT_URL` |
| **`redirect_uri` on sign-in** | Supported → returns code-bearing redirect | Not present |
| **`authorize` / `authCode` / `token`** | Present | Absent |
| **`txnEmailInvitation`** | Present | Absent |
| **Frontend consumption** | This app’s `authService` | Not the live mount |

**Conclusion:** V3 is the **current Authentication implementation** for this product, plus **cross-app handoff** and **txn-email acceptance**. The older module remains as dormant/parallel code.

### Connected-application journey (confirmed shape)

```text
Connected app → authorize (gets IMS Accounts login URL + redirect_uri)
→ User signs in on Accounts (or already signed in → authCode)
→ Return URL includes short-lived code
→ Connected app → token (exchanges code) → session like login
```

Password sign-in **with** `redirect_uri` can also return `redirectUri` with a code in one step. This frontend’s login form does not use that option.

**Allowed return destinations** are restricted to known hosts (Accounts, main frontend, Carbo Calc, Project iMS, Go Zero, IMS Forms) per environment.

### Relationship: authorize, authCode, and token

| Step | Business purpose |
| ---- | ---------------- |
| **authorize** | “Where should this user go to sign in so they can return to my app?” |
| **authCode** | “User is already signed in — give my return URL a short-lived code.” |
| **token** | “Here is the code — establish a full session for that user.” |

This is a **lightweight shared-login handoff** between known iMS products. It is **not** a full consent-based permission grant UI. Naming resembles common authorization patterns, but behaviour must be read as implemented above — not as a complete industry-standard authorization server.

### Transactional email invitation vs Invitations module

| | V3 `txnEmailInvitation` | Organisation **Invitations** |
| - | ------------------------ | ---------------------------- |
| **Purpose** | Opt in to receive organisation **notifications** | Join an organisation as a **member** |
| **Creates user?** | No | Invitation/onboarding may lead to membership |
| **Who starts it** | Org user via Transactional Email API | Invitation workflows |
| **V3 role** | Accept token only | Preparation may route to accept-invitation after login |

### Account-access rules (summary)

- Sign-in requires valid credentials and unlocked, non-blocked account.
- Full product UI use expects **verified email** (frontend gating).
- Connected-app redirects only to **known hosts**.
- Authorization code identifies **email** for a short window, then `token` grants session like login.
- Txn email acceptance only flips **invitation verified** state.

### Frontend / backend discrepancies

| Topic | Observation |
| ----- | ----------- |
| **Verification enforcement** | Frontend gates; backend grant check commented out |
| **Connected-app login** | Backend supports `redirect_uri` / authorize / code / token; this frontend does not call them |
| **Txn email verify page** | Email links to `/auth/txl-email/verify/...`; route missing in this frontend |
| **Resend verification link construction** | Service uses an undefined client URL variable when building the link — **fragile; confirmation required** |
| **Lock messaging** | ~5-minute lock vs “hour” error text |
| **authorize unused query fields** | `client_id`, `response_type`, `state` accepted but unused in URL build |
| **Change password** | Frontend posts `/auth/changepassword`; no V3 route found |

### Behaviour that could not be confidently determined

- Exact calling sequence inside Carbo Calc / Project iMS / Go Zero / Forms codebases (outside this monorepo).
- Whether a separate **Accounts** deployment (port 4000 / accounts.imssystems.tech) is a distinct frontend from this repo’s app (port 3000) or another build of similar screens.
- Whether `state` was intended for CSRF/correlation and simply not wired yet.
- Downstream use of verified txn emails after acceptance (see Transactional Email specification).
