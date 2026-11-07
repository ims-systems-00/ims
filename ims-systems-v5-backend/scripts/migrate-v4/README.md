# V4 → V5 core migrator

See [docs/migration/V4_V5_CORE_MIGRATION.md](../../../docs/migration/V4_V5_CORE_MIGRATION.md).

```bash
pnpm migrate:v4 --wave=0 --dry-run --tenant=my_tenant_db
pnpm seed:compliance-catalogues
pnpm migrate:v4 --wave=1-4 --tenant=my_tenant_db --report=./tmp/migrate-report.json
pnpm migrate:v4 --wave=3 --validate-only --tenant=my_tenant_db
pnpm migrate:v4 --wave=5
pnpm migrate:v4 --wave=6 --tenant=my_tenant_db   # legacy_* archive of parked collections
```

## Shared multi-org tenant DBs

Wave 1 resolves `organizationId` from each document’s `organization` field
(not `openTenant`’s first org). Re-running Wave 1 **repairs** mis-stamped
functional units / memberships via upsert-by-`_id`.

## Waves

| Wave | Purpose |
|------|---------|
| 0 | Inventory |
| 1 | Identity spine (per-doc org) |
| 2 | Tags |
| 3 | Operational (resumable; includes documents) |
| 4 | Compliance (joins V4 `compliancecontrols` for clause; reads `controlevidences`) |
| 5 | Auth0 / OpenFGA runbook |
| 6 | Parked/non-core → `legacy_*` collections |

Env: `MONGODB_URI`, `V4_MONGO_URI`, optional `V4_TENANT_DBS` / `--tenant=`.
