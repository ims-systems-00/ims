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
      key: "abc-123.pdf",
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
      key: "abc-123.pdf",
    });

    expect(result).toEqual({
      Bucket: "ims-test-private",
      Key: "abc-123.pdf",
    });
    expect(storage.deleted).toEqual([
      { bucket: "ims-test-private", key: "abc-123.pdf" },
    ]);
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
