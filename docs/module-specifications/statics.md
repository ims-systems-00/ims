# Statics

## 1. Module Overview

**Statics** is a **shared supporting, read-only reference capability** in iMS. It is **not** a statistics, analytics, or dashboard module, and it does **not** manage static website pages or organisation-specific configuration.

The module exposes **application-wide reference information** — predefined labels, classifications, permissions vocabulary, geographic lists, and currency metadata — through a single retrieval endpoint (`getConstants`). This information is sourced from the shared **`@ims-systems-00/ims-core` constants package** (hardcoded application values), not from the database.

Its primary business purpose is to give authenticated clients a **central, consistent source** for reference values that support forms, dropdowns, access-control vocabulary, and business classifications across the product. Most of the product **does not call the Statics API directly**; frontend and backend code often import the same constant definitions locally from duplicated frontend files or the shared package. The confirmed **direct API consumer** in this repository is the **country list** used when editing a user’s membership profile.

There is **no standalone Statics screen**, **no user-facing module navigation**, and **no ability for users to create or edit** reference values through Statics. Changes to constants require updating the shared constants package and redeploying the application.

Primary beneficiaries are **authenticated organisation users** whose workflows need standardised pick-list values (currently: country selection on membership profile). Backend and frontend developers also rely on the same constant definitions throughout the codebase, usually **without** going through the Statics endpoint.

---

## 2. Features and Capabilities

### Retrieve all application constants

- **Capability:** Fetch the complete set of shared reference information exposed by the constants package.
- **Who uses it:** Authenticated API callers that omit the category filter.
- **Outcome:** HTTP 200 with message *“Constants retrived successfully”* (sic) and a `data` object containing all constant categories (countries, roles, services, policies, currencies, etc.).
- **Conditions:** Requires valid authenticated organisation session. **No role-based permission check** on the route itself. Response is **identical for all organisations and users** — not tenant-specific.

### Retrieve a specific constant category

- **Capability:** Fetch one named category of reference information by supplying a category name.
- **Who uses it:** Authenticated API callers; the frontend `useConstants` hook requests `COUNTRIES` specifically.
- **Outcome:** HTTP 200 with `data` set to the requested category’s value (array or object). If the category name does not exist, `data` is `undefined` — **no explicit “not found” error** observed.
- **Conditions:** Optional query parameter `constantName` selects the category (for example `COUNTRIES`, `ROLES`, `IMS_SERVICES`). Category names match the exported keys from the constants package.

### Support country selection on membership profile (indirect user capability)

- **Capability:** Populate the **Country** dropdown when editing a user’s membership / wallet-linked profile details.
- **Who uses it:** Users with access to the membership profile form under **Users** (Our iMS).
- **Outcome:** Dropdown shows country names with ISO country codes as stored values; user selects their country as part of membership data.
- **Conditions:** Countries are loaded via the Statics API on form mount. Work place, access period, and line manager options on the same form use **local hardcoded lists**, not Statics.

---

## 3. User Outcomes / End Results

Users do **not** interact with a “Statics” module directly. Outcomes are **indirect**:

- **View reference lists:** Authenticated callers can retrieve predefined application reference data via API.
- **Select from standardised options:** When editing membership profile, users can pick a **country** from the global country list supplied through Statics.
- **Consistent vocabulary:** The same role names, service names, permission actions, and business-unit types used across iMS are defined once in the shared constants package and exposed (in full or by category) through Statics — supporting alignment between frontend displays and backend authorization logic **when clients choose to fetch via API**.
- **No management outcomes:** Users cannot create, update, or delete constants through this module.

---

## 4. Scope Boundaries

### In scope

- Read-only HTTP retrieval of shared application reference information.
- Optional filtering to a single named category via query parameter.
- Serving geographic (countries), currency, role, service, policy, permission, and classification vocabulary from the shared constants package.

### Out of scope (handled elsewhere)

- **Dashboard / Stats module** — operational metrics, charts, and organisation analytics (`/stats` routes); not reference constants.
- **Organisation settings** — tenant-specific configuration (incident resolution targets, logos, licence counts) stored on Organisation records.
- **System Defaults** — organisation-level operational settings editable by administrators.
- **IAM Roles / Policies / Functional Units** — user-defined or customer-managed roles, policies, and groups stored as business records; Statics only supplies **primitive role type labels** and **policy vocabulary**, not live IAM data.
- **Tags and Categories** — user-managed categorisation for management review and other modules.
- **Analytics or reporting** — no aggregation or metrics.
- **Constant administration UI** — no screen to manage reference values.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **Users / Memberships** | **Confirmed API consumer.** Membership profile form loads `COUNTRIES` via Statics to populate the country dropdown stored on membership/wallet-linked user data. |
| **Our iMS (IAM)** | Statics defines vocabulary for roles (`ROLES`, `ROLE_TYPES`), access policies (`IMS_POLICIES`, `ACCESS_POLICY_TYPE`, `POLICY_USAGE`, `ACCESS_SCOPE`), permission actions/effects (`ACTIONS`, `EFFECTS`), functional unit types (`GROUP_TYPE`), and user type (`USER_TYPE`). Frontend IAM screens typically import these from `rolesAndPermissions.js` **directly**, not via Statics API — **same source definitions, different delivery path**. |
| **All licensed product modules** | `IMS_SERVICES` and `CUSTOMIZABLE_SERVICES` name the product modules and licence entitlements (Risk management, Incident management, Compliance toolkits, ISO standards, CQC, CRM, etc.). Used for RBAC and navigation labelling; consumed via local imports in frontend/backend, not confirmed via Statics API calls. |
| **CRM / Invoicing** (potential) | `CURRENCIES` and `CURRENCY_DETAILS` provide country-to-currency mappings and currency symbols/names for monetary display — **available through Statics API but no confirmed frontend API consumer** in this repository. |
| **Compliance / Stats** (backend) | Backend services import `GROUP_TYPE`, `IMS_POLICIES`, `ROLES`, etc. directly from the constants package for queries and reports — **parallel to Statics**, not through the HTTP endpoint. |

Statics is a **reference publisher**, not a workflow owner. Linked modules use its information to populate choices or align terminology; they store their own business records separately.

---

## 6. Current Data Model

**Statics does not own a database model.** All information is **fixed application reference data** loaded from the `@ims-systems-00/ims-core/lib/constants` package at runtime.

| Concept | Business meaning | Persistence |
| ------- | ---------------- | ----------- |
| **Constants bundle** | The full set of shared reference categories | In-memory from npm package; exposed via GET |
| **Constant category** | A named group of related reference values (for example countries, roles) | Fixed until package update |
| **Country entry** | A recognised country name and ISO code | Fixed list in package |
| **Currency entry** | Mapping of country to currency code, plus detailed currency metadata (symbol, name, decimal rules) | Fixed list in package |
| **Role label** | Standard iMS role names (Super Admin, Head of Service, Basic User, Auditor variants, etc.) | Fixed enumeration |
| **Service label** | Product module / licence names including ISO and toolkit identifiers | Fixed enumeration |
| **Policy / permission vocabulary** | Labels for access policies, policy types, scopes, and CRUD/manage actions | Fixed enumeration |
| **Functional unit type** | Classification of business vs compliance, internal vs external units | Fixed enumeration |

Information is **global** — the same for every organisation. It does **not** vary by user, role, or tenant through the Statics endpoint.

---

## 7. Attributes

Attributes below are **categories** returned by `getConstants`. Each can be requested individually via `constantName`.

### Geographic reference

| Category | Business meaning | Supports |
| -------- | ---------------- | -------- |
| **COUNTRIES** | List of countries with `name` and ISO `code` | Country selection on membership profile; address/geo classification **Observed API consumer** |

### Monetary reference

| Category | Business meaning | Supports |
| -------- | ---------------- | -------- |
| **CURRENCIES** | Country-to-currency-code mapping (`country`, `currency_code`) | Currency selection or display by country — **no confirmed UI consumer via API** |
| **CURRENCY_DETAILS** | Per currency code: symbol, full name, native symbol, decimal digits, rounding | Formatted monetary display — **no confirmed UI consumer via API** |

### Access control and identity vocabulary

| Category | Business meaning | Supports |
| -------- | ---------------- | -------- |
| **ROLES** | Standard role display names (Super Admin, Head of Service, Basic User, Auditor, External User, iMS platform roles, etc.) | Role assignment labelling, RBAC checks, user classification |
| **ROLE_TYPES** | Whether a role is primitive (system-defined) or custom (customer-defined) | IAM role creation constraints |
| **USER_TYPE** | Internal vs External user classification | User and stats segmentation |
| **IMS_POLICIES** | Named access policy templates (System administration, Business function, Compliance body, Super admin, etc.) | IAM policy assignment |
| **ACCESS_POLICY_TYPE** | iMS-managed vs Customer-managed policy | Policy ownership model |
| **POLICY_USAGE** | Whether a policy applies to business units or roles | Policy assignment scope |
| **ACCESS_SCOPE** | All business units vs single business unit | Policy breadth |
| **ACTIONS** | Permission verbs: create, read, update, delete, manage, invite, complete, schedule, all | Authorization checks and UI gating |
| **EFFECTS** | Allow, Block, All | Permission effect on actions |
| **RESOURCES** | Compliance resource identifiers (ISO standards, CQC, BS9997, DSPT NHS, etc.) | Resource-scoped permissions |

### Product and organisational structure vocabulary

| Category | Business meaning | Supports |
| -------- | ---------------- | -------- |
| **IMS_SERVICES** | Full product module and licence names (Dashboard, Our iMS, Risk management, Incident management, Compliance toolkits, ISO standards, ESG toolkits, CQC, CRM, Document management, etc.) | Navigation labels, RBAC service checks, licence entitlement naming |
| **CUSTOMIZABLE_SERVICES** | Subset of modules that support customer customisation (Inventory, Risk, Incident, Management review, KPI, CIP, Supplier, Document, Task, Calendar, CRM) | Custom-build / licence configuration context |
| **GROUP_TYPE** | Functional unit classification: Internal business function, Internal compliance function, External compliance function, External function | Creating and filtering Functional Units (IAM Groups) |

---

## 8. Current UI Layout

### Main screens / pages

- **No standalone Statics screen, route, or navigation entry** exists.

### Indirect UI usage — confirmed

**Users → Membership profile form** (`MembershipForm.jsx`):

- **Country** dropdown populated from Statics `COUNTRIES` via `useConstants` hook.
- Options display country **name**; stored value is ISO **code**.
- Dropdown supports type-ahead input change events, but the hook **always requests the full COUNTRIES list** — search filtering is **not applied server-side**.
- Other fields on the same form (work place, access period, line managers) use **local hardcoded options**, not Statics.

### Indirect UI usage — same data, different source

Most reference vocabulary appears across the product via **`rolesAndPermissions.js`** (frontend local copy of ims-core constants), **not** via the Statics API:

- **Functional Units form** — `GROUP_TYPE` for unit type selection.
- **Premises form** — filters groups by `GROUP_TYPE`.
- **Navigation and permission gates** — `IMS_SERVICES`, `ACTIONS`, `EFFECTS`, `ROLES` on routes and buttons throughout modules.
- **SuperGlobalContext** — separates business vs compliance unit types using `GROUP_TYPE`.

`UserForm.jsx` **imports** `useConstants` but **does not use it** — dead import; no country or constants UI on basic user name editing.

### Material states

- **Loading:** No dedicated loading indicator observed for country fetch on membership form; dropdown may initially be empty until API returns.
- **Empty constants:** If API fails, dropdown options remain empty; errors logged to console via `imsLogger`.
- **Restricted:** Statics endpoint requires authentication; unauthenticated users cannot fetch constants through this API.

---

## 9. Miscellaneous / Module-Specific Information

### What “Statics” means in this product

Despite the name, Statics provides **shared constant / reference data**, not statistics. It is the HTTP exposure layer for the ims-core constants package.

### Source and change model

| Aspect | Confirmed behavior |
| ------ | ------------------- |
| **Source** | `@ims-systems-00/ims-core/lib/constants` npm package |
| **Fixed vs dynamic** | **Fixed** at runtime; changes require package/code update and deployment |
| **Organisation-specific** | **No** — same values for all tenants |
| **User-modifiable** | **No** — read-only endpoint; no create/update/delete |
| **Database** | **None** |

Customer-specific values (custom roles, custom policies, organisation licences) live in **IAM and Organisation modules**, not in Statics.

### Access and availability

- Route registered **after** session deserialization and organisation access middleware — **authentication required**.
- **No RBAC middleware** on the Statics route (empty middleware array).
- Response does **not** filter by user role or organisation.
- **Not publicly accessible** (unlike Contact IMS routes).

### API behaviour details

- **Endpoint:** `GET /api/v3/statics/`
- **Optional filter:** `?constantName={CATEGORY_KEY}` — returns single category; omit for full bundle.
- **No pagination, search, or versioning** on the endpoint.
- Invalid or unknown `constantName` returns `undefined` in `data` without a dedicated error message.

### Frontend/backend delivery discrepancy

| Delivery path | Used by | Categories |
| ------------- | ------- | ----------- |
| **Statics API** (`useConstants` → `COUNTRIES` only) | Membership profile country dropdown | COUNTRIES |
| **Frontend `rolesAndPermissions.js`** (local duplicate) | Navigation, RBAC UI gates, IAM forms, most modules | ROLES, IMS_SERVICES, ACTIONS, EFFECTS, GROUP_TYPE, etc. |
| **Backend direct ims-core import** | Services, models, RBAC enforcement, stats | Same categories as package |

**Implementation suggests** Statics was intended as a central API for all constants, but **most of the product bypasses it** and imports constants directly — **confirmation is required** whether API expansion is planned or COUNTRIES is the only intentional consumer.

### `useConstants` hook limitations

- Hardcodes `constantName=COUNTRIES` — not reusable for other categories without code change.
- `loadConstants` accepts arguments from callers but **ignores** them (MembershipForm passes search keywords that have no effect).
- Initial state is empty array `[]` rather than object — works for `.map()` on countries list.

### Relationship to Stats module

**Stats** (`/stats`) provides organisation operational metrics and analytics. **Statics** (`/statics`) provides reference vocabulary. Different purpose despite similar naming.

### Behavior that could not be confidently determined

- Whether external clients or mobile apps consume Statics categories beyond COUNTRIES.
- Whether `CURRENCIES` / `CURRENCY_DETAILS` were intended for a CRM invoice UI not yet wired to the API.
- Whether returning the **full constants bundle** without `constantName` is used in production or is primarily a development convenience.

### User modification elsewhere

Users **can** create custom IAM roles, policies, and functional units through Our iMS — those are **business records**, not Statics constants. Primitive role types and service names remain fixed reference labels.
