# Business Premise

## 1. Module Overview

**Business Premise** is the organisation’s register of **physical sites and operating locations** under **Our iMS**. Each Business Premise records a site **name**, **location**, and **address**, and associates that site with one or more **Functional Units** (product UI: Business Units) that operate there.

Its primary business purpose is to answer *where* the organisation’s business functions work — a shared organisational place register — without mixing that register into Inventory asset costing, risk asset linkage, or access-policy definition.

It solves the problem of site information being scattered or conflated with other “premise” concepts by giving administrators a dedicated Our iMS list for business locations linked to Functional Units.

In the underlying V4 implementation these records are stored as **IAM Group Premises** (`grouppremises` / service `IAM_PREMISES`, UI label **Premises** / **Business Premises**). This specification uses **Business Premise / Business Premises** as the V5 business-facing name. That naming is deliberate: the entity is a **business location**, not an IAM group, not an access-control principal, and **not** the same as Inventory **Premise assets**.

Primary users are people with **Premises** licence/service access under Our iMS — typically Super Admin and Head of Service for create/update/delete, with Basic User and Auditor commonly limited to read by default policy and role abilities.

---

## 2. Features and Capabilities

### Create a Business Premise

- **Capability:** Register a new site with name, location, address, and one or more linked Functional Units.
- **Who uses it:** Users with **Premises Create** permission (service: Premises / `IAM_PREMISES`). Role abilities also block Create for Basic User and External User even where policy wording is broader.
- **Outcome:** Premise is created in the current organisation; success notification; user is redirected to the premise detail page (`/admin/businesspremise/{id}`).
- **Conditions:** Frontend requires name, location, address, and **at least one** Functional Unit. Unit picker is limited to **Internal business function** units. Backend model requires name, location, and address. Server-side Joi validation files for this module exist but are **empty and not wired** on the routes — field rules are enforced primarily by the model and the frontend form.

### View Business Premise list

- **Capability:** Browse organisation premises in a searchable, paginated table.
- **Who uses it:** Users with **Premises Read**.
- **Outcome:** Table shows Premise Name, Location, Address, and Actions (Details / Delete). Row click or Details opens a detail view. **Create premise** opens a create drawer.
- **Conditions:** List is organisation-scoped. Search matches **reference**, **name**, **address**, and **location** (case-insensitive). Role-based list filtering is applied using the shared `basicRoleScopedFilter` pattern, but that filter targets a singular `group` field which this entity **does not store** (it stores `groups` as an array) — **implementation suggests group-based list scoping is ineffective** for this module (see Miscellaneous).

### View Business Premise details

- **Capability:** Open a premise to see linked Functional Units, location, and address.
- **Who uses it:** Users with **Premises Read**.
- **Outcome:** Detail appears in a modal from the list and/or on the dedicated detail page. Linked unit names are shown.
- **Conditions:** Detail page route is under Our iMS and is not a separate sidebar entry (invisible nav item). Reference and creator are not prominently shown on the detail UI.

### Update a Business Premise

- **Capability:** Change name, location, address, and the set of linked Functional Units.
- **Who uses it:** Users with **Premises Create** permission **and** (UI) who are the **creator** of the premise **or** a Super User.
- **Outcome:** Fields are replaced with the submitted values; success notification; return to read view.
- **Conditions:** Backend update route uses the **Create** RBAC action (not Update), matching several other Our iMS modules. Unit picker again limited to Internal business function. Update replaces the full `groups` association list rather than appending a single unit.

### Delete a Business Premise

- **Capability:** Permanently remove a premise from the organisation register.
- **Who uses it:** Users with **Premises Delete**, and (UI) creator or Super User.
- **Outcome:** Premise is hard-deleted and disappears from the list after confirmation (*“This primise will be deleted”* — typo in current UI).
- **Conditions:** No soft-delete, archive, or inactive status. No observed cascade to Functional Units, Inventory Premise assets, or other modules.

### Attach a Functional Unit to a Business Premise (backend-supported)

- **Capability:** Append one Functional Unit to the premise’s linked units if it is not already linked.
- **Who uses it:** Backend supports this via **Premises Create** on `POST …/:id/policies/` with body identifying a group/unit.
- **Outcome:** Unit is added to `groups`; duplicate attempt returns *“This group is already attached.”*
- **Conditions:** **No frontend screen currently calls this workflow** (service helper exists unused). Despite the path name `policies`, the operation attaches a **Functional Unit**, not an Access Policy document. Day-to-day association changes are done through create/update forms that set the full unit list.

---

## 3. User Outcomes / End Results

- **Create:** Organisation can register physical operating sites and associate them with Internal business-function units.
- **View:** Users can search and open premises to see where named units operate.
- **Manage:** Authorised creators/administrators can revise site details and unit associations, or remove premises that are no longer needed.
- **Change:** Name, location, address, and linked Functional Units can be updated; there is no separate status lifecycle.
- **Information received:** Site identity (name/location/address), linked Functional Unit names, and creator metadata (populated for ownership-style UI gates).
- **Business actions enabled:** Maintain an organisational site register under Our iMS; associate Internal business functions with places of work. **Does not** manage inventory cost, risk-linked premise assets, access policies, or user membership to a site.

---

## 4. Scope Boundaries

### In scope

- Business Premise CRUD (create, list, get, update, hard delete).
- Organisation scoping of premises.
- Many-to-many association with Functional Units via linked unit IDs.
- List search and pagination.
- Creator-based edit/delete UI gates (in addition to Premises permissions).
- Backend-only single-unit attach operation.
- Our iMS navigation, guidelines/tour entry for Business Premises.

### Out of scope (handled elsewhere)

- **Inventory Premise assets** (`PRE-{number}`, cost, category, optional single business unit, tags, risk linkage) — **Assets / Inventory** module. Same everyday word “premise”, **different entity**; **no direct link** between Business Premises and Premise assets.
- **Functional Unit** create, membership, licences, Access Policy attachment — Functional Units / Users / License Management.
- **Organisation** profile address and branding — Organisation module (no premise coupling observed).
- **Access Policy** definition and statement editing — Access Policies / authentication-authorization infrastructure.
- **Risk “Premise” type** asset selection — Risk Management + Inventory Premise assets, not this module.
- **Data Import product UI** for this entity — confirmed import UI covers Inventory Premise assets; a minimal backend validation stub for `iamgrouppremises` exists but is **not confirmed** as a finished product import path for Business Premises.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **Functional Units** | A Business Premise links to **one or more** Functional Units (`groups` array). Product UI restricts selection to **Internal business function**. Functional Units do not own premises; association is maintained on the premise. Functional Units specification already treats Premises as a separate module. |
| **Organisation** | Every Business Premise belongs to exactly one organisation (tenant). List and create are organisation-scoped. Organisation specification does not otherwise manage premises. |
| **Users** | Creator (`created.by`) is recorded and used for edit/delete UI ownership checks. Users are **not** members of a Business Premise; membership remains on Functional Units. |
| **Access / Premises permissions** | Module actions gated by Premises service (`IAM_PREMISES`) Read / Create / Delete, plus role abilities. Business Premise is a **permission-protected business record**, not the authorisation model itself. |
| **Assets / Inventory** | Inventory Premise assets are a parallel “building/site” concept for asset/cost/risk registers — **explicitly distinct**; no shared identifier observed. |
| **Our iMS** | Product navigation places Business Premises alongside Business Units, Users, and Organisation. |
| **Guidelines / Tours** | Guided course “Business Premises” documents the list/create workflow. |

---

## 6. Current Data Model

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| **Business Premise** (`grouppremises` / IAM Group Premise) | A named physical site with location and address, linked to Functional Units. | Core entity managed by this module. |
| **Functional Unit link** | Units that operate at / are associated with the site. | Many-to-many via ObjectId array `groups` → Functional Units (`groups` collection). |
| **Organisation** | Tenant that owns the premise. | Set from session organisation on create; list filtered by organisation. |
| **Creator** | User who created the premise. | `created.by` / `created.on`; drives UI edit/delete eligibility with Super User override. |

Business Premises are **persisted records**, not computed views. Creating or updating a premise does **not** automatically modify Functional Unit membership, Access Policies, Inventory assets, or organisation address fields.

There is **no** reverse `premises` collection field observed on Functional Unit records — association is stored on the premise side only.

---

## 7. Attributes

### Business Premise

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Name | Site / premise name shown in lists and detail | Required |
| Location | Free-text location descriptor | Required; not a structured geo coordinate |
| Address | Free-text postal / street address | Required; not broken into line/city/postcode fields in this module |
| Linked Functional Units (`groups`) | Business units associated with the site | Array; UI create requires ≥1; UI limited to Internal business function |
| Organisation | Owning organisation | Required; from session context |
| Created by | User who registered the premise | Used for ownership-style edit/delete in UI |
| Created on | Creation timestamp | Set on create |
| Reference | Optional internal reference string | Default empty; **no auto-generation** (unlike Inventory `PRE-{n}`); searchable but **not shown** in current list/detail UI |
| System timestamps | Created/updated audit timestamps | Technical metadata |

**Not implemented on Business Premise:** active/inactive status, soft delete, archive, cost, tags/categories, structured address components, owner distinct from creator, Access Policy reference, link to Inventory Premise asset.

---

## 8. Current UI Layout

### Main screens / pages

- **Business Premises list** — `/admin/businesspremise`, under **Our iMS** sidebar (**Business Premises**, mini label **BP**). Requires Premises Read.
- **Business Premise detail** — `/admin/businesspremise/:id` (invisible nav). Requires Premises Read.
- **Guidelines** — Business Premises tour course entry.

### List layout

- Page heading currently shows *“Primises”* (typo).
- Search control + **Create premise** (opens drawer).
- Table columns: Premise Name, Location, Address, Actions.
- Actions: Details, Delete (Delete gated by permission + creator/Super User).
- Row click opens Details modal.
- Pagination controls.

### Create drawer

- Fields: Business units (multi-select), Name, Location, Address.
- Submit creates the premise and navigates to the detail page.
- **Observed:** Create button visibility is **not** clearly gated by Premises Create in the UI (API still enforces RBAC).

### Detail / edit

- Read view: linked units, location, address.
- Edit switch available when Premises Create **and** (creator or Super User).
- Edit form mirrors create fields; save updates then returns to read mode.

### Delete

- Row Delete → confirmation modal → permanent removal.

### Navigation and workflow

```
Our iMS → Business Premises → list (search)
  → Create premise (drawer) → detail page
  → Details (modal or page) → Edit (if permitted) / Delete (if permitted)
```

### Material empty, loading, or restricted states

- Empty list when organisation has no premises.
- Loading on list and detail fetch.
- Delete confirmation before hard delete.
- Edit/Delete hidden when user lacks Premises Create/Delete or is not creator/Super User.
- Backend “group not found with given id” when detail ID is missing (wording says *group* though the entity is a premise).

---

## 9. Miscellaneous / Module-Specific Information

### Confirmed business meaning

A **Business Premise** is an **organisation-scoped physical site register entry** used to associate **Internal business-function Functional Units** with a place of work (name + location + address).

It is:

- **Not** an IAM Group / Functional Unit itself.
- **Not** an Access Policy or permission set.
- **Not** an Inventory Premise asset (no cost, no `PRE-` reference, no risk-asset linkage).
- **Not** a user membership container (users belong to Functional Units, not to premises).

### V4 → V5 terminology mapping

| V4 / historical | V5 business language |
| --------------- | -------------------- |
| Route `iamGroupPremises.js`, model `grouppremises`, service class `GroupPremisesService` | **Business Premise** module |
| Product UI “Business Premises” / “Premises” | **Business Premise / Business Premises** |
| Permission service `IAM_PREMISES` (label Premises) | Premises / Business Premise permissions (V5 naming to follow authz conventions) |
| Linked `groups` (IAM Groups) | Linked **Functional Units** |
| Inventory Premise assets | Remain under **Assets**; explicitly separate |

V5 should not name this module “IAM Group” or treat premises as access-control groups. Historical “IAM Group Premise” naming reflects the association to IAM Groups (now Functional Units), not the identity of the premise itself.

### Relationship to Functional Units (cardinality)

| Direction | Rule (observed) |
| --------- | ---------------- |
| Premise → Functional Units | Many: a premise may list multiple unit IDs |
| Functional Unit → Premises | Many (implicit): the same unit can appear on multiple premises; no reverse array on the unit |
| UI create constraint | At least one Internal business function unit |
| UI type filter | Only Internal business function offered in picker — External / compliance function units not selectable in current form |

### Important business rules (observed)

- Name, location, and address are required.
- Premise belongs to the creating user’s current organisation.
- List retrieval is organisation-scoped.
- Update replaces name, location, address, and the full linked-units list.
- Attach-group API appends a single unit and rejects duplicates.
- Delete is permanent (hard delete) with no cascade cleanup observed.
- Edit/Delete in UI additionally require creator or Super User, beyond Premises Create/Delete.
- Backend update and attach-group routes authorise with **Create**, not Update.

### Access and authorization semantics

Business Premise **does not define** authentication or policy statements. It is a protected business entity:

| Layer | Behaviour |
| ----- | --------- |
| RBAC service | `IAM_PREMISES` / Premises — Read (list/get), Create (create/update/attach), Delete (delete) |
| Role abilities (CASL) | Basic / External typically cannot Create/Update/Delete Premises |
| Default policies | Site Admin / Business Function / Super Admin / HOS often `ALL`; Compliance body / Basic / Auditor / Essential often `READ` |
| Effective access | Intersection of policy and ability layers — **requires confirmation** for every role combination in production |

Do not model Business Premise as the organisation’s access-control mechanism; that remains Access Policies + Functional Unit membership + authentication.

### Distinction from Inventory Premise assets

| Topic | Business Premise (this module) | Inventory Premise asset |
| ----- | ------------------------------ | ----------------------- |
| Product area | Our iMS | Inventory / Assets |
| Purpose | Site register linked to Functional Units | Asset register (cost, category, risk link) |
| Reference | Optional empty string; not auto-generated | `PRE-{number}` |
| Unit link | Many units (`groups[]`) | Typically one business unit |
| Cost / tags | No | Yes (as applicable) |
| Direct link between entities | **None observed** | **None observed** |

### Lifecycle

No explicit status field (Active/Inactive/Archived). Meaningful states:

| State | Meaning |
| ----- | ------- |
| Exists | Normal premise available in list/detail |
| Deleted | Hard-removed; no restore path observed |

### Frontend / backend discrepancies (requires confirmation)

| Topic | Frontend | Backend | Conclusion |
| ----- | -------- | ------- | ---------- |
| List role scoping | Expects unit-scoped visibility for some roles | Filter uses singular `group`; model has `groups[]` | Scoping likely ineffective — org-wide list for permitted readers |
| Get/update/delete by ID | N/A | Find by `_id` without organisation filter | Cross-organisation access by guessed ID may be possible depending on tenancy isolation |
| Update permission | Create + creator/Super | RBAC Create | Matches other modules; Update action unused |
| Attach unit API | Unused | `POST /:id/policies/` attaches group | Misnamed path; not Access Policy attach |
| Create button | Visible without Create gate | Create RBAC enforced | Users without Create may see a button that fails on submit |
| Validation | Frontend Joi | Empty/unwired server validators | Server relies on Mongoose required fields |
| Reference | Not displayed | Field exists, default `""` | Unused in product UI |
| Detail authorised-roles | Route config typo `auauthorisedRoles` | N/A | Whether role gate applies is **uncertain** |
| Tour markers | Course references create/list steps | Only table tour step clearly wired | Tour may be incomplete |
| Typos | “Primises”, “primise” | Error text “group not found…” | Cosmetic / wording issues |

### Unclear or incomplete behavior

- Whether deleting a Functional Unit cleans premise `groups` arrays — **no cleanup observed**.
- Whether External / compliance Functional Units should ever be linkable — UI excludes them today; business intent **unclear**.
- Whether Business Premises should ever sync with Organisation address or Inventory Premise assets — **not implemented**.
- Whether data-import for `iamgrouppremises` is a supported product path — stub only; **unconfirmed**.
- Intended effective list visibility for Head of Service / Basic User once `groups` filtering is corrected — **requires product confirmation**.

### System boundaries reminder

| Concern | Owning domain |
| ------- | ------------- |
| Physical site register linked to business functions | **Business Premise** (this module) |
| Building/site as inventory/cost/risk asset | **Assets** (Premise assets) |
| Organisation subdivisions and membership | **Functional Units** / **Users** |
| Module permissions and policies | **Authentication / Access Policies** |
| Tenant identity and org address | **Organisation** |
