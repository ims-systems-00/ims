# Risk Management

## 1. Module Overview

Risk Management is the organisation’s register for raising, scoring, owning, tracking, and closing organisational risks.

Its primary business purpose is to give users a structured way to record risks across categories such as Hardware, Software, People, Premise, Organisational, and Clinical; assign ownership; document controls and mitigation or acceptance; escalate risks for senior attention; and connect risks to related business records (assets, compliance controls, tasks, and documents).

It solves the problem of unmanaged or informal risk handling by keeping a searchable, organisation-scoped register with scores, lifecycle status, ownership, activity history, and links into related modules.

Primary users are people with Risk Management access in the organisation—typically Super Admins, Heads of Service, Basic Users, and Auditors (read-focused)—subject to Risk Management licence and permission checks. Exact role-to-permission mapping for every action: **Unclear — requires confirmation** (see Miscellaneous for observed frontend/backend differences).

---

## 2. Features and Capabilities

### Raise a new risk

- **Capability:** Create a risk with title, type (category), description, likelihood and consequence, optional business unit, category/tag, related asset, owner, and attachments.
- **Who uses it:** Users with Risk Management create permission (UI: Raise control).
- **Outcome:** A new risk is stored with a unique reference (`RK-{number}`), initial and current risk scores (likelihood × consequence), creation metadata, and optional source link if raised from another module. The assigned owner is notified that the risk has been assigned to them. An activity entry records that the risk was raised.
- **Conditions:** Backend requires title, description, and type. Frontend additionally requires owner, likelihood, and consequence. Type must be one of: Hardware, Software, People, Premise, Organisational, Clinical. Asset selection is offered for Hardware, Software, People, and Premise (not Organisational); Clinical asset linkage: **Unclear — requires confirmation** from UI behaviour.

### View, search, filter, and open risks

- **Capability:** Browse a paginated list of risks; search by reference, title, or description; filter by status, business unit, date range, owners, and categories; open a risk in a detail drawer or a full detail page.
- **Who uses it:** Users with Risk Management read access and an applicable Risk Management licence.
- **Outcome:** Users see risks they are allowed to access for their organisation, including reference, business unit, title, score, status, raised date, and owner. List visibility is further limited by business unit for some roles (see Miscellaneous).
- **Conditions:** Access is organisation-scoped. Detail of a missing/deleted risk shows that the risk has been deleted or removed.

### Update a risk

- **Capability:** Change risk details such as title, description, type, owner, tags, asset, likelihood, consequence, mitigation text, acceptance rationale, decision maker, mitigation/acceptance status flags, and add further attachments.
- **Who uses it:** Users with Risk Management create permission (update uses the same create permission on the backend).
- **Outcome:** The risk reflects the new information. Current score is recalculated from likelihood × consequence while initial likelihood/consequence values are preserved from when the risk was raised. Changing the owner notifies the new owner and records an ownership-transfer activity. Setting mitigated or accepted status triggers the corresponding notifications and/or activity entries.
- **Conditions:** A risk that is already mitigated cannot be updated. Business unit cannot be changed on edit in the UI. Title/description are disabled in the UI when the risk is sourced from an audit.

### Mitigate a risk

- **Capability:** Record controls and mitigation information and mark the risk as mitigated.
- **Who uses it:** Users who can update the risk (via the edit form in the current UI).
- **Outcome:** Mitigation text and mitigated status are stored. Super Admins and Heads of Service are notified that the risk was mitigated (when mitigation is applied through the update path used by the UI). Activity records the mitigation. Once mitigated, further editing, escalation, and compliance control linking/unlinking are blocked.
- **Conditions:** A risk that is already mitigated cannot be mitigated again. **Current implementation note:** The UI applies mitigation through the general update action (checkbox + mitigation text), not through the dedicated mitigate operation that also exists on the backend. Whether “who mitigated” and “when” are always populated when using the UI path: **Unclear — requires confirmation** (dedicated mitigate path records actor and timestamp; the update path primarily sets the mitigated status flag).

### Accept a risk

- **Capability:** Record acceptance rationale, identify the decision maker, and mark the risk as accepted.
- **Who uses it:** Users who can update the risk (via the edit form in the current UI).
- **Outcome:** Acceptance details and accepted status are stored. An activity entry records that the risk was accepted.
- **Conditions:** Acceptance does **not** by itself block further update, mitigation, or escalation in backend rules. The UI applies acceptance through the general update action. Dedicated accept operation exists on the backend but is not used by the current UI. Whether “who accepted” and “when” are always populated via the UI path: **Unclear — requires confirmation**.

### Escalate a risk

- **Capability:** Escalate a risk for senior attention.
- **Who uses it:** Users for whom the UI shows escalate (currently gated in the UI by Risk Management delete permission); backend allows escalate for users with Risk Management create permission.
- **Outcome:** Escalated status is set with who escalated and when. Super Admins and Heads of Service are notified (including by email). An activity entry records the escalation.
- **Conditions:** Escalation is allowed only if the risk is not already mitigated and not already escalated. Frontend and backend permission checks for escalate differ — **requires confirmation** which is intentional.

### Delete a risk

- **Capability:** Remove a risk from the register.
- **Who uses it:** Users with Risk Management delete permission; the UI further limits delete to organisation admins or the creator of the risk.
- **Outcome:** The risk is deleted. Tasks that were sourced from that risk are also removed.
- **Conditions:** Delete permission and (in UI) admin-or-creator check.

### Assign or transfer risk ownership

- **Capability:** Set or change the risk owner when creating or updating a risk.
- **Who uses it:** Users who can create or update risks.
- **Outcome:** The owner is recorded. On assignment or transfer, the new owner is notified. Ownership changes are recorded in activity history. Ownership can also be reassigned through organisation user-ownership integrity processes outside this module’s screens.
- **Conditions:** Frontend requires an owner on create; backend treats owner as optional on create.

### Attach and remove supporting files

- **Capability:** Add attachments when creating or updating a risk, and remove an individual attachment.
- **Who uses it:** Users who can create/update (add) or delete (remove attachment in UI).
- **Outcome:** Supporting files are associated with the risk or removed. Adding attachments on update can produce an attachment-added activity/event.
- **Conditions:** Attachment removal requires delete permission in the UI. General risk update (including adding attachments) is blocked if the risk is already mitigated.

### Link and unlink compliance controls

- **Capability:** Associate compliance toolkits and control clauses with a risk, or remove those associations.
- **Who uses it:** Users who also have relevant compliance read access (UI); backend currently authorises these risk-side link/unlink actions with Risk Management read permission.
- **Outcome:** The risk shows linked compliance toolkits and controls. Link and unlink actions produce corresponding compliance-link events for downstream compliance handling. Compliance can also link a risk as control evidence from the Compliance module (reverse direction).
- **Conditions:** Not allowed when the risk is already mitigated. Supported toolkits include frameworks such as ISO 27001 (including 2022 / Annex A), ISO 27002, ISO 9001, ISO 45001, ISO 20000, ISO 14001, DSPT NHS, CQC, BS 9997, ISO 15686-5, and ESG Environmental / Social / Governance.

### Nudge the risk owner

- **Capability:** Send a nudge notification asking the owner to look at the risk.
- **Who uses it:** Users who can act on a non-mitigated risk (nudge control in list/detail actions).
- **Outcome:** The owner receives a nudge notification. A cooldown applies via a next-nudge time (approximately 24 hours).
- **Conditions:** Disabled while the nudge cooldown is active; not shown for mitigated risks.

### Create and manage linked tasks

- **Capability:** Create or view tasks associated with a risk.
- **Who uses it:** Users working a risk who have task capabilities.
- **Outcome:** Tasks are linked to the risk (`moduleType` risks). Deleting the risk removes tasks sourced from it.
- **Conditions:** Task behaviour is primarily owned by Task Management; Risk Management provides the entry points and linkage.

### Manage risk categories (tags)

- **Capability:** Maintain tags/categories applicable to risks, and assign a category on a risk.
- **Who uses it:** Users on the Risk Categories tab and on the raise/edit form.
- **Outcome:** Risks can be classified with an organisation tag/category used for filtering and display.
- **Conditions:** Category management is shared tagging behaviour scoped to risks.

### View related documents

- **Capability:** Browse documents related to the risks module type.
- **Who uses it:** Users with Document Management read permission (tab only shown then).
- **Outcome:** Related documents for risks are discoverable from within Risk Management.
- **Conditions:** Owned by Document Management; Risk Management only surfaces the tab.

### Analyse a risk with AI assistance

- **Capability:** Open an AI analytical assistant for a selected risk (impact, scoring, controls, policies, monitoring, BCP, next steps style guidance).
- **Who uses it:** Users with create permission on the risk toolbar.
- **Outcome:** Users receive analytical guidance; the assistant may support creating related tasks. Guidance is not persisted as a formal risk workflow state.
- **Conditions:** Depends on the shared AI analytical assistant feature.

### Export a risks report

- **Capability:** Download a CSV report of risks (reference, business unit, title, description, likelihood, consequence, score, mitigation, acceptance, decision maker, and key dates).
- **Who uses it:** Backend supports users with Risk Management read permission; report may be group-scoped when the user lacks global access.
- **Outcome:** A CSV file of up to the most recent 100 matching risks.
- **Conditions:** **Current UI does not expose this action.** Backend report capability exists. Treat UI availability as not currently implemented for end users.

### View risk summary on dashboards

- **Capability:** See risk charts/stats and navigate to the risks list.
- **Who uses it:** Users with Risk Management read access on organisation/business-unit dashboards.
- **Outcome:** High-level visibility of risk posture with a path into the register.
- **Conditions:** Dashboard stats are a consumer of Risk Management data, not a separate register.

---

## 3. User Outcomes / End Results

- **Create:** A structured organisational risk record with reference, score, ownership, and optional links to assets, categories, attachments, and originating modules.
- **View:** A searchable, filterable register and detailed views of description, mitigations, acceptance, score (initial vs current), lifecycle status, attachments, activity, tasks, and linked compliance controls.
- **Manage:** Categories for risks, linked tasks, related documents (when permitted), and compliance control associations.
- **Change:** Risk details and current scoring; ownership; mitigation and acceptance content/status; escalation; attachments; compliance links—until mitigation locks further change.
- **Information received:** Risk scores, status (Open / Escalated / Mitigated / Accepted as presented in the UI), lifecycle who/when where recorded, notifications on assignment, escalation, mitigation, and nudges; activity history and comments (comments read-only once mitigated).
- **Business actions enabled:** Formal risk raising and ownership; mitigation or acceptance decisions; escalation to senior roles; evidence linkage for compliance; operational follow-up via tasks; optional AI-assisted analysis.

---

## 4. Scope Boundaries

### In scope

- The organisational risk register (create, read, update, delete).
- Risk scoring (likelihood × consequence; initial vs current).
- Ownership, mitigation, acceptance, and escalation lifecycle flags.
- Attachments on risks.
- Linking/unlinking compliance controls from a risk.
- Risk-side entry points for tasks, categories, related documents, nudges, and AI analysis.
- Risk stats consumed by dashboards.
- Backend CSV report generation for risks.

### Out of scope (handled elsewhere)

- **Audit identification risks** — short risk notes embedded on an audit record (title, description, score only); not the same as Risk Management register records. Handled by Audits.
- **Compliance control evidence workflows** — linking a risk as evidence onto a control is initiated from Compliance; Risk Management owns the risk record and risk→control links.
- **Task lifecycle** — task create/complete/assign rules belong to Task Management.
- **Document content management** — belongs to Document Management.
- **Asset inventory maintenance** — belongs to Inventory / Assets; Risk Management only links to an existing asset.
- **User and role administration** — belongs to Users / IAM; Risk Management consumes owners and permission checks.
- **Notification delivery infrastructure** — shared notifications; Risk Management triggers specific risk events.
- **Xero or other finance “Risk Management” menu stubs** — not part of this module’s live route tree.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| Assets / Inventory | Optional related asset on a risk, chosen according to risk type (Hardware, Software, People, Premise). |
| Business units (Groups) | Optional business unit on a risk; used for filtering and for role-based list visibility. |
| Users | Risk owner, raised by, and lifecycle actors; ownership transfer notifications. |
| Tags / Categories | Optional category on a risk; dedicated Risk Categories tab for managing risk-applicable tags. |
| Compliance | Risks can link toolkits and control clauses; Compliance can attach a risk as control evidence. |
| Tasks | Users create/view tasks sourced from a risk; deleting a risk removes tasks sourced from it. |
| Documents | Related Documents tab surfaces documents associated with the risks module type. |
| Audits | A risk may show a source link when raised from an audit; audits also keep separate embedded risk notes that are not register risks. |
| Notifications | Assignment, escalation, mitigation, and nudge notifications. |
| Dashboard / Stats | Risk charts and aggregates with navigation into the risks list. |
| AI Analytical Assistant | Optional analyse experience for a selected risk. |
| Data import | Risks can be imported with validated fields (including likelihood/consequence range 1–5 on import). |

---

## 6. Current Data Model

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| Risk | An organisational risk entry in the register | Primary record users raise, score, own, mitigate, accept, escalate, and review |
| Risk score | Likelihood and consequence with totals, kept as initial and current | Quantifies severity; current values can change on update; total = likelihood × consequence |
| Lifecycle flags (mitigated / accepted / escalated) | Boolean status with optional actor and timestamp | Drive status display, locks, and notifications |
| Attachment | Supporting file on a risk | Evidence and supporting material |
| Compliance link (toolkits + clauses) | Associated compliance frameworks and controls | Shows which controls relate to the risk |
| Source link | Optional originating module and record | Shows where the risk came from (for example an audit) |
| Category / tag | Classification label applicable to risks | Filtering and overview |
| Linked task | Task sourced from the risk | Operational follow-up (owned by Tasks, referenced here) |

There is **no** separate “closed” or named “residual risk” entity. “Open” in the UI/stats generally means not mitigated (accepted or escalated risks can still appear in “open” aggregations depending on filters).

---

## 7. Attributes

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Reference | User-facing identifier | Generated as `RK-{number}` |
| Title | Short name of the risk | Required |
| Description | Full description of the risk | Required; rich text in UI |
| Type | Risk category / domain | Required; Hardware, Software, People, Premise, Organisational, Clinical |
| Business unit (group) | Organisational unit the risk belongs to | Optional; not editable in UI after create |
| Category (tags and categories) | Additional classification | Optional |
| Asset | Related inventory asset | Optional; type drives which asset list is offered |
| Owner | Person responsible for the risk | Required in UI create; optional in backend create validation |
| Likelihood (initial / current) | How likely the risk is | UI treats as required (typically 1–5); backend defaults to 1; API create does not enforce 1–5 (import does) |
| Consequence (initial / current) | How severe the impact would be | Same as likelihood |
| Risk score (initial / current total) | Likelihood × consequence | Calculated by the system; list colour bands: ≤10, ≤15, >15 |
| Controls and mitigation | Text describing controls / mitigation | Used when mitigating |
| Mitigated (status, by, on) | Whether the risk is mitigated, who, when | Status locks further change; actor/timestamp completeness depends on path used |
| Acceptance rationale | Why the risk is accepted | Used when accepting |
| Decision maker | Who decided acceptance | Free text |
| Accepted (status, by, on) | Whether the risk is accepted, who, when | Does not lock updates by itself |
| Escalated (status, by, on) | Whether the risk is escalated, who, when | One-way; blocks re-escalation |
| Attachments | Supporting files | Add on create/update; remove individually |
| Linked compliance toolkits / clauses | Related compliance controls | Cannot change when mitigated |
| Source (module type / module) | Originating record | Shown when present (for example audits) |
| Raised by / on | Who created the risk and when | Set on create |
| Updated by / on | Last update metadata | Set on update |
| Next nudge at | Cooldown for nudge | Set by nudge workflow |
| Organisation | Tenant scope | Always applied |

---

## 8. Current UI Layout

### Main screens / pages

- **Risks list** — `/admin/risks`, sidebar label **Risks**.
- **Risk detail page** — `/admin/risks/:id` (not shown in sidebar).
- Entry also from dashboard risk widgets, Compliance linked-risk cards, and Audit detail links to a risk id.

### Important sections and views

**List page tabs**

1. **All Risks** — searchable/filterable table and drawers.
2. **Risk Categories** — tags manager for risks.
3. **Related Documents** — only if the user has Document Management read access.

**List table columns:** Reference, Business Unit, Title, Risk Score (colour-coded), Status (Open / Escalated / Mitigated / Accepted), Raised, Risk Owner, Actions.

**Detail drawer tabs:** Details, Activity, Life Cycle, Tasks, Linked controls.

**Full detail page tabs:** Description, Activity, Task.

**Details content (drawer):** Overview (reference, business unit, type, category, asset, owner, raised by, decision maker, audit source link when present), description, mitigations, acceptance rationale, attachments, score (initial vs current likelihood/consequence/total), lifecycle status rows.

### Primary actions

- Raise risk (create drawer).
- Open detail drawer (row click) or full Details page (row actions).
- Edit / update (including Mitigated and Accepted checkboxes).
- Escalate, Nudge, Delete (row/drawer actions; hidden or blocked when mitigated or otherwise restricted).
- Link / unlink compliance controls.
- Create / link task.
- Analyse (AI assistant).
- Delete attachment.

### Forms

Single raise/edit form including:

- Risk title, Type, Business unit, Category, Risk owner, Asset (when applicable), Description, Likelihood, Consequence, Attachments.
- On edit of an existing risk: Mitigations, Mitigated checkbox, Acceptance rationale, Decision maker, Accepted checkbox.
- Filter form: status (Open / Escalated / Mitigated / Accepted), business units, date from/to, owners, categories.

### Lists / tables / cards / detail views

- Primary presentation is a data table, not a card grid.
- Linked compliance controls appear as control cards/stripes.
- Compliance module uses bordered risk cards when finding/linking risks as evidence.

### Navigation and workflow

1. Open Risks from sidebar (or dashboard/compliance/audit links).
2. Raise a risk or select an existing one.
3. Optionally nudge, escalate, link controls, link tasks, or run AI analysis.
4. Edit to update details and/or mark mitigated and/or accepted.
5. Mitigated risks hide most mutating actions; activity comments become read-only.

No multi-step wizard; flow is list → drawer/page → form/actions.

### Material empty, loading, or restricted states

- Loading placeholders while list, detail, or linked controls load.
- Empty table fallback messaging when no data.
- Empty mitigations/description messaging; empty linked-controls message.
- Missing risk on detail page: “This risk has been deleted or removed.”
- Restricted: without create permission, Raise/edit toolbar actions are unavailable; without delete permission, escalate/delete/attachment delete controls are hidden in the UI; mitigated risks suppress nudge/escalate/edit-style actions.
- Nudge disabled during cooldown; already escalated shows feedback and blocks re-escalation.
- No dedicated in-module “access denied” screen—access is gated by route policy and licence upstream.

---

## 9. Miscellaneous / Module-Specific Information

### Important business rules (observed)

- Risk score = likelihood × consequence.
- Mitigated status is the main lock: blocks update, re-mitigation, escalation, and compliance link/unlink.
- Escalation is one-way and blocked if already mitigated or already escalated.
- Accepted status alone does not apply the same hard lock as mitigated.
- Deleting a risk removes tasks sourced from that risk.
- List visibility by role (backend): Super Admin, External Auditor, and Internal Auditor see all organisational risks; Head of Service and Basic User see risks in their business unit plus risks with no business unit; External User sees only risks in their business unit. Opening a single risk by id is organisation-scoped but does not re-apply that group filter — **requires confirmation** whether this is intentional.
- Default IAM posture: site/business/super admin, HoS, and Basic typically have full Risk Management actions; Compliance body / Auditor typically read-only — **requires confirmation** against live org policies.

### Frontend vs backend discrepancies (current behaviour — requires confirmation)

| Topic | Frontend evidence | Backend evidence | Business conclusion |
| ----- | ----------------- | ---------------- | ------------------- |
| Mitigate / accept | Applied via edit/update form | Dedicated mitigate/accept operations also exist; UI services for them are unused | Users mitigate/accept through update; dedicated paths are not the current user journey |
| Escalate permission | UI shows escalate when user has **delete** permission | Backend requires **create** permission | A user may see escalate and fail, or be able to escalate via API without seeing the control — **requires confirmation** |
| Owner on create | Required in the form | Optional in create validation | UI enforces owner; API alone may allow ownerless create |
| CSV export | No UI control | Report download supported for read users | Export is implemented server-side but not exposed in the current Risk Management UI |
| Route role constants | Route config references role keys that do not match defined role enum names | Authorisation primarily uses service permissions and role-scoped list filters | Effective access may depend more on permission/licence than the listed route roles — **requires confirmation** |

### Terminology

- **Type** in the form is the risk domain (Hardware, Software, etc.); schema aliases this as risk category, while **Category** in the UI usually means tags/categories.
- **Open** in the list means not mitigated and not shown as accepted/escalated by the UI’s status precedence (Mitigated → Accepted → Escalated → Open).

### Special notes

- Residual risk is not a named field; users see initial vs current score instead.
- AI analysis is advisory and does not replace mitigation/acceptance/escalation status.
- Seed/admin stub endpoints and unused legacy risk service code are not user-facing capabilities and are omitted from features above.
