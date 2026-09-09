# ADR 0020: Production session transport deferred

- **ID:** D-20
- **Status:** Deferred

## Context

Cookie versus bearer (or other) production session transport interacts with Auth0 and browser security choices. Locking it early via the development stub would create false coupling.

## Decision

**Production session transport (cookie vs bearer) is deferred.** The development authentication stub must remain transport-agnostic enough to be replaced later.

## Consequences

- Stub AuthN must not hard-wire the permanent production transport.
- Modules should consume identity from the security port, not from a specific cookie/header scheme assumed permanent.
- Final transport is decided with senior Auth0 integration work.
