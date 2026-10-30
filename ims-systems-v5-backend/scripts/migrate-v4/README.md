# V4 → V5 core migrator

See [docs/migration/V4_V5_CORE_MIGRATION.md](../../../docs/migration/V4_V5_CORE_MIGRATION.md).

```bash
pnpm migrate:v4 --wave=0 --dry-run --tenant=my_tenant_db
pnpm migrate:v4 --wave=1-4 --tenant=my_tenant_db --report=./tmp/migrate-report.json
pnpm migrate:v4 --wave=3 --validate-only
pnpm migrate:v4 --wave=5
```
