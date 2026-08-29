# Tags and Categories

## 1. Module Overview

The **Tags and Categories** module provides **organisation-specific classification labels** that users can assign to operational records across several iMS modules. It lets an organisation define reusable names (with descriptions) for grouping and identifying risks, incidents, inventory assets, and CRM customers, then select those values when creating or editing records and when filtering lists.

In the current product, **Tags and Categories are not two separate record types**. The application stores a single kind of record — internally named *tag and category* — with a **name**, **description**, and **applicable modules** list. The UI alternates terminology (“Tags”, “Categories”, “Tag and Category”) for the same underlying record. There is **no hierarchy** (no parent categories, no nested tags) and **no many-to-many tagging** on business records: each supported record holds **at most one** classification reference.

The module is primarily **supporting organisational metadata**, not a standalone business process. Users manage values either from a **dedicated admin screen** or from **module-specific “Categories” tabs** embedded in Risk Management, Incident Management, Inventory, and CRM. Values are **scoped to the current organisation** and are not shared across tenants.

Primary users are **organisation administrators and module users** who need consistent labels for classification, list filtering, and record identification. Super Admins and Auditors can access the standalone Tags screen under Management Review permissions.

---

## 2. Features and Capabilities

### Create a classification label

- **Capability:** Define a new tag/category with a **name**, **description**, and one or more **applicable modules** indicating where it may be used.
- **Who uses it:** Users with access to the Tags management UI or the inline “add category” control on record forms.
- **Outcome:** A new organisation-specific label becomes available in dropdown selectors and filters for the selected modules.
- **Conditions:** Name is required. Frontend also requires description and at least one applicable module on the management form. Backend description is optional; applicable modules array is optional on create validation.

### View and search classification labels

- **Capability:** List tag/category records for the organisation with pagination and text search across name, description, and applicable modules.
- **Who uses it:** Users on the management table (standalone or module-embedded).
- **Outcome:** Users see all defined labels relevant to their context — either **all organisation labels** (standalone screen) or **labels filtered to one module** (embedded tab).
- **Conditions:** List is always organisation-scoped. Embedded contexts pass a module filter (e.g. only `risks` labels on the Risk Categories tab).

### Update a classification label

- **Capability:** Change the **name** and **description** of an existing label.
- **Who uses it:** Users who can open the edit drawer for a label.
- **Outcome:** Updated name/description appears in selectors and on linked record detail views that populate the reference.
- **Conditions:** Backend update logic **only persists name and description** — applicable modules sent from the frontend on update are **not saved** by the current service implementation.

### Remove a classification label

- **Capability:** Delete a tag/category record from the organisation catalogue.
- **Who uses it:** Users with access to row actions on the management table.
- **Outcome:** The label is removed from the catalogue list. **No check is performed** for records still referencing it.
- **Conditions:** Confirmation modal before delete. Deletion is a hard delete with **no cascade cleanup** on linked business records.

### Assign a classification to a business record

- **Capability:** When creating or editing a supported record, select **one** tag/category from a dropdown filtered to the current module context.
- **Who uses it:** Users working in Risk Management, Incident Management, Inventory asset forms, and CRM customer forms.
- **Outcome:** The record stores a single classification reference; detail views display it as **“Category: {name}”** (even where the form label says “Tag and Category”).
- **Conditions:** Optional on most forms ( “Not selected” option available). Selector lists are filtered by `applicableModules` when the surrounding page provides module context.

### Create a label inline while editing a record

- **Capability:** From a record form, open a popover (“Missing out category? Create a new one”) and submit the same creation form without leaving the record workflow.
- **Who uses it:** Users on risk, incident, inventory, and CRM forms that include the **Add category** side button.
- **Outcome:** New label is created and added to the local selector list; user can then assign it to the record.
- **Conditions:** Inline form still requires the user to pick applicable modules manually — it does **not** auto-preselect the current module from context.

### Filter lists by classification

- **Capability:** In module list filters, select **one or more** categories to narrow results.
- **Who uses it:** Users filtering risks, CRM customers, and inventory asset lists (hardware, software, people, premise, information).
- **Outcome:** List shows only records whose assigned tag/category ID matches any selected value (`in` filter).
- **Conditions:** Filter uses multi-select; assignment on the record itself remains single-value.

### Module-specific category management tabs

- **Capability:** From within operational modules, switch to a dedicated **Categories** tab to manage labels for that module only.
- **Who uses it:** Users in Risk, Incident, CRM, and each Inventory asset area.
- **Outcome:** Same management table as the standalone screen, pre-filtered to one module’s applicable labels.
- **Conditions:** Tab naming follows the module (e.g. “Risk Categories”, “Hardware Categories”).

---

## 3. User Outcomes / End Results

### For organisation administrators and module users

- **Create** reusable classification labels with names and descriptions scoped to their organisation.
- **View** a paginated, searchable catalogue of labels — organisation-wide or module-specific.
- **Update** label names and descriptions (with the applicable-modules limitation noted above).
- **Remove** labels from the catalogue when no longer needed.
- **Assign** exactly one classification per supported record when creating or editing it.
- **Filter** operational lists by one or more classifications to focus on a subset of records.
- **See** assigned classification on record detail and overview screens as a readable category name.
- **Add** a missing label without navigating away from a record form.

### What users cannot achieve through this module today (confirmed)

- Assign **multiple tags** to one record — only a single reference is supported.
- Organise labels in a **parent/child hierarchy**.
- Manage labels for **CIP, Suppliers, or Expense Reports** through the frontend — backend model allows these module types, but no UI exposes them.
- Rely on **deletion blocking** when labels are still in use — deletion proceeds regardless of linked records.
- Change **applicable modules** on an existing label through the backend update path (frontend sends the field; service ignores it).
- Open a fully wired **view/edit drawer from the management table row** — table row actions currently expose **delete only**; detail and edit drawers exist in code but are not opened from the table in normal use.

---

## 4. Scope Boundaries

### In scope

- **Organisation-scoped classification catalogue** (create, list, get, update name/description, delete).
- **Applicable modules** metadata defining where a label is intended to be used.
- **Single-reference assignment** on risks, incidents, five inventory asset types, and CRM customers.
- **List filtering** by classification in those modules.
- **Embedded management tabs** and **standalone admin page** for the catalogue.
- **Inline creation** from record forms.

### Out of scope (handled elsewhere)

- **Free-text labels** on records without using this catalogue — not part of this module.
- **Document tagging** — Document Management uses its own concepts; no confirmed Tags and Categories usage there.
- **Dashboard or Stats metrics** by tag/category — not observed.
- **Custom Forms (`relatedTagsAndCategories`)** — backend model links custom forms to tag/category IDs, but **no frontend usage** was found.
- **Global/system-wide labels** — all values belong to one organisation.
- **Many-to-many tagging or tag hierarchies** — not implemented.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **Risk Management** | Records store one tag/category; “Risk Categories” tab manages labels; risk list filter by category; detail shows “Category: {name}”. |
| **Incident Management** | Incidents store one tag/category; “Incident Categories” tab; form selector and detail display. |
| **Inventory — Hardware** | Hardware assets assign and display one category; “Hardware Categories” tab; hardware list filter. |
| **Inventory — Software** | Same pattern for software assets. |
| **Inventory — People** | Same pattern for people assets. |
| **Inventory — Premises** | Same pattern for premise assets. |
| **Inventory — Information** | Same pattern for information/organisational assets. |
| **CRM (Customers)** | Customers assign one tag/category; “Customers Categories” tab; CRM list filter; detail display. |
| **Management Review (navigation)** | Standalone Tags page is registered under Management Review read permission in routing — organisational admin entry point, not a data link. |
| **Custom Forms** | Backend can reference multiple tag/category IDs on a form definition; **no confirmed user-facing workflow** in frontend. |

**Backend-only module types** in the applicable-modules enum (no confirmed frontend management or assignment UI): **CIP**, **Suppliers**, **Expense Reports**.

---

## 6. Current Data Model

The module owns one persistent business entity: the **Tag and Category** record (stored as organisation customisation metadata).

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| **Tag and Category** | A reusable organisation label with optional description and module applicability | Created and managed through this module; referenced by operational records |
| **Applicable module entry** | A module type string (e.g. `risks`, `hardwareassets`) where the label is intended to be selectable | Scopes which modules’ forms and filters show the label |
| **Created metadata** | Who created the label and when | Audit context on the catalogue record |
| **Organisation link** | Which organisation owns the label | Scopes all catalogue operations |
| **Linked business record reference** | Single ObjectId on a risk, incident, asset, or customer | **Owned by the operational module**, not Tags and Categories — stores which label was assigned |

There is **no separate Tag entity** and **no separate Category entity** in the data model. Assignment on business records is always a **single optional reference**, not an embedded list of tag strings.

---

## 7. Attributes

### Tag and Category record

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| **Name** | Display label shown in dropdowns, filters, and detail views | Required |
| **Description** | Longer explanation of what the classification means | Optional on backend; required on frontend management form |
| **Applicable modules** | Which business modules may use this label | Array of module type codes; set at creation; **not updated** by current backend update logic |
| **Organisation** | Owning organisation | Automatically set from session on create; scopes list queries |
| **Created by / Created on** | User and timestamp of creation | Set on create |

### Supported applicable module values (backend)

| Module code | Business area |
| ----------- | ------------- |
| `risks` | Risk Management |
| `incidents` | Incident Management |
| `hardwareassets` | Hardware inventory |
| `softwareassets` | Software inventory |
| `peopleassets` | People inventory |
| `premiseassets` | Premises inventory |
| `informationassets` | Information inventory |
| `customers` | CRM customers |
| `cips` | Continual Improvement — **backend only, no frontend UI confirmed** |
| `suppliers` | Supplier Management — **backend only, no frontend UI confirmed** |
| `expensereports` | Expense Reports — **backend only, no frontend UI confirmed** |

### Assignment on business records (all supported modules)

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| **Tag and Category (reference)** | The one classification assigned to this record | Optional; single value; displayed as category name when populated |

---

## 8. Current UI Layout

### Standalone management page

- **Entry:** Admin navigation → **Tags** at `/admin/tags-categories`.
- **Permission:** Management Review **Read**; authorised roles **Super Admin** and **Auditor** (per route config).
- **Layout:** Page title area shows **“Categories”** (nav label says **“Tags”**).
- **Toolbar:** Search input; **Create** button opens right drawer with creation form.
- **Table columns:** Name (with icon), Description, Applicable Modules (raw module codes), Actions.
- **Row actions:** **Delete only** (confirmation modal: “This tag will be deleted”).
- **Drawers present but not fully wired from table:** Detail drawer (`tag-detail`) and edit drawer (`edit-tag-form`) — create flow does not open detail drawer after save; no row click to view/edit observed on the table.

### Creation / edit form (drawer or popover)

- **Fields:** Name (text), Description (textarea), Applicable modules (multi-select from enabled frontend module list).
- **Actions:** Add (create) or Update (edit).
- **Frontend module picker** includes: Risk, CRM, all five inventory types, Incidents. **Excludes** CIP, Suppliers, Expense Reports (commented out in frontend config).

### Embedded module “Categories” tabs

Each operational module below adds a second navigation tab reusing the same management table, filtered to that module:

| Module | Tab label |
| ------ | --------- |
| Risk Management | Risk Categories |
| Incident Management | Incident Categories |
| CRM | Customers Categories |
| Hardware | Hardware Categories |
| Software | Software Categories |
| People | People Categories |
| Premises | Premise Categories |
| Information | Information Categories |

### Record form assignment control

- **Control type:** Single-select dropdown labelled **“Category”** or **“Tag and Category”** depending on module.
- **Options:** “Not selected” plus organisation labels filtered to current module context.
- **Search:** Type-ahead triggers list refresh with client search keyword.
- **Inline add:** Plus button opens popover with creation form and helper text “Missing out category? Create a new one”.
- **Detail display:** Read-only **“Category: {name}”** on risk, incident, inventory, and CRM detail/drawer views when assigned.

### List filter usage

- **Control type:** Multi-select **“Category”** in filter modals (Risk, CRM, all inventory filters confirmed).
- **Apply:** Filters records where assigned tag/category ID is in the selected set.

### Loading, empty, and error states

- **Loading:** Full-height loader while list is fetching.
- **Empty table:** Falls back to `[["No data found"]]` placeholder when list is null.
- **Create success:** Toast “New tag added.”
- **Update success:** Toast “Tag updated successfully.”
- **Delete success:** Toast and alert “Tag deleted successfully”.
- **Errors:** Generic danger toasts (“Failed to add category”, “Failed to update category”, fetch errors); delete failure shows a **misleading leave-request error message** (copy-paste from another module).

---

## 9. Miscellaneous / Module-Specific Information

### Tags vs Categories — confirmed distinction

There is **no separate Tag type and Category type** in the implementation. The product uses one unified record. UI copy varies:

- Navigation: **“Tags”**
- Page heading: **“Categories”**
- Forms: **“Category”**, **“Tag and Category”**, or filter **“Category”**
- Notifications: mix of **“tag”** and **“category”**

Business meaning: a **single optional classification label** per record, managed as a shared catalogue entry — closer to a **category picker** than a multi-tag system.

### Organisation scoping

All list operations use **paginateByOrg** with the session organisation ID. Created records store the organisation on save. Labels are **not shared across organisations**.

### Access and permissions

- **Backend:** Routes mount after **authOrgAccess** — authenticated organisation session required. **No tag-specific RBAC middleware** on individual endpoints.
- **Standalone page:** Frontend route gated by **Management Review Read** and Super/Auditor roles.
- **Embedded tabs and form selectors:** Inherit access from the hosting module (Risk, Incident, Inventory, CRM).

### Change and removal impact

| Action | Confirmed behavior |
| ------ | ------------------ |
| **Rename / update description** | Saved on the catalogue record; populated references on business records show the new name on next load. |
| **Update applicable modules** | Frontend sends on update; **backend service does not apply** — modules remain as originally created. |
| **Delete label** | Hard delete from catalogue; **linked records retain the stored ID**; no automatic clearing or blocking; populated name may no longer resolve. |

### Filtering vs assignment

- **Assignment:** One label per record (single select).
- **Filtering:** Multiple labels can be selected to match any of them (`in` query).

### Frontend / backend discrepancies

| Topic | Observation |
| ----- | ----------- |
| **Applicable modules on update** | Frontend sends; backend only updates name and description. |
| **Applicable modules enum** | Backend includes CIP, suppliers, expense reports; frontend picker omits them. |
| **Inline Add category** | Does not pre-fill applicable modules from hosting module context. |
| **Terminology** | Tags vs Categories used interchangeably in UI and messages. |
| **Table edit/view** | Edit and detail drawers exist; table only exposes delete; post-create detail drawer open is commented out. |
| **Edit form data mapping** | `mapToTagsAndCategoryModel` does not map applicable modules to select `{value, label}` shape — **edit form may not display modules correctly**. |
| **Delete error message** | References “Leave request delete failed”. |
| **Custom Forms link** | Backend `relatedTagsAndCategories` array; no frontend workflow found. |

### Behaviour that could not be confidently determined

- Whether **get-by-id** enforces organisation scope on single-record retrieval (list is org-scoped; get uses ID only).
- Intended business use of **CIP, Suppliers, and Expense Reports** applicable module types without UI.
- Whether standalone Tags page under **Management Review** permission is intentional product placement or legacy routing.
