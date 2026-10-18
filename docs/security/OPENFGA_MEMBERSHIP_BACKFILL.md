# OpenFGA membership tuple backfill (M7)

**Related:** [AUTH_ROLLOUT_TRACKER.md](./AUTH_ROLLOUT_TRACKER.md), [openfga/ROLE_PERMISSION_MATRIX.md](./openfga/ROLE_PERMISSION_MATRIX.md)

## Purpose

Project every Mongo `OrganisationMembership` into OpenFGA as:

`user:{imsUserId}` is `{roleRelation}` of `organization:{imsOrgId}`

Run this in **staging** before flipping AuthZ to enforce (or immediately after enabling `auth0-openfga` if memberships pre-exist).

## Prerequisites

1. OpenFGA store + authorization model written (see `docs/security/openfga/authorization-model.fga`).
2. Backend env: `SECURITY_PROVIDER=auth0-openfga`, `OPENFGA_API_URL`, `OPENFGA_STORE_ID`, `OPENFGA_MODEL_ID`, credentials.
3. IMS user ids in memberships are the same ids used as `SecurityIdentity.subjectId` (Auth0-linked users).

**Local Docker memory wipe** (after PC / `docker stop`): recreate store + model first — see [OPENFGA_LOCAL_DEV.md](./OPENFGA_LOCAL_DEV.md).

## Command

From `ims-systems-v5-backend`:

```bash
pnpm backfill:openfga-memberships
```

Idempotent: re-running writes the same tuples again.

## Staging verification

- [ ] Super Admin can `GET /organisations/current` and list users
- [ ] Basic member can read but not create users / delete risks
- [ ] User with no membership is denied org-scoped reads
- [ ] After changing a membership role in Mongo + projection path (or re-backfill), permissions match the matrix

## Rollback

- Set `SECURITY_PROVIDER=development-stub` only in non-prod, **or** redeploy prior artifact that used Hybrid permissive fallback (M6).
- OpenFGA tuples can remain; they are unused when the stub authorizer is active.
