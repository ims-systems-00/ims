# Audit

## 1. Module Overview

The Audit module supports planning, conducting, documenting, and closing **Internal** and **External** audits within an organisation.

Its primary business purpose is to give users a structured way to schedule audits against a business unit and compliance body, record audit scope and timing, capture findings during the audit (non-conformities, risks, and opportunities for improvement), attach supporting evidence, link relevant compliance controls, and complete the audit so that findings can flow into downstream business processes.

It solves the problem of informal or fragmented audit handling by keeping a searchable, organisation-scoped register of scheduled and completed audits, with embedded findings that can be promoted into standalone records in other modules when an audit is marked complete.

Primary users are people with Audit access—typically Super Admins, Internal Auditors, External Auditors, and related roles subject to Audit licence and permission checks. Internal audits and External audits are accessed as separate list views but share the same underlying audit record structure distinguished by audit type. Exact role-to-permission mapping for every action: **Unclear — requires confirmation** (see Miscellaneous for observed frontend/backend differences).

---

## 2. Features and Capabilities

### Schedule (create) an audit

- **Capability:** Schedule one or more audit records by providing title, focus area, auditor, business unit, compliance body, schedule date, time, audit type (Internal or External), recurrence interval, and optional attachments.
- **Who uses it:** Users with Audit manage permission in the UI (Schedule button); backend requires Audit create permission.
- **Outcome:** One or more audit records are created with unique references (`AUD-{number}`), calendar events, and notifications to relevant users (Super Admins, Heads of Service for the business unit, and/or the assigned auditor depending on group context). Attachments are stored only on the first occurrence when multiple audits are scheduled. The list refreshes to show the new audit(s).
- **Conditions:** Backend requires auditor, business unit, compliance body, title, focus area, start date, and interval. Interval determines how many audit records are created: Quarterly → 4, Half yearly → 2, Yearly → 1, with start dates spread across the year (weekends adjusted). Frontend requires title, focus area, type, auditor, interval, and time; business unit and compliance body are not marked required in the form validation but are required by the backend.

### View, search, filter, and open audits

- **Capability:** Browse a paginated list of Internal or External audits; search; filter by status (all, scheduled, completed, upcoming), business unit, schedule date, and auditors; open an audit in a detail drawer or full detail page.
- **Who uses it:** Users with Audit read access and applicable licence.
- **Outcome:** Users see audits for their organisation including reference, business unit, title, compliance body, auditor, status (Scheduled / Completed), schedule timestamp, and interval. List visibility is further limited by business unit for some roles (see Miscellaneous).
- **Conditions:** List is automatically filtered by audit type (Internal vs External) based on which navigation entry the user opened. Opening the full detail page fetches the latest audit record; the list drawer uses row data from the list without guaranteed re-fetch.

### Update an audit

- **Capability:** Change audit details such as title, business unit, compliance body, focus area, schedule date, time, summary comment, and add further attachments.
- **Who uses it:** Users with Audit create permission who pass UI role/type and entity-access checks (creator or assigned auditor, or super user with matching internal/external context).
- **Outcome:** The audit reflects the new information. New attachments are appended. The linked calendar event is updated.
- **Conditions:** A completed audit cannot be updated. Auditor and interval cannot be changed in the UI after creation (disabled on edit form).

### Complete an audit

- **Capability:** Mark an audit as completed after finalising audit information.
- **Who uses it:** Users who can edit the audit (via the Completed button on the edit form).
- **Outcome:** The audit status becomes Completed with who completed it and when. Embedded findings are promoted into standalone records in other modules: non-conformities → Incidents, embedded risks → Risk Management register records (Organisational type), OFIs → Continual Improvement Plans (CIPs). All promoted records retain the same identifier and link back to the source audit. After completion, edit and most mutating actions are hidden in the UI; links to the promoted records appear on the detail view.
- **Conditions:** Backend blocks completion if the audit is already completed. Backend intends to block completion before the scheduled date, but the date guard references a field that does not exist on the audit record — **current behavior: completion before schedule date appears allowed** (requires confirmation). UI completes by saving the form first, then calling the completion action.

### Delete an audit

- **Capability:** Remove an audit from the register.
- **Who uses it:** Users with Audit delete permission; UI further limits delete to organisation super users or the audit creator.
- **Outcome:** The audit is permanently deleted. Tasks sourced from that audit are also removed.
- **Conditions:** Completed audits cannot be deleted. Delete permission and (in UI) super-user-or-creator check.

### Manage non-conformities (Identifications)

- **Capability:** Add, update, and remove non-conformity findings on an audit. Each finding records a non-conformity description and root cause.
- **Who uses it:** Users editing a non-completed audit.
- **Outcome:** Findings are stored embedded on the audit until completion; after completion they appear as links to Incident records.
- **Conditions:** Blocked when the audit is completed. Available only in edit mode on the audit form.

### Manage embedded audit risks

- **Capability:** Add, update, and remove risks recorded during the audit with title, description, likelihood, and consequence. Risk score is calculated as likelihood × consequence.
- **Who uses it:** Users editing a non-completed audit.
- **Outcome:** Risks are stored embedded on the audit during the audit process. On completion, each becomes a standalone Organisational risk in Risk Management with a source link back to the audit. After completion, the UI links to the promoted risk records.
- **Conditions:** These are **not** the same as directly raising a risk in Risk Management during the audit—they are audit-embedded findings promoted on completion. Blocked when the audit is completed.

### Manage opportunities for improvement (OFIs)

- **Capability:** Add, update, and remove OFI entries on an audit. OFI stands for **Opportunity For Improvement** in the current UI labelling.
- **Who uses it:** Users editing a non-completed audit.
- **Outcome:** OFIs are stored embedded on the audit (internally stored as CIP-shaped records). On completion, each becomes a standalone CIP with a source link back to the audit. After completion, the UI links to the promoted CIP records.
- **Conditions:** Blocked when the audit is completed.

### Attach and remove supporting files

- **Capability:** Add attachments when creating or updating an audit, and remove individual attachments.
- **Who uses it:** Users on create/edit forms (add); users with delete permission (remove).
- **Outcome:** Supporting files are associated with the audit or removed. Attachments are included in report extraction.
- **Conditions:** Attachment removal is blocked when the audit is completed. A dedicated add-attachment backend operation exists but is a stub — **attachments are added via create/update only** in current practice.

### Link and unlink compliance controls

- **Capability:** Associate compliance control clauses with an audit, or remove those associations.
- **Who uses it:** Users who can edit a non-completed audit and pass compliance access checks in the UI.
- **Outcome:** The audit shows linked compliance controls. Link and unlink update the audit’s compliance association.
- **Conditions:** Not allowed when the audit is completed. Supported toolkit/framework scope follows the shared compliance linking model used elsewhere in the product.

### Extract (send) an audit report

- **Capability:** Generate and send an audit report to a named recipient by email.
- **Who uses it:** Any user who can access the extract-report form (no explicit permission gate on the send button in the UI); backend requires Audit create permission.
- **Outcome:** The system queues asynchronous generation of a PDF audit report (using an audit report template) and emails it to the recipient, including audit attachments where applicable. The user receives immediate confirmation that the report was sent; delivery is asynchronous.
- **Conditions:** Available from the audit detail sidebar and list-page drawer. Does not change audit status.

### Create and manage linked tasks

- **Capability:** Create or view tasks associated with an audit.
- **Who uses it:** Users working an audit who have task capabilities.
- **Outcome:** Tasks are linked to the audit. Deleting the audit removes tasks sourced from it.
- **Conditions:** Task behaviour is primarily owned by Task Management; Audit provides entry points and linkage. Not available when audit is completed (UI).

### View related documents

- **Capability:** Browse documents related to the audits module type.
- **Who uses it:** Users with Document Management read permission (tab shown only then).
- **Outcome:** Related documents for audits are discoverable from within the Audit module.
- **Conditions:** Owned by Document Management; Audit only surfaces the tab.

### View KPI / objectives context (Internal audits)

- **Capability:** While editing an Internal audit, view a read-only list of organisational KPI objectives for context.
- **Who uses it:** Users editing an Internal audit.
- **Outcome:** Auditors see relevant KPI/objective information alongside the audit form.
- **Conditions:** Shown only for Internal audit type on the edit form. KPI data is fetched from the KPI/Objectives area, not stored on the audit itself.

### Analyse an audit with AI assistance

- **Capability:** Open an AI analytical assistant for a selected audit from the list drawer toolbar.
- **Who uses it:** Users with edit toolbar access on non-completed audits.
- **Outcome:** Users receive analytical guidance. Guidance is not persisted as a formal audit workflow state.
- **Conditions:** Depends on the shared AI analytical assistant feature.

### View audit summary on dashboards

- **Capability:** See audit charts/stats and navigate to the internal audits list.
- **Who uses it:** Users with dashboard access consuming audit statistics.
- **Outcome:** High-level visibility of audit activity with a path into the audit register.
- **Conditions:** Dashboard stats are a consumer of Audit data, not a separate register.

---

## 3. User Outcomes / End Results

- **Create:** Scheduled audit record(s) with reference, scope, timing, assigned auditor, business unit, compliance body, and optional attachments; calendar events and notifications for relevant users.
- **View:** Searchable/filterable Internal or External audit registers; detailed views of scope, findings (non-conformities, risks, OFIs), summary, attachments, lifecycle status, linked compliance controls, activity, and tasks.
- **Manage:** Embedded findings during an in-progress audit; linked tasks, categories/documents (where permitted), and compliance control associations.
- **Change:** Audit details, summary, attachments, and embedded findings until the audit is completed.
- **Information received:** Audit status (Scheduled / Completed), lifecycle who/when metadata, notifications on scheduling, PDF audit reports via email, and post-completion links to promoted Incidents, Risks, and CIPs.
- **Business actions enabled:** Formal audit scheduling and execution; structured capture of non-conformities, risks, and improvement opportunities; evidence attachment; compliance control linkage; audit closure with downstream promotion of findings into operational modules; report distribution to stakeholders.

---

## 4. Scope Boundaries

### In scope

- Scheduling and listing Internal and External audits.
- Audit record maintenance (update, delete while not completed).
- Embedded findings during the audit: non-conformities (identifications), risks, and OFIs.
- Attachments on audits.
- Linking/unlinking compliance controls on an audit.
- Audit completion and promotion of embedded findings to Incidents, Risk Management, and CIP.
- Audit report extraction (PDF + email).
- Audit-side entry points for tasks, related documents, KPI context (Internal), AI analysis, and dashboard stats.
- Calendar event creation/update tied to audits.

### Out of scope (handled elsewhere)

- **Incident lifecycle after promotion** — non-conformities become Incidents on completion; ongoing incident handling belongs to Incident Management.
- **Risk Management register lifecycle after promotion** — embedded audit risks become Organisational risks on completion; ongoing risk handling belongs to Risk Management.
- **CIP lifecycle after promotion** — OFIs become CIPs on completion; ongoing improvement tracking belongs to CIP.
- **Compliance framework administration** — Audit links controls; framework/toolkit management belongs to Compliance.
- **Task lifecycle** — belongs to Task Management.
- **Document content management** — belongs to Document Management.
- **KPI/Objectives maintenance** — belongs to KPI/Objectives; Audit only displays read-only context.
- **Calendar module administration** — Audit creates/updates events; calendar infrastructure is shared.
- **User and role administration** — belongs to Users / IAM.
- **Document version audit trail** — a separate “audit trail” feature under Document Management is not this Audit module.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| Incident Management | Non-conformities captured during an audit are promoted to standalone incidents when the audit is completed, with source link back to the audit. |
| Risk Management | Embedded audit risks are promoted to Organisational risks in the risk register on completion, with source link back to the audit. Distinct from directly raising risks in Risk Management during an audit. |
| Continual Improvement Plan (CIP) | OFIs captured during an audit are promoted to standalone CIPs on completion, with source link back to the audit. |
| Compliance | Audits can link compliance control clauses; compliance checkout automation is triggered on audit creation (see Miscellaneous). |
| Tasks | Users create/view tasks sourced from an audit; deleting an audit removes tasks sourced from it. |
| Documents | Related Documents tab surfaces documents associated with the audits module type. |
| Calendar | Audit scheduling creates/updates calendar events for audit dates. |
| Notifications | Scheduling notifies relevant Super Admins, Heads of Service, and/or the assigned auditor. |
| KPI / Objectives | Internal audit edit form shows read-only organisational KPI objectives for context. |
| Dashboard / Stats | Audit charts and aggregates with navigation into the audit list. |
| AI Analytical Assistant | Optional analyse experience for a selected audit from the list drawer. |

---

## 6. Current Data Model

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| Audit | A scheduled or completed internal/external audit | Primary record users schedule, conduct, complete, and report on |
| Identification (non-conformity) | An audit finding describing what did not conform and its root cause | Embedded on the audit during conduct; promoted to an Incident on completion |
| Embedded audit risk | A risk identified during the audit with scored likelihood/consequence | Embedded during conduct; promoted to a Risk Management record on completion |
| OFI (stored as CIP-shaped embedded record) | An opportunity for improvement identified during the audit | Embedded during conduct; promoted to a CIP on completion |
| Attachment | Supporting file on the audit | Evidence included in the audit and report extraction |
| Compliance link (toolkits + clauses) | Associated compliance frameworks and controls | Shows which controls relate to the audit |
| Linked task | Task sourced from the audit | Operational follow-up (owned by Tasks, referenced here) |
| Completion metadata | Who completed the audit and when | Drives Completed status and locks further mutation |

Audit status is represented by `completed.status`: **Scheduled** (false) or **Completed** (true). There is no separate multi-stage status enum beyond this binary completion flag and the implicit in-progress state while users add findings before completing.

---

## 7. Attributes

### Audit (main record)

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Reference | User-facing identifier | Generated as `AUD-{number}` |
| Title | Name of the audit | Required on create |
| Type | Internal or External | Determines which list view and role context applies |
| Focus area | Scope/focus of the audit | Required on create |
| Business unit (group) | Organisational unit audited | Required on backend create; optional in UI form validation |
| Compliance body | Certification/compliance body group | Required on backend create; optional in UI form validation |
| Auditor | Person conducting the audit | Required; not editable in UI after create |
| Start date | Scheduled date/time anchor | Required on backend; spread when multiple audits scheduled |
| Time | Scheduled time | Required in UI; optional in backend create validation |
| Interval | Recurrence pattern | Quarterly / Half yearly / Yearly; determines number of scheduled records; not editable after create in UI |
| Comment (Summary) | Audit summarisation text | Optional; edit mode only in UI |
| Attachments | Supporting files | Optional; added on create/update |
| Completed (status, by, on) | Whether audit is complete, who, when | Locks mutation when true |
| Created (by, on) | Who scheduled the audit and when | Set on create |
| Linked compliance toolkits / clauses | Related compliance controls | Cannot change when completed |
| Organisation | Tenant scope | Always applied |

### Identification (non-conformity)

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Non-conformity | Description of the finding | Required in UI |
| Root cause | Explanation of why it occurred | Required in UI |

### Embedded audit risk

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Title | Short name of the risk | Required in UI |
| Description | Detail of the risk | Required in UI |
| Likelihood | How likely (1–5 in UI) | Used in score calculation |
| Consequence | How severe (1–5 in UI) | Used in score calculation |
| Risk score (total) | Likelihood × consequence | Calculated by system |

### OFI

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Title | Short name of the improvement opportunity | Required in UI |
| Opportunity for improvement | Description of the improvement | Required in UI |

### Extract report request

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Recipient name | Who receives the report | Required in UI |
| Recipient email | Email address for delivery | Required in UI |

---

## 8. Current UI Layout

### Main screens / pages

- **Internal Audits list** — `/admin/audits/internal`, sidebar **Audits → Internal**.
- **External Audits list** — `/admin/audits/external`, sidebar **Audits → External**.
- **Audit detail page** — `/admin/audits/internal/:id` or `/admin/audits/external/:id` (not shown in sidebar).
- Additional entry from dashboard audit widgets linking to internal audits.

### Important sections and views

**List page tabs**

1. **All Audits** — searchable/filterable table, drawers, and actions.
2. **Related Documents** — only if the user has Document Management read access.

**List table columns:** Reference, Business Unit, Title, Compliance Body, Auditor, Status (Scheduled / Completed), Timestamp (start date), Interval, Actions.

**List-page drawers**

| Drawer | Purpose |
| ------ | ------- |
| Audit detail | Overview, findings, lifecycle, tasks, linked controls |
| Edit audit | Update form |
| Create audit | Schedule form |
| Send audit report | Extract report recipient form |
| Compliance control picker | Link controls |
| Add task | Task form |
| Audit analyser | AI assistant |

**Detail drawer tabs:** Overview, Details (non-conformities, risks, OFIs, summary, attachments), Life Cycle, Tasks, Linked controls.

**Full detail page layout**

- **Main column:** Read-only sections for non-conformities, risks, OFIs, summary, linked controls, attachments; switchable to full edit form (AuditForm) for amend/complete when not completed.
- **Sidebar:** Audit actions (link control, link task when not completed), overview metadata, lifecycle status, extract report form.
- **Below main column:** Embedded task management for the audit.

**Edit form sections (when editing an existing audit)**

- Core audit fields (title, business unit, compliance body, focus area, auditor [disabled], schedule date, time, interval [disabled], attachments).
- KPI/Objectives (Internal audits only, read-only).
- Findings: non-conformities, risks, OFIs (add/edit/delete in edit mode).
- Audit summarisation (comment).
- Buttons: **Update** and **Completed**.

### Primary actions

- Schedule audit (create drawer).
- Open detail drawer (row click) or full detail page (row Actions → Details).
- Edit / update / complete (switch view on detail page or edit drawer).
- Delete audit (row actions with confirmation).
- Add/edit/delete non-conformities, risks, and OFIs (edit mode only).
- Attach files (create/update form); delete attachment (detail view, not when completed).
- Link / unlink compliance controls (detail sidebar, drawer toolbar, linked-controls tab).
- Create / link task.
- Extract / send report (sidebar and drawer).
- AI Assist & Verification (list drawer toolbar, non-completed audits).

### Forms

**Schedule / edit audit:** Title, Business unit, Compliance body, Focus area, Auditor, Schedule date, Time, Interval (create only), Attachments, Summary/comment (edit only).

**Non-conformity:** Non-conformity, Root cause.

**Risk:** Risk title, Risk description, Likelihood (1–5), Consequence (1–5).

**OFI:** OFI title, Opportunity for improvement.

**Extract report:** Recipient name, Recipient email.

**Filter:** Status presets (All, Scheduled, Completed), Upcoming checkbox, Business units, Schedule before date, Auditors.

### Lists / tables / cards / detail views

- Primary presentation is a data table filtered by Internal/External type.
- Detail drawer and full page use bordered sections for overview, findings, and attachments.
- Linked compliance controls appear as compliance stripe cards.
- Post-completion links on detail page: non-conformity → Incident, risk → Risk Management, OFI → CIP.

### Navigation and workflow

```
Open Internal or External Audits list
  → Schedule new audit (optional) → one or more rows added
  → Row click → detail drawer OR Details → full page
  → Edit mode: add non-conformities / risks / OFIs / attachments / link controls / tasks
  → Update (save changes) OR Completed (save then mark complete)
  → Completed: read-only view + links to promoted Incidents / Risks / CIPs
  → Extract report available at any time from sidebar/drawer
```

No multi-step wizard; flow is list → drawer/page → form/actions.

### Material empty, loading, or restricted states

- Loading placeholders while list, detail, or linked controls load.
- Empty table fallback when no data.
- Empty states: “No non-conformity found”, “No risk found”, “No OFI found”, “No summary”, “No control linked”, “No attachment here”; drawer uses plain “None” for missing sub-entities.
- Missing audit on detail page: “This audit has been deleted or removed.”
- Delete confirmation modal for audit removal; confirmation for attachment delete.
- Restricted when completed: no edit switch, no drawer edit toolbar, no attachment delete, no link-control/create-task actions, no sub-entity CRUD.
- Restricted by permission: Schedule requires manage; edit requires create plus role/type/entity checks; delete requires delete plus super-or-creator.
- API errors shown via toast notifications.

---

## 9. Miscellaneous / Module-Specific Information

### Terminology

- **Identification** — UI label “Non-conformity”; stored as `identifications` on the audit.
- **OFI** — **Opportunity For Improvement**; stored internally in the `cips` array on the audit and promoted to the CIP module on completion.
- **Scheduled vs Completed** — `completed.status === false` shows badge “Scheduled”; `true` shows “Completed”.
- **Internal vs External** — separate navigation entries and list filters; same audit entity with `type` field.

### Important business rules (observed)

- Creating an audit with Quarterly/Half yearly/Yearly interval creates multiple audit records in one action.
- All embedded finding mutations (non-conformities, risks, OFIs, attachments delete, ISO link/unlink, audit update/delete) are blocked once `completed.status === true`.
- On completion, embedded items are promoted with the **same identifier** into Incidents, Risks, and CIPs, preserving traceability via source link to the audit.
- Promoted risks are always created as **Organisational** type in Risk Management.
- Promoted incidents use non-conformity as title and root cause as description.
- List visibility by role (backend): Super Admin, External Auditor, and Internal Auditor see all organisational audits; Head of Service and Basic User see audits in their business unit plus audits with no business unit; External User sees only audits in their business unit.
- Deleting an audit cascades removal of tasks sourced from it.

### Frontend vs backend discrepancies (current behaviour — requires confirmation)

| Topic | Frontend evidence | Backend evidence | Business conclusion |
| ----- | ----------------- | ---------------- | ------------------- |
| Schedule permission | Schedule button uses **MANAGE** | Create route uses **CREATE** | Users with create but not manage may be unable to schedule in UI |
| Business unit / compliance body | Not required in form validation | Required on create | UI may allow submit attempts that backend rejects unless users fill these fields |
| Schedule date | Not marked required in form schema | Required on create | UI may allow incomplete schedule attempts |
| Add attachment endpoint | Service function exists but **unused** | Dedicated add-attachment handler is a **stub** | Attachments work via create/update payload only |
| Complete before schedule date | Completed button available on edit form | Guard uses non-existent `scheduledDate` field | Early completion appears allowed in practice |
| Extract report permission | **No permission check** on send button | Requires Audit create permission | Report send may be visible more broadly than backend allows, or backend may accept broader session access |
| Route licence key | `LICENSES.AUDIT` in routes | Constants define `LICENSES.AUDITS` | Effective licence gating may be inconsistent |
| List drawer data | Uses list row object | Full get-by-id available | Drawer may show stale data vs detail page |
| Global edit-mode flags | Single boolean toggles edit for all items of a type | N/A | Editing one non-conformity/risk/OFI toggles edit mode for all items of that type |
| Promotion on complete | UI shows links after completion | `.create()` calls in promotion may not be awaited | Downstream records may not exist immediately after completion — **requires confirmation** |
| ISO link persistence | UI sends controls | Duplicate push keys in link operation may drop toolkit data | Linked toolkit persistence may be incomplete — **requires confirmation** |
| Get/update by ID org scoping | N/A | List is org-scoped; get/update/delete by ID uses ID only | Cross-org access by known ID may be possible — **requires confirmation** |

### Backend-only or partially exposed behavior

- Calendar auto-sync on audit create/update.
- Compliance checkout automation on audit create (currently emitted with incidents module type — likely unintended; commented code suggests audits was intended).
- Audit statistics endpoint consumed by dashboards.
- Auditor ownership transfer on user offboarding (queue-driven, not audit UI).

### Unclear or incomplete behavior

- Whether completion-before-schedule-date restriction is intentionally disabled due to the missing date field.
- Whether promotion reliably creates all downstream Incidents/Risks/CIPs before the completion response returns.
- Exact CASL mapping of manage vs create vs delete for all audit sub-operations in live org policies.
- Whether calendar events are reliably cleaned up when an audit is deleted (delete path may not trigger calendar cleanup hook).
