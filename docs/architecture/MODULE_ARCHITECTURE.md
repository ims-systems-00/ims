# Module Architecture

**Status:** Foundation rules  
**Related:** [V5_ARCHITECTURE.md](./V5_ARCHITECTURE.md), [MODULE_DEVELOPMENT_GUIDE.md](../development/MODULE_DEVELOPMENT_GUIDE.md), [MODULE_SPECIFICATION_REFERENCE.md](../module-specifications/MODULE_SPECIFICATION_REFERENCE.md)

---

## 1. What a module is

A **module** is a bounded business capability that maps 1:1 to a specification in `docs/module-specifications/<slug>.md`.

Examples of existing specs: `risk-management`, `compliance`, `users`, `authentication`.

Modules own:

- Their application use-cases / services
- Their HTTP routes and request validation (backend)
- Their UI surfaces for that capability (frontend)
- Tests for their behaviour

Modules must **not** own:

- Global authn/authz provider implementations (Auth0/OpenFGA)
- Shared infrastructure bootstrapping (DB connection, app bootstrap)
- Other modules’ internal models or private APIs

---

## 2. Source of truth

| Concern | Source |
| ------- | ------ |
| Business behaviour | `docs/module-specifications/<slug>.md` |
| How to write/read specs | `MODULE_SPECIFICATION_REFERENCE.md` |
| Current Mongo entities (investigation) | `docs/MASTER_DB_SCHEMA_PLAN.md` |
| Engineering structure | This document + backend/frontend architecture docs |

If implementation and the module specification disagree, **stop and escalate**. Do not invent behaviour.

---

## 3. Backend module shape (target)

```text
ims-systems-v5-backend/src/modules/<module-slug>/
├── index.ts                 # public module API / router export
├── routes/                  # HTTP route definitions
├── controllers/             # thin HTTP adapters
├── services/                # business use-cases
├── repositories/            # persistence access (optional until needed)
├── schemas/                 # validation / DTOs
├── types/                   # module-local types
└── __tests__/
```

Rules:

- Controllers stay thin; business logic lives in services.
- Other modules may import only the module’s **public** surface (`index.ts` or explicitly exported contracts).
- Do not reach into another module’s `services/` or `repositories/` directly.

---

## 4. Frontend module shape (target)

```text
ims-systems-v5-frontend/src/modules/<module-slug>/
├── index.ts                 # public exports
├── components/              # module-local UI
├── hooks/                   # module-local hooks
├── api/                     # API client functions for this module
├── types/
└── __tests__/
```

Route-level composition lives in the Vite/React app shell (and a router when introduced), not inside Next.js-style `app/` directories.

Shared UI primitives belong under `src/shared/`, not duplicated per module.

---

## 5. Cross-module collaboration

Allowed:

- Calling another module’s **documented public API**
- Sharing kernel types that are truly cross-cutting (identity ids, org id) via `shared/`

Disallowed:

- Importing another module’s private internals
- Duplicating another module’s business rules “for convenience”
- Expanding scope beyond the target specification without a task

---

## 6. V4 reference usage

When implementing a V5 module:

1. Read the module specification.
2. Inspect the corresponding V4 backend paths under `ims-systems-backend/src/` (routes/controllers/services/models).
3. Inspect the corresponding V4 frontend paths under `ims-systems-frontend/src/views/` and `services/`.
4. Re-implement against V5 architecture — do not port files wholesale.

V4 folder names are often camelCase (`riskManagement`). V5 code folders use the **spec slug** (kebab-case).

---

## 7. Pending decisions

| ID | Topic |
| -- | ----- |
| D-11 | Exact public-export pattern between backend modules (events vs direct calls) |
| D-12 | Whether some V4 “modules” merge or split in V5 (only with product approval) |
