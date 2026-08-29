# Compliance

## 1. Module Overview

The Compliance module helps organisations track their posture against standards and regulatory frameworks—such as ISO 9001, ISO 27001, ISO 45001, DSPT NHS, Building Safety Act, and ESG—by managing **controls**, recording **implementation status**, attaching **evidence**, and viewing **compliance progress** over time.

Its primary business purpose is to give users a structured way to see which standard clauses apply to their organisation, mark controls as in scope and implemented, link proof from elsewhere in the system (risks, incidents, improvement plans, documents, files), and understand overall compliance percentage at toolkit and section level.

It solves the problem of scattered compliance tracking by centralising standard requirements as a control register per licensed toolkit, with progress roll-up, overview metrics, and bidirectional links to operational modules that serve as implementation evidence.

Primary users are people with Compliance Tool read access and a valid licence for the relevant toolkit—typically Super Admins, Internal/External Auditors, and users in compliance or administration roles. Toolkit visibility is further limited by organisation licence entitlements. Exact role-to-permission mapping for every write action: **Unclear — requires confirmation** (see Miscellaneous for sparse backend route protection).

---

## 2. Features and Capabilities

### Access licensed compliance toolkits

- **Capability:** View and work with compliance toolkits the organisation is licensed for (for example ISO 9001, ISO 27001, ISO 45001, ISO 14001, ISO 20000, ISO 27002, DSPT NHS, BS 9997, ESG, Building Safety Act, and related variants).
- **Who uses it:** Users with Compliance Tool read permission whose organisation holds the toolkit licence.
- **Outcome:** Licensed toolkits appear in the Compliance sidebar menu and on the dashboard compliance carousel. Unlicensed toolkits are hidden from navigation.
- **Conditions:** Each toolkit route checks both service read permission and organisation licence for that toolkit name.

### View compliance overview for a toolkit

- **Capability:** See overall compliance percentage, counts of controls selected and implemented, and section-level progress for a toolkit.
- **Who uses it:** Users viewing the Overview tab on any toolkit page.
- **Outcome:** Users understand how much of the toolkit is in scope and implemented, with charts and a section breakdown table. Overview data is refreshed when control statuses change.
- **Conditions:** Overview is per organisation and per toolkit name.

### Browse, search, and filter controls

- **Capability:** View a paginated list of controls (clauses) for a toolkit; search; filter by standard section (clause pattern).
- **Who uses it:** Users on a toolkit’s Controls tab.
- **Outcome:** Users see clause number, title, whether the control is selected, implementation status, compliance percentage (for hierarchical controls), last updated date, and who last updated. Row click opens a detail drawer.
- **Conditions:** List is organisation-scoped. Related documents for the toolkit may appear above the table when Document Management read access is present.

### View a control in detail

- **Capability:** Open a control to read its description, notes, overview metadata, current selection and status, activity history, and linked evidence.
- **Who uses it:** Users opening the control drawer from the list or navigating to the full control detail page (`/admin/controls/:id`).
- **Outcome:** Users see full clause content and the organisation’s current answer to that control.
- **Conditions:** Locked controls (typically parent/summary nodes) cannot be manually updated. Parent controls with incomplete child clauses may be blocked from manual status update in the UI until children reach 100% compliance.

### Update control selection and implementation status

- **Capability:** Mark a control as **Selected** or **Not selected**, and set implementation status to **Implemented** or **Not implemented**.
- **Who uses it:** Users with write access on the relevant toolkit (UI gates vary by toolkit service; drawer uses primary update form).
- **Outcome:** The control status is saved. Compliance percentage is recalculated for the control and, for hierarchical toolkits, for parent controls up the clause tree. Toolkit overview totals (overall percentage, controls selected, controls implemented) are updated. When a control becomes Implemented, organisation-wide notifications and activity entries are recorded.
- **Conditions:** A control marked Not selected must remain Not implemented (enforced on backend). Locked controls reject manual updates. ISO 27002 and DSPT NHS use a flat calculation; other toolkits use hierarchical roll-up from child clauses.

### Attach legacy file evidence directly to a control

- **Capability:** Upload files as embedded evidence on a control status record.
- **Who uses it:** Users on the full-page control detail view (not available in the list drawer).
- **Outcome:** Files are stored as attachments on the control status and appear in the control’s evidence list. Files can be removed by authorised users.
- **Conditions:** Requires Compliance Tool create permission on the backend evidence route. Removal may be limited to super users or attachment owners in the UI.

### Link module records as control evidence

- **Capability:** Link existing business records as structured proof that a control is met: risks, incidents, CIPs (improvement plans), document tree nodes, or uploaded raw files.
- **Who uses it:** Users with compliance read access using the evidence link actions on a control.
- **Outcome:** A separate control-evidence record associates the control with the linked module record. Users can view linked evidence by type and unlink with confirmation. Duplicate links to the same module record for the same control are rejected.
- **Conditions:** Requires Compliance Tool create permission for adding evidence. Each evidence type uses a distinct link (risk-management, incident-management, cip, document-management, raw-file).

### View and remove control evidence

- **Capability:** List linked evidence by type for a control; open linked records; remove links.
- **Who uses it:** Users on the Compliance Evidence tab of the control drawer or equivalent sections on full-page detail.
- **Outcome:** Users see which risks, incidents, CIPs, documents, or files support the control. Unlinking removes the evidence association (not the underlying module record).
- **Conditions:** Removal uses delete on the control-evidence record.

### Link controls from other modules (reverse direction)

- **Capability:** From Risk Management, Incident Management, CIP, Audit, and similar modules, select compliance controls to associate with that record.
- **Who uses it:** Users in those modules with compliance picker access.
- **Outcome:** The operational record shows linked control stripes; users can navigate to the control detail page. This complements control-side evidence linking (bidirectional relationship at business level).
- **Conditions:** Completed audits block further control linking on the audit record. Evidence linking from the control side creates structured control-evidence records; module-side linking stores associations on the source module.

### Activate (provision) a compliance toolkit

- **Capability:** Initialise a compliance toolkit for the organisation—creating org-scoped control status records from the global standard catalogue and an overview record.
- **Who uses it:** Triggered during organisation onboarding (licence selection), licence request approval, or backend provisioning—not via a dedicated “Create toolkit” button in the main Compliance UI.
- **Outcome:** One control-status row per clause in the standard; overview record created; IAM access initialised for admin/compliance groups; licence usage incremented; automation may scan existing module records for auto-compliance opportunities.
- **Conditions:** Organisation must hold the toolkit in `licenses.complianceTools`. Cannot provision the same toolkit twice for the same org. Backend rejects if no global templates exist for the name.

### Request and assign toolkit licences

- **Capability:** Request additional compliance toolkit licences; assign entitled toolkits to IAM groups or individual users.
- **Who uses it:** Organisation administrators during onboarding, licence request flows, or Our IMS group/user administration.
- **Outcome:** Organisation licence entitlements are updated (via approval workflows). Group/user toolkit assignment controls which toolkits appear in navigation for those identities. **Note:** User/group assignment is IAM-level; org licence is the gate for provisioning and menu visibility.
- **Conditions:** Licence request and approval flows are primarily in Our IMS / License Management, not inside the main Compliance screens.

### View compliance on the organisation dashboard

- **Capability:** See high-level compliance percentages per licensed toolkit and navigate into the toolkit.
- **Who uses it:** Dashboard users with access to compliance stats.
- **Outcome:** Quick visibility of compliance posture with deep links into toolkit pages.
- **Conditions:** Consumes overview/stats data; not a separate compliance register.

### View ESG toolkit with Environmental, Social, and Governance sections

- **Capability:** Work with ESG as a multi-part toolkit with separate Environmental, Social, and Governance control tabs plus guidelines content.
- **Who uses it:** Users licensed for ESG governance toolkit.
- **Outcome:** ESG controls and documents are organised by pillar in addition to the standard overview pattern.
- **Conditions:** ESG uses the same control/evidence model as other toolkits with additional tab structure.

---

## 3. User Outcomes / End Results

- **Create:** Org-scoped control tracking for a licensed toolkit (via provisioning, not end-user “create toolkit” UI); linked evidence records; embedded file attachments on controls.
- **View:** Toolkit overview metrics; searchable/filterable control lists; control detail with description, status, activity, and evidence; dashboard compliance summary.
- **Manage:** Control selection and implementation status; evidence links to risks, incidents, CIPs, documents, and files; legacy attachments on full-page control detail.
- **Change:** Update whether a control is in scope and implemented; add/remove evidence; activity comments on controls via timeline.
- **Information received:** Overall and section compliance percentages; counts of selected and implemented controls; notifications when controls become implemented; navigable links between controls and source module records.
- **Business actions enabled:** Standards-based compliance tracking; demonstrable audit trail of control status and evidence; cross-module proof of implementation; licence-gated access to frameworks relevant to the organisation.

---

## 4. Scope Boundaries

### In scope

- Licensed compliance toolkit navigation and per-toolkit pages (overview + controls + related documents).
- Organisation-scoped control status (selected/implemented) against global standard catalogues.
- Compliance overview aggregation per toolkit.
- Embedded file evidence on control statuses.
- Structured control evidence linking to risks, incidents, CIPs, documents, and raw files.
- Control detail drawer and full-page control detail.
- Searchable compliance control picker used from other modules (picker UI lives in Compliance; invoked from elsewhere).
- Toolkit licence entitlement checks for menu visibility.
- Backend toolkit provisioning, IAM grant on create, and automation hooks.

### Out of scope (handled elsewhere)

- **CQC module** — separate product area with its own routes and models (`/cqc`), despite similar “controls” naming.
- **Licence request approval workflow** — belongs to License Management / Our IMS; Compliance consumes resulting entitlements.
- **Risk / Incident / CIP / Audit record lifecycle** — those modules own the records; Compliance links to them as evidence or receives reverse control links.
- **Document repository administration** — Document Management owns content; Compliance links document tree nodes as evidence and surfaces related documents tab.
- **Global standard catalogue maintenance** — shared `compliancecontrols` templates are seeded/administered outside normal user Compliance UI (sync scripts).
- **RACI user assignment on controls** — backend supports updating responsible/accountable/consulted/informed users; **no current UI exposure identified**.
- **Toolkit deletion / update sync** — backend delete route exists; no UI; update toolkit service is a stub.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| Risk Management | Risks can be linked as control evidence; risks can link controls from their side. Promoted audit risks may later serve as evidence. |
| Incident Management | Incidents linkable as control evidence; incidents can associate controls from their module. Audit non-conformities promoted to incidents may serve as evidence. |
| Continual Improvement Plan (CIP) | CIPs linkable as control evidence; CIPs can associate controls. Audit OFIs promoted to CIPs may serve as evidence. |
| Document Management | Document tree nodes linkable as control evidence; toolkit pages show related documents tagged for compliance controls. |
| Audit | Audits link ISO controls on the audit record; users navigate to control detail from compliance stripes. Distinct from control-evidence records. |
| Management Review | Can link ISO controls on management review records (similar pattern to audit linking). |
| Tasks | **Unclear — requires confirmation** whether tasks link directly; not a primary Compliance UI path in investigation. |
| License Management / Our IMS | Organisation licence entitlements determine which toolkits can be provisioned and shown; licence requests and group/user toolkit assignment. |
| Dashboard / Stats | Compliance percentages consumed for org dashboard widgets. |
| Notifications / Activity | Implemented controls trigger org notifications and activity timeline entries on control statuses. |

---

## 6. Current Data Model

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| Compliance toolkit | A standards framework package (e.g. ISO 9001) the org is licensed to track | Defines which control catalogue and overview apply; not a separate user-editable “tool” document—activated by provisioning |
| Compliance control (template) | A single clause/requirement in a standard (global catalogue) | Shared definition: clause number, title, description, hierarchy, lock flag, automation hints |
| Control status | The organisation’s live tracking row for one control | What users update: selected/implemented, compliance %, embedded files, last updater |
| Compliance overview | Org-level rollup for one toolkit | Stores total compliance %, controls selected count, controls implemented count |
| Embedded evidence | File attachment stored on a control status | Direct upload proof (legacy path; full-page detail) |
| Control evidence | Structured link record between a control status and another module record or file | Module-linked proof (risk, incident, CIP, document, raw file) |
| Organisation licence (compliance toolkits) | List of toolkit names the org may activate | Gates provisioning and UI visibility |

**Key distinction:** **Embedded evidence** lives on the control status record itself. **Control evidence** is a separate association record pointing at another business entity (or a standalone uploaded file in the control-evidence collection).

---

## 7. Attributes

### Compliance toolkit (business concept)

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Name | Toolkit identifier | e.g. ISO 9001, ISO27001, DSPTNHS, ESG_GOVERNANCE, BUILDING_SAFETY_ACT |
| Licence entitlement | Whether org may activate/use | Stored on organisation licences |
| Provisioned state | Whether org has control statuses for this toolkit | Created once per org per toolkit |

### Control (template — global catalogue)

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Clause | Standard clause/reference number | Used with toolkit name to identify status rows |
| Title | Short control name | Shown in lists |
| Description | Requirement text | Shown in detail |
| Annex | Supplementary annex content | Shown on detail when present |
| Parent clause / children clauses | Hierarchy for roll-up | Parent controls aggregate child compliance |
| Is locked | Parent/summary control | Manual status update blocked; values derived from children |
| More info | Automation and applicability metadata | Includes applicable modules hints for auto-compliance |

### Control status (org instance)

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Selected | In scope vs excluded | Selected / Not selected |
| State (status) | Implementation level | UI: Implemented / Not implemented; backend also supports Yes/No/Partially implemented in schema |
| Compliance percentage | Roll-up progress for hierarchical controls | 0–100; parent controls depend on children |
| Embedded evidences | Direct file attachments | Legacy upload path |
| Responsible / accountable / consulted / informed user | RACI assignments | Backend supported; **no UI identified** |
| Updated (by, on) | Last status change | Shown in control list |
| Organisation | Tenant scope | Always applied |
| Group | Optional business unit | Optional scoping |

### Compliance overview

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Total percentage | Overall toolkit compliance % | Updated on status changes |
| Controls selected | Count of in-scope controls | Aggregate |
| Controls implemented | Count of implemented controls | Aggregate |

### Control evidence

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Evidence type | Kind of linked proof | risk-management, incident-management, cip, document-management, raw-file, text-content (schema) |
| Related risk / incident / CIP / document | Link to source record | One per type when applicable |
| File storage | Uploaded file for raw-file type | S3-backed attachment metadata |

---

## 8. Current UI Layout

### Main screens / pages

- **Compliance sidebar collapse** — one menu entry per licensed toolkit (ISO 14001, ISO 15686-5, ISO 20000, ISO 27001 variants, ISO 27002, ISO 9001, ISO 45001, DSPT, BS 9997, ESG, Building Safety Act).
- **Toolkit page** — `/admin/{toolkit-path}` (e.g. `/admin/iso9001`, `/admin/dspt`, `/admin/esg`).
- **Full control detail page** — `/admin/controls/:id` (hidden from sidebar; linked from control stripes across modules).

### Important sections and views

**Standard toolkit page tabs**

1. **Overview** — toolkit summary text, pie chart of overall compliance %, cards for controls selected and controls implemented, section progress table.
2. **{Toolkit name}** — searchable related documents strip + controls data table.
3. **Related Documents** — only if user has Document Management read access.

**ESG toolkit** — Overview plus separate **Environmental**, **Social**, and **Governance** tabs (each with guidelines alert, searchable documents, controls table).

**Controls table columns:** Clause, Title, Selected, Status, Compliance %, Last updated, Updated by, Actions. Row click opens control drawer. Search and section filter modal per toolkit.

**Control drawer tabs**

1. **Details** — description, note, overview table, update form (Select Control + Status) OR blocker message when parent has incomplete children.
2. **Activity** — timeline comments (`controlstatuses` module type).
3. **Compliance Evidence** — linked risks, incidents, CIPs, document trees, raw files (view/unlink); link actions via toolbar dropdown.

**Full-page control detail tabs**

1. **Details** — sidebar overview + switchable read/edit view; legacy attachment upload on edit view; timeline.
2. **Annex** — when annex content exists and user has toolkit read access.

### Primary actions

- Open toolkit from sidebar or dashboard carousel.
- Search/filter controls; open control drawer or full detail page.
- Update Select Control and Status (drawer `UpdateClause` form or full-page edit form).
- Link evidence: risk, incident, CIP, document tree, raw file (finder drawers + confirm).
- Unlink control evidence (trash + confirm).
- Upload/remove legacy embedded attachments (full-page detail only).
- Add activity comments via timeline.

### Forms

**Control status update (drawer — primary path):**

- Select Control: Selected / Not selected
- Status: Implemented / Not implemented (disabled when locked)

**Control status update (full page):**

- Same fields; title, name, clause read-only

**Evidence link finders:** Search and select a risk, incident, CIP, document node, or upload file.

**Extract report:** N/A in Compliance module (Audit feature).

**Licence/toolkit assignment (Our IMS / onboarding):** Multi-select compliance toolkits; separate from main Compliance screens.

### Lists / tables / cards / detail views

- Primary control presentation is a data table with optional expandable rows.
- Overview uses pie chart + metric cards + section progress table.
- Linked evidence shown in typed subsections with cards/links to source modules.
- `ComplianceStripe` component shows linked controls on Risk, Incident, CIP, Audit views with navigation to control detail.

### Navigation and workflow

```
Organisation obtains toolkit licence (onboarding / licence request)
  → Toolkit provisioned (backend) → appears in Compliance menu
  → Open toolkit → Overview tab (metrics)
  → Controls tab → search/filter → open control drawer or /admin/controls/:id
  → Update selected/implemented OR link evidence from other modules
  → Overview percentages refresh
  → From Risk/Incident/CIP/Audit: pick controls via searchable compliance picker (reverse link)
```

### Material empty, loading, or restricted states

- Loading on overview, controls table, control detail fetch, linked evidence sections.
- Error: “This iso tool has been deleted or removed” (overview); “This Tool has been deleted or removed” (control detail).
- Empty evidence: “There are no Risks/Documents linked…” style messages; finders show “No risks/incidents found.”
- Empty attachments: “No attachments found”.
- Restricted: unlicensed toolkits hidden from menu; locked controls disable status selects; parent controls with incomplete children show blocker instead of update form in drawer; legacy attachment delete limited by super user or owner checks.
- Document-related tab hidden without Document Management read permission.

---

## 9. Miscellaneous / Module-Specific Information

### Terminology

- **Compliance Tool / Toolkit** — a standards framework the org tracks (ISO 9001, etc.). Users do not “create” toolkits in the main UI; they **activate** them via licence provisioning.
- **Control** — a clause/requirement within a standard. Users interact with **control status** (the org’s row), not the global template directly.
- **Selected** — control is in scope for the organisation.
- **Implemented** — control is considered met (UI label; backend also treats “Yes” equivalently for roll-up and notifications).
- **OFI / CIP evidence** — improvement plans linked as `cip` evidence type.
- **Legacy evidence** — embedded file attachments on control status (`evidences[]`), distinct from **control evidence** collection links.

### Important business rules (observed)

- Not selected controls must remain Not implemented (backend enforced).
- Locked controls cannot be manually updated (backend rejects; UI disables selects).
- Hierarchical toolkits roll up child compliance to parents; ISO 27002 and DSPT NHS use flat calculation.
- Implementing a control triggers org-wide notification and activity log entry.
- Provisioning a toolkit requires org licence; duplicate provisioning rejected.
- Duplicate module links to the same control rejected (409).
- Toolkit list/read uses Redis cache (approximately 10 minutes); cleared on status changes.

### Toolkit inventory (licensed routes in UI)

ISO 14001, ISO 15686-5, ISO 20000, ISO 27001 (2013), ISO 27001 (2022), ISO 27001 (2022 Annex A), ISO 27002, ISO 9001, ISO 45001, DSPT (2022), BS 9997, ESG, Building Safety Act — each with dedicated page under `/admin/...`.

### Frontend vs backend discrepancies (current behaviour — requires confirmation)

| Topic | Frontend evidence | Backend evidence | Business conclusion |
| ----- | ----------------- | ---------------- | ------------------- |
| Create/delete toolkit | Service functions exist; **no UI** | POST `/` chains create + grantLicense; DELETE by name | Toolkits provisioned via onboarding/licence approval, not user CRUD in Compliance screens |
| Update toolkit | No UI | PUT `/` service is **stub/no-op** | Toolkit update not a user-facing capability |
| RBAC on writes | Many actions visible with read/compliance checks | Only GET list and two evidence POST routes have explicit RBAC | Many write endpoints rely on org access only — **requires confirmation** of intentional security model |
| Status update URL id | Sends control status id in URL | **`updateControlStatus` uses body name+clause; URL id ignored** | Works when body is correct; URL id is misleading |
| Legacy `addEvidence` top-level | Dead service paths to `/evidence` | Backend expects `/controls/:id/evidence/` | Top-level evidence service calls appear **non-functional** |
| `updateComment` | Service exists; Comments component **unused** | **No comments route** | Activity uses Timeline module, not comment API |
| RACI fields | **No UI** | PUT `/controls/:id` validated update | RACI assignment backend-only |
| Dashboard ISO 15686 link | Links to `/admin/iso15686-5` | Route is `/admin/iso15686` | Possible broken dashboard link |
| Full-page `ClauseUpdateForm` | May pass data without control id | Status update needs name+clause | Full-page edit path may be broken; drawer path is primary — **requires confirmation** |
| Licence usage increment | N/A | Schema is string array; increment expects object shape | Usage counter may not increment — **requires confirmation** |
| Delete toolkit | No UI | `deleteMany({ name })` **without org filter** | Dangerous if exposed; not user-facing today |
| Automation auto-implement | N/A | Queue may call wrong service method | Auto-compliance from linked modules may not work — **requires confirmation** |

### Backend-only or partially exposed behavior

- Org onboarding and licence approval auto-provision toolkits.
- `grantLicense` after create: IAM toolkit access for admin/compliance groups + licence usage increment (errors swallowed).
- Compliance automation queue on toolkit creation scans risk/CIP/audit/incident/management-review/document modules.
- Global catalogue sync via admin script (`syncComplianceTools.js`).
- Stats endpoint `/stats/compliance` for dashboard.
- CQC as entirely separate module.

### Unclear or incomplete behavior

- Purpose of `overview.overview` mixed field on overview schema (no writes found).
- Whether `state: No` and `Partially implemented` are used in production workflows (schema only).
- Exact effect of user/group toolkit assignment vs org licence (both affect visibility/access — interaction **requires confirmation**).
- Whether automation successfully auto-implements controls when linked module records exist.
