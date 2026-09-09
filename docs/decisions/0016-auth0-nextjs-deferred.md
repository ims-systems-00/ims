# ADR 0016: Auth0 Next.js integration deferred

- **ID:** D-16
- **Status:** Deferred

## Context

Long-term frontend authentication targets Auth0, but senior-owned integration is not part of the current platform bootstrap.

## Decision

**Auth0 Next.js integration is deferred.** Do not implement it during the current platform bootstrap.

## Consequences

- Frontend continues to use the auth client port and development stub (D-06).
- No Auth0 Next.js SDK wiring until an explicit senior-led task.
- Related production transport choices remain deferred (D-20).
