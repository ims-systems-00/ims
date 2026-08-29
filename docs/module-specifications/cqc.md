# CQC

## 1. Module Overview

The **CQC** module is a **Care Quality Commission (CQC) compliance workspace** for care providers using iMS. It supports organisations in managing regulatory readiness across **business units (sites)**, structured around the UK CQC **five Key Lines of Enquiry (KLOEs)**: **Safe**, **Effective**, **Caring**, **Responsive**, and **Well-led**.

Its primary business purpose is to give care organisations one place to:

- Provision and work through a **KLOE prompt checklist** per business unit
- Track **compliance progress** and record **inspector-style domain ratings**
- Maintain four operational **incident registers**: **Complaints**, **Whistleblowing**, **Significant Events**, and **Safeguarding**
- **Communicate** internal notices to site staff
- **Email compliance snapshot reports** to external recipients

The module is **separate from the generic Compliance (ISO/ESG) module** in iMS. Although both use “controls” language, CQC is a dedicated licensed toolkit aligned with CQC inspection domains, not ISO clauses.

Primary users are staff with **CQC** permissions — typically compliance leads, site managers, investigators, and administrators. **Global administrators** can see all business units; other users are generally scoped to their current business unit. Access to the toolkit itself depends on **organisation licence** and **per–business-unit provisioning**.

**Terminology note:** Backend code often spells **Compliant / Compliants** and uses **CCQ** in a few handler names (`createCCQTool`, `grantCCQToolAccess`). In the product UI these are **Complaints** and **CQC** respectively. This specification uses **UI-confirmed business terms**.

---

## 2. Features and Capabilities

### Provision the organisation CQC toolkit (one-time)

- **Capability:** Initialise the organisation’s master library of KLOE prompts from a seeded hierarchy (parent/child clause structure).
- **Who uses it:** Administrators when the organisation has the CQC compliance toolkit on its licence.
- **Outcome:** Organisation-wide KLOE template records exist; IAM access to CQC is initialised for **System Administration** and **Compliance Function** policy groups.
- **Conditions:** Requires organisation licence check (`CQC` in compliance tools). Fails if toolkit already exists. Does **not** yet activate any business unit — that is a separate “Add site” step.

### Activate CQC for a business unit (“Add site”)

- **Capability:** Grant the CQC toolkit to a selected **business unit**, creating that unit’s overview dashboard and per-prompt control instances.
- **Who uses it:** Global administrators (UI gated by **Inventory → Create** on the Sites screen).
- **Outcome:** Business unit receives overview metrics, all KLOE prompt instances (starting as not adopted), and CQC IAM access for users in that group; organisation licence usage counter increments.
- **Conditions:** Unit must not already have CQC data. Unit must have CQC assigned in group licence settings — otherwise IAM grant may **block** access. Requires same licence check as toolkit creation.

### Revoke CQC from a business unit (backend only)

- **Capability:** Remove a business unit’s CQC overview and all its control instances; block CQC IAM for users in that group.
- **Who uses it:** API consumers only — **no revoke UI** was found in the frontend.
- **Outcome:** Unit loses CQC dashboard and prompts; org-level KLOE template remains.
- **Conditions:** RBAC DELETE check on revoke route is **commented out**. Licence usage counter is **not** decremented.

### View site overview and analytics

- **Capability:** See per–business-unit dashboard with KLOE domain **ratings**, **compliance percentages**, and register counts (complaints, whistleblowing, significant events, safeguarding — open vs signed off).
- **Who uses it:** Users with **CQC → Read**; global admins see all sites; others land directly on their unit’s overview.
- **Outcome:** Managers understand regulatory readiness and open incident workload at a glance.
- **Conditions:** Overview exists only after toolkit is granted to the unit.

### Work through KLOE prompts (controls)

- **Capability:** View, filter, and update adoption status (**Yes** / **No**) for each KLOE prompt; upload **evidence** files; add **comments** on prompts.
- **Who uses it:** Users with **CQC → Read** (view); **CQC → Update** (adopt); **CQC → Create/Delete** (evidence and comments).
- **Outcome:** Compliance percentages roll up by KLOE domain and overall; parent prompts auto-adopt when all children are compliant.
- **Conditions:** **Locked** parent/summary prompts cannot be edited directly — they aggregate from children. Top-level domain rows (S, E, C, R, W) show domain rating in UI instead of detail actions.

### Set CQC domain ratings

- **Capability:** Manually record inspector-style ratings for Safe, Effective, Caring, Responsive, Well-led, and Overall.
- **Who uses it:** Users with **CQC → Update** on the site **Ratings** tab.
- **Outcome:** Ratings stored on overview; displayed on analytics and included in compliance reports.
- **Conditions:** Ratings are **manual** — not calculated from compliance %. Scale: **Not rated**, **Inadequate**, **Requires improvement**, **Good**, **Outstanding**.

### Broadcast internal CQC notice

- **Capability:** Send an in-app notice to staff about CQC matters for a business unit.
- **Who uses it:** Users with **CQC → Create** on the site **Communicate** tab.
- **Outcome:** Targeted users receive notification linking to CQC overview (`cqc-overview` screen).
- **Conditions:** Audience options observed: **All users** (in group) or **Head of services**. Other/missing audience → **no recipients**.

### Manage complaints register

- **Capability:** Log service complaints with complainant details, investigation, optional external referral, attachments, investigator assignment, and sign-off.
- **Who uses it:** Users with **CQC → Read** (list/detail); **CQC → Create** (add/edit while open); **CQC → Delete** (remove).
- **Outcome:** Formal complaint tracked from creation through investigation to closure; overview complaint counters update.
- **Conditions:** Reference auto-generated **COM-{ID}**. **Closed** = `signed.status` true via sign-off on update. Investigator assignment triggers notification to investigator.

### Manage whistleblowing register

- **Capability:** Record whistleblowing disclosures with disclosure mode (open, confidential, anonymous), reported-to user, optional sharing, and sign-off.
- **Who uses it:** Users with **CQC → Read/Create/Update/Delete** as applicable.
- **Outcome:** Disclosure tracked; `reportedTo` notified on create.
- **Conditions:** Reference **WB-{ID}**. Visibility is **user-centric** (creator, reported-to, or shared-with) — not full group admin view. Required: **reportedTo**, **dateOfIncident**.

### Manage significant events register

- **Capability:** Record significant event reviews with event/review dates, findings, attachments, **plan of actions** (assigned follow-ups), and sign-off.
- **Who uses it:** Users with **CQC → Read/Create/Update/Delete**.
- **Outcome:** Event debrief documented; action assignees notified when actions added; overview counters update.
- **Conditions:** Reference **SE-{ID}**. Required: **dateOfEvent**, **dateOfReviewMeeting**. Actions are separate sub-records with assignee and text — **not** auto-synced to Task module.

### Manage safeguarding register

- **Capability:** Record safeguarding concerns with person affected, investigation, outcome, sharing, attachments, external referral (PDF email), and sign-off.
- **Who uses it:** Users with **CQC → Read/Create/Update/Delete**.
- **Outcome:** Safeguarding case tracked; optional referral email sent to external contact; overview counters update.
- **Conditions:** Reference **SG-{ID}**. Required: **personAffected** (free text, not a user link). Visibility: creator or **sharedWith** users only. Referral sends PDF when `sendReferral: true` on update.

### Create and manage compliance reports

- **Capability:** Generate a PDF compliance snapshot for a business unit and email it to an external recipient; view report history; resend or delete past reports.
- **Who uses it:** Users with **CQC → Create** (send), **Read** (view), **Update** (resend), **Delete** (remove record).
- **Outcome:** External party receives report with KLOE ratings, compliance %, register counts, message, and optional attachments.
- **Conditions:** Reference **CQCRP-{ID}** (UI may show shortened form). Snapshot taken at creation; resend regenerates PDF without new record.

### Export registers to CSV

- **Capability:** Download spreadsheet exports for complaints, whistleblowing, and significant events.
- **Who uses it:** Users with **CQC → Read** on CSV tabs (UI also requires **Inventory → Create** for complaints/whistleblow/significant events tabs).
- **Outcome:** CSV file downloaded for offline analysis or regulatory submission support.
- **Conditions:** Complaints export paginates in batches of 30. Safeguarding CSV exists in backend service but **no route or UI tab** exposed.

---

## 3. User Outcomes / End Results

- **Create:** Provision org KLOE library; activate toolkit per business unit; raise complaints, whistleblowing disclosures, significant events, safeguarding records; add KLOE evidence and comments; assign significant-event actions; send compliance reports and internal notices.
- **View:** Site overview with ratings and compliance %; KLOE prompt lists and detail; all four registers; report history; member lists; notice history.
- **Manage:** Investigate and close register records; adopt KLOE prompts; upload/remove evidence; add/edit/remove control comments; update domain ratings; resend reports.
- **Change:** Edit open register records; update investigation outcomes; refer externally; share whistleblowing/safeguarding with additional users; toggle adoption on prompts.
- **Information received:** Investigators and reported-to users get notifications; action assignees notified; external report and safeguarding referral recipients get emails; staff receive CQC notices.
- **Business actions enabled:** Demonstrate CQC readiness per site; maintain statutory-style registers; evidence KLOE compliance; communicate with staff; share snapshot reports with boards, regulators, or partners.

---

## 4. Scope Boundaries

### In scope

- CQC KLOE toolkit provisioning and per–business-unit activation
- KLOE prompt adoption, compliance roll-up, evidence, and comments
- Manual CQC domain ratings and overview analytics
- Complaints, whistleblowing, significant events (with plan of actions), safeguarding registers
- Internal CQC notices (in-app notifications)
- External compliance report generation and email delivery
- CSV export for three register types (where exposed)

### Out of scope (handled elsewhere)

- **Compliance (ISO/ESG) module** — separate toolkits and control frameworks
- **Incident Management** — general operational incidents; Significant Events are a distinct CQC register
- **Risk Management** — safeguarding has a manual “at-risk register” text field only; no auto risk linkage
- **Task Management** — significant-event actions are not Task records
- **Activity timeline** — separate module; some CQC screens embed Activity for significant events and control details
- **Organisation licensing (purchase)** — CQC must appear in org `complianceTools`; assignment to groups is via IAM/licence admin flows outside this module’s UI
- **CarboCalc “Activity Summary Report”** — unrelated carbon reporting concept

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **Organisation / Licensing** | CQC toolkit availability depends on organisation having **CQC** in compliance tool licences; per-unit grant consumes licence usage. |
| **Business units (Groups / IAM)** | Each site overview and all registers are scoped to a **group** (business unit); toolkit grant/revoke changes group IAM for CQC service. |
| **Users** | Investigators, reported-to, shared-with, action assignees, creators, sign-off users; Members tab lists unit users (view only). |
| **Notifications** | Complaint investigator assignment, whistleblow create, significant-event action assignment, CQC notices, and other triggers deliver in-app notifications. |
| **Email** | Compliance reports and safeguarding referrals sent via email templates with PDF attachments. |
| **Activity** | Significant event detail and CQC control detail embed Activity timeline for comments/interactions (`cqcsignificantevents`, `cqcdetails`). |
| **Inventory (permissions)** | UI uses **Inventory → Create/Read** for Add-site, CSV tabs, and some create flows — in addition to CQC service permissions. |
| **Attachments** | Shared attachment model for complaints, significant events, safeguarding, control evidence, and reports. |

---

## 6. Current Data Model

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| **CQC Tool (org template)** | Master KLOE prompt library for the organisation — clause hierarchy, titles, descriptions, locked parent nodes. | Created once; cloned into per-unit instances on grant. |
| **CQC Control / KLOE detail (per unit)** | Business unit’s instance of one KLOE prompt — adoption, compliance %, evidence, comments. | Core working record for regulatory evidence. |
| **CQC Overview (per unit)** | Dashboard snapshot — domain ratings, compliance %, register open/signed-off counts. | Single overview row per business unit. |
| **Complaint** | Formal service user/stakeholder complaint with investigation and sign-off. | Incident register type 1. |
| **Whistleblowing record** | Internal disclosure with disclosure-mode statements and restricted visibility. | Incident register type 2. |
| **Significant Event** | Post-event review record with findings and plan of actions. | Incident register type 3. |
| **Plan of action** | Follow-up action item on a significant event — text + assignee. | Embedded sub-records on Significant Event. |
| **Safeguarding record** | Safeguarding concern with investigation, sharing, optional external referral. | Incident register type 4. |
| **CQC Report** | Point-in-time compliance snapshot emailed externally. | Historical report record with frozen metrics. |
| **Control comment** | Text note on a KLOE prompt with author and timestamp. | Embedded on control detail — not Activity module. |
| **Control evidence** | File attachment evidencing KLOE adoption. | Embedded on control detail. |

---

## 7. Attributes

### CQC Overview (per business unit)

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| **Group** | Business unit this overview belongs to | One overview per unit |
| **Safe / Effective / Caring / Responsive / Well-led / Overall — rating** | Manual CQC-style inspection rating | Enum: Not rated → Outstanding |
| **Same domains — compliancePercentage** | Calculated % from KLOE prompt adoption | Auto-updated from controls |
| **complaints / whistleBlows / significantEvents / safeGuardings — open** | Count of unsigned records | Auto-maintained |
| **Same — signedOff** | Count of signed-off records | Auto-maintained |

### KLOE prompt (org template + per-unit control)

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| **Clause** | Hierarchical code (e.g. S, S.1, S.1.a) | First letter = KLOE domain |
| **KLOE / title** | Prompt question text | UI label: KLOE-Prompt |
| **Description** | Extended guidance | |
| **Applies to** | Scope note for the prompt | |
| **Is locked** | Parent/aggregate node — not directly editable | |
| **Adopted** | Whether practice is in place | Yes / No |
| **Compliance percentage** | Prompt or subtree completion % | Roll-up logic on parent nodes |
| **Evidences** | Supporting file attachments | |
| **Comments** | User notes on the prompt | value + created by/on |

### Complaint

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| **Reference** | COM-{ID} | Auto |
| **Group** | Business unit | |
| **Name, address, telephone, email** | Complainant contact | Required on create |
| **Preferred communication method** | How to contact complainant | Required |
| **Date and time of incident** | When issue occurred | Required |
| **Type of service** | Service area complained about | Required |
| **Detail** | Complaint description | Required |
| **Name of employee** | Staff member involved | Optional |
| **Investigator** | Internal investigating user | Triggers notification |
| **Investigation, actions, outcome** | Investigation record | Updated after create |
| **Referred to someone else** | External referral flag | |
| **Referred investigator, actions, outcome, organisation name** | External referral details | |
| **Attachments** | Supporting files | |
| **Signed (status, on, by)** | Sign-off / closure | UI: Open vs Closed |

### Whistleblowing

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| **Reference** | WB-{ID} | Auto |
| **Reported to** | User receiving the disclosure | Required; notified on create |
| **Date of incident** | When concern arose | Required |
| **Title, description, place of incident** | Disclosure content | |
| **Involved personnel** | Users implicated or involved | Multi-select |
| **Shared with** | Additional users who may view | |
| **Opinion, identity** | Reporter opinion and identity info | |
| **Statement of disclosure 1/2/3** | Open / confidential / anonymous legal text | User selects via checkbox |
| **Signed** | Closure | |

### Significant Event

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| **Reference** | SE-{ID} | Auto |
| **Date of event / date of review meeting** | Event and review dates | Required |
| **Title, description** | Event summary | |
| **Present personnel** | Attendees (free text) | |
| **Positive points, key issues, areas of concern** | Review findings | |
| **Plan of actions** | Follow-up items | value + assigned user |
| **Attachments** | Supporting files | |
| **Signed** | Closure | |

### Safeguarding

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| **Reference** | SG-{ID} | Auto |
| **Person affected** | Person at risk | Required text — not user ref |
| **Risk register (riskRegistar)** | Whether person is on at-risk register | Yes/No string; field name typo in model |
| **Summary of concerns** | Nature of safeguarding issue | Rich text in UI |
| **Agencies involved** | External agencies | |
| **Investigation, outcome** | Case progress | |
| **Shared with** | Users who can view | Restricted visibility |
| **Referred (status, to, email, rational, organisation)** | External referral | Email PDF on send |
| **Attachments** | Supporting files | |
| **Signed** | Closure | |

### CQC Report

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| **Reference** | CQCRP-{ID} | Auto |
| **Person name, email** | External recipient | Required |
| **Message** | Cover message in email | |
| **Snapshot fields** | Frozen copy of overview ratings, compliance %, register counts | At creation time |
| **Attachments** | Additional files with report | |
| **Created by / on** | Sending user and timestamp | |

---

## 8. Current UI Layout

### Navigation

Collapsible sidebar section **CQC** (requires **CQC → Read**):

| Nav item | Route | Purpose |
| -------- | ----- | ------- |
| **Site** | `/admin/cqc/overviews` | Business unit overview & KLOE toolkit |
| **Complaints** | `/admin/cqc/complaint` | Complaints register |
| **Whistleblowing** | `/admin/cqc/whistleblows` | Whistleblowing register |
| **Significant Events** | `/admin/cqc/significantevent` | Significant events register |
| **Safeguarding** | `/admin/cqc/safeguardings` | Safeguarding register |
| **Reports** | `/admin/cqc/reports` | Send & history of compliance reports |

Hidden detail routes exist for each register, site detail, control detail, and report detail.

### Site / business unit

**Global admin:** Multi-site table — Business unit, Location, Overall compliance bar, Percentage, Details action. Tabs: **Sites** | **Add site** (Inventory CREATE).

**Non-global user:** Redirected straight to their business unit overview — no multi-site list.

**Site detail tabs:**

| Tab | Content |
| --- | ------- |
| **Overview** | Analytics — KLOE ratings table, compliance %, pie charts for four registers (open vs signed off) |
| **KLOE-Prompts** | Filterable prompt table (All / Safe / Effective / Caring / Responsive / Well Led); row opens control detail modal or page |
| **Ratings** | Form for five domain + overall CQC ratings |
| **Members** | Users in business unit (view profile only) |
| **Communicate** | Notice compose form + notice history table |

**Control detail:** Sidebar (clause, unit, adopted, applies to); main view shows prompt text, evidences, comments; edit mode for adopt Yes/No, upload evidence, comment timeline. Locked controls show **N/A** in actions.

**Add site (`BuildTool`):** Select business unit → Confirm → success toast “Toolkit is built successfully for {unit}”.

### Complaints

Tabs (with Inventory CREATE): **Add complaint** | **Complaints** | **CSV**. Table filters: All / Open / Closed. Columns vary by filter. Reference prefix **COM-**. Detail: sidebar metadata + rich-text body, investigation fields, referral, attachments; **Matter closed** checkbox to sign off. Edit disabled when closed.

### Whistleblowing

Tabs (with Inventory CREATE): **Whistleblowing** (form) | **Open** (table) | **CSV**. Filters: All / Open / Closed. Detail: disclosure statements, personnel, shared users. **Observed discrepancy:** detail route access policy uses **Inventory READ** instead of CQC.

### Significant Events

Tabs (with Inventory CREATE): **Add event** | **Significant events** | **CSV**. Detail: event fields, attachments, **Actions** via Activity timeline; separate API for structured plan-of-actions also exists.

### Safeguarding

Tabs: **Add safeguarding** | **List** (no Inventory gate on add tab). Detail: investigation, outcome, referral block, attachments. **Observed discrepancy:** status badge may show inverted Open/Closed labels.

### Reports

Tabs: **Send report** | **Reports** (history). Send form: recipient name, business unit, email, message, attachments. History table: reference, unit, recipient, date; **Resend** and detail modal. Detail shows frozen analytics snapshot.

### CSV export

| Register | UI location | Download filename (observed) |
| -------- | ----------- | --------------------------- |
| Complaints | Complaints CSV tab | `ims-complaints-report.csv` |
| Whistleblowing | Whistleblowing CSV tab | Same filename (likely copy-paste error) |
| Significant Events | Significant Events CSV tab | Same filename |
| Safeguarding | **None** | Backend route not exposed |

### Material empty, loading, and restricted states

- **Loading:** `<Loading />` on list and detail fetches
- **Empty lists:** Default empty table — no dedicated empty-state copy
- **Detail errors:** “This {entity} has been deleted or removed” (wording inconsistent — whistleblow detail may say “Complaint”)
- **Form errors:** Toast “Unknown server error occurred”
- **List errors:** Often logged only — no user toast on several list pages
- **Permission:** Without Inventory CREATE, users see list-only tabs (no Add/CSV on complaints, whistleblow, significant events)
- **Closed records:** Edit disabled when `signed.status` is true
- **Complaints:** Investigators have restricted edit on complainant contact fields via `entityAccessControl`

---

## 9. Miscellaneous / Module-Specific Information

### Confirmed business meaning of CQC

In iMS, **CQC** is an operational compliance product area for **care quality regulation alignment** — not a generic audit log, not the ISO Compliance module, and not an exhaustive implementation of every UK CQC legal requirement. It implements KLOE-style prompt tracking plus four care-sector incident registers and reporting tools the product supports today.

### “Compliant” = Complaint

Backend controllers, routes (`/compliants`), and model naming use **Compliant/Compliants**. The frontend consistently labels this **Complaints**. Business meaning: **formal complaint register entry**, reference **COM-{ID}**.

### CCQ vs CQC naming

**CCQ** appears only in backend handler names (`createCCQTool`, `grantCCQToolAccess`, `revokeCCQToolAccess`). All user-facing labels, services, permissions, and most code use **CQC**. Treat as the same business concept — a typo in handler naming only.

### KLOE compliance calculation (confirmed rules)

- Marking a leaf prompt **Yes** → 100% for that prompt.
- Marking **No** → percentage derived from compliant children count.
- When all children **Yes** → parent auto-set to **Yes** (recursive).
- Section percentages map by clause prefix: **S** Safe, **E** Effective, **C** Caring, **R** Responsive, **W** Well-led; no prefix → **overall**.
- Only **unlocked** prompts count in roll-ups.

### Register lifecycle (confirmed)

All four registers share a similar pattern:

```
Created (open, signed.status = false)
  → Investigation / updates / sharing / actions
  → Signed off (closed, signed.status = true via signatureStatus on update)
```

**Open** counts on overview = total minus signed-off — not a separate status field.

Whistleblowing and safeguarding add **restricted visibility** (user-based, not group-admin-wide).

### CQC Notice vs regulatory notice

**CQC Notice** in this product is an **internal staff broadcast** via the Notifications module — title, message, audience — linking to the site overview. It is **not** a formal regulatory notice from the Care Quality Commission.

### CQC Report workflow

1. User selects business unit and external recipient.
2. System snapshots current overview metrics into report record.
3. PDF generated from template and emailed immediately.
4. **Resend** regenerates PDF and re-emails same record.
5. **Delete** removes record only.

**Implementation suggests** report snapshot may copy wrong `signedOff` counts for whistleblowing, significant events, and safeguarding (copied from `.open` instead of `.signedOff`) — report recipients may see incorrect closed counts.

### Tool access and licensing (business flow)

1. Organisation must have **CQC** in purchased compliance tools.
2. Admin runs **org toolkit build** (once) — seeds KLOE library.
3. Admin assigns CQC to business unit licence (via group/IAM admin — **outside CQC UI**).
4. Admin uses **Add site** to grant toolkit to unit — creates overview + controls + user access.
5. Users without grant see no unit overview/controls for that site.

**Gap:** When licence check fails in `authToolGrantPermision`, middleware may not send HTTP response if not authorized — request may hang.

### Cross-layer discrepancies (summary)

| Topic | Observation |
| ----- | ----------- |
| Compliants spelling | End-to-end backend vs Complaints UI |
| Inventory vs CQC permissions | Add/CSV tabs use Inventory CREATE, not CQC |
| Control update | URL `:id` ignored; update uses `clause` + `group` query |
| Overview fetch | Route has `:id` param but controller uses `group` query |
| Revoke access | Backend only; no UI; no licence decrement |
| Safeguarding CSV | Service exists; no route/UI |
| Significant event CSV | Minimal columns; may error for global-access users |
| Plan of actions vs Activity | Both exist on significant events — structured actions API separate from Activity timeline |
| Report reference in UI | May display as RP- instead of CQCRP- |
| KLOEs.jsx | Alternate UI component not wired into site detail |

### Behaviour that could not be fully determined

- Whether all legacy event handlers under `events/` duplicate newer `eventsV2/` activity creation for CQC.
- Full notification email behaviour for CQC notices (in-app confirmed; email depends on notification config).
- Whether safeguarding `sharedWith` updates trigger notifications (trigger exists but wiring from update path unclear).

### Terminology glossary

| Term in product | Meaning |
| --------------- | ------- |
| Site | Business unit with CQC toolkit |
| KLOE-Prompt | Individual CQC control question |
| Adopted | Yes/No — practice in place |
| Open / Closed | Register unsigned / signed off |
| Communicate | Internal notice to staff |
| Plan of actions | Significant event follow-up tasks |
