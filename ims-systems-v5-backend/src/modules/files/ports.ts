/**
 * Object storage port used by the File Handler module.
 */
export type ObjectStoragePort = {
  createUploadUrl: (input: {
    bucket: string;
    key: string;
    expiresInSeconds: number;
    /** When set, the signed PUT is bound to this exact content type. */
    contentType?: string;
    /** When set, the signed PUT is bound to this exact byte length. */
    contentLength?: number;
  }) => Promise<string>;
  createViewUrl: (input: {
    bucket: string;
    key: string;
    expiresInSeconds: number;
    /** Optional filename used in the Content-Disposition header. */
    downloadFileName?: string;
    /**
     * Content-Disposition behaviour. Defaults to "inline" so previews
     * render in the browser; pass "attachment" only for downloads.
     */
    disposition?: "inline" | "attachment";
  }) => Promise<string>;
  deleteObject: (input: { bucket: string; key: string }) => Promise<void>;
  /**
   * Optional probe used before issuing upload URLs. Real adapters (S3)
   * throw when the bucket does not exist / is not reachable; fake and
   * local adapters treat every logical bucket as available.
   */
  assertBucketExists?: (input: { bucket: string }) => Promise<void>;
};

/**
 * In-memory / fake storage for tests and local work without AWS.
 * URLs are opaque placeholders — they are not real S3 endpoints.
 */
export class MemoryObjectStorageAdapter implements ObjectStoragePort {
  readonly deleted: Array<{ bucket: string; key: string }> = [];
  readonly uploads: Array<{
    bucket: string;
    key: string;
    contentType?: string;
    contentLength?: number;
  }> = [];

  async assertBucketExists(): Promise<void> {
    // Logical buckets always exist for the in-memory adapter.
  }

  async createUploadUrl(input: {
    bucket: string;
    key: string;
    expiresInSeconds: number;
    contentType?: string;
    contentLength?: number;
  }): Promise<string> {
    this.uploads.push({
      bucket: input.bucket,
      key: input.key,
      contentType: input.contentType,
      contentLength: input.contentLength,
    });
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
