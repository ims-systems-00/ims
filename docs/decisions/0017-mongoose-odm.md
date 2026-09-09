# ADR 0017: Mongoose as V5 ODM

- **ID:** D-17
- **Status:** Accepted

## Context

V5 persists to MongoDB and needs a default ODM for schemas and repositories.

## Decision

**Mongoose** is the V5 MongoDB ODM unless later overridden by an explicit architectural decision.

## Consequences

- New V5 persistence code should use Mongoose unless a superseding ADR exists.
- Application-boundary validation still uses Zod (D-13); Mongoose does not replace it.
- V5 remains on a separate database from V4 (D-02).
