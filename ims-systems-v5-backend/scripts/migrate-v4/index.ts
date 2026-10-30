/**
 * V4 → V5 core domain migrator.
 *
 * Usage (from ims-systems-v5-backend):
 *   pnpm migrate:v4 --wave=0 --dry-run
 *   pnpm migrate:v4 --wave=1-4 --tenant=my_tenant_db
 *   pnpm migrate:v4 --wave=3 --validate-only
 *   pnpm migrate:v4 --wave=5
 *
 * Env:
 *   MONGODB_URI       V5 target
 *   V4_MONGO_URI      V4 cluster URI without DB name
 *   V4_ADMIN_DB       admin DB (default ims_admin)
 *   V4_TENANT_DBS     optional comma-separated tenant DB names
 *   MIGRATE_DRY_RUN   true|1 forces dry-run
 *
 * Docs: docs/migration/V4_V5_CORE_MIGRATION.md
 */

import mongoose from "mongoose";
import { loadConfig } from "../../src/config";
import { createLogger } from "../../src/infrastructure/logging/logger";
import { createMongoConnection } from "../../src/infrastructure/mongodb/connection";
import { loadMigrateEnv, parseCliArgs, wavesToRun } from "./config";
import type { MigrateContext, WaveReport } from "./types";
import { printWaveReport, writeReports } from "./report";
import {
  discoverTenantDbNames,
  disconnectV4,
  openTenant,
} from "./v4-connection";
import { runWave0 } from "./waves/wave0-inventory";
import { runWave1 } from "./waves/wave1-spine";
import { runWave2 } from "./waves/wave2-shared";
import { runWave3 } from "./waves/wave3-operational";
import { runWave4 } from "./waves/wave4-compliance";
import { runWave5 } from "./waves/wave5-authz";
import { attachValidation } from "./validation";

async function runWaveForTenant(
  wave: number,
  tenant: Awaited<ReturnType<typeof openTenant>>,
  ctx: MigrateContext
): Promise<WaveReport> {
  if (ctx.validateOnly && wave >= 1 && wave <= 4) {
    const report: WaveReport = {
      wave,
      tenantDb: tenant.dbName,
      organizationId: tenant.organizationId,
      dryRun: true,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      entities: [],
      orphanFks: [],
      notes: [`Validate-only for wave ${wave}`],
    };
    await attachValidation(report, wave);
    report.finishedAt = new Date().toISOString();
    return report;
  }

  switch (wave) {
    case 0:
      return runWave0(tenant, ctx);
    case 1:
      return runWave1(tenant, ctx);
    case 2:
      return runWave2(tenant, ctx);
    case 3:
      return runWave3(tenant, ctx);
    case 4:
      return runWave4(tenant, ctx);
    case 5:
      return runWave5(tenant, ctx);
    default:
      throw new Error(`Unknown wave ${wave}`);
  }
}

async function main(): Promise<void> {
  const cli = parseCliArgs(process.argv.slice(2));
  const env = loadMigrateEnv();
  // Ensure V5 env validates (LOG_LEVEL etc.) when present.
  try {
    loadConfig();
  } catch {
    // migrate scripts may run with a minimal env; MONGODB_URI already checked.
  }

  const logger = createLogger({ level: process.env.LOG_LEVEL ?? "info" });
  const waves = wavesToRun(cli.wave);

  const ctx: MigrateContext = {
    dryRun: cli.dryRun,
    validateOnly: cli.validateOnly,
    v4UriBase: env.v4UriBase,
    v5Uri: env.v5Uri,
    adminDbName: env.adminDbName,
    emailToUserId: new Map(),
    userIdRemap: new Map(),
    complianceNaturalKeyToId: new Map(),
    reports: [],
  };

  console.log(
    `V4→V5 migrator · waves=${waves.join(",")} · dryRun=${ctx.dryRun} · validateOnly=${ctx.validateOnly}`
  );
  console.log(`V5 target: ${env.v5Uri}`);
  console.log(`V4 base:   ${env.v4UriBase}`);

  const needsV5Write = waves.some((w) => w >= 1) && !cli.validateOnly;
  const needsV5Read =
    waves.some((w) => w >= 1) || cli.validateOnly || waves.includes(5);

  const mongo = createMongoConnection({ uri: env.v5Uri, logger });
  if (needsV5Read || needsV5Write) {
    await mongo.connect();
  }

  try {
    const tenantNames = await discoverTenantDbNames(
      env.v4UriBase,
      env.adminDbName,
      cli.tenantDbs
    );

    if (tenantNames.length === 0) {
      throw new Error(
        "No tenant DBs discovered. Pass --tenant=dbName or V4_TENANT_DBS."
      );
    }

    console.log(`Tenants: ${tenantNames.join(", ")}`);

    for (const dbName of tenantNames) {
      console.log(`\n--- Tenant DB: ${dbName} ---`);
      const tenant = await openTenant(env.v4UriBase, dbName);
      try {
        for (const wave of waves) {
          // Wave 5 is global (Auth0/OpenFGA); run once after last tenant for Mongo waves
          if (wave === 5 && dbName !== tenantNames[tenantNames.length - 1]) {
            continue;
          }
          const report = await runWaveForTenant(wave, tenant, ctx);
          ctx.reports.push(report);
          printWaveReport(report);
        }
      } finally {
        await disconnectV4(tenant.connection);
      }
    }

    await writeReports(ctx.reports, cli.reportPath);

    const failed = ctx.reports.reduce(
      (sum, r) => sum + r.entities.reduce((s, e) => s + e.failed, 0),
      0
    );
    if (failed > 0) {
      console.error(`\nMigration finished with ${failed} failed document(s).`);
      process.exitCode = 1;
    } else {
      console.log("\nMigration finished successfully.");
    }
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongo.disconnect();
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
  void mongoose.disconnect();
});
