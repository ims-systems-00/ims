# Organisation Onboarding

> **V4 source repos:** `ims-v4/ims-systems-frontend`, `ims-v4/ims-systems-backend`  
> **Related product specs:** [organisation.md](./organisation.md) (ongoing tenant management), [invitations.md](./invitations.md), [authentication.md](./authentication.md)  
> Items marked **[Requires verification]** were inferred from code and not confirmed at runtime.
>
> **V5 backend status (2026-10-19):** Create organisation + Super Admin membership + OpenFGA projection. **Go Live** is `POST /api/v1/organisations/:id/go-live`. Stripe Checkout / Portal / webhooks / licence upgrades are live behind `STRIPE_ENABLED` ([stripe-payments.md](./stripe-payments.md)). Invoice Go Live notifies support via email when `EMAIL_ENABLED`. Auth0 org + S3 bucket side effects remain NoOp (S3 intentionally not ported). Partner programme module is **not** in V5 yet.
> **Go Live side effects (2026-10-21):** Licensed compliance toolkits are now provisioned at Go Live (best-effort per toolkit; first-visit lazy provisioning remains the fallback), and the activating user receives the V4 onboard-success email with the adoption pack + service charter attachments (requires `EMAIL_ENABLED=true` and an email on the identity). Monthly invoice Go Live additionally notifies support/accounts internally.
>
> **V5 frontend status (2026-10-20):** Premium minimal onboarding under `/onboard/*` (create → choose path → Go Live) with progress stepper. No skip-activation path: non-customer, non-partner organisations are redirected from the workspace back to flow-selection until Go Live completes. Card Go Live + Organisation Licenses billing redirect to Stripe. Post-Checkout return: `/auth/preparation-screen` → `/` (Live Dashboard). Partner programme is live: flow-selection links to the application (`/onboard/partner`), auto-accepted partners get a dashboard at `/partner/dashboard`, and referral codes are captured during organisation creation (see [partnership-program.md](./partnership-program.md)).
> **Licence parity (2026-10-20, V4 behaviour):** Go Live offers the full 15-toolkit compliance catalogue plus the CRM additional module. In Auth0 mode the sidebar shows only licensed compliance toolkits and shows CRM only when `licences.additionalModules` includes `CRM`; direct URLs to unlicensed toolkits/CRM show a licence notice, the Compliance API already 403s unlicensed toolkits, and the Customers API now 403s without CRM. Dev-stub keeps the full catalogue open.
>
> **Self-signup (2026-10-17):** `/login` + `/register` (V5 UI) → Auth0 AuthN → users with no memberships land on `/onboard/organisation`. See [AUTH_SELF_SIGNUP.md](../security/AUTH_SELF_SIGNUP.md).

## 1. Module Overview

**Organisation Onboarding** is the authenticated journey that takes a verified user from “no usable tenant” to a working organisation: **create organisation → choose path (customer Go Live vs partner) → activate**.

It solves the problem of getting a new company onto iMS without an administrator manually provisioning tenants. Any logged-in, email-verified user can create a tenant, become its **Super Admin**, then either activate as a paying **customer** (**Go Live**) or enrol that organisation as a **partner**. Users who already have invitations are steered to **accept invitation** before create. Users who already have memberships pick an organisation first.

This flow is **distinct from**:

- Ongoing organisation settings on `/admin/organisation` ([organisation.md](./organisation.md))
- Supplier “onboarding files”
- Invitation *sending* ([invitations.md](./invitations.md))

Primary actors: newly registered / logged-in users with no memberships; Super Admins of non-customer orgs (Go Live / partner); invitees joining via token.

---

## 2. Features and Capabilities

### Create a new organisation (wizard)

- **Capability:** Multi-step wizard to register company name, industry, size, work email, phone, full address, optional logo, optional partner referral code; confirm accuracy; create the tenant.
- **Who uses it:** Logged-in users with no memberships/partnerships (auto-routed), or anyone using “Create another iMS” / a partner-referral deep link (`?partnerCode=`).
- **Outcome:** Organisation record created; creator receives **Super Admin** membership; session switches into that organisation; UI navigates to **flow selection**.
- **Conditions:** User must be authenticated. Required: name, office email, address components, country, industry, organisation size. Logo optional (skip). Partner code optional (null when not supplied). One Super Admin licence seat is allocated and consumed by the creator membership. Organisation is **not** a customer yet (`isCustomer=false`).

### Flow selection (post-create)

- **Capability:** Choose **Create an iMS** (Go Live as customer) or **Become a partner**.
- **Who uses it:** User who just created an organisation, or who selected a non-customer / non-partner organisation at organisation selection.
- **Outcome:** Navigate to Go Live or partner application wizard.
- **Conditions:** Path choice only; no server write until a path is submitted.

### Go Live — become a customer

- **Capability:** Select products (iMS plus optional CarboCalc / Project iMS / iMS Forms), licence quantities (super admins, users, business units), compliance toolkits, optional CRM module, and payment method (card or monthly invoice); activate customer status.
- **Who uses it:** Super Admin of the current session organisation (also promoted from user profile when the org is not yet a customer).
- **Outcome:** `isCustomer=true`; licence pools allocated; organisation dashboard created with one-year system dates; compliance toolkit records created; production S3 bucket provisioned (production only); onboarding-success email with adoption pack attachments; card payers redirected to Stripe checkout; invoice payers marked Subscribed and internal teams notified.
- **Conditions:** Session organisation id must match the org being activated. Cannot Go Live if already a customer. Runs once per organisation.

### Become a partner

- **Capability:** Apply for partnership against the **current session organisation** (service provision, customer reach, website, standards, description).
- **Who uses it:** Users on the flow-selection partner path, or partnership promo entry points.
- **Outcome:** Partnership programme record created; typically auto-accepted; organisation `isPartner=true`; emails sent; user continues via preparation / org selection to partnership dashboard.
- **Conditions:** Requires organisation id on the session. One programme per user or organisation (duplicate enrolments rejected).

### Accept invitation (join existing organisation)

- **Capability:** Accept an invitation token and create membership with the invited role.
- **Who uses it:** Users with pending invitations and no memberships (auto-routed), or deep link `/auth/onboard/accept-invitaion/:token` (typo preserved in product routes).
- **Outcome:** Membership created; invitation consumed; preparation screen continues routing.
- **Conditions:** Must be logged in; token valid/unexpired. Owned in detail by [invitations.md](./invitations.md).

### Post-login system preparation routing

- **Capability:** After login / register / verify, decide the next screen by priority.
- **Who uses it:** All successful auth completions that land on `/auth/preparation-screen`.
- **Outcome:** Verification, accept-invite, create-org, organisation selection, or profile fallback.
- **Conditions:** See §8 routing table.

---

## 3. User Outcomes / End Results

| Outcome | When |
| ------- | ---- |
| New organisation exists; user is Super Admin; switched into it | Create wizard succeeds |
| User chooses customer vs partner path | Flow selection |
| Organisation is customer with licences, dashboard, toolkits; billing started | Go Live |
| Organisation is partner with referral programme | Partner apply |
| User joins existing organisation with invited role | Accept invitation |
| User lands on dashboard / partner dashboard / flow selection | Organisation selection after check-in |

---

## 4. Scope Boundaries

**In scope**

- Create organisation wizard
- Flow selection
- Go Live (licence + payment kickoff)
- Partner application wizard
- Accept-invitation screen (as an onboarding entry)
- Preparation-screen routing into onboard
- Logo upload as part of create

**Out of scope (other modules)**

- Ongoing organisation profile edit, licence *increase* requests, report subscribers ([organisation.md](./organisation.md))
- Invitation *sending* and admin invite management ([invitations.md](./invitations.md))
- Full Stripe webhook / billing portal lifecycle — see [stripe-payments.md](./stripe-payments.md)
- Supplier onboarding file attachments
- Auth0 (not used in V4; V4 uses JWT v3 auth)

---

## 5. Linked Modules

| Module | Relationship |
| ------ | ------------ |
| **Authentication** | Login/register/verify → preparation screen; JWT session + organisation switch |
| **Organisation** | Tenant record created here; ongoing manage after onboard |
| **Membership** | Creator Super Admin membership; invite acceptance membership |
| **Licence management** | Super Admin pool default 1 at create; allocations set at Go Live |
| **Partnership programme** | Referral `partnerCode`; partner apply; analytics by `referralSource` |
| **Invitations** | Alternate entry when invite pending and no organisations |
| **Compliance** | Toolkit records created at Go Live |
| **Dashboard** | Organisation dashboard created at Go Live |
| **KPI / Management review** | Default organisational KPIs seeded at create |
| **Payments / Stripe** | Card checkout session at Go Live |
| **File handler** | Public logo upload before create |
| **Email** | onboard-success, new-customer-signup, partnership create/accept |

---

## 6. Current Data Model (business view)

### Organisation — at **create**

| Area | Set at create | Notes |
| ---- | ------------- | ----- |
| Identity | Name, office email, contact number, industry, size | Contact number optional on server |
| Address | Building, street, city, postcode, state, country (+ abbr/currency/phonecode), concatenated address | Frontend often hardcodes GB/GBP/44 even if country name changes (**observed quirk**) |
| Logo | Optional `logo.src` / metadata from public upload | Placeholder if skipped |
| Flags | `isCustomer=false`, `isPartner=false` | |
| Licences | Super user allocated = 1; used → 1 after creator membership; groups/users allocated 0 | Enables one Super Admin |
| Referral | `referralSource` = partnership programme id or null | Key present; null allowed |
| Payment | Default Trial | Type unset until Go Live |
| Reference | Auto `ORG-…` | |
| System dates | Unset until Go Live | |

**Not created at create:** Default IAM business unit / access policy; compliance tools; organisation dashboard; production S3 bucket; Stripe customer.

### Organisation — at **Go Live**

| Change | Detail |
| ------ | ------ |
| `isCustomer` | `true` |
| Licence pools | Allocated groups / users / super users; compliance tools; additional modules; product flags |
| Payment | Type Card or Monthly invoice; invoice path → Subscribed; card remains Trial until Stripe webhook **[Requires verification]** |
| System dates | Start now → end +365 days |
| Related records | Dashboard; compliance tools; prod S3 bucket |

### Membership (creator)

- Links current user → new organisation with role **Super Admin**.
- Consumes one Super Admin licence seat (`used++`).

### Partnership programme (partner path)

- Applicant + organisation + service provision / reach / website / standards / description.
- Status moves to accepted on auto-accept; organisation marked partner.

---

## 7. Business Rules

### Who can create

- Any authenticated user. No special organisation role required.
- Unauthenticated users hitting the create wizard are sent to login (with return URL).

### Licence consumption

- **Create:** allocate 1 Super Admin seat; creator membership consumes it.
- **Go Live:** set allocated pools (UI enforces at least 1 Super Admin). Further invites use licence management.

### Email notifications

| Event | Recipients | When |
| ----- | ---------- | ---- |
| Onboard success | Current user | Go Live (adoption pack attachments) |
| New customer signup | Support / accounts mail | Go Live with Monthly invoice |
| Create / accept partnership | Applicant | Partner apply / auto-accept |

### Validation highlights

- **Create (server):** name, office email, address fields, country abbr/currency/phonecode, size, industry; `referralSource` ObjectId or null.
- **Create (client):** per-step yup (name ≥3, email, phone, size ≥1, address strings, accuracy checkbox).
- **Go Live (client):** payment method; superUser ≥1. **Backend has no body Joi on go-live** — **[Requires verification]** for hardening in V5.
- **Partner:** service provision, customer reach, website, standards, description required.

### Idempotency

| Action | Idempotent? |
| ------ | ----------- |
| Create organisation | **No** — each submit creates a new org |
| Go Live | **Guarded** — fails if already customer |
| Partner apply | **Guarded** — fails if user/org already enrolled |
| Accept invitation | Invite deleted after success; re-accept fails |

### Failure modes (observed / inferred)

| Failure | Behaviour |
| ------- | --------- |
| Create validation / licence | API error; wizard stays; no org switch |
| Go Live org id ≠ session | Permission error |
| Already customer | Rejected |
| Partner without org context | Rejected |
| Production S3 / Stripe failure after customer save | Possible partial state **[Requires verification]** — no full transaction rollback observed |

---

## 8. Current UI Layout and Routing

### Routes (layout `/auth`)

| Path | Screen |
| ---- | ------ |
| `/auth/onboard/organisation` | Create organisation wizard |
| `/auth/onboard/flow-selection` | Choose Go Live vs Partner |
| `/auth/onboard/go-live` | Licence / payment Go Live |
| `/auth/onboard/partner` | Partner application |
| `/auth/onboard/accept-invitaion/:token` | Accept invite (typo in route) |
| `/auth/onboard/partnership-setup-guide/` | Partner setup guide |
| `/auth/preparation-screen` | Post-login router |
| `/auth/organisation-selection` | Pick membership organisation |

Promo entry points also exist from organisation page (“Create another iMS”), user profile (Go Live / Become partner), and partnership dashboard (`?partnerCode=`).

### Create organisation wizard steps

1. **Basic** — Name, industry, company size, work email, phone  
2. **Address** — Country, building, street, city, post code, state/province  
3. **Logo** — Upload + crop, or Skip  
4. **Partner code** — Referral id, or Skip (pre-filled if `?partnerCode=`)  
5. **Confirm** — Review + accuracy checkbox → Create (single API submit)

### Go Live UI (summary)

Single licence-setup step: product toggles, BU / users / super-admin counts, additional modules (CRM), compliance toolkits, Card vs Monthly invoice, price summary → submit Go Live.

### Preparation-screen priority

1. Email not verified → resend verification  
2. `?redirect=` present → that URL  
3. No memberships **and** no partnerships **and** invitations → accept first invitation  
4. No memberships **and** no partnerships → create organisation  
5. Has memberships → organisation selection  
6. Else → user profile (e.g. partnership-only edge)

### Organisation selection after check-in

| Org state | Next |
| --------- | ---- |
| Not customer and not partner | Flow selection |
| Customer | Home dashboard `/` |
| Partner | Partnership dashboard |

---

## 9. Happy path (end-to-end)

```text
Register / Login → preparation-screen
  → (no org) /auth/onboard/organisation  [5-step wizard]
  → switch into new organisation
  → /auth/onboard/flow-selection
       ├─ Go Live → Stripe URL (card) or preparation-screen (invoice)
       └─ Partner → preparation-screen → org selection → partner dashboard
```

---

## 10. V4 API map (implementation reference)

Base organisations API (after auth deserialize): `/api/{API_VERSION}/organizations`

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `POST` | `/` | Create organisation + Super Admin membership |
| `POST` | `/:id/go-live` | Become customer |
| `PUT` | `/:id` | Update profile (post-onboard; not wizard) |
| `PUT` | `/:id/logo` | Logo after create |
| `PUT` | `/:id/logo-rectangle` | Banner (not in create wizard) |
| `GET` | `/:id/licenses` | Licence view |
| `GET` | `/:id/card-payment-session` | Card checkout (post-customer) |
| `GET` | `/:id/billing-session` | Billing portal |

Partnership create: `POST` partnership programme API.  
Invitation accept: invitations API (see [invitations.md](./invitations.md)).

**Create body (frontend):** name, officeEmail, contactNumber, sizeOfOrg, industry, address fields, countryName/Abbr/Currency, countryPhonecode, logometadata, referralSource.  
**Go Live body:** paymentType, users, groups, superUser, complianceTools, additionalModules, projectims, carbocalc, imsforms.  
**Go Live response:** organisation + optional `paymentSession.url` for card.

### Side effects checklist

| Side effect | When |
| ----------- | ---- |
| Super Admin membership + licence used++ | Create |
| Seed default KPI objectives | Create (best-effort) |
| Clear cached partner code (localStorage) | Create success (FE) |
| Switch organisation / refresh token | Create success (FE) |
| Set licences + isCustomer + system dates | Go Live |
| Create organisation dashboard | Go Live |
| Create compliance tools | Go Live |
| Create S3 bucket (production only) | Go Live |
| Stripe customer + checkout | Go Live Card |
| Mark Subscribed + internal email | Go Live Invoice |
| onboard-success email + attachments | Go Live |
| Partnership record + auto-accept + isPartner + emails | Partner apply |

### Key V4 file paths

**Frontend** (`ims-systems-frontend`)

- Routes: `src/views/onboarding/routes.js`
- Create wizard: `src/views/onboarding/anOrganisation/*`
- Go Live: `src/views/onboarding/goLive/*`
- Partner: `src/views/onboarding/asaPartner/*`
- Flow selection: `src/views/onboarding/flowSelection/Index.jsx`
- Accept invite: `src/views/onboarding/accpetInvitaion/*`
- Preparation routing: `src/views/auth/SystemPreparation/useSystemPreparation.js`
- Org choice: `src/views/auth/OrgChoiceScreen/*`
- API client: `src/services/organizationService.js`

**Backend** (`ims-systems-backend`)

- Routes: `src/routes/api/organizations.js`
- Controller: `src/controllers/organisation.js`
- Service: `src/services/organisation.js` (`initializeOrganisation`, `becomeACustomer`)
- Validation: `src/validations/organization.js`
- Model: `src/models/mongodb/system/organization/organization.js`
- Membership / licence / payments / partnership / KPI seed / onboard emails under `src/services/` and `src/email/events/`

### Observed quirks

1. Address concatenation may inject `NaN` into the stored address string (service bug).  
2. Country select may not update abbr/currency (handlers commented); FE often hardcodes GB/GBP/44.  
3. Partner accept-email link vs create-org referral query param targets differ — **[Requires verification]** which is intentional.  
4. No default IAM business unit / access policy at create (created later elsewhere or at Go Live-related setup — **[Requires verification]** for V5 parity).

---

## 11. Relationship to existing docs

| Document | Role |
| -------- | ---- |
| [organisation.md](./organisation.md) | Full tenant lifecycle and admin settings; includes create + Go Live at product level |
| **This file** | Dedicated **onboarding journey** spec: wizard steps, preparation routing, partner branch, side-effect inventory, V4 API/file map for porting |
| [invitations.md](./invitations.md) | Join existing org via invite |
| [authentication.md](./authentication.md) | Account access before onboard |

There was **no** dedicated onboarding README in the V4 repos (only changelog mentions). Use this document as the V4 SoT for organisation create / onboard when implementing or comparing V5.

---

*Specification based on V4 frontend onboarding/auth views and V4 backend organisations, membership, partnership, payments, and email code as inspected. No application code was modified to produce this document.*
