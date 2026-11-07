import { getTagAndCategoryModel } from "../../../src/modules/tags-and-categories/repositories/tag-and-category.model";
import type { MigrateContext, TenantHandle, WaveReport } from "../types";
import { emptyEntityStat } from "../report";
import { countCollection, iterateCollection } from "../v4-connection";
import { upsertById } from "../upsert";
import { asId } from "../transforms/common";
import { transformTag } from "../transforms/wave2-3";

export async function runWave2(
  tenant: TenantHandle,
  ctx: MigrateContext
): Promise<WaveReport> {
  const startedAt = new Date().toISOString();
  if (!tenant.organizationId) {
    return {
      wave: 2,
      tenantDb: tenant.dbName,
      organizationId: null,
      dryRun: ctx.dryRun,
      startedAt,
      finishedAt: new Date().toISOString(),
      entities: [],
      orphanFks: [],
      notes: ["Skipped Wave 2 — no organization"],
    };
  }

  const organizationId = tenant.organizationId;
  const model = getTagAndCategoryModel();
  const stat = emptyEntityStat("tagsAndCategories");
  stat.v4Count = await countCollection(tenant.connection, "tagsAndCategories");

  for await (const batch of iterateCollection(
    tenant.connection,
    "tagsAndCategories"
  )) {
    for (const raw of batch) {
      try {
        const doc = transformTag(raw, organizationId, ctx);
        await upsertById(model, doc, ctx.dryRun);
        stat.migrated += 1;
      } catch (error) {
        stat.failed += 1;
        stat.errors.push(
          `${asId(raw._id)}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  return {
    wave: 2,
    tenantDb: tenant.dbName,
    organizationId,
    dryRun: ctx.dryRun,
    startedAt,
    finishedAt: new Date().toISOString(),
    entities: [stat],
    orphanFks: [],
    notes: [
      "Attachment/blob storage keys are preserved as-is; rewrite via files module if buckets change.",
    ],
  };
}
