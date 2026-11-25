import { createViewUrl } from "@/modules/files";
import { notify } from "@/shared/lib/toast";
import type { TrainingFileMeta } from "../types";

type FileIdMeta = Pick<TrainingFileMeta, "Bucket" | "Key" | "key" | "Name">;

/** Persist bucket + key in the `fileId` string field. */
export function encodeTrainingFileId(meta: FileIdMeta): string {
  const key = meta.Key || meta.key;
  return `${meta.Bucket}::${key}`;
}

export function decodeTrainingFileId(
  fileId: string | null | undefined
): { bucket: string; key: string } | null {
  if (!fileId?.trim()) return null;
  const idx = fileId.indexOf("::");
  if (idx <= 0) return null;
  const bucket = fileId.slice(0, idx);
  const key = fileId.slice(idx + 2);
  if (!bucket || !key) return null;
  return { bucket, key };
}

/** Open a stored training evidence file in a new tab. */
export async function openTrainingEvidence(
  fileId: string | null | undefined
): Promise<void> {
  const decoded = decodeTrainingFileId(fileId);
  if (!decoded) {
    notify.error("Evidence file reference is incomplete");
    return;
  }
  try {
    const view = await createViewUrl({
      bucket: decoded.bucket,
      key: decoded.key,
    });
    window.open(view.url, "_blank", "noopener,noreferrer");
  } catch (err) {
    notify.fromError(err, "Unable to open evidence file");
  }
}
