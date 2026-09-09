# ADR 0021: OpenFGA model ownership deferred

- **ID:** D-21
- **Status:** Deferred

## Context

Authorization modeling in OpenFGA requires senior ownership. Premature app-level OpenFGA coupling would fight the port-based design.

## Decision

**OpenFGA authorization model ownership/design is deferred** to the senior engineering team. The V5 application depends on an **authorization abstraction**, not OpenFGA directly.

## Consequences

- No OpenFGA schema/tuple design work is required for current bootstrap.
- Modules call the authorizer port (D-06); adapters come later.
- Senior team delivers model ownership and write paths when scheduled.
