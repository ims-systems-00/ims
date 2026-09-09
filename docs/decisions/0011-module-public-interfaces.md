# ADR 0011: Controlled module public interfaces

- **ID:** D-11
- **Status:** Accepted

## Context

Clear module boundaries are required for maintainability and AI-assisted development. Unrestricted cross-module persistence access recreates V4 coupling.

## Decision

- Modules expose **controlled public service/application interfaces**.
- Modules must **not** directly access another module’s private repository or database implementation.
- Asynchronous/domain events may be introduced when a real decoupling or background-processing requirement exists.

## Consequences

- Cross-module collaboration goes through documented public APIs.
- Events are optional and demand-driven — not mandatory infrastructure for every module.
- Bypassing another module’s repository layer is disallowed.
