# ADR 0005: Zustand for client/application state

- **ID:** D-05
- **Status:** Accepted

## Context

The frontend needs a library for client/application UI state. Server data caching must not be conflated with local UI state.

## Decision

Use **Zustand** for client-side UI/application state. Do **not** use Zustand as a replacement for server-state management.

## Consequences

- Local UI state (wizards, drawers, ephemeral flags) may use Zustand.
- Server/API cache and remote entity state use the server-state library (D-15), not Zustand.
