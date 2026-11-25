import type { FileMetaInfo } from "@/modules/files/types";

/** Persist bucket + key in the existing `fileId` string field. */
export function encodeInventoryFileId(meta: FileMetaInfo): string {
  const key = meta.Key || meta.key;
  return `${meta.Bucket}::${key}`;
}

export function decodeInventoryFileId(
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
