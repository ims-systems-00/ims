# ADR 0018: Production migration tooling deferred

- **ID:** D-18
- **Status:** Deferred

## Context

V4→V5 data migration is a distinct programme from establishing the V5 engineering baseline.

## Decision

**Production data migration tooling is deferred** until the V4→V5 migration strategy is explicitly designed.

## Consequences

- Do not build production migration pipelines as part of early platform bootstrap.
- Development may still use a separate empty/dedicated V5 database (D-02).
- Migration design later may produce new ADRs for tools and cutover rules.
