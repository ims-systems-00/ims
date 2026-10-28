import {
  LocalObjectStorageAdapter,
} from "./local-object-storage";
import type { ObjectStoragePort } from "./ports";

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

/** Extract the local disk adapter when present (primary or S3 fallback). */
export function getLocalObjectStorage(
  storage: ObjectStoragePort
): LocalObjectStorageAdapter | null {
  if (storage instanceof LocalObjectStorageAdapter) return storage;
  if (storage instanceof S3WithLocalFallbackStorage) return storage.local;
  return null;
}
