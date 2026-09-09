# ADR 0013: Zod for application-boundary validation

- **ID:** D-13
- **Status:** Accepted

## Context

External input must be validated before business logic. Relying only on ODM validation is insufficient at HTTP/application boundaries.

## Decision

**Zod** is the application-boundary validation library. External input must be validated before entering business logic. **Mongoose validation does not replace** application-level validation.

## Consequences

- Route/DTO boundaries use Zod schemas.
- Mongoose remains responsible for persistence constraints where used (D-17), not as the sole input gate.
- Other validation libraries are not the V5 baseline.
