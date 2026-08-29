# Partnership Program

## 1. Module Overview

The **Partnership Program** module enables an existing iMS user (with an **organisation context**) to **apply to become an iMS Systems partner** and, once accepted, to **refer new customer organisations** into iMS using a **partner code** and **signup link**. A partnership record ties together a **user**, their **partner organisation**, and application information about their service provision and reach.

The module is **not** a generic affiliate or commission programme, a paid subscription, or a customer membership. In the current implementation it is a **referral partner programme**: accepted partners receive tools to invite businesses to create iMS organisations, and the product **tracks which organisations signed up using their partner code** (`referralSource`). Partners can view **aggregate analytics** and a **list of referred organisations** on a partnership dashboard.

Primary users:

- **Prospective partners** — authenticated users who already have (or are setting up) an organisation and apply through the onboarding partnership flow.
- **Accepted partners** — users whose partnership status is **iMS Accepted**, who access the **Partnership dashboard** and share referral links.
- **Referred customers** — users creating a new organisation who enter or follow a **partner code**, linking their new organisation to the referring partner.
- **iMS administrators** — can list, accept, soft-delete, restore, and hard-remove partnership records through **admin-only** endpoints (no partner-facing admin UI was found in the customer frontend).

---

## 2. Features and Capabilities

### Apply to the Partnership Program

- **Capability:** Submit a partnership application with business information about service provision, customer reach, website, standards, and a description.
- **Who uses it:** Authenticated users with an **organisation in their session** who are not already enrolled as a user or organisation in the programme.
- **Outcome:** A **Partnership Program** record is created linking the applicant user and their current organisation. A confirmation email (*“Welcome to iMS Partnership programme”* / application-received messaging) is sent. The application is **automatically accepted** in the same backend operation (see lifecycle note below). User is redirected to the **system preparation** screen after success.
- **Conditions:**
  - **Organisation context required** — application fails without `organizationId` in the session (*“Can not apply for a partnership program without an organisation id.”*).
  - **Duplicate enrolment blocked** — if the user **or** their organisation already has a partnership record, creation is rejected (*“User or organization is already enrolled in a partnership programme.”*).
  - **Required fields:** service provision (area of expertise), customer reach (number), website, standards, description (backend validation). Frontend also requires customer reach, standards, and description; website is marked mandatory in the UI.
  - Entry paths: **`/auth/onboard/partner`** (multi-step application), **Become a partner** promo on user profile, **flow selection** after organisation creation, and link from partnership dashboard when user has no `partnershipProgramId`.

### Automatic partnership acceptance on application

- **Capability:** Immediately after a successful application, the partnership is accepted without a separate user-visible review step.
- **Who uses it:** System behaviour triggered on every successful create (internal call to admin acceptance logic).
- **Outcome:**
  - Partnership **status** set to **iMS Accepted**.
  - Partner organisation **`isPartner`** flag set to **true**.
  - **Acceptance email** sent with **partner code** (partnership record ID) and **personalised signup link** (`/auth/onboard/partner?partnerCode={id}`).
- **Conditions:** This runs even though the initial *create-partnership* email tells the applicant their application is *“under careful review”* — see Miscellaneous for this discrepancy.

### View own partnership enrolment

- **Capability:** List partnership records belonging to the authenticated user.
- **Who uses it:** Any authenticated user (used during system preparation alongside memberships).
- **Outcome:** Returns the user’s partnership record(s) with pagination.
- **Conditions:** Filtered to **`userId` = current user**.

### Retrieve partnership details

- **Capability:** Load a single partnership record by ID.
- **Who uses it:** Organisation onboarding when a **partner code** is present in the URL or cached; loads partner organisation name for display.
- **Outcome:** Partnership details including populated organisation information.

### Partnership dashboard and referral tools

- **Capability:** Access a partner dashboard showing referral code, signup URL, analytics, and referred organisations.
- **Who uses it:** Accepted partners whose session includes a **`partnershipProgramId`** (partnership record ID with **iMS Accepted** status).
- **Outcome:**
  - **Partner code** displayed and copyable (partnership record ID).
  - **Signup URL** with embedded partner code (`/auth/onboard/organisation?partnerCode={id}`) — copyable and openable.
  - **Analytics cards:** count of referred organisations, total allocated business units, users, super users, and CRM module count across referred orgs; bar chart of compliance toolkit allocation across referred orgs.
  - **Organisations table:** paginated list of organisations whose **`referralSource`** matches the partner’s code, with licence summary columns and detail drawer.
- **Conditions:** Dashboard shows a prompt to join the programme if `partnershipProgramId` is absent from the session. Loading state while partner organisation profile loads.

### Refer a new customer organisation (partner code at signup)

- **Capability:** Attach a partner referral to a new organisation during customer organisation creation.
- **Who uses it:** Users creating an organisation via **`/auth/onboard/organisation`**, optionally with `?partnerCode=` in the URL.
- **Outcome:** New organisation stores **`referralSource`** = partner’s partnership record ID. Partner analytics and organisation list include this organisation.
- **Conditions:**
  - Partner code can be entered manually on the partner-code step or pre-filled from URL/localStorage cache.
  - If a valid code is supplied, the UI loads and displays the **referring partner organisation name**.
  - Partner code is cached in browser storage until organisation creation completes, then cleared.

### View referred organisation details (partner)

- **Capability:** Inspect contact, address, and licence information for a referred organisation from the partnership dashboard.
- **Who uses it:** Accepted partners from the organisations table.
- **Outcome:** Drawer showing organisation logo, name, contact details, address, and licence usage/allocation (super users, users, business units, compliance toolkits, additional modules).

### Partnership analytics (backend aggregation)

- **Capability:** Compute aggregate licence and organisation counts for all organisations referred by a partnership.
- **Who uses it:** Partnership dashboard.
- **Outcome:** Totals for organisations count, allocated users/groups/super users, compliance tool breakdown, additional modules (e.g. CRM) counts.
- **Conditions:** Analytics query scoped to partnership owner (`userId` must match caller) and organisations with matching `referralSource`.

### iMS administrator — accept partnership (manual)

- **Capability:** Manually accept a pending partnership application.
- **Who uses it:** **iMS administrators** only (`checkImsAdmin` on `/admin/ims-partnership/{id}/acceptance`).
- **Outcome:** Same as automatic acceptance: status **iMS Accepted**, organisation `isPartner` = true, acceptance email with partner code and link.
- **Conditions:** Partnership must exist and not already be **iMS Accepted**. **No admin UI in the customer frontend was found** — endpoint exists for admin portal/API use.

### iMS administrator — list all partnerships

- **Capability:** Paginated list of all partnership records across the system.
- **Who uses it:** iMS administrators (`GET /admin/ims-partnership/`).
- **Outcome:** Full partnership list for administrative review.
- **Conditions:** Admin authentication required. **No customer-frontend UI confirmed.**

### iMS administrator — remove or restore partnerships

- **Capability:** Soft-delete (trash), hard-delete (permanent), or restore partnership records.
- **Who uses it:** iMS administrators only.
- **Outcome:** Soft delete marks record deleted; restore reverses; hard delete permanently removes the record.
- **Conditions:** Admin authentication required. **No customer-frontend UI confirmed.** Hard/soft delete does **not** automatically revert organisation `isPartner` or clear `referralSource` on referred organisations — **[Requires verification]** for downstream effects.

### Update partnership information (backend)

- **Capability:** Update a partnership record via PUT.
- **Who uses it:** **No frontend usage found.** Backend endpoint exists.
- **Outcome:** Service implementation only updates **`organization`** from `organizationId` in the body; validation schema expects application fields (service provision, etc.). **Observed but business purpose unclear** — likely incomplete.

---

## 3. User Outcomes / End Results

### For prospective partners

- **Apply:** Submit partnership application after creating an organisation and logging in.
- **Receive:** Confirmation email acknowledging interest (wording suggests manual review).
- **Become active:** Immediately upon successful application (automatic acceptance), receive acceptance email with partner code and referral link.
- **Access:** Partnership dashboard at **`/partner/partnership-dashboard`** after checking into a partner organisation (session includes `partnershipProgramId`).
- **Share:** Copy partner code or signup URL to invite new customer organisations to iMS.
- **Track:** View counts and licence aggregates for organisations that signed up with their code, and browse referred organisation details.

### For referred customers

- **Enter:** Partner code when creating a new organisation (manual entry or link with `partnerCode` query parameter).
- **See:** Referring partner organisation name when code is valid.
- **Outcome:** New organisation linked to partner for tracking; no direct customer-facing “you were referred by X” workflow beyond the partner-code step display.

### For iMS administrators

- **Review:** List all partnership applications (admin API).
- **Accept:** Manually accept pending applications (admin API) — redundant with auto-accept on create unless auto-accept is disabled in future.
- **Remove:** Soft-delete, hard-delete, or restore partnership records (admin API).

### What users cannot achieve today (confirmed)

- Apply without an existing organisation session context.
- Apply twice (same user or same organisation).
- **Reject** or **decline** a partnership application through the product — **no reject status or workflow exists**.
- **Suspend** or **reactivate** a partnership through a dedicated status — only delete/restore admin operations.
- Earn or view **commissions**, **revenue share**, or **referral payouts** — **not implemented**.
- Manage partnerships from the **customer frontend admin area** — admin operations are on separate `/admin` routes only.
- Edit partnership application details after submission through the UI — **no edit screen found**.
- See **Pending** status in the UI during normal apply flow — acceptance is immediate on create.

---

## 4. Scope Boundaries

### In scope

- Partnership **application** and **enrolment** (user + organisation).
- Partnership **status** (**Pending**, **iMS Accepted**).
- **Automatic and manual acceptance** workflows.
- **Partner referral code** and **signup link** generation.
- **`referralSource`** tracking on referred organisations.
- **Partner organisation flag** (`isPartner`).
- **Partnership dashboard** (analytics, referred organisations list, referral tools).
- **Partner code capture** during customer organisation onboarding.
- **Transactional emails** on application and acceptance.
- **Session embedding** of `partnershipProgramId` for accepted partners.
- **Admin** list, accept, soft-delete, restore, hard-delete.

### Out of scope (handled elsewhere)

- **Organisation creation** (customer onboarding) — **Organisation** module; partnership only supplies optional `referralSource`.
- **Organisation membership** — **Membership** module (partner applicants need org membership to apply).
- **Customer go-live / billing** — **Organisation** / payments; partners see licence aggregates but do not process payments for referrals here.
- **Commission or affiliate payouts** — not present in inspected code.
- **CRM, marketing campaigns** — separate modules; analytics may count CRM licences on referred orgs but do not manage campaigns.
- **Partnership programme marketing content** — embedded YouTube/video promo on profile is informational only.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **Organisation** | Partnership applies to an **existing organisation**; acceptance sets **`isPartner = true`**. New customer organisations store **`referralSource`** pointing to the partnership record. Partner dashboard lists and analyses referred organisations. |
| **Membership** | Applicant must have **organisation session context** (typically via organisation membership). Organisation check-in routes **partner organisations** to the partnership dashboard instead of the customer dashboard. |
| **Users / Authentication** | Partnership tied to **`userId`**; accepted partnerships expose **`partnershipProgramId`** in the access token. System preparation loads partnerships alongside memberships for routing decisions. |
| **Onboarding** | **Apply flow** (`/auth/onboard/partner`), **flow selection** (choose partnership vs go-live), **organisation creation** (partner code step), and **partnership setup guide** entry points. |
| **License Management** | Partner analytics **aggregate licence allocations** (users, business units, super users, compliance tools, additional modules) across referred organisations — informational, not licence management. |
| **Email / Notifications** | **create-partnership** and **accept-partnership** transactional emails on application and acceptance. |

---

## 6. Current Data Model

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| **Partnership Program** | A partner enrolment linking an applying **user** and **organisation** with application details and status | Central record owned by this module |
| **Applicant user** | The person who applied and owns the partnership | Receives emails; `userId` on record; session gets `partnershipProgramId` when accepted |
| **Partner organisation** | The organisation applying to become a partner | Linked on record; **`isPartner`** set true on acceptance |
| **Referred organisation** | A customer organisation created with **`referralSource`** = partnership ID | Not owned by this module but tracked for partner analytics and listing |
| **Partnership status** | Whether the application is pending or accepted | Drives token partnership ID and partner capabilities |

There is **no separate “partner application” entity** — application fields live on the **Partnership Program** record itself.

---

## 7. Attributes

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| **Applicant (user)** | Who applied to the programme | One enrolment per user (enforced) |
| **Partner organisation** | Which organisation is becoming a partner | One enrolment per organisation (enforced); `isPartner` flag on org after acceptance |
| **Status** | Application state: **Pending** or **iMS Accepted** | Default Pending; set to iMS Accepted on acceptance. UI does not surface Pending during normal apply (auto-accept). |
| **Service provision** | Area of expertise / services the partner provides | Required on application |
| **Customer reach** | Numeric estimate of customer reach | Required on application |
| **Website** | Partner website URL | Required on application |
| **Standards** | Standards the partner works with (e.g. ISO certifications) | Required on application; free-text |
| **Description** | Narrative about the partner business | Required on application |
| **Partner code** | The partnership record’s unique ID | Used in referral links and organisation `referralSource`; shown on dashboard |
| **Referral source (on referred org)** | Which partnership referred this customer organisation | Set at organisation creation; powers analytics |
| **Created / updated timestamps** | When the partnership was created or last changed | System-maintained |

---

## 8. Current UI Layout

Partnership Program has **no single standalone navigation module** in the main admin menu. It uses **onboarding flows**, **embedded promos**, and a **partner-layout dashboard**.

### Main screens / pages

| Entry | Path / location | Purpose |
| ----- | --------------- | ------- |
| Partnership setup guide | `/auth/onboard/partnership-setup-guide/` | Public-oriented steps before account creation |
| Partnership application | `/auth/onboard/partner` | Two-step apply (basic info → application form) |
| Flow selection | `/auth/onboard/flow-selection` | Choose “Create an iMS” vs “Partnership programme” after org creation |
| Partnership dashboard | `/partner/partnership-dashboard` | Partner referral tools, analytics, referred orgs (partner layout) |
| Become a partner promo | User profile (`BecomePartnerPromo`) | Alert + video modal + button to apply |
| Partner code step | Organisation onboarding (`StepPartnerCode`) | Enter/cache partner code when creating customer org |
| Partnership button | User profile / Organisation page | Navigate to dashboard or apply flow based on `isPartner` / session |

### Important sections and views

- **Application — Basic information:** Disabled display of current organisation name; textarea for **area of expertise / service provision**; Next button.
- **Application — Application form:** Customer reach, website, standards, description; **Apply** button with loading *“Please wait”*.
- **Partnership dashboard — Left card:** Partner badge, “Official partner” label, partner code copy, signup URL copy, “Create an iMS with partner code” button.
- **Partnership dashboard — Right area:** Stats carousel (organisations, business units, users, super users, CRM), compliance tools bar chart, organisations table.
- **Organisation detail drawer:** Contact, address, licence breakdown for a referred organisation.

### Primary actions

- **Apply** — Submit partnership application.
- **Copy partner code / signup link** — Clipboard actions on dashboard.
- **Open signup link** — Launch referred organisation creation URL in new window.
- **View organisation details** — Row click on referred organisations table.
- **Become a partner** — From profile promo or flow selection.
- **Navigate to partnership dashboard** — From profile/organisation when org is partner.

### Forms

- **StepBasic** — Service provision (required).
- **StepApplication** — Customer reach, website, standards, description.
- **StepPartnerCode** — Optional partner code for referred org creation.

### Lists / tables / cards / detail views

- **Organisations table** on dashboard — Referred orgs with licence columns and detail drawer.
- **Analytics stat cards** — Aggregate counts from referred organisations.

### Navigation and workflow

**Typical partner journey:**

1. Register → create organisation → flow selection → **Partnership application** (`/auth/onboard/partner`).
2. Submit application → redirect to **system preparation** → organisation selection (if memberships exist).
3. Check in to **partner organisation** → routed to **`/partner/partnership-dashboard`**.
4. Share partner code / signup URL → referred users create organisations with code → appear in partner analytics/table.

**Typical referred customer journey:**

1. Follow signup URL with `partnerCode` → login/register → organisation onboarding with code pre-filled → create organisation.

### Material empty, loading, or restricted states

- **Not a partner:** Dashboard card *“You are not a iMS Systems partner”* with link to apply.
- **Loading:** Dashboard shows loader until partner organisation profile loads; partner code step shows loader while validating code.
- **Invalid/missing partner on code step:** Message *“Referred over from one of our strategic partners? You should have recieved a code.”*
- **Organisation detail error:** *“Could not load your organisation”* if drawer opened without selection.
- **Apply errors:** Handled via generic error notification (e.g. duplicate enrolment, missing org context).

---

## 9. Miscellaneous / Module-Specific Information

### What a partnership represents

A partnership is an **iMS Systems channel partner enrolment**: an organisation (and its applying user) joins the programme to **refer new customer organisations** to iMS. The partner receives a **referral identifier** (partner code = partnership record ID). Referred organisations are linked via **`referralSource`**. This is **referral tracking and partner tooling**, not commission management.

### Partnership lifecycle (confirmed)

| State | Meaning | How reached |
| ----- | ------- | ----------- |
| **Pending** | Default on record creation | Set automatically when record is first saved |
| **iMS Accepted** | Partner is active | Set immediately after create (auto-accept) or via admin accept endpoint |

**Transitions:**

- **Pending → iMS Accepted:** Automatic on every successful `createPartnershipProgram`, or manual admin `acceptPartnershipProgram`.
- **No reject, suspend, or cancelled statuses** exist in the enum.
- **Soft-delete / restore / hard-delete:** Admin-only; effect on `isPartner` and existing referrals **[Requires verification]**.

### Partner outcomes when active (confirmed)

1. **`partnershipProgramId`** included in user session token (when status is **iMS Accepted**).
2. Partner organisation marked **`isPartner: true`**.
3. Access to **Partnership dashboard** with referral code, signup URL, analytics, referred org list.
4. **Routing:** Checking into a partner organisation navigates to **`/partner/partnership-dashboard`** (not customer home).
5. **Handshake icon** on organisation selection for partner orgs.
6. **Email** with partner code and referral link.

**Not confirmed:** commissions, discounts, special licensing for partners, marketing asset library, or partner-specific product features beyond dashboard and referral tracking.

### Email vs implementation discrepancy

The **create-partnership** email states the application is *“under careful review”* and that a referral code will be sent *“upon successful review.”* The backend **immediately auto-accepts** and sends the **accept-partnership** email with code and link in the same request. Users experience **instant activation**, while emails describe a **manual review process**.

### Acceptance link URL discrepancy

Acceptance email referral link uses path **`/auth/onboard/partner?partnerCode=`** while the partnership dashboard signup URL uses **`/auth/onboard/organisation?partnerCode=`**. Organisation onboarding reads `partnerCode` from the **organisation** path and caches it. The accept-email link path may **not** pre-fill code for organisation creation — **[Requires verification]** of intended behaviour.

### System preparation routing discrepancy

Comments in system preparation describe routing users with partnerships to the partnership programme page, but implemented logic sends users with **memberships** to organisation selection and users with **only partnerships** (no memberships) to **`/auth/users/{id}`** (user profile), **not** the partnership dashboard. Partner dashboard access relies on checking into a partner org afterward.

### Access and permissions (confirmed)

| Action | Who |
| ------ | --- |
| Apply | Authenticated user with organisation session; not already enrolled |
| List own partnerships | Authenticated user (own records only) |
| View analytics / dashboard | User with `partnershipProgramId` in session |
| Get partnership by ID | Authenticated (used in onboarding code validation) |
| Update partnership | Backend endpoint only; no UI |
| Admin list / accept / delete / restore | **iMS Admin** only (`/admin/ims-partnership/*`) |

Partnership routes on the customer API are mounted **before** `authOrgAccess` (like memberships), but **create still requires organisation context** in the user payload.

### Distinction from other “partnership” concepts

- **Organisation `isPartner` flag** — set on acceptance; used for routing and UI badges.
- **Session `partnershipProgramId`** — accepted partnership record ID for referral analytics scope.
- **Organisation `referralSource`** — on **referred customer** orgs, not on the partner org itself.
- **iMS Project memberships** — unrelated project-scoped concept.
