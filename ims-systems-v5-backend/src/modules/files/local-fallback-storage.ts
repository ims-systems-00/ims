import {
  LocalObjectStorageAdapter,
} from "./local-object-storage";
import type { ObjectStoragePort } from "./ports";

/** Default V4 per-org private bucket suffix used by migrated documents. */
export const DEFAULT_LEGACY_BUCKET_SUFFIXES = [
  "-ims-static-resources-bucket",
] as const;

export function isLegacyV4Bucket(
  bucket: string,
  organizationId: string,
  suffixes: readonly string[] = DEFAULT_LEGACY_BUCKET_SUFFIXES
): boolean {
  for (const suffix of suffixes) {
    const trimmed = suffix.trim();
    if (!trimmed) continue;
    if (bucket === `${organizationId}${trimmed}`) return true;
  }
  // Also accept any org-scoped bucket ending with a known legacy suffix
  // when the caller already passed org-scoped metadata.
  return suffixes.some(
    (suffix) =>
      Boolean(suffix.trim()) &&
      bucket.endsWith(suffix.trim()) &&
      bucket.startsWith(organizationId)
  );
}

/**
 * When the primary provider is S3, still serve historical `ims-v5-local-*`
 * objects from disk. Local-dev often flips FILES_PROVIDER between local and
 * s3; document metadata keeps the bucket name from upload time.
 */
export class S3WithLocalFallbackStorage implements ObjectStoragePort {
  readonly local: LocalObjectStorageAdapter;

  constructor(
    private readonly primary: ObjectStoragePort,
    local: LocalObjectStorageAdapter
  ) {
    this.local = local;
  }

  private prefersLocal(bucket: string): boolean {
    return bucket.startsWith("ims-v5-local-");
  }

  private forBucket(bucket: string): ObjectStoragePort {
    return this.prefersLocal(bucket) ? this.local : this.primary;
  }

  async assertBucketExists(input: { bucket: string }): Promise<void> {
    const target = this.forBucket(input.bucket);
    if (!target.assertBucketExists) return;
    await target.assertBucketExists(input);
  }

  async createUploadUrl(input: {
    bucket: string;
    key: string;
    expiresInSeconds: number;
    contentType?: string;
    contentLength?: number;
  }): Promise<string> {
    return this.forBucket(input.bucket).createUploadUrl(input);
  }

  async createViewUrl(input: {
    bucket: string;
    key: string;
    expiresInSeconds: number;
    downloadFileName?: string;
    disposition?: "inline" | "attachment";
  }): Promise<string> {
    return this.forBucket(input.bucket).createViewUrl(input);
  }

  async deleteObject(input: { bucket: string; key: string }): Promise<void> {
    await this.forBucket(input.bucket).deleteObject(input);
  }
}

/**
 * Local disk primary (Compose demo) with S3 for V4 migrated buckets
 * (`{orgId}-ims-static-resources-bucket`). New uploads stay local; migrated
 * document previews hit S3 with legacy credentials.
 */
export class LocalWithLegacyS3FallbackStorage implements ObjectStoragePort {
  readonly local: LocalObjectStorageAdapter;

  constructor(
    local: LocalObjectStorageAdapter,
    private readonly legacyS3: ObjectStoragePort,
    private readonly legacySuffixes: readonly string[] = DEFAULT_LEGACY_BUCKET_SUFFIXES
  ) {
    this.local = local;
  }

  private prefersLegacyS3(bucket: string): boolean {
    return this.legacySuffixes.some(
      (suffix) => Boolean(suffix.trim()) && bucket.endsWith(suffix.trim())
    );
  }

  private forBucket(bucket: string): ObjectStoragePort {
    return this.prefersLegacyS3(bucket) ? this.legacyS3 : this.local;
  }

  async assertBucketExists(input: { bucket: string }): Promise<void> {
    const target = this.forBucket(input.bucket);
    if (!target.assertBucketExists) return;
    await target.assertBucketExists(input);
  }

  async createUploadUrl(input: {
    bucket: string;
    key: string;
    expiresInSeconds: number;
    contentType?: string;
    contentLength?: number;
  }): Promise<string> {
    return this.forBucket(input.bucket).createUploadUrl(input);
  }

  async createViewUrl(input: {
    bucket: string;
    key: string;
    expiresInSeconds: number;
    downloadFileName?: string;
    disposition?: "inline" | "attachment";
  }): Promise<string> {
    return this.forBucket(input.bucket).createViewUrl(input);
  }

  async deleteObject(input: { bucket: string; key: string }): Promise<void> {
    await this.forBucket(input.bucket).deleteObject(input);
  }
}

/** Extract the local disk adapter when present (primary or S3 fallback). */
export function getLocalObjectStorage(
  storage: ObjectStoragePort
): LocalObjectStorageAdapter | null {
  if (storage instanceof LocalObjectStorageAdapter) return storage;
  if (storage instanceof S3WithLocalFallbackStorage) return storage.local;
  if (storage instanceof LocalWithLegacyS3FallbackStorage) return storage.local;
  return null;
}
