# ADR 0021: OpenFGA model ownership and write paths

- **ID:** D-21
- **Status:** Accepted (ownership path); authorization model DSL still senior-gated before M6
- **Related:** [AUTH_ROLLOUT_TRACKER.md](../security/AUTH_ROLLOUT_TRACKER.md)

## Context

Authorization must stay behind the `Authorizer` port (D-06). Premature OpenFGA SDK usage inside modules would fight the architecture. Exact relation DSL and the role→permission matrix still need senior approval.

## Decision

- **Ownership:** Senior engineering owns the OpenFGA authorization model DSL, store/model IDs, and the role→permission matrix.
- **Application dependency:** Modules call `authorizer.allow({ identity, action, resourceType, resourceId?, organizationId? })` only — never OpenFGA SDKs.
- **Adapter location:** `OpenFgaAuthorizer` and membership→tuple projection live under `ims-systems-v5-backend/src/security/` (rollout milestone M6).
- **Write paths:** Tuple sync is triggered from membership/org lifecycle events (create, role change, remove, access block) via a single projection service — not ad hoc writes in every module.
- **Launch posture:** Prefer **org-level** relations first; object-level tuples only when product requires them (tracker working agreement).
- **Fail closed:** OpenFGA errors/timeouts deny access; no allow-on-error.

## Consequences

- Exact model DSL remains a blocker for M6 until seniors approve it (see tracker Senior approvals).
- Env may declare OpenFGA connection placeholders when `SECURITY_PROVIDER=auth0-openfga`; adapters must not silently fall back to the stub.
- Frontend must not hold OpenFGA credentials; client AuthZ is backend-backed.
