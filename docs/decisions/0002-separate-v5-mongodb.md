# ADR 0002: Separate V5 MongoDB database

- **ID:** D-02
- **Status:** Accepted

## Context

V4 already uses MongoDB. Sharing the same application database during V5 development risks data corruption and unclear ownership.

## Decision

V5 uses a **separate MongoDB database** from V4. V4 and V5 must not share the same application database during development.

## Consequences

- V5 connection config must point at a distinct database name/URI from V4.
- Schema evolution in V5 does not mutate V4 collections in place.
- Any future shared-data or migration strategy requires a separate explicit design (see D-18).
