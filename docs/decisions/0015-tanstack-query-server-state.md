# ADR 0015: TanStack Query for server state

- **ID:** D-15
- **Status:** Accepted

## Context

Remote/API entity state needs caching, refetch, and invalidation distinct from local UI state (D-05).

## Decision

**TanStack Query** is the server-state/data-fetching library for the frontend. Zustand is for client/application state, not general server-state caching.

## Consequences

- Fetching, caching, and invalidating API data uses TanStack Query.
- Zustand must not become a general remote-data cache.
- Module `api/` helpers should integrate cleanly with Query hooks/patterns.
