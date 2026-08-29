# AI

## 1. Module Overview

The **AI** module provides **embedded analytical assistance** within operational modules in iMS. It is branded in the UI as **Alice** (marked **Beta**) and helps users generate structured, multi-section expert analysis for individual business records.

The module is **not** a standalone chatbot, AI dashboard, or general-purpose text generator. Its primary business purpose is to support **record-level decision-making** — for example assessing a risk’s impact and mitigations, analysing an incident’s root cause and communications, or preparing audit guidance — by producing **Markdown-formatted advisory content** that users review, optionally save, and optionally turn into follow-up tasks.

AI capabilities are exposed through two backend areas under `/ai`:

1. **GPT generation** — stream or return a single AI text response from a prompt and system instructions.
2. **Saved AI analyses** — persist, list, view, update, and delete structured analysis reports linked to a source business record.

Users **do not** manage AI through a dedicated navigation entry. The **Analytical Assistant** drawer appears inside **Risk Management**, **Incident Management**, **Audits**, and **Continual Improvement Plan (CIP/OFI)** record detail toolbars. AI output is **advisory by default** — it does **not** automatically change risk scores, incident status, audit completion, or other parent record fields. Users must **explicitly save** an analysis to persist it, and **manually create tasks** if they want to act on suggested content.

Primary users are **authenticated organisation members** with appropriate module permissions who open a record and choose **Analyse** (or **Assist & Verification** on audits).

---

## 2. Features and Capabilities

### Conduct structured analysis on a business record (Analytical Assistant)

- **Capability:** Run a pre-defined multi-section AI analysis against the currently open risk, incident, audit, or CIP record.
- **Who uses it:** Users with module access who open the Analytical Assistant drawer from the record detail toolbar (see access conditions per module below).
- **Outcome:** Each template section (for example “Impact analysis”, “Root Cause Analysis”, “Audit Checklist”) generates a streamed Markdown response displayed in the drawer. User can review all sections, then **Save response** to persist the full report.
- **Conditions:**
  - Analysis uses module-specific templates compiled with live record data (title, description, scores, organisation name, etc.).
  - Sections run via streaming generation; UI shows loading until each section completes.
  - **Save response** is blocked until all sections have completed (`isReportReady`).
  - Badge: **Beta**.
  - Parent record fields are **read** for context only — **not updated** by AI.

### Stream AI text generation (GPT stream)

- **Capability:** Generate AI text incrementally as it is produced, for use by the Analytical Assistant during analysis.
- **Who uses it:** Frontend Analytical Assistant (via authenticated fetch with access token header).
- **Outcome:** Raw streamed text chunks written to the HTTP response; frontend assembles into section responses.
- **Conditions:** Requires `prompt`, `systemInstructions`, and `conversation` arrays. System persona defaults to assistant **Alice** responding in Markdown with UK English (frontend system prompt).

### Generate single AI response (GPT normal — backend only)

- **Capability:** Return one complete AI response in a single JSON payload.
- **Who uses it:** **No confirmed frontend consumer** in this repository.
- **Outcome:** HTTP 200 with `details.responseMessage` containing the generated text.
- **Conditions:** Same input validation as streaming endpoint. **Backend-available only.**

### Save a conducted analysis (AI Response record)

- **Capability:** Persist the completed multi-section analysis as an organisation-scoped **AI Response** linked to the source record.
- **Who uses it:** User clicking **Save response** in the Analytical Assistant after all sections finish.
- **Outcome:** Saved analysis appears in the history list for that record; success notification *“Analysis saved.”*; automated **Activity** timeline entry on the parent record: *“{User} conducted and saved an analysis.”*
- **Conditions:** Requires `moduleType`, `module` (source record ID), and `template` object including compiled `dataDisplay`, `context`, and `reportStructure` with populated `response` text per section.

### View saved analysis history for a record

- **Capability:** See prior saved analyses for the current source record.
- **Who uses it:** Users opening the Analytical Assistant drawer on a record that has saved analyses.
- **Outcome:** List showing analyst name, avatar, and conduct date/time. Click opens read-only view of the saved report sections.
- **Conditions:** List filtered by `source` query matching the current module link. Paginated backend support exists; frontend loads via query hook.

### Delete a saved analysis

- **Capability:** Permanently remove a saved AI Response.
- **Who uses it:** User viewing a saved analysis in the Analytical Assistant.
- **Outcome:** Record deleted; success notification with date; automated Activity entry: *“{User} deleted an analysis.”* with extra detail about original conductor and date.
- **Conditions:** Confirmation dialog: *“This analysis will be deleted.”*

### Create a task from AI output content

- **Capability:** Turn selected list-item text from an AI response into a new **Task** linked to the same source record.
- **Who uses it:** User hovering a list item in rendered AI Markdown and clicking **Create task**.
- **Outcome:** Task creation drawer opens with AI list text pre-filled in the task **description** field; user completes and submits task manually.
- **Conditions:** Task is created through Task Management workflow — AI does **not** auto-create tasks. Works on `<li>` elements in Markdown output via custom list renderer.

### Update a saved analysis (backend — limited UI)

- **Capability:** Replace the stored `template` (including report structure and responses) on an existing AI Response.
- **Who uses it:** **Backend and store function exist; no confirmed UI** exposes edit/update of saved analyses after save.
- **Outcome:** Updated AI Response returned.
- **Conditions:** **Implementation suggests** future edit capability; currently users delete and re-run analysis instead.

---

## 3. User Outcomes / End Results

- **Analyse:** Generate expert-style advisory content for an open risk, incident, audit, or (intended) CIP record across multiple structured sections.
- **Review:** Read streamed Markdown analysis in-drawer before saving; re-open saved analyses from history.
- **Save:** Persist analysis reports linked to the source record for audit trail and team visibility.
- **Act (manual):** Create tasks from specific AI suggestions; link follow-up work to the same risk, incident, or audit record.
- **Delete:** Remove saved analyses that are no longer needed.
- **Information received:** Section titles and AI-generated narrative (impact, scoring commentary, root cause, audit checklist, mitigation suggestions, etc.) tailored to record context and organisation name where templates include it.
- **Business actions enabled:** Faster structured review of risks, incidents, and audits; documented analysis history on records; optional task creation from recommendations — **without** automatic modification of operational record data.

---

## 4. Scope Boundaries

### In scope

- Embedded **Analytical Assistant** (Alice, Beta) on supported module record drawers.
- GPT streaming and normal text generation endpoints.
- Persistence of saved analyses as **AI Response** records.
- Analysis history per linked source record.
- Task creation helper from AI list content.
- Automated Activity timeline entries on save and delete.

### Out of scope (handled elsewhere)

- **Automatic record updates** — AI does not change risk scores, incident resolution, audit status, CIP implementation state, etc.
- **Notifications module** — no in-app notification created for AI analysis (Activity timeline only).
- **Compliance toolkit linking** — templates *advise* users to link controls; AI does not perform linking.
- **Document Management AI** — no document upload/analysis in AI module routes.
- **General chat UI** — no standalone conversational interface.
- **Dashboard / Stats analytics** — separate modules.
- **AI usage billing or quota management** — not exposed to users in this module.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| **Risk Management** | **Confirmed.** Risk detail toolbar **Analyse** opens Analytical Assistant with `risk_analyser` template. Reads risk title, description, scores, organisation. Saves analyses linked to risk ID. Task creation pre-links to risk. |
| **Incident Management** | **Confirmed.** Incident detail **Analyse** opens assistant with `incident_analyser` template (root cause, impact, resolutions, communication, prevention, etc.). Hidden when incident is resolved. |
| **Audits** | **Confirmed.** Audit detail **Assist & Verification** opens `audit_analyser` template (audit tips, plan, methodology, checklist, risks, report structure). Available when audit not completed and user passes audit-type access rules. |
| **Continual Improvement Plan (CIP/OFI)** | **Partially integrated.** CIP toolbar exposes **Analyse** button, but implementation passes **`template={null}`** and incorrect source field — drawer shows *“Waiting for template to initiate”* — **non-functional in current code**. |
| **Task Management** | **Confirmed indirect.** Users create tasks from AI list items; task links to same source module/record as the analysis context. |
| **Activity** | **Confirmed.** Saving or deleting an analysis creates automated timeline entries on the parent record. |
| **Users** | AI Response stores creator (`created.by`); history shows analyst name and avatar. Ownership transfer queue considers AI responses when reassigning user data. |

No confirmed AI integration with Customers, Documents, Compliance controls, or Dashboard modules through the `/ai` routes.

---

## 6. Current Data Model

The AI module owns one primary persistent entity: **AI Response** (`aiResponses` collection).

| Entity / record | Business meaning | Role in AI module |
| --------------- | ---------------- | ------------------- |
| **AI Response** | A saved, structured analysis report conducted by a user against a specific business record | Primary persisted output of the Analytical Assistant |
| **Analyser template** (embedded in AI Response) | The compiled analysis definition and results: display header, AI context, and section list | Stores what was analysed and what AI returned |
| **Source link** | Which business record the analysis belongs to | Connects AI Response to risk, incident, audit, CIP, etc. |
| **Report section** | One named analysis topic within a saved report | Contains section name, description, original prompt, and AI `response` text |

GPT streaming requests are **transient** — not stored unless the user saves the assembled report as an AI Response.

### AI Response vs parent record

| Aspect | AI Response | Parent record (Risk, Incident, etc.) |
| ------ | ----------- | ------------------------------------- |
| **Modified by AI save** | Created/updated/deleted by user | **Not modified** |
| **Content** | Advisory analysis text | Operational business data unchanged |
| **Ownership** | AI module | Respective operational module |

---

## 7. Attributes

### AI Response (saved analysis)

| Attribute | Business meaning | Source |
| --------- | ---------------- | ------ |
| **Source module type** | Which module the analysis supports (e.g. risks, incidents, audits, cips) | Application (from drawer context) |
| **Source module ID** | The specific record analysed | Application (current open record) |
| **Data display** | Markdown header showing record reference/title/description shown at top of analysis | Compiled from template + live record data |
| **Context** | System instructions sent to AI describing the expert role and record facts | Compiled from template + live record data |
| **Report structure** | Ordered list of analysis sections | Template definition |
| **Section name** | Business topic label (e.g. “Impact analysis”, “Audit Checklist”) | Template |
| **Section description** | Optional explanatory text for the section | Template |
| **Section prompt** | The question/instruction sent to AI for that section | Template |
| **Section response** | AI-generated Markdown answer for the section | **AI-generated** (streamed, then stored on save) |
| **Created by** | User who saved the analysis | Current session user |
| **Created on** | When the analysis was saved | Server timestamp |
| **Organisation** | Owning organisation (via org data plugin) | Session organisation |

### GPT request (transient — streaming/normal)

| Attribute | Business meaning | Source |
| --------- | ---------------- | ------ |
| **Prompt** | The user/system question for this generation step | Section prompt from template |
| **System instructions** | Expert persona and record context for AI | Compiled template `context` |
| **Conversation** | Prior message array (usually empty in current assistant) | Frontend (defaults empty) |

---

## 8. Current UI Layout

### Standalone AI screen

- **None.** No AI navigation entry or dedicated AI page.

### Embedded entry points (Analytical Assistant drawer)

| Module | Toolbar button | Drawer ID | Template | When hidden |
| ------ | -------------- | --------- | -------- | ----------- |
| **Risk Management** | **Analyse** | `risk-analyser` | `risk_analyser` (7 sections: impact, scoring, controls, policies, monitoring, business continuity, next steps) | When risk is **mitigated** |
| **Incident Management** | **Analyse** | `incident-analyser` | `incident_analyser` (root cause, impact, resolutions, communication, continuous improvement, prevention, etc.) | When incident is **resolved** |
| **Audits** | **Assist & Verification** | `audit-analyser` | `audit_analyser` (tips, plan, methodology, checklist, risks, report structure, etc.) | When audit is **completed** or user lacks audit-type access |
| **CIP / OFI** | **Analyse** | `cip-analyser` | **`null` — non-functional** | When CIP is **implemented** |

### Drawer interaction flow

1. User opens record detail drawer → clicks **Analyse** (or audit equivalent).
2. **Analytical Assistant** drawer opens.
3. **Empty state** (no prior saves): illustration, *“Revolutionise your analysis and decision-making with Alice.”*, **Conduct analysis** button.
4. **History state** (prior saves exist): list of past analyses with conductor and date; **Conduct analysis** for new run.
5. **Conduct analysis** opens nested drawer (`analyise-report`):
   - Shows compiled record summary (`dataDisplay`).
   - **Start analysis** runs all template sections.
   - Each section streams AI output with loading indicator; label *“Boosting now”* while waiting.
   - When complete: **Save response** or **Clear all**.
6. **Saved analysis view** (`analyised-report`): read-only sections; **Delete analysis** with confirmation.
7. **Create task**: hover list item in AI Markdown → **Create task** → task drawer with description pre-filled.

### Important UI states

| State | Behaviour |
| ----- | --------- |
| **Loading saved list** | Spinner while fetching prior analyses |
| **Streaming** | Loading per section; partial text appears as stream arrives |
| **Save in progress** | Button shows *“Saving…”* |
| **Save blocked** | Warning *“Please wait until the report is ready.”* if sections incomplete |
| **Save success** | Toast *“Analysis saved.”*; analysis cleared from active session |
| **Save failure** | Toast *“Failed to save analysis”* |
| **Delete success** | Toast with analysis date |
| **No template (CIP)** | *“Waiting for template to initiate.”* |
| **Beta** | Badge on active analysis drawer |

### Permissions visible in UI

| Module | UI gate observed |
| ------ | ---------------- |
| Risk | `RISK_MANAGEMENT` **CREATE** permission |
| Incident | **`RISK_MANAGEMENT` CREATE** permission (not Incident Management) — **Observed but business purpose unclear**; may be unintentional |
| Audit | Complex: internal/external auditor roles, super user, or entity access on creator/auditor; audit not completed |
| CIP | `CONTINUAL_IMPROVEMENT_PLAN` **CREATE** permission; not implemented |

Backend `/ai` routes have **no RBAC middleware**; access relies on authenticated organisation session.

---

## 9. Miscellaneous / Module-Specific Information

### Confirmed business purpose

The AI module supports **expert advisory analysis** on operational records — helping users think through risks, incidents, and audits with structured prompts — while keeping **human control** over what is saved and what actions are taken.

### Advisory vs applied data — critical distinction

| Action | Automatic? | User confirmation? |
| ------ | ---------- | ------------------ |
| Generate section text | Yes (on Start analysis) | User initiates analysis |
| Save analysis to database | No | User clicks **Save response** |
| Update parent risk/incident/audit | **No** | N/A |
| Create task from suggestion | No | User clicks **Create task** and submits task form |
| Delete saved analysis | No | User confirms deletion |

### Analysis templates — business focus by module

| Module | Analysis themes (confirmed section names) |
| ------ | ---------------------------------------- |
| **Risk** | Business impact, scoring validation, ISO controls/mitigations, policies, monitoring, business continuity, next steps |
| **Incident** | Root cause, impact assessment, suggested resolutions, communication/stakeholder management, continuous improvement, prevention |
| **Audit** | Audit tips, audit plan, methodology, checklist, risk identification, report structure guidance |

Templates instruct AI to reference **iMS Systems** workflows (link compliance controls, create tasks, use Alice for policies) — advisory guidance only.

### Backend route structure

| Route area | Business capability |
| ---------- | ------------------- |
| `POST /ai/gpt-stream` | Stream AI text (used by assistant) |
| `POST /ai/gpt-normal` | Single-shot AI text (**no UI consumer**) |
| `POST /ai/responses` | Save analysis |
| `GET /ai/responses` | List analyses (filterable/paginated) |
| `GET /ai/responses/:id` | Get one analysis |
| `PUT /ai/responses/:id` | Update analysis template |
| `DELETE /ai/responses/:id` | Delete analysis |

### Access model

- Routes registered **after** authentication and organisation access middleware — **login required**.
- No per-route RBAC on AI endpoints themselves.
- Effective access controlled by whether user can reach parent module record and toolbar button.

### Frontend/backend discrepancies

| Area | Backend | Frontend |
| ---- | ------- | -------- |
| GPT normal | Implemented | **Unused** |
| Update saved analysis | Implemented | **No UI** (store function not exported to components) |
| CIP analysis | Routes and drawer exist | **`template={null}`**, wrong source field (`moduleId` vs `module`), possible `visitCip` vs `visitingCip` variable mismatch — **non-functional** |
| Incident AI permission | N/A | Uses **Risk Management** CREATE instead of Incident Management |
| Multi-section streaming | Supports concurrent requests | Shared streaming hook state — **Implementation suggests** sections may interfere if run in parallel; **requires confirmation** of production behaviour |

### Data ownership and user lifecycle

- AI Responses are organisation-scoped.
- User ownership transfer processes include AI Response records when reassigning a departing user’s data.

### Experimental / incomplete functionality

- **CIP Analytical Assistant** — UI entry exists but cannot run analysis (no template).
- **GPT normal endpoint** — backend-only.
- **Update saved analysis** — backend-ready, no user workflow.
- **Beta** badge indicates non-final product positioning.

### Behavior that could not be confidently determined

- Whether organisation administrators can list all AI responses across records via unfiltered API calls (list endpoint supports generic filters; UI always filters by source).
- Production reliability when multiple analysis sections stream simultaneously.
- Whether external clients consume `/ai/gpt-normal` outside this repository.

### External AI provider note

Generation uses a hosted language model (business outcome: structured expert narrative in Markdown). Provider and model choice affect response quality but do not change the user-facing workflow described above.
