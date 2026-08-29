# Organisation

## 1. Module Overview

The **Organisation** module is the central tenant entity in iMS. An Organisation represents a company or institution using the platform: its identity, address and contact details, branding, licence entitlements, billing relationship, operational reporting period, incident resolution targets, and scheduled dashboard report recipients.

Its primary business purpose is to give organisation administrators a single place to manage **who the organisation is**, **what they are licensed to use**, **how they pay**, and **organisation-wide settings** that affect dashboards, incidents, and reporting—while allowing users who belong to multiple organisations to switch between them.

The module solves the problem of scattered tenant configuration by anchoring all organisation-scoped business data to one record. Users, business units, compliance toolkits, and operational modules all run in the context of an active Organisation.

Primary users are **Super Admins** and users with **Organisation → Manage** or **Licence Management → Manage** permissions. All authenticated users can view basic organisation context when switching organisations. **Go Live** (becoming a customer) is initiated during onboarding by the organisation’s Super Admin.

---

## 2. Features and Capabilities

### Create a new organisation

- **Capability:** Register a new organisation with company name, industry, size, contact details, full address, optional logo, and optional partner referral code; automatically join the creator as Super Admin.
- **Who uses it:** Any logged-in user via the onboarding flow (`/auth/onboard/organisation`), also reachable from “Create another iMS” on the organisation page.
- **Outcome:** A new organisation record is created; the creator receives a Super Admin **membership** in that organisation and is switched into it; user proceeds to flow selection (go-live, partner, etc.).
- **Conditions:** Required fields include name, office email, address components, country, industry, and organisation size. Validation also requires a referral source field (partner programme ID); the UI allows null when no partner code is supplied—**implementation suggests this may fail validation** if no partner code is cached. One user licence (Super Admin pool) is consumed via membership creation. No licences, compliance tools, or customer status are assigned until **Go Live**.

### View current organisation profile

- **Capability:** View organisation name, industry, work email, contact number, company number, full address, logos, and (when a customer) licences, incident resolution times, system dates, and report subscribers.
- **Who uses it:** Users navigating to **My organisation** (`/admin/organisation`); route is invisible in sidebar but linked from user profile (“Organisation(s)”).
- **Outcome:** Administrators and members see the organisation the session is scoped to, plus a list of all organisations they belong to with switch actions.
- **Conditions:** Page loads organisation by ID from the current session token. Customer-only sections (licences, resolution times, system dates, report subscribers) are hidden until `isCustomer` is true.

### Switch active organisation

- **Capability:** Check in to another organisation the user belongs to.
- **Who uses it:** Users with multiple memberships, from the organisation sidebar card.
- **Outcome:** Session context switches to the selected organisation; user is redirected to dashboard (customer), partnership dashboard (partner), or remains in onboarding context (non-customer).
- **Conditions:** Confirmation dialog before switch. Current organisation is marked with an indicator.

### Update organisation information

- **Capability:** Edit name, office email, address fields, company number, VAT number, bank details, and mileage reimbursement rate/currency.
- **Who uses it:** Users with **Organisation → Manage** permission.
- **Outcome:** Organisation profile fields update in storage.
- **Conditions:** Edit drawer on Basic Information card. **Observed discrepancy:** successful update shows a notification but the local organisation state is **not refreshed** in the store (commented-out `setOrganisation`), so the UI may show stale values until page reload or manual refresh.

### Upload organisation logo and banner

- **Capability:** Upload a square **Logo** and a wide **Banner** image representing the organisation visually.
- **Who uses it:** Any user viewing the organisation page (no separate permission gate on upload controls).
- **Outcome:** Logo updates `logo.src` (shown in organisation switcher, membership lists, and avatar-style contexts); banner updates `logoRectangleSrc` (wide format for banner display).
- **Conditions:** Two separate upload paths: Logo uses `updateLogo`; Banner uses `updateLogoRectangle`. Files upload to public object storage first, then metadata is saved on the organisation. Legacy modal-based logo upload code also exists but primary UI uses inline drop zones.

### View licence allocation and usage

- **Capability:** See used vs allocated counts for Super users, standard users, business units, compliance toolkits, and additional modules (CarboCalc, Project iMS, etc.).
- **Who uses it:** Customer organisations; **Licence Management → Manage** for requesting additional licences.
- **Outcome:** Administrators understand remaining capacity before inviting users or creating business units.
- **Conditions:** Licence card visible only when `isCustomer`. **Request license** opens a form that submits to the separate **Licence Management** service (not a direct organisation API allocation). Card payment / Manage billing buttons appear alongside for billing administrators.

### Request additional licences

- **Capability:** Submit a licence increase request specifying super users, users, business units, compliance toolkits, additional modules, and optional message.
- **Who uses it:** Users with **Licence Management → Manage**.
- **Outcome:** Request is sent via Licence Management API; membership data is refreshed on success.
- **Conditions:** Handled by Licence Management module API; Organisation page exposes the request drawer only for customers.

### Configure incident resolution times

- **Capability:** Set target resolution times in hours for incident priorities P1, P2, P3, and P4 at organisation level.
- **Who uses it:** Users with **Organisation → Manage** on customer organisations.
- **Outcome:** Organisation stores four numeric hour values used as **expected resolution benchmarks** on the organisational dashboard and stats.
- **Conditions:** Visible and editable only when `isCustomer`. Dashboard compares average actual resolution time per priority against these targets and flags alerts when averages exceed targets (defaults 24/48/72/96 hours if unset). **This is a reporting benchmark, not an enforced incident workflow deadline** in the Incidents module itself.

### Configure system dates (reporting period)

- **Capability:** Set organisation **system start date** and **system end date** defining the active reporting/management period.
- **Who uses it:** Users with **Organisation → Manage** on customer organisations.
- **Outcome:** Reporting period updates on the organisation and drives dashboard availability and scheduled reporting.
- **Conditions:** After Go Live, initial period is one year from activation. Updates are restricted once the period is locked (`systemDate.unset` becomes false and `lockedAfter` is set seven days after first explicit update). Dashboard queries require `systemDate.end >= now`—expired periods make dashboards unavailable until dates are refreshed. A nightly job auto-refreshes dates when the end date passes.

### Manage report subscribers (report intervals)

- **Capability:** Add and remove external report recipients with name, email, issue date, and delivery interval (Monthly, Quarterly, Half yearly, Yearly).
- **Who uses it:** Users with **Organisation → Manage** on customer organisations.
- **Outcome:** Subscribers receive scheduled **dashboard PDF reports** when their `nextDate` matches the current date; interval advances after send.
- **Conditions:** UI labels this **Report intervals**. Subscribers are **external email contacts**, not necessarily platform users. A nightly cron generates and emails reports. Duplicate email check exists in backend but **implementation suggests the duplicate error may not be thrown** (error constructed without throw).

### Go Live — become a customer

- **Capability:** Activate the organisation as a paying **customer**: select licence quantities (super admins, users, business units), compliance toolkits, optional additional modules (CRM, CarboCalc, Project iMS, iMS Forms), and payment method (card or monthly invoice).
- **Who uses it:** Organisation Super Admin during onboarding (`/auth/onboard/go-live`), also promoted from user profile when organisation is not yet a customer.
- **Outcome:** `isCustomer` set to true; licence pools allocated; compliance tool records created; organisation dashboard created with one-year system dates; production S3 storage bucket provisioned; onboarding success email sent with adoption pack attachments; card payers redirected to payment checkout; invoice payers marked Subscribed and internal teams notified.
- **Conditions:** Can only run once per organisation; must match session organisation ID. Cannot Go Live for an organisation that already has an iMS setup.

### Pay by card (checkout session)

- **Capability:** Start a card payment session for ongoing subscription charges after becoming a customer.
- **Who uses it:** Users with **Licence Management → Manage** when no Stripe subscription exists yet.
- **Outcome:** User is redirected to external checkout; on success, subscription is associated with the organisation (business outcome—exact post-payment UI flow **could not be fully determined** from Organisation module code alone).
- **Conditions:** Organisation must already be a customer; must not already have an active Stripe subscription; session user must belong to the organisation.

### Manage billing (billing portal session)

- **Capability:** Open a self-service billing portal for organisations with an active card subscription.
- **Who uses it:** Users with **Licence Management → Manage** when `stripeSubscriptionId` exists.
- **Outcome:** User is redirected to external billing portal to manage payment method and subscription.
- **Conditions:** Customer organisation with existing Stripe subscription only.

### List organisation users (backend)

- **Capability:** Retrieve paginated list of users belonging to the organisation via memberships (user identity + role).
- **Who uses it:** Backend API with organisation access middleware.
- **Outcome:** Returns user records with membership role for the caller’s organisation.
- **Conditions:** **No Organisation module UI** currently calls this endpoint; user listing is handled by the **Users** module instead.

### Remove organisation (backend stub)

- **Capability:** Delete an organisation.
- **Who uses it:** API exists.
- **Outcome:** Returns `"Ok"` without performing deletion; service method is empty.
- **Conditions:** **Non-functional** in current implementation.

### Platform admin organisation controls (backend only)

- **Capability:** iMS platform administrators can alert organisation Super Admins about past-due payment, temporarily suspend (Paused status), or reactivate an organisation.
- **Who uses it:** iMS Admin via separate admin organisation routes—not exposed in the standard Organisation UI.
- **Outcome:** Emails sent to Super Admins; organisation `status` toggles between Running and Paused.
- **Conditions:** Admin-only middleware; **business effect of Paused on user access could not be fully determined** from Organisation module code alone.

---

## 3. User Outcomes / End Results

- **Create:** Stand up a new organisation and become its first Super Admin; optionally link a partner referral.
- **View:** See organisation identity, branding, address, multi-org membership, and (when live) licence usage, incident targets, reporting period, and report subscribers.
- **Manage:** Update company profile and bank/mileage details; upload logo and banner; configure incident resolution benchmarks and system reporting dates; add/remove report subscribers; request licence increases.
- **Change:** Switch active organisation; activate customer status via Go Live; initiate card checkout or open billing portal.
- **Information received:** Licence utilisation (used/allocated), payment method indicator, incident P1–P4 target hours, system period dates, subscriber schedule details, customer/partner flags.
- **Business actions enabled:** Operate iMS as a licensed tenant; control who can be invited (via licence pools); benchmark incident performance on dashboards; schedule automated dashboard reports; pay for and manage subscriptions; maintain organisation brand identity across the product.

---

## 4. Scope Boundaries

### In scope

- Organisation record: identity, address, branding, customer/partner flags, status, payment state.
- Licence pool storage and read API on organisation record.
- Go Live customer activation workflow (onboarding).
- Card checkout and billing portal session initiation.
- Incident resolution time configuration (organisation-level targets).
- System date / reporting period configuration and auto-refresh job.
- Report subscriber (report interval) management and scheduled dashboard email delivery.
- Organisation page UI and onboarding create-organisation flow.
- Multi-organisation switcher on organisation page.
- Organisation user list API (membership-based).

### Out of scope (handled elsewhere)

- **Users module** — Day-to-day user directory, invitations, profiles; primary UI for people management.
- **Memberships module** — Creates/consumes user licences when people join; organisation creation auto-creates creator membership.
- **Licence Management module** — Separate sidebar module for licence requests, approval workflow, and detailed licence tables.
- **Groups (Our iMS)** — Business unit creation consumes group licence pool.
- **Compliance module** — Compliance toolkit records created at Go Live; tool access assigned per user elsewhere.
- **Incidents module** — Incident workflow; organisation only supplies resolution time **benchmarks** for dashboard comparison.
- **Dashboard module** — Consumes system dates; generates report PDFs for subscribers.
- **Payments provider** — Stripe integration details; Organisation exposes business outcomes (checkout redirect, billing portal).
- **Partnerships module** — Partner onboarding and referral programme; organisation stores `referralSource` and `isPartner`.
- **Platform admin billing enforcement** — Past-due alerts and suspension via admin routes, not customer-facing Organisation UI.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **Users / Memberships** | Organisation scoped via membership; creator becomes Super Admin on create; `listUsers` reads memberships; user invites consume licence pools. |
| **Licence Management** | Licence increase requests; organisational overview widget; billing buttons on organisation page. |
| **Groups (Business units)** | Group licence pool on organisation; business unit count limited by `licenses.groups`. |
| **Compliance / Compliance Toolkits** | Toolkit names stored on organisation licences; toolkit entities created at Go Live; user tool assignment elsewhere. |
| **Incidents** | P1–P4 resolution times on organisation used as dashboard benchmarks vs actual average resolution times. |
| **Dashboard / Reporting** | System dates scope dashboard availability; dashboard PDF emailed to report subscribers on schedule. |
| **Management Review / KPI** | KPI objectives included in generated dashboard reports for subscribers. |
| **Partnerships** | Partner referral code on organisation creation; `isPartner` flag affects post-switch navigation. |
| **Payments / Billing** | `paymentSystem` on organisation (Card vs Monthly invoice; Trial/Subscribed/Unsubscribed); Stripe checkout and billing portal sessions. |
| **Notifications / Email** | Go Live success, new customer signup (invoice), system date ended, org blocked/reactivated/past-due emails. |
| **Document / File storage** | Production S3 bucket provisioned per customer organisation at Go Live. |
| **Onboarding** | Organisation creation and Go Live flows live under auth onboarding routes. |

---

## 6. Current Data Model

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| **Organisation** | Tenant company: profile, branding, licences, billing, settings, customer status. | Core entity; scopes all org-level operations. |
| **Membership** | Links a User to an Organisation with a role. | Created for creator on org create; basis for `listUsers` and multi-org switcher. |
| **Licence pools (on Organisation)** | Allocated vs used counts for users, super users, business units; compliance toolkit list; additional module flags. | Gates inviting users and creating business units; displayed on org page. |
| **Payment system (on Organisation)** | Payment method type, subscription status, Stripe identifiers. | Drives Card payment vs Manage billing UI; updated at Go Live and checkout. |
| **System date (on Organisation)** | Reporting period start/end with lock flags. | Controls dashboard availability and report scheduling scope. |
| **Incident resolution times (on Organisation)** | P1–P4 target hours. | Dashboard benchmark for incident performance alerts. |
| **Report subscription (on Organisation)** | External subscriber: name, email, interval, issue/next dates. | Scheduled dashboard PDF delivery. |
| **Organisation dashboard record** | Dashboard instance with copied system dates. | Created at Go Live; used for stats and report generation. |
| **Partner referral** | Optional partnership programme reference on create. | Links organisation to partner acquisition channel. |

---

## 7. Attributes

### Organisation — identity and profile

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Reference (`ORG-{number}`) | Stable organisation identifier. | Auto-generated. |
| Name | Company or institution name. | Required; shown prominently on org page. |
| Industry | Sector classification. | Set at creation; displayed on profile. |
| Size of organisation | Number of people in the organisation. | Required at creation. |
| Office email | Primary business email. | Required. |
| Contact number | Phone contact. | Optional on create. |
| Company number | Registered company identifier. | Editable; shown as N/A if empty. |
| VAT number | Tax registration. | Optional. |
| Type of business | Business classification. | Updatable via API; not shown on current org page UI. |
| Address (structured) | Building, street, city, post code, state/province, country. | Required components at creation. |
| Contact name / email / position | Secondary contact person. | Updatable via API; not on current org page UI. |
| Bank details | Name, account number, sort code. | Editable in organisation form (Manage permission). |
| Mileage cost for users | Reimbursement amount and currency. | Editable in organisation form. |

### Organisation — status and classification

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Status | Running or Paused (platform admin). | Default Running; Paused via admin suspension. |
| isCustomer | Whether organisation has completed Go Live. | Gates customer-only settings and modules. |
| isPartner | Whether organisation is a partner tenant. | Affects navigation after org switch. |
| Referral source | Partner programme that referred the organisation. | Optional partner code at creation. |

### Organisation — branding

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Logo | Square organisation mark. | Shown in org switcher and lists. |
| Logo rectangle / banner | Wide banner image. | Separate upload; different display aspect ratio. |

### Organisation — licences

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Super user allocated / used | Super Admin seat pool. | Higher tier; consumed on Super Admin membership. |
| Users allocated / used | Standard user seat pool. | Consumed on non–Super Admin membership create. |
| Groups allocated / used | Business unit seat pool. | Consumed when business units created. |
| Compliance tools | Named toolkit entitlements (ISO standards, CQC, ESG, etc.). | Created as records at Go Live. |
| Additional modules | Extra product modules (e.g. CRM). | Boolean flags for CarboCalc, iMS Forms, Go2ero, Project iMS also exist. |

### Organisation — payment

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Payment type | Card or Monthly invoice. | Chosen at Go Live. |
| Payment status | Trial, Subscribed, or Unsubscribed. | Invoice Go Live sets Subscribed immediately. |
| Stripe customer / payment method / subscription IDs | External billing linkage. | Presence of subscription ID switches UI to Manage billing. |

### Organisation — settings

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| P1–P4 incident resolution time | Target hours per priority level. | Dashboard alert thresholds. |
| System date start / end | Active reporting period. | One-year default at Go Live. |
| System date unset / locked after | Whether period was explicitly set and edit lock expiry. | Restricts system date changes after first edit. |

### Report subscription

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Name | Recipient name. | External contact. |
| Email | Delivery address. | Required; should be unique per org. |
| Interval | Monthly, Quarterly, Half yearly, Yearly. | UI also shows day-of-month from next date. |
| Issue date | First scheduled send date. | Required on add. |
| Next date | Next scheduled delivery. | Advanced by cron after send. |

---

## 8. Current UI Layout

### Main screens / pages

- **My organisation** — `/admin/organisation` (invisible sidebar route; IAM Groups Read policy on route definition). Linked from user profile **Organisation(s)** button and navbar context.
- **Create organisation (onboarding)** — `/auth/onboard/organisation` multi-step wizard (basic info, address, logo, partner code, confirm).
- **Go Live (onboarding)** — `/auth/onboard/go-live` licence and payment selection.
- **Licence overview widget** — `OrganizationalOverview` component embedded in Users “Add user” drawer and Licence Management (not exclusive to org page).

### Organisation page layout

**Left column (card)**

- Logo drop zone (square) and Banner drop zone (wide) with upload progress.
- Organisation name and current user role label.
- List of all organisations user belongs to (avatar, name, role) with **switch** button or current-org indicator.
- **Create another iMS** promo button → onboarding create flow.

**Right column**

- User name/email header with **My profile** and **Partnership** shortcuts.
- **Basic Information** card: name, industry, work email, contact number, company number; **Edit** drawer (Organisation Manage).
- **Address** card: building, street, city, post code, state, country.
- **Customer-only section** (when `isCustomer`):
  - **Licences** card: super user, user, business unit, compliance toolkits, additional modules usage; **Request license** drawer; **Card payment** or **Manage billing** button.
  - **Incident resolution time** card: P1–P4 hours; **Edit** drawer.
  - **System dates** card: start/end formatted dates; **Edit** drawer.
  - **Report intervals** card: subscriber table; **Add subscriber** drawer.

**Drawers**

- Edit organisation (`OrganisationForm`) — profile, bank, mileage.
- Edit resolution times (`ResolutionForm`) — P1–P4 hours.
- Edit system dates (`SystemDateForm`) — start/end dates.
- Add subscriber (`SubscriptionForm`) — name, email, issue date, interval.
- Request license (`LicenseForm`) — product selection and licence quantities.

### Navigation and workflow

```text
User profile → Organisation(s) → /admin/organisation
Onboarding → Create organisation → Flow selection → Go Live (optional)
Organisation page → Switch org / Edit profile / Go Live promo (on user profile if not customer)
Customer org → Request license / Card payment / Manage billing
```

### Primary actions

| Action | Location | Permission / condition |
| ------ | -------- | ---------------------- |
| Upload logo / banner | Org page left card | No explicit permission gate |
| Edit organisation details | Basic Information drawer | Organisation Manage |
| Edit incident times | Resolution drawer | Organisation Manage; customer only |
| Edit system dates | System dates drawer | Organisation Manage; customer only |
| Add/remove report subscriber | Report intervals | Organisation Manage; customer only |
| Request license | Licences card | Licence Management Manage; customer only |
| Card payment / Manage billing | Licences card | Licence Management Manage; customer only |
| Switch organisation | Left card membership list | Any user with multiple memberships |
| Create another iMS | Left card promo | Logged-in user |
| Go Live | Onboarding / user profile promo | Super Admin; not already customer |

### Material empty, loading, or restricted states

- **Loading:** Full-page loader until organisation data loads.
- **Non-customer:** Licence, resolution, system date, and report sections hidden entirely.
- **No Stripe subscription:** “Card payment” button shown instead of “Manage billing”.
- **Organisation refresh:** `OrgRefreshButton` on section headers triggers reload.
- **Switch org confirmation:** Warning dialog before checking into another organisation.

---

## 9. Miscellaneous / Module-Specific Information

### Organisation lifecycle (confirmed states)

| State | Meaning | How reached | Business effect |
| ----- | ------- | ----------- | ---------------- |
| **Created (non-customer)** | Organisation exists; creator is Super Admin | Onboarding create | Limited product access; Go Live promos shown; no licence/settings cards on org page. |
| **Customer (`isCustomer`)** | Live paying tenant | Go Live workflow | Licence pools active; compliance tools provisioned; customer settings visible; dashboard created. |
| **Partner (`isPartner`)** | Partner programme tenant | Partnership onboarding (separate flow) | Switch navigates to partnership dashboard. |
| **Running** | Normal operation | Default; admin reactivation | Standard access. |
| **Paused** | Platform suspension | iMS Admin temporary suspension | **Effect on user login/access requires confirmation** beyond email notification. |
| **Trial / Subscribed / Unsubscribed (payment)** | Billing relationship stage | Default Trial; invoice Go Live → Subscribed; card flow via Stripe | Affects checkout vs billing portal availability. |

### Go Live business sequence (confirmed)

1. Super Admin selects licence quantities, toolkits, optional add-on products, and payment method.
2. Organisation licence allocations saved; `isCustomer = true`.
3. System dates set to today + one year; organisation dashboard record created.
4. Compliance tool records created for each selected toolkit.
5. Production: dedicated S3 bucket created for organisation files.
6. Card payers: redirected to Stripe checkout session URL.
7. Invoice payers: marked Subscribed; internal support/accounts emailed.
8. Success email to user with adoption pack attachments.
9. Non-payment path: user sent to preparation screen in onboarding UI.

### Incident resolution times — business meaning

Organisation-level P1–P4 values are **target hours** used by organisational dashboard statistics to compare against the average time taken to resolve incidents of each priority in the current system date window. When average hours meet or exceed the configured target, the dashboard marks an alert for that priority. They do **not** automatically enforce deadlines, escalations, or blocks within the Incidents module workflow in the code inspected.

### System dates — business meaning

System start and end dates define the **organisational reporting and dashboard period**. Dashboard services refuse to return dashboards whose end date is in the past. When the end date passes, a scheduled job emails an internal contact and **automatically rolls forward** the period (new one-year window) and creates fresh dashboard records. Administrators can manually set dates when permitted by the lock rules (first manual set triggers a seven-day edit window before further changes are blocked until the lock expires or `unset` is true again).

### Report subscribers — business meaning

Despite the API name “report subscriptions,” the UI presents these as **Report intervals**. Each subscriber is an external recipient who receives a **PDF dashboard report** on their scheduled date. Intervals are stored but the cron job observed advances `nextDate` by one month regardless of configured interval—**implementation suggests interval-based scheduling may not be fully applied** in the sender job.

### Branding — two logos

| Format | API | Typical use |
| ------ | --- | ----------- |
| **Logo** (square) | `updateLogo` | Organisation switcher avatars, small identity marks |
| **Banner** (rectangle) | `updateLogoRectangle` | Wide promotional/header display |

They are stored separately and uploaded through distinct drop zones; they are **not interchangeable**.

### Frontend / backend discrepancies

| Topic | Frontend | Backend |
| ----- | -------- | ------- |
| Organisation update | Success toast; state not updated locally | Update persists correctly |
| Remove organisation | No UI | Stub returns Ok without deleting |
| List org users | API client exists | No Organisation UI usage |
| Referral source | Optional null in UI | Validation marks field required |
| Report interval cron | UI supports Quarterly/Half yearly/Yearly | Cron advances by one month only |
| Route permission | IAM Groups Read on `/organisation` route | Organisation APIs mostly unauthenticated on routes inspected |
| Duplicate subscriber email | Error message expected | Error object created but may not throw |

### Unclear or partially implemented behavior

- **Observed but business purpose unclear:** Full business impact of organisation `Paused` status on end-user sessions and module access.
- **Current behavior could not be fully determined:** Complete Stripe webhook/post-payment state updates and failure/cancel handling from Organisation module code alone.
- **Current behavior could not be fully determined:** Whether `getOrganisations` list is exposed to any end-user UI (API supports pagination/search; frontend loads single org by session ID only).
- **Implementation suggests this behavior, but confirmation is required:** Post–Go Live “preparation screen” steps before full product access.
- **Implementation suggests schema inconsistency:** `complianceTools` on organisation model is string array in schema but Licence Management overview treats entries as objects with `name`, `allocated`, `used`.

---

*Specification based on current frontend (`ims-systems-frontend/src/views/ourIms/organisation/`, onboarding flows) and backend (`ims-systems-backend/src/routes/api/organizations.js`, controllers, services, models) as implemented. No application code was modified to produce this document.*
