# CC (Carbo Calc)

## 1. Module Overview

**CC (Carbo Calc)** is a dedicated **greenhouse gas (GHG) / carbon emissions calculator** for an organisation. It enables users to configure how carbon is reported, enter operational activity data by GHG Protocol–style **Scope 1, 2, and 3** categories, automatically convert that activity into **tonnes of CO₂e** (and related gas and energy metrics) using **DEFRA emission factors** and optional **organisation-specific custom factors**, then review results on a dashboard and in structured reports (including SECR and ISO 14064–oriented outputs).

Carbo Calc solves the business problem of **measuring, explaining, and tracking organisational carbon footprint** from day-to-day activity (fuel, electricity, travel, waste, purchased goods, and similar sources), rather than relying on spreadsheets alone. It also supports **carbon reduction initiatives** planned and completed by reporting year, and **net zero target** settings used in the reporting context.

Primary users are **organisation members** who authenticate into the dedicated Carbo Calc application (`cc-frontend-master`), select their organisation, and manage that organisation’s carbon configuration, activity data, reports, and reduction plan. The product is presented as a **white-labelled carbon calculator** (brands such as CarboCalc / Go2ero appear in the frontend). Access is organisation-scoped; fine-grained role differences inside Carbo Calc itself were **not clearly confirmed** beyond organisation membership and authentication ([Requires verification]).

---

## 2. Features and Capabilities

### Authenticate and enter an organisation context

- **Capability:** Sign in, complete preparation, and select an organisation membership so all Carbo Calc data is read and written for that organisation.
- **Who uses it:** Organisation users of the dedicated Carbo Calc application.
- **Outcome:** Session is tied to a user and organisation; subsequent carbon data and reports are organisation-specific.
- **Conditions:** Organisation selection uses the user’s memberships. Without a selected organisation, carbon workflows cannot proceed meaningfully.

### Configure organisation company information

- **Capability:** Maintain company profile details used in the carbon product context (for example company name and company number).
- **Who uses it:** Organisation users via **Our Organisation**.
- **Outcome:** Organisation identity shown on the dashboard and available for reporting context.
- **Conditions:** Uses shared organisation information services; not a CC-only data store. Exact field set shown in UI is company-focused (some address/contact fields exist in forms but are partially commented out).

### Initialise report parameters (get started)

- **Capability:** Create the organisation’s Carbo Calc **parameter** record that drives reporting periods, boundaries, and automated calculation/reporting behaviour.
- **Who uses it:** Users who open Report Settings areas before parameters exist.
- **Outcome:** Parameters are created; users can then configure overview, periods, locations, and enter activity data.
- **Conditions:** Screens that require parameters redirect to **Get Started** until a parameter record exists.

### Configure reporting overview (report settings)

- **Capability:** Set reporting start date, base year, primary reporting method (market-based / location-based), organisational boundary (operational control / financial control / equity share), and net zero target year plus carbon reduction ambition percentage.
- **Who uses it:** Organisation users under **Report Settings → Overview**.
- **Outcome:** The organisation’s reporting calendar, comparison baseline, electricity accounting method, organisational boundary approach, and net zero ambition are established for calculations and reports.
- **Conditions:** Reporting period is explained in UI as **365 days from the reporting start date**. Changing the start date also drives derived system values (reporting months order and which DEFRA factor database year offset applies).

### Maintain reporting periods (turnover and employees)

- **Capability:** View each reporting year with its period dates and emission-factor database year, and enter **annual turnover** and **average number of employees**.
- **Who uses it:** Organisation users under **Report Settings → Reporting Periods**.
- **Outcome:** Intensity-style reporting and year-based comparisons have the organisational scale inputs they need (turnover / headcount).
- **Conditions:** Period list is derived from parameters; turnover and employee count are user-editable per year.

### Manage organisational locations

- **Capability:** Create and maintain physical/operational locations with address details, activity description, GHG inclusion assessment, and comments; assign locations to activity calculations where applicable.
- **Who uses it:** Organisation users under **Report Settings → Locations**, and users selecting a location when entering activity data.
- **Outcome:** Locations receive a business reference (`LOC-{number}`); map address can be geocoded into coordinates; locations can be linked to emission records.
- **Conditions:** GHG inclusion assessment is required. Soft-delete / restore exist on the backend; frontend primarily supports create/update/list flows as implemented in the locations UI.

### Set emission category relevance (reporting boundaries)

- **Capability:** For each Scope 1 / 2 / 3 emission category, set relevance: **Relevant, Calculated**, **Relevant, Not calculated**, or **Not relevant**.
- **Who uses it:** Organisation users from **Add Data** (category tiles) and the related boundaries UI reused for report settings.
- **Outcome:** Categories marked not relevant are de-emphasised or blocked for data entry navigation; relevant categories guide what the organisation intends to calculate.
- **Conditions:** Default boundaries are created for all standard categories when parameters are initialised. Only categories marked for calculation are the normal entry path into activity data screens.

### Enter and manage activity calculations (Add Data)

- **Capability:** For a selected emission category, create, list, edit inline, and delete **activity calculation** records for a reporting year/month, with method, activity, unit, amount, data-quality grade, optional supplier/meter/invoice references, optional custom factor, and optional location.
- **Who uses it:** Organisation users via sidebar **Add Data** → category → **Carbon Emissions**.
- **Outcome:** Each record receives a reference (`EM-{number}`). On save, the system **automatically calculates** GHG results (notably **CO₂e**) and related derived fields from DEFRA and/or custom factors. Users see calculated emissions in the category table and detail views.
- **Conditions:**
  - Calculation method and required fields vary by category (fuel-based, distance-based, spend-based, average-data, market-based, location-based, supplier-specific, custom, and related variants).
  - Amount and activity data grade are required inputs.
  - Soft-delete and restore exist on the backend; the dedicated frontend delete path observed uses **hard delete**.

### Manage custom emission factors

- **Capability:** Create and maintain organisation-specific emission factors (activity reference, unit of measure, conversion factor, source notes, electricity generation mix fields where relevant, grade, and related factor attributes) per category.
- **Who uses it:** Organisation users under a category’s **Custom Factors** tab.
- **Outcome:** Custom factors receive a reference (`CF-{number}`) and can be selected when entering calculations that use custom / market-based / supplier-specific methods.
- **Conditions:** Factor lookup fields are normalised for consistent matching. Custom factors are organisation-scoped.

### Import activity data in bulk (category import)

- **Capability:** Import multiple activity rows for a category via an editable import table within the category workspace.
- **Who uses it:** Organisation users under a category’s **Import Data** tab.
- **Outcome:** Users can enter many calculation rows without creating them one-by-one through the single-record form.
- **Conditions:** Tied to the selected category. Exact validation and error messaging for failed rows are **implementation-dependent** ([Requires verification] for full edge-case behaviour).

### Browse DEFRA emission factors (factor library)

- **Capability:** List standard DEFRA (and related) emission factors used by the calculator.
- **Who uses it:** Indirectly by all calculation flows; list capability is exposed by the backend for factor selection / lookup. Frontend selects activities/units/methods using factor-backed options.
- **Outcome:** Activity amounts are converted using the appropriate factor year, scope, activity reference, and unit.
- **Conditions:** Users do not typically “manage” the global DEFRA library; it is a read-only reference for calculations. Organisation custom factors supplement it.

### View carbon dashboard overview

- **Capability:** View organisation carbon overview for a selected reporting year: total emissions, Scope 1 / 2 / 3 totals, comparison versus base year, top categories and activities, and breakdown charts.
- **Who uses it:** Organisation users via **Dashboard**.
- **Outcome:** Immediate visibility of footprint size, scope mix, hotspots, and whether emissions rose or fell versus the base year.
- **Conditions:** Requires calculated activity data and parameters. Empty state: *“There is no data at the minute.”* Loading indicator while report data is fetched.

### Generate and view carbon reports

- **Capability:** Open a reports catalogue and run structured reports:
  - **Results – Single Year** (Included)
  - **Results – Base Year Compare** (Included)
  - **Historic Trends Report** (Included)
  - **14064 GHG Statement** (Premium)
  - **14064 Full Report** (Premium)
  - **SECR Report** (Premium)
  - **Science Based Targets Report** (UI shows **Coming Soon**; not an active report)
- **Who uses it:** Organisation users via **Reports**.
- **Outcome:** Aggregated GHG results, comparisons, statements, and compliance-oriented outputs based on stored calculations and parameters. Full report content can include activity summaries and narrative sections suitable for ISO 14064–style disclosure. SECR report draws on SECR-related derived energy/inclusion flags on calculations.
- **Conditions:** Premium vs Included is a product badge in the UI; entitlement enforcement beyond the badge was **not fully confirmed** ([Requires verification]). Backend also supports **scope one and two** and **activity summary** report operations used inside reporting flows; there is **no standalone “Scope 1 & 2” tile** on the Reports home screen.

### Manage carbon reduction initiatives (Reduction Plan)

- **Capability:** For each reporting year, manage **complete** and **planned** initiatives with title, description, priority, dates, co-benefits, unintended consequences, attachments, and assigned users.
- **Who uses it:** Organisation users via **Reduction Plan**.
- **Outcome:** Initiatives receive a reference (`RPI-{number}`). Status becomes **implemented** when an implemented date is set, otherwise **pending**. Supports year-structured reduction planning for reporting.
- **Conditions:** UI presents initiatives as complete vs planned by year. Attachments and assigned users have dedicated add/remove actions.

### Follow guidelines / overview documentation

- **Capability:** Access guidelines and overview documentation pages under Report Settings.
- **Who uses it:** Organisation users configuring or learning the reporting setup.
- **Outcome:** In-product guidance for carbon reporting configuration.
- **Conditions:** Content is presentational documentation in the dedicated frontend.

### Advanced tracking (placeholder)

- **Capability:** Route exists for advanced tracking under parameters.
- **Who uses it:** N/A for productive use today.
- **Outcome:** UI shows a **Coming Soon** state.
- **Conditions:** Not an active business capability yet.

---

## 3. User Outcomes / End Results

- **Create:** Report parameters; locations; custom factors; activity calculations; reduction initiatives; attachments and assignee links on initiatives.
- **View:** Dashboard carbon overview; category activity lists and calculated emissions; reporting periods; category relevance; reports (single year, base-year compare, historic trends, GHG statement, full ISO 14064-style report, SECR); DEFRA-backed activity/unit options; guidelines.
- **Manage:** Organisation company information (shared); reporting overview and net zero targets; category relevance; custom factors; initiative ownership/attachments; bulk import of activity rows.
- **Change:** Update parameters, locations, calculations (including inline edits), custom factors, reporting-year turnover/employees, initiative details and status (via implemented date).
- **Information received:**
  - System-derived **GHG emissions** (notably total CO₂e in tonnes, plus other gas-specific and well-to-tank / T&D related values where applicable).
  - Emission factor metadata (source, notes, kg CO₂e per unit, factor database year).
  - Data-quality scores/grades derived from activity and factor quality.
  - SECR-oriented energy and inclusion flags used in SECR reporting.
  - Aggregated scope, category, and activity summaries on dashboard and reports.
  - Auto-generated business references (`EM-`, `LOC-`, `CF-`, `RPI-`).
- **Business actions enabled:** Measure organisational carbon footprint; set reporting boundaries and methods; monitor progress versus base year and net zero ambition; produce disclosure-oriented reports; plan and track carbon reduction initiatives.

---

## 4. Scope Boundaries

### In scope

- Organisation-scoped GHG / carbon calculation configuration (parameters, periods, boundaries, locations).
- Activity data entry, custom factors, DEFRA factor usage, automatic emission derivation.
- Carbon dashboard and CC report suite (including SECR / ISO 14064–oriented reports as implemented).
- Carbon reduction initiatives.
- Dedicated Carbo Calc application experience (authentication into this app, organisation selection, white-label branding).

### Out of scope (handled elsewhere)

- Core **user account administration**, invitations, and IMS-wide IAM — handled by Authentication / Membership / User Management (Carbo Calc consumes login and membership for org access).
- General **organisation master data** beyond the company fields edited in Carbo Calc — handled by Organisation services shared with the wider platform.
- Generic **file storage** for initiative attachments — uses shared file/attachment handling.
- Broader IMS modules (incidents, compliance, leaves, assets, etc.) — not part of Carbo Calc’s product surface.
- Science-based targets reporting — UI placeholder only (**Coming Soon**).
- Advanced tracking — **Coming Soon**.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| Authentication (v3 / session) | Users must authenticate to use Carbo Calc; access tokens accompany API calls. |
| Membership | Users select an organisation membership; carbon data is scoped to that organisation. |
| Organisation | Company name and related organisation fields are maintained and shown in Carbo Calc (dashboard title, reports context). |
| File / Attachment handling | Reduction initiatives can store supporting attachments. |
| Users | Initiatives can assign organisation users; profile screens show membership details. |
| Support (in-app) | Dedicated frontend includes a Support navigation destination for user assistance (outside core carbon calculation). |

---

## 6. Current Data Model

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| **Parameter (Report Settings)** | Organisation-level carbon reporting configuration | Defines reporting calendar, methods, boundaries, net zero targets, and drives factor-year selection for calculations. |
| **Reporting year (within Parameter)** | A year in the reporting programme with turnover and employee count | Provides intensity and period context for reports and reduction planning. |
| **Reporting boundary (within Parameter)** | Relevance of each Scope 1/2/3 category | Controls which emission categories the organisation treats as relevant/calculated. |
| **Location** | An operational site or place associated with GHG assessment | Optionally linked to activity calculations; supports organisational footprint geography. |
| **Calculation (activity record)** | A single activity data entry for a category, period, method, and amount | Core transactional record; source of calculated GHG results that feed dashboard and reports. |
| **Custom factor** | Organisation-defined emission conversion factor | Used when standard DEFRA factors are insufficient or when market-/supplier-specific methods apply. |
| **DEFRA / system factor** | Standard emission factor library entry | Read-only reference used to convert activity amounts into GHG values. |
| **Report (stored report content)** | Named/year-associated report content and status | Backend model for report artefacts; primary user-facing reports are generated from calculations/parameters. Exact persistence usage for every report type is **partially confirmed** ([Requires verification]). |
| **Carbon reduction initiative** | A planned or completed reduction action | Tracks reduction plan work by year with assignees and evidence. |

**Relationships (business view):**

- One organisation has **parameters** that contain **reporting years** and **boundaries**.
- **Calculations** belong to the organisation, reference a **category/scope**, optionally a **location** and **custom factor**, and produce derived GHG fields.
- **Custom factors** and **DEFRA factors** supply conversion values used when calculations are saved.
- **Initiatives** belong to the organisation and are organised by reporting year in the UI.
- Dashboard and reports **aggregate calculations** (and parameter context) into scope/category/activity summaries.

---

## 7. Attributes

### Parameter / report settings

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Reporting start date | Start of the organisation’s reporting cycle | User-entered; period explained as 365 days from this date. |
| Reporting months | Ordered months in the reporting year | **System-derived** from start date. |
| Emission factor DB year count factor | Whether factor year is offset relative to reporting year | **System-derived** from start-date month (affects which DEFRA year is used). |
| Base reporting year | Baseline year for comparisons | User-entered. |
| Current reporting year | Active reporting year context | User-configurable where exposed. |
| Primary reporting method | Market-based or location-based accounting approach | User-entered; affects electricity-related results. |
| Organisational boundary | Operational control, financial control, or equity share | User-entered. |
| Reporting boundaries (scope, category, relevance) | Which categories are relevant/calculated | User-managed; defaults to all categories as relevant/calculated. |
| Net zero target year | Target year for net zero ambition | User-entered. |
| Carbon reduction target (%) | Ambition percentage toward net zero | User-entered (UI options observed in the high range, e.g. 80–100%). |
| Reporting year turnover | Annual turnover for a year | User-entered; used for intensity-style analysis. |
| Reporting year employee count | Average employees for a year | User-entered. |

### Location

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Reference | Business identifier | **System-generated** (`LOC-{number}`). |
| Address (map / building / street / city / postcode / state / country) | Where the location is | User-entered; map address can drive geocoding. |
| Latitude / longitude | Geographic coordinates | **System-derived** from map address when provided. |
| Description of activities | What happens at the location | User-entered. |
| GHG assessment inclusion | Whether/how the site is included in GHG assessment | User-entered; required. |
| Comment | Free-text note | User-entered. |

### Calculation (activity)

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Reference | Business identifier | **System-generated** (`EM-{number}`). |
| Custom reference | User’s own reference | User-entered. |
| Scope / scope name / category | GHG Protocol classification | User-selected via category workflow. |
| Reporting year / month | When the activity applies | User-entered. |
| Calculation method | How emissions are calculated for this row | User-entered; drives factor selection rules. |
| Activity | Activity type / factor activity reference | User-entered or taken from custom factor. |
| Unit | Unit of measure for the amount | User-entered or taken from custom factor. |
| Amount | Quantity of activity | User-entered; primary calculation input. |
| Activity data grade | Quality grade of the activity data | User-entered (e.g. Very good / Good / Fair / Basic). |
| Supplier name / meter number / invoice number | Evidence / operational identifiers | User-entered where applicable to the category. |
| Custom factor | Link to organisation custom factor | User-selected when method requires it. |
| Location | Link to organisational location | Optional user selection. |
| GHG CO₂e emission (and other gas fields) | Calculated emissions | **System-derived** on save (plugins). |
| Emission factor kg CO₂e per unit / source / note / DB year | Factor metadata applied | **System-derived**. |
| Data quality scores / grades | Quality scoring for activity and factors | **System-derived** from grades and amounts. |
| SECR energy / SECR to include | SECR reporting helpers | **System-derived** for applicable categories/methods. |
| T&D losses / well-to-tank / electricity source mix / category order / unit id | Supporting derived metrics | **System-derived** where applicable. |

### Custom / DEFRA factor

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Reference (custom) | Business identifier | **System-generated** (`CF-{number}`) for custom factors. |
| Category (custom) | Emission category the factor applies to | User-entered for custom factors. |
| Year / scope / level / activity reference / UOM | Factor identity for lookup | Library or user-entered; lookups normalise casing. |
| GHG conversion factor | Multiplier converting activity to GHG | Used in calculation: activity × factor → emissions (stored as tonnes CO₂e with scaling). |
| SIC / spend-based GHG per currency | Spend-based conversion | Used for spend-based methods. |
| Purchased electricity generation mix fields | Coal / gas / nuclear / renewables / other shares | Used for market-based electricity narratives/metrics. |
| Source / source link / notes / grade | Provenance and quality of the factor | User or library supplied. |

### Carbon reduction initiative

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Reference | Business identifier | **System-generated** (`RPI-{number}`). |
| Title / description | What the initiative is | User-entered; title required. |
| Priority | Low / Medium / High / Critical | User-entered. |
| Identified at / implemented at | When found / when delivered | User-entered; implemented date drives status. |
| Status | Pending or implemented | **System-derived** from presence of implemented date. |
| Assigned users | Who owns/works the initiative | User-managed list. |
| Potential co-benefits / unintended consequences | Qualitative impact notes | User-entered. |
| Attachments | Supporting evidence | User-managed. |

---

## 8. Current UI Layout

The dedicated UI lives in **`cc-frontend-master/`** (not the main IMS frontend). After login and organisation selection, users work inside a main layout with a left sidebar and top navigation chrome.

### Main screens / pages

- **Login / landing / preparation / organisation selection / auth token** — public auth flow into the app.
- **Dashboard** (`/dashboard`) — organisation carbon overview for a selected reporting year.
- **Our Organisation** (`/organisation`) — company information form.
- **Report Settings** (`/parameters/...`) — guidelines, overview, reporting periods, locations; get-started when unconfigured; boundaries route exists; advanced tracking shows Coming Soon.
- **Add Data** (`/calculations/categories`) — category relevance tiles; links into category workspaces.
- **Category workspace** (`/categories?...`) — tabs: Carbon Emissions, Custom Factors, Import Data.
- **Reports** (`/reports` and individual report routes) — report catalogue and report viewers (including PDF-oriented full report content).
- **Reduction Plan** (`/reduction-plan`, `/initiatives/planned`, `/initiatives/complete`) — year tiles then initiative lists.
- **Support / User profile / Logout** — ancillary app screens.
- **Onboarding** (`/onboard/welcome`) — present but currently shows placeholder “Test” content ([Observed; business purpose incomplete]).
- **Data import layout** (`/data-import`) — separate layout route exists alongside category Import Data tab.

### Important sections and views

- **Sidebar:** Dashboard, Our Organisation, Report Settings, Add Data, Reports, Reduction Plan; plus Support and Logout.
- **Report Settings sub-nav:** Guidelines, Overview, Reporting Periods, Locations.
- **Category tiles:** Scope sections with relevance badges and “Read more” modal explanations.
- **Dashboard tiles/charts:** Total emissions, Scope 1/2/3, base-year change message, top categories/activities, breakdown visuals.
- **Reports catalogue:** Thumbnail cards with Included / Premium / Coming Soon badges.

### Primary actions

- Configure parameters; update reporting overview; edit turnover/employees; add/edit locations.
- Set category relevance; open a category; add calculation; inline-edit fields; delete calculation; manage custom factors; import rows.
- Select reporting year on dashboard; open reports; manage reduction initiatives (including attachments and assignees).

### Forms

- Reporting overview form (dates, methods, boundaries, net zero).
- Organisation company information form.
- Location create/edit form (address, inclusion, comments).
- Category calculation form (reference, method, activity, unit, amount, grade, supplier/meter/invoice, location, custom factor as applicable).
- Custom factor form.
- Initiative forms within planned/complete lists.

### Lists / tables / cards / detail views

- Paginated calculation tables with search and row actions (edit drawer, delete).
- Custom factor tables with inline edits.
- Reporting periods table.
- Locations table.
- Initiative lists by status.
- Report detail/PDF views for major report types.
- Dashboard summary cards and charts.

### Navigation and workflow

Typical confirmed journey:

1. Authenticate → select organisation.
2. If no parameters → **Get Started** → create parameters.
3. Configure **Report Settings** (overview, periods, locations) and set category relevance via **Add Data**.
4. Open a **Relevant** category → enter activity (or import / use custom factors).
5. System calculates emissions on save.
6. Review **Dashboard**; open **Reports**; maintain **Reduction Plan** by year.

### Material empty, loading, or restricted states

- Dashboard loading spinner; empty message when no report data.
- Parameter screens redirect to Get Started when parameters are missing.
- Categories marked **Not relevant** are not linked for data entry and appear muted/disabled in category switchers.
- Advanced Tracking and Science Based Targets Report show Coming Soon.
- Toasts used for success/error feedback (via app toaster). Restricted-by-role empty states specific to Carbo Calc were **not clearly observed** ([Requires verification]).

---

## 9. Miscellaneous / Module-Specific Information

### Confirmed meaning of “Carbo Calc”

Despite the short name **CC**, the product is a **carbon / GHG emissions calculator** (not carbohydrates or cost accounting). User-facing language emphasises carbon overview, greenhouse gas emissions, DEFRA factors, Scopes 1–3, SECR, and ISO 14064 reporting.

### Automatic calculation behaviour (business outcome)

When a user saves an activity calculation, the system automatically:

1. Determines the applicable **emission factor database year** from reporting settings and category/method rules.
2. Looks up **DEFRA** or **custom** conversion factors.
3. Derives **CO₂e** and related gas/energy/quality/SECR fields.
4. Stores those derived values on the calculation so dashboards and reports can aggregate them.

Users provide activity inputs; they do **not** manually enter the primary CO₂e result for standard flows.

### Factor matching behaviour

Factor records normalise key lookup fields (scope, activity reference, unit, etc.) to consistent casing so activity selection and calculation matching remain reliable.

### Backend capabilities without a dedicated frontend tile

- Soft-delete and restore for calculations, locations, parameters, custom factors, and initiatives exist in the API; the dedicated frontend calculation delete path observed uses **hard delete**.
- A dedicated **Scope 1 and 2 report** API exists; there is no matching standalone report card on the Reports home (related content may still appear inside other reports).
- **Activity summary** report API is used within fuller reporting experiences rather than as its own catalogue card.

### Model / plugin notes with limited UI confirmation

- A `refrigerantMaps` calculator file exists in the plugins folder but is **not attached** to the calculation model’s active plugin list — treat as inactive for current user outcomes unless later wired.
- Stored **report** documents (`name` / `year` / `content` / `status`) exist; which report screens persist versus compute on demand is **not fully confirmed** for every report type.
- Onboarding welcome content is placeholder text.

### White labelling

The frontend is a white-labelled carbon calculator with multiple brand packages (including CarboCalc). Branding changes presentation, not the core carbon capability set.

### Access

Confirmed: authenticated users operating within a selected **organisation**. Not confirmed: CC-specific permission matrices that hide or allow individual carbon features by role beyond organisation membership.
