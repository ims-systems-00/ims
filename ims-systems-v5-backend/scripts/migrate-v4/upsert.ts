import type { Model } from "mongoose";
import type { UpsertResult } from "./types";
import { oid } from "./transforms/common";

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
    { upsert: true }
  );

  if (result.upsertedCount && result.upsertedCount > 0) return "inserted";
  return "updated";
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
