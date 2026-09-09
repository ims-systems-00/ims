# ADR 0009: Tenant scoping and soft-delete convention

- **ID:** D-09
- **Status:** Accepted

## Context

Organisation-owned data in IMS must remain tenant-isolated. Soft deletion is common and needs one V5 convention so modules do not invent incompatible patterns.

## Decision

1. **Tenant scoping is mandatory** for organisation-owned resources. Modules must not bypass tenant boundaries.
2. Soft deletion uses a consistent V5 convention (below).
3. Repository/query layers enforce tenant filters using the authenticated security context — never trust a client-supplied organisation id alone.

### Convention

| Concern | Field / rule |
| ------- | ------------ |
| Tenant key | `organizationId` (MongoDB ObjectId / string form of ObjectId) on organisation-owned documents |
| Soft delete | `deletedAt: Date \| null` — `null` (or unset) means active; non-null means soft-deleted |
| Default reads | Exclude documents where `deletedAt` is set, unless an explicit “include deleted” use case is specified |
| Enforcement | Repositories/queries for organisation-owned resources always constrain by `organizationId` from the resolved security context |

Shared embeds that are not independently tenant-rooted inherit tenancy from their owning document.

## Consequences

- New organisation-owned schemas must include `organizationId` and follow `deletedAt`.
- Cross-tenant reads/writes are defects, not features.
- Global (non-organisation) resources must be explicitly documented as such in the owning module.
