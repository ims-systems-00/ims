import { describe, expect, it } from "vitest";
import {
  getLocalObjectStorage,
  S3WithLocalFallbackStorage,
} from "../src/modules/files/local-fallback-storage";
import { createLocalObjectStorageAdapter } from "../src/modules/files/local-object-storage";
import { MemoryObjectStorageAdapter } from "../src/modules/files/ports";

describe("S3WithLocalFallbackStorage", () => {
  it("routes ims-v5-local-* view URLs to the local adapter", async () => {
    const primary = new MemoryObjectStorageAdapter();
    const local = createLocalObjectStorageAdapter({
      rootDir: ".local-files-test",
      objectEndpointUrl: "http://127.0.0.1:3001/api/v1/files/local/object",
      signingSecret: "test-secret",
    });
    const storage = new S3WithLocalFallbackStorage(primary, local);

    const url = await storage.createViewUrl({
      bucket: "ims-v5-local-000000000000000000000001",
      key: "123e4567-e89b-12d3-a456-426614174000.pdf",
      expiresInSeconds: 60,
      disposition: "inline",
    });

    expect(url.startsWith("http://127.0.0.1:3001/api/v1/files/local/object?")).toBe(
      true
    );
    expect(url).toContain("ims-v5-local-000000000000000000000001");
  });

  it("routes non-local buckets to the primary adapter", async () => {
    const primary = new MemoryObjectStorageAdapter();
    const local = createLocalObjectStorageAdapter({
      rootDir: ".local-files-test",
      objectEndpointUrl: "http://127.0.0.1:3001/api/v1/files/local/object",
      signingSecret: "test-secret",
    });
    const storage = new S3WithLocalFallbackStorage(primary, local);

    const url = await storage.createViewUrl({
      bucket: "ims-v5-test",
      key: "123e4567-e89b-12d3-a456-426614174000.pdf",
      expiresInSeconds: 60,
    });

    expect(url.startsWith("memory://view/ims-v5-test/")).toBe(true);
  });

  it("exposes the local adapter for route mounting", () => {
    const primary = new MemoryObjectStorageAdapter();
    const local = createLocalObjectStorageAdapter({
      rootDir: ".local-files-test",
      objectEndpointUrl: "http://127.0.0.1:3001/api/v1/files/local/object",
      signingSecret: "test-secret",
    });
    const storage = new S3WithLocalFallbackStorage(primary, local);

    expect(getLocalObjectStorage(storage)).toBe(local);
    expect(getLocalObjectStorage(local)).toBe(local);
    expect(getLocalObjectStorage(primary)).toBeNull();
  });
});
