# M5 — Organisation switch notes

**Related:** [AUTH_ROLLOUT_TRACKER.md](./AUTH_ROLLOUT_TRACKER.md)

## Behaviour

1. Navbar **Organisation switcher** lists `GET /organisations` (memberships).
2. On select (Auth0 mode):
   - Request a **fresh** access token with `authorizationParams.organization = auth0OrganizationId` (`cacheMode: "off"`).
   - **Only if** that succeeds, persist:
     - `ims-v5-active-org-id` (IMS ObjectId → `x-org-id`)
     - `ims-v5-active-auth0-org-id` (Auth0 `org_…` → next token requests)
   - Invalidate React Query caches.
3. Backend already rejects `x-org-id` that does not match the token-bound IMS org (M3).
4. Logout clears both storage keys.

## Stub mode

- Switch persists IMS id only (no Bearer token).
- Orgs without `auth0OrganizationId` remain switchable.

## Auth0 mode prerequisites

- Each IMS organisation must have `auth0OrganizationId` linked (M2).
- User must be a member of that Auth0 Organization (token eligibility).
- Orgs missing the Auth0 link appear disabled in the switcher.

## Silent refresh

- Auth0Provider uses `useRefreshTokens` + `cacheLocation="localstorage"`.
- Ongoing API calls use `getAccessTokenSilently` with the **active** Auth0 org id.
