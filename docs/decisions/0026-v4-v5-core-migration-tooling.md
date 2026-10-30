# ADR 0026: V4→V5 core domain migration tooling

- **ID:** D-26
- **Status:** Accepted
- **Supersedes:** [D-18](./0018-production-migrations-deferred.md) (tooling deferral)

## Context

D-18 deferred production migration pipelines until a V4→V5 strategy existed. The core-domain strategy is now defined in [V4_V5_CORE_MIGRATION.md](../migration/V4_V5_CORE_MIGRATION.md): single V5 Mongo with `organizationId`, preserve `_id`s as string FKs, derive `UnitMembership`, park domains without V5 homes, then Auth0 + OpenFGA.

## Decision

1. Ship offline migrator scripts under `ims-systems-v5-backend/scripts/migrate-v4/` (wave runners, dry-run, validation reports).
2. Migrate **core V5 domains only**; leave CQC / Carbon Calculator / Projects / Forms / wallet / persisted dashboards in V4 DBs until those modules exist.
3. Do **not** use the in-app CSV `data-import` wizard for production tenant cutover.
4. Post-Mongo cutover uses existing Auth0 identity link docs and `pnpm backfill:openfga-memberships`.

## Consequences

- Production cutovers follow the wave order and validation harness in the migration doc.
- Orphan-domain data remains recoverable from V4 backups for a later programme.
- D-18 is marked **Superseded** for tooling; empty/dedicated V5 DB practice from D-02 still applies for non-prod targets.
