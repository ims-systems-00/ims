# AI Development Guide

**Status:** Foundation rules  
**Audience:** AI coding agents and humans supervising them  
**Related:** [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md), [MODULE_DEVELOPMENT_GUIDE.md](./MODULE_DEVELOPMENT_GUIDE.md), [V5_ARCHITECTURE.md](../architecture/V5_ARCHITECTURE.md)

---

## 1. Purpose

Enable efficient, correct AI-assisted development without flooding context with the entire monorepo or every module specification.

---

## 2. Mandatory context loading (module implementation)

When implementing or changing a **specific business module**, load **only**:

1. Relevant **global architecture** docs (usually `V5_ARCHITECTURE.md` + backend or frontend architecture as applicable)  
2. Relevant **security** rules (`SECURITY_ARCHITECTURE.md`) when identity, authz, or tenancy is involved  
3. **Module development** rules (`MODULE_DEVELOPMENT_GUIDE.md`, `MODULE_ARCHITECTURE.md`)  
4. The **target module specification** (`docs/module-specifications/<slug>.md`)  
5. **Relevant V4 implementation** for that module only  
6. **Relevant V5 dependencies** already in tree (shared/security/infrastructure the module will use)

### Explicit non-goals for context

- Do **not** automatically consume every file under `docs/module-specifications/`.
- Do **not** load unrelated modules “for completeness”.
- Do **not** modify V4 applications.
- Do **not** implement modules that were not requested.

---

## 3. Layered documentation map

| Need | Open |
| ---- | ---- |
| Repo shape / priorities | `docs/architecture/V5_ARCHITECTURE.md` |
| Module boundaries | `docs/architecture/MODULE_ARCHITECTURE.md` |
| Backend structure | `docs/architecture/BACKEND_ARCHITECTURE.md` |
| Frontend structure | `docs/architecture/FRONTEND_ARCHITECTURE.md` |
| Persistence rules | `docs/architecture/DATABASE_ARCHITECTURE.md` + `MASTER_DB_SCHEMA_PLAN.md` as needed |
| AuthN/AuthZ | `docs/architecture/SECURITY_ARCHITECTURE.md` |
| Process | `docs/development/DEVELOPMENT_RULES.md` |
| How to build a module | `docs/development/MODULE_DEVELOPMENT_GUIDE.md` |
| Tests | `docs/development/TESTING_STRATEGY.md` |
| Approved choices | `docs/decisions/` |
| Business behaviour | **one** `docs/module-specifications/<slug>.md` |

---

## 4. Behavioural rules for agents

1. Prefer editing V5 packages and docs — never V4 apps for feature work.  
2. If a decision is marked pending / requires team-lead approval, **do not invent** a permanent standard; stub minimally or ask.  
3. Keep diffs small and task-scoped.  
4. When behaviour is unclear, inspect V4 **and** the module spec; if they conflict, report the conflict.  
5. Never copy secrets from V4 `.env*` files into V5.  
6. Do not install unnecessary dependencies.

---

## 5. Suggested prompt checklist (humans → agents)

- Module slug  
- In-scope capabilities from the spec  
- Out-of-scope list  
- Whether Auth stub is acceptable for the task  
- Links to any ADR that must be followed  

---

## 6. Anti-patterns

- One giant “master” doc replacing layered docs  
- Generating all modules at once  
- Porting entire V4 folders into V5  
- Assuming Auth0/OpenFGA are already configured  
- Treating `MASTER_DB_SCHEMA_PLAN.md` as a rewrite mandate
