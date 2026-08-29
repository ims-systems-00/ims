# Functional Units

## 1. Module Overview

**Functional Units** are the organisation’s subdivisions used to structure people, access, licensing, compliance toolkits, and operational data within iMS. Each Functional Unit belongs to one organisation and represents a defined area of responsibility — either an operational **business function** or a **compliance function** — rather than a generic user group or job role.

In the underlying implementation these records are stored as `iamGroup` entities (database model `groups`). The product UI often labels them **Business Units** or **functions**, but this specification uses **Functional Unit / Functional Units** as the business-facing name because the module covers all access types, not only business-operational units.

Functional Units solve the problem of scoping work across iMS: users are associated with one or more units through membership; records in risk, incident, audit, supplier, task, dashboard, and other modules can be tied to a unit; compliance toolkits can be granted at unit level; and organisation **group licences** limit how many units can exist.

Primary users are organisation administrators and managers with **Business units Read** permission (service name in product: `Business units`, mapped to `IAM_GROUPS`): Super Admin, Head of Service, Basic User, and Auditor roles as configured in navigation. Creating units requires **Business units Create** permission and available organisation group licences.

---

## 2. Features and Capabilities

### Create a Functional Unit

- **Capability:** Add a new Functional Unit to the organisation by choosing an **Access type** and completing type-specific fields plus a responsibility statement.
- **Who uses it:** Users with **Business units Create** permission.
- **Outcome:** A new unit is created; success notification *“Business unit created successfully”*; user is redirected to the unit detail page; organisation **group licence used** count increases by one; a **Business Function Dashboard** snapshot is initialised for the new unit.
- **Conditions:** Organisation must have at least one unused **group licence** (`licenses.groups.allocated − licenses.groups.used > 0`). If not, creation is blocked with *“You don't have enough licenses to create a business unit, please request for more licenses via license management.”* Access type cannot be changed after creation (field disabled in edit form).

### View Functional Unit list

- **Capability:** Browse all Functional Units the user is allowed to see in a searchable, paginated table.
- **Who uses it:** Users with **Business units Read** permission.
- **Outcome:** Table shows name, type, responsibility, and member count; row click or **Details** opens the unit profile.
- **Conditions:** Super Admin, Internal Auditor, and External Auditor see **all** units in the organisation. Head of Service, Basic User, and External User see **only their own assigned unit**. Search matches reference, name, responsibility, operating location, and standards. List filters by type (*All units*, *Internal function*, *External function*) appear only for global-access users — **Implementation suggests filter labels may not match stored type values** (see Miscellaneous).

### View and edit Functional Unit details

- **Capability:** Open a unit profile with **Details**, and (when permitted) **Add members** and **Members** panels; switch to edit mode to update unit information.
- **Who uses it:** Users with **Business units Read**; edit switch requires **Business units Create**.
- **Outcome:** Read view shows responsibility, access type, operating location or standards (depending on type), member count, and assigned compliance toolkits. Update saves name, operating location, standards, and responsibility; success *“Business unit updated successfully”*.
- **Conditions:** The system-default **iMS System administration** unit cannot be opened for details from the list (action shows *Default*, disabled). Access type is not editable after creation.

### Add members to a Functional Unit

- **Capability:** Assign an existing organisation user to the unit from the **Add members** panel.
- **Who uses it:** Users with **Our iMS Update** permission (panel visibility gate).
- **Outcome:** User is linked to the unit; success *“User added successfully”*; member appears in **Members** list; unit **totalMembers** increases; email *new-role-granted* sent to the added user.
- **Conditions:** User must not already belong to the unit. Implemented through the **Users** module (`addUserToGroup`), not a dedicated Functional Units membership API.

### View and manage members

- **Capability:** List users whose membership includes the unit; view profile; remove users from the unit.
- **Who uses it:** **Members** panel available to all profile viewers; **Remove** requires **Users Create** permission.
- **Outcome:** Remove shows confirmation *“{name} will be removed from {unit name}”*; on success member leaves the list, `totalMembers` decreases, email *removed-from-bu* sent.
- **Conditions:** Grant/revoke access actions exist in code paths but the current members table primarily exposes **View Details** and **Remove**. Users can belong to **multiple** Functional Units via membership `groups` array.

### Assign Compliance Toolkits to a Functional Unit

- **Capability:** Select one or more compliance toolkits licensed to the organisation and assign them to the unit.
- **Who uses it:** Users with **License Management All** permission, from **License Management → unit → Tools** panel.
- **Outcome:** Unit’s toolkit list is replaced with selection; success *“Toolkit licenses updated”*.
- **Conditions:** Each selected toolkit must exist in the organisation’s compliance-tool licences; otherwise *“No toolkit license in organization”*. Assignment stores toolkit names on the unit record (`userLicenses.complianceTools`).

### Attach an Access Policy to a Functional Unit (backend-supported)

- **Capability:** Set the unit’s linked **Access Policy** to a chosen policy record.
- **Who uses it:** Backend supports this via **Business units Create** permission.
- **Outcome:** Unit `policy` field updated; response *“Group policy attached successfully”*.
- **Conditions:** **No frontend UI currently calls this workflow** — observed in API and frontend service only. Policy can be viewed read-only on License Management unit details (*Access policy:* name).

### Delete a Functional Unit (backend-supported)

- **Capability:** Permanently remove a unit record.
- **Who uses it:** Backend requires **Business units Delete** permission.
- **Outcome:** Response *“Group deleted successfully”*.
- **Conditions:** **No delete action observed in the Functional Units frontend UI.** Deletion performs a direct remove with **no observed cascade checks** for members, policies, linked records, or licence reclamation — **Current behavior could not be fully determined** for downstream impact.

### Licence gate before creation (`authCreatePermission`)

- **Capability:** Block unit creation when the organisation has no remaining group licences.
- **Who uses it:** Applied automatically on create request before the unit is persisted.
- **Outcome:** Either creation proceeds or user receives the insufficient-licence error message above.
- **Conditions:** This is the active licence check. The subsequent `useLicense` middleware in the route chain is **deprecated** and throws an error, but it runs **after** the create handler sends its response, so it does not affect successful creation from the user’s perspective.

---

## 3. User Outcomes / End Results

- **Create:** Organisation can add operational or compliance Functional Units within licence limits, each with name, location or standards, and responsibility.
- **View:** Users see a scoped list of units and open detail profiles with membership and toolkit information.
- **Manage:** Authorised users update unit descriptions, add/remove members, and assign compliance toolkits (via License Management).
- **Change:** Name, operating location, standards, and responsibility can be updated; access type is fixed after creation; compliance toolkit assignment replaces the full toolkit list.
- **Information received:** Member counts, linked access policy name (where populated), assigned toolkits, licence usage overview when creating a unit, and email notifications when users are added or removed.
- **Business actions enabled:** Structure the organisation for scoped access and data; assign users to units; enable compliance modules per unit; consume group licences; initialise per-unit dashboard visibility for operational units.

---

## 4. Scope Boundaries

### In scope

- Functional Unit CRUD (create, list, get, update description fields, delete on backend).
- Access types: Internal business function, External function, Internal compliance function, External compliance function.
- Organisation scoping and role-based list filtering.
- Group licence check and consumption on create.
- Compliance toolkit assignment at unit level.
- Member add/remove via unit profile (delegated to Users module).
- Access policy attachment at unit level (backend).
- Automatic Business Function Dashboard initialisation on create.
- Licence Management views that list units and manage toolkits.

### Out of scope (handled elsewhere)

- **User invitation and core membership lifecycle** — Users / Membership / Invitations modules.
- **Access Policy definition and statement editing** — Access Policies module; unit-level policy UI shows *“Permissions can not be amended at this moment”* when viewing a linked policy.
- **Per-unit role licence allocation UI** — License Management *Manage licences* panel is commented out; `allocateLicenseInGroup` backend stub is empty.
- **Premises** — separate Premises module links premises to groups but is not part of this module’s UI.
- **Functional Unit deletion from UI** — not exposed in current frontend.
- **Organisation licence purchasing** — License Request / Organisation modules.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **Organisation** | Every Functional Unit belongs to one organisation; group licence pool (`licenses.groups`) limits how many units can be created. |
| **Users / Membership** | Users are linked to units through membership `groups`; add/remove member operations live in Users module; session `groupId` determines user’s primary unit context. |
| **Access Policies** | Each unit may reference one Access Policy defining module permissions; system-default admin unit created with *iMS System administration* policy at org init. |
| **License Management** | Lists units with policy and role-usage columns; **Tools** panel assigns compliance toolkits; group licence overview shown during create. |
| **Dashboard** | Creating an operational unit initialises a **Business Function Dashboard** snapshot; Dashboard “Business Function” views filter to business-function access types only (see Miscellaneous). |
| **Compliance** | Compliance toolkit names assigned to a unit determine which ISO/ESG/CQC/CRM toolkits are available in that unit’s scope. |
| **Risk, Incident, Audit, Task, Supplier, CRM, CQC, Management Review, Documents, etc.** | Operational records reference a unit (`group`) for scoping ownership, filtering, and dashboard aggregation — indirect relationship through shared unit identifier. |
| **Premises** | Premises can be associated with one or more units — separate module. |
| **Notifications / Email** | Users receive emails when added to or removed from a unit. |

---

## 6. Current Data Model

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| **Functional Unit** (`groups` / `iamGroup`) | An organisation subdivision with a name, access type, responsibility, optional location/standards, member count, licence counters, compliance toolkits, and optional Access Policy link. | Core entity managed by this module. |
| **Access type** | Classifies the unit as operational (business function / external function) or compliance (internal/external compliance function). | Determines which form fields apply and how the unit is used elsewhere (e.g. Dashboard vs compliance body lists). |
| **Unit details** | Operating location (business types) or standards (compliance types). | Descriptive and scoping metadata. |
| **User licences (on unit)** | Per-role allocated/used counters (Super, HOS, Basic, Auditor) plus compliance toolkit name list. | Tracks role usage display in License Management; toolkit list drives compliance access. |
| **Access Policy link** | Reference to one policy document. | Defines what modules/actions members may use when operating in unit context. |
| **Membership.groups** | Array on user membership listing unit IDs the user belongs to. | Many-to-many user ↔ unit association. |
| **Organisation group licence** | Organisation-level allocated/used count for units. | Gates creation via `authCreatePermission`. |

Functional Units are **persisted records**, not computed views. Creating a unit triggers side effects (dashboard init, licence increment) but does not automatically attach users or policies unless done through separate workflows.

---

## 7. Attributes

### Functional Unit

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Reference | Auto-generated unit identifier (internal) | Used in search |
| Name | Display name of the unit | Required on create; editable |
| Access type | One of: Internal business function, External function, Internal compliance function, External compliance function | Required; **immutable in UI after create** |
| Responsibility | Statement of what the unit is responsible for | Required |
| Operating location | Where the business function operates | Required for business-function types |
| Standards | Compliance standards the body covers | Required for compliance-function types |
| Total members | Count of users assigned to the unit | Maintained on add/remove |
| Access Policy | Linked policy name | Optional until attached; shown in License Management details |
| Compliance toolkits | List of toolkit licences assigned to this unit | Managed from License Management |
| Super / HOS / Basic / Auditor — allocated & used | Role licence counters on the unit | Displayed in License Management table; allocation UI not active |
| Organisation | Owning organisation | Implicit from session |
| Created / updated timestamps | Audit timing | System-managed |

### Access types (business classification)

| Access type | Business meaning |
| ----------- | ---------------- |
| Internal business function | In-house operational unit (e.g. department/service area) |
| External function | External partner operational unit |
| Internal compliance function | In-house compliance oversight body |
| External compliance function | External compliance oversight body |

### Organisation group licence (related)

| Attribute | Business meaning |
| --------- | ---------------- |
| Groups allocated | Maximum Functional Units the organisation may create |
| Groups used | Units already created |
| Groups remaining | Available capacity for new units |

---

## 8. Current UI Layout

### Main screens / pages

- **Business Units** — sidebar entry at `/admin/groups` (permission service label: *Business units*; mini label *BU*).
- **Unit detail** — `/admin/groups/:id` (hidden from sidebar; reached from list or after create).
- **License Management unit view** — modal/page from licence table opening **Manage License** with **Details** and **Tools** panels.

### List screen (`/admin/groups`)

- Heading: *Business units*.
- **Search** input (backend search on reference, name, responsibility, location, standards).
- **Create a function** button (drawer) — visible with **Business units Create** permission.
- **Table columns:** Name, Type, Responsibility, Number of members, Actions.
- **Row actions:** **Details** (opens profile modal) — disabled as *Default* for system administration unit.
- **Pagination** at bottom.
- **Loading:** full-table loader while fetching.
- **Create drawer:** title *Create a function*; shows **Licences** overview card (allocated/used/remaining for business units and users); then **GroupForm**.

### Create / edit form

- **Access type** dropdown (all four types) — disabled when editing.
- **Business function types** show: Name, Operating location.
- **Compliance function types** show: Compliance body (name field), Standards.
- **Responsibility** textarea (all types).
- **Create** or **Update** / **Cancel** buttons.
- Validation errors on required fields.

### Unit profile (modal or full page)

- **Horizontal panels:** **Details** | **Add members** | **Members** (Add members hidden without **Our iMS Update**).
- **Details panel:** Switchable read/edit view; read shows responsibility, access type, location/standards, member count, toolkits list; edit reuses GroupForm.
- **Add members panel:** User dropdown (excludes users already in unit) + **Confirm**; empty **LicenseOverview** table (role usage display commented out).
- **Members panel:** Searchable table (Name, Email, Job title, Actions); row opens user profile modal; **Remove** with confirmation.

### License Management integration

- **License table** lists units with Business unit name, Access Policy, Basic/HOS/Auditor usage columns, total staff, actions.
- **Manage License → Tools:** multi-select **Toolkit** from organisation-licensed tools + **Confirm**.
- **Manage License → Details:** name, access type, responsibility, operating location, standard, staff count, access policy name.

### Primary actions

- Create unit (drawer).
- Search / paginate list.
- Open details (modal or navigate to `/admin/groups/:id`).
- Edit unit fields.
- Add member, remove member.
- Assign compliance toolkits (License Management).

### Material empty, loading, or restricted states

- **Loading:** table loader; profile spinner; form processing states (*Processing...*, *Analysing...*).
- **Restricted:** System administration unit — no details from list; create button hidden without Create permission; member add panel hidden without Our iMS Update; toolkit assignment requires License Management All.
- **Errors:** Insufficient group licence on create; duplicate member *“User already added to this group”*; toolkit assign failure *“Toolkit assign failed”*; generic *“User add failed. Unknown error occurred”*.

### UI terminology note

The live product UI predominantly says **Business units**, **Business unit**, and **Create a function**. This specification uses **Functional Units** per documentation standard. Both refer to the same underlying `iamGroup` entity.

---

## 9. Miscellaneous / Module-Specific Information

### Confirmed business meaning

A **Functional Unit** is an **organisation-scoped subdivision** that groups people and configures access/licensing for a defined area of work. It is **not** a user role (roles live on membership) and **not** merely an access-control group — though it **links to one Access Policy** and scopes data across modules. The four **Access types** split units into **operational (business) functions** vs **compliance functions**.

### Relationship to Dashboard “Business Functions”

**Confirmed relationship:** Dashboard **Business Function** views and dashboards use the **same underlying unit records**, filtered to operational access types only (**Internal business function** and **External function**). Compliance-function units appear in separate application contexts (e.g. `complianceBody` in global context) and drive compliance-body behaviour rather than the Business Function Dashboard.

| Concept | Meaning |
| ------- | ------- |
| **Functional Unit** (this module) | Any unit record — all four access types |
| **Business Function** (Dashboard) | Subset: operational access types only |
| **Compliance body** (elsewhere in product) | Subset: internal/external compliance function types |

They are **closely related entities sharing one record type**, not separate databases entities.

### System-default unit

On organisation initialisation, a default **iMS System administration** Functional Unit is created with a pre-built Access Policy. It appears in lists but cannot be opened for detail editing from the standard list actions (*Default*).

### Policy attachment

- Units **may** have one Access Policy reference.
- New units created through the standard form do **not** automatically receive a policy in the observed create workflow.
- `attachPolicy` API replaces the unit’s policy reference (single policy, not a list).
- **No detach/remove policy workflow** observed in Functional Units routes.
- Frontend `attachPolicy` service exists but **is not wired to any screen**.

### Licensing behaviour

| Step | Behaviour |
| ---- | --------- |
| Before create | `authCreatePermission` verifies remaining organisation group licences |
| On create success | `utilizeBusinessUnitLicenseInOrg()` increments organisation `licenses.groups.used` |
| `useLicense` middleware | **Deprecated** — throws if invoked; does not run after successful HTTP response from create |
| Per-unit role allocation | Backend `allocateLicenseInGroup` is an **empty stub**; UI *Manage licences* panel commented out |
| Toolkit assign | Validates organisation holds each toolkit licence; updates unit’s toolkit array |

### Lifecycle states

No explicit status field (Active/Inactive) observed on Functional Unit records. Meaningful states inferred from behaviour:

| State | Meaning |
| ----- | ------- |
| Created / active | Normal unit available in lists and profiles |
| System default | *iMS System administration* — protected from detail access in UI |
| Deleted | Record removed — **only via backend API** in current product |

### Frontend / backend discrepancies

| Topic | Discrepancy |
| ----- | ----------- |
| Terminology | UI: *Business units* / *Create a function*; permission service: *Business units*; spec: *Functional Units* |
| Update permission | Update route uses **Create** action in RBAC, not Update |
| Delete | Backend DELETE supported; **no UI** |
| Policy attach | Backend POST supported; **no UI** |
| List filters | Filter values *Internal function* / *External function* may not match stored types *Internal business function* / *External function* — **Implementation suggests filters may not work as intended** |
| Description update endpoint name | Updates name, location, standards, and responsibility — not description alone |
| License overview on Add members | Component present but table body empty (commented-out role rows) |

### Unclear or unconfirmed behaviour

- **Impact of deleting a unit** on members, licences, dashboards, and linked module records — no cascade logic observed in delete service.
- **Whether group licence `used` count decreases** when a unit is deleted — not observed.
- **How units receive their initial Access Policy** when not using attach API — default admin unit only confirmed.
- **Compliance toolkit assignment effect on individual users** — `complianceToolUserslicenseLookUp` backend method is empty stub.
- **Grant/revoke member access** buttons in UsersTable — handlers exist but menu items not fully exposed in current UI.
