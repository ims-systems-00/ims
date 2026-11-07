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

/** Load V4 compliancecontrols so controlstatuses (which lack clause) can join. */
async function loadV4ControlMeta(
  tenant: TenantHandle,
  ctx: MigrateContext
): Promise<number> {
  ctx.v4ControlMeta.clear();
  for await (const batch of iterateCollection(
    tenant.connection,
    "compliancecontrols"
  )) {
    for (const raw of batch) {
      const id = asId(raw._id);
      if (!id) continue;
      ctx.v4ControlMeta.set(id, {
        name: String(raw.name ?? ""),
        clause: String(raw.clause ?? ""),
        title: String(raw.title ?? raw.clause ?? ""),
        description: String(raw.description ?? ""),
        annex: String(raw.annex ?? ""),
        note: String(raw.note ?? ""),
        isLocked: Boolean(raw.isLocked),
        parentClause: raw.parentClause ? String(raw.parentClause) : null,
        childrenClauses: Array.isArray(raw.childrenClauses)
          ? raw.childrenClauses.map(String)
          : [],
        moreInfo: raw.moreInfo ?? null,
      });
    }
  }
  return ctx.v4ControlMeta.size;
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
        if (stat.errors.length < 50) {
          stat.errors.push(
            `${asId(raw._id)}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
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

  const organizationId = tenant.organizationId ?? "";
  const catalogueSize = await loadCatalogueMap(ctx);
  if (catalogueSize === 0) {
    notes.push(
      "WARNING: V5 compliance catalogue is empty. Run `pnpm seed:compliance-catalogues` then re-run Wave 4 so controlId remaps by toolkit|clause."
    );
  } else {
    notes.push(
      `Loaded ${catalogueSize} catalogue natural keys for controlId remap.`
    );
  }

  const v4Controls = await loadV4ControlMeta(tenant, ctx);
  notes.push(
    `Loaded ${v4Controls} V4 compliancecontrols for clause/title join on controlstatuses.`
  );

  const entities: EntityStat[] = [];

  console.log("  Wave 4 job: controlstatuses…");
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

  // V4 collection is plural `controlevidences` (not `controlevidence`).
  console.log("  Wave 4 job: controlevidences…");
  entities.push(
    await migrateSimple(
      tenant,
      ctx,
      organizationId,
      "controlevidences",
      getControlEvidenceModel,
      transformControlEvidence
    )
  );

  console.log("  Wave 4 job: complianceoverviews…");
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
  for (const e of entities) {
    notes.push(
      `checkpoint ${e.collection}: v4=${e.v4Count} migrated=${e.migrated} failed=${e.failed}`
    );
  }

  const report: WaveReport = {
    wave: 4,
    tenantDb: tenant.dbName,
    organizationId: tenant.organizationId,
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
