# ADR 0022: Feature branches and pull requests

- **ID:** D-22
- **Status:** Accepted

## Context

V4 apps document differing branch naming. The monorepo needs a simple, enforceable contribution rule for V5 work.

## Decision

Use **feature branches and pull requests**. Protected integration/release branches must **not** receive direct unreviewed pushes. Exact branch names follow the team’s repository convention.

## Consequences

- V5 changes land via PR review.
- This ADR does not rename existing V4 branch schemes.
- Team convention supplies concrete branch names (e.g. `main`/`develop`); protection rules must match.
