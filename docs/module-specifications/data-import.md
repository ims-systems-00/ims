# Data Import

## 1. Module Overview

The **Data Import** module enables organisation users to **bulk-load legacy or external data** into iMS by uploading a spreadsheet, mapping its columns to system fields, validating the content, and migrating valid rows into selected business modules. It replaces the manual effort of creating large numbers of records one at a time — for example when onboarding historical risks, incidents, customers, or inventory assets from an existing system or spreadsheet.

The module is presented as a **standalone Data Import wizard** (`/admin/data-import`) with a four-step guided workflow: choose target module and upload file → map columns → validate → confirm and start migration. Import processing runs **asynchronously in the background** after the user submits; the user is told to wait for a notification when migration completes.

Primary users are **authenticated organisation members** who can access the Data Import navigation entry. Access is gated by **Users Read** permission on the frontend route. The wizard currently exposes **eight target modules** in its dropdown, although the backend supports validation definitions for a much larger set of business record types.

---

## 2. Features and Capabilities

### Open the Data Import wizard

- **Capability:** Access a dedicated multi-step import screen from main navigation (**Data import**).
- **Who uses it:** Users with **Users Read** permission (as configured on the route access policy).
- **Outcome:** User sees the import wizard with introductory guidance explaining that they can upload a spreadsheet and link it to a chosen iMS module.
- **Conditions:** User must be logged in with organisation context.

### Choose target module, file format, and date format

- **Capability:** Select which business module will receive imported records, confirm file format, and choose how dates in the spreadsheet should be interpreted.
- **Who uses it:** Users performing a bulk import.
- **Outcome:** System loads the **importable field schema** for the selected module — the list of business fields the user can map columns to, including which are required.
- **Conditions:**
  - **Confirmed UI modules:** CRM/Customers, Risk management, Incident management, Inventory (hardware, information, people, premise, software).
  - **Format:** CSV only (`.csv`) in both the format selector and file upload control.
  - **Date format:** DD/MM/YYYY (United Kingdom) only.

### Upload and parse a spreadsheet

- **Capability:** Upload one or more CSV files containing rows of business data to import.
- **Who uses it:** Users performing a bulk import.
- **Outcome:** Each uploaded file is parsed into rows and column headers. The wizard shows sheet name, column count, and row count per file.
- **Conditions:**
  - UI heading mentions *“CSV or Excel sheet”* but the upload control and format selector accept **CSV only**. Excel is **not confirmed** as supported.
  - Parsing occurs **in the browser**; the source file is not stored via File Handler or Attachment modules.
  - Multiple files can be uploaded; each is treated as a separate sheet processed through validation and import independently.

### Map spreadsheet columns to system fields

- **Capability:** For each importable system field, choose which spreadsheet column supplies its value, or assign a fixed organisation value for special fields.
- **Who uses it:** Users performing a bulk import.
- **Outcome:** A column mapping (`dataMap`) is built linking system field paths to CSV column names (or to selected users/groups for ownership fields).
- **Conditions:**
  - **Required fields** must be mapped before validation can run; the **Validate dataset** button stays disabled until all required fields are mapped on every sheet.
  - Fields marked as **business unit controllers** map to organisation **business functions (IAM groups)** via a dropdown of existing groups — not from a CSV column.
  - Fields marked as **ownership controllers** map to organisation **users** via a dropdown — not from a CSV column.
  - Optional fields can be toggled off with a **migrate** checkbox; unchecked fields are excluded from the mapping.
  - Field list and labels come from the target module’s importable schema (fields flagged as client-importable on the data model).

### Validate imported data before migration

- **Capability:** Run a full validation scan of all mapped rows against module-specific business rules before any records are created.
- **Who uses it:** Users performing a bulk import.
- **Outcome:**
  - If all rows pass: validation succeeds; user can proceed to step 4.
  - If any row fails: validation errors are shown per field with row numbers; user can download a CSV error report to fix the source file.
  - Progress indicator shows upload progress and, during server validation, live row-by-row progress via websocket updates (current field, percentage, row count).
- **Conditions:**
  - Validation runs **per sheet** when multiple files are uploaded.
  - **All sheets must pass** validation for `validationSuccess` to be true and step 4 to appear.
  - Validation is **all-or-nothing for proceeding** — the wizard does not allow importing only valid rows while skipping invalid ones.
  - Module-specific rules enforce required values, allowed enumerations (for example risk category, incident priority, customer stage), email formats, numeric ranges (risk likelihood/consequence 1–5), and other field constraints.

### Confirm and start background migration

- **Capability:** After successful validation, explicitly confirm intent and submit the import for background processing.
- **Who uses it:** Users performing a bulk import.
- **Outcome:**
  - User must type **`migrate`** in a confirmation field, then click **Start Migration**.
  - HTTP success returns message *“We recieved your data. You will be notified once import is complete”*.
  - Congratulations screen states migration has started and **Alice** (branded bot) will migrate data; user will receive a notification on completion.
  - Upload progress bar shows while the dataset is sent to the server.
- **Conditions:**
  - Backend **re-validates synchronously** before queueing; if validation fails at this stage, import is rejected with *“Validation has failed. Please review your data.”*
  - Import is queued for **asynchronous background processing** — the congratulations screen appears when the request is **accepted**, not when all records are inserted.
  - Each sheet triggers a **separate import job**.

### Receive import notifications

- **Capability:** Be informed when an import starts and when it completes.
- **Who uses it:**
  - **On start:** All **Super Admin** users in the organisation receive an in-app notification.
  - **On complete:** The **user who initiated the import** receives an in-app notification with start time and duration.
- **Outcome:** Notification title *“Import Dataset”* with message describing module, initiator, and timing.
- **Conditions:** Email notifications for import events are **disabled** (`email: false`). Completion notification is **only sent if the background job finishes without insertion error** — see Miscellaneous for partial-failure behaviour.

### Import more data after completion

- **Capability:** Reset the wizard and start a new import from the congratulations screen.
- **Who uses it:** Users who completed or submitted an import.
- **Outcome:** Wizard returns to step 1 with cleared state.

---

## 3. User Outcomes / End Results

- **Migrate legacy data efficiently:** Bulk-create risks, incidents, customers, and inventory assets (hardware, information, people, premise, software) from existing spreadsheets instead of entering records individually.
- **Control data mapping:** Decide which spreadsheet columns populate which iMS fields, assign business functions and record owners from organisation directory data, and exclude optional fields.
- **Catch errors before migration:** Validate entire datasets against business rules, review row-level error messages, and download error reports to correct source files before importing.
- **Import with confidence:** Explicit typed confirmation (`migrate`) before irreversible bulk record creation begins.
- **Stay informed:** Super Admins are notified when imports start; the initiator is notified when background migration completes successfully.
- **Information received:** Per-field validation results with row numbers; sheet-level summaries (columns, rows); schema field list with required markers; progress during validation and upload; success/failure messaging at each stage.
- **Business actions enabled:** Faster organisation onboarding; historical data load for operational modules; reduced manual data-entry effort for large record sets.

**What users cannot achieve through Data Import (confirmed):**

- Update existing records (import **creates new records only**).
- Import into modules not listed in the wizard dropdown (despite backend support for many other module types).
- Upload Excel files through the current UI (CSV only).
- Resume or view import history from a past session (no persistent import job UI).
- Receive completion notification if background insertion fails partway through.

---

## 4. Scope Boundaries

### In scope

- Standalone **Data Import wizard** UI at `/admin/data-import`.
- CSV upload, client-side parsing, column mapping, validation, confirmation, and background migration.
- Module schema discovery for importable fields (driven by `isClientImportable` flags on data models).
- Module-specific validation rules (generated Joi rule sets per business module).
- Organisation scoping of created records (organisation ID applied from authenticated user on insert).
- Asynchronous import queue processing in batches.
- In-app notifications on import start (Super Admins) and successful completion (initiator).
- Validation error report download (CSV).
- Live validation progress via websocket.

### Out of scope (handled elsewhere)

- **Updating existing records** — import uses bulk insert only; no upsert or merge behaviour.
- **File storage of source spreadsheets** — files are parsed in the browser and not retained via File Handler or Attachment modules.
- **Modules not in the wizard dropdown** — backend validation exists for ~53 module types (audits, tasks, suppliers, CQC registers, compliance, users, etc.) but **no UI entry** to import into them currently.
- **Dashboard / Stats / Charts** — operational analytics and visualisations; separate from bulk data migration.
- **Data export** — not part of Data Import.
- **Duplicate detection business logic** — no explicit duplicate-check before insert; database constraints may cause batch failures.
- **Email notifications for import events** — disabled in current notification handlers.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **CRM / Customers** | Users can bulk-import customer records including name, address, stage, contacts, contract value, account manager, and business function assignment. |
| **Risk Management** | Users can bulk-import risks with title, category, description, controls, acceptance rationale, decision maker, owner, likelihood, consequence, and business function. |
| **Incident Management** | Users can bulk-import incidents with title, description, owner, priority, resolution, notification method, affected service, and business function. |
| **Inventory — Hardware assets** | Users can bulk-import hardware asset records with importable schema fields from the hardware asset model. |
| **Inventory — Information assets** | Users can bulk-import information asset records. |
| **Inventory — People assets** | Users can bulk-import people asset records. |
| **Inventory — Premise assets** | Users can bulk-import premise asset records. |
| **Inventory — Software assets** | Users can bulk-import software asset records. |
| **Users / IAM Groups (Business Functions)** | Business function and owner fields on imported records are assigned from organisation user and group directories during column mapping — not from spreadsheet columns. |
| **Notifications** | Delivers in-app notifications when imports start (to Super Admins) and complete successfully (to initiator). |
| **Organisation** | All imported records receive the initiating user’s organisation ID automatically. |

**Backend-only linked modules (validation definitions exist; no wizard UI):** Audits, tasks, suppliers, CQC modules, compliance controls, invoices, leaves, expense reports, document management entities, IAM entities, KPI objectives, management reviews, and others (~45 additional module types). These could theoretically receive imported data via API but are **not exposed in the current import wizard**.

---

## 6. Current Data Model

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| **Import job (queue)** | A background task processing one sheet’s validated rows | Temporary — held in Redis/Bull queue during processing; **not persisted** as a queryable import history record. |
| **Target module records** | Business records in the selected module (risks, incidents, customers, assets, etc.) | **Created** by import via bulk insert. Owned by the respective business module. Organisation set from importer’s session. |
| **Importable field schema** | Derived list of mappable fields for a module | **Not stored** — computed dynamically from each module’s data model (`isClientImportable` metadata). |
| **Validation rules** | Module-specific constraints for each importable field | **Persisted as generated rule files** in the backend codebase, not as user-editable runtime data. |

**No dedicated Data Import data model exists.** The module does not store import history, import status records, or retained copies of uploaded files. Users cannot later view a log of past imports from within the Data Import module.

---

## 7. Attributes

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| **Target module** | Which business area receives the imported records | Selected in step 1. Drives schema, validation rules, and where records are created. |
| **File format** | Expected spreadsheet format | CSV (`.csv`) — only confirmed option in UI. |
| **Date format** | How date values in the spreadsheet are interpreted | DD/MM/YYYY (UK) — only confirmed option. Applied during type casting before validation and insert. |
| **Sheet / file name** | Identifier for each uploaded spreadsheet | Shown in mapping and validation sections. Multiple sheets processed independently. |
| **Column mapping (`dataMap`)** | Links each system field to a spreadsheet column or fixed org value | Built in step 2. Required fields must all be mapped. |
| **Row data (`dataSet`)** | The business records to import, one object per spreadsheet row | Parsed from CSV; sent to backend for validation and import. |
| **Importable field alias** | User-facing label for a mappable system field | From module schema (for example “Risk title”, “Business function”, “Likelihood”). |
| **Required field flag** | Whether a field must be mapped and populated | Gates validation button and backend required-field checks. |
| **Validation success** | Whether all rows on all sheets passed validation | Must be true to reveal step 4 (migration). |
| **Validation error** | Row-level business rule failure | Includes column name, row number, and human-readable message. |
| **Migration confirmation** | User’s explicit consent to proceed | User must type `migrate`. |
| **Organisation scope** | Tenant boundary for created records | Automatically applied from authenticated user — not user-selectable. |
| **Business function assignment** | Which IAM group (business unit) imported records belong to | Selected from org groups dropdown for controller fields. |
| **Record owner assignment** | Which user owns imported records | Selected from org users dropdown for ownership controller fields. |
| **Import duration** | How long background migration took | Included in completion notification message. |
| **Initiating user** | Who started the import | Recorded in start notification; receives completion notification. |

---

## 8. Current UI Layout

### Main screens / pages

- **Standalone page:** `/admin/data-import` under admin layout.
- **Navigation entry:** “Data import” with import icon in main navigation.
- **Single-page wizard** with four sequential sections (A–D) inside one scrollable box, plus a congratulations view after submission.

### Important sections and views

**Step 1 — Welcome / configuration (`Section A`):**
- Heading: *“1. Welcome to data import wizard”*
- Introductory text explaining upload and module selection.
- Left column: **Service and business unit** — module dropdown, format dropdown (CSV), date format dropdown.
- Right column: **Upload any CSV or Excel sheet** — CSV drop zone (*“+ Select spreadsheet”*).

**Step 2 — Column mapping (`Section B`):**
- Appears after files are uploaded.
- Heading: *“2. Lets start to link your data”*
- Per-sheet card showing sheet name, total columns, total rows.
- For each importable system field: field alias (required fields marked `*`), arrow, column selector dropdown, **migrate** checkbox.
- Business function and owner fields show organisation group/user dropdowns instead of CSV columns.

**Step 3 — Validation (`Section C`):**
- Appears when sheets exist.
- Heading: *“3. Validate your dataset”*
- **Error report area:** Before validation, instructional text about scanning. After validation, per-sheet field error lists (paginated, 3 errors per page) or green *“No validation error”* per field. **Download report** button (red) per sheet when validation failed — exports errors as CSV.
- **Validation progress:** Progress bar and current field/row during validation (websocket-driven).
- **Validate dataset** button (disabled while validating or if required mappings missing).

**Step 4 — Migration (`Section D`):**
- Appears only when `validationSuccess` is true.
- Heading: *“4. Start importing dataset”*
- Reminder to re-validate if steps 1 or 2 were changed.
- **Upload/send progress** during submission.
- Confirmation field: type `migrate`.
- **Start Migration** button (disabled until confirmation valid or while processing).

**Congratulations view:**
- Shown after successful submission (request accepted).
- *“Congratulations — All done now!!”*
- Message that migration started, Alice will migrate data, notification on completion.
- **Import more data** button resets wizard.

### Primary actions

- Select module, format, date format.
- Upload CSV file(s).
- Map columns / assign business function and owner.
- Toggle migrate checkbox per field.
- Validate dataset.
- Download validation error report.
- Type `migrate` and start migration.
- Import more data (reset).

### Forms

- Module/format/date selects (step 1).
- Per-field mapping selects and migrate checkboxes (step 2).
- Migration confirmation text input (step 4).

### Lists / tables / cards / detail views

- Per-sheet summary cards in step 2.
- Paginated validation error lists per field in step 3.

### Navigation and workflow

Linear wizard flow: configure → upload & map → validate → confirm & migrate → congratulations. User must complete validation successfully before migration step appears. User can reset and start over from congratulations.

### Material empty, loading, or restricted states

- Step 2 hidden until files uploaded.
- Step 3 hidden until sheets exist.
- Step 4 hidden until validation succeeds on all sheets.
- **Validate dataset** disabled when required mappings incomplete or validation in progress.
- **Start Migration** disabled until `migrate` typed correctly or while submitting.
- Validation button shows *“Validating data”* while processing.
- Migration button shows *“Processing”* while submitting.
- Progress bars during validation upload, validation scan, and import submission.
- Field-level *“No validation error”* success indicator in green when clean.

---

## 9. Miscellaneous / Module-Specific Information

### End-to-end import workflow (confirmed)

1. User selects target module → system fetches importable field schema.
2. User uploads CSV → browser parses rows and headers.
3. User maps columns (and assigns business function / owner from org directories).
4. User clicks **Validate dataset** → data sent to backend; validation runs in a subprocess with websocket progress updates.
5. If all sheets pass → step 4 appears.
6. User types `migrate` and clicks **Start Migration** → backend re-validates, queues background job(s), emits start event.
7. Congratulations screen shown immediately on HTTP 200.
8. Background worker transforms rows (type casting, mapping), inserts in batches of 250.
9. On full success → completion notification to initiator. On insertion error → job stops silently (no completion notification).

### Record creation vs update

Import **creates new records only** via bulk insert. **No update, upsert, or merge** of existing records was found. Re-importing the same business data may create duplicates unless database unique constraints reject inserts.

### Duplicate and existing record behaviour

- **No explicit duplicate-detection** logic before insert.
- **MongoDB unique index violations** or other insert errors during a batch cause the background job to **stop** at that batch.
- **Earlier successful batches in the same job may already be committed** before a later batch fails — partial import is possible at the database level, but the user is **not clearly informed** of partial success or failure through the UI.
- **[Requires verification]** of whether users can identify and reconcile partially imported data without manual module inspection.

### Validation behaviour (confirmed)

- **All rows validated** against all mapped columns.
- **Any error on any row** causes validation failure for that sheet.
- **All sheets must pass** for migration step to unlock.
- Errors reported with column name and **row number** (spreadsheet row, accounting for header row).
- Backend **re-validates on import submission** — client-side validation success does not bypass server checks.

### Invalid data behaviour

| Stage | Behaviour |
| ----- | --------- |
| **Validation (step 3)** | Errors displayed in UI; error CSV downloadable; migration blocked. |
| **Import submission** | HTTP 400 if re-validation fails; user stays on wizard (no congratulations). |
| **Background insert** | Batch failure logged; job exits; **no failure notification** to user; congratulations already shown. |

### Partial import behaviour

- **Not supported as a user-facing feature** during validation (cannot import valid rows while skipping invalid ones).
- **Possible unintentionally** during background insertion if a later batch fails after earlier batches succeed. User notification and UI do not reflect this state.

### Relationship with FileHandler and Attachment

- **No confirmed relationship.** CSV files are read and parsed **entirely in the browser** (PapaParse). Parsed row data is sent as JSON in HTTP request bodies. Source files are **not uploaded to cloud storage** and are **not stored as attachments**.

### Relationship with Dashboard

- **Separate modules.** Dashboard displays operational aggregates and charts. Data Import bulk-creates source records that may eventually appear in dashboard metrics, but Dashboard does **not** consume or display import job status.

### Backend module coverage vs UI

The backend maintains validation rule sets for **53 module types**, including audits, tasks, suppliers, CQC, compliance, users, invoices, leaves, and others. The wizard dropdown exposes **8 modules** only. Additional modules could be imported via direct API calls with correct payloads — **no confirmed UI or documentation for doing so**.

### Access and permissions

- **Frontend route:** `IMS_SERVICES.USERS` + `ACTIONS.READ` + `EFFECTS.ALLOW`.
- **Backend routes:** Empty permission middleware arrays; protected by organisation authentication (`authOrgAccess`).
- **No module-specific import permission** (for example Risk Create) checked on import routes — any user reaching the wizard with valid session can import into any listed module. **[Requires verification]** whether this is intentional.

### Notifications

| Event | Recipients | Channel |
| ----- | ---------- | ------- |
| Import started | All Super Admin users in organisation | In-app notification |
| Import completed successfully | Initiating user | In-app notification |
| Import failed (insertion error) | **None confirmed** | — |

Legacy trigger-based notification code for import events exists but is **commented out** in the import controller; event-bus handlers are the active path.

### Branding

- Background migration is attributed to **Alice** (bot) in UI messaging.
- Completion notification states datasets were imported successfully — this message is sent **only when the full background job completes without insertion error**, which may not match user expectation if they already saw the congratulations screen before processing finished.

### Frontend/backend discrepancies

| Area | Finding |
| ---- | ------- |
| Excel support | UI text mentions Excel; upload and format selector are **CSV only**. |
| Congratulations timing | Shown when import request is **accepted**, not when all records are inserted. |
| Failure feedback | Background insertion failure produces **no user notification**; user may believe import succeeded. |
| Module coverage | Backend supports ~53 modules; UI exposes **8**. |
| Access permission | Import gated by **Users Read**, not a dedicated import or target-module permission. |
| Partial batch failure | Some records may be created before job aborts; user not informed. |

### Unclear or partially implemented behaviour

- **Whether partial background imports should be rolled back** — not implemented; partial commits may remain. **[Requires verification]**
- **Whether duplicate business keys** (for example customer name, risk reference) are prevented — depends on target module database constraints; not documented in import logic. **[Requires verification]**
- **Why access policy uses Users Read** rather than a dedicated import or admin permission. **Observed but business purpose unclear.**
- **Whether API-only imports** into the ~45 backend-supported modules are used in production. **Not confirmed in this repository.**

None further.
