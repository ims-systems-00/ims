# Assets (Inventory)

## 1. Module Overview

Assets (presented in the product as **Inventory**) is the organisation’s register for recording and managing five categories of business assets: **Hardware**, **Software**, **People**, **Premises**, and **Information**. Each category captures different kinds of organisational value—physical equipment, licensed software, human skills and roles, buildings/sites, and information holdings.

Its primary business purpose is to give users a structured inventory of what the organisation owns or depends on, scoped by business unit, tagged for classification, and available for cross-module use (notably risk registration). Users can create, browse, search, filter, view, edit, and delete records within each category, with software assets additionally supporting licence keys and document attachments.

It solves the problem of asset information scattered across spreadsheets or informal records by centralising asset master data per category, with organisation-wide visibility rules, reference numbers, cost tracking where applicable, and dashboard statistics on counts and costs.

Primary users are people with Inventory service access—Super Admins, Heads of Service, Basic Users, and Auditors (read-focused). Create, edit, and delete require Inventory create/delete permissions respectively. Access is RBAC-based; no separate Inventory partner licence was identified on frontend routes.

---

## 2. Features and Capabilities

### Browse and manage Hardware assets

- **Capability:** Register physical hardware items with name, tag, owner, assignment/return/destruction dates, cost, business unit, and optional category.
- **Who uses it:** Users with Inventory read (list/view) and create (add/edit) permissions.
- **Outcome:** Hardware appears in a paginated list with reference `HD-{number}`. Users can preview in a drawer, open a full detail page, edit lifecycle dates, and delete (admin or creator).
- **Conditions:** Backend requires name and owner. Business unit cannot be changed after create in UI. List visibility scoped by role and business unit.

### Browse and manage Software assets

- **Capability:** Register software products with licence count, install count, cost, business unit, category, licence keys, and supporting documents.
- **Who uses it:** Users with Inventory permissions.
- **Outcome:** Software listed with reference `SFT-{number}`. Users manage keys and documents on detail/edit views. Keys added/removed individually; documents uploaded via dropzone and removed individually.
- **Conditions:** Backend requires name only. Keys managed via dedicated add/remove actions, not bulk replace on update. Document upload on create/update appends to existing docs.

### Browse and manage People assets

- **Capability:** Register people-as-assets representing roles, responsibilities, and skills—not user accounts.
- **Who uses it:** Users with Inventory permissions.
- **Outcome:** People records listed with reference `PPL-{number}`. Users track staff name, role, responsibility, skill, business unit, and category.
- **Conditions:** Backend requires name, role, and skill. **Observed but business purpose unclear** why people are assets rather than linked to user records—they represent competency/skill inventory entries.

### Browse and manage Premise assets

- **Capability:** Register buildings or sites with name, address, postal code (location), cost, business unit, and category.
- **Who uses it:** Users with Inventory permissions.
- **Outcome:** Premises listed with reference `PRE-{number}`. Users maintain location details and cost.
- **Conditions:** Backend requires name, location, and address. Premise assets are **distinct from** IAM Group Premises (Our IMS)—no direct link between the two.

### Browse and manage Information assets

- **Capability:** Register information holdings with title, information inventory classification, format, storage location, link, owner, cost, business unit, and category.
- **Who uses it:** Users with Inventory permissions.
- **Outcome:** Information assets listed with reference `INF-{number}`. Sidebar label is **Information**; frontend folder uses “organizational” naming but backend stores **information** assets.
- **Conditions:** Backend requires title only. Frontend UI marks more fields mandatory than backend validates.

### Search, filter, and paginate asset lists

- **Capability:** Search by text across key fields; filter by business unit, owner (where applicable), and category; paginate results.
- **Who uses it:** All users viewing any asset category list.
- **Outcome:** Debounced client search and modal filters refine the table. Default page size 10 with server pagination.
- **Conditions:** “Owned by” filter appears on all categories but People, Premise, and Software have no owner field—filter likely ineffective for those types.

### Manage categories (tags) per asset type

- **Capability:** Each asset list has a second tab for managing tags/categories applicable to that asset module.
- **Who uses it:** Users with tags/categories access on the Categories tab.
- **Outcome:** Categories can be assigned on create/edit forms via inline “Add Category”.
- **Conditions:** Module keys: `hardwareassets`, `softwareassets`, `peopleassets`, `premiseassets`, `informationassets`.

### Link assets to risks

- **Capability:** When raising a risk of type Hardware, Software, People, or Premise, users select a linked asset from the inventory of that type (filtered by business unit).
- **Who uses it:** Risk Management users on the risk form.
- **Outcome:** Risk stores a reference to the chosen asset; risk overview displays asset name/details.
- **Conditions:** **Information assets are not selectable** in the risk form UI despite backend risk model supporting `Informationasset` reference. Organisational and Clinical risk types hide the asset picker entirely.

### View inventory statistics on dashboard

- **Capability:** Dashboard widgets show counts and costs per asset category.
- **Who uses it:** Dashboard viewers.
- **Outcome:** Aggregated hardware, software, people, premises, and information counts; cost totals per category. **People cost uses internal user salaries**, not people asset records.
- **Conditions:** Stats are organisation-wide, not filtered by user role on the stats service.

---

## 3. User Outcomes / End Results

- **Create:** Register records in five asset categories with category-specific fields and auto-generated references.
- **View:** Paginated, searchable lists; drawer preview; full detail pages with overview sidebar.
- **Manage:** Edit asset details (business unit locked after create); delete assets (admin or creator); manage software keys and documents post-create.
- **Change:** Update names, costs, dates, owners, classifications, and attachments depending on asset type.
- **Information received:** Reference numbers, business unit, category tags, type-specific attributes, and (for software) key values and downloadable documents.
- **Business actions enabled:** Maintain an organisational asset register; classify assets; associate hardware/software/people/premise assets with risks; feed dashboard inventory/finance widgets; import asset data (backend import rules exist). **No automated lifecycle workflows, warranty tracking, or assignment approval flows are exposed in the current UI.**

---

## 4. Scope Boundaries

### In scope

- Five asset category registers under Inventory sidebar.
- CRUD for each category via UI and API.
- Software licence keys and document attachments.
- Tags/categories per asset type.
- Business-unit scoping on lists.
- Risk linking for four asset types (UI).
- Dashboard inventory statistics.
- Data import validation rules (backend).
- Hardware owner transfer on user deactivation (ownership integrity jobs).

### Out of scope (handled elsewhere)

- **User account management** — People assets are skill/role records, not user profiles.
- **IAM Group Premises** — Separate Our IMS premises entity; not the same as Premise assets.
- **Risk assessment workflow** — Risk Management owns scoring, acceptance, mitigation; Inventory only supplies asset records.
- **Legacy unified asset model** — Older `services/inventory/assets.js` with supplier, warranty, barcode, `assetStatus` lifecycle — **not wired to API**.
- **Clinical assets** — Referenced in risk model enum but **no Inventory UI or API** identified.
- **Calendar, tasks, incidents, audits, suppliers** — No direct asset FK links; relationships are indirect via risks, stats, or shared business units/tags.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| Risk Management | Risks of type Hardware, Software, People, or Premise can link to an inventory asset. Risk overview shows linked asset details. Information assets supported on backend only. |
| Tags & Categories (Customisation) | Shared classification tags applicable to all five asset types; managed from each category’s Categories tab. |
| Dashboard | Inventory stats widget shows counts and costs per asset category; finance/critical-area widgets reference inventory areas. |
| User Management | Hardware assets have an **owner** (user). User deactivation triggers ownership integrity checks/transfer for hardware only—not information asset owners. |
| Our IMS (Business units) | All assets optionally belong to a business unit (`group`); list visibility filtered by user’s unit for HoS/Basic/External roles. |
| Data Import | Bulk import validations exist per asset type requiring business unit name. |

No direct links to Audit, Incident, Supplier, Task, Customer, or KPI modules were identified.

---

## 6. Current Data Model

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| Hardware Asset | Physical IT/equipment item assigned to a user | Tracks tag, owner, assignment lifecycle dates, cost |
| Software Asset | Licensed software product | Tracks licence/install counts, keys, documents, cost |
| People Asset | Role/skill/competency entry | Tracks staff name, role, responsibility, skill—not a user account |
| Premise Asset | Building or site | Tracks name, location/postal code, address, cost |
| Information Asset | Information/data holding | Tracks title, inventory classification, format, storage, link, owner, cost |
| Software Key | Licence or activation key value | Sub-record on software asset; add/remove only |
| Software Document | Supporting file attachment | S3-backed attachment on software asset |
| Business unit (group) | Organisational scope | Optional on create; drives list visibility |
| Tags & Categories | Classification label | Optional ObjectId ref per asset |

There is **no unified “Asset” super-entity** in the live API—each category is a separate record type with its own reference prefix.

---

## 7. Attributes

### Shared across categories

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Reference | Human-readable ID | Auto: `HD-`, `SFT-`, `PPL-`, `PRE-`, `INF-` + number |
| Business unit | Owning/scoping unit | Locked on edit in UI |
| Category (tagsAndCategories) | Classification tag | Optional; information edit may fail due to backend typo |
| Created (by, on) | Audit of creator | Set on create |
| Organisation | Tenant scope | Automatic |

### Hardware (`HD-`)

| Attribute | Business meaning | Required (backend) |
| --------- | ---------------- | ------------------ |
| Name | Asset name | Yes |
| Tag | Physical/logical tag | No |
| Owner | User responsible for item | Yes |
| Assigned date | When assigned | No (defaults now) |
| Return date | When returned | No |
| Destruction date | When disposed | No |
| Cost | Acquisition cost | No (default 0) |

### Software (`SFT-`)

| Attribute | Business meaning | Required (backend) |
| --------- | ---------------- | ------------------ |
| Name | Software product name | Yes |
| Number of licences | Licences owned | No |
| Number of installs | Current installs | No |
| Keys | Licence key strings | No |
| Documents | Attached files | No |
| Cost | Licence cost | No |

### People (`PPL-`)

| Attribute | Business meaning | Required (backend) |
| --------- | ---------------- | ------------------ |
| Name (staff name) | Person/role label | Yes |
| Role | Job/organisational role | Yes |
| Responsibility | Responsibilities text | No |
| Skill | Key skill/competency | Yes |

### Premise (`PRE-`)

| Attribute | Business meaning | Required (backend) |
| --------- | ---------------- | ------------------ |
| Name (building name) | Premise name | Yes |
| Location | Postal code / location label | Yes |
| Address | Physical address | Yes |
| Cost | Premise cost | No |

### Information (`INF-`)

| Attribute | Business meaning | Required (backend) |
| --------- | ---------------- | ------------------ |
| Title | Asset title | Yes |
| Information inventory | Classification/description of information type | No |
| Owner | Data owner (user) | No |
| Storage location | Where data is stored | No |
| Format | File/data format | No |
| Link | URL or reference link | No |
| Cost | Associated cost | No |

**Not implemented across categories:** asset status enum, serial number, warranty, supplier link, barcode/QR, recurring review dates, confidentiality classification levels, or soft-delete/archive.

---

## 8. Current UI Layout

### Module entry

- Sidebar: collapsible **Inventory** group (cube icon).
- Requires `INVENTORY` + `READ`.
- Five child links, each a separate page:

| Sidebar label | Path |
| ------------- | ---- |
| Hardware | `/admin/inventory/hardware` |
| Software | `/admin/inventory/software` |
| People | `/admin/inventory/people` |
| Premises | `/admin/inventory/premise` |
| Information | `/admin/inventory/information` |

Detail pages: `/admin/inventory/{category}/:id` (no sidebar link; reached via row Actions → Details).

### Shared list page layout (all categories)

1. **NavigationTabs** with two tabs:
   - **All {Category}** — data table
   - **{Category} Categories** — tags/categories manager
2. **Table toolbar:** Search input, Filter button (modal), Add button.
3. **DataTable** columns vary by category (see below).
4. **Row click** → preview drawer (Overview + Details tabs).
5. **Row Actions** → Details (navigate to full page) + Delete (confirm modal).
6. **Pagination** at bottom.

### Shared detail page layout

- **Left column (4):** Overview sidebar (reference, business unit, key summary).
- **Right column (8):** `SwitchableView` toggling read view ↔ edit form.
- Edit toggle visible when user has `INVENTORY` + `CREATE`.
- Create/edit also available via drawer from list page.

### Category-specific list columns

| Category | Columns |
| -------- | ------- |
| Hardware | Reference, Business Unit, Asset Name, Asset Tag, Asset Owner, Assigned Date, Actions |
| Software | Reference, Business Unit, Software Name, Licence, Installs, Actions |
| People | Reference, Business Unit, Name, Role, Responsibility, Actions |
| Premise | Reference, Business Unit, Building Name, Address, Postal Code, Actions |
| Information | Reference, Business Unit, Info Inventory, Title, Storage Location, Owner, Actions |

### Category-specific forms and detail fields

**Hardware:** Asset name, business unit, asset tag, owner (filtered by unit), category, assigned/returned/destruction dates, cost. Detail shows lifecycle dates section.

**Software:** Software name, business unit, category, licence count, install count, cost, document dropzone. Detail/edit shows **Keys** section (`SoftwareKeyForm` to add; `SoftwareKeys` cards to view/delete) and **Attachments** section (`Attachments` + delete per doc).

**People:** Staff name, business unit, role, responsibility, skill, category.

**Premise:** Building name, business unit, address, postal code, category, cost.

**Information:** Title, business unit, information inventory, format, storage location, link, owner (filtered by unit), category, cost.

### Software keys UI

- **Add:** Text field “Add keys” on detail page (edit mode) and drawer edit form → saves one key at a time.
- **View:** Card per key showing key value.
- **Delete:** Delete button per key when user has `INVENTORY` + `CREATE` in UI.

### Software documents UI

- **Upload:** `ImsInputDropZone` on create/edit form (`inventory_software_attachments` bucket).
- **View:** `Attachments` component on detail and drawer.
- **Delete:** Trash icon via `DocumentsDeleteButton` when user has `INVENTORY` + `DELETE`.

### Search, filter, pagination

- **Search:** Debounced `clientSearch` query param.
- **Filter modal:** Business unit (multi), Owned by (multi), Category (multi).
- **Pagination:** Page/size from API `pagination` object; default size 10.

### Empty, loading, error, restricted states

- Failed create/update/delete shows danger notification.
- Delete restricted to organisation admin **or** record creator (UI); requires `INVENTORY` + `DELETE`.
- Hardware **Add** button has **no CREATE permission gate** (other categories gate Add behind CREATE).
- Hardware/Information drawer edit pencil gated by `DELETE` permission; Software/People/Premise use `CREATE`.
- People detail page may have broken edit toggle due to prop typo (`canSwitc` vs `canSwitch`) — **requires confirmation**.

### Navigation workflow

```
Sidebar Inventory → choose category → list tab
  → Search / Filter / Paginate
  → Add → create drawer → save → row appears, drawer may open
  → Row click → preview drawer
  → Actions → Details → full detail page
      → Toggle edit → form → Update
      → (Software) Add/delete keys; upload/delete documents
  → Actions → Delete → confirm → removed
  → Categories tab → manage tags for this asset type
```

---

## 9. Miscellaneous / Module-Specific Information

### Product naming

The user-facing module name is **Inventory**. Backend routes and services use **assets**. This specification treats them as the same module. **Information** assets are stored as `informations` on the API; frontend code folder is `organizationalAssets` but sidebar and copy say **Information**.

### Asset lifecycle behaviour

| Concept | Implemented? | Notes |
| ------- | ------------ | ----- |
| Active/inactive status | No | No status enum on live models |
| Hardware assignment lifecycle | Partial | `assignedDate`, `returnDate`, `destructionDate` — user-entered dates, no workflow |
| Software licence tracking | Partial | Count fields + keys; no enforcement that installs ≤ licences |
| Retired/disposed | Partial | Hardware `destructionDate` only |
| Owned/managed by | Partial | Hardware and Information have **owner** (user) |
| Located at | Partial | Premise address/location; Information storage location |

Legacy `assetLifecycle.js` (assign/return/dispose with statuses “In use”, “Returned”, “Retired”) exists but is **not exposed via API**.

### Permissions summary

| Action | Backend RBAC | Typical UI gate |
| ------ | ------------ | --------------- |
| View lists/detail | INVENTORY READ | Route + sidebar |
| Create asset | INVENTORY CREATE | Add button (except Hardware ungated) |
| Update asset | INVENTORY CREATE | Edit toggle / form |
| Delete asset | INVENTORY DELETE | Row delete; admin or creator |
| Add software key | INVENTORY CREATE | Key form |
| Remove software key | INVENTORY DELETE (API) | UI shows delete with CREATE permission |
| Add/remove software doc | CREATE / DELETE | Dropzone / delete button |

Auditors and compliance-body roles have READ-only Inventory access on backend policies.

### List vs get visibility

- **Lists:** Organisation-scoped + `basicRoleScopedFilter` (Super Admin/auditors: all; HoS/Basic: own unit or null; External: own unit only).
- **Get by ID:** No org or group check — any user with READ who knows an ID can fetch the record.

### Software keys — business meaning

A Software Key is a **licence or activation key string** stored as a sub-entry on a software asset. Users add keys one at a time after creation; keys are displayed in plain text on detail views. There is no separate licence expiry, seat assignment, or encryption. Keys cannot be edited in place—only added or removed.

### Software documents — business meaning

Software Documents are **supporting file attachments** (licence agreements, install media metadata, etc.) uploaded to S3. Documents can be added on create/update (appended) or via dedicated add endpoint. Individual documents can be deleted. View uses standard attachment component with download.

### People assets — business meaning

People Assets represent **organisational roles and competencies** (name, role, responsibility, skill)—not linked to system user accounts. **Observed but business purpose unclear** whether these map to real staff or abstract capability records. They can be linked to Premise-type risks in Risk Management.

### Cross-module risk linking detail

| Risk type | Asset picker in UI | Backend asset ref |
| --------- | ------------------ | ----------------- |
| Hardware | Yes — hardware list | `Hardwareasset` |
| Software | Yes — software list | `Softwareasset` |
| People | Yes — people list | `Peopleasset` |
| Premise | Yes — premise list | `Premiseasset` |
| Organisational | Hidden | N/A in UI |
| Clinical | Hidden | `Clinicalasset` (no inventory UI) |
| Information | **Not in UI** | `Informationasset` supported on backend |

Deleting an asset does **not** cascade-clean linked risks.

### Frontend vs backend discrepancies

| Topic | Frontend | Backend | Conclusion |
| ----- | -------- | ------- | ---------- |
| Information asset risk link | Not offered | Supported | UI gap |
| People required fields | Optional in form | name, role, skill required | Create may fail if empty |
| Information required fields | Many marked required in UI | title only required | UI stricter than API |
| Software key delete permission | CREATE | DELETE | Users with CREATE only may see button but API rejects |
| Hardware Add button | No permission check | CREATE required | Ungated Add may fail on submit |
| Hardware/Info edit toolbar | DELETE permission | CREATE on PUT | Mismatch |
| Information category update | Sent on edit | `tagsAndCategorie` typo | Category updates may not persist |
| People create org field | N/A | `organizationId` vs `organisationId` inconsistency in controller | **Requires confirmation** if create fails in some paths |
| “Owned by” filter | All categories | Only hardware/information have owner | Ineffective filter on software/people/premise |

### Legacy / unwired code

`src/services/inventory/assets.js` and `assetLifecycle.js` implement a richer unified asset model (supplier, manufacturer, serial number, warranty, barcode, asset status, disposal). This is **not connected** to the live `/assets/*` API. Current behaviour uses per-type models in `services/assets.js` only.

### Unclear or incomplete behaviour

- Whether People assets are intended to mirror real employees or abstract skill registers.
- Whether Clinical assets will be added to Inventory or remain risk-only.
- Whether information asset owners participate in user deactivation ownership transfer (hardware does; information schema marks owner but jobs omit it).
- Effective behaviour of People detail edit toggle (`canSwitc` typo).
