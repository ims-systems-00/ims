# Tenants

## 1. Module Overview

**Tenants** is a **platform-level, read-only registry capability** in iMS. It is **not** a user-facing administration module, an organisation management screen, or a customer CRM area.

In this application, a **Tenant** is a **registered client environment** stored in the platform’s **admin database**. Each tenant record identifies a separate iMS deployment partition (conceptually a dedicated database environment) using:

- **Name** — a unique technical identifier (required, unique).
- **Company** — a human-readable company or client label (required).

Tenants are **not the same as Organisations**. An **Organisation** is the business customer entity that users work with inside the product (licences, branding, users, functional units, operational records). Organisation records live **inside** a tenant’s database. Users authenticate into an **Organisation** context; they do **not** select or switch **Tenants** through the normal product UI.

The Tenants module exposes one user-facing API capability: **`getTenants`** — a paginated, keyword-searchable list of tenant registry records. There is **no create, update, or delete** through the public Tenants API, **no tenant status field** on the model, and **no standalone Tenants screen** in the frontend. A frontend hook and service exist but are **not used** by any screen.

Primary business purpose today: provide a **lookup list of registered platform environments** for API consumers (potentially onboarding, administration, or future tooling). Backend **scheduled jobs** also iterate tenant records for cross-environment operations (dashboard report dispatch, system maintenance notices), but those are background processes—not user workflows through the Tenants module.

---

## 2. Features and Capabilities

### Retrieve tenant registry list

- **Capability:** Fetch a paginated list of registered tenant environments with optional keyword search.
- **Who uses it:** Any caller of the public API endpoint — **no authentication required** (route registered before session middleware). **No confirmed frontend screen** consumes this in the current codebase.
- **Outcome:** HTTP 200 with message *“Tenants retrived successfully.”* (sic), a `tenants` array, and pagination metadata.
- **Conditions:**
  - Optional query `keywords` filters by **company** or **name** (case-insensitive partial match).
  - Pagination via `page` (default 1) and `size` (default 10, max 100).
  - Sort defaults to newest first (`-_id` in controller; trimQuery fallback uses `createdAt: -1` if sort omitted elsewhere).
  - Empty `keywords` returns **all tenants** (paginated), not an empty list.

### Search tenants by name or company label

- **Capability:** Narrow the tenant list using free-text keywords matched against tenant **name** or **company**.
- **Who uses it:** API callers supplying the `keywords` query parameter.
- **Outcome:** Filtered paginated results.
- **Conditions:** Search is **OR** match on name and company fields only. No filters for status, licence, or organisation.

---

## 3. User Outcomes / End Results

Because **no frontend UI** consumes the Tenants API in this repository:

- **View:** API callers can list registered platform tenant environments and search by name/company label.
- **Select / switch tenant:** **Not available** to end users. Organisation selection (`/auth/organisation-selection`) handles business context switching, not tenant switching.
- **Manage:** Users **cannot** create, edit, suspend, or delete tenants through the Tenants module API.
- **Information received:** Each tenant entry includes at minimum **name**, **company**, and system **timestamps** (`createdAt`, `updatedAt`).
- **Business actions enabled:** External or future clients could discover registered client environments; background schedulers can iterate tenants for platform-wide email/report jobs. **Normal organisation users do not interact with tenant information directly.**

---

## 4. Scope Boundaries

### In scope

- Read-only listing of tenant registry records from the admin database.
- Keyword search on tenant name and company.
- Pagination of results.

### Out of scope (handled elsewhere)

- **Organisation module** — business customer entity, licences, branding, billing, and user-facing org profile; users switch **organisations**, not tenants.
- **Users / Memberships** — user membership within an organisation.
- **Customers (CRM)** — CRM customer records are separate business entities inside a tenant database.
- **License management** — licence pools belong to Organisation records, not Tenant registry entries.
- **Authentication / login** — session tokens carry organisation and user context, not tenant selection UI.
- **Tenant creation or lifecycle management** — no supported CRUD through the public Tenants API; ims-admin routes reference create/update stubs but are outside the user API module and **controller implementation is missing** in this repository.
- **Dashboard / Stats** — operational metrics per organisation, not tenant registry listing.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **Organisation** | **Distinct but related.** Organisations are business tenants *in product language* (licensed companies using iMS) but are **separate records** stored inside each tenant’s database. The Tenant registry identifies the **platform environment**; Organisations identify **companies within that environment**. Users switch organisations, not tenant registry entries. |
| **Users / Memberships** | Users belong to organisations inside a tenant database. No direct user-to-tenant-registry relationship exposed in the Tenants API. |
| **Dashboard (scheduled reports)** | Background scheduler iterates cached tenant map to run organisation-level dashboard report jobs **per tenant environment** — uses tenant registry infrastructure, not the `/tenants` HTTP endpoint. |
| **Notifications / Email (system notices)** | Background queue job loads all tenant records and iterates users per tenant for system maintenance emails — infrastructure coupling, not user-facing Tenants module workflow. |

No confirmed links to CRM Customers, Invoice, Billing, or Compliance modules through the Tenants HTTP API.

---

## 6. Current Data Model

The Tenants module owns a **dedicated admin-database model**: **`tenant`** collection in the **admin MongoDB database** (`ADMIN_DB`).

| Entity / record | Business meaning | Role in Tenants module |
| --------------- | ---------------- | ---------------------- |
| **Tenant** | A registered iMS client environment / database partition on the platform | Sole entity returned by `getTenants` |
| **Organisation** | A licensed company using iMS **within** a tenant environment | **Not** returned by Tenants API; separate model in tenant database |

### Tenant vs Organisation — confirmed distinction

| Concept | Tenant (registry) | Organisation (business) |
| ------- | ----------------- | ------------------------ |
| **Database** | Admin database | Tenant (system) database |
| **Represents** | Platform environment / client partition | Customer company using the product |
| **User interaction** | None in current UI | Profile, licences, switching, all operational work |
| **Key fields** | `name`, `company` | `name`, status, licences, branding, contacts, etc. |
| **Scope** | Cross-platform registry | Organisation-scoped business data |

Do **not** treat these as identical records even though Organisation documentation sometimes uses “tenant” in business prose to mean a licensed customer.

---

## 7. Attributes

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| **Name** | Unique technical identifier for the tenant environment | Required; unique across registry — **Observed but business purpose unclear** whether this maps directly to database name; used in backend logging and infrastructure contexts |
| **Company** | Display label for the client or company owning the environment | Required; searchable via `keywords` |
| **Created at** | When the tenant registry entry was created | Automatic timestamp |
| **Updated at** | When the registry entry was last modified | Automatic timestamp |

### Attributes **not present** on Tenant model (confirmed absent)

Status (active/inactive/suspended), logo, subscription details, licence counts, primary user, organisation link, customer flags, billing identifiers.

---

## 8. Current UI Layout

### Main screens / pages

- **No dedicated Tenants screen, route, or navigation entry** exists in `ims-systems-frontend`.

### Frontend artifacts (unused)

| Artifact | Status |
| -------- | ------ |
| `tenantServices.js` | API client for `GET /tenants` — **no consumer** |
| `useTenants.js` | Hook loads tenants with keyword pagination (auto-fetches all pages recursively) — **not imported by any view** |

### Organisation selection (related but separate)

Users choose an **Organisation** at `/auth/organisation-selection` after login when they belong to multiple organisations. This is **Organisation switching**, not tenant registry selection. It does **not** call the Tenants API.

### Where tenant information appears

- **Nowhere in confirmed user-facing UI.**
- `authService.getTenant()` reads a `tenant` value from browser localStorage, and some requests send an `x-tenant` header — **no code in this repository sets the localStorage tenant value**, and this is **separate from the Tenants list API** — **requires confirmation** of intended use (possibly password-reset flows).

### Material states

- Not applicable — no UI. API returns paginated JSON; empty registry would yield empty `tenants` array with pagination showing zero results.

---

## 9. Miscellaneous / Module-Specific Information

### Access and availability

| Aspect | Confirmed behavior |
| ------ | ------------------- |
| **Authentication** | **Not required** — `/tenants` registered **before** `deserializeUser` middleware |
| **RBAC** | Empty middleware array — no role checks |
| **Organisation scoping** | **None** — returns tenant registry from admin DB, not filtered by caller’s organisation |
| **Public exposure** | Endpoint is publicly callable by anyone who can reach the API |

This is a **business-visible access model** note, not a security audit.

### Retrieval implementation details

- Data source: admin database via `Tenants()` model factory.
- A `Filters` utility instance is constructed in the controller but **not applied** to the query — only explicit `$or` regex on `name` and `company` is used.
- Default page size 10; maximum 100 per page.

### Tenant status and lifecycle

- **No status field** on the tenant schema.
- **No soft delete, suspension, trial, or expiry** attributes observed.
- All registry entries matching search criteria are returned regardless of any business state — **no availability filtering exists**.

### User modification

- **Public API:** read-only (`GET` only).
- **ims-admin routes** (`POST /`, `PUT /:tenant`) exist as **stubs** returning `"OK"` and reference a **missing** `controllers/imsadmin/tenants` file — tenant creation/update through admin API **could not be confirmed** as functional.

### Infrastructure coupling (not user-facing Tenants module)

| Process | How tenants are used |
| ------- | --------------------- |
| **`connectAllDb` startup** | Intended to cache tenant list from admin DB into `tenantsMap` — **currently hardcoded to empty array** (`let tenants = [] || (await find...)`) so cache is always empty at startup |
| **`sendDashBoardReport` schedule** | Iterates `getConnectionMap()` (empty cache) for cross-tenant dashboard emails |
| **`notice.process` queue** | Loads all tenants from admin DB and emails active verified users per tenant |

These show tenants as **platform partition identifiers** for background operations, separate from the HTTP list API.

### Frontend/backend discrepancies

| Area | Backend | Frontend |
| ---- | ------- | -------- |
| Tenant list API | Implemented, public | Service + hook exist but **unused** |
| Tenant switching | Not in user API | Organisation selection used instead |
| Tenant localStorage / `x-tenant` header | Accepted in CORS and some auth flows | Read but **never set** in frontend auth flow observed |

### Relationship summary for business readers

- **Tenant (registry)** = *which platform environment / database partition*.
- **Organisation** = *which company the logged-in user is working for inside that environment*.
- **Customer (`isCustomer` on Organisation)** = *whether that organisation is a live paying client* — unrelated to the Tenant registry model.

### Behavior that could not be confidently determined

- Whether `name` always equals the MongoDB database name used for that client.
- Intended consumer of the public `/tenants` API (onboarding wizard, external admin tool, or legacy endpoint).
- Whether ims-admin tenant management was planned but not implemented (missing controller file).
- Whether empty `tenantsMap` at startup affects production scheduling in practice if tenants are loaded another way at runtime.
