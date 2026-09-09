# Database Architecture

**Status:** Foundation rules  
**Related:** [V5_ARCHITECTURE.md](./V5_ARCHITECTURE.md), [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md), [MASTER_DB_SCHEMA_PLAN.md](../MASTER_DB_SCHEMA_PLAN.md)

---

## 1. Confirmed technology

- Primary datastore for V5: **MongoDB**
- Access from the V5 backend via infrastructure adapters (ODM/driver choice — pending)

---

## 2. Role of existing documents

| Document | Role |
| -------- | ---- |
| `docs/MASTER_DB_SCHEMA_PLAN.md` | **Current-state** map of V4 entities, ownership, and relationships. Investigation only — not a redesign mandate. |
| Module specs § Current Data Model / Attributes | Business meaning of data for that module |
| This document | V5 persistence engineering rules |

Do not treat the master schema plan as permission to change production data or to invent a new global schema in one pass.

---

## 3. V5 persistence rules

1. Model data from the **module specification** and confirmed V4 persistence — not from guesswork.
2. Prefer module-owned collections/schemas; document shared entities explicitly.
3. Organisation (tenant) scoping is a core V4 pattern; V5 must preserve multi-tenant isolation in design. Exact mechanism is pending (D-09).
4. Soft-delete and audit fields exist widely in V4; adopt only with an approved convention (D-09).
5. Migrations / schema evolution process is pending approval before first production write path.

---

## 4. Code placement

```text
infrastructure/          # connection, client lifecycle
modules/<slug>/          # module schemas/repositories
shared/                  # only truly shared schema fragments (when approved)
```

Avoid a single monolithic `models/` tree that every module reaches into without ownership (V4 smell to improve).

---

## 5. Cross-module data

When two modules share an entity:

1. Check `MASTER_DB_SCHEMA_PLAN.md` for ownership and confidence level.
2. Check both module specifications.
3. If ownership is unclear, escalate — do not silently duplicate collections.

---

## 6. Pending decisions

| ID | Topic |
| -- | ----- |
| D-02 | Separate V5 database vs shared with V4 |
| D-09 | Soft-delete, tenancy plugin pattern, shared embeds |
| D-17 | ODM choice (Mongoose vs other) |
| D-18 | Migration tooling for V5 |
| D-19 | Indexing and performance standards |
