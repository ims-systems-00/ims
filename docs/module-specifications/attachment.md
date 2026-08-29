# Attachment

## 1. Module Overview

The **Attachment** module is a **shared supporting capability** in iMS. It provides a **central, organisation-scoped registry** for associating already-uploaded files with specific business records. Each registry entry links **file metadata** (original name, storage location) to a **business record type** and **record identifier**, along with who created the association and when.

The module solves the problem of storing attachment relationships **separately from parent business records**. Instead of embedding file lists directly inside every risk, incident, task, or project record, the Attachment module can hold a dedicated **Attachment record** that points at both the underlying file and the business record it supports.

Primary users are **authenticated organisation members** who interact with attachment workflows. In the current product, however, **most user-facing attachment behaviour is implemented inside other business modules** (Risk Management, Incident Management, Audits, and others) using **embedded file metadata on parent records**, not through this module’s dedicated API. The Attachment module’s backend capability exists and is exposed under `/attachments`, but **no frontend or other backend service in this repository was found calling that API**.

The module is **not** a file upload, preview, or download system on its own. Users must obtain file metadata through the **File Handler** (or an equivalent upload flow) **before** registering an association through Attachment.

---

## 2. Features and Capabilities

### Register a file association with a business record

- **Capability:** Create an Attachment record that links uploaded file metadata to a specific business record (identified by module type and record ID).
- **Who uses it:** Any authenticated organisation member reaching the Attachment API. **No confirmed UI consumer** in this repository.
- **Outcome:** A persistent Attachment record is saved in the organisation’s scope. The user receives confirmation using the attached file’s original name (for example, *“{filename} added successfully.”*). The returned record includes populated organisation and creator information.
- **Conditions:**
  - Requires `moduleType`, `module` (record ID), and `fileMetaInfo` (file name, storage key, bucket).
  - Does **not** upload the file itself — `fileMetaInfo` must already exist (typically from a prior File Handler upload).
  - `moduleType` must be a recognised business module type; `module` must be a valid record identifier.
  - Organisation and creator are taken from the authenticated session.

### View a single attachment record

- **Capability:** Retrieve one Attachment record by its identifier.
- **Who uses it:** Authenticated organisation members via the Attachment API. **No confirmed UI consumer.**
- **Outcome:** Attachment details are returned, including linked file metadata, module type, linked record ID, organisation summary, and creator name/profile image.
- **Conditions:** Record must exist; otherwise a not-found outcome occurs.

### List attachment records for the organisation

- **Capability:** Retrieve a paginated list of Attachment records scoped to the user’s organisation.
- **Who uses it:** Authenticated organisation members via the Attachment API. **No confirmed UI consumer.**
- **Outcome:** Paginated list of Attachment records with organisation and creator details.
- **Conditions:** Organisation-scoped listing. Standard pagination query parameters (`page`, `size`, `sort`) are supported. **No confirmed frontend usage** of list filters by module type or record ID.

### Soft-remove an attachment (move to trash)

- **Capability:** Mark an Attachment record as soft-deleted without permanently removing it from the database.
- **Who uses it:** Authenticated organisation members via the Attachment API. **No confirmed UI consumer.**
- **Outcome:** Success message *“Attachment moved to trash.”* Underlying stored file is **not** deleted on soft-remove.
- **Conditions:** **Implementation suggests this capability may not execute reliably** — the service layer does not correctly await the existence check before soft-deleting, so behaviour could not be fully confirmed as working. **[Requires verification]**

### Restore a soft-deleted attachment

- **Capability:** Restore a previously soft-deleted Attachment record.
- **Who uses it:** Authenticated organisation members via the Attachment API. **No confirmed UI consumer.**
- **Outcome:** Success message *“Attachment restored.”* Record becomes active again.
- **Conditions:** Attachment must exist (including in soft-deleted state, depending on query behaviour).

### Permanently remove an attachment

- **Capability:** Hard-delete an Attachment record and remove the underlying stored file from cloud storage.
- **Who uses it:** Authenticated organisation members via the Attachment API. **No confirmed UI consumer.**
- **Outcome:** Success message *“Attachment removed.”* Database record is deleted and the stored file object is deleted via the shared file manager.
- **Conditions:** Attachment must exist. This is the only confirmed Attachment lifecycle action that removes the underlying stored file.

---

## 3. User Outcomes / End Results

Through the **Attachment module API** specifically:

- **Create:** Register a file-to-record association as a standalone Attachment entity within the organisation.
- **View:** Retrieve individual Attachment records with file metadata, linked record reference, creator, and organisation context.
- **Manage:** List organisation-scoped Attachment records with pagination; soft-delete and restore where supported; permanently remove when hard-delete is used.
- **Change:** Restore soft-deleted associations; permanently remove associations and their stored files.
- **Information received:** File original name, storage reference, linked business module type, linked record ID, creator identity, organisation identity, and creation/update timestamps.
- **Business actions enabled:** A centralised attachment registry model for linking evidence and supporting documents to diverse business records — **when consumed by calling systems**. In the current product surface inspected, **end users achieve attachment outcomes through parent modules and File Handler instead** (see Scope Boundaries).

---

## 4. Scope Boundaries

### In scope

- Organisation-scoped **Attachment records** linking `fileMetaInfo` to `moduleType` + `module` (business record ID).
- Create, get, list, soft-delete, restore, and hard-delete of Attachment records.
- Hard-delete removing the underlying stored file via the shared file manager.
- Soft-delete lifecycle (mark deleted without removing stored file), subject to verification of soft-delete reliability.
- Validation of attachment payload structure (module type, record ID, file metadata).

### Out of scope (handled elsewhere)

- **File upload, download, preview, and staged upload UI** — handled by **File Handler** and shared upload components embedded in business modules.
- **Embedded attachments on parent records** — Risk Management, Incident Management, Task Management, Audits, CIP, CQC, CRM, Expense Reports, and other modules store file metadata directly on their own records and expose module-specific add/remove endpoints. This is the **confirmed user-facing attachment pattern** today.
- **Compliance control file evidence** — stored and managed through **Compliance** control-evidence workflows, not the Attachment module API (despite frontend naming such as `createAttachment` in evidence components).
- **Document Management lifecycle** — repositories, versions, signatures, and trees; may reference files but do not use the Attachment module API in confirmed flows.
- **Parent module permissions** — each business module governs who can add or remove embedded attachments on its records; the Attachment API routes carry **no module-specific permission middleware** beyond organisation authentication.
- **Attachment UI components** — shared preview, download, and drop-zone components belong to File Handler / parent module presentation, not to a standalone Attachment screen.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **File Handler** | Provides upload and storage mechanics. Attachment expects **file metadata** (`Name`, `Key`, `Bucket`) produced after upload. Hard-delete uses the same file manager to remove stored objects. Attachment does not upload or generate download/preview links itself. |
| **Risk Management** | Attachment model **allows** `risks` as a linkable module type. Risks in production store attachments **embedded on the risk record** via Risk Management APIs, **not** via Attachment module records. |
| **Incident Management** | Attachment model **allows** `incidents`. Incidents use **embedded attachments** on incident records. |
| **Task Management** | Attachment model **allows** `tasks`. Tasks use **embedded attachments** on task records. |
| **Continual Improvement Plan (CIP)** | Attachment model **allows** `cips`. CIP uses **embedded attachments** on CIP records. |
| **CQC** | Attachment model **allows** `cqcsignificantevents` and `cqcdetails`. CQC modules use **embedded attachments** on register records. |
| **Compliance** | Attachment model **allows** `controlstatuses`. Compliance file evidence uses **control-evidence** records, not Attachment module API. |
| **Customers (CRM)** | Attachment model **allows** `customers`. Customer records use **embedded attachments**. |
| **Expense Reports (Staff Wallet)** | Attachment model **allows** `expensereports`. Expense, travel, and accommodation line items use **embedded attachments** on expense report structures. |
| **Document Management** | Attachment model **allows** `documentrepositories` and `documenttrees`. Document repositories use Document Management’s own document/revision model. |
| **IMS Projects** | Attachment model **allows** `imsprojects` and `imsprojectworkpackages`. **No confirmed integration** creating Attachment records from IMS Project workflows was found. |
| **Carbon Calculator** | Attachment model **allows** `cccalculations`. **No confirmed integration** creating Attachment records was found. |
| **Leave Management** | Attachment model **allows** `leaves`. **No confirmed integration** creating Attachment records was found. |

**Summary:** The Attachment module defines a **linkable module-type vocabulary** and a central registry pattern. **Confirmed runtime usage in this codebase is limited to the Attachment API itself** — parent modules currently implement attachment behaviour through embedded metadata and File Handler, not through Attachment records.

---

## 6. Current Data Model

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| **Attachment** | A registry entry associating one uploaded file with one business record | Primary entity owned by this module. Persists module type, linked record ID, file metadata, organisation, creator, timestamps, and soft-delete marker. |
| **File metadata (`fileMetaInfo`)** | Reference to an already-stored file (name, storage key, bucket) | Embedded on each Attachment record. Not uploaded by this module — supplied at creation time, typically from File Handler. |
| **Linked business record (`module` + `moduleType`)** | The business record the file supports | Identifies which record the attachment belongs to. Does not duplicate the parent record’s data. |
| **Organisation** | Tenant scope | Every Attachment record belongs to one organisation. Listing is organisation-scoped. |
| **Creator (user)** | Who registered the association | Stored as `createdBy`; populated with name and profile image when retrieved. |

A **dedicated Attachment data model exists** (`attachments` collection). Attachment information is **not** only embedded in other modules — this module maintains its own persistent records when its API is used.

---

## 7. Attributes

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| **Attachment identifier** | Unique ID of the attachment registry entry | Assigned on create. Used for get, soft-delete, restore, and hard-delete. |
| **Module type** | Which business module the file is attached to | Constrained to an enumerated set on the Attachment model (for example risks, incidents, tasks, cips, customers, expensereports, controlstatuses, documentrepositories, imsprojects, and others). Request validation accepts a broader module-type vocabulary than the model enum — **[Requires verification]** of which types can actually persist. |
| **Linked record ID (`module`)** | The specific business record receiving the attachment | Required. Identifies the parent record within the given module type. |
| **File name (`fileMetaInfo.Name`)** | Original filename shown to users | Required. Used in success messaging on create. |
| **Storage key (`fileMetaInfo.Key` / `key`)** | Location identifier for the stored file | Required. Used when hard-deleting the underlying file. Belongs to the file, not the business association alone. |
| **Storage bucket (`fileMetaInfo.Bucket`)** | Organisation/storage partition for the file | Required. Belongs to the underlying file reference. |
| **Organisation** | Owning tenant | Set from authenticated user’s organisation on create. Scopes list queries. |
| **Created by** | User who registered the attachment | Set from authenticated user on create. Populated with display name and profile image on read. |
| **Created / updated timestamps** | When the association was created or last changed | Standard audit timing on the Attachment record. |
| **Soft-delete marker** | Whether the attachment is in trash | Set by soft-delete plugin (`deleteMarker` with status and deleted date). Underlying file remains until hard-delete. |

---

## 8. Current UI Layout

### Main screens / pages

- **No standalone Attachment screen or navigation entry exists.** The Attachment module does not have its own page in the frontend.

### Important sections and views

- **No UI reads from or writes to the Attachment module API** (`/attachments`) in this repository.
- User-facing attachment experiences appear **inside other modules**, using shared components (file drop zones, attachment rows, preview drawers) powered by **File Handler** and **parent module APIs**. Examples observed:
  - Risk, incident, task, CIP, audit, CQC, CRM, and expense report forms include file drop zones that upload via File Handler and save metadata on the parent record.
  - Compliance control evidence uses a dedicated evidence upload/list UI (`EvidenceAttachments`) calling Compliance APIs, not Attachment APIs.
  - Shared attachment row components show file name, type icon, download action, preview (modal or drawer), and delete where parent module permissions allow.

### Primary actions

- **Attachment module API actions** (create, list, get, soft-delete, restore, hard-delete): **backend-only; no confirmed UI buttons or menus.**
- **User attachment actions in the product** (upload, preview, download, remove on records): implemented in parent modules — **not wired to this module’s API.**

### Forms

- None for the Attachment module itself.

### Lists / tables / cards / detail views

- None for Attachment registry records. Parent modules display embedded attachment lists within their own detail forms and drawers.

### Navigation and workflow

- There is no user navigation path to “manage attachments” centrally. Attachment workflow for end users is always **within a parent record context** (for example adding files while editing a risk or incident).

### Material empty, loading, or restricted states

- Not applicable to Attachment module UI (no dedicated UI).
- In parent modules: empty attachment areas show placeholders such as *“No attachments found”* (Compliance evidence read-only view) or standard drop-zone hints (*“Drop files here or click to upload files”*). Upload progress and spinners are handled by File Handler drop-zone components in parent modules.

---

## 9. Miscellaneous / Module-Specific Information

### Relationship with File Handler (confirmed)

- **File Handler** owns upload, download, preview, and direct storage deletion mechanics.
- **Attachment** owns the **business association layer**: a persistent record linking file metadata to a module type and record ID.
- Creating an Attachment record **does not upload a file**. Callers must supply `fileMetaInfo` from an completed upload.
- Hard-delete on an Attachment record **does** delete the underlying stored file through the shared file manager — the only confirmed Attachment action that removes storage.
- Soft-delete on an Attachment record **does not** remove the stored file.

### Dual attachment patterns in the product

Two patterns coexist:

1. **Attachment module records** — central registry via `/attachments` API (this module).
2. **Embedded attachments** — file metadata arrays stored directly on parent business records (Risk, Incident, Task, Audit, etc.).

Pattern (2) is what **confirmed frontend and parent-module backend code** use today. Pattern (1) is **implemented but not integrated** into those flows in this repository.

### Intended linkable business record types (from Attachment model)

The Attachment model enum permits associations to: CIP, document repositories, incidents, risks, tasks, CQC significant events, CQC details, control statuses, customers, expense reports, leave records, document trees, carbon calculations, IMS projects, and IMS project work packages. **Presence in the enum indicates design intent; confirmed creation of Attachment records for these modules was not found outside the Attachment API itself.**

### Access and permissions

- Attachment routes sit **behind organisation authentication** (`authOrgAccess`) — user must be a logged-in organisation member (or approved external identity with organisation context).
- Attachment route definitions use **empty permission middleware arrays** — no module-specific IAM checks (for example Risk DELETE, Audit DELETE) on Attachment endpoints themselves.
- **Parent module attachment UI** applies its own permissions (for example risk attachment delete requires Risk Management DELETE permission; audit attachment delete requires Audit DELETE permission and is blocked on completed audits). Those rules apply to **embedded attachment** flows, not to the Attachment module API (which has no UI).

### Attachment lifecycle summary (Attachment module API)

| Stage | Confirmed behaviour |
| ----- | ------------------- |
| File provided | Caller supplies existing `fileMetaInfo` (upload happens elsewhere, typically File Handler). |
| Association created | Attachment record saved with module type, record ID, file metadata, organisation, creator. |
| View / list | Organisation-scoped retrieval with populated creator and organisation. |
| Soft-remove | Marks record deleted; file remains. **Reliability uncertain — see below.** |
| Restore | Clears soft-delete marker. |
| Hard-remove | Deletes Attachment record **and** stored file. |

### Embedded attachment removal (parent modules — for context only)

When users remove attachments through Risk, Incident, Task, or similar modules, confirmed backend behaviour **pulls the attachment entry from the parent record’s embedded array only**. **No confirmed automatic deletion of the underlying stored file** was found in those parent-module delete flows (for example risk and incident attachment delete). This differs from Attachment module hard-delete behaviour.

### Preview and download

- **Attachment module:** Does not expose preview or download. Consumers would need File Handler (or equivalent) using `fileMetaInfo` from the Attachment record.
- **Product generally:** Preview and download are available in parent modules via File Handler and shared UI components — **not through Attachment module records.**

### Frontend/backend discrepancy

| Area | Finding |
| ---- | ------- |
| Attachment API usage | Backend fully implemented; **frontend never calls `/attachments`**. |
| Naming | Frontend `EvidenceAttachments` uses `createAttachment` naming but calls **Compliance** APIs, not Attachment module. |
| Audit add-attachment endpoint | Backend `addAttachment` controller returns a **stub/placeholder response** (*“OFI removed.”* with empty audit) — **not a working add flow** via audit-specific attachment POST. Audits still support attachments through create/update with embedded metadata. |
| Module type validation vs model | Request validation accepts all defined module types; Attachment model enum is a **subset**. Unclear whether disallowed types fail at persistence. **[Requires verification]** |

### Unclear or partially implemented behaviour

- **Soft-delete reliability:** Service code does not await the existence check before soft-deleting. **Current behaviour could not be fully determined** — soft-delete may succeed at the database layer regardless, or may return incorrect responses. **[Requires verification]**
- **Who consumes the Attachment API:** No caller found in this repository besides the Attachment controller itself. External clients, scripts, or future integrations may use it — **not confirmed here.**
- **Whether parent modules will migrate** from embedded attachments to Attachment records — **not evidenced** in current code.
- **List filtering by module type or record ID** — backend supports generic organisation listing; **no confirmed consumer** applies business filters.

### Terminology

- **“Attachment” in UI/components** often refers generically to a file linked to a record, regardless of whether an Attachment module record exists.
- **“Attachment module”** specifically means the `/attachments` registry API and `attachments` data model described in this document.

None further.
