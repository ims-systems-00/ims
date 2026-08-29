# Dashboard

## 1. Module Overview

The **Dashboard** module — presented in the product as **Live Dashboard** — gives organisation users a consolidated view of operational health across iMS. It aggregates information from risk, incident, audit, compliance, supplier, inventory, continual improvement, CRM, task, and management review areas so leaders can see status, trends, and priorities without opening each module separately.

The module serves two distinct visibility contexts:

1. **Organisation Dashboard (Administrative Dashboard)** — organisation-wide visibility for users who operate at organisation level (typically Super Admin, Internal Auditor, External Auditor, or any user with a role but no assigned business unit).
2. **Business Function Dashboard** — visibility scoped to a single **business unit** (an IAM group configured as a business function in the product).

Dashboard data is primarily **pre-aggregated and stored** as organisation-level and business-unit-level dashboard records that are created when an organisation goes live or when a business unit is created. The organisation dashboard screen also loads **live calculated statistics** on each visit. Users with appropriate access can **email PDF dashboard reports** on demand, and organisations can receive **scheduled organisation-level PDF reports** via report subscribers configured in Organisation settings.

Primary users are organisation members with **Dashboard Read** permission: Super Admin, Head of Service, Basic User, Internal Auditor, and External Auditor roles as configured in navigation.

---

## 2. Features and Capabilities

### View Live Dashboard (organisation or business unit context)

- **Capability:** Open a single dashboard screen that shows greetings, summary indicators, charts, and module-specific panels for the user’s visibility scope.
- **Who uses it:** Users with **Dashboard Read** permission (Super, HOS, Basic, Auditor roles in navigation).
- **Outcome:** User sees an at-a-glance operational picture for either the whole organisation or their assigned business unit.
- **Conditions:** Dashboard records are only returned when the organisation’s current **system reporting period** is active (`systemDate.end` is not in the past). If no valid dashboard exists, the user receives a not-found outcome. The UI automatically chooses organisation vs business unit view based on user session (see Miscellaneous).

### View Organisation Dashboard (Administrative Dashboard)

- **Capability:** See organisation-wide counts, confidence, critical risk area, organisational state, digital maturity by business unit, compliance and audit summaries, incident and risk analytics, inventory and supplier metrics, continual improvement (OFI/CIP) summaries, CRM and invoice trends, and an embedded to-do list.
- **Who uses it:** Users who qualify for the organisation dashboard (global-access roles, or users with an organisation role but no assigned business unit).
- **Outcome:** Organisation-level decision support across modules in one scrollable layout.
- **Conditions:** Most panels load from **live Stats** calculations on page entry; a persisted organisation dashboard record is also fetched but is **not rendered** by the current organisation dashboard UI (see Miscellaneous).

### View Business Function Dashboard

- **Capability:** See business-unit-scoped greetings, carousel summaries (confidence, staff, remote staff), critical area, organisational state, digital maturity radar, and module panels for compliance, incidents, audits, risks, inventory, suppliers, CIP, CRM, tasks, and management review — where the user has permission for each module.
- **Who uses it:** Users assigned to a business unit (typically Head of Service and Basic User with a `groupId`).
- **Outcome:** Business unit leaders see operational health for their unit only.
- **Conditions:** Data comes from the persisted **group dashboard** record for the user’s business unit. Module panels are hidden when the user lacks the corresponding module read permission.

### Compare digital maturity across business units

- **Capability:** From the digital maturity panel, Super Admin users can open a modal listing all business units’ digital maturity matrices (radar chart and status table per unit), with pagination (“View more”).
- **Who uses it:** Super Admin only (`View All Business Units` link).
- **Outcome:** Side-by-side comparison of how digitally mature each business unit is across risk, incident, supplier, document, CIP, audit, and inventory areas.
- **Conditions:** Requires **Dashboard Read**. List is role-filtered on the backend (Super/auditor roles see all units; HOS/Basic see own unit and organisation-level records; External User sees own unit only).

### Send dashboard report by email (manual)

- **Capability:** From the top navigation **Quick Actions → Send Report**, enter recipient name, email, and optional message to queue a dashboard PDF report.
- **Who uses it:** Users with **Dashboard Read** permission who can open the Send Report action.
- **Outcome:** Success message *“Your report has been sent to {name}, {email}”*; recipient receives an email with PDF attachment asynchronously.
- **Conditions:** Users with **global access** (Super Admin, Internal Auditor, External Auditor) trigger an **organisation dashboard report**. All other eligible users trigger a **business function dashboard report** for their assigned business unit. Failure shows *“Your email could not be sent”*.

### Receive scheduled organisation dashboard reports

- **Capability:** Organisation **report subscribers** (configured in Organisation settings) automatically receive organisation dashboard PDF reports on their scheduled `nextDate`.
- **Who uses it:** Named subscribers on live customer organisations.
- **Outcome:** Email with PDF dashboard report; subscriber’s next send date advances by one month after a successful scheduled send.
- **Conditions:** Nightly scheduled job; organisation-level only (not per business unit). Includes organisational KPI objectives.

### Act on tasks from the dashboard

- **Capability:** View, open, create, edit, complete, and delete tasks from dashboard sidebars / to-do sections without leaving the dashboard.
- **Who uses it:** Users with **Task Manager Read** permission.
- **Outcome:** Task drawers open on the dashboard; links navigate to the full Tasks module.
- **Conditions:** To-do lists show incomplete tasks; empty state *“No data available”* on organisation dashboard when no tasks exist.

### Navigate to underlying modules from dashboard panels

- **Capability:** Follow module links from dashboard cards (for example to Risks, Incidents, Audits, Compliance toolkits, Inventory, CIP, Tasks, Business Units).
- **Who uses it:** Any dashboard viewer where the linked module panel is visible.
- **Outcome:** User jumps from summary insight to detailed module work.

---

## 3. User Outcomes / End Results

- **Create:** Create tasks from dashboard drawers (organisation dashboard to-do section and business function dashboard sidebar).
- **View:** See organisation-wide or business-unit operational summaries, digital maturity, compliance percentages, audit progress, risk trends, incident resolution times, supplier and inventory metrics, CIP/OFI summaries, CRM customer and invoice charts, management review dates, and staff counts.
- **Manage:** Complete or delete tasks from dashboard task panels; Super Admin can browse all business units’ digital maturity in a comparison modal.
- **Change:** Task status can be changed (complete/delete) from dashboard panels; dashboard metrics themselves are read-only aggregates.
- **Information received:** Greeting with user name; “Accurate as of” timestamp on organisation dashboard (from live stats); critical area label; organisational state; confidence percentage; module-specific charts and counts; PDF reports via email (manual or scheduled).
- **Business actions enabled:** Prioritise attention (critical area, overdue resolution alerts); compare business unit maturity; share operational snapshot with stakeholders via PDF; jump into corrective work in linked modules; handle immediate tasks from the dashboard.

---

## 4. Scope Boundaries

### In scope

- Live Dashboard navigation entry and single dashboard page (`/admin/dashboard`).
- Organisation Dashboard and Business Function Dashboard presentation logic.
- Persisted organisation and group dashboard snapshot records.
- Live Stats-driven panels on the organisation dashboard.
- Manual PDF report generation and email delivery (organisation and business unit variants).
- Scheduled organisation PDF reports to report subscribers.
- Digital maturity comparison modal across business units.
- Task quick actions embedded in the dashboard layout.
- Permission-gated visibility of module-specific dashboard panels.

### Out of scope (handled elsewhere)

- **Source module operations** — creating/editing risks, incidents, audits, suppliers, customers, etc. Dashboard only displays aggregates and links outward.
- **Stats module administration** — the Stats API is a separate backend concern; Dashboard consumes its output on the organisation screen.
- **Organisation profile and report subscriber configuration** — handled by the Organisation module (system dates, subscriber list, intervals).
- **KPI Objective definition** — handled by Management Review; objectives are **included in PDF reports** but not managed on the dashboard UI.
- **CQC register management** — handled by CQC module; CQC aggregates appear in persisted dashboard data and organisation PDF reports but **not** on the current Live Dashboard UI.
- **Legacy organisation dashboard UI** — superseded by the new organisation dashboard layout (old component exists but is not active).

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **Organisation** | Owns system reporting dates that gate dashboard availability; provides report subscribers for scheduled PDF delivery; organisation name/branding appears in reports. |
| **Users / IAM Groups (Business Units)** | Business Function Dashboard is scoped to an IAM group (business unit). Staff and remote staff counts derive from memberships and user profiles. Group creation triggers group dashboard initialisation. |
| **Risk Management** | Supplies risk counts by type and status, trends over time, critical area, organisational state calculation, and business units with most risks. |
| **Incident Management** | Supplies total/resolved incidents, resolution time by priority (P1–P4) with alert flags when targets are exceeded. |
| **Audit** | Supplies completed vs incomplete audits, non-conformities by business unit, audit progress summaries. |
| **Compliance** | Supplies conformity percentages across ISO/ESG compliance toolkits (multiple standards). |
| **Continual Improvement (OFI / CIP)** | Supplies improvements and opportunities counts by business unit and status trends. |
| **Inventory / Assets** | Supplies asset expenditure amounts and costs by area. |
| **Supplier Management** | Supplies supplier compliance percentage, procurement/contract value, and supplier-linked incident counts. |
| **CRM / Customers / Invoices** | Supplies customer stage counts, contract values, campaign counts, interaction summaries, and monthly invoice count/amount charts on the organisation dashboard. |
| **Task Management** | Embedded to-do lists on both dashboard contexts; links to full task module. |
| **Management Review** | Last and next management review dates on business function dashboard; organisational and group-scoped KPI objectives appended to PDF reports. |
| **CQC** | Site compliance ratings and register summaries (significant events, whistleblows, complaints, safeguarding) stored on organisation dashboard snapshot and included in organisation PDF report — **not shown on current dashboard UI**. |
| **Document Management** | Contributes to digital maturity matrix scoring only. |

---

## 6. Current Data Model

The Dashboard module does **not** own transactional business records. It maintains **snapshot records** that cache aggregated metrics, plus consumes **live Stats** on the organisation screen.

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| **Organisation Dashboard** (`dashboards`, reference `DB-{ID}`) | One persisted snapshot per organisation holding pre-aggregated cross-module metrics for the active system reporting period. | Returned by Administrative Dashboard operations; used for PDF reports and scheduled subscriber emails; fetched on organisation dashboard load but not displayed by the current UI. |
| **Business Function Dashboard** (`groupdashboards`, reference `GDB-{ID}`) | One persisted snapshot per business unit (IAM group) holding the same categories of metrics scoped to that unit. | Powers the Business Function Dashboard UI and business-unit PDF reports. |
| **System reporting period** (`systemDate.start` / `systemDate.end` on dashboard records) | The organisation’s configured reporting window; dashboards are only available while the end date has not passed. | Gates whether dashboard data can be loaded or reported. |
| **Digital Maturity Matrix** (embedded on both dashboard record types) | Seven-area maturity scorecard: risk management, incident management, supplier management, document management, CIP, audits, inventory — each with label, point (1–4 maturity stage), and percentage. | Displayed as radar charts; compared across units in Super Admin modal. |
| **Live Stats responses** (not persisted as dashboard records) | On-demand calculated aggregates from underlying modules for organisation dashboard panels. | Primary data source for the current Organisation Dashboard UI. |
| **KPI Objectives** (Management Review module) | Organisational or business-unit KPI target values. | Attached at report generation time to PDF payloads, not stored on dashboard records. |

Dashboard records are **created automatically**: organisation dashboard when the organisation goes live; group dashboard when a business unit is created (copies the organisation’s current system dates).

**Current behavior could not be fully determined:** The repository references background jobs (`updateDashBoardState`, `updateBusinessFunctionDashboards`, invoked via `tickDashboard.js`) that refresh persisted dashboard snapshots, but those schedule implementation files are **not present in the workspace**. Refresh cadence and exact aggregation triggers for persisted snapshots therefore cannot be confirmed from available code.

---

## 7. Attributes

### Organisation Dashboard / Business Function Dashboard (persisted snapshot)

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Reference (`DB-` / `GDB-`) | Human-readable dashboard identifier | Auto-generated |
| Business functions count | Number of business units in the organisation | Organisation dashboard only |
| Compliance functions count | Number of compliance bodies | Organisation dashboard only |
| Number of staff | Verified internal staff count | BU dashboard uses unit-scoped count |
| Staff remote | Remote internal staff count | |
| Premises | Premises linked to scope | |
| Organisational confidence | Percentage score reflecting use of key modules (assets, risks, audits, management reviews) | 0–100 |
| Organisational state | Risk posture label (Safe, Secure, Unsecure, Vulnerable, Hazardous) | Derived from risk mitigation percentage |
| Critical area | Risk category with highest volume (Hardware, Software, People, Premises, Organisation, Clinical) | |
| Last / next management review date | Scheduled management review cycle | |
| Risk over the year | Monthly risk counts by risk type | Trend charts |
| Risks by status | Monthly open / mitigated / accepted / escalated counts | |
| Risks overview | Current-period risk totals and monthly open/mitigated/escalated/accepted counts | Business function dashboard |
| Business functions having most risks | Ranking of units by risk volume | Organisation dashboard |
| Finance / inventory | Costs and amounts by area | |
| Non-conformities | Counts by business unit | From audits |
| Audits | Completed vs incomplete counts; findings by area on BU dashboard | |
| Incidents | Total, resolved, average resolution times P1–P4 with alert flags | Alerts when resolution exceeds organisation targets |
| Incidents by status | Monthly open / resolved / escalated trends | BU dashboard |
| Improvements / opportunities by status | CIP/OFI trend data | BU dashboard |
| Supplier compliance | Compliant vs non-compliant counts and percentage | |
| Supplier incidents | Open vs resolved supplier-related incidents | |
| Supplier contract value | Total procurement value | |
| Compliance | Percentage completion per ISO/ESG toolkit | Multiple standard keys |
| CQC | Site ratings; register totals (significant events, whistleblows, complaints, safeguarding) by business unit | In persisted data and org PDF; not on Live Dashboard UI |
| CRM | Customer stages, contract values, campaigns, interactions, invoice summaries | Organisation dashboard snapshot |
| Digital maturity matrix | Seven module maturity scores | Radar visualisation |
| System date | Active reporting period | Required for dashboard to exist |
| Group / group name | Linked business unit | Business function dashboard only |

### Organisation Dashboard live stats (Stats API, on page load)

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Accurate as | Timestamp when live stats were calculated | Shown in greeting area |
| Business unit | Count of business units | |
| Compliance bodies | Count of compliance-unit groups | |
| Number of staff / remote staff | Live membership counts | |
| Organisational confidence | Live recalculated confidence | May differ from persisted snapshot |
| Organisational state | Live recalculated state | |
| Critical area | Live highest-risk category | |
| Incident resolution times | P1–P4 average times with alert flags | Compared to organisation incident targets |
| Module-specific stats objects | Compliance, audit, risk, incident, inventory, supplier, CIP, CRM breakdowns | Each feeds a dedicated UI panel |

### Dashboard PDF report (manual or scheduled)

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Recipient name / email | Report destination | Manual send via modal |
| Message | Optional cover note | Manual send only |
| Organisation name | Report header context | |
| KPI objectives | List of KPI target values | Organisational objectives for org report; group-scoped for BU report |
| Full dashboard snapshot fields | All persisted metrics rendered in PDF template | Async generation |

---

## 8. Current UI Layout

### Main screens / pages

- **Live Dashboard** — single route `/admin/dashboard` in main sidebar (icon: squares grid). Label: *Live Dashboard*.
- Root component switches between **Organisation Dashboard (new layout)** and **Business Function Dashboard** automatically; users do not manually pick which dashboard type to open.

### Organisation Dashboard (current UI — `OrganizationalDashboardNew`)

**Greeting row (8 + 2 + 2 columns)**

- Personalised greeting with user name.
- *Accurate as of {date/time}* from live global stats.
- **Critical area** (red indicator) and **Organisational State** (amber indicator).
- Cards: **Business Unit** count, **Staff** count with avatar strip.

**Digital maturity (8 columns)**

- Tabbed navigation across business units from live digital maturity stats.
- Each tab shows per-module maturity bars.
- Circular progress indicator in header (**Observed but business purpose unclear** — displays static `14/28` styling in markup rather than clearly bound live score).

**Summary cards (4 columns)**

- **Compliance Bodies** count.
- **Remote Staff** count with avatar strip.
- **Organisation Level** confidence progress bar.

**To-do list (8 columns) + Average Resolution Time (4 columns)**

- Task list with create (+), link to Tasks module, view details drawer, edit, delete, complete actions.
- Empty state: icon + *“No data available”*.
- Resolution time cards for P1–P4 with red/green alert styling.

**Module analytics rows (full width, skeleton loading while fetching)**

- **Non-conformities** (audit stats).
- **Conformities** (compliance stats).
- **Incident management** chart panel.
- **Audit progress** panel.
- **Risk management** by type.
- **Status vs risk** chart.
- **Assets expenditure amount** and **cost** (inventory stats).
- **Business units with the most risks** bar chart.
- **Supplier management**, **procurement value**, **supplier incidents**.
- **Continual improvement** (CIP stats).
- **CRM** customer chart and **Number of Customers** vertical chart.
- **Invoice** count and amount charts (from CRM stats).

Loading: skeleton placeholders per section while stats load. No dedicated full-page error state observed for stats failures (failed loads leave sections empty or stale).

**Not rendered on organisation dashboard UI despite being fetched**

- Persisted organisation dashboard record (`loadDashboardData`) — loaded on mount but unused by this layout.
- CQC overview API call — present in store but **commented out**.

### Business Function Dashboard

**Loading state**

- Centred spinner with *“Analysing your data...”* while group dashboard loads.

**Main layout (9-column scroll + 3-column sidebar)**

- **Greetings** — time-based greeting with user name and dashboard summary data.
- **Carousel** — Organisational confidence %, Business Unit link (to `/admin/groups`), Staff count with avatars, Remote Staff count.
- **Critical area** and **Organisational state** cards.
- **Digital maturity** radar with score `X/28`; Super Admin sees *View All Business Units* → modal with paginated `IndividualMatrix` per unit.
- **Compliance management** — toolkit percentage links (permission + compliance licence gated).
- **Average resolution time** and **Incident management** (Incident Management Read).
- **Audit inspection** (Audit Read).
- **Risk management** with tabbed risk-type charts (Risk Management Read).
- **Inventory management** (Inventory Read).
- **Supplier management** (Supplier Management Read).
- **CIP management** (Continual Improvement Plan Read).
- **CRM management** (CRM Read).

**Sidebar (quick access)**

- **To-do list** — up to five tasks with create, detail drawer, edit, delete, complete; link to Tasks.
- **Management review** — last/next review dates (Management Review Read).

Module panels not permitted for the user’s role are **omitted entirely** (not shown as disabled).

### Primary actions

- **Quick Actions → Send Report** (top navbar) — opens *Send dashboard report* modal (name, email, message, Send).
- **Quick Actions → Send Report** in alternate navbar variant (`QuickActions.jsx`) — button is **disabled** in that component; active path is `AdminNavbar.jsx`.
- **Create / view / complete / delete task** from dashboard drawers.
- **View All Business Units** (Super Admin, digital maturity modal).
- **View more** pagination in digital maturity modal.
- Module **links** on panel headers (risks, incidents, CIP, inventory, compliance toolkits, tasks, business units).

### Forms

- **Send dashboard report** modal — Name (required), Email (required), Message (optional textarea).

### Lists / tables / cards / detail views

- Summary **cards** and **carousels** for headline metrics.
- **Radar charts** for digital maturity.
- **Line / bar / vertical charts** for risks, incidents, audits, CRM, invoices, etc.
- **To-do list** rows with popover detail tables (reference, title, owner, date).
- **IndividualMatrix** table — Title, Status (Manual / Digital / Active / Optimised), Progress % per maturity area.

### Navigation and workflow

1. User opens **Live Dashboard** from sidebar (requires Dashboard Read).
2. Application selects organisation vs business function layout from session (see Miscellaneous).
3. Data loads (stats APIs for organisation; persisted group dashboard for business unit).
4. User reviews panels, optionally opens module links or task drawers.
5. User may send PDF report via navbar Quick Actions (Dashboard Read required).
6. Super Admin may open cross-unit digital maturity modal from business function or organisation digital maturity areas.

### Material empty, loading, or restricted states

- **Loading:** Skeletons (organisation dashboard); spinner *“Analysing your data...”* (business function dashboard); modal loading for digital maturity list.
- **Empty tasks:** *“No data available”* with icon (organisation); sidebar simply omits completed tasks (business function).
- **Restricted:** Sidebar entry hidden without Dashboard Read. Individual module panels hidden without respective module permissions. Digital maturity comparison modal link visible to Super Admin only.
- **Dashboard not found:** Backend returns not found when system reporting period has ended — **Current behavior could not be fully determined** for corresponding frontend messaging on the new organisation dashboard (stats may still load independently of persisted dashboard availability).

---

## 9. Miscellaneous / Module-Specific Information

### Terminology

| Term in product | Meaning in this codebase |
| ----------------- | ------------------------ |
| **Live Dashboard** | User-facing name for the Dashboard module screen. |
| **Administrative / Organisation Dashboard** | Organisation-wide dashboard context (not “system administrator” in the IT sense — it means organisation-level visibility). |
| **Business Function** | An IAM **group** configured as a business unit (`INTERNAL_BU` / external unit types). Each business unit has its own **Business Function Dashboard** record. |
| **Business Unit** | Used interchangeably with Business Function in UI labels (carousel, charts, digital maturity tabs). |

### Which dashboard a user sees

The application chooses the dashboard context on load:

- **Organisation Dashboard** if the user has **global access** (Super Admin, Internal Auditor, External Auditor), **or** has an organisation role but **no** `groupId` (organisation-level user not tied to one business unit).
- **Business Function Dashboard** otherwise (user has an assigned business unit).

Both contexts require **Dashboard Read** to reach the route.

### Data freshness — important dual behaviour

| Context | Primary UI data source | When loaded |
| -------- | ---------------------- | ----------- |
| Organisation Dashboard (current UI) | Live **Stats API** (global, digital maturity, compliance, audit, risk, incident, inventory, supplier, CIP, CRM) | On page entry (parallel requests) |
| Organisation Dashboard (persisted record) | Organisation dashboard snapshot | Fetched on page entry but **not displayed** by current UI |
| Business Function Dashboard | Group dashboard snapshot | On page entry |
| PDF reports (manual & scheduled) | Persisted dashboard snapshot + KPI objectives | At queue time |

There is **no manual refresh control** on the dashboard. Organisation dashboard greeting shows *Accurate as of* from live stats (`accurateAs` = time of calculation). Persisted snapshot age depends on background refresh jobs — **implementation files not found in workspace**; refresh schedule cannot be confirmed.

### Report generation workflow (user perspective)

1. User opens **Quick Actions → Send Report** (or receives scheduled subscriber email).
2. User enters recipient details (manual only) and submits.
3. Application immediately confirms success.
4. Backend queues PDF generation and email delivery asynchronously.
5. Recipient receives email using template *send-dashboard-report* with PDF attachment (`ims-dashboard-report-{uuid}.pdf`).
6. Organisation report uses template `dashboardReport`; business unit report uses `buDashboardReport`.

Scheduled sends run at **midnight daily**, matching subscribers whose `nextDate` equals today; only **organisation** dashboard content is used.

### Access and visibility rules

| Rule | Behaviour |
| ---- | --------- |
| Dashboard Read (`IMS_SERVICES.DASHBOARD`, READ) | Required for route, API, and Send Report modal |
| Global access | Organisation dashboard UI; manual org PDF report |
| Assigned business unit | Business function dashboard UI; manual BU PDF report |
| Module permissions | Individual dashboard panels (incidents, risks, etc.) shown only with that module’s READ permission |
| Compliance licence / auth | Compliance panel additionally requires compliance toolkit authorisation |
| Role-based group filter (list all BU dashboards) | Super/auditors: all units; HOS/Basic: own unit (+ null group); External User: own unit only |
| System reporting period | Persisted dashboard APIs return not found if `systemDate.end` is past |

### Frontend / backend discrepancies

| Topic | Discrepancy |
| ----- | ----------- |
| Organisation UI data source | UI renders **live Stats**; persisted organisation dashboard is still fetched and used for PDFs — users may see different numbers between screen and emailed report if snapshots are stale. |
| CQC | Aggregated in persisted dashboard and organisation PDF; **not displayed** on Live Dashboard UI; BU CQC fetch is commented out. |
| Send Report entry points | Enabled in `AdminNavbar`; disabled in `QuickActions` component. |
| Legacy vs new org dashboard | `OrganizationalDashboard` (persisted-data UI) replaced by `OrganizationalDashboardNew` (stats-driven); old component not mounted. |
| Digital maturity header score | Organisation dashboard shows hard-coded circle progress (`14/28`) in markup — may not reflect live data. |
| Dummy data constants | `OrganizationalDashboardNew` defines `dummyDataSet` / `businessUnitDummyData` but **does not use them** in render (development leftovers). |
| Global access enforcement on org dashboard API | Commented legacy controller code required global access; **current API only enforces Dashboard Read + organisation scoping** — broader than legacy comment suggests. |

### Unclear or unconfirmed behaviour

- **Persisted dashboard refresh schedule and aggregation logic** — referenced by `tickDashboard.js` but schedule source files missing from repository.
- **Frontend handling when persisted dashboard is not found but stats succeed** — organisation UI may partially render from stats even if organisation dashboard record is expired.
- **Whether business function dashboard list endpoint filters by active system date** — pagination query does not explicitly match `systemDate.end` in service layer (unlike single-dashboard fetch).
- **Exact PDF content for business unit vs organisation reports** — confirmed separate templates; full section parity not verified line-by-line.

### Business rules

- One organisation dashboard record per organisation; one group dashboard per business unit.
- Dashboard unavailable outside active system reporting period (persisted record queries).
- Manual report recipient email is normalised to lowercase before queueing.
- KPI objectives: privacy **Organisational** for org reports; filtered by **group** for business unit reports.
