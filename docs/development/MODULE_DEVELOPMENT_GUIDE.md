# Module Development Guide

**Status:** Foundation rules  
**Related:** [MODULE_ARCHITECTURE.md](../architecture/MODULE_ARCHITECTURE.md), [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md), [AI_DEVELOPMENT_GUIDE.md](./AI_DEVELOPMENT_GUIDE.md)

---

## 1. When to create a module

Create or extend a V5 module only when a task explicitly names the module (spec slug).

---

## 2. Required reading before coding

1. [V5_ARCHITECTURE.md](../architecture/V5_ARCHITECTURE.md) (skim)  
2. [SECURITY_ARCHITECTURE.md](../architecture/SECURITY_ARCHITECTURE.md) (if touching authz/authn or tenant data)  
3. This guide + [MODULE_ARCHITECTURE.md](../architecture/MODULE_ARCHITECTURE.md)  
4. `docs/module-specifications/<slug>.md`  
5. Relevant V4 implementation paths only  
6. Existing V5 shared/security dependencies the module will use  

Do **not** read all module specifications.

---

## 3. Implementation sequence (recommended)

1. Confirm scope boundaries from the specification.  
2. Identify entities and relationships (`MASTER_DB_SCHEMA_PLAN.md` + V4 models as needed).  
3. Define module public API (backend routes/services; frontend pages/api).  
4. Implement persistence access behind repositories.  
5. Implement services and HTTP/UI adapters.  
6. Add tests for critical behaviours (see [TESTING_STRATEGY.md](./TESTING_STRATEGY.md)).  
7. Verify behaviour against the specification — not against assumed improvements.

---

## 4. Do / Don’t

| Do | Don’t |
| -- | ----- |
| Match specification outcomes | Invent fields, statuses, or workflows |
| Keep controllers thin | Hide business rules only in UI |
| Use security ports for identity/authz | Bypass tenant checks |
| Export a clear public surface | Import another module’s internals |
| Re-implement cleanly in V5 | Copy V4 files wholesale |

---

## 5. Definition of done (module task)

- Behaviour aligns with the module specification for the tasked scope  
- No V4 trees modified  
- Security and tenancy rules respected  
- Tests added for the scoped behaviour  
- No unresolved invented decisions (pending items escalated or ADR’d)
