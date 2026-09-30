# Architecture Decision Records

This folder stores formalized decisions for the V5 rebuild.

---

## Rules

1. Do not invent project-wide standards in architecture docs without an ADR when the topic requires team approval.
2. One decision per file: `NNNN-short-title.md` (example: `0001-pnpm-workspaces.md`).
3. Keep ADRs short: Context → Decision → Consequences → Status.
4. Architecture documents explain how the system follows decisions; ADRs record why a choice exists.
5. When a decision is accepted or deferred, update this index and link the ADR.

---

## Decision index

| ID | Topic | Status | ADR |
| -- | ----- | ------ | --- |
| D-01 | Monorepo tooling (pnpm workspaces) | Accepted | [0001-pnpm-workspaces.md](./0001-pnpm-workspaces.md) |
| D-02 | Separate V5 MongoDB database | Accepted | [0002-separate-v5-mongodb.md](./0002-separate-v5-mongodb.md) |
| D-03 | Public API prefix `/api/v1` | Accepted | [0003-api-v1-prefix.md](./0003-api-v1-prefix.md) |
| D-04 | Frontend UI (shadcn/ui) and icons (Lucide) | Accepted | [0004-shadcn-lucide.md](./0004-shadcn-lucide.md) |
| D-05 | Client state (Zustand) | Accepted | [0005-zustand-client-state.md](./0005-zustand-client-state.md) |
| D-06 | AuthN/AuthZ ports and development stub | Accepted | [0006-auth-ports-and-dev-stub.md](./0006-auth-ports-and-dev-stub.md) |
| D-07 | Carbo Calc / `cc-frontend-master` initial scope | Deferred | [0007-carbo-calc-deferred.md](./0007-carbo-calc-deferred.md) |
| D-08 | Admin authentication as separate surface | Accepted | [0008-separate-admin-auth-surface.md](./0008-separate-admin-auth-surface.md) |
| D-09 | Tenant scoping and soft-delete convention | Accepted | [0009-tenant-scoping-and-soft-delete.md](./0009-tenant-scoping-and-soft-delete.md) |
| D-10 | Testing baseline | Accepted | [0010-testing-baseline.md](./0010-testing-baseline.md) |
| D-11 | Module public interfaces / cross-module access | Accepted | [0011-module-public-interfaces.md](./0011-module-public-interfaces.md) |
| D-12 | 1:1 module specification mapping | Accepted | [0012-one-to-one-module-specs.md](./0012-one-to-one-module-specs.md) |
| D-13 | Zod application-boundary validation | Accepted | [0013-zod-validation.md](./0013-zod-validation.md) |
| D-14 | Pino structured logging + correlation IDs | Accepted | [0014-pino-structured-logging.md](./0014-pino-structured-logging.md) |
| D-15 | TanStack Query for server state | Accepted | [0015-tanstack-query-server-state.md](./0015-tanstack-query-server-state.md) |
| D-16 | Auth0 Next.js integration | Deferred | [0016-auth0-nextjs-deferred.md](./0016-auth0-nextjs-deferred.md) |
| D-17 | Mongoose ODM | Accepted | [0017-mongoose-odm.md](./0017-mongoose-odm.md) |
| D-18 | Production data migration tooling | Deferred | [0018-production-migrations-deferred.md](./0018-production-migrations-deferred.md) |
| D-19 | Query-driven MongoDB indexes | Accepted | [0019-query-driven-indexes.md](./0019-query-driven-indexes.md) |
| D-20 | Production session transport (cookie vs bearer) | Deferred | [0020-session-transport-deferred.md](./0020-session-transport-deferred.md) |
| D-21 | OpenFGA model ownership/design | Deferred | [0021-openfga-model-deferred.md](./0021-openfga-model-deferred.md) |
| D-22 | Feature branches and pull requests | Accepted | [0022-feature-branches-and-prs.md](./0022-feature-branches-and-prs.md) |
| D-23 | ESLint and Prettier | Accepted | [0023-eslint-prettier.md](./0023-eslint-prettier.md) |
| D-24 | Vite + React + TypeScript frontend | Accepted | [D-24-vite-react-frontend.md](./D-24-vite-react-frontend.md) |

---

## Status meanings

| Status | Meaning |
| ------ | ------- |
| **Accepted** | Engineering baseline — follow this ADR |
| **Deferred** | Explicitly postponed; do not implement until a later task/ADR revisits it |
| **Pending** | Not yet decided (none remaining in this baseline set) |
