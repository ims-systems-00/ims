# V5 Architecture

**Status:** Foundation rules  
**Audience:** Engineers and AI agents working on V5  
**Related:** [MODULE_ARCHITECTURE.md](./MODULE_ARCHITECTURE.md), [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md), [FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md), [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md), [SECURITY_ARCHITECTURE.md](./SECURITY_ARCHITECTURE.md)

---

## 1. Purpose

This document defines the global engineering architecture for the IMS V5 rebuild. It does **not** describe business behaviour. Business behaviour lives in `docs/module-specifications/`.

---

## 2. Repository layout

```text
ims-v5/
├── docs/
│   ├── module-specifications/     # Business source of truth
│   ├── architecture/              # This folder
│   ├── development/               # Engineering process rules
│   └── decisions/                 # ADRs (team-approved)
├── ims-systems-backend/           # V4 backend — reference only
├── ims-systems-frontend/          # V4 frontend — reference only
├── cc-frontend-master/            # V4 Carbo Calc frontend — reference only
├── ims-systems-v5-backend/        # V5 Express + TypeScript + MongoDB
└── ims-systems-v5-frontend/       # V5 Vite + React + TypeScript
```

### Hard constraints

- Do **not** modify V4 applications for V5 feature work.
- Do **not** copy V4 source trees into V5.
- Treat V4 as a behavioural and structural reference when implementing a module.
- Do **not** implement business modules until tasked.

---

## 3. Technology baseline (confirmed)

| Layer | Stack |
| ----- | ----- |
| Frontend | Vite, React, TypeScript |
| Backend | Express, TypeScript, MongoDB |
| Authentication (target) | Auth0 — implemented later by senior engineers |
| Authorization (target) | OpenFGA — implemented later by senior engineers |

Until Auth0/OpenFGA land, V5 must use a **security abstraction** with a **development stub**. See [SECURITY_ARCHITECTURE.md](./SECURITY_ARCHITECTURE.md).

---

## 4. Non-negotiable priorities

1. Security  
2. Modular architecture and clear module boundaries  
3. Scalability and performance  
4. Maintainability and testability  
5. Strict adherence to module specifications  
6. Efficient AI-assisted development (layered context — see [AI_DEVELOPMENT_GUIDE.md](../development/AI_DEVELOPMENT_GUIDE.md))

---

## 5. Layered documentation model

| Layer | Location | Load when |
| ----- | -------- | --------- |
| Global architecture | `docs/architecture/` | Always for V5 engineering work (relevant files only) |
| Development process | `docs/development/` | When implementing or reviewing |
| Business behaviour | `docs/module-specifications/<module>.md` | Only for the target module |
| Current-state DB map | `docs/MASTER_DB_SCHEMA_PLAN.md` | When designing persistence for a module |
| Decisions | `docs/decisions/` | When a pending decision is referenced |

Do **not** load every module specification by default.

---

## 6. High-level system shape

```text
[ Vite + React V5 frontend ]
        |
        | HTTPS / JSON API
        v
[ Express V5 backend ]
        |
        +--> Security abstraction (AuthN / AuthZ)
        +--> Module application services
        +--> MongoDB (via infrastructure adapters)
```

Cross-cutting concerns (logging, config, errors, security) live in shared/infrastructure layers — not inside business modules as one-off copies.

---

## 7. Naming conventions (V5)

| Kind | Convention | Example |
| ---- | ---------- | ------- |
| Module folder (code) | kebab-case matching spec slug | `risk-management/` |
| Spec file | kebab-case | `risk-management.md` |
| TypeScript files | kebab-case | `risk.service.ts` |
| React components | PascalCase filename OK | `RiskTable.tsx` |
| Env vars | SCREAMING_SNAKE_CASE | `MONGO_URI` |

Prefer V5 conventions over V4 typos or historical names (e.g. avoid `calender`).

---

## 8. Pending team-lead decisions

Record outcomes in `docs/decisions/`. Until approved, do not hard-code assumptions into code.

| ID | Topic |
| -- | ----- |
| D-01 | Monorepo tooling (none vs workspaces vs Turborepo/pnpm) |
| D-02 | Separate V5 MongoDB database vs shared with V4 |
| D-03 | Public API versioning (`/api/v5` vs other) |
| D-07 | Long-term handling of `cc-frontend-master` / Carbo Calc in V5 |
| D-08 | Whether platform admin auth remains a separate surface |

See also pending items in sibling architecture docs.
