# Stats

## 1. Module Overview

The **Stats** module provides **live, calculated organisational summaries** across multiple iMS business areas — risk, compliance, audits, incidents, inventory, suppliers, continual improvement (CIP), CRM, and digital maturity. It reads data from existing operational modules, aggregates it for the **current organisation** in the user’s session, and returns structured metrics for display.

Stats is **not** a standalone user-facing screen. It is a **supporting analytics capability** consumed primarily by the **Live Dashboard** (Organisation Dashboard / `OrganizationalDashboardNew`). It complements the **Dashboard** module’s persisted dashboard records by recalculating key indicators on each dashboard load.

Stats is also **distinct from the Charts module**, which stores reusable chart-definition configurations but does not currently drive user-visible dashboard panels. Stats performs **on-demand aggregation** from operational data; it does **not** store statistical snapshots or historical metric records of its own.

Primary users who benefit are **organisation-level dashboard viewers** — typically Super Admin, Internal Auditor, External Auditor, or any authenticated user with an organisation role but **no assigned business unit** (organisation dashboard context). Business Function Dashboard viewers use **persisted group dashboard data** from the Dashboard module, **not** the Stats API, in the current frontend.

---

## 2. Features and Capabilities

### Global organisational overview

- **Capability:** Provide headline organisation metrics: staff counts, business unit count, compliance body count, organisational confidence, organisational state, critical risk area, and average incident resolution times by priority.
- **Who uses it:** Organisation dashboard viewers.
- **Outcome:** Top-of-dashboard cards show operational context — how many staff (total and remote), how many business units and compliance bodies exist, a confidence percentage, a risk-based organisational state label, the dominant risk category, and P1–P4 incident resolution performance vs organisation targets.
- **Conditions:** Scoped to **`organizationId`** in the authenticated session. Optional `startDate` / `endDate` query parameters exist on the backend; the frontend **does not pass them** (defaults apply — see Miscellaneous).

### Digital maturity by business unit

- **Capability:** Calculate **digital maturity scores and utilisation percentages** per internal business unit across seven module areas: Risk Management, Incident Management, Supplier Management, Document Management, CIP, Audits, and Inventory.
- **Who uses it:** Organisation dashboard viewers (digital maturity tab panel per business unit).
- **Outcome:** Each business unit shows progress bars for module utilisation percentages. Scores use a 1–4 maturity scale (Manual → Digital → Active → Optimised) derived from whether users in the unit have created records in each module.
- **Conditions:** Only **internal business units** (`INTERNAL_BU` groups). Organisation-level maturity matrix is calculated on the backend but the frontend currently displays **`businessUnitMaturity` only**, not `organisationalMaturity`.

### Compliance completion percentages

- **Capability:** Return compliance toolkit **completion percentages** by compliance framework name for the organisation.
- **Who uses it:** Organisation dashboard viewers (Compliance panel).
- **Outcome:** Bar chart showing each compliance body/framework name and its `totalPercentage` (e.g. ISO 27001, ISO 9001).
- **Conditions:** Reads **Compliance Overview** records for the organisation. Date filtering is **commented out** in the service — all compliance records for the org are included regardless of date range parameters.

### Audit progress and non-conformities

- **Capability:** Summarise audit activity: total audits, scheduled (incomplete) audits, and **non-conformity counts grouped by business unit**.
- **Who uses it:** Organisation dashboard viewers (Audit panels).
- **Outcome:** Audit progress box and non-conformities-by-business-unit visualisation.
- **Conditions:** Audits filtered by organisation and default date range on `createdAt`.

### Risk analytics

- **Capability:** Provide risk trends and distributions: risks by type over months, risks by status (open, mitigated, accepted, escalated) over months, and top business functions by total risk count.
- **Who uses it:** Organisation dashboard viewers (Risk Management and Status panels, business-unit risk bar chart).
- **Outcome:** Line/bar charts showing risk volume by asset type (Hardware, Software, People, Premises, Organisation, Clinical) and by lifecycle status; bar chart of up to eight business units ranked by risk count.
- **Conditions:** Organisation-scoped. Backend accepts optional **`months`** query parameter (defaults to 12-month rolling window logic in risk service); frontend **does not pass it**. Date window uses service defaults.

### Incident statistics by business function

- **Capability:** Count incidents (from incidents and audits modules) per business function: total and resolved.
- **Who uses it:** Organisation dashboard viewers (Incident Management panel).
- **Outcome:** Per–business-unit incident totals and resolution counts.
- **Conditions:** Excludes IAM groups linked to system-administration and compliance-function policies. Incidents filtered by default date range.

### Inventory asset counts and expenditure

- **Capability:** Summarise asset inventory: counts and total costs across Hardware, Software, People, Premises, and Information asset categories.
- **Who uses it:** Organisation dashboard viewers (Inventory panels — asset amounts and expenditure charts).
- **Outcome:** Counts per asset area and aggregated cost figures (hardware/software/information/premises from asset records; people costs from user salary fields).
- **Conditions:** Organisation-scoped. **`dateFilter` is computed but not applied** to asset queries — counts reflect **all** assets for the organisation regardless of creation date. **[Observed but business purpose unclear]**

### Supplier management statistics

- **Capability:** Summarise supplier compliance, procurement value, and supplier-related incidents.
- **Who uses it:** Organisation dashboard viewers (Supplier Management panels).
- **Outcome:**
  - **Procurement value** — sum of supplier contract values.
  - **Supplier compliance** — compliant vs non-compliant counts, compliance percentage, and a risk-level label (Safe / Secure / Unsecure / Vulnerable / Hazardous).
  - **Supplier incidents** — total, open, and resolved incident counts where source module is suppliers.
- **Conditions:** Organisation-scoped; supplier incidents use date filter.

### Continual improvement (CIP / OFI) statistics

- **Capability:** Count improvement **opportunities** and **implemented improvements** per business unit (IAM group).
- **Who uses it:** Organisation dashboard viewers (Continual Improvement panel).
- **Outcome:** Per–business-unit counts of CIP records and those marked implemented.
- **Conditions:** CIPs filtered by organisation and default date range; grouped by assigned business unit.

### CRM and invoice statistics

- **Capability:** Summarise customer contract values and sent invoice trends.
- **Who uses it:** Organisation dashboard viewers (CRM panels and charts).
- **Outcome:**
  - Total, average, highest, and lowest customer contract values.
  - Contract value breakdown by customer stage (Live, Prospect, Warm lead, Qualified, Proposal).
  - **Invoice stats by month** — count and total amount for **sent** invoices over the last 12 months (always 12 months; independent of global date query defaults).
- **Conditions:** Organisation-scoped; customers use date filter; invoices use fixed rolling 12-month window.

---

## 3. User Outcomes / End Results

### For organisation dashboard viewers

- **View:** Headline organisational health — staff scale, business structure, confidence, risk posture, and incident response performance.
- **View:** Digital maturity utilisation per business unit across core modules.
- **View:** Compliance completion percentages by framework.
- **View:** Audit totals, scheduled audits, and non-conformities by business unit.
- **View:** Risk trends by type and status; which business units carry the most risks.
- **View:** Incident volumes and resolution counts per business function.
- **View:** Inventory asset counts and expenditure by category.
- **View:** Supplier compliance posture, procurement spend, and supplier-linked incidents.
- **View:** Continual improvement activity by business unit.
- **View:** CRM pipeline value by stage and monthly invoicing trends.
- **Information received:** All of the above as JSON aggregated on dashboard load; presented as summary cards, progress bars, and charts on the **Live Dashboard**.
- **Business actions enabled:** At-a-glance prioritisation and awareness before drilling into underlying modules (Risks, Incidents, Audits, Compliance, etc.) via dashboard links.

### What users cannot achieve through Stats today (confirmed)

- Open a dedicated **Stats** page or menu — no standalone Stats UI exists.
- Filter stats by date range from the dashboard UI (backend supports query params; frontend does not send them).
- View Stats on the **Business Function Dashboard** — that dashboard uses **persisted Dashboard module records**, not Stats API calls.
- Export or email Stats directly — dashboard PDF reports use Dashboard module rendering, not raw Stats endpoints.
- Access Stats without **authenticated organisation session** (routes are behind organisation access middleware).
- Rely on Stats for **Partnership programme analytics** — partnership dashboard uses **Organisation list/analytics** APIs, not Stats.

---

## 4. Scope Boundaries

### In scope

- **Live calculated aggregations** for organisation-scoped operational metrics.
- **Ten stat categories:** global, digital maturity, compliance, audit, risk, incident, inventory, supplier, CIP, CRM.
- **Organisation session scoping** via `organizationId` on all calculations.
- **Optional date/month query parameters** on backend (partially used by services).
- **Consumption by Organisation Live Dashboard** (`OrganizationalDashboardNew`).

### Out of scope (handled elsewhere)

- **Persisted dashboard layouts and snapshots** — **Dashboard** module (`/dashboards` API, group/organisation dashboard records).
- **Chart definition registry** — **Charts** module (stored pipelines; not used for Live Dashboard panels today).
- **Business Function Dashboard data** — persisted **group dashboard** records, not Stats API in current frontend.
- **Partnership analytics** — **Partnership Program** module (referral organisation aggregates).
- **Module CRUD operations** — Stats reads from Risks, Incidents, etc.; it does not manage those records.
- **Historical metric storage** — Stats does not write statistical snapshots to its own collection.
- **System/tenant-wide analytics** — all metrics are **per organisation**.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **Dashboard (Live Dashboard)** | **Primary consumer.** Organisation dashboard loads all Stats endpoints on mount and renders panels, cards, and charts. |
| **Membership / Users** | Global stats count **internal, non-deactivated staff** via membership and user records; digital maturity identifies users per business unit via access policies. |
| **Functional Units (IAM Groups)** | Business unit and compliance body counts; risk/incident/CIP grouping by group; digital maturity per internal BU. |
| **Risk Management** | Risk counts, mitigation rates, organisational state, critical area, risk-by-type/status trends, top BUs by risk. |
| **Compliance** | Compliance overview **totalPercentage** per framework name. |
| **Audits** | Audit totals, scheduled count, non-conformities by BU; digital maturity audit utilisation. |
| **Incident Management** | Incident resolution times (global); incidents by BU (incident stats); supplier incidents. |
| **Assets (Inventory)** | Asset counts and costs by category; inputs to organisational confidence. |
| **Suppliers** | Compliance counts, procurement value, supplier incidents; digital maturity supplier utilisation. |
| **Continual Improvement (CIP)** | Opportunities and implemented improvements per BU. |
| **Customers / Invoices (CRM)** | Contract values by stage; monthly sent invoice totals. |
| **Document Management** | Digital maturity document utilisation per BU. |
| **Organisation** | Incident resolution **target times** (P1–P4) compared against actual averages. |
| **Management Review** | Contributes to **organisational confidence** score (completed reviews in date range). |
| **Charts** | **Separate module.** Does not supply Live Dashboard; Stats is the live aggregation layer for dashboard metrics. |

---

## 6. Current Data Model

Stats **does not own persistent business records**. It **calculates results dynamically** at request time from data owned by other modules.

| Concept | Business meaning | Role in Stats |
| ------- | ---------------- | ------------- |
| **Stat result (transient)** | A calculated summary returned in an API response | Generated on each request; **not stored** by Stats |
| **Source operational records** | Risks, incidents, audits, assets, suppliers, CIPs, customers, invoices, memberships, groups, compliance overviews, etc. | **Read-only inputs** for aggregation |
| **Organisation context** | The active organisation in the user session | **Scopes all** calculations |
| **Date range (optional)** | Filter window for time-bound metrics | Applied inconsistently across stat categories (see Miscellaneous) |

There is **no Stats collection**, **no metric snapshots**, and **no historical trend storage** beyond what is computed from dated source records (e.g. risk monthly buckets, invoice last-12-months).

---

## 7. Attributes

Dimensions and output attributes are **response fields**, not persisted Stats-owned fields. Key attributes by category:

### Global stats

| Attribute | Business meaning |
| --------- | ---------------- |
| **Organisational confidence** | Percentage (0–100) reflecting whether the organisation has data in five areas: any assets, any risks, any audits, any completed audits, any completed management reviews |
| **Organisational state** | Risk posture label (Safe, Secure, Unsecure, Vulnerable, Hazardous) from mitigated-vs-total risk ratio |
| **Critical area** | Risk type with the highest count (Hardware, Software, People, Premises, Organisation, Clinical, or “No Critical Area”) |
| **Business unit count** | Number of internal and external business units |
| **Number of staff** | Count of active internal members |
| **Number of staff (remote)** | Count of internal members marked remote |
| **Compliance bodies** | Count of internal and external compliance-unit groups |
| **Incident resolution times (P1–P4)** | Average resolution duration, incident count, and alert flag vs organisation target hours |
| **Accurate as** | Timestamp when calculation ran |

### Digital maturity

| Attribute | Business meaning |
| --------- | ---------------- |
| **Business unit name** | Which business unit the maturity applies to |
| **Module maturity score (1–4)** | Manual / Digital / Active / Optimised stage per module area |
| **Module utilisation percentage** | Share of BU users who have contributed data in that module |
| **Organisational maturity matrix** | Lowest BU score per module rolled up to org level (**returned by API; not shown in current dashboard UI**) |

### Compliance stats

| Attribute | Business meaning |
| --------- | ---------------- |
| **Framework name** | Compliance toolkit name (e.g. ISO 27001) |
| **Completion percentage** | Overall compliance percentage for that framework |

### Audit stats

| Attribute | Business meaning |
| --------- | ---------------- |
| **Total audits** | All audits in date range |
| **Scheduled audits** | Audits not yet completed |
| **Non-conformities by business unit** | Sum of audit identifications per BU name |

### Risk stats

| Attribute | Business meaning |
| --------- | ---------------- |
| **Risk by type (monthly series)** | Count per month for each risk category |
| **Risk by status (monthly series)** | Open, mitigated, accepted, escalated counts per month |
| **Top business functions with risks** | Up to eight BU names and their total risk counts |

### Incident stats

| Attribute | Business meaning |
| --------- | ---------------- |
| **Business function name** | IAM group name |
| **Total incidents** | Incidents from incidents/audits sources |
| **Resolved incidents** | Subset marked resolved |

### Inventory stats

| Attribute | Business meaning |
| --------- | ---------------- |
| **Amounts** | Asset record counts per category |
| **Areas** | Category labels (Hardware, Software, People, Premises, Information) |
| **Costs** | Summed cost/salary values per category |

### Supplier stats

| Attribute | Business meaning |
| --------- | ---------------- |
| **Procurement value** | Total supplier contract values |
| **Supplier compliance** | Compliant/non-compliant counts, percentage, risk level |
| **Supplier incidents** | Total, open, resolved supplier-sourced incidents |

### CIP stats

| Attribute | Business meaning |
| --------- | ---------------- |
| **Business unit name** | Group name |
| **Opportunities** | CIP records in the BU |
| **Improvements** | CIPs marked implemented |

### CRM stats

| Attribute | Business meaning |
| --------- | ---------------- |
| **Total / average contract value** | Aggregated customer contract values |
| **Highest / lowest contract value** | Customer name and value extremes |
| **Contract value by stage** | Value and count per sales stage |
| **Invoice stats by month** | Sent invoice count and total amount per calendar month (last 12 months) |

---

## 8. Current UI Layout

Stats has **no dedicated page**. All confirmed UI usage is **embedded in the Organisation Live Dashboard**.

### Entry point

- **Live Dashboard** (`/` or dashboard route) → when `canLoadOrgDashboardForUser()` is true → renders **`OrganizationalDashboardNew`**.
- **Business Function Dashboard** (`BusinessFunctionDashBoard`) is shown for users with an assigned business unit — **does not call Stats API** in the current frontend.

### Layout on Organisation Dashboard (Stats-driven panels)

| Dashboard section | Stats source | Presentation |
| ----------------- | ------------ | -------------- |
| Greeting / headline cards | Global stats | Staff count, remote staff, business units, compliance bodies, organisational confidence bar, organisational state, critical area, “accurate as” timestamp |
| Digital maturity panel | Digital maturity stats | Tab per business unit; progress bars per module utilisation percentage |
| Incident resolution | Global stats | P1–P4 average resolution times with alert indicators |
| Compliance | Compliance stats | Vertical bar chart per framework percentage |
| Audits — non-conformities | Audit stats | Non-conformities by business unit |
| Audits — progress | Audit stats | Total vs scheduled audits |
| Incidents | Incident stats | Per–business-function totals and resolved counts |
| Risk — by type | Risk stats | Line chart (monthly series by risk type) |
| Risk — by status | Risk stats | Status vs time chart |
| Risk — top business units | Risk stats | Bar chart of BU risk counts |
| Inventory | Inventory stats | Asset amount and expenditure charts |
| Suppliers | Supplier stats | Compliance, procurement value, incident boxes |
| Continual improvement | CIP stats | Opportunities vs improvements by BU |
| CRM | CRM stats | Contract value summaries, stage chart, monthly invoice charts |

### Loading states

- Each stat category has an independent loading flag (e.g. `isGlobalStatsLoading`, `isRiskStatsLoading`). Panels show **skeleton placeholders** while loading.

### Empty / fallback states

- Digital maturity: **“No data”** tab when no business units returned.
- Conformities box: falls back to **hard-coded default sample data** if stats prop is empty (legacy TODO comment in component — should not occur when API succeeds).
- Charts render with zero/empty arrays when stat objects are null after failed loads (errors logged to console; **no user-facing error banner** observed).

### Filtering controls

- **No date-range or month filter UI** on the dashboard for Stats. Backend query parameters exist but are unused by `statsService.js`.

### Staff display discrepancy

- Dashboard greeting also loads **staff lists from Users API** (`useUsers`) filtering verified internal users and `workPlace === "Remote"` — **parallel to** `globalStats.numberOfStaffs` / `numberOfStaffsRemote`. These may **differ** from Stats calculations (see Miscellaneous).

---

## 9. Miscellaneous / Module-Specific Information

### What Stats represents

Stats is the product’s **live organisation analytics layer**: on-demand summaries that turn operational module data into dashboard-ready metrics. It supports **situational awareness and prioritisation** for organisation leaders, not deep reporting, export, or historical benchmarking storage.

### Default date ranges

Most stat services call `getDefaultDateRange()`:

- If **no query parameters**: **`createdAt` from 1 January 2022 to 1 January 2027** (wide fixed window).
- **Risk stats** additionally passes `endDate: new Date()` when resolving range, so the effective upper bound is **today** for risks; the **`months`** query parameter (default 12) controls month bucket count but **does not narrow the start date** to a rolling 12-month window — start remains 2022 unless `startDate` is supplied.
- **CRM invoice stats** always use a **rolling last 12 months** independent of the global default.
- **Compliance stats** have date filtering **disabled** in code.

Frontend **never sends** `startDate`, `endDate`, or `months` — users always see backend defaults.

### Organisational confidence calculation

Five binary checks (each worth 20%): any assets exist; any risks in range; any audits in range; any **completed** audits in range; any **completed** management reviews in range. Result is 0–100%.

### Organisational state calculation

Based on percentage of risks that are **mitigated**: >80% Safe, >60% Secure, >40% Unsecure, >20% Vulnerable, else Hazardous. If **no risks**, state is **Safe**.

### Digital maturity scoring (1–4)

| Score | Meaning |
| ----- | ------- |
| 1 | Manual — no users in BU |
| 2 | Digital — users exist but no module data |
| 3 | Active — some utilisation (>0%, ≤80%) |
| 4 | Optimised — high utilisation (>80%) or audit/supplier-specific optimised rules |

Organisation-level maturity takes the **minimum (weakest) BU score** per module across all units.

### Access and permissions

- Stats routes mount **after** `authOrgAccess` — user must have authenticated **organisation session** with valid `organizationId` and organisation role.
- **No Stats-specific RBAC middleware** on individual endpoints.
- Business Function Dashboard users **without** org-dashboard eligibility **do not receive Stats data** in the UI today.

### Relationship: Stats vs Dashboard vs Charts

| Module | Role |
| ------ | ---- |
| **Stats** | Live aggregation API; powers Organisation Dashboard panels |
| **Dashboard** | Persisted dashboard documents, PDF reports, scheduled emails, Business Function Dashboard records |
| **Charts** | Stored chart definition registry; **not** the source of Live Dashboard metrics |

### Frontend / backend discrepancies

| Topic | Observation |
| ----- | ----------- |
| **Date filters** | Backend supports `startDate`/`endDate`/`months`; frontend never sends them |
| **Remote staff count** | Global stats filters `user.workLocationType` on user via membership lookup, but **work location is stored on membership**, not user — remote count may **always be zero**. Dashboard also computes remote staff from **`user.workPlace`** via Users API — **two different sources** |
| **Organisational digital maturity** | API returns `organisationalMaturity`; UI only uses `businessUnitMaturity` |
| **Inventory date scope** | `dateFilter` computed but **not applied** to asset queries |
| **Compliance date scope** | Date filter **commented out** |
| **Business Function Dashboard** | Does not use Stats API; uses Dashboard persisted records |
| **ConformitiesBox defaults** | Component still has placeholder default stats if API data missing |

### Behaviour that could not be confidently determined

- Whether any **external integrator** consumes Stats APIs outside the dashboard.
- Intended business use of the **2022–2027 default date window** vs a rolling period.
- Whether **`organisationalMaturity`** from digital-maturity stats was intended for a UI panel not yet wired.
