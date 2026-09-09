# ADR 0006: AuthN/AuthZ ports and development stub

- **ID:** D-06
- **Status:** Accepted

## Context

Auth0 and OpenFGA are the long-term targets but are not implemented now. V5 still needs a safe way to develop behind stable abstractions.

## Decision

- Authentication and authorization during V5 development use **isolated ports/interfaces** plus a **temporary development stub**.
- The stub must be replaceable by future Auth0/OpenFGA adapters.
- Do **not** implement Auth0 or OpenFGA in this decision’s scope.
- Do **not** establish production authentication transport as part of the stub (see D-20).

## Consequences

- Modules depend on security ports, not provider SDKs.
- The stub must be impossible to enable accidentally in production configuration.
- Production session transport remains deferred; stub stays transport-agnostic enough to replace later.
- Senior-owned Auth0/OpenFGA work proceeds under separate tasks/ADRs when ready.
