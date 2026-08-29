# File Handler

## 1. Module Overview

The **File Handler** module is a **shared supporting capability** in iMS. It does not have its own navigation entry or standalone screen. Instead, it provides the common mechanics for **uploading**, **accessing**, **previewing**, and **deleting** files that belong to business records across the product.

From the user’s perspective, file actions always appear **inside another module** — for example when attaching evidence to a compliance control, adding files to an incident, uploading a profile image, or downloading a document version. The File Handler makes those actions possible by preparing secure upload destinations, generating time-limited access for viewing and download, converting some document types for preview, and removing stored files when requested.

The module solves the problem of scattered file-handling logic: business modules own **what** a file means and **which record** it belongs to, while File Handler owns **how** the binary file is stored and retrieved in organisation-scoped (or, in limited cases, public) cloud storage.

Primary users are **any authenticated organisation user** who interacts with file upload, preview, or download controls embedded in other modules. There is no separate File Handler permission; access is gated by **login session** for File Handler operations themselves, and by **parent module permissions** for whether the user can reach the surrounding workflow.

---

## 2. Features and Capabilities

### Upload a file to storage

- **Capability:** Select or drag-and-drop a file and upload it to cloud storage before or while saving a parent business record.
- **Who uses it:** Users performing file upload actions in any module that uses the shared upload components or upload service.
- **Outcome:** File is stored; the application receives **file metadata** (original name, storage key, bucket) that the parent module saves on its record.
- **Conditions:** User must be logged in. Upload begins by requesting an upload destination, then the browser uploads directly to storage. Progress indicators show *Uploading…* with a percentage bar in the standard drop-zone component. Staged files can be removed before the parent record is saved.

### Download or open a stored file

- **Capability:** Download an attachment or open it via a time-limited access link.
- **Who uses it:** Users who click **Download** on attachment rows or use preview toolbars.
- **Outcome:** File downloads to the user’s device with its original filename, or opens in a preview viewer.
- **Conditions:** Requires authenticated session. Download uses a short-lived access link generated from the file’s stored bucket and key metadata held on the parent record.

### Preview a document or image in the application

- **Capability:** Open a modal or drawer preview without leaving the current screen.
- **Who uses it:** Users who click an attachment name or preview action in supported modules.
- **Outcome:** PDFs render in an in-app viewer; images display inline; Office documents (Word, Excel, PowerPoint) embed in an external document viewer frame; unsupported types show *Preview unavailable* with download option.
- **Conditions:** Preview support depends on file extension. Word documents used in **document signature placement** may use server-side conversion to PDF before preview.

### Delete a stored file

- **Capability:** Remove a file from cloud storage, typically when removing an attachment from a record or cancelling a staged upload.
- **Who uses it:** Users who delete attachments in parent modules, remove staged uploads, or when backend processes delete linked storage on record removal.
- **Outcome:** Stored object is deleted; UI removes the attachment row or clears the staged upload.
- **Conditions:** Usually paired with updating the parent business record (removing the metadata reference). Deleting storage alone does not automatically update parent records — the calling module handles that separately.

### Server-side document conversion for preview

- **Capability:** Convert office documents to PDF for in-browser preview in specialised workflows (for example signature placement on Word files).
- **Who uses it:** Document Management signature workflows and similar flows that call document preview.
- **Outcome:** User sees a PDF preview of a Word or office document.
- **Conditions:** Supported conversion formats: `doc`, `docx`, `xls`, `xlsx`, `ppt`, `pptx`, `csv`, and existing PDFs. Other formats return *Could not convert files* or *File preview not supported for this format*.

---

## 3. User Outcomes / End Results

- **Upload:** Attach evidence, documents, images, contracts, agendas, minutes, expense receipts, audit files, and other supporting material to business records across iMS.
- **View:** Preview PDFs, images, and Office files from attachment lists without downloading first.
- **Download:** Save attachments and document versions to the local device.
- **Remove:** Delete uploaded files when removing attachments, cancelling staged uploads, or when parent records are deleted (where implemented).
- **Information received:** File name, type icon, upload progress, preview content, and download confirmation through parent-module notifications.
- **Business actions enabled:** Evidence collection for compliance; incident and audit documentation; supplier contract management; CRM and invoice attachments; user profile branding; document repository storage; CQC register supporting files; and other record-linked file workflows.

---

## 4. Scope Boundaries

### In scope

- Preparing upload destinations for authenticated users.
- Generating time-limited view/download access from stored file metadata.
- Converting selected office formats to PDF for preview.
- Deleting stored objects when requested with a storage key.
- Shared frontend upload, preview, and download components used across modules.
- Organisation-scoped private storage (production) and optional public storage for specific branding uploads.

### Out of scope (handled elsewhere)

- **Attachment business records** — the separate **Attachments** module/API manages attachment entities linked to module types and record IDs (`createAttachment`, soft/hard remove with module context).
- **Document Management lifecycle** — versioning, signatures, repositories, and tree structure; Document Management uses File Handler for storage operations but owns document business logic.
- **Parent record permissions** — each business module decides who can add, view, or remove files on its records.
- **File metadata persistence on business records** — parent modules store `Name`, `Key`, `Bucket` (and sometimes version fields) on their own entities.
- **Standalone file library or file manager UI** — none exists.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **Compliance** | Upload and preview control evidence files; delete evidence attachments. |
| **Incident Management** | Attach files to incidents; download and delete attachments. |
| **Risk Management** | Attach supporting documents to risks; delete attachments. |
| **Task Management** | Attach files to tasks; delete attachments. |
| **OFI / CIP** | Attach improvement evidence; delete attachments. |
| **Audits** | Attach audit files; delete attachments; backend report generation uses temporary file handling. |
| **Management Review** | Upload agenda and minute documents. |
| **Supplier Management** | Upload SLA, contract, and onboarding documents. |
| **Inventory / Software Assets** | Attach documentation to assets; delete attachments. |
| **CRM / Customers / Invoices** | Customer attachments; invoice file download and delete. |
| **CQC** | Significant events, safeguarding, complaints, and site tool evidence attachments. |
| **Document Management** | Document storage, version download, signature placement preview, storage deletion on node removal. |
| **Organisation / Onboarding** | Organisation logo and banner upload (logo may use public storage bucket). |
| **Users** | Profile image upload and removal. |
| **Staff Wallet (Expense Reports)** | Receipt and supporting document attachments. |
| **Email Campaign** | Download campaign attachments. |
| **Attachments (API module)** | Creates attachment records with `fileMetaInfo`; hard remove also deletes underlying storage via File Handler. |

---

## 6. Current Data Model

The File Handler module **does not own a dedicated business entity** for files in the general case. Files are represented as **embedded storage metadata** on parent records or on the Attachments module.

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| **File metadata** (`fileMetaInfo` / `storageInfo` / `uploadInformation`) | Describes where a stored file lives: display name, storage key, bucket. | Returned after upload; saved by parent module; passed back for view, preview, download, and delete. |
| **Staged upload** (frontend-only until saved) | A file uploaded to storage but not yet linked to a saved business record. | User can remove before save; delete removes storage object. |
| **Attachment record** (Attachments module) | Optional persisted link between a module type, record ID, and `fileMetaInfo`. | Uses File Handler for hard-delete of storage; not all file workflows create attachment records. |
| **Temporary converted file** (server temp folder) | Short-lived PDF generated for document preview. | Created during preview conversion; deleted after response completes. |

Typical upload workflow:

1. User selects file in a parent module UI.
2. File Handler prepares upload destination (authenticated request).
3. Browser uploads file to storage.
4. Application receives metadata (`Name`, `Key`, `Bucket`).
5. Parent module saves metadata on its business record (or Attachments API creates a linked record).

---

## 7. Attributes

### File metadata (stored on business records)

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Name | Original filename shown to users | Required in validation schemas |
| Key / key | Unique storage identifier for the file | UUID-based key assigned at upload |
| Bucket | Storage container — organisation-private or public | Organisation bucket derived from organisation ID in production |

### Upload response metadata

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Upload URL | Temporary destination used by the browser to send the file | Expires after several hours |
| uploadInformation | Metadata bundle saved on parent records | Contains Name, Key, Bucket |

### Attachment record (Attachments module, when used)

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Module type | Which business area owns the attachment | Enum: incidents, risks, tasks, CIP, customers, etc. |
| Module | ID of the parent business record | |
| File metadata | Storage reference | Same Name/Key/Bucket structure |
| Created by | User who uploaded | |

---

## 8. Current UI Layout

### Standalone File Handler screen

**None.** All file functionality is embedded in other modules.

### Shared upload UI patterns

**File drop zone (standard)** — drag-and-drop area with hint *“Drag 'n' drop, or click to select files”*; shows attachment cards with filename, size, upload progress bar, trash icon to remove staged upload, and *Uploading…* / *Removing…* states.

**Image upload** — select/change/remove profile or logo image; crops to square; **2.5 MB size limit** for profile images; allowed types `png`, `jpg`, `jpeg`; shows preview thumbnail.

**Evidence drop zone (newer compliance UI)** — *“Drop files here or click to upload files”*; uploads then immediately creates control evidence records via Compliance module API.

**Form-embedded drop zones** — used across incidents, risks, tasks, CIP, audits, expense reports, and other forms via shared form element components.

### Shared attachment display UI

**Attachment row** — file-type icon, clickable filename (opens preview modal), optional *Modified by {user} on {date}*, **Download** button.

**Preview modal** — full-screen modal containing the shared file previewer (PDF viewer, image viewer, Office iframe, or unavailable message).

**Evidence attachment row (newer)** — icon, filename, dropdown with Download and Delete; opens document preview drawer on click.

### Preview behaviour by file type

| Type | User experience |
| ---- | ---------------- |
| PDF | In-app PDF viewer with toolbar |
| Images (jpeg, jpg, png, svg) | Inline image viewer |
| Office (doc, docx, ppt, pptx, xls, xlsx) | *“Preparing your document”* loading state, then embedded Office Online viewer |
| Other | *Preview unavailable* with download option |

### Download UI

- **Download** icon/button on attachment rows triggers browser download with original filename.
- Document Management version and signature actions also expose download.

### Delete UI

- Trash icon on staged uploads (before parent save).
- Delete/remove actions on attachment rows in incidents, risks, tasks, CIP, audits, CQC, compliance, CRM, suppliers, expense reports, etc.
- Profile image remove clears staged or saved image and deletes storage.

### Material states

- **Uploading:** progress bar and *Uploading…* label.
- **Removing:** spinner and *Removing…* on staged attachment card.
- **Loading preview:** *Preparing your document* spinner (Office); PDF viewer loading state.
- **Invalid attachment:** *“Invalid attachment. This attachment has been removed or not found.”*
- **Errors:** Generic failure notifications from parent modules (*“Attachment remove failed”*, *“Document download failed”*, *“Profile image can not exceed 2MB”*).

---

## 9. Miscellaneous / Module-Specific Information

### Confirmed nature of the module

File Handler is a **shared infrastructure capability**, not a standalone business module. Users never navigate to “File Handler”; they upload, preview, download, and delete files **in context** of incidents, compliance controls, documents, users, suppliers, and other records.

### Division of responsibilities

| Responsibility | Owner |
| -------------- | ----- |
| Storing and retrieving binary files | File Handler |
| Saving file metadata on business records | Parent business module |
| Who may attach/view/remove files on a record | Parent module permissions |
| Optional attachment entity with module linkage | Attachments module |
| Document versioning, signatures, repositories | Document Management |

### Upload workflow (confirmed)

1. User selects file in parent module.
2. Application requests upload URL (authenticated).
3. Server assigns UUID-based storage key and returns upload URL + metadata template.
4. Browser uploads file directly to storage.
5. Parent module receives metadata and saves it on create/update, or Attachments API creates a linked record.

Upload path label (e.g. `logo`, `banner`, `incidents`, `general`) is sent with the request but **does not change the storage key pattern** in the current implementation — keys are UUID-based filenames.

### Access and security (business perspective)

- All File Handler routes require an **authenticated session** (access token).
- File Handler routes are registered **before** organisation access middleware on the API router; they rely on session authentication rather than per-module RBAC.
- In production, **private uploads** use an organisation-specific storage bucket.
- **Public uploads** occur only when explicitly configured (observed: organisation onboarding logo upload to a public media bucket).
- View/download access links are **time-limited** (approximately half a day for viewing).
- File Handler **does not verify** that the requesting user owns or can access the parent business record when generating view links — it trusts the bucket/key supplied from the client. In practice, users only obtain keys from records they can already open, but **Current behavior could not be fully determined** as a formal parent-record authorization check on file access.

### File type and size restrictions

| Restriction | Where applied |
| ----------- | ------------- |
| Profile images: max 2.5 MB, png/jpg/jpeg only | Image upload component |
| General uploads: no backend file-type validation active | Server validation function always permits files |
| Drop zones: configurable accepted types per usage | **Observed but business purpose unclear** for most modules — many use unrestricted drop zones |

### Preview vs download

- **Preview** opens in-app modal/drawer; Office files use external Office Online embed with a signed link.
- **Download** saves file locally via signed link fetch.
- **Document preview API** (`getDocumentPreview`) server-converts office/PDF to temp PDF — used for signature placement on Word documents, not the standard attachment preview modal.

### Deletion behaviour

- **Staged upload delete:** removes storage object before parent record is saved.
- **Attachment delete in modules:** typically calls storage delete **and** updates parent record via module API (order varies by module).
- **Document node delete:** backend queue deletes underlying storage when document tree node is removed.
- **Attachments hard remove:** deletes both attachment record and storage object.
- Storage delete uses the authenticated user’s organisation bucket in production; **no observed check** that the key belongs to that organisation beyond bucket scoping on delete.

### Frontend / backend discrepancies

| Topic | Discrepancy |
| ----- | ----------- |
| Direct download endpoint | Frontend `downloadFileFromS3` / `getFileFromS3` call `GET /files/` which is **commented out** in routes; active download uses signed URL workflow via `downloadFile`. |
| Two drop-zone implementations | Legacy `CustomUpload/FileDropZone` uploads immediately to storage; newer `file-uploader/file-drop-zone` delegates upload to parent `onLoad` handler. |
| `useFiles` delete success message | Says *“Attachment downloaded successfully”* on delete — likely copy error. |
| `ALLOWED_FILE_PATHS` env variable | Imported in controller but **not used** in current handler logic. |
| `useLicense` / path header on upload | Upload path header sent but server generates UUID key regardless. |

### Unclear or unconfirmed behaviour

- Whether storage delete fails safely when file key belongs to another organisation’s bucket in non-production environments.
- Complete list of modules using Attachments API vs embedded metadata arrays only.
- Whether all module delete flows always remove storage when attachment metadata is removed (some may only remove reference).
- Formal authorization model tying file keys to parent record permissions at File Handler layer.
