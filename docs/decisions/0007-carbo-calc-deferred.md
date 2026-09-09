# ADR 0007: Carbo Calc deferred from initial V5 scope

- **ID:** D-07
- **Status:** Deferred

## Context

`cc-frontend-master` exists as a V4 Carbo Calc frontend reference. Initial V5 scope must stay focused.

## Decision

Carbo Calc / `cc-frontend-master` is **deferred** from the initial V5 implementation scope. Do not modify or migrate it unless explicitly requested.

## Consequences

- V5 platform and early modules proceed without CC migration work.
- Agents must not treat `cc-frontend-master` as in-scope by default.
- Bringing CC into V5 later requires an explicit task and may need further ADRs.
