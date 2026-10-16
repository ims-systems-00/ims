# ADR 0020: Org-user session transport (Bearer)

- **ID:** D-20
- **Status:** Accepted
- **Scope:** Organisation-user APIs only (not platform admin — D-08)

## Context

Cookie versus bearer transport was deferred so the development stub would not hard-wire production. The frontend is a Vite SPA calling Express `/api/v1` with no Next.js BFF. Hybrid tenancy uses Auth0 Organizations (`org_id` in the access token) plus Mongo membership validation.

## Decision

- **Production org-user transport is Bearer access tokens:** `Authorization: Bearer <access_token>`.
- Tokens are obtained via Auth0 SPA (PKCE). The Express API validates JWT (JWKS, issuer, audience, expiry).
- Optional `x-org-id` may remain as a client hint but must match the IMS organisation resolved from the token’s Auth0 `org_id` mapping — never trust the header alone (D-09).
- The development stub stays transport-agnostic and must not establish cookie sessions as the permanent design.

## Consequences

- Modules continue to consume `SecurityIdentity` from the authenticator port, not raw headers.
- Cookie/BFF session design is out of scope for org-user V5 APIs unless a future ADR revisits it.
- Platform-admin transport remains undecided and must not reuse the org-user Auth0 SPA audience/tokens (D-08).
