# Module Specification Reference

This document is the **canonical reference** for writing Module Specification documents in this product. Future AI agents and developers **must** follow this file whenever creating or updating a specification for an individual business module.

Module Specifications describe **current business / product behavior**. They explain what a module enables users to do, what outcomes they receive, what information they interact with, and how the module relates to other modules. They are **not** technical implementation documents.

---

## 1. Purpose of Module Specifications

Module Specifications exist so that product owners, business stakeholders, QA engineers, and developers can understand a module **without reading source code**.

Each specification answers:

- What is this module, and what business problem does it solve?
- What can users do with it, and what outcomes do they get?
- What business information does it manage?
- How is it presented in the UI today?
- How does it relate to other modules?
- Where does this module’s responsibility end?

The **existing application** (frontend and backend as currently implemented) is the source of truth. Specifications document **what the product currently does**, not what it might do later.

---

## 2. Intended Audience

| Audience | How they use the specification |
| -------- | ------------------------------ |
| Product owners / business stakeholders | Understand capability, value, and scope |
| QA / test engineers | Derive business scenarios and expected outcomes |
| Developers / AI agents | Align work to current business behavior without inventing features |
| Onboarding / cross-functional readers | Learn a module without navigating the codebase |

Write so a non-engineering reader can understand the module. Prefer business language over technical jargon.

---

## 3. What a Module Specification Is — and Is Not

### Is

- A **business / product** description of a module’s current behavior
- Focused on **user capabilities**, **outcomes**, **information**, and **relationships**
- Based on **observed** current frontend and backend behavior
- Consistent in structure across every module

### Is not

- An API, endpoint, controller, service, or class reference
- A database schema dump or ORM/model inventory
- A code architecture, folder structure, or dependency graph
- A redesign proposal, roadmap, or backlog of improvements
- A speculative description of intended future behavior

**Business behavior vs technical implementation**

| Prefer (business) | Avoid (technical) |
| ----------------- | ----------------- |
| Users can raise and own a risk | `POST /api/risks` creates a Risk document |
| Acceptance requires a rationale | Validation runs in `risk.service.js` |
| The list shows status and owner | The table uses Ant Design `Table` with columns X/Y |
| This module provides risk data to Compliance | Imports `ComplianceLinkService` |
| Field means “how likely the risk is” | Mongo field `likelihood` type Number |

Translate implementation into understandable business behavior. Do not copy code structure into the specification.

---

## 4. Repository Layout for Module Specifications

Place all module specifications under:

```text
docs/module-specifications/
├── MODULE_SPECIFICATION_REFERENCE.md   ← this file (canonical rules)
├── README.md                           ← folder purpose and naming
└── <module-slug>.md                    ← one file per module (future)
```

**Naming conventions for future individual specs**

- One Markdown file per business module
- Use a stable, lowercase kebab-case slug derived from the product-facing module name  
  Examples: `risk-management.md`, `user-management.md`, `compliance.md`
- Do not embed version numbers or environment names in the filename
- Do not create a specification until a dedicated task requests it for that module

---

## 5. Required Section Order

Every individual module specification **must** use these sections **in this exact order**:

1. Module Overview  
2. Features and Capabilities  
3. User Outcomes / End Results  
4. Scope Boundaries *(recommended; include unless there is a strong reason not to)*  
5. Linked Modules  
6. Current Data Model  
7. Attributes  
8. Current UI Layout  
9. Miscellaneous / Module-Specific Information  

Do not reorder, rename, or skip required sections. If a section has no applicable content after inspection, state that briefly (for example: `None identified.` or `No linked modules identified.`) rather than omitting the heading.

Do not add extra top-level sections beyond the list above. Put unique material in **Miscellaneous / Module-Specific Information**.

---

## 6. Section Guidance

### 6.1 Module Overview

Explain, in plain language:

- What this module is
- Its primary business purpose
- The main problem it solves
- The primary users or roles that benefit from it

This section must be understandable without reading source code. Keep it concise (typically a short paragraph or a few bullets). Do not describe architecture.

### 6.2 Features and Capabilities

Describe what the module allows users or the business to do. Focus on **outcomes and capabilities**.

For each feature, document:

- **Capability** — what can be done
- **Who** — who benefits from or uses it (role or user type, when known)
- **Outcome** — expected user-facing or business result

Optional when clearly observed: important conditions that affect whether the capability is available.

Do **not** describe functions, methods, APIs, controllers, routes, or implementation details unless absolutely necessary for business context—and even then, phrase them as business constraints, not code.

Suggested per-feature shape:

```markdown
### [Feature name]

- **Capability:** ...
- **Who uses it:** ...
- **Outcome:** ...
- **Conditions:** ... (only if observed and material)
```

### 6.3 User Outcomes / End Results

Explicitly document what the end user can achieve through this module. This section keeps the specification focused on **business value**, not only purpose statements.

Cover, as applicable:

- What can the user **create**?
- What can the user **view**?
- What can the user **manage**?
- What can the user **change**?
- What **information** can the user receive?
- What **business action** becomes possible?

Prefer concrete outcome statements over restating the Overview.

### 6.4 Scope Boundaries *(recommended)*

Document what is considered **part of this module** and what is **handled by another module**.

Purpose: prevent overlapping specifications and incorrect claims of responsibility.

Include:

- **In scope** — responsibilities this module owns
- **Out of scope** — related capabilities owned elsewhere (name the other module when known)

Do not invent module boundaries. Derive them from how the product is actually organized and used.

### 6.5 Linked Modules

Document other **business modules** that interact with, depend on, provide information to, or receive information from this module.

For each linked module, explain the **business relationship** in simple terms. Examples:

- This module provides information to another module
- A user action here affects another module
- This module depends on another module for access or shared business data
- This module contributes to a larger business workflow

Suggested table:

| Linked Module | Business relationship |
| ------------- | --------------------- |
| Example Module | Provides X used by this module |
| Another Module | Consumes Y produced here |

Do **not** describe code imports, package dependencies, shared libraries, or low-level integration mechanisms.

### 6.6 Current Data Model

Document the important **business data** currently associated with this module, in a business-readable way.

Describe:

- What entities or records the module manages
- What information each entity represents
- How important entities relate to the module’s business purpose

This section represents the **currently implemented** data concepts. Do **not** redesign, normalize, or propose a new model.

Suggested table:

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| Example Record | Represents ... | Used to ... |

Avoid raw schema dumps unless that is the only practical way to represent the current model—and even then, explain business meaning.

### 6.7 Attributes

List important attributes or fields currently associated with the module’s main business entities.

For each attribute, document:

- **Attribute name** (product-facing name preferred; technical name only if that is how users/docs know it)
- **Business meaning**
- **What it represents** from a user or business perspective

Include required/optional or constraints **only** when clearly observable and useful for business understanding.

Suggested table:

| Attribute | Business meaning | Notes (optional) |
| --------- | ---------------- | ---------------- |
| Example Field | Meaning from the user’s perspective | Required / optional / constraint if known |

Do not turn this into a complete database column list unless every field is needed to understand business behavior.

### 6.8 Current UI Layout

Document how the module is **currently** presented to users.

**Before writing this section, inspect the actual frontend implementation** related to the module (pages, routes, forms, lists, drawers/modals, empty and loading states, permission-gated UI).

Describe the UI from the **user’s perspective**, including as relevant:

- Main pages or screens
- Important sections within those screens
- Primary actions
- Forms
- Tables, lists, cards, dashboards, or detail views
- Navigation or workflow between relevant screens
- Important empty, loading, or restricted states when they materially affect experience

Capture the **current** layout and user flow. Do **not** propose redesigns, and do **not** modify UI code as part of writing the specification.

### 6.9 Miscellaneous / Module-Specific Information

Flexible section for important information unique to the module that does not fit earlier sections.

Appropriate examples:

- Important business rules
- Module-specific terminology
- Special workflows
- Important constraints visible from current behavior
- Unique user-facing states
- Role-specific behavior

Only include information that helps understand the module. Do **not** use this section as a dumping ground for technical implementation details. If nothing unique applies, write `None.`

---

## 7. How to Inspect a Module Before Documenting It

Specifications must be grounded in the **current** product. Inspect before writing.

### 7.1 General process

1. Identify the business module’s product name and likely frontend/backend locations.
2. Inspect **frontend** to understand screens, flows, labels, actions, and visible states.
3. Inspect **backend** to understand supported business behavior, constraints, permissions, and data concepts.
4. Cross-check: UI claims should align with backend-supported behavior; note discrepancies as unclear rather than guessing which is “correct.”
5. Translate findings into business language using the required section order.
6. Mark gaps explicitly; do not invent missing pieces.

### 7.2 Frontend inspection (required for Current UI Layout; useful everywhere)

Inspect, as applicable:

- Routes / pages belonging to the module
- Primary navigation entry points
- Lists, detail views, forms, wizards, modals/drawers
- Visible actions (create, edit, delete, export, assign, approve, etc.)
- Labels, status badges, filters, and empty/loading/error/restricted states
- Role- or permission-gated controls that change what users can see or do

Goal: describe the **current user experience**, not the component tree.

### 7.3 Backend inspection (required for accurate behavior and constraints)

Inspect, as applicable:

- Business operations the module supports (create, update, lifecycle transitions, notifications, etc.)
- Validation and business rules that allow or block actions
- Permission / role constraints that affect outcomes
- Business entities and attributes actually used
- Cross-module effects (for Linked Modules and Scope Boundaries)

Goal: document **actual supported business behavior**, not services, controllers, or persistence mechanics.

### 7.4 Perspective for writing

Write from the perspective of:

- What users can do
- What value or outcome they receive
- What information they interact with
- How this module relates to other modules

Whether the module’s code lives mainly in the frontend, mainly in the backend, or in both, the specification format and perspective stay the same.

---

## 8. Non-Negotiable Rules

1. **Current implementation only** — Describe what exists and behaves today. Do not invent features, business rules, data attributes, UI screens, or workflows that are not present.
2. **No speculation** — If behavior is unclear after inspecting frontend and backend, mark it explicitly (for example: `Unclear — requires confirmation` or `[Requires verification]`) instead of guessing.
3. **No redesigns** — Do not propose improvements, UX changes, or future features inside the specification unless a separate task explicitly requests that.
4. **Observed vs assumed** — Clearly distinguish observed behavior from any necessary assumption. Prefer marking uncertainty over soft guessing.
5. **Business language** — Prefer user outcomes and business meaning over implementation explanations.
6. **Consistent structure** — Use the same headings and order for every module.
7. **No application code changes** — Creating or updating a Module Specification must not modify frontend or backend application code.
8. **Reusable across stacks** — The same template applies whether the module is primarily frontend, primarily backend, or both.

---

## 9. Writing Style Standards

- Use clear, business-oriented language.
- Describe **actual** behavior, not intended future behavior.
- Prefer **user outcomes** over implementation explanations.
- Be specific enough that a product owner, business stakeholder, QA engineer, or developer can understand what the module currently does.
- Avoid unnecessary technical jargon.
- Do not speculate.
- Do not propose improvements or redesigns inside the specification unless explicitly requested in a separate task.
- Clearly distinguish between observed behavior and assumptions.
- Maintain consistent headings and ordering across every module.
- Keep each section focused; put overflow unique material in Miscellaneous.
- When listing features or outcomes, prefer concrete verbs (create, view, assign, escalate, export) over vague phrases (“supports risk handling”).

---

## 10. Consistency Checklist

Before considering a module specification complete, confirm:

- [ ] File lives under `docs/module-specifications/` with a kebab-case slug name
- [ ] All required sections appear in the mandated order
- [ ] Overview is understandable without reading code
- [ ] Features describe capability, who, and outcome (not APIs/methods)
- [ ] User Outcomes / End Results are explicit and concrete
- [ ] Scope Boundaries separate this module from others (recommended)
- [ ] Linked Modules describe business relationships only
- [ ] Data Model and Attributes reflect **current** business information only
- [ ] Current UI Layout was written after inspecting the frontend
- [ ] Backend behavior/constraints were inspected where relevant
- [ ] No invented features, fields, rules, or UI
- [ ] Unclear items are marked for confirmation
- [ ] No redesign proposals or speculative future behavior
- [ ] Language is business-readable throughout

---

## 11. Blank Template

Copy everything below this line into a new file such as `docs/module-specifications/<module-slug>.md` and replace the placeholders. Do not create individual module files until tasked to do so.

```markdown
# [Module Name]

## 1. Module Overview

[What this module is, its primary business purpose, the main problem it solves, and the primary users or roles that benefit from it.]

## 2. Features and Capabilities

### [Feature name]

- **Capability:**
- **Who uses it:**
- **Outcome:**
- **Conditions:** [Only if observed and material; otherwise omit]

### [Feature name]

- **Capability:**
- **Who uses it:**
- **Outcome:**
- **Conditions:**

## 3. User Outcomes / End Results

- **Create:** ...
- **View:** ...
- **Manage:** ...
- **Change:** ...
- **Information received:** ...
- **Business actions enabled:** ...

## 4. Scope Boundaries

### In scope

- ...

### Out of scope (handled elsewhere)

- ... — handled by [Other Module], when known

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
|               |                       |

## 6. Current Data Model

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
|                 |                  |                     |

## 7. Attributes

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
|           |                  |       |

## 8. Current UI Layout

### Main screens / pages

- ...

### Important sections and views

- ...

### Primary actions

- ...

### Forms

- ...

### Lists / tables / cards / detail views

- ...

### Navigation and workflow

- ...

### Material empty, loading, or restricted states

- ...

## 9. Miscellaneous / Module-Specific Information

[Business rules, terminology, special workflows, constraints, unique states, or role-specific behavior — or `None.`]
```
