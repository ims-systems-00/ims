# Auth0 identity backfill

**Purpose:** Give every migrated Mongo member an Auth0 user + Auth0 org membership + `auth0SubjectId` / `auth0OrganizationId`, then project roles into OpenFGA — same scripted path locally and in prod.

**Full cutover order (migrate → Auth0 → OpenFGA → users):** [V4_TO_V5_USER_CUTOVER.md](../migration/V4_TO_V5_USER_CUTOVER.md)

**Related:** [AUTH_ROLLOUT_TRACKER.md](./AUTH_ROLLOUT_TRACKER.md), [OPENFGA_LOCAL_DEV.md](./OPENFGA_LOCAL_DEV.md)

## What gets linked

| Mongo collection | Field | Meaning |
| --- | --- | --- |
| `users` | `auth0SubjectId` | Auth0 user `sub` (unique when set) |
| `organisations` | `auth0OrganizationId` | Auth0 Organization id `org_…` (unique when set) |

Canonical IMS ids stay Mongo ObjectIds. Auth0 ids are links only.

## Prerequisites

1. `SECURITY_PROVIDER=auth0-openfga` (for the OpenFGA step).
2. Env pointed at the target Mongo + Auth0 tenant + OpenFGA store.
3. M2M app (`AUTH0_MGMT_CLIENT_ID` / `AUTH0_MGMT_CLIENT_SECRET`) authorized for Management API with scopes:
   - `read:users`, `create:users`, `update:users`
   - `read:organizations`, `create:organizations`, `update:organizations`
   - `create:organization_members`, `create:organization_connections`
   - `read:connections`
4. `AUTH0_DB_CONNECTION` (default `Username-Password-Authentication`).
5. `AUTH0_SPA_CLIENT_ID` (or `AUTH0_ROPG_CLIENT_ID`) so change-password emails use the login client.

Password hashes from V4 are **not** migrated. Users set a password via Auth0 `change_password` email (same as forgot-password).

## Commands (local = prod path)

From `ims-systems-v5-backend` with the correct `.env` loaded:

```bash
# Local / staging pilot (Blue Manufacturing)
pnpm backfill:auth0-identities --organization-id=65cdfa93b05b1d6e6f4a392c --dry-run
pnpm backfill:auth0-identities --organization-id=65cdfa93b05b1d6e6f4a392c
pnpm backfill:openfga-memberships

# Prod (after env points at prod Mongo + Auth0 + OpenFGA)
pnpm backfill:auth0-identities --all --dry-run
pnpm backfill:auth0-identities --all
pnpm backfill:openfga-memberships
```

### Flags

| Flag | Meaning |
| --- | --- |
| `--organization-id=<id>` | One Mongo organisation (required unless `--all`) |
| `--all` | Every org that has memberships |
| `--dry-run` | Print actions; no Auth0/Mongo writes; emails off |
| `--send-reset-email` | Send change_password (default **on** for real runs) |
| `--no-send-reset-email` | Skip emails |
| `--force-reset` | Email even when the Auth0 user already existed / was linked |
| `--skip-org-provision` | Fail if org has no `auth0OrganizationId` instead of creating one |

Idempotent: already-linked users are skipped for create/link; existing Auth0 users are reused by email; Auth0 org membership is re-ensured.

## Per-org algorithm

1. Load organisation + memberships + users.
2. Ensure Auth0 Organization (create by slug/name if missing) → `linkAuth0OrganizationId`.
3. Ensure DB connection enabled on that Auth0 org.
4. For each member with email:
   - If `auth0SubjectId` set → ensure Auth0 org membership only.
   - Else `ensureUserByEmail` → `linkAuth0SubjectId` → `addOrganizationMembers`.
   - Optionally send `change_password` email (new/reused unlinked users; or `--force-reset`).
5. Print summary: linked / created / emailed / failed.

Then run `pnpm backfill:openfga-memberships` so Mongo roles become OpenFGA tuples.

## Repository helpers

- `UserRepository.findByAuth0SubjectId(sub)` / `linkAuth0SubjectId`
- `OrganisationRepository.findByAuth0OrganizationId` / `linkAuth0OrganizationId`
- Management API: `getUserByEmail`, `createUser`, `ensureUserByEmail`, `sendChangePasswordEmail`

## Verification

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

Pilot smoke: one newly linked member opens the reset email, sets a password, and signs in with that org selected.

## Troubleshooting

- **HTTP 403** from Management API → grant missing M2M scopes on the Auth0 application.
- **Connection not found** → create/enable `AUTH0_DB_CONNECTION` in the tenant and on the Auth0 Organization.
- **Emails not arriving** → check Auth0 email provider / spam; confirm `AUTH0_SPA_CLIENT_ID` is the Universal Login client.
