# ADR 0019: Query-driven MongoDB indexes

- **ID:** D-19
- **Status:** Accepted

## Context

Indexes improve critical query performance but arbitrary indexes add write cost and clutter.

## Decision

MongoDB indexes must be **query-driven**. Critical queries should be reviewed with appropriate query/explain analysis. Do **not** create arbitrary indexes without an access-pattern justification.

## Consequences

- Index additions should cite the query/access pattern they serve.
- Tenant and soft-delete filters (`organizationId`, `deletedAt`) are likely candidates only when justified by real queries.
- Performance tuning remains iterative; this ADR does not prescribe a global index list.
