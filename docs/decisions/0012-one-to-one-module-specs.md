# ADR 0012: One-to-one module specification mapping

- **ID:** D-12
- **Status:** Accepted

## Context

Module specifications under `docs/module-specifications/` are the business source of truth. V5 code structure must stay traceable to those documents.

## Decision

Maintain a **1:1 relationship** between each module specification and its V5 module unless an explicit product/team-lead decision approves a merge or split.

## Consequences

- Default: one spec slug → one V5 module folder.
- Merges/splits require documented product/team-lead approval (new ADR or amendment).
- Agents must not invent module boundaries that diverge from specs.
