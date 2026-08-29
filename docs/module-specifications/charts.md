# Charts

## 1. Module Overview

The **Charts** module is a **backend chart-definition registry** in iMS. It stores **named chart configurations** that describe how business data should be aggregated and presented visually. Each stored chart has a name, description, and a **data derivation definition** (an aggregation pipeline) that specifies how to calculate chart values from underlying business records.

The module’s primary business purpose is to provide a **reusable, centrally managed catalogue of chart definitions** that can be applied against business module data — for example, summarising IMS Project records by status or grouping work-package metrics over time. It is designed as **configuration storage**, not as the system that renders charts to end users.

In the current product, **users do not see or interact with the Charts module directly**. There is **no Charts navigation entry**, **no chart management screen**, and **no confirmed frontend consumer** of the Charts API. Operational visualisations that users see on the **Live Dashboard**, in **CRM analytics**, in **Compliance overviews**, and in the **Partnership programme** are powered by the **Dashboard** and **Stats** modules (and module-specific analytics APIs), using shared frontend chart **display components** — not by this Charts module’s stored definitions or API.

Primary users of the Charts module today are **authenticated organisation members** (or integrators) who can reach the backend API. **No module-specific permission checks** were found on Chart routes beyond organisation-session authentication.

---

## 2. Features and Capabilities

### Create a chart definition

- **Capability:** Register a new named chart configuration with a description and data derivation rules.
- **Who uses it:** Authenticated users via the Charts API. **No confirmed UI consumer.**
- **Outcome:** A persistent Chart record is saved. Success message *“Chart created.”* The chart becomes available for listing and retrieval.
- **Conditions:**
  - Chart **name must be unique** within the tenant database. Duplicate names are rejected with a business error (*“A chart with the same id already exists.”* — message refers to name/id interchangeably).
  - Required inputs at creation are **name**, **description**, and **pipeline** (the data derivation definition).
  - **No request-body validation middleware** was found on the create route — invalid payloads may fail at persistence layer.

### List chart definitions

- **Capability:** Retrieve a paginated list of stored chart definitions, with optional text search.
- **Who uses it:** Authenticated users via the Charts API. **No confirmed UI consumer.**
- **Outcome:** Paginated list of chart records matching the query. Search applies to **name** and **description** fields when filter parameters are supplied through the standard list filter mechanism.
- **Conditions:**
  - **Organisation scoping is not applied** — code that would restrict charts to the user’s organisation is present but **commented out**. Charts appear to be **tenant-database-wide**, not organisation-scoped. **[Requires verification]** of intended business boundary.
  - List response uses the key **`imsProjects`** for the data array (likely a copy-paste error from another module) rather than a charts-specific key. **Observed but business purpose unclear** for API consumers.

### View a single chart definition

- **Capability:** Retrieve one chart definition by its identifier.
- **Who uses it:** Authenticated users via the Charts API. **No confirmed UI consumer.**
- **Outcome:** Full chart record returned. Success message *“Chart retrived.”*
- **Conditions:** Chart must exist; otherwise a not-found outcome (*“No chart found.”*).

### Update a chart definition

- **Capability:** Change a chart’s **description** and **data derivation definition** (pipeline).
- **Who uses it:** Authenticated users via the Charts API. **No confirmed UI consumer.**
- **Outcome:** Updated chart record returned. Success message *“Chart updated.”*
- **Conditions:**
  - Chart **name cannot be changed** through the update operation (only description and pipeline are modified).
  - Chart must exist before update.

### Permanently remove a chart definition

- **Capability:** Hard-delete a chart definition from the registry.
- **Who uses it:** Authenticated users via the Charts API. **No confirmed UI consumer.**
- **Outcome:** Chart record deleted. Success message *“Chart removed.”*
- **Conditions:** Chart must exist. **No soft-delete route** is exposed despite the data model supporting soft-delete markers.

### Execute a chart against business data (backend — not exposed)

- **Capability:** Run a chart’s aggregation pipeline against a business module’s data store to produce calculated chart values.
- **Who uses it:** **Not available to users.** An internal service method exists but is **not exposed through any route or controller**, and the method **does not return results** in its current form.
- **Outcome:** **Current behavior could not be fully determined.** Implementation suggests the default target data source is **IMS Projects**, with the pipeline passed to a database aggregation. Commented-out code suggests organisation-scoping was intended for execution.
- **Conditions:** **Partially implemented only.** This capability cannot be confirmed as delivering business insight to any user today.

---

## 3. User Outcomes / End Results

Through the **Charts module API** specifically:

- **Create:** Register reusable chart definitions that describe how to summarise business module data.
- **View:** Retrieve individual chart definitions or browse the chart catalogue with pagination and search.
- **Manage:** Update chart descriptions and derivation rules; permanently remove obsolete definitions.
- **Change:** Modify how a named chart calculates its data (pipeline update); cannot rename via update.
- **Information received:** Chart name, description, data derivation definition, and (when populated on the record) optional module type, linked record, and display configuration.
- **Business actions enabled:** Central management of chart calculation recipes for potential use by dashboards, reports, or integrations — **when consumed by calling systems**. In the current product surface, **end users gain operational insight through Dashboard and Stats**, not through this module.

**What users cannot achieve through Charts today (confirmed):**

- View rendered charts or graphs in the application UI via this module.
- Monitor live risk, incident, audit, or compliance trends through Charts definitions.
- Apply date-range, status, or business-unit filters through Charts API.
- Drill from a chart into underlying records through Charts.

---

## 4. Scope Boundaries

### In scope

- Persistent **Chart definition records** (name, description, pipeline, optional module link fields, optional config).
- CRUD-style management: create, list (with search), get, update (description + pipeline), hard-delete.
- Internal (non-exposed) aggregation execution stub targeting business module data.
- Tenant-database storage of chart definitions (organisation filter not active on list).

### Out of scope (handled elsewhere)

- **Rendered visualisations on Live Dashboard** — handled by **Dashboard** module using **Stats** live calculations and persisted dashboard snapshots; frontend uses shared Recharts-based display components (`ImsBarChart`, `ImsLineChart`, etc.) fed by Dashboard/Stats data, **not** Charts API definitions.
- **Module-specific analytics screens** — CRM “MY CRM” charts, Compliance toolkit overview charts, CQC overview analytics, Partnership programme bar chart — each uses **module-specific or Stats analytics APIs**, not Charts definitions.
- **Stats module** — provides live aggregated metrics consumed by Dashboard and some module overviews (`/stats` routes).
- **Chart display components** — frontend `@/components/charts/*` are **presentation widgets**; they are not the Charts business module and do not call the Charts API.
- **PDF dashboard reports** — generated by Dashboard module workflows.
- **Business record operations** — Charts does not create or modify risks, incidents, projects, or other source records; it only stores definitions intended to read them.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **Dashboard** | **Separate module.** Dashboard presents user-facing charts and summaries. Dashboard consumes **Stats** and persisted dashboard data — **not** Charts module definitions. No confirmed code path from Dashboard to Charts API. |
| **Stats** | **Separate module.** Provides live calculated metrics (risk trends, incident resolution, audit progress, CRM figures, etc.) that power dashboard visualisations. Stats is what users effectively “see as charts” today. |
| **IMS Projects** | **Intended data source** for chart execution. The internal `executeChart` method defaults to the IMS Projects data model. Chart model includes optional `moduleType` / `module` fields that could link a definition to a project context, but **create/update operations do not populate these fields** in confirmed code. |
| **Risk Management, Incident Management, Audit, Compliance, CRM, CIP, Suppliers, Inventory** | These modules contribute data to **Dashboard/Stats visualisations** that users see. They do **not** confirmedly feed the Charts module registry or consume Chart definitions. |

**Summary:** Charts is a **standalone definition registry** with **design intent** to aggregate IMS Project (and potentially other module) data. **Dashboard and Stats** are the confirmed modules that deliver **user-visible chart insight** today.

---

## 6. Current Data Model

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| **Chart** | A named, reusable definition describing how to derive visualisation data from business records | Primary entity owned by this module. Stores name, description, aggregation pipeline, and optional module linkage and display config. |
| **Pipeline (embedded)** | The ordered set of data transformation and grouping rules used to calculate chart values | Embedded on each Chart record. Defines **how** to summarise source data — not the rendered chart itself. |
| **Module type / module link (optional fields)** | Which business module and record a chart definition relates to | Present on the model schema but **not set** by confirmed create/update operations. **Implementation suggests** future scoping of definitions to specific modules or records. |
| **Config (optional object)** | Additional display or behaviour settings for the chart | Present on the model schema but **not used** in confirmed create/update service logic. |

A **dedicated Charts data model exists** (`charts` collection). Chart definitions are **persistent** — they are not calculated on the fly unless an execution capability runs the stored pipeline (execution is not user-accessible today).

Chart **output data** (counts, categories, trend values) is **not stored** by this module. Only the **recipe** for producing that data is stored. Live metrics seen by users come from **Stats/Dashboard** calculations or module analytics, not from persisted Chart output.

---

## 7. Attributes

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| **Chart identifier** | Unique ID of the chart definition | Assigned on create. Used for get, update, and delete. |
| **Name** | Human-readable unique label for the chart definition | Required on create. Must be unique across the tenant database. Cannot be changed via update. |
| **Description** | Business explanation of what the chart measures or shows | Required on create. Can be updated. Used in list search. |
| **Pipeline** | Data derivation rules — defines how source records are filtered, grouped, and summarised to produce chart values | Required on create. Can be updated. Represents the business logic for **what to count, compare, or trend** — stored as structured steps, not as pre-calculated numbers. |
| **Module type** | Which business module’s records the chart reads from | Optional on model. **Not populated** by confirmed create/update flows. |
| **Linked record ID (`module`)** | A specific business record the chart is scoped to | Optional on model. **Not populated** by confirmed create/update flows. |
| **Config** | Additional chart presentation or behaviour settings | Optional on model. **Not used** in confirmed service logic. |
| **Soft-delete marker** | Whether the definition is in trash | Supported by data model plugin. **No soft-delete route** exposed — only hard-delete confirmed. |

**Attributes users see on operational dashboards (not from Charts module):**

Metrics such as risk counts by type, incident resolution times, compliance percentages, audit completion, CRM invoice volumes, and digital maturity scores are **Dashboard/Stats attributes**, sourced from business modules and calculated at request or snapshot time — **not** stored Chart definition attributes.

---

## 8. Current UI Layout

### Main screens / pages

- **No standalone Charts screen or navigation entry exists.** Users cannot open a “Charts” area in the product.

### Important sections and views

- **No UI reads from or writes to the Charts API** (`/charts`) in this repository.

User-facing chart visualisations appear **inside other modules**, powered by **Dashboard**, **Stats**, or **module analytics**:

| Location | What users see | Data source (confirmed) |
| -------- | -------------- | ----------------------- |
| **Live Dashboard** (`/admin/dashboard`) | Risk trend line charts, incident bar/line charts, audit progress pies, compliance circular progress, supplier pies, CIP bars, CRM bars/lines, digital maturity radar, invoice/contract charts, business-unit comparisons | **Stats API** (organisation dashboard) and **Dashboard API** (business function dashboard) |
| **CRM — MY CRM** | Contract value charts, customer stage tables, invoice charts, interaction analytics | **CRM/customer analytics API** |
| **Compliance toolkit overview** | Implementation scope charts and section breakdown | **Compliance API** |
| **Partnership programme** | Bar chart of compliance tools allocation | **Partnership analytics API** |
| **Individual module stats panels** | Risk, incident, audit overview charts with links to lists | **Stats API** |

Shared frontend components (`ImsBarChart`, `ImsLineChart`, `ImsPaddingPieChart`, `ImsCircularProgressChart`, `ImsRadarChart`) render the visualisations but **receive pre-calculated data from parent modules** — they do not load Chart definitions from the Charts module.

### Primary actions

- **Charts module:** No user actions in UI.
- **Dashboard charts:** Tab switches (for example risk type: Organisation / Hardware / Software), links to underlying module lists, digital maturity comparison modal (Super Admin). These are **Dashboard interactions**, not Charts module actions.

### Forms

- None for Charts module.

### Lists / tables / cards / detail views

- None for Chart definitions.
- Dashboard and module analytics use cards and chart panels as described above.

### Navigation and workflow

- No navigation path to manage chart definitions.
- Users reach visual charts only through **Dashboard**, **CRM**, **Compliance**, **Partnership**, or module overview entry points.

### Material empty, loading, or restricted states

- Not applicable to Charts module UI (no dedicated UI).
- Dashboard panels show loading skeletons while Stats/Dashboard data loads; empty states such as *“No data available”* appear on task panels and some analytics sections when source data is absent — these belong to **Dashboard/Stats**, not Charts.

---

## 9. Miscellaneous / Module-Specific Information

### Relationship with Dashboard (confirmed distinction)

| Aspect | Charts module | Dashboard module |
| ------ | --------------- | ---------------- |
| Purpose | Store **definitions** of how to calculate chart data | **Present** operational insight to users |
| User visibility | **None** in current UI | **Live Dashboard** navigation entry |
| Data | Persistent chart **recipes** (pipeline) | Live Stats + persisted dashboard **snapshots** |
| Visualisation | Does not render charts | Renders charts via shared frontend components |
| Integration | **No confirmed link** between Dashboard and Charts API | Consumes Stats and own dashboard records |

Charts is **not** the engine behind Dashboard visualisations. Dashboard answers operational monitoring questions today; Charts holds **configurable definitions** that are **not yet wired** into that experience.

### Relationship with Stats (confirmed)

**Stats** calculates live organisational metrics (risks, incidents, audits, CRM, etc.) that Dashboard and some module screens display as charts. Stats is the **confirmed source of user-visible chart data**. Charts module definitions are **separate** and **not referenced** by Stats in confirmed code.

### Filters and data scoping

| Scoping type | Confirmed behaviour |
| ------------ | ------------------- |
| **Authentication** | Charts routes require authenticated organisation session (`authOrgAccess`). |
| **Organisation membership** | List query **does not filter** by user’s organisation ID (filter code commented out). Charts in a tenant database may be visible across organisations within that tenant. **[Requires verification]** |
| **Module-specific IAM** | Route middleware arrays are **empty** — no Charts-specific Read/Create/Delete permission checks like other modules. |
| **User-selectable filters (list)** | Text search on **name** and **description** via standard list filter mechanism. **No UI exposes this.** |
| **Date range, status, business unit** | **Not supported** by Charts module. These filters exist on Dashboard/Stats/module analytics, not on Chart definitions. |

### Snapshot vs trend

- **Charts module:** Stores **static definitions** only. Does not itself produce time-series or status snapshots for users.
- **User-visible charts:** Dashboard/Stats provide **current snapshots** and, where implemented, **historical trends** (for example risks raised over the last year, invoice counts by month). This is **outside** the Charts module.

### Internal execution capability (partial)

An internal `executeChart` method can run a stored pipeline against a business module’s data (default: IMS Projects). It is **not exposed via API**, **does not return aggregation results** in current code, and contains commented-out organisation-scoping logic. **Implementation suggests** this was intended to let chart definitions produce live datasets for display or export — **confirmation required** before treating as a business capability.

### Frontend/backend discrepancies

| Area | Finding |
| ---- | ------- |
| Charts API vs UI | Full CRUD backend; **zero frontend consumers**. |
| Dashboard “charts” vs Charts module | Users see many charts on Dashboard; **none use Charts module definitions**. |
| List response key | Returns `imsProjects` key for chart list data — likely incorrect for API consumers. |
| Model fields vs CRUD | `moduleType`, `module`, and `config` exist on model but are **not set or updated** by confirmed service methods. |
| Soft delete | Model supports soft delete; **only hard-delete route** exists. |
| Route imports | Charts routes import IAM constants (`IMS_SERVICES`, `ACTIONS`, `EFFECTS`) but **do not use them** in middleware. |

### Unclear or partially implemented behaviour

- **Who creates and maintains chart definitions in production** — no UI or confirmed integrator found. **[Requires verification]**
- **Whether organisation scoping is intentionally disabled** on list/create — commented code suggests it was planned. **[Requires verification]**
- **Whether `executeChart` will be exposed** to Dashboard, reports, or IMS Projects screens — not evidenced. **Implementation suggests** future integration only.
- **Business meaning of stored pipelines** — without sample data or consumers, individual chart definitions’ business questions cannot be documented. Only the **registry pattern** is confirmed.
- **Tenant vs organisation boundary** — charts stored per tenant database connection; cross-organisation visibility within a tenant is unclear.

### Terminology

- **“Charts” in UI labels** (for example dashboard section headings, “Risks raised over the last year”) refers to **visual presentations of Stats/Dashboard data**, not to Chart definition records in this module.
- **“Charts module”** specifically means the `/charts` registry API and `charts` data model described in this document.
- **`@/components/charts/*`** are shared **display components** — presentation layer only, not the Charts business module.

None further.
