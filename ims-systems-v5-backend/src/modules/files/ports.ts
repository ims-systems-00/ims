/**
 * Object storage port used by the File Handler module.
 */
export type ObjectStoragePort = {
  createUploadUrl: (input: {
    bucket: string;
    key: string;
    expiresInSeconds: number;
  }) => Promise<string>;
  createViewUrl: (input: {
    bucket: string;
    key: string;
    expiresInSeconds: number;
    /** Optional Content-Disposition filename for downloads. */
    downloadFileName?: string;
  }) => Promise<string>;
  deleteObject: (input: { bucket: string; key: string }) => Promise<void>;
};

/**
 * In-memory / fake storage for tests and local work without AWS.
 * URLs are opaque placeholders — they are not real S3 endpoints.
 */
export class MemoryObjectStorageAdapter implements ObjectStoragePort {
  readonly deleted: Array<{ bucket: string; key: string }> = [];

  async createUploadUrl(input: {
    bucket: string;
    key: string;
    expiresInSeconds: number;
  }): Promise<string> {
    return `memory://upload/${input.bucket}/${encodeURIComponent(input.key)}?ttl=${input.expiresInSeconds}`;
  }

  async createViewUrl(input: {
    bucket: string;
    key: string;
    expiresInSeconds: number;
    downloadFileName?: string;
  }): Promise<string> {
    const name = input.downloadFileName
      ? `&name=${encodeURIComponent(input.downloadFileName)}`
      : "";
    return `memory://view/${input.bucket}/${encodeURIComponent(input.key)}?ttl=${input.expiresInSeconds}${name}`;
  }

  async deleteObject(input: { bucket: string; key: string }): Promise<void> {
    this.deleted.push({ bucket: input.bucket, key: input.key });
  }
}
