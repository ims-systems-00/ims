import type { DocumentFileMeta } from "../types";

function extensionOf(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? fileName;
  const idx = base.lastIndexOf(".");
  if (idx <= 0 || idx === base.length - 1) return "";
  return base.slice(idx + 1);
}

/**
 * Prefer a real storage object name (with extension) over a human display
 * label. Display labels like "Acme — ISO certificate" break PDF preview
 * (wrong kind detection + unsafe Content-Disposition on signed URLs).
 */
export function ensureStorageFileName(
  meta: {
    Name?: string | null;
    Key?: string | null;
    key?: string | null;
    Bucket?: string | null;
    Size?: number | null;
  } | null | undefined
): DocumentFileMeta | null {
  if (!meta?.Bucket) return null;
  const Key = (meta.Key || meta.key || "").trim();
  if (!Key) return null;
  const keyBase = Key.split(/[\\/]/).pop() || Key;
  const keyExt = extensionOf(keyBase);
  const rawName = (meta.Name || "").trim();
  const nameExt = extensionOf(rawName);
  const looksLikeDisplayLabel =
    !rawName ||
    !nameExt ||
    / — /.test(rawName) ||
    /^(.+\s[—–-]\s.+)$/u.test(rawName);

  const Name =
    looksLikeDisplayLabel && keyExt
      ? keyBase
      : rawName || keyBase;

  return {
    Name,
    Key,
    key: Key,
    Bucket: meta.Bucket.trim(),
    ...(typeof meta.Size === "number" && meta.Size >= 0
      ? { Size: meta.Size }
      : {}),
  };
}

/** Decode `bucket::key` file ids used by training/inventory (and similar). */
export function storageInfoFromFileId(
  fileId: string | null | undefined,
  fileName?: string | null
): DocumentFileMeta | null {
  if (!fileId?.trim()) return null;
  const idx = fileId.indexOf("::");
  if (idx <= 0) return null;
  const Bucket = fileId.slice(0, idx).trim();
  const Key = fileId.slice(idx + 2).trim();
  if (!Bucket || !Key) return null;
  return ensureStorageFileName({
    Name: fileName?.trim() || null,
    Key,
    key: Key,
    Bucket,
  });
}

export function storageInfoFromMeta(meta: {
  Name?: string | null;
  Key?: string | null;
  key?: string | null;
  Bucket?: string | null;
  Size?: number | null;
} | null | undefined): DocumentFileMeta | null {
  return ensureStorageFileName(meta);
}
