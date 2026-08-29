# IMS Form

## 1. Module Overview

**IMS Form** is a **backend form-definition and submission platform** within iMS. It allows an organisation to **create configurable forms**, **define ordered form content (elements)**, and **record completed submissions** with **per-field responses**. Each form belongs to one organisation, is created by a user, and can be styled and published for use.

The module’s primary business purpose is to provide **reusable, organisation-owned digital forms** — for example, custom data-collection templates that can be filled in and submitted — separate from the many **hardcoded module-specific forms** used elsewhere in iMS (Risk, Incident, Expense Report, and similar screens).

In the current product, **users do not see or interact with the IMS Form module directly**. There is **no IMS Form navigation entry**, **no form library screen**, **no form builder UI**, **no form completion screen**, and **no confirmed frontend consumer** of the IMS Form API (`/api/v3/ims-forms`). IMS Form is marketed as a **separate product** during onboarding and licensing (alongside iMS Systems, Project IMS, and CarboCalc), and organisations can hold an **`imsforms` licence flag**, but that flag **does not gate** access to the IMS Form API in the inspected code.

Primary users of the IMS Form backend today are **authenticated organisation members** (or integrators) who can reach the API after organisation-session authentication. **No module-specific permission checks** were found on IMS Form routes beyond standard organisation access.

---

## 2. Features and Capabilities

### Create a form definition

- **Capability:** Register a new organisation-owned form with a title and optional description.
- **Who uses it:** Authenticated organisation members via the IMS Form API. **No confirmed UI consumer.**
- **Outcome:** A persistent Form record is saved with status **draft** by default. Success message *“iMS Form created successfully.”* Creator and organisation are recorded from the session.
- **Conditions:**
  - **Title is required** (1–255 characters). Description is optional (up to 1000 characters).
  - Form is scoped to the authenticated user’s organisation.

### View and list form definitions

- **Capability:** Retrieve one form by identifier, or browse a paginated list of forms for the organisation.
- **Who uses it:** Authenticated organisation members via the IMS Form API. **No confirmed UI consumer.**
- **Outcome:** Form details include title, description, status, theme colours, submission count, collaboration list, creator, and organisation summary. List supports standard pagination (`page`, `size`, `sort`).
- **Conditions:** Single-form retrieval fails with a not-found outcome if the form does not exist. Listing is **organisation-scoped**.

### Update a form definition

- **Capability:** Change form metadata such as title, description, status, theme colours, thumbnail, submission count, and collaborators.
- **Who uses it:** Authenticated organisation members via the IMS Form API. **No confirmed UI consumer.**
- **Outcome:** Updated form record returned. Success message *“iMS Form info updated.”*
- **Conditions:**
  - **Status** may be set to **draft**, **published**, or **archived**.
  - Form must exist before update.
  - **Submission count can be updated manually** through the update operation; **no automatic increment** was found when submissions are created. **[Requires verification]** of intended behaviour.

### Remove a form definition (soft or permanent)

- **Capability:** Move a form to trash (soft delete), restore it, or permanently remove it.
- **Who uses it:** Authenticated organisation members via the IMS Form API. **No confirmed UI consumer.**
- **Outcome:** Soft remove returns *“iMS Form moved to trash.”* Restore returns *“iMS Form restored.”* Hard remove returns *“iMS Form removed.”*
- **Conditions:**
  - **Implementation suggests soft-remove may not execute reliably** — the service layer does not correctly await the existence check before soft-deleting, similar to other modules. **[Requires verification]**
  - **No confirmed cascade behaviour** for elements, submissions, or responses when a form is hard-removed.

### Add and configure form elements (form structure)

- **Capability:** Add ordered content blocks (elements) to a form, each with a type, attributes, validation rules, optional properties, and optional child elements. Reorder elements within the form sequence.
- **Who uses it:** Authenticated organisation members via the IMS Form API. **No confirmed UI consumer.**
- **Outcome:** Elements are stored in a **linked-list order** (previous/next pointers). Listing returns elements in sequence starting from the head element. Reordering updates neighbour references. Success messages include *“iMS Form element Created Successfully.”* and *“iMS Form element Orger Change Successfully.”*
- **Conditions:**
  - Parent form must exist.
  - Element **type** is a free-text string at persistence level. A reference enum defines example types (**Input**, **Long Text**, **Email**, **Address**), but the schema does **not enforce** these values.
  - **Attributes**, **validation**, and **properties** are flexible structured objects whose business meaning depends on the element type. **Observed but business purpose unclear** for specific attribute keys — no UI or documentation was found defining user-facing field labels or input widgets.
  - Elements can be soft-deleted, restored, or hard-deleted. Hard delete **maintains list integrity** by reconnecting previous and next neighbours.

### Submit a completed form (submission + responses)

- **Capability:** Record that a user has completed a form, storing one submission record and a set of per-element responses in a single operation.
- **Who uses it:** Authenticated organisation members via the IMS Form API. **No confirmed UI consumer.**
- **Outcome:** A Form Submission record is created with the submitter and organisation. Each supplied response is stored linked to the submission and its form element. Success message *“iMS Form Submission created successfully.”*
- **Conditions:**
  - Parent form must exist.
  - **Responses must be supplied as an array.** Each response is expected to include at least an **element identifier** and a **response value** (flexible structure).
  - Submitter is taken from the authenticated session.
  - **No request-body validation middleware** was found on the submission create route.
  - A transactional submission path exists in the service layer but the exposed route uses a **non-transactional variant**. **[Requires verification]** of reliability if partial failure occurs.

### View a form submission with ordered responses

- **Capability:** Retrieve one submission for a form, including the form summary, submitter details, and responses aligned to the form’s element sequence.
- **Who uses it:** Authenticated organisation members via the IMS Form API. **No confirmed UI consumer.**
- **Outcome:** Aggregated view combining form metadata, submitter profile, and ordered element/type/attribute/response-value tuples.
- **Conditions:** Submission must belong to the specified form; otherwise not-found.

### List, update, and remove form submissions

- **Capability:** Browse paginated submissions for a form; update submission metadata; soft-delete, restore, or permanently remove submissions.
- **Who uses it:** Authenticated organisation members via the IMS Form API. **No confirmed UI consumer.**
- **Outcome:** List returns organisation-scoped submissions with submitter summary. Hard remove deletes the submission and its linked responses in a transaction.
- **Conditions:**
  - **Update behaviour for submission content (responses) could not be fully determined** — the update operation applies generic field updates to the submission record; **no confirmed path to edit stored response values** after creation.
  - **Implementation suggests update and soft-remove may not execute reliably** — existence checks in some service methods use incorrect call signatures. **[Requires verification]**

### Manage standalone form responses (separate API path)

- **Capability:** Create, list, retrieve, update, soft-delete, restore, or hard-delete individual response records outside the bundled submission create flow.
- **Who uses it:** Authenticated organisation members via the IMS Form API. **No confirmed UI consumer.**
- **Outcome:** Individual response records can be managed independently when callers use the responses API directly.
- **Conditions:**
  - Validation requires a **responses** array on create/update, but the persistence model stores **elementId** and **responseValue** per record. The standalone create service uses **different field names** (`formElementId`, `responses`) than the submission flow and the stored schema. **Current behaviour could not be fully determined** for this path. **[Requires verification]**

### Organisation licensing for IMS Form (product selection)

- **Capability:** During onboarding or licence management, an organisation (or administrator acting on their behalf) can indicate that **IMS Form** is one of the products they want.
- **Who uses it:** Organisation administrators during **Go Live onboarding** (`StepLicense`) and **licence request / organisation licence** flows (`LicenseForm`, licence management services).
- **Outcome:** The organisation’s licence record stores an **`imsforms` boolean**. Licence requests can include the same flag; administrators can apply it when approving requests.
- **Conditions:**
  - This is **product selection and licensing metadata only** in the current implementation.
  - **No confirmed enforcement** tying the `imsforms` licence flag to IMS Form API access or to any user-facing IMS Form feature.

---

## 3. User Outcomes / End Results

Through the **IMS Form module API** specifically:

- **Create:** Register organisation-owned form definitions; add and order form elements; record form submissions with answers.
- **View:** Retrieve individual forms, element sequences, submissions (with ordered responses), and standalone response records.
- **Manage:** Update form metadata and status; reorder or remove elements; update or remove submissions and responses; soft-delete and restore records.
- **Change:** Modify form title, description, status (draft / published / archived), theme, collaborators, and element configuration; reorder elements.
- **Information received:** Form identity and presentation settings; ordered element structure with types and attributes; who submitted a form and when; per-element response values on retrieval.
- **Business actions enabled:** Central management of **configurable digital forms** and **stored submissions** for potential use by future UI, integrations, or other modules — **when consumed by calling systems**. In the current product surface, **end users do not gain form-building or form-completion capability through any confirmed screen**.

**What users cannot achieve through IMS Form today (confirmed):**

- **No confirmed UI** to create, configure, publish, complete, or review forms.
- **No confirmed assignment workflow** (forms are not assigned to specific users through this module).
- **No confirmed link** from form completion to other business workflows via `moduleType` / `module` on submissions — fields exist on the data model but **no usage was found** in services or frontend.
- **No licence-gated experience** — selecting IMS Form at onboarding does not unlock a visible module in the inspected frontend.

---

## 4. Scope Boundaries

### In scope

- Organisation-scoped **form definitions** (metadata, status, theme, collaborators).
- **Form elements** as ordered, configurable content blocks with flexible attributes and validation.
- **Form submissions** representing one completion event by a user.
- **Form responses** storing answers per element per submission.
- **Lifecycle management** for forms, elements, submissions, and responses (create, read, update, soft delete, restore, hard delete).
- **Product licensing flag** (`imsforms`) stored on organisation licences and licence requests.

### Out of scope (handled elsewhere)

- **Module-specific data entry forms** (Risk Form, Incident Form, Expense Report Form, Audit Form, and dozens of similar screens) — these use shared **ImsFormElements** UI widgets but **do not call** the IMS Form API; handled by their respective business modules.
- **Generic form UI components** (`views/shared/ImsFormElements/`) — shared presentation widgets, not the IMS Form business module.
- **File upload or attachment handling** for form answers — handled by **File Handler** / **Attachment** if needed by other modules.
- **Survey, workflow request, or approval routing** — no such behaviour was found in IMS Form implementation.
- **Enforcement of the `imsforms` licence flag on API access** — not implemented in inspected middleware.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **Organisation / Our iMS** | Forms, elements, submissions, and responses are **organisation-scoped**. Creator and submitter reference organisation users. Organisation **licence records** store whether IMS Form is selected as a product (`imsforms`). |
| **License Management** | Licence **requests** can include IMS Form as a requested product; administrators can set the organisation’s `imsforms` flag when approving requests. **No confirmed runtime dependency** on this flag for form operations. |
| **Onboarding (Go Live)** | New organisations can **select IMS Form** as a product during licence selection. This records intent in licensing metadata only — **no confirmed navigation or feature unlock** in the current frontend. |
| **User Management** | Form **creator** and **submitter** are organisation users. **Collaboration** list on a form can reference multiple users — **observed but business purpose unclear** (co-editing, shared ownership, or review access could not be confirmed without UI). |
| **Other business modules (potential)** | Submission records include optional **module type** and **module record** fields suggesting future linkage of a submission to another business record (e.g. attaching a completed form to an incident). **No confirmed implementation** uses these fields today. |

No other confirmed business-module integrations (Risk, Incident, CRM, etc.) call the IMS Form API in this repository.

---

## 6. Current Data Model

The IMS Form module owns **four dedicated persistent entity types**, all organisation-scoped:

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| **Form** | An organisation-owned form template with identity, description, publication status, visual theme, and usage metadata. | The **definition** users would configure before others complete it. |
| **Form Element** | One ordered block of content or input within a form (e.g. a text question, email field, or section). | Defines **what the respondent sees and answers**; stored in a **sequence** via linked previous/next references. |
| **Form Submission** | One instance of a user completing a form at a point in time. | The **completion event**; groups all answers for that completion. |
| **Form Response** | The answer for one form element within one submission. | Stores the **submitted value** for a specific question/field. |

**Relationships (confirmed):**

- One **Form** has many **Form Elements**.
- One **Form** has many **Form Submissions**.
- One **Form Submission** has many **Form Responses** (one per answered element in the bundled create flow).
- Each **Form Response** references exactly one **Form Element** and one **Form Submission**.

**Distinction: definition vs submission**

- **Form + Form Elements** = reusable **definition** (what the form is).
- **Form Submission + Form Responses** = **completed instance** (what someone submitted).
- Multiple submissions can exist for the same form (list and create paths support this). Each submission is linked to the user who submitted it.

---

## 7. Attributes

### Form (definition)

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Title | The name of the form shown to builders and respondents. | Required on create. |
| Description | Optional explanatory text about the form’s purpose. | Optional. |
| Status | Where the form is in its publication lifecycle. | **draft**, **published**, or **archived** (default **draft**). |
| Theme foreground / background colour | Visual styling for form presentation. | Defaults to white foreground and light grey background. |
| Thumbnail | Optional preview image for the form. | Default empty. **No upload workflow confirmed** in this module. |
| Submission count | How many times the form has been submitted. | Stored on the form record; **not automatically updated** when submissions are created in inspected code. |
| Collaboration | List of users associated with the form. | **Observed but business purpose unclear** without UI. |
| Created by | The user who created the form. | Set from session on create. |
| Organisation | The owning organisation. | All operations scoped to session organisation. |
| Created / updated timestamps | When the form definition was created or last changed. | Standard audit timing. |

### Form Element (structure)

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Type | Identifies what kind of input or content block this element represents. | Example reference values: Input, Long Text, Email, Address. **Not strictly enforced** at persistence. |
| Attributes | Presentation and behaviour settings for the element (labels, placeholders, options, etc.). | Flexible object. **Specific keys not confirmed** from business UI. |
| Validation | Rules governing acceptable answers (required, format, limits). | Flexible object. |
| Properties | Additional configuration. | Accepted on create; **not present on the persisted schema** — may be discarded or merged into attributes. **[Requires verification]** |
| Children | Nested child elements. | Supports hierarchical structure. **Usage not confirmed** in workflows. |
| Previous / next element | Ordering links defining sequence within the form. | Head element has no previous; tail has no next. |
| Form | Parent form this element belongs to. | Required association. |

### Form Submission (completion)

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Form | Which form was completed. | Required. |
| Submitted by | The user who submitted the form. | Set from session on create. |
| Module type | Optional label for a linked business module. | **Unused in confirmed workflows.** |
| Module record | Optional identifier of a linked business record. | **Unused in confirmed workflows.** |
| Created / updated timestamps | When the submission occurred or was last changed. | Standard audit timing. |

### Form Response (answer)

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Form | Parent form. | Required. |
| Element | Which form element this answer belongs to. | Required. |
| Form submission | Which completion event this answer is part of. | Required. |
| Response value | The actual answer content. | Flexible structure (text, selections, dates, etc. depending on element type). |

---

## 8. Current UI Layout

### Main screens / pages

**No standalone IMS Form module screens were found** in the frontend. There is:

- No `views/imsForm/` (or equivalent) route bundle.
- No frontend service calling `/ims-forms`.
- No navigation entry for form management or completion.

### Where IMS Form appears in the UI today

IMS Form branding and **product selection** only:

| Location | What the user sees |
| -------- | ------------------ |
| **Auth — Product Promo** | IMS Form logo displayed alongside other iMS product logos on authentication/marketing layout. |
| **Onboarding — Go Live (Step License)** | Selectable product tile with IMS Form logo; toggles `imsforms` in the licence selection model. |
| **Our iMS — Organisation License Form** | Same selectable product tile when configuring organisation licences. |

These screens **do not** provide form creation, editing, completion, or submission review.

### Shared components (not the IMS Form module)

The folder `views/shared/ImsFormElements/` provides **reusable input widgets** (text fields, selects, section dividers, button groups, etc.) used across **many other modules’ forms**. These components **do not connect** to the IMS Form API and are **out of scope** for IMS Form module UI — they are shared presentation utilities.

### Primary actions

- **Confirmed in UI:** Select or deselect IMS Form as a **licensed product** during onboarding or organisation licence configuration.
- **Not confirmed in UI:** Create form, add elements, publish form, complete form, submit responses, view submissions.

### Material empty, loading, or restricted states

- **No IMS Form–specific states** were found (no form library empty state, no builder loading state, no submission success screen).
- Licence selection uses standard form validation from the shared `useForm` hook on onboarding/organisation screens.

---

## 9. Miscellaneous / Module-Specific Information

### What an IMS Form represents in this application

An **IMS Form** is a **persisted, organisation-owned, configurable form template** — not a generic HTML form component and not a module-specific hardcoded screen. It is designed to support:

1. **Building** a form (metadata + ordered elements).
2. **Publishing** it (status transition to published).
3. **Collecting submissions** (user completes the form; answers stored per element).

That end-to-end experience is **implemented on the backend** but **not exposed through a confirmed user interface** in this repository.

### Form lifecycle (definition)

| Status | Meaning (from validation and model) |
| ------ | ----------------------------------- |
| **draft** | Default state for new forms. |
| **published** | Form is marked available for use. **No confirmed UI or business rule** defines what published blocks or enables. |
| **archived** | Form is retired from active use. **No confirmed UI** for archiving. |

**No submission-level status** (submitted, reviewed, approved, etc.) was found.

### Form completion workflow (backend — confirmed path)

When a caller uses the submission create capability:

1. Parent form must exist.
2. A **Form Submission** record is created for the authenticated user and organisation.
3. An array of **responses** is supplied; each maps to a **form element** and **response value**.
4. **Form Response** records are bulk-inserted linked to the submission.
5. Retrieving the submission returns form summary, submitter, and **ordered** element/response pairs.

**Not confirmed:** save-as-draft during completion, validation of required fields against element rules, preventing duplicate submissions, or post-submit user feedback.

### User access and permissions

- Routes are mounted under `/api/v3/ims-forms` **after** `authOrgAccess` — callers must be **authenticated organisation members** (or approved external identities with organisation context).
- **No module-specific RBAC**, policy checks, or role gates were found on IMS Form routes.
- **No check** that the organisation’s `imsforms` licence is `true` before allowing API access.
- **All authenticated org members** appear to have the same API capabilities for create, read, update, and delete operations. **Finer-grained roles (form builder vs respondent vs reviewer) could not be determined.**

### Frontend / backend discrepancy

| Area | Backend | Frontend |
| ---- | ------- | -------- |
| Form CRUD | Implemented | **Not consumed** |
| Element management | Implemented | **Not consumed** |
| Submission & responses | Implemented | **Not consumed** |
| Product licensing | `imsforms` flag stored | **Selection UI only** — no feature unlock |
| Shared ImsFormElements widgets | N/A | Used widely — **unrelated to IMS Form API** |

### Partial or unclear implementation

- **Submission count** on forms is not incremented automatically when submissions are created.
- **`moduleType` / `module`** on submissions suggest linking completions to other business records — **unused**.
- **Standalone response API** field naming does not align cleanly with the submission flow or persistence schema. **[Requires verification]**
- **Soft-remove and some update paths** may not await existence checks correctly. **[Requires verification]**
- **Element type catalogue** (`IMS_FORM_FIELDS` vs `IMS_FORM_ELEMENTS_TYPE`) contains overlapping concepts; **business mapping of types to user-facing inputs is unclear**.
- **Collaboration** list on forms — purpose not confirmed without UI or documentation.
- **Published status** — no confirmed enforcement preventing submission against draft/archived forms.

### Terminology note

**“IMS Form”** (this module) must be distinguished from:

- **`ImsFormElements`** — shared React form widgets.
- **`*Form.jsx` screens** in other modules — fixed business workflows, not dynamic IMS Form definitions.
