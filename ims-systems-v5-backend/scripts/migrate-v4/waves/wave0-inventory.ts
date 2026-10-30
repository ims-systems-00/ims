import type { MigrateContext, TenantHandle, WaveReport } from "../types";
import {
  CORE_COLLECTIONS_BY_WAVE,
  PARKED_COLLECTIONS,
} from "../module-type-map";
import { emptyEntityStat } from "../report";
import { countCollection } from "../v4-connection";

export async function runWave0(
  tenant: TenantHandle,
  ctx: MigrateContext
): Promise<WaveReport> {
  const startedAt = new Date().toISOString();
  const entities = [];
  const notes: string[] = [];

  const core = [
    ...CORE_COLLECTIONS_BY_WAVE[1],
    ...CORE_COLLECTIONS_BY_WAVE[2],
    ...CORE_COLLECTIONS_BY_WAVE[3],
    ...CORE_COLLECTIONS_BY_WAVE[4],
  ];

  for (const name of core) {
    const v4Count = await countCollection(tenant.connection, name);
    entities.push(emptyEntityStat(name, v4Count));
  }

  let parkedTotal = 0;
  for (const name of PARKED_COLLECTIONS) {
    const v4Count = await countCollection(tenant.connection, name);
    if (v4Count > 0) {
      parkedTotal += v4Count;
      entities.push({
        ...emptyEntityStat(`parked:${name}`, v4Count),
        skipped: v4Count,
      });
    }
  }

  notes.push(
    `Parked-domain documents in this tenant: ${parkedTotal} (not migrated)`
  );
  notes.push(
    "Run `pnpm seed:compliance-catalogues` before Wave 4 if the V5 catalogue is empty."
  );
  if (!tenant.organizationId) {
    notes.push("No organizations document found in this tenant DB.");
  }

  return {
    wave: 0,
    tenantDb: tenant.dbName,
    organizationId: tenant.organizationId,
    dryRun: ctx.dryRun,
    startedAt,
    finishedAt: new Date().toISOString(),
    entities,
    orphanFks: [],
    notes,
  };
}
