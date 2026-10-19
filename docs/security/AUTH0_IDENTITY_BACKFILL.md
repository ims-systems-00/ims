# Auth0 identity backfill notes

**Status:** Documented in M2; **do not run a production backfill until M3+** (AuthN adapters) and infra owners are assigned.  
**Related:** [AUTH_ROLLOUT_TRACKER.md](./AUTH_ROLLOUT_TRACKER.md)

## What was added (M2)

| Mongo collection | Field | Meaning |
| --- | --- | --- |
| `users` | `auth0SubjectId` | Auth0 user `sub` (unique when set) |
| `organisations` | `auth0OrganizationId` | Auth0 Organization id `org_…` (unique when set) |

Both fields are optional (`null` / omitted). Partial unique indexes ignore unset values so existing stub/demo data keeps working.

**Canonical IMS ids stay Mongo ObjectIds:** `User.id` and `Organisation.id` / `organizationId`. Auth0 ids are links only.

## Repository helpers (already in code)

- `UserRepository.findByAuth0SubjectId(sub)`
- `UserRepository.linkAuth0SubjectId(userId, sub | null)`
- `OrganisationRepository.findByAuth0OrganizationId(org_…)`
- `OrganisationRepository.linkAuth0OrganizationId(organizationId, org_… | null)`

## When to backfill

Run (or script) linking **after**:

1. Auth0 tenant + Organizations are provisioned (infra owners).
2. Auth0 Organizations exist for each IMS org that should authenticate.
3. Auth0 users exist for each IMS user that should sign in (invite-only vs JIT still open — see tracker Senior approvals).

Suggested order:

1. For each IMS organisation → create/link Auth0 Organization → `linkAuth0OrganizationId`.
2. For each IMS user that should log in → create/link Auth0 user → `linkAuth0SubjectId`.
3. Ensure Auth0 org membership matches Mongo `OrganisationMembership` (token eligibility).
4. Only then flip `SECURITY_PROVIDER=auth0-openfga` in a non-prod environment (M3+).

## What not to do yet

- Do not require `auth0SubjectId` / `auth0OrganizationId` on create paths in M2.
- Do not delete password fields in M2 (provisioning decision still open).
- Do not assume seed:demo users are Auth0-linked.

## Verification queries (manual)

```js
// Users missing Auth0 link
db.users.countDocuments({
  deletedAt: null,
  $or: [{ auth0SubjectId: null }, { auth0SubjectId: { $exists: false } }],
});

// Orgs missing Auth0 link
db.organisations.countDocuments({
  $or: [
    { auth0OrganizationId: null },
    { auth0OrganizationId: { $exists: false } },
  ],
});
```
