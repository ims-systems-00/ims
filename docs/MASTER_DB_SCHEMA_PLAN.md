# Master Database Schema Plan

**Document status:** Current-state investigation only  
**Date basis:** Repository inspection of module specifications and MongoDB models  
**Scope:** Entire IMS system domain as evidenced in this repository  

This document **does not** redesign, migrate, or modify the database. It maps the **current** business domain and MongoDB persistence.

---

## 1. Purpose and Scope

This Master Database Schema Plan provides a **system-wide view** of the IMS data domain by combining:

1. **Module specifications** under `docs/module-specifications/` — business meaning, ownership, workflows, and terminology.
2. **MongoDB / Mongoose models** under `ims-systems-backend/src/models/` — what is actually persisted, referenced, embedded, and scoped.

It explains:

- Major business entities across the system
- What each entity represents
- Which module owns or primarily manages each entity
- Which MongoDB model represents each entity
- How entities relate
- Which entities are shared
- Where ownership is unclear or duplicated
- Where specifications and models agree or differ
- Cross-module relationships and confirmation levels

It is **not** an instruction to change schemas, add indexes, migrate data, or refactor code.

---

## 2. Source of Truth and Investigation Scope

### Sources

| Source | Role |
| ------ | ---- |
| `docs/module-specifications/MODULE_SPECIFICATION_REFERENCE.md` | Documentation rules and section meaning |
| All module specification `.md` files (48 specs; excluding README and the reference itself) | Business meaning, ownership, linked modules, attributes, UI workflows |
| `ims-systems-backend/src/models/mongodb/system/` | Primary tenant/product models |
| `ims-systems-backend/src/models/mongodb/admin/` | Platform admin / tenant registry models |
| `ims-systems-backend/src/models/mongodb/shared/` | Shared security models |
| `ims-systems-backend/src/models/mongodb/website/` | Website lead/booking models |
| `ims-systems-backend/src/models/mongodb/schemaTemplates/` | Shared embeds (attachment, source, submission, etc.) |
| Material model plugins (`orgDataPlugin`, soft-delete, source/compliance link, CC calculators, etc.) | Stored/derived behaviour |

### Hierarchy when sources conflict

| Concern | Primary source |
| ------- | -------------- |
| Business meaning / why data exists | Module specifications |
| Persistence structure / what is stored | MongoDB models |
| Conflicts | Documented explicitly; neither side silently “won” |

### Relationship confirmation levels

| Level | Meaning |
| ----- | ------- |
| **Confirmed in MongoDB Model** | ObjectId refs, embeds, arrays, or explicit schema fields |
| **Confirmed by Business Workflow** | Specs and application behaviour confirm the relationship even if not FK-enforced |
| **Inferred** | Specs suggest a relationship; persistence not fully confirmed |
| **Unclear** | Insufficient evidence |

### Investigation counts

- **Module specifications investigated:** 48  
- **Mongoose model registrations located:** ~94 model names across ~93 files  
- **Non-model JS under models tree:** ~66 (plugins, templates, calculators, enums)

---

## 3. System-Wide Data Domain Overview

| Domain | Modules / areas | Core entities |
| ------ | --------------- | ------------- |
| **Identity & access** | Users, Authentication / V3 Auth, Admin Auth, Membership, Invitations, Functional Units, IAM policies/roles | User, Session, Membership, Invitation, Functional Unit, Access Policy, Role, iMS Admin |
| **Organisation & commercial** | Organisation, License Request, Partnership, Tenants, Transactional Email | Organisation, Licence Request, Partnership Programme, Tenant, Txn Email |
| **Risk, incident & improvement** | Risk, Incident, Audit, OFI (CIP) | Risk, Incident, Audit (+ embeds), OFI/CIP |
| **Compliance & CQC** | Compliance, CQC | Control templates/status/evidence/overview; CQC tools, registers, reports |
| **Work & collaboration** | Task, Activity, Notifications, Calendar | Task, Activity, Notification, Calendar Event |
| **CRM & revenue** | Customers, Invoice, Email Campaign | Customer, Invoice, Campaign, Delivery |
| **Suppliers & assets** | Suppliers, Assets | Supplier; five inventory asset types |
| **Documents & files** | Document Management, Attachment, File Handler | Repository, Tree node, Signature; Attachment registry; embedded file metadata |
| **Governance & reporting** | Management Review, KPI, Dashboard, Stats, Charts | Management Review, KPI Objective, Dashboards, Charts |
| **Staff wallet / HR ops** | Leaves, Expense Reports, Worklog, Staff Alerts | Leave, Expense Report, Worklog, Staff Alert |
| **Carbon (Carbo Calc)** | CC | Parameters, Locations, Calculations, Factors, Reports, Initiatives |
| **Forms & projects** | IMS Form; IMS Projects (models only) | Forms/elements/submissions; Projects/work packages |
| **Platform utilities** | Tags, AI, Data Import, Statics, Contact IMS, Register Public Interest, Jira Integration | Tags; AI Response; transient import; public leads |
| **Website / marketing** | Contact IMS, website models | Bookings, closed dates, getStarted (often unused by product UI) |

---

## 4. Master Entity Inventory

| Business Entity | Technical Model | Primary Owner Module | Type | Primary Scope | Confidence |
| --------------- | --------------- | -------------------- | ---- | ------------- | ---------- |
| Organisation | `organizations` | Organisation | primary | organisation (root) | Confirmed |
| User | `users` | Users | shared | global identity | Confirmed |
| Session (product) | `sessions` | Authentication | supporting | user | Confirmed |
| Membership | `memberships` | Membership | shared | user × organisation | Confirmed |
| Functional Unit | `groups` | Functional Units | shared | organisation | Confirmed |
| Group Premise | `grouppremises` | Functional Units | supporting | organisation | Confirmed |
| Access Policy | `accesspolicies` | Functional Units / IAM | supporting | organisation | Confirmed |
| IAM Role | `roles` | IAM | supporting | organisation | Strongly inferred |
| Invitation | `invitations` | Invitations | primary | organisation | Confirmed |
| Partnership Programme | `partnership_programs` | Partnership Program | primary | organisation | Confirmed |
| Licence Request | `licenserequests` | License Request | primary | organisation | Confirmed |
| Transactional Email address | `txnEmails` | Transactional Email | supporting | organisation | Confirmed |
| Notification | `notifications` | Notifications | shared | organisation | Confirmed |
| Activity | `activities` | Activity | shared | organisation | Confirmed |
| Attachment (registry) | `attachments` | Attachment | shared / underused | organisation | Confirmed |
| Calendar Event | `calenderevents` | Calendar | shared | organisation | Confirmed |
| Task | `tasks` | Task | shared | organisation | Confirmed |
| Risk | `risks` | Risk Management | primary | organisation | Confirmed |
| Incident | `incidents` | Incident | primary | organisation | Confirmed |
| Audit | `audits` | Audit | primary | organisation | Confirmed |
| OFI (CIP) | `cips` | OFI | primary | organisation | Confirmed |
| Compliance Control (template) | `compliancecontrols` | Compliance | shared reference | global catalogue | Confirmed |
| Control Status | `controlstatuses` | Compliance | primary | organisation | Confirmed |
| Control Evidence | `controlevidence` | Compliance | supporting | organisation | Confirmed |
| Compliance Overview | `complianceoverviews` | Compliance | derived/aggregate | organisation | Confirmed |
| Supplier | `suppliers` | Suppliers | primary | organisation | Confirmed |
| Customer | `customers` | Customers | primary | organisation | Confirmed |
| Invoice | `invoices` | Invoice | primary | organisation | Confirmed |
| Email Campaign | `emailcampaigns` | Email Campaign | primary | organisation | Confirmed |
| Campaign Delivery | `campaigndeliveries` | Email Campaign | supporting | organisation | Confirmed |
| Tag and Category | `tagsAndCategories` | Tags and Categories | shared | organisation | Confirmed |
| Custom Form (legacy) | `customForms` | Customisation | supporting | organisation | Unclear |
| IMS Form | `imsForms` | IMS Form | primary | organisation | Confirmed |
| IMS Form Element | `imsFormElements` | IMS Form | embedded/child | organisation | Confirmed |
| IMS Form Submission | `imsFormSubmissions` | IMS Form | primary | organisation | Confirmed |
| IMS Form Response | `imsFormResponses` | IMS Form | child | organisation | Confirmed |
| Hardware Asset | `hardwareassets` | Assets | primary | organisation | Confirmed |
| Software Asset | `softwareassets` | Assets | primary | organisation | Confirmed |
| Information Asset | `informationassets` | Assets | primary | organisation | Confirmed |
| People Asset | `peopleassets` | Assets | primary | organisation | Confirmed |
| Premise Asset | `premiseassets` | Assets | primary | organisation | Confirmed |
| Document Repository | `documentrepositories` | Document Management | primary | organisation | Confirmed |
| Document Tree Node | `documenttrees` | Document Management | primary | organisation | Confirmed |
| Document Signature | `documentsignatures` | Document Management | supporting | organisation | Confirmed |
| Management Review | `managementreviews` | Management Review | primary | organisation | Confirmed |
| KPI Objective | `kpiobjectives` | KPI Objective | primary | organisation | Confirmed |
| Organisation Dashboard | `dashboards` | Dashboard | aggregate | organisation | Confirmed |
| Group Dashboard | `groupdashboards` | Dashboard | aggregate | organisation + group | Confirmed |
| Chart definition | `charts` | Charts | supporting | **unscoped** | Confirmed |
| AI Response | `aiResponses` | AI | supporting | organisation | Confirmed |
| Leave | `leaves` | Leaves | primary | organisation | Confirmed |
| Expense Report | `expensereports` | Expense Reports | primary | organisation | Confirmed |
| Worklog | `worklogs` | Worklog | primary | **user (no org field)** | Confirmed |
| Staff Alert | `staffalerts` | Staff Alerts | supporting | organisation (weakly enforced) | Strongly inferred |
| Wallet Unit / PDP | `walletunits` | Wallet (unused UI) | supporting | user | Unclear |
| CC Parameter | `ccparameters` | CC (Carbo Calc) | primary | organisation | Confirmed |
| CC Location | `cclocations` | CC | primary | organisation | Confirmed |
| CC Calculation | `cccalculations` | CC | primary | organisation | Confirmed |
| CC Custom Factor | `cccustomfactors` | CC | primary | organisation | Confirmed |
| CC DEFRA Factor | `ccfactors` | CC | reference | **global** | Confirmed |
| CC Report | `ccreports` | CC | supporting | organisation | Strongly inferred |
| CC Reduction Initiative | `cccarbonreductioninitiatives` | CC | primary | organisation | Confirmed |
| IMS Project | `imsprojects` | IMS Projects *(no dedicated spec)* | primary | organisation | Confirmed |
| IMS Project Work Package | `imsprojectworkpackages` | IMS Projects | child | organisation | Confirmed |
| IMS Project Membership | `imsprojectmemberships` | IMS Projects | supporting | organisation | Confirmed |
| IMS Project Budget / Materials / Reports / Schedules / Relationships | various `imsproject*` | IMS Projects | supporting | organisation | Confirmed |
| CQC Tool | `cqctools` | CQC | reference | organisation | Confirmed |
| CQC Detail / Overview / Report | `cqcdetails`, `cqcoverviews`, `cqcreports` | CQC | primary | organisation | Confirmed |
| CQC Complaint | `complaints` | CQC | primary | organisation | Confirmed |
| CQC Whistleblowing | `cqcwhistleblows` | CQC | primary | organisation | Confirmed |
| CQC Significant Event | `cqcsignificantevents` | CQC | primary | organisation | Confirmed |
| CQC Safeguarding | `cqcsafeguardings` | CQC | primary | organisation | Confirmed |
| iMS Admin | `ims_admins` | Admin Authentication | primary | platform | Confirmed |
| Tenant | `tenant` | Tenants | infrastructure | platform | Confirmed |
| Build | `builds` | Admin system build | infrastructure | platform | Confirmed |
| Register Public Interest | `registerPublicInterest` | Register Public Interest | primary | global / anonymous | Confirmed |
| Website Booking / Closed Date / Get Started | `bookings`, `closeddates`, `getStarted` | Contact IMS / website | supporting | global | Strongly inferred |
| Public Access Token | `publicaccesstokens` | Shared security | supporting | organisation | Confirmed |
| API Key | `apikeys` | Admin | supporting | platform | Confirmed |
| Embedded file metadata | schema template `attachment` | File Handler consumers | embedded | parent record | Confirmed |
| Polymorphic source link | schema template `source` | Risk/Task/Incident/etc. | embedded | parent | Confirmed |
| Wallet submission workflow | schema template `submission` | Leaves / Expenses | embedded | parent | Confirmed |

---

## 5. Entity Definitions

> For brevity, closely related siblings are grouped. Each group still states technical models and specification status.

### 5.1 Organisation

**Technical Model:** `organizations`  
**Primary Owner Module:** Organisation  
**Consumer Modules:** Nearly all operational modules  
**Entity Type:** primary (tenant-company root)  
**Primary Scope:** organisation (is the scope root)  
**Ownership Confidence:** Confirmed  

**Business Purpose:** Licensed company using IMS — identity, licences, payment state, reporting dates, branding, incident targets.  

**Key Business Attributes:** Name/company numbers; licence pools and usage counters; Running/Paused; Trial/Subscribed/Unsubscribed; partner/customer flags; system dates; report subscriptions.  

**Persistence:** Dedicated model **without** `orgDataPlugin` (other models point *to* it).  

**Primary Relationships:** Has memberships, groups, and organisation-scoped business data; may link to partnership programme.  

**Lifecycle:** Created → Customer (Go Live) → Running/Paused; subscription states.  

**Spec vs Model:** Aligned. Must not be confused with **Tenant**.

### 5.2 User

**Technical Model:** `users`  
**Primary Owner Module:** Users  
**Consumer Modules:** Auth, Membership, and all modules referencing people  
**Entity Type:** shared  
**Primary Scope:** global identity (no `organization` field)  
**Ownership Confidence:** Confirmed  

**Business Purpose:** Person identity, credentials, system access, profile/signature.  

**Key Attributes:** Email/password; verification (`varified` spelling in model); systemAccess Active/Blocked/Deactivated; accessPolicies bindings; preferences.  

**Persistence:** Dedicated; organisation participation via Membership only.  

**Lifecycle:** Invite/register → verify → active; block/deactivate.  

**Spec vs Model:** Aligned. Specs note User vs Membership field splits (e.g. line managers).

### 5.3 Membership

**Technical Model:** `memberships`  
**Primary Owner Module:** Membership  
**Consumer Modules:** Auth org selection, Leaves, Functional Units, Licensing  
**Entity Type:** shared associative  
**Primary Scope:** organisation  
**Ownership Confidence:** Confirmed  

**Business Purpose:** User ↔ Organisation employment/access link.  

**Key Attributes:** Role; groups[]; lineManagers; leave entitlement; work locations; clock state (shared with Worklog concepts).  

**Spec vs Model:** Aligned; Leaves/Expense may read managers from User instead of Membership (**specification-model / workflow mismatch**).

### 5.4 Functional Unit (`groups`)

**Technical Model:** `groups` (code/IAM: iamGroup; UI: Business Unit)  
**Canonical Business Name:** Functional Unit  
**Alternative Names:** Business Unit, IAM Group, Group  
**Primary Owner Module:** Functional Units  
**Entity Type:** shared  
**Primary Scope:** organisation  
**Ownership Confidence:** Confirmed  

**Business Purpose:** Operational subdivision for filtering, licensing, toolkits, and access.  

**Key Attributes:** Access type; unit details; userLicenses; accesspolicies ref.  

**Related:** `grouppremises`, `accesspolicies`, `roles`.

### 5.5 Invitation, Partnership, Licence Request, Txn Email

| Entity | Model | Owner | Purpose | Spec status |
| ------ | ----- | ----- | ------- | ----------- |
| Invitation | `invitations` | Invitations | Pending org join | Aligned |
| Partnership Programme | `partnership_programs` | Partnership Program | Partner org relationship | Aligned (auto-accept quirks noted) |
| Licence Request | `licenserequests` | License Request | Request extra capacity/products | Aligned (UI status wording differs) |
| Transactional Email | `txnEmails` | Transactional Email | External email opt-in | Partial (verified flag unused by notifications) |

### 5.6 Notification, Activity, Calendar Event, Task

**Notification (`notifications`)** — Shared in-app alerts with sent/read/popup states and screen links. Org-scoped. Spec aligned.

**Activity (`activities`)** — Polymorphic timeline comments/events (`moduleType` + module id). Org-scoped. Spec aligned.

**Calendar Event (`calenderevents`)** — Standalone or source-linked schedules. Org-scoped. Spec notes `group` vs `groups` mismatch risk.

**Task (`tasks`)** — Follow-up work with assignees, status Pending/In progress/Complete, optional polymorphic `source`. Spec aligned.

### 5.7 Risk, Incident, Audit, OFI

**Risk (`risks`)** — Register risk with scores and mitigated/accepted/escalated flags; tags; ISO controls; source; attachments embed.  

**Incident (`incidents`)** — Priority P1–P4; escalated/resolved flags; tags; ISO controls; source.  

**Audit (`audits`)** — Scheduled/completed; embeds NC/risk/OFI findings; promotes to Incidents/Risks/CIPs on completion.  

**OFI (`cips`)** — Pending → In Progress → Implemented; ISO controls; source; attachments. Technical name CIP / business name OFI.

**Spec vs Model:** Aligned for core; naming CIP vs OFI is a terminology inconsistency.

### 5.8 Compliance

**Templates `compliancecontrols`** — Global catalogue (no org plugin).  
**Instances `controlstatuses`** — Org (+ group) implementation state.  
**Evidence `controlevidence`** — Links to risks/incidents/cips/documenttrees or files.  
**Overview `complianceoverviews`** — Aggregate %.  

**Spec vs Model:** Aligned; Partial/Not implemented enum usage partially unclear in UI.

### 5.9 CQC

Models: `cqctools`, `cqcdetails`, `cqcoverviews`, `cqcreports`, `complaints`, `cqcwhistleblows`, `cqcsignificantevents`, `cqcsafeguardings`.  

Org + group scoped registers with signed-off workflows. Separate from ISO Compliance. Spec aligned (naming Compliants/CCQ quirks noted).

### 5.10 Supplier, Customer, Invoice, Campaigns

**Supplier** — Buyer, contracts/SLA embeds, KPI text embeds, isCompliant derived.  
**Customer** — Stage/status CRM pipeline; account manager; tags.  
**Invoice** — Draft/Sent/Paid; embedded lines; linked customer.  
**Email Campaign / Delivery** — Draft/Queued/Sent; recipients batches.  

Spec aligned.

### 5.11 Assets (five collections)

Five independent models — no unified Asset parent. People assets ≠ Users. Spec aligned.

### 5.12 Documents

**Repository / Tree / Signature** — Privacy, versions, authorisation embeds, compliance links. Soft-delete. Spec aligned. Projects may create repositories (**workflow confirmed**; IMS Project lacks dedicated spec).

### 5.13 Attachment registry vs embedded files

**Registry `attachments`** — Polymorphic; soft-delete; **product UI largely unused**.  
**Embedded `attachment` template** — Dominant runtime pattern on parents.  

**Spec vs Model:** Dual pattern explicitly documented in Attachment / File Handler specs — **confirmed duplication of approaches**.

### 5.14 Management Review, KPI, Dashboard, Charts, Stats, AI

| Entity | Persistence | Notes |
| ------ | ----------- | ----- |
| Management Review | `managementreviews` | Scheduled/Completed |
| KPI Objective | `kpiobjectives` | Measurement fields unused in UI |
| Dashboard / Group Dashboard | `dashboards`, `groupdashboards` | Snapshot aggregates; live UI often uses Stats API |
| Chart | `charts` | No org scope; no product UI |
| Stats | **No collection** | Derived aggregations |
| AI Response | `aiResponses` | Saved advisory analysis + source |

### 5.15 Wallet: Leaves, Expenses, Worklog, Staff Alerts

| Entity | Model | Org scope | Lifecycle |
| ------ | ----- | --------- | --------- |
| Leave | `leaves` | Yes | Draft/Pending/Ongoing/Approved/Rejected |
| Expense Report | `expensereports` | Yes | Draft→Approved/Rejected |
| Worklog | `worklogs` | **No** | Clock in/pause/out |
| Staff Alert | `staffalerts` | Plugin present; weakly used | Create/resolution |
| Wallet Unit | `walletunits` | No | Unused UI |

### 5.16 Carbo Calc (CC)

Parameters (embedded years/boundaries), Locations, Calculations (calculator plugins derive GHG), Custom Factors, global DEFRA Factors, Reports, Reduction Initiatives. Spec `cc.md` aligned.

### 5.17 IMS Form

`imsForms`, `imsFormElements`, `imsFormSubmissions`, `imsFormResponses` — models confirmed; **no product UI** in investigated frontend. Spec covers backend-only status.

### 5.18 IMS Project *(no dedicated module specification)*

Models include `imsprojects`, work packages, assignments, relationships, document relationships, memberships, budgets, materials, reports, email schedules.  

**Specification vs Model Status:** **Implementation not covered by dedicated module specification.** Referenced from Document Management, Attachment, Activity, Charts, Notifications specs.

### 5.19 Platform / website / leads

| Entity | Model | Scope | Spec |
| ------ | ----- | ----- | ---- |
| iMS Admin | `ims_admins` | platform | Admin Authentication |
| Tenant | `tenant` | platform partition | Tenants |
| Build / Build Request | `builds`, `buildrequest` | platform | Partial / admin |
| Register Public Interest | `registerPublicInterest` | global | Spec exists |
| Bookings / Closed dates / GetStarted | website models | global | Contact IMS notes unused persistence |
| Public Access Token | `publicaccesstokens` | organisation | Supporting |
| API Key | `apikeys` | platform | Admin |

---

## 6. Master Relationship Map

| Source Entity | Relationship | Target Entity | Cardinality | Implementation | Business Purpose | Confirmation |
| ------------- | ------------ | ------------- | ----------- | -------------- | ---------------- | ------------ |
| Membership | belongs to | Organisation | N:1 | ObjectId `organization` | Org employment | Confirmed in MongoDB Model |
| Membership | identifies | User | N:1 | ObjectId user ref | Person in org | Confirmed in MongoDB Model |
| Membership | assigned to | Functional Unit | N:M | `groups[]` | Unit membership | Confirmed in MongoDB Model |
| Membership | lists | Line Manager (User) | N:M | array of user refs | Approval routing | Confirmed in MongoDB Model |
| Functional Unit | belongs to | Organisation | N:1 | orgDataPlugin | Subdivision | Confirmed in MongoDB Model |
| Functional Unit | uses | Access Policy | N:0..1 | ObjectId | Permissions | Confirmed in MongoDB Model |
| Invitation | targets | Organisation | N:1 | org ref | Join request | Confirmed in MongoDB Model |
| Invitation | becomes | Membership | 1:0..1 | acceptance workflow | Onboarding | Confirmed by Business Workflow |
| Session | belongs to | User | N:1 | ObjectId | Auth session | Confirmed in MongoDB Model |
| Most operational records | scoped to | Organisation | N:1 | orgDataPlugin | Tenant isolation | Confirmed in MongoDB Model |
| Risk/Incident/Task/etc. | scoped to | Functional Unit | N:0..1 | `group` ref | Unit filter | Confirmed in MongoDB Model |
| Risk/Incident/Customer/Assets | classified by | Tag/Category | N:0..1 | ObjectId | Classification | Confirmed in MongoDB Model |
| Risk | owned by | User | N:1 | owner | Accountability | Confirmed in MongoDB Model |
| Risk | may reference | Inventory Asset | N:0..1 | asset refs | Asset risk | Confirmed in MongoDB Model |
| Risk/Incident/Audit/OFI | link to | Compliance Control | N:M | complianceLinkPlugin | ISO traceability | Confirmed in MongoDB Model |
| Task | assignees | User | N:M | embedded assignees | Work allocation | Confirmed in MongoDB Model |
| Task | originates from | Source record | N:0..1 | sourceLinkPlugin | Contextual task | Confirmed in MongoDB Model |
| Activity | concerns | Source record | N:1 | polymorphic moduleType | Timeline | Confirmed in MongoDB Model |
| Notification | delivered to | User | N:M | recipient refs | Alerts | Confirmed in MongoDB Model |
| Attachment registry | points to | Source record | N:1 | moduleType+module | File association | Confirmed in MongoDB Model |
| Parent record | embeds | File metadata | 1:N | attachment template | Runtime files | Confirmed in MongoDB Model |
| Audit | embeds | NC / Risk / OFI findings | 1:N | embedded arrays | Findings while open | Confirmed in MongoDB Model |
| Audit completion | promotes to | Incident / Risk / OFI | 1:1 per finding | workflow + source | Operational registers | Confirmed by Business Workflow |
| Control Status | instance of | Compliance Control | N:1 | control ref | Org implementation | Confirmed in MongoDB Model |
| Control Evidence | evidences via | Risk/Incident/OFI/Document/File | N:0..1 typed | typed refs | Proof | Confirmed in MongoDB Model |
| Supplier | buyer | User | N:1 | buyer ref | Accountability | Confirmed in MongoDB Model |
| Customer | managed by | User | N:1 | account manager | CRM ownership | Confirmed in MongoDB Model |
| Invoice | bills | Customer | N:1 | customer ref | Billing | Confirmed in MongoDB Model |
| Invoice | issued in | Organisation | N:1 | org | Seller | Confirmed in MongoDB Model |
| Campaign | has | Delivery batches | 1:N | campaign ref | Send history | Confirmed in MongoDB Model |
| Campaign | targets | Customer | N:M | query / explicit IDs | Outreach | Confirmed by Business Workflow |
| Document Repository | contains | Document Tree Node | 1:N | repository ref | Hierarchy | Confirmed in MongoDB Model |
| Document Tree Node | parent of | Document Tree Node | 0..1:N | parent ref | Folders | Confirmed in MongoDB Model |
| Document Signature | signs | Document Tree Node | N:1 | doc ref | Signature | Confirmed in MongoDB Model |
| IMS Project | creates/links | Document Repository | 1:0..1 | project create workflow | Project docs | Confirmed by Business Workflow |
| IMS Project | has | Work Package | 1:N | project refs | Decomposition | Confirmed in MongoDB Model |
| Calendar Event | mirrors | Task/Audit/Leave/etc. | 1:0..1 | systemEventId / source | Scheduling | Confirmed by Business Workflow |
| Leave | requested by | User | N:1 | creator/submission | Absence | Confirmed in MongoDB Model |
| Leave approval | uses | Line managers | N:M | membership/user data | Approval | Confirmed by Business Workflow |
| CC Calculation | uses | CC Location | N:0..1 | ObjectId | Site context | Confirmed in MongoDB Model |
| CC Calculation | uses | Custom Factor | N:0..1 | ObjectId | Conversion | Confirmed in MongoDB Model |
| CC Calculation | uses | DEFRA Factor | N:1 logical | lookup by attributes | Conversion | Confirmed by Business Workflow |
| CC Parameter | embeds | Reporting years/boundaries | 1:N | embeds | Reporting config | Confirmed in MongoDB Model |
| Organisation Dashboard | aggregates | Operational modules | 1:many metrics | embedded KPI blobs | Snapshot reporting | Confirmed in MongoDB Model |
| AI Response | analyses | Source record | N:1 | source plugin | Advisory | Confirmed in MongoDB Model |
| Tenant | equals | Organisation | none | distinct models | Must not conflate | Confirmed in MongoDB Model |
| Tenant | contains | Organisation | unclear | no FK found | Partitioning | Unclear |
| Chart | belongs to | Organisation | unclear | no org field | Isolation | Unclear |
| Worklog | belongs to | Organisation | unclear | no org field | Isolation | Unclear |
| User | belongs to | Organisation | none direct | via Membership only | Identity design | Confirmed in MongoDB Model |

*(Additional module-specific relationships are documented in individual module specifications; table emphasises cross-module spine.)*

---

## 7. Domain Relationship Breakdown

### Identity spine

```
User ──< Membership >── Organisation
              │
              └──< Functional Unit (groups)
                         │
                         └── Access Policy / Roles
```

Authentication creates **Session**; organisation selection sets `x-org-id` for org-scoped queries.

### Operational quality spine

```
Organisation
 ├── Risks / Incidents / Audits / OFIs
 │     ├── Tasks (source-linked)
 │     ├── Activities (timeline)
 │     ├── Notifications
 │     ├── Calendar Events (selected dates)
 │     └── ISO Controls (compliancecontrols)
 ├── Compliance Statuses / Evidence / Overview
 └── Documents (repositories / trees)
```

Audit completion **promotes** embedded findings into standalone Risk/Incident/OFI with source links.

### Commercial spine

```
Organisation
 ├── Customers → Invoices
 ├── Email Campaigns → Deliveries → Customers
 └── Suppliers → (source) Incidents / Tasks
```

### Staff wallet spine

```
User (+ Membership)
 ├── Leaves → Calendar (on approve)
 ├── Expense Reports
 └── Worklogs (user-scoped; org boundary unclear at model layer)
```

### Carbon spine

```
Organisation → CC Parameters → Calculations (+ Locations / Factors)
                            → Reports / Initiatives
```

### Project / document spine

```
IMS Project → Document Repository → Document Trees
           → Work Packages → Assignments / Relationships / Docs
```

---

## 8. Shared and Cross-Module Entities

See detailed analysis in investigation notes; summary:

| Shared entity | Owner | Consumers | Strategy | Duplication notes |
| ------------- | ----- | --------- | -------- | ----------------- |
| User | Users | All people-linked modules | Global identity; no org field | Distinct from People Asset & iMS Admin |
| Organisation | Organisation | Nearly all | orgDataPlugin on children | ≠ Tenant |
| Membership | Membership | Auth, HR, licensing | Associative | Line-manager location inconsistency |
| Functional Unit | Functional Units | Most operational modules | `groups` model | Naming: BU / FU / iamGroup |
| Task | Task | Many modules via source | Polymorphic source | |
| Notification | Notifications | Many emitters | Org + recipients | ≠ toasts ≠ txnEmails |
| Activity | Activity | Many parents | Polymorphic | Coexists with some legacy embeds |
| Calendar Event | Calendar | Task, Audit, Leave, Supplier, MR, Incident P1 | Source-linked or standalone | |
| Tag/Category | Tags and Categories | Risk, Incident, CRM, Assets | Optional single ref | Tag≡Category naming |
| Compliance Control | Compliance | Risk/Incident/Audit/OFI/MR | Global template + org status | |
| Attachment | Attachment vs parents | Dual | Registry underused; embeds dominant | **Confirmed dual pattern** |
| File Handler | Service only | Upload consumers | Not an entity | |
| Source link | Plugin/template | Task, Risk, Incident, CIP, AI, etc. | Polymorphic | Enum may lag actual use |
| ISO Controls link | Plugin | Risk, Incident, Audit, CIP, etc. | Relevance vs evidence are different paths | |

---

## 9. Embedded and Supporting Data Structures

| Embedded / supporting structure | Parent | Purpose | Lifecycle |
| ------------------------------- | ------ | ------- | --------- |
| File metadata `{Name,key,Bucket}` | Many parents | Runtime attachments | Dies with parent (storage may remain) |
| `source.{moduleType,module}` | Task, Risk, Incident, CIP, AI, Customer… | Origin linkage | Parent-owned |
| `isoControls` | Risk, Incident, Audit, CIP… | Control relevance | Parent-owned |
| Audit findings arrays | Audit | Pre-promotion findings | Promoted or remain historical on audit |
| Invoice line items | Invoice | Billing rows | Invoice-owned |
| Campaign recipients | Campaign Delivery | Send batch | Delivery-owned |
| CC reportingYears / reportingBoundaries | CC Parameter | Reporting config | Parameter-owned |
| Supplier KPI / contract files | Supplier | Vendor docs & notes | Supplier-owned |
| Task assignees | Task | Acceptance per user | Task-owned |
| Wallet `submission` | Leave, Expense | Approval workflow | Parent-owned |
| Document authorisation entries | Document tree | Publish approval | Document-owned |
| Dashboard KPI blobs | Dashboard / Group Dashboard | Snapshot metrics | Regenerated snapshots |
| Organisation licence pools | Organisation | Capacity | Org-owned |

---

## 10. Data Scope and Ownership Boundaries

| Scope | Examples | Notes |
| ----- | -------- | ----- |
| **Organisation (dominant)** | Risks, Incidents, Tasks, CRM, Docs, CC params, most registers | via `organization` + `paginateByOrg` |
| **Organisation + Functional Unit** | Many operational records with `group` | Unit filter / privacy |
| **Global identity** | `users` | Linked to orgs only via Membership |
| **Global catalogue** | `compliancecontrols`, `ccfactors` | Shared reference data |
| **Platform** | `ims_admins`, `tenant`, `builds`, admin `user`/`session` | Separate from customer users |
| **Unscoped / weak scope** | `charts`, `worklogs`, website leads | Isolation must be enforced in queries if at all |
| **Anonymous / public** | `registerPublicInterest` | No user/org required |

**Confirmed:** Organisation is the product multi-tenant boundary for business data.  
**Unclear:** Whether Tenant partitions databases 1:1 with organisations; `x-tenant` usage not confirmed in product paths.

---

## 11. Important Model Plugins and Data Behaviour

| Plugin / behaviour | Affected entities | Business effect | Stores data? |
| ------------------ | ----------------- | --------------- | ------------ |
| `orgDataPlugin` | Most tenant models | Adds `organization`; org-scoped list helpers | Yes (field) |
| `softDeletePlugin` | Many (attachments, docs, invitations, CC, etc.) | Soft-remove / restore | Yes (delete markers) |
| Auto-increment `ID` + reference prefixes | Risks, Incidents, Tasks, CC, etc. | Human references (e.g. EM-, OFI-) | Yes |
| `sourceLinkPlugin` / `sourceDeletePlugin` | Risk, Task, CIP, Incident consumers | Polymorphic origin; cascade cleanup | Yes / delete side effects |
| `complianceLinkPlugin` | Risk, Incident, Audit, CIP… | ISO control associations | Yes |
| Document `manageVersion` | Document trees | Versioning / supersede | Yes |
| CC calculator plugins (on save) | `cccalculations` | Derive GHG, SECR, quality scores | Yes (derived fields) |
| CC `factorManager` | Factors / custom factors | Normalise lookup casing | Query/save behaviour |
| CC initiative `statusController` | Reduction initiatives | pending/implemented from date | Yes |
| Location geocode on validate | `cclocations` | lat/lng from address | Yes |
| Parameter pre-save | `ccparameters` | reporting months & factor-year offset | Yes |
| Wallet submission template | Leaves, Expenses | Draft→decision workflow fields | Yes |

---

## 12. Specification-to-Database Alignment Analysis

### Confirmed alignment (examples)

- Organisation, User, Membership, Functional Unit, Invitation  
- Risk, Incident, Audit, OFI/CIP, Task, Notification, Activity, Calendar  
- Compliance control stack; CQC registers  
- Supplier, Customer, Invoice, Campaigns  
- Five asset collections; Document Management  
- Leaves, Expenses; CC entities in `cc.md`  
- Tags and Categories; AI Responses; Dashboards models  

### Missing model confirmation / derived-only

- **Stats**, **Statics**, **File Handler**, **Data Import**, **Jira Integration** — capabilities without dedicated business collections (or transient only)  
- Contact IMS — specs note unused booking/getStarted persistence for live “email only” flows  

### Implementation without dedicated specification coverage

- **IMS Projects** and related work-package/budget/report models — substantial persistence; only cross-referenced in other specs  
- **customForms** vs **imsForms** — overlapping form concepts; customForms weakly specified  
- Admin **builds** / **apikeys** / legacy **imsadmin** duplicates  

### Specification–model mismatches (selected)

| Area | Issue |
| ---- | ----- |
| Attachments | Specs: embedded dominant; registry exists but unused by confirmed UI |
| Charts vs Stats/Dashboard | Charts model unused; live charts from Stats/Dashboard |
| Dashboard | Persisted snapshots vs live Stats aggregation in org UI |
| Leaves/Expenses managers | Specs flag User vs Membership source inconsistency |
| Tenant vs Organisation | Easy to conflate; models distinct |
| OFI naming | Business OFI vs model `cips` |
| Functional Unit naming | Business Unit / groups / iamGroup |
| License Request statuses | UI Open/Declined vs model Pending/Granted/Canceled |
| Worklog / Charts org isolation | Specs note missing org field |

---

## 13. Duplicate, Overlapping, and Naming Analysis

| Finding | Classification |
| ------- | -------------- |
| Embedded attachments vs `attachments` registry | **Confirmed duplication** of approaches |
| Tag vs Category same model | **Naming inconsistency** |
| OFI vs CIP | **Naming inconsistency** (same entity) |
| Functional Unit / Business Unit / `groups` / iamGroup | **Naming inconsistency** |
| Tenant vs Organisation | **Separate entities with similar terminology** |
| People Asset vs User | **Separate entities with similar terminology** |
| Supplier embedded KPI text vs KPI Objective module | **Separate entities with similar terminology** |
| `customForms` vs `imsForms` | **Possible conceptual overlap** |
| Admin `user`/`session` vs system `users`/`sessions` vs imsadmin copies | **Separate entities** (different DBs/connections) |
| Dashboard snapshots vs Stats live aggregates | **Possible conceptual overlap** (reporting) |
| Website bookings vs Calendar events | **Unable to determine** strong link |
| IMS Project models without module spec | **Coverage gap**, not duplication |

---

## 14. Derived Data, Reports, and Non-Persisted Views

| Output | Type | Depends on |
| ------ | ---- | ---------- |
| Stats API results | Derived view | Operational collections |
| Dashboard live tiles (where Stats-driven) | Derived view | Stats aggregations |
| Persisted `dashboards` / `groupdashboards` | Persisted aggregate snapshot | Historical metrics blobs |
| CC Single Year / SECR / GHG reports | Generated artefact (+ optional `ccreports`) | Calculations + parameters |
| Document PDF/preview | Generated artefact | File storage + tree metadata |
| Data Import job status | Transient (no history model) | Target module inserts |
| Contact IMS / Jira “report” | Generated email | No durable ticket entity |
| Chart execute results | Intended derived (stubbed) | Chart pipeline + target module |
| AI stream (unsaved) | Transient | Prompts + source context |
| AI Response (saved) | Persisted advisory | `aiResponses` |
| CSV exports (various modules) | Generated artefact | Parent lists |

---

## 15. Master Entity Relationship Overview

```
Platform
├── Tenant (partition registry; relation to Organisation unclear)
├── iMS Admin (+ admin sessions)
└── Builds / API keys / public tokens

Organisation (licensed company)
├── Memberships ── User (global)
├── Functional Units (groups)
│   ├── Access Policies / Roles
│   ├── Group Premises
│   └── Group Dashboards
├── Licensing (pools on Organisation; Licence Requests)
├── Partnership Programme (optional)
├── Txn Emails
│
├── Quality & Compliance
│   ├── Risks ── Tags, Assets, Controls, Tasks, Activities, Notifications
│   ├── Incidents ── (same shared services)
│   ├── Audits ──(promote)→ Risks / Incidents / OFIs
│   ├── OFIs (cips)
│   ├── Compliance Controls (global templates)
│   │   └── Control Statuses ── Control Evidence
│   └── CQC Tools & Registers
│
├── Work & Communication
│   ├── Tasks
│   ├── Activities
│   ├── Notifications
│   └── Calendar Events
│
├── CRM & Supply
│   ├── Customers ── Invoices, Campaigns
│   └── Suppliers
│
├── Assets (5 collections)
├── Documents (Repositories → Trees → Signatures)
├── Management Reviews & KPI Objectives
├── Organisation Dashboard
│
├── Staff Wallet
│   ├── Leaves
│   ├── Expense Reports
│   └── (Worklogs — user-scoped)
│
├── Carbo Calc
│   ├── Parameters → Locations / Calculations / Custom Factors
│   ├── DEFRA Factors (global)
│   └── Reports / Reduction Initiatives
│
├── IMS Forms (backend)
├── IMS Projects (models; no dedicated spec)
│   └── Work Packages / Memberships / Budgets / Reports / Doc links
├── Tags and Categories
└── AI Responses

Global / weak-scope / public
├── Users
├── Compliance Control catalogue
├── CC Factors (DEFRA)
├── Charts (unscoped)
├── Register Public Interest
└── Website bookings / getStarted (often unused)
```

---

## 16. Current-State Findings and Uncertainties

### Confirmed findings

1. Organisation is the primary business data boundary via `orgDataPlugin`.  
2. Users are global; Membership is the org link.  
3. Shared collaboration spine: Task, Activity, Notification, Calendar, polymorphic Source, ISO Controls.  
4. Dual attachment strategies (registry vs embed) with embeds dominant in product UI.  
5. Audit embeds findings then promotes them to registers.  
6. Compliance separates global templates from org statuses/evidence.  
7. CC stores derived GHG fields via save-time plugins.  
8. IMS Projects have rich models without a dedicated module specification.

### Uncertainties / unclear

1. Tenant ↔ Organisation physical mapping and `x-tenant` usage.  
2. Whether Charts/Worklogs are safely isolated in multi-org deployments.  
3. Full runtime use of `ccreports` persistence vs on-demand generation.  
4. End-to-end lifecycle and ownership details for all IMS Project child models.  
5. Whether `customForms` remains active beside `imsForms`.  
6. Staff Alerts / walletunits product intent.  
7. Website booking models vs Contact IMS email-only behaviour.  
8. Enforcement strength of privacy fields (documents/incidents) at query layer.  
9. Dashboard snapshot refresh jobs (noted missing from repo in Dashboard spec).  
10. Attachment registry consumers beyond its own API.

---

## 17. Summary

IMS is an **organisation-scoped operational platform** centred on **Organisation**, **User**, and **Membership**, with **Functional Units** subdividing access and reporting. Core quality workflows (**Risk, Incident, Audit, OFI**) share **Tasks, Activities, Notifications, Calendar Events**, and **ISO Control** links. CRM (**Customer, Invoice, Campaign**), **Suppliers**, **Assets**, **Documents**, **Management Review/KPI**, **Wallet** (leave/expense/worklog), and **Carbo Calc** extend the same organisational spine. Platform administration (**iMS Admin, Tenant**) is separate from customer identity.

**Most central shared entities:** User, Organisation, Membership, Functional Unit, Task, Notification, Activity, Calendar Event, Tag/Category, Compliance Control, embedded File Metadata.

**Most important confirmed cross-module relationships:** Membership linking User↔Organisation; orgDataPlugin scoping; source-linked Tasks/Incidents/OFIs; Audit promotion; Control Evidence typed links; Document hierarchy; CC calculation→factor/location; Project→Repository (workflow).

**Major alignment findings:** Specs and models largely align for core modules; largest gaps are **IMS Projects (models without dedicated spec)**, **attachment dual pattern**, **Charts unused vs Stats/Dashboard**, and **Tenant vs Organisation** terminology risk.

**Important uncertainties:** Tenant partitioning, unscoped models (charts/worklogs), IMS Project full semantics, and weak-scope utilities.

---

*Investigation only. No application code, MongoDB models, or module specification files were modified. This file is the sole new artifact of this task.*
