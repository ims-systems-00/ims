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
