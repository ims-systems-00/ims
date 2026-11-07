import mongoose from "mongoose";
import type { EntityStat, MigrateContext, TenantHandle, WaveReport } from "../types";
import { emptyEntityStat } from "../report";
import {
  CORE_COLLECTIONS_BY_WAVE,
  PARKED_COLLECTIONS,
} from "../module-type-map";
import { countCollection, iterateCollection } from "../v4-connection";
import { asId, oid } from "../transforms/common";

const SKIP_ALWAYS = new Set([
  "system.indexes",
  "system.profile",
  "system.users",
  "system.version",
]);

const CORE_ALL = new Set(
  Object.values(CORE_COLLECTIONS_BY_WAVE).flatMap((c) => c)
);

/** Collections Wave 1–4 already cover under V5 model names. */
const CORE_V4_ALIASES = new Set([
  ...CORE_ALL,
  "organizations",
  "groups",
  "memberships",
  "grouppremises",
  "cips",
  "calenderevents",
  "tagsAndCategories",
  "controlevidence",
  "controlevidences",
  "compliancecontrols", // catalogue — seeded in V5, not archived as tenant data
  "users",
]);

function legacyCollectionName(v4Name: string): string {
  // Keep a stable, Mongo-safe prefix.
  const safe = v4Name.replace(/[^a-zA-Z0-9_]/g, "_");
  return `legacy_${safe}`;
}

function stringifyOrg(doc: Record<string, unknown>): string | null {
  return asId(doc.organization ?? doc.organizationId);
}

async function archiveCollection(
  tenant: TenantHandle,
  ctx: MigrateContext,
  v4Name: string
): Promise<EntityStat> {
  const targetName = legacyCollectionName(v4Name);
  const stat = emptyEntityStat(`${v4Name}→${targetName}`);
  stat.v4Count = await countCollection(tenant.connection, v4Name);
  if (stat.v4Count === 0) return stat;

  const target = mongoose.connection.db.collection(targetName);

  for await (const batch of iterateCollection(tenant.connection, v4Name)) {
    for (const raw of batch) {
      try {
        const id = asId(raw._id);
        if (!id) {
          stat.skipped += 1;
          continue;
        }
        const organizationId = stringifyOrg(raw);
        const doc = {
          ...raw,
          _id: oid(id),
          organizationId: organizationId ?? raw.organizationId ?? null,
          __v4Collection: v4Name,
          __v4TenantDb: tenant.dbName,
        };
        if (!ctx.dryRun) {
          await target.replaceOne({ _id: doc._id }, doc, { upsert: true });
        }
        stat.migrated += 1;
      } catch (error) {
        stat.failed += 1;
        if (stat.errors.length < 20) {
          stat.errors.push(
            `${asId(raw._id)}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    }
  }
  return stat;
}

/**
 * Wave 6 — raw archival copy of parked / non-core V4 collections into
 * `legacy_*` collections on the V5 database so no tenant document remains
 * only in V4 (UI for these domains may not exist yet).
 */
export async function runWave6(
  tenant: TenantHandle,
  ctx: MigrateContext
): Promise<WaveReport> {
  const startedAt = new Date().toISOString();
  const notes: string[] = [
    "Wave 6 archives parked/non-core collections as legacy_* (no V5 domain models).",
  ];

  const existing = await tenant.connection.db.listCollections().toArray();
  const names = existing
    .map((c) => c.name)
    .filter((n) => n && !SKIP_ALWAYS.has(n) && !n.startsWith("system."));

  const parkedSet = new Set<string>(PARKED_COLLECTIONS as readonly string[]);
  const toArchive = names.filter((n) => {
    if (CORE_V4_ALIASES.has(n)) return false;
    if (parkedSet.has(n)) return true;
    // Any leftover tenant collection not covered by core waves.
    return true;
  });

  notes.push(
    `Candidate archive collections (${toArchive.length}): ${toArchive.slice(0, 30).join(", ")}${toArchive.length > 30 ? "…" : ""}`
  );

  const entities: EntityStat[] = [];
  for (const name of toArchive) {
    console.log(`  Wave 6 archive: ${name} → ${legacyCollectionName(name)}…`);
    const stat = await archiveCollection(tenant, ctx, name);
    entities.push(stat);
    if (stat.v4Count > 0) {
      notes.push(
        `checkpoint ${name}: v4=${stat.v4Count} archived=${stat.migrated} failed=${stat.failed}`
      );
    }
  }

  // Explicit zero-count coverage for declared parked list (inventory completeness).
  for (const parked of PARKED_COLLECTIONS) {
    if (!toArchive.includes(parked)) {
      const n = await countCollection(tenant.connection, parked);
      if (n > 0) {
        notes.push(
          `WARNING: parked collection ${parked} has ${n} docs but was not archived`
        );
      }
    }
  }

  return {
    wave: 6,
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

export { legacyCollectionName };
