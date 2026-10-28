import { describe, expect, it } from "vitest";
import { MemoryObjectStorageAdapter } from "../src/modules/files/ports";
import {
  createFilesService,
  type FilesServiceConfig,
} from "../src/modules/files/services/files.service";
import { DEV_STUB_IDENTITY } from "../src/security";

const baseConfig: FilesServiceConfig = {
  enabled: true,
  provider: "memory",
  nodeEnv: "test",
  privateBucket: "ims-test-private",
  bucketSuffix: "-ims-private",
  publicBucket: "ims-public-media",
  uploadUrlTtlSeconds: 10_800,
  viewUrlTtlSeconds: 43_200,
  allowedPaths: ["general", "risks", "profile"],
};

describe("FilesService", () => {
  it("creates an upload URL with UUID key and original Name", async () => {
    const storage = new MemoryObjectStorageAdapter();
    const service = createFilesService({ storage, config: baseConfig });

    const result = await service.createUploadUrl(DEV_STUB_IDENTITY, {
      fileName: "folder/evidence.pdf",
      path: "risks",
    });

    expect(result.uploadInformation.Name).toBe("evidence.pdf");
    expect(result.uploadInformation.Bucket).toBe("ims-test-private");
    expect(result.uploadInformation.Key).toMatch(
      /^[0-9a-f-]{36}\.pdf$/i
    );
    expect(result.uploadInformation.key).toBe(result.uploadInformation.Key);
    expect(result.url).toContain("memory://upload/");
    expect(result.expiresInSeconds).toBe(10_800);
  });

  it("uses the public bucket when x-file-public matches", async () => {
    const storage = new MemoryObjectStorageAdapter();
    const service = createFilesService({ storage, config: baseConfig });

    const result = await service.createUploadUrl(DEV_STUB_IDENTITY, {
      fileName: "logo.png",
      publicBucket: "ims-public-media",
    });

    expect(result.uploadInformation.Bucket).toBe("ims-public-media");
  });

  it("rejects disallowed upload paths", async () => {
    const storage = new MemoryObjectStorageAdapter();
    const service = createFilesService({ storage, config: baseConfig });

    await expect(
      service.createUploadUrl(DEV_STUB_IDENTITY, {
        fileName: "a.pdf",
        path: "not-allowed",
      })
    ).rejects.toMatchObject({ statusCode: 400, code: "VALIDATION_ERROR" });
  });

  it("creates a view URL from bucket + key", async () => {
    const storage = new MemoryObjectStorageAdapter();
    const service = createFilesService({ storage, config: baseConfig });

    const result = await service.createViewUrl(DEV_STUB_IDENTITY, {
      bucket: "ims-test-private",
      key: "123e4567-e89b-12d3-a456-426614174000.pdf",
      fileName: "evidence.pdf",
    });

    expect(result.url).toContain("memory://view/");
    expect(result.url).toContain("evidence.pdf");
    expect(result.expiresInSeconds).toBe(43_200);
  });

  it("deletes from the private bucket by key", async () => {
    const storage = new MemoryObjectStorageAdapter();
    const service = createFilesService({ storage, config: baseConfig });

    const result = await service.deleteFile(DEV_STUB_IDENTITY, {
      key: "123e4567-e89b-12d3-a456-426614174000.pdf",
    });

    expect(result).toEqual({
      Bucket: "ims-test-private",
      Key: "123e4567-e89b-12d3-a456-426614174000.pdf",
    });
    expect(storage.deleted).toEqual([
      {
        bucket: "ims-test-private",
        key: "123e4567-e89b-12d3-a456-426614174000.pdf",
      },
    ]);
  });

  it("binds content type and size into the signed upload", async () => {
    const storage = new MemoryObjectStorageAdapter();
    const service = createFilesService({ storage, config: baseConfig });

    await service.createUploadUrl(DEV_STUB_IDENTITY, {
      fileName: "evidence.pdf",
      path: "risks",
      contentType: "application/pdf",
      fileSize: 2048,
    });

    expect(storage.uploads[0]).toMatchObject({
      bucket: "ims-test-private",
      contentType: "application/pdf",
      contentLength: 2048,
    });
  });

  it("rejects uploads over the configured maximum size", async () => {
    const storage = new MemoryObjectStorageAdapter();
    const service = createFilesService({
      storage,
      config: { ...baseConfig, maxUploadBytes: 1024 },
    });

    await expect(
      service.createUploadUrl(DEV_STUB_IDENTITY, {
        fileName: "big.zip",
        fileSize: 2048,
      })
    ).rejects.toMatchObject({ statusCode: 400, code: "VALIDATION_ERROR" });
  });

  it("rejects view/delete for buckets outside the caller's organisation", async () => {
    const storage = new MemoryObjectStorageAdapter();
    const service = createFilesService({ storage, config: baseConfig });
    const key = "123e4567-e89b-12d3-a456-426614174000.pdf";

    await expect(
      service.createViewUrl(DEV_STUB_IDENTITY, {
        bucket: "another-org-bucket",
        key,
      })
    ).rejects.toMatchObject({ statusCode: 403, code: "FORBIDDEN" });
    await expect(
      service.deleteFile(DEV_STUB_IDENTITY, {
        bucket: "another-org-bucket",
        key,
      })
    ).rejects.toMatchObject({ statusCode: 403, code: "FORBIDDEN" });
    expect(storage.deleted).toEqual([]);
  });

  it("allows historical org-scoped local buckets after a provider switch", async () => {
    const storage = new MemoryObjectStorageAdapter();
    const service = createFilesService({ storage, config: baseConfig });
    const orgId = DEV_STUB_IDENTITY.organizationId!;
    const key = "123e4567-e89b-12d3-a456-426614174000.pdf";

    const result = await service.createViewUrl(DEV_STUB_IDENTITY, {
      bucket: `ims-v5-local-${orgId}`,
      key,
      fileName: "utility.pdf",
    });

    expect(result.url).toContain(`ims-v5-local-${orgId}`);
    expect(result.url).toContain("utility.pdf");
  });

  it("rejects ephemeral memory-bucket views with a clear gone error", async () => {
    const storage = new MemoryObjectStorageAdapter();
    const service = createFilesService({ storage, config: baseConfig });
    const orgId = DEV_STUB_IDENTITY.organizationId!;
    const key = "123e4567-e89b-12d3-a456-426614174000.pdf";

    await expect(
      service.createViewUrl(DEV_STUB_IDENTITY, {
        bucket: `ims-v5-memory-${orgId}`,
        key,
      })
    ).rejects.toMatchObject({
      statusCode: 410,
      code: "FILES_EPHEMERAL_GONE",
    });
  });

  it("rejects non-UUID storage keys (traversal / foreign keys)", async () => {
    const storage = new MemoryObjectStorageAdapter();
    const service = createFilesService({ storage, config: baseConfig });

    await expect(
      service.deleteFile(DEV_STUB_IDENTITY, { key: "../../etc/passwd" })
    ).rejects.toMatchObject({ statusCode: 400, code: "VALIDATION_ERROR" });
  });

  it("surfaces a clear error when the bucket does not exist", async () => {
    const storage = new MemoryObjectStorageAdapter();
    storage.assertBucketExists = async () => {
      throw new Error("NoSuchBucket");
    };
    const service = createFilesService({ storage, config: baseConfig });

    await expect(
      service.createUploadUrl(DEV_STUB_IDENTITY, { fileName: "a.pdf" })
    ).rejects.toMatchObject({
      statusCode: 503,
      code: "FILES_BUCKET_UNAVAILABLE",
    });
  });

  it("uses org-scoped bucket in production", async () => {
    const storage = new MemoryObjectStorageAdapter();
    const service = createFilesService({
      storage,
      config: {
        ...baseConfig,
        nodeEnv: "production",
        privateBucket: "",
      },
    });

    const result = await service.createUploadUrl(DEV_STUB_IDENTITY, {
      fileName: "doc.docx",
    });

    expect(result.uploadInformation.Bucket).toBe(
      `${DEV_STUB_IDENTITY.organizationId}-ims-private`
    );
  });

  it("rejects when files are disabled and provider is s3", async () => {
    const storage = new MemoryObjectStorageAdapter();
    const service = createFilesService({
      storage,
      config: { ...baseConfig, enabled: false, provider: "s3" },
    });

    await expect(
      service.createUploadUrl(DEV_STUB_IDENTITY, { fileName: "a.pdf" })
    ).rejects.toMatchObject({ statusCode: 503, code: "FILES_DISABLED" });
  });

  it("rejects when files are disabled and provider is local", async () => {
    const storage = new MemoryObjectStorageAdapter();
    const service = createFilesService({
      storage,
      config: { ...baseConfig, enabled: false, provider: "local" },
    });

    await expect(
      service.createUploadUrl(DEV_STUB_IDENTITY, { fileName: "a.pdf" })
    ).rejects.toMatchObject({ statusCode: 503, code: "FILES_DISABLED" });
  });

  it("uses a memory default bucket when AWS buckets are unset", async () => {
    const storage = new MemoryObjectStorageAdapter();
    const service = createFilesService({
      storage,
      config: {
        ...baseConfig,
        privateBucket: "",
        bucketSuffix: "",
        provider: "memory",
      },
    });

    const result = await service.createUploadUrl(DEV_STUB_IDENTITY, {
      fileName: "note.txt",
      path: "general",
    });

    expect(result.uploadInformation.Bucket).toBe(
      `ims-v5-memory-${DEV_STUB_IDENTITY.organizationId}`
    );
    expect(result.url.startsWith("memory://upload/")).toBe(true);
  });
});
