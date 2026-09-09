# ADR 0010: Testing baseline

- **ID:** D-10
- **Status:** Accepted

## Context

Modules must be testable from the beginning. Framework choices need to be fixed so scaffolds and CI can converge later.

## Decision

Testing baseline:

- **Vitest** — unit/component testing
- **Supertest** — backend HTTP integration testing
- **React Testing Library** — frontend component behaviour
- **Playwright** — critical end-to-end flows

Tests must prioritize authorization/security and business-critical behaviour. CI enforcement can be strengthened later.

## Consequences

- New V5 packages should be structured so these tools can run against them.
- E2E coverage starts with critical flows only; not every UI path.
- Lack of full CI gates is acceptable early; lack of testability is not.
