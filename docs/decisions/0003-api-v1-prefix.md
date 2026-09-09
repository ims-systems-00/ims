# ADR 0003: Public API prefix `/api/v1`

- **ID:** D-03
- **Status:** Accepted

## Context

V5 needs a stable public HTTP prefix. Versioning must be centralized so future API versions can coexist without rewriting every module.

## Decision

Public backend API prefix is **`/api/v1`**. API version mounting remains centralized in the application bootstrap layer.

## Consequences

- Module routers register under the centralized versioned mount; modules do not hard-code alternate public roots.
- A future `/api/v2` (or similar) can be introduced at the app layer without forcing a module rewrite.
- Existing V4 `/api/v3` paths are irrelevant to V5 public contracts.
