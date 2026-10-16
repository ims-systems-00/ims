# ADR 0016: Auth0 Vite SPA integration (org-user)

- **ID:** D-16
- **Status:** Accepted
- **Supersedes:** Earlier deferral that assumed Next.js Auth0 middleware/SSR (obsolete after D-24)

## Context

Long-term frontend authentication targets Auth0. The frontend is a **Vite + React SPA** (D-24), not Next.js. Org-user rollout is tracked in [AUTH_ROLLOUT_TRACKER.md](../security/AUTH_ROLLOUT_TRACKER.md) (milestones M3–M5 for AuthN UX). Platform-admin AuthN remains a separate surface (D-08).

## Decision

- Integrate Auth0 for **organisation users** using the **Auth0 SPA SDK** (Authorization Code + PKCE) behind the existing frontend `AuthClient` port (D-06).
- Do **not** use Next.js Auth0 SDK, middleware, or RSC session patterns.
- Backend validates access tokens issued for the V5 API audience (see D-20).
- Adapter implementation proceeds under the auth rollout tracker; local/dev may keep `development-stub` until the provider flag is flipped.

## Consequences

- UI and data layers depend on security ports, not Auth0 SDKs directly.
- Public Vite env may expose Auth0 domain / client id / audience only — never Management API or OpenFGA secrets.
- D-16 title historically said “Next.js”; treat that framing as obsolete.
