import type { Model } from "mongoose";
import type { UpsertResult } from "./types";
import { oid } from "./transforms/common";

/**
 * Carry the V4 document's own createdAt/updatedAt onto the mapped V5 doc when
 * the transform did not set them, so Mongoose timestamps don't restamp every
 * migrated record with the migration time. Returns the mapped doc.
 */
export function withSourceTimestamps<T extends Record<string, unknown> | null>(
  mapped: T,
  raw: Record<string, unknown>
): T {
  if (!mapped) return mapped;
  const m = mapped as Record<string, unknown>;
  if (m.createdAt == null && raw.createdAt instanceof Date) {
    m.createdAt = raw.createdAt;
  }
  if (m.updatedAt == null) {
    if (raw.updatedAt instanceof Date) m.updatedAt = raw.updatedAt;
    else if (m.createdAt instanceof Date) m.updatedAt = m.createdAt;
  }
  return mapped;
}

/** Let Mongoose stamp timestamps only when the doc carries none of its own. */
function hasOwnTimestamps(doc: Record<string, unknown>): boolean {
  return doc.createdAt != null;
}

/**
 * Upsert a document preserving `_id`. Uses replaceOne with upsert so
 * re-runs are idempotent.
 */
export async function upsertById(
  model: Model<any>,
  doc: Record<string, unknown>,
  dryRun: boolean
): Promise<UpsertResult> {
  const id = doc._id;
  if (!id) {
    throw new Error(`Document for ${model.modelName} missing _id`);
  }

  if (dryRun) return "dry-run";

  const _id = typeof id === "string" ? oid(id) : id;
  const { _id: _omit, ...rest } = doc;
  const result = await model.replaceOne(
    { _id },
    { _id, ...rest },
    { upsert: true, timestamps: !hasOwnTimestamps(doc) }
  );

  if (result.upsertedCount && result.upsertedCount > 0) return "inserted";
  return "updated";
}

export type BulkUpsertResult = {
  migrated: number;
  failed: number;
  errors: string[];
  /** Target already had a newer (V5-edited) version; left as is. */
  kept?: number;
};

/**
 * Fields a migration must never clear once V5 has set them (login links).
 * If the target has a value and the migrated doc doesn't, the target's wins.
 */
const PRESERVE_IF_SET = ["auth0SubjectId", "auth0OrganizationId"] as const;

type TargetMeta = {
  _id: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  auth0SubjectId?: unknown;
  auth0OrganizationId?: unknown;
};

/**
 * Decide, per doc, whether the migrated version may replace what is already
 * in the V5 target:
 * - not in target → write
 * - target updated after the V4 doc was last changed (edited in V5) → keep
 *   target; only repair a createdAt that a previous migration restamped
 * - otherwise → write, carrying over Auth0 links the target already has
 */
async function reconcileWithTarget(
  model: Model<any>,
  docs: Record<string, unknown>[]
): Promise<{
  toWrite: Record<string, unknown>[];
  fixCreatedAt: { _id: unknown; createdAt: Date }[];
  kept: number;
}> {
  const ids = docs.map((d) => (typeof d._id === "string" ? oid(d._id) : d._id));
  const targets = (await model.collection
    .find(
      { _id: { $in: ids as any[] } },
      {
        projection: {
          createdAt: 1,
          updatedAt: 1,
          auth0SubjectId: 1,
          auth0OrganizationId: 1,
        },
      }
    )
    .toArray()) as TargetMeta[];
  const byId = new Map(targets.map((t) => [String(t._id), t]));

  const toWrite: Record<string, unknown>[] = [];
  const fixCreatedAt: { _id: unknown; createdAt: Date }[] = [];
  let kept = 0;

  for (const doc of docs) {
    const target = byId.get(String(doc._id));
    if (!target) {
      toWrite.push(doc);
      continue;
    }
    const targetNewer =
      target.updatedAt instanceof Date &&
      doc.updatedAt instanceof Date &&
      target.updatedAt.getTime() > doc.updatedAt.getTime();
    if (targetNewer) {
      kept += 1;
      if (
        doc.createdAt instanceof Date &&
        target.createdAt instanceof Date &&
        target.createdAt.getTime() > doc.createdAt.getTime()
      ) {
        fixCreatedAt.push({
          _id: typeof doc._id === "string" ? oid(doc._id) : doc._id,
          createdAt: doc.createdAt,
        });
      }
      continue;
    }
    for (const field of PRESERVE_IF_SET) {
      if (target[field] != null && target[field] !== "" && doc[field] == null) {
        doc[field] = target[field];
      }
    }
    toWrite.push(doc);
  }
  return { toWrite, fixCreatedAt, kept };
}

/**
 * Same semantics as calling `upsertById` per doc (replaceOne + upsert by
 * `_id`, schema casting + timestamps, no validators) but one round trip per
 * batch. If the batch write fails, it falls back to per-doc writes so the
 * failure counts and error messages stay exact.
 */
export async function bulkUpsertById(
  model: Model<any>,
  docs: Record<string, unknown>[],
  dryRun: boolean
): Promise<BulkUpsertResult> {
  const result: BulkUpsertResult = { migrated: 0, failed: 0, errors: [], kept: 0 };
  const ops: Record<string, unknown>[] = [];
  const opDocs: Record<string, unknown>[] = [];

  const withIds: Record<string, unknown>[] = [];
  for (const doc of docs) {
    if (!doc._id) {
      result.failed += 1;
      result.errors.push(`?: Document for ${model.modelName} missing _id`);
      continue;
    }
    withIds.push(doc);
  }
  if (withIds.length === 0) return result;
  if (dryRun) {
    result.migrated += withIds.length;
    return result;
  }

  const plan = await reconcileWithTarget(model, withIds);
  result.kept = plan.kept;
  if (plan.fixCreatedAt.length > 0) {
    await model.collection.bulkWrite(
      plan.fixCreatedAt.map((f) => ({
        updateOne: {
          filter: { _id: f._id as any },
          update: { $set: { createdAt: f.createdAt } },
        },
      })),
      { ordered: false }
    );
  }

  for (const doc of plan.toWrite) {
    const id = doc._id;
    const _id = typeof id === "string" ? oid(id) : id;
    const { _id: _omit, ...rest } = doc;
    ops.push({
      replaceOne: {
        filter: { _id },
        replacement: { _id, ...rest },
        upsert: true,
        timestamps: !hasOwnTimestamps(doc),
      },
    });
    opDocs.push(doc);
  }

  if (ops.length === 0) return result;

  try {
    await model.bulkWrite(ops as any, { ordered: false, skipValidation: true });
    result.migrated += ops.length;
  } catch {
    for (const doc of opDocs) {
      try {
        await upsertById(model, doc, false);
        result.migrated += 1;
      } catch (error) {
        result.failed += 1;
        result.errors.push(
          `${String(doc._id)}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }
  return result;
}

/** Raw-collection variant (no Mongoose model), used by the legacy archive. */
export async function bulkReplaceRaw(
  collection: {
    bulkWrite: (ops: any[], opts: { ordered: boolean }) => Promise<unknown>;
    replaceOne: (f: any, d: any, o: { upsert: boolean }) => Promise<unknown>;
  },
  docs: Record<string, unknown>[],
  dryRun: boolean
): Promise<BulkUpsertResult> {
  const result: BulkUpsertResult = { migrated: 0, failed: 0, errors: [] };
  if (docs.length === 0) return result;
  if (dryRun) {
    result.migrated = docs.length;
    return result;
  }
  const ops = docs.map((doc) => ({
    replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
  }));
  try {
    await collection.bulkWrite(ops, { ordered: false });
    result.migrated = docs.length;
  } catch {
    for (const doc of docs) {
      try {
        await collection.replaceOne({ _id: doc._id }, doc, { upsert: true });
        result.migrated += 1;
      } catch (error) {
        result.failed += 1;
        result.errors.push(
          `${String(doc._id)}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }
  return result;
}

/**
 * Collects docs and writes them via `bulkUpsertById` in batches. Callers that
 * count `migrated` per `add()` call `settle()` at the end to correct the stat
 * for docs that were kept (newer in V5) or failed.
 */
export function createBufferedWriter(
  model: Model<any>,
  dryRun: boolean,
  batchSize = 500
) {
  let buffer: Record<string, unknown>[] = [];
  let added = 0;
  const total: Required<BulkUpsertResult> = {
    migrated: 0,
    failed: 0,
    errors: [],
    kept: 0,
  };

  async function flush(): Promise<void> {
    if (buffer.length === 0) return;
    const batch = buffer;
    buffer = [];
    const r = await bulkUpsertById(model, batch, dryRun);
    total.migrated += r.migrated;
    total.failed += r.failed;
    total.kept += r.kept ?? 0;
    total.errors.push(...r.errors);
  }

  return {
    async add(doc: Record<string, unknown>): Promise<void> {
      buffer.push(doc);
      added += 1;
      if (buffer.length >= batchSize) await flush();
    },
    /** Flush and fold results into a stat that counted one `migrated` per add. */
    async settle(stat: {
      migrated: number;
      skipped: number;
      failed: number;
      errors: string[];
    }): Promise<void> {
      await flush();
      stat.migrated += total.migrated - added;
      stat.skipped += total.kept;
      stat.failed += total.failed;
      for (const e of total.errors) {
        if (stat.errors.length >= 50) break;
        stat.errors.push(e);
      }
    },
  };
}

/** Fold a bulk result into an EntityStat-like counter, capping stored errors. */
export function applyBulkResult(
  stat: { migrated: number; skipped: number; failed: number; errors: string[] },
  r: BulkUpsertResult,
  maxErrors = 50
): void {
  stat.migrated += r.migrated;
  stat.skipped += r.kept ?? 0;
  stat.failed += r.failed;
  for (const e of r.errors) {
    if (stat.errors.length >= maxErrors) break;
    stat.errors.push(e);
  }
}

export async function upsertMany(
  model: Model<any>,
  docs: Record<string, unknown>[],
  dryRun: boolean
): Promise<{ migrated: number; failed: number; errors: string[] }> {
  let migrated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const doc of docs) {
    try {
      await upsertById(model, doc, dryRun);
      migrated += 1;
    } catch (error) {
      failed += 1;
      const id = String(doc._id ?? "?");
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${model.modelName}:${id}: ${message}`);
    }
  }

  return { migrated, failed, errors };
}
