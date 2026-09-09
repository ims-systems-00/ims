# ADR 0001: pnpm workspaces for monorepo tooling

- **ID:** D-01
- **Status:** Accepted

## Context

V5 lives beside V4 reference apps in one repository. Packages need a shared install and workspace model without requiring a heavy build orchestrator yet.

## Decision

Use **pnpm workspaces** as the V5 monorepo tooling baseline for `ims-systems-v5-backend` and `ims-systems-v5-frontend` (and future V5 packages as added).

## Consequences

- Root workspace configuration will own V5 package linkage.
- Install/run workflows must use pnpm, not ad-hoc mixed package managers for V5 apps.
- Turborepo or similar orchestration remains out of scope until a later ADR.
