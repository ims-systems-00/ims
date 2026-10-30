import { getComplianceControlModel } from "../../../src/modules/compliance/repositories/compliance-control.model";
import { getControlStatusModel } from "../../../src/modules/compliance/repositories/control-status.model";
import { getControlEvidenceModel } from "../../../src/modules/compliance/repositories/control-evidence.model";
import { getComplianceOverviewModel } from "../../../src/modules/compliance/repositories/compliance-overview.model";
import type { EntityStat, MigrateContext, TenantHandle, WaveReport } from "../types";
import { emptyEntityStat } from "../report";
import { countCollection, iterateCollection } from "../v4-connection";
import { upsertById } from "../upsert";
import { asId } from "../transforms/common";
import {
  naturalKey,
  transformComplianceOverview,
  transformControlEvidence,
  transformControlStatus,
} from "../transforms/wave4";
import { attachValidation } from "../validation";

async function loadCatalogueMap(ctx: MigrateContext): Promise<number> {
  if (ctx.complianceNaturalKeyToId.size > 0) {
    return ctx.complianceNaturalKeyToId.size;
  }
  const model = getComplianceControlModel();
  const rows = await model.find({}).select({ name: 1, clause: 1 }).lean();
  for (const row of rows) {
    const id = asId(row._id);
    if (!id) continue;
    ctx.complianceNaturalKeyToId.set(
      naturalKey(String(row.name), String(row.clause)),
      id
    );
  }
  return ctx.complianceNaturalKeyToId.size;
}

async function migrateSimple(
  tenant: TenantHandle,
  ctx: MigrateContext,
  organizationId: string,
  v4Name: string,
  modelFactory: () => { replaceOne: Function; modelName?: string } & object,
  transform: (
    doc: Record<string, unknown>,
    organizationId: string,
    ctx: MigrateContext
  ) => Record<string, unknown>
): Promise<EntityStat> {
  const stat = emptyEntityStat(v4Name);
  stat.v4Count = await countCollection(tenant.connection, v4Name);
  const model = modelFactory() as any;

  for await (const batch of iterateCollection(tenant.connection, v4Name)) {
    for (const raw of batch) {
      try {
        const mapped = transform(raw, organizationId, ctx);
        await upsertById(model, mapped, ctx.dryRun);
        stat.migrated += 1;
      } catch (error) {
        stat.failed += 1;
        stat.errors.push(
          `${asId(raw._id)}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }
  return stat;
}

export async function runWave4(
  tenant: TenantHandle,
  ctx: MigrateContext
): Promise<WaveReport> {
  const startedAt = new Date().toISOString();
  const notes: string[] = [];

  if (!tenant.organizationId) {
    return {
      wave: 4,
      tenantDb: tenant.dbName,
      organizationId: null,
      dryRun: ctx.dryRun,
      startedAt,
      finishedAt: new Date().toISOString(),
      entities: [],
      orphanFks: [],
      notes: ["Skipped Wave 4 — no organization"],
    };
  }

  const catalogueSize = await loadCatalogueMap(ctx);
  if (catalogueSize === 0) {
    notes.push(
      "WARNING: V5 compliance catalogue is empty. Run `pnpm seed:compliance-catalogues` then re-run Wave 4 so controlId remaps by toolkit|clause."
    );
  } else {
    notes.push(`Loaded ${catalogueSize} catalogue natural keys for controlId remap.`);
  }

  const organizationId = tenant.organizationId;
  const entities: EntityStat[] = [];

  entities.push(
    await migrateSimple(
      tenant,
      ctx,
      organizationId,
      "controlstatuses",
      getControlStatusModel,
      transformControlStatus
    )
  );

  entities.push(
    await migrateSimple(
      tenant,
      ctx,
      organizationId,
      "controlevidence",
      getControlEvidenceModel,
      transformControlEvidence
    )
  );

  entities.push(
    await migrateSimple(
      tenant,
      ctx,
      organizationId,
      "complianceoverviews",
      getComplianceOverviewModel,
      (doc, orgId) => transformComplianceOverview(doc, orgId)
    )
  );

  notes.push("ComplianceAutomationRun skipped (V5-native; leave empty).");

  const report: WaveReport = {
    wave: 4,
    tenantDb: tenant.dbName,
    organizationId,
    dryRun: ctx.dryRun,
    startedAt,
    finishedAt: new Date().toISOString(),
    entities,
    orphanFks: [],
    notes,
  };

  if (!ctx.dryRun) {
    await attachValidation(report, 4);
  }

  return report;
}
