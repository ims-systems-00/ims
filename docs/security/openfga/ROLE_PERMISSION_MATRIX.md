# OpenFGA role → permission matrix (M7)

**Status:** Applied for org-level AuthZ across modules (tracker M7).  
**Scope:** All module `resourceType` values check relations on `organization:{imsOrgId}`.

## Role → OpenFGA relation on `organization:{imsOrgId}`

| IMS `OrganisationMembership.role` | OpenFGA relation |
| --- | --- |
| Super Admin | `super_admin` |
| Head of Service | `head_of_service` |
| Basic | `basic` |
| Auditor | `auditor` |

Tuple shape: `user:{imsUserId}` is `{relation}` of `organization:{imsOrgId}`.

## Action → relation (all modules, org-scoped)

| `authorizer.allow` action | OpenFGA relation checked | Notes |
| --- | --- | --- |
| `read` | `can_read` | Requires `organizationId` |
| `create` | `can_create` | Requires `organizationId` (except organisation bootstrap) |
| `update` | `can_update` | Requires `organizationId` |
| `delete` | `can_delete` | Requires `organizationId` |
| `manage` | `can_manage` | Requires `organizationId` |
| organisation `create` / `read` without org id | _(authenticated allow)_ | Bootstrap / `listMine`; Mongo still scopes results |

## Implied permissions by role

| Role | can_read | can_create | can_update | can_delete | can_manage |
| --- | --- | --- | --- | --- | --- |
| Super Admin | yes | yes | yes | yes | yes |
| Head of Service | yes | yes | yes | no | no |
| Basic | yes | no | no | no | no |
| Auditor | yes | no | no | no | no |

Object-level tuples remain deferred (working agreement M0).
