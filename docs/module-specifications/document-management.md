# Document Management

## 1. Module Overview

The **Document Management** module is a **standalone controlled document library** for an organisation. It lets users keep policies, procedures, legal files, and other formal documents in **repositories** (collections) organised into **folders**, with ownership, privacy, version history, optional approval before publication, electronic signature collection, and sharing.

A **managed document** in this module is not a generic file attached to another record. It is a **named organisational artefact** that lives in a repository, has a purpose (for example Policy or Process), can go through **authorisation** before it is published, can keep **previous versions**, and can be signed or shared independently of Risk, Incident, or other operational records.

The module solves the problem of keeping **controlled organisational documents** in one place: who owns them, who can see them, which version is current, whether they have been approved, and whether they have been signed. It is distinct from **Attachment** (supporting files on other business records) and from **File Handler** (upload, preview, and download mechanics used underneath).

Primary users are organisation members with **Document Management** access (typically Super Admin, Head of Service, Basic User, and Auditor roles) and a **Document Management partner licence**. External people can sign a document when they receive a signature invitation with limited access.

---

## 2. Features and Capabilities

### Browse repositories and document counts by purpose

- **Capability:** Open **Documents** from navigation and see an overview of published documents counted by purpose, plus a searchable list of repositories.
- **Who uses it:** Users with Document Management **Read**.
- **Outcome:** User sees totals for Process, Standard operating procedure, Policy, Document, Legal, and Miscellaneous published files, then can open repositories from the list.
- **Conditions:** Overview counts **published document files only**, organisation-wide. Repository list is organisation-scoped and further limited by **privacy** (see Miscellaneous).

### Create and maintain a document repository

- **Capability:** Create a named repository with description, privacy, owners (up to three), optional business unit, review interval, and optional audience for Custom privacy. Optionally copy **folder structure** from an existing repository (folders only, not files). Edit the same details later.
- **Who uses it:** Users with Document Management **Create** (create) and **Read** on the update route (backend update is gated by Read, not Update). UI create control is also wrapped in an **Inventory Create** check — see discrepancies.
- **Outcome:** Repository is created with a reference such as `REP-{number}`. Owners and users it is shared with are notified. New repository owners are added as document owners on existing files in that repository when owners change.
- **Conditions:** Name, privacy, and at least one owner are required. Business unit is required when privacy is **Business unit**. Review interval options: Yearly, Half yearly, Quarterly.

### Control who can see a repository (privacy)

- **Capability:** Restrict a repository to the whole organisation, one business unit, only the owner/creator, or a custom list of users.
- **Who uses it:** Repository creators and editors.
- **Outcome:** Listing rules hide repositories the user is not entitled to see. Super Admin and auditor roles see a broader organisational set; business-unit users see organisational repositories plus their unit, owned, created, or custom-shared repositories.
- **Conditions:** Privacy values: **Organisational**, **Business unit**, **Only me**, **Custom**. Listing matching on “owner” uses a field name that does **not** match the stored **owners** list — **Current behavior could not be fully determined** for “Only me” visibility (see Miscellaneous).

### Organise content in folders

- **Capability:** Create folders, rename them, move them (and their document family) within the repository or to another repository, and navigate a folder path.
- **Who uses it:** Users with Document Management **Create** (create/move) and **Update** (rename).
- **Outcome:** Users browse a folder tree like a file library. Folder names must be unique among siblings. Depth is limited (maximum 20 nested folders). A folder may have at most 100 distinct sibling names.
- **Conditions:** Duplicate folder names at the same location are rejected.

### Add managed documents (upload files)

- **Capability:** Upload one or more files into a repository location, set purpose, owners, optional applicable modules, optional compliance toolkits, and optional authorisers.
- **Who uses it:** Users with Document Management **Create**.
- **Outcome:** Each new file becomes a **document node** with reference `DOC-{number}`. If authorisers are selected, the document starts as **Pending**; otherwise it is **Published**. Files that already exist at the same location and name are **skipped** (not overwritten). Repository owners and the uploader are included as document owners (up to five owners).
- **Conditions:** File content is uploaded through **File Handler** first; Document Management stores file location metadata on the document. Duplicate name at the same folder is not created as a second copy.

### Publish, approve, or reject a document (authorisation)

- **Capability:** Send a new document or a new version for **authorisation**. Authorisers approve or reject. Add or remove authorisers while the document is still Pending.
- **Who uses it:** Uploader (assigns authorisers); named authorisers (approve/reject); users with Document Management access to the authorisation panel.
- **Outcome:**
  - **Pending:** Waiting for all authorisers.
  - **Published:** All authorisers approved (or no authorisers were required). Previous published version of the same name in the same folder is **Archived**.
  - **Rejected:** Any authoriser rejects; document does not become the live published version.
- **Conditions:** A new version cannot be added while a **Pending** version of the same name already exists. Authorisers can only be added/removed on **Pending** documents. Notifications are sent for authorisation requests and decisions.

### Maintain versions and replace a pending file (revision)

- **Capability:** Upload a **new version** of an existing published document (same file name and type). While a version is Pending, replace the file (**revision**) without creating a new version record.
- **Who uses it:** Users with Document Management **Create**.
- **Outcome:** New version inherits purpose, modules, toolkits, and owners from the published version. Version number (`dvID`) increments when a version becomes Published. Users can open a versions list on the document. Revision replaces the stored file and deletes the previous stored file via File Handler.
- **Conditions:** New version requires a published original. Revision is allowed **only** on Pending documents and only if the replacement file has the **same name**.

### Collect electronic signatures

- **Capability:** Invite internal users and/or external email addresses to sign a published document, place signature locations on pages, resend invitations, remove invitees, and apply a signature (name, scripted signature, job title, organisation).
- **Who uses it:** Document users with Read (invite); invited internal users; external invitees via a time-limited permission token.
- **Outcome:** Each invitation is a signature request (**Pending**, then **Signed**). Signing stamps the document copy; a signed PDF copy is stored. Notifications go out when a document is signed. Internal and external resend flows exist.
- **Conditions:** Signature placement positions must be valid. External signing uses a **public** signature path with a permission token and limited access. **Implementation suggests** a **Reviewed** status exists on the signature record; **confirmation is required** whether users can mark Reviewed without signing.

### Share a document by email

- **Capability:** Send selected email addresses a message and a time-limited view link to the document file.
- **Who uses it:** Users with Document Management **Read** (share route is gated by Read).
- **Outcome:** Recipients can open the file via a generated view link (view access lasts seven days; an associated access token is created for two days). Activity is recorded that the document was shared.
- **Conditions:** Sharing uses File Handler to generate the view link. The source file is not stored as an Attachment module record.

### Preview and download documents

- **Capability:** Preview the current file in the application and download the stored file or a signed copy.
- **Who uses it:** Users who can open the document (and signature invitees for signing/preview flows).
- **Outcome:** In-app preview (File Handler previewer). Download uses File Handler with the document’s stored file metadata.
- **Conditions:** Preview/download availability follows File Handler support for the file type.

### Search, filter, and pick documents from other modules

- **Capability:** Search repositories and folder contents by name/reference. Filter repository lists by privacy. From Risk, Incident, CIP, Audit, Supplier, Management Review, and Compliance toolkit screens, search and select published documents that apply to that module or toolkit.
- **Who uses it:** Document Management users; users of those operational modules who link documents.
- **Outcome:** Users find documents without browsing the whole tree. Other modules can attach **references to managed documents** for evidence or related policy.
- **Conditions:** Cross-module picker is filtered by applicable modules / compliance tools stored on the document. Organisation-wide document list exists on the backend for this picker.

### Move documents to recycle bin, restore, or permanently delete

- **Capability:** Soft-delete a repository or a document/folder family (same name in the same location), restore from recycle bin, or permanently delete.
- **Who uses it:** Users with Document Management **Delete** (backend). Recycle bin UI is shown on the Documents page Recycle Bin tab.
- **Outcome:** Soft-delete message *“moved to bin”*. Restore returns items if the live location does not already have a published item of the same name. Permanent repository delete is queued; a repository **cannot** be deleted if it is linked to an **IMS Project**. Permanent node delete is queued in the background.
- **Conditions:** Cannot soft-delete if the same published name already sits in the bin. Cannot restore if a published copy already exists in the live folder.

### Update document information

- **Capability:** Change purpose, applicable modules, compliance toolkits, and owners on a document. The change applies to **all versions** of that document name in the same repository location.
- **Who uses it:** Users with Document Management **Update**.
- **Outcome:** Metadata is aligned across the version family. Compliance toolkit selection appears when applicable modules include compliance controls.

### View document activity and audit trail

- **Capability:** See activity/timeline and an audit trail on a document, plus comments-style activity on the repository.
- **Who uses it:** Users viewing a document or repository they can access.
- **Outcome:** History of sharing, authorisation, versions, and related events as recorded by the Activity module.
- **Conditions:** Activity is produced by Document Management events; the Activity module stores and displays it.

### Copy repository folder structure when creating (including from projects)

- **Capability:** When creating a repository, optionally copy folders from a source repository. Creating an **IMS Project** also creates a linked repository and can copy folders from a template project’s repository.
- **Who uses it:** Repository creators; project creators (indirectly).
- **Outcome:** Empty folder structure is duplicated; **files are not copied** in the confirmed copy logic.

---

## 3. User Outcomes / End Results

- **Create:** Repositories, folders, managed documents, new versions, signature invitations, authorisation assignments, email shares.
- **View:** Repository list and overview counts; folder contents; document preview; versions; signature requests; authorisation status; next review date (calculated from repository created date and review interval).
- **Manage:** Privacy and owners; move/rename; recycle bin; link documents from other modules; collect signatures; approve or reject pending versions.
- **Change:** Document purpose, owners, applicable modules, toolkits; replace a pending file; publish via unanimous approval.
- **Information received:** References (`REP-` / `DOC-`), status (Pending / Published / Rejected / Archived), owners, privacy, review interval, notifications for ownership, sharing, authorisation, signing, and revisions.
- **Business actions enabled:** Maintain a controlled document set for ISO/CQC-style work, prove current published version, gather approvals and signatures, share files with people outside the system, and reuse documents from operational modules without treating them as disposable attachments.

---

## 4. Scope Boundaries

### In scope

- Repositories, folder trees, and managed document records (including versions, authorisation, signatures, share-by-email, recycle bin).
- Document purpose classification and overview counts.
- Privacy-based repository visibility.
- Cross-module document picker (search and select managed documents).
- Notifications and activity generated by document events.
- Partner licence gate for Document Management screens.

### Out of scope (handled elsewhere)

- **File Handler** — upload destinations, preview conversion, download links, deleting stored binaries (used by this module, not owned by it).
- **Attachment module** — registry of files on arbitrary business records; Document Management does **not** create Attachment records.
- **Generic attachments on risks/incidents/etc.** — those modules store their own embedded file lists separately from managed documents.
- **IMS Project work package planning** — projects **create and link** a repository; project work itself is not Document Management.
- **Task Management** — tasks can be linked to document nodes (source-delete behaviour); tasks are not authored here.
- **Compliance toolkit administration** — documents can be tagged with toolkit names; control implementation is Compliance.
- **Tags and Categories module** — not confirmed as the way documents are organised (purpose and folders are).
- **Charts module** — not used for document visualisations; overview is count cards, not Charts definitions.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **File Handler** | Uploads files, previews and downloads them, generates time-limited view links for email share, deletes stored files when a pending document is revised. |
| **Users / IAM Groups (Business Units)** | Repository privacy and business unit; document and repository owners; internal signature invitees; authorisers. |
| **Notifications** | In-app (and in several flows email) alerts for new owners, shares, authorisation requests/decisions, revisions, and signatures. |
| **Activity** | Timeline entries when documents are shared, authorised, versioned, or signed. |
| **Organisation / Licensing** | Document Management partner licence required on UI routes. |
| **IMS Projects** | Creating a project creates a linked repository (and can copy folder structure). A repository linked to a project cannot be deleted until that link is cleared. |
| **Task Management** | Tasks can be sourced from document nodes; deleting a document can affect linked tasks via source-delete behaviour. |
| **Compliance** | Documents can list applicable compliance toolkits; toolkit screens can search/select those documents as related evidence. |
| **Risk Management, Incident Management, CIP, Audits, Suppliers, Management Review** | Users can search and select managed documents that declare those modules as applicable. |
| **CRM / Expense reports** | Listed as allowed “applicable module” values on the document model; **no confirmed dedicated picker UI** in those modules was verified in this investigation. |

---

## 6. Current Data Model

A **dedicated Document Management data model exists**, as three persistent record types (plus queued background jobs that are not user-visible history).

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| **Repository** | A collection (library) of folders and documents with privacy, owners, and review interval | Top-level container. Organisation-scoped. Soft-deletable. Auto reference `REP-{number}`. |
| **Document tree node (folder)** | A named folder inside a repository | Organises documents. Nested under a parent folder or at repository root. |
| **Document tree node (document)** | A managed document version at a folder location | Holds file metadata, purpose, owners, authorisation list, applicable modules, toolkits, version number, thread id (version family), status. Auto reference `DOC-{number}`. |
| **Signature request** | An invitation for an internal user or external email to sign a document | Tracks status, signature appearance, page locations, and signed copy. Organisation-scoped. |
| **Authorisation entry** | Embedded on a document: who must approve and current Pending/Approved/Rejected | Drives publish vs reject. |
| **Overview counts** | Calculated totals of published documents by purpose | Not stored; computed on request. |

Document **file bytes** are not stored in these records. The document holds **file metadata** (name and storage location) produced by File Handler.

**No persistent import-job or document-review-calendar record** was found. Next review date on the repository list is **calculated in the UI** from created date and review interval — it is not a scheduled review workflow.

---

## 7. Attributes

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| **Repository name / description** | How users recognise the library | Name required. |
| **Repository reference** | Stable identifier (`REP-…`) | Assigned on create. |
| **Privacy** | Who may see the repository | Organisational, Business unit, Only me, Custom. |
| **Business unit** | IAM group the repository belongs to | Required when privacy is Business unit. |
| **Repository owners** | Up to three users accountable for the library | Creator is included. Changes propagate to document owners. |
| **Shared with** | Extra audience when privacy is Custom | Also used when sharing a repository with named users. |
| **Review interval** | How often the library should be reviewed (Yearly / Half yearly / Quarterly) | Displayed with a calculated **next review date**. No confirmed automated review task. |
| **Document / folder name** | Display name; for documents this is the file name | Uniqueness at the same location. New versions must keep the same name. |
| **Document reference** | Stable identifier (`DOC-…`) | Assigned on create. |
| **Type** | Folder vs document | Determines available actions. |
| **Status** | Lifecycle of a document version | Pending, Published, Rejected, Archived. Default Published. |
| **Purpose** | Business class of the file | Process, Standard operating procedure, Policy, Document, Legal, Miscellaneous. Drives overview cards. |
| **Document owners** | Up to five people responsible for the document | Includes uploader and repository owners at create. |
| **Applicable modules** | Which operational areas this document is meant to support | Used by the document picker in other modules. |
| **Compliance tools** | Which compliance toolkits the document relates to | Shown when applicable modules include compliance. |
| **Authorisation status / authoriser** | Who must approve a pending version and their decision | Pending / Approved / Rejected per person. |
| **Version number (`dvID`)** | Sequence of published versions in the same folder and name | Increments when a version is published. |
| **Thread id** | Links all versions of the same document family | Assigned on first version. |
| **File metadata** | Original file name and stored location | Required to preview/download. |
| **Signature status** | Pending / Reviewed / Signed on an invitation | Signed stores appearance and signed copy. |
| **Signature locations** | Where on which page the signature is placed | Required when inviting signatories. |
| **Conformance %** | Optional percentage shown on the document | Displayed if value is zero or greater. **Observed but business purpose unclear** (who sets it was not confirmed in UI). |
| **Classification** | Optional string on the document model | **Implementation suggests** it was moved from repository to document; **not confirmed** as a user-facing field in current forms. |
| **Created / modified** | Who created or last changed the item and when | Shown in lists and detail. |

---

## 8. Current UI Layout

### Main screens / pages

- **Standalone navigation:** **Documents** → `/admin/document-repositories` (icon: folder). Requires Document Management Read, listed roles, and Document Management partner licence.
- **Tabs on the list page:** Overview, Repositories, Recycle Bin.
- **Repository detail:** `/admin/document-repositories/:id` (not in main nav).
- **Document detail:** `/admin/document-repositories/:id/nodes/:nodeId` (also a public layout route for limited-access signing).
- **Authorisation panel / add signee / signatures:** nested paths under a node (not in main nav).
- **Signature requests:** `/admin/document-signatures/requests` exists but is **not shown in navigation** (`invisible`).
- **Insight by purpose:** `/admin/document-repositories/document-overview/:purpose` is **invisible** in nav.

An older panel-based layout (`Overview` / `New repository` / `Repositories` / `Recycle bin`) still exists in code; the **active list route** uses **Overview / Repositories / Recycle Bin** tabs, with create via a **Create** drawer (permission-wrapped).

### Important sections and views

**Overview tab:** Cards for overall total and counts by purpose (Documents, SOPs, Policies, Processes, Legal, Miscellaneous). Loading spinner while counts load.

**Repositories table:** Columns for reference, business unit, name, owners, review interval, next review date. Search. Create button. Row actions include open, edit, move to recycle bin. Empty display uses *“No data found”* / untitled name fallback.

**Recycle Bin tab:** Deleted repositories with search, restore, and permanent delete.

**Repository workspace:** Header (name, actions, recycle bin for contents), folder path navigator, table of child folders/documents (name, owners, dates, file-type icons). Empty repository illustration when no children. Error: *“This repository has been deleted or removed”*.

**Document page:** Preview of the file; metadata (download); versions table; signature badges/table; authorisation form; share form; request signatures; add revision; upload new version; document information form; conformance bar if present; timeline/audit trail; alerts for pending authorisation or signature.

**Other modules:** Searchable document picker (list + tabs) to select published documents.

### Primary actions

- Create/edit repository; filter by privacy (Organisational, Business unit, Shared with me, Only me) where the older table filters are wired.
- Create folder; upload documents; open folder or document.
- Preview, download, share, request signatures, sign, authorise/reject, add version, revise pending file, edit information, move, recycle, restore, delete permanently.

### Forms

- Repository: name, description, privacy, business unit, owners, review interval, shared with.
- Folder: name.
- Upload document: file drop zone, purpose, owners, authorisers (optional), applicable modules, compliance tools.
- Share: emails and message.
- Signature: name, signature, font, job title, organisation.
- Authorisation: approve/reject with message.
- Confirmation to type for some destructive flows where implemented on rows.

### Lists / tables / cards / detail views

- Repository and recycle-bin data tables with pagination and search.
- Folder contents table.
- Versions table and signatures table on the document.
- Overview count cards.

### Navigation and workflow

Documents (list) → open repository → browse folders → open document → preview / approve / sign / version. Other modules open the picker without leaving their screen. External signers use a limited-access document URL.

### Material empty, loading, or restricted states

- Loading on overview, tables, and repository load.
- Empty repository graphic; table *No data found*.
- Create/migrate-style buttons disabled while busy.
- Recycle and delete confirmations.
- Pending authorisation blocks adding another version (backend error shown to user).
- Signature-only file types: UI checks whether signing is allowed for the file type.
- Without Create permission, older layout hid New repository and Recycle bin; the current tabbed page **still shows Recycle Bin** to Read users. Create button uses **Inventory Create** in addition to Document Management — users with Document Management Create but not Inventory Create may **not** see Create.

---

## 9. Miscellaneous / Module-Specific Information

### What a managed document is (vs Attachment vs File Handler)

| Concept | Role |
| ------- | ---- |
| **Document Management** | Owns the **business lifecycle**: repository, folder, version, approval, signature, privacy. |
| **File Handler** | Owns **storing and retrieving the file** (upload, preview, download, delete object). |
| **Attachment module** | Separate **file-to-record registry** used little by the product UI; **not** how Document Management stores documents. |
| **Attachments on other records** | Supporting files embedded on risks, incidents, etc. — **not** these controlled documents. |

### Confirmed lifecycle (document versions)

1. **Create/upload** → Published immediately if no authorisers; otherwise **Pending**.
2. **Authorisers approve all** → **Published**. Any previous Published version with the same name in the same folder becomes **Archived**.
3. **Any authoriser rejects** → **Rejected**.
4. **New version** of a Published document → new node, Pending or Published depending on authorisers.
5. **Revision** (Pending only) → same node, new file, old file removed from storage.
6. **Soft-delete** → recycle bin (not a status change to Archived). **Archived** means **superseded version**, not the recycle bin.

There is **no confirmed expiry or automatic archival** from review interval. Review interval is **informational** (next review date on the list).

### Review vs approval vs signing

- **Review interval:** repository planning hint only.
- **Authorisation:** approval workflow that **publishes** a version.
- **Signature:** separate e-sign workflow on (typically) published documents; does not replace authorisation.

### Access and permissions (business-visible)

- Authenticated organisation session required for normal routes.
- **Document Management** service: Create, Read, Update, Delete used on different actions (create repository/nodes vs update metadata vs delete/restore).
- **Update repository** backend uses **Read**, not Update.
- **Share document** backend uses **Read**.
- UI roles: Super, Head of Service, Basic, Auditor; plus partner **Document Management** licence.
- External signers: permission token + limited access, not a full organisation login.
- Repository list is further scoped by privacy and role (auditors/super vs business-unit users).

### Relationship with IMS Projects

Creating a project creates a Document Management repository for project content. Deleting that repository is blocked while the project still points at it.

### Frontend/backend discrepancies

| Area | Finding |
| ---- | ------- |
| Create button permission | UI `Can` policy uses **Inventory Create**, not Document Management Create. |
| Recycle Bin visibility | Current tabs always include Recycle Bin; older layout hid it without Create. |
| Privacy listing | Query matches `owner` (singular) while records store `owners` (array). **Only me** / owner-based listing may not work as intended. **[Requires verification]** |
| Repository update permission | Backend allows update with **Read**. |
| Ownership pre-check | Backend “check document ownership” compares creator using an undefined request object — **not a reliable business rule**. |
| Process requirements check | Looks for `authRequired` / `signRequired` on `data`, while documents store `documentData` — **current behavior could not be fully determined**. |
| Excel/overview Insight route | Purpose insight route is registered but **invisible** in navigation. |
| Signature **Reviewed** status | Present on the data model; UI signing flow emphasises **Signed**. |
| Purpose “Policies” vs “Policy” | Internal deprecation note mentioned renaming to Policies; **current UI and counts use “Policy”**. |
| `Repositories.jsx` vs `RepositoriesTableIndex` | Two list UIs; **the route uses TableIndex**. |
| Applicable modules for invoices/expense reports | Allowed on the model; **picker usage not confirmed** in those modules. |

### Constraints users can hit

- Maximum 20 folder depth; 100 distinct names per folder level.
- Maximum 3 repository owners; 5 document owners.
- Cannot add a version while a pending authorisation exists for that file name.
- Cannot delete a repository linked to an IMS Project.
- New documents with an existing name at the same location are skipped on bulk upload.

### Unclear or partially implemented behaviour

- Whether **Reviewed** is a user-facing signature step. **[Requires verification]**
- Who writes **conformance %**. **Observed but business purpose unclear.**
- Whether **classification** is still used in UI. **[Requires verification]**
- Reliability of **Only me** privacy in lists (owner field mismatch). **[Requires verification]**
- Whether completion of signatures changes document **status** (it does not in confirmed authorisation logic; status is independent).
- Recycle bin for **documents inside a repository** vs **whole repositories** (both exist; document recycle is from repository “view recycle bin” / node actions).

None further.

---

## 10. Additional features confirmed from V4 re-audit

> Re-checked against `ims-systems-backend` and `ims-systems-frontend` Document Management code before the V5 build.  
> **Do not remove or rewrite sections 1–9.** This section only adds capabilities that were missing, under-specified, or previously marked unclear.

### Set and display review dates on documents and folders

- **Capability:** Set an explicit **document review date** on a managed document (and optionally on a **folder**). Display repo review interval, folder review date, and document review date on the document page.
- **Who uses it:** Users with Document Management **Update** (document/folder metadata forms); viewers see the dates on About / Meta information.
- **Outcome:** Document stores `documentData.reviewDate`; folder stores `folderData.reviewDate`. New versions **inherit** the published version’s review date. UI falls back: document date → parent folder date → repository review interval–derived date.
- **Conditions:** Distinct from repository **review interval** (Yearly / Half yearly / Quarterly). Both exist in product.

### Send automated document review reminders

- **Capability:** Organisation-configured advance reminder offsets plus an always-on **on-the-day** reminder for documents whose `documentData.reviewDate` matches the target calendar day.
- **Who uses it:** Document owners (recipients); schedule runs for all organisations (backend cron, daily at midnight).
- **Outcome:** In-app notifications such as *Document "…" is due for review today* or *… This is your N reminder*. A **document review reminder ledger** (`documentreviewreminders`) records entity, offset, review-date snapshot, recipients, and sent time so the same reminder is not sent twice.
- **Conditions:** Organisation field `documentReviewReminderOffsets` selects advance offsets (`3_months`, `2_months`, `1_month`, `3_weeks`, `2_weeks`, `1_week`, `5_days`, `1_day`). Offset `on_day` is always included. Only non-deleted document nodes are considered.

### Calculate and show signature conformance %

- **Capability:** Show a **conformance** percentage on the document (purpose label + progress bar) based on how many signature invitations are **Signed**.
- **Who uses it:** Anyone viewing the document detail when conformance ≥ 0.
- **Outcome:** Backend recalculates `documentData.conformance` as `floor(signed / totalSignatures * 100)`. If there are no invitations, value is **-1** (hidden in UI). When invitations are first created, conformance is set toward **0**; when every invitation is Signed, a **full conformance** activity/notification event can fire.
- **Conditions:** Driven by signature invite/sign/remove flows (including background signature queues), not by manual user entry on the information form.

### Copy folder structure across organisations (Super Admin)

- **Capability:** When copying folder structure into a repository, Super Admins can pick a **source organisation** (where they are also Super Admin) and one of that org’s repositories, then copy folders only.
- **Who uses it:** Super Admin.
- **Outcome:** Same empty folder hierarchy duplication as in-org copy; optional `sourceOrgId` on copy. Endpoint lists eligible orgs/repos: `GET …/document-repositories/cross-org-copy-sources`.
- **Conditions:** Non–Super Admins cannot list cross-org sources (forbidden). Files are still not copied.

### Move a node into another repository

- **Capability:** Move a folder or document family from one repository into another repository (not only within the same repository tree).
- **Who uses it:** Users with Document Management **Create** (same gate as in-repo move).
- **Outcome:** `change-repository` updates the node family’s `repository` (and parent). UI can move content between libraries.
- **Conditions:** Backend notes edge cases if a same-named folder already exists at the target level — treat as fragile; validate carefully in V5.

### Reuse previous signees (“preserved reviewers”)

- **Capability:** Load users/emails previously invited to sign a document node when requesting signatures again.
- **Who uses it:** Users preparing new signature invitations on a node.
- **Outcome:** `GET …/nodes/:nodeId/preserved-reviewers` returns prior signature invitation users for that node.
- **Conditions:** Backed by the signatures collection for that node (naming says “reviewers”; behaviour is signature invitees).

### Place signature boxes on document pages before inviting

- **Capability:** Interactively place one or more **signature locations** (page number + relative X/Y) on the document preview, then attach those locations to internal and/or external signature invitations.
- **Who uses it:** Users requesting signatures.
- **Outcome:** Each invitation stores `data.signatureLocations[]`. Signing stamps at those coordinates on the generated signed PDF.
- **Conditions:** At least one valid location is required; backend validates locations before enqueueing invites.

### Process signature invites and resends asynchronously

- **Capability:** Creating internal/external signature invitations and resending them runs through **background queues** (Bull/Redis), not only inline request handlers.
- **Who uses it:** Transparent to end users; operators need Redis for reliable delivery.
- **Outcome:** Queues observed: add internal signatures, add external signatures, resend internal, resend external. Permanent **node** and **repository** deletes also use dedicated delete queues that remove File Handler storage.
- **Conditions:** Same product behaviour as synchronous invite from the user’s perspective; failure modes depend on queue workers being up.

### Email the signed PDF copy to the signee

- **Capability:** After a successful sign, email the signee a **signed copy** of the document.
- **Who uses it:** Internal and external signees.
- **Outcome:** Dedicated email template/event (`sendSignedCopyToSignee`) in addition to in-app “document signed” notifications and share/ask-for-signature emails.
- **Conditions:** Requires email infrastructure; signed file metadata is on the signature record (`data.signedCopy`).

### Push live signature invitation updates over WebSocket

- **Capability:** Notify the invited internal user in real time when a new signature request is created.
- **Who uses it:** Internal invitees with an active socket session.
- **Outcome:** Socket event `new-document-signature-info` pushed to the user’s room.
- **Conditions:** Depends on WebSocket being enabled; complements in-app notifications and email.

### Invalidate limited-access token after external signing

- **Capability:** After an external (or token-based) signature is completed, invalidate the public access token used for that signing session.
- **Who uses it:** External signees on the public signature route.
- **Outcome:** Middleware `invalidatePublicAccessToken` runs after successful `handleSignature` so the time-limited link cannot be reused indefinitely.
- **Conditions:** Public route `PUT …/nodes/:nodeId/signatures/:signatureId` with signature permission middleware (no full org login).

### Track signature open and sign timestamps

- **Capability:** Record when a signature invitation was last opened and when it was signed; store a security token on the invitation.
- **Who uses it:** System / audit / limited-access flows; may surface in signature request UIs.
- **Outcome:** Fields on signature records: `securityToken`, `lastOpenedAt`, `signedAt`, plus invitation `message` and Internal/External `type`.
- **Conditions:** Complements status Pending / Reviewed / Signed.

### Run pre-flight checks before upload or process gates

- **Capability:** Before certain UI actions, call repository **checks** APIs: whether a pending authorisation already exists for a file name at a location; whether the current user “owns” that document context; whether process requirements (auth/sign flags) apply.
- **Who uses it:** Frontend upload / process flows (headers `x-doc-parentnode`, `x-doc-filename`, `x-doc-nodeid`).
- **Outcome:** Endpoints under `…/checks/pending-node`, `…/checks/document-ownership`, `…/checks/process-requirements`.
- **Conditions:** Ownership and process-requirements implementations have known reliability issues (see section 9 discrepancies); still part of the live API surface and must be accounted for or deliberately redesigned in V5.

### Browse published documents by purpose (insight list)

- **Capability:** From overview purpose cards, open a **purpose-filtered list** of published documents (Processes, SOPs, Policies, Documents, Legal, Miscellaneous).
- **Who uses it:** Users with Document Management Read who follow overview navigation.
- **Outcome:** Dedicated analytics/list UI (`document-overview/:purpose`) backed by document-tree listing filters.
- **Conditions:** Route exists; nav entry may be invisible — feature is still implemented and used from overview cards.

### List organisation-wide document tree nodes for pickers

- **Capability:** Query **all** document tree nodes in the organisation (not only one repository) for searchable pickers in other modules.
- **Who uses it:** Compliance, Risk, Incident, CIP, Audit, Supplier, Management Review, and similar Related Documents UIs.
- **Outcome:** `GET /document-trees` (org-scoped list) with filters such as status Published and applicable modules / compliance tools.
- **Conditions:** Requires Document Management Read. This is the cross-module picker data source called out in section 2.

### Link IMS Project work packages to managed documents

- **Capability:** Associate an IMS Project **work package** with a managed document tree node.
- **Who uses it:** Project planners (IMS Projects module); Document Management supplies the document record.
- **Outcome:** Persistent relationship entity (`imsprojectworkpackagedocumentrelationships`: `parentWorkPackage` + `linkedDocument`). Separate from “project creates a repository”.
- **Conditions:** Owned primarily by IMS Projects; Document Management must not break linked document ids on delete without project rules.

### Contribute document utilisation to digital maturity stats

- **Capability:** Organisation **digital maturity / analytics** stats include Document Management utilisation signals derived from repositories/trees.
- **Who uses it:** Stats / dashboard consumers (not a Documents nav screen).
- **Outcome:** Backend stats service reads document data for maturity scoring.
- **Conditions:** Out of Documents UI scope but a confirmed backend consumer of DM data.

### Activity and notification event catalogue (confirmed emitters)

Confirmed Document Management–driven activity/notification themes in V4 (for V5 parity planning):

| Event theme | When it fires |
| ----------- | ------------- |
| Authorisation request sent | Authorisers assigned / pending approval requested |
| Authorisation reviewed | Authoriser approves or rejects |
| Document version added | New version uploaded |
| Document revision added | Pending file replaced |
| Document shared via email | Share-by-email succeeds |
| Signature request sent | Internal/external invites created |
| Document signed | Invitee completes signature |
| Document full conformance | All signature invites Signed (100%) |

### Background infrastructure the module depends on

| Mechanism | Role |
| --------- | ---- |
| **File Handler** | Upload, view, download, delete binaries; share view links |
| **Bull/Redis queues** | Signature invite/resend; hard-delete nodes and repositories |
| **Email templates** | Ask for signature; share document; send signed copy to signee |
| **Permission / token store** | Limited access for external signing and share links |
| **WebSocket** | Live signature invitation push |
| **Cron** | Daily document review reminders |
| **Activity + Notifications** | Timeline and in-app alerts for the events above |

### Data model additions not fully listed in section 6

| Entity / field | Business meaning |
| -------------- | ---------------- |
| **Document review reminder ledger** | Idempotent record of which reminder offset was sent for which document review date |
| **`documentData.reviewDate`** | Explicit next review date on a document |
| **`folderData.reviewDate`** | Optional review date on a folder |
| **`documentData.conformance`** | Signature completion % (−1 = none / hidden) |
| **Signature `securityToken` / `lastOpenedAt` / `signedAt` / `message` / `type`** | Invite security and audit fields |
| **Work package ↔ document relationship** | Project planning link to a managed document |

### Applicable modules and compliance tools (canonical enums)

**Applicable modules** on a document (picker filters): risks, cips (OFI), audits, compliance controls, management reviews, suppliers, incidents, expense reports.

**Compliance tools** taggable on a document (subset used by toolkit screens): DSPT NHS, ISO 27001, ISO 27001:2022, ISO 27001:2022 Annex A, ISO 27002, ISO 9001, ISO 45001, ISO 20000, CQC, BS 9997, ISO 14001, CRM, ISO 15686-5, ESG Environmental / Governance / Social.

### Frontend surface map (for V5 parity checklist)

| Area | Confirmed screens / flows |
| ---- | ------------------------- |
| List | Overview / Repositories / Recycle Bin tabs; create/edit repository drawer |
| Repository | Folder path, contents table, upload, create folder, copy folder structure (incl. cross-org for Super Admin), recycle contents |
| Document | Preview, versions, information (incl. review date), authorisation, share, signatures, conformance, activity/audit |
| Signatures | Request signatures (placement + internal/external + message); org signature requests list; resend; sign form; public limited-access sign |
| Pickers | Searchable document list used from other modules / compliance evidence |
| Insight | Purpose-filtered published document list from overview |

### Build notes for V5 (do not lose these)

1. Treat **review dates + reminder ledger + org offsets** as in-scope product behaviour (not “informational only”).
2. Treat **conformance** as system-calculated from signatures.
3. Plan **queues** (or an equivalent async strategy) for signature invite/resend and hard deletes early.
4. Preserve **public signing + token invalidation** and **signed-copy email** when implementing e-sign.
5. Expose **org-wide document list** for Compliance and Related Documents even if full DM UI ships later.
6. Keep **cross-org folder copy** Super-Admin-only.
7. Decide deliberately whether to **port, fix, or drop** the fragile ownership / process-requirements checks.

None further (section 10).
