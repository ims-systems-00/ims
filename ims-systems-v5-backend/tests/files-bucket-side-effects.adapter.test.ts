import { describe, expect, it, vi } from "vitest";
import {
  createFilesBucketSideEffectsAdapter,
  resolveProvisioningBucket,
} from "../src/modules/organisation";
import type { FilesBucketProvisioningConfig } from "../src/modules/organisation/adapters/files-bucket.adapter";
import type { Logger } from "../src/infrastructure/logging/logger";

function makeConfig(
  patch: Partial<FilesBucketProvisioningConfig> = {}
): FilesBucketProvisioningConfig {
  return {
    FILES_ENABLED: true,
    FILES_PROVIDER: "s3",
    NODE_ENV: "production",
    AWS_PRIVATE_BUCKET: "",
    AWS_BUCKET_SUFFIX: "-ims-v5-prod",
    AWS_REGION: "eu-north-1",
    AWS_ACCESS_KEY_ID: "ak",
    AWS_SECRET_ACCESS_KEY: "sk",
    FILES_CORS_ORIGINS: ["http://localhost:3000"],
    ...patch,
  } as FilesBucketProvisioningConfig;
}

function makeLogger() {
  return {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
  } as unknown as Logger & {
    info: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
}

describe("FilesBucketSideEffectsAdapter (N-09)", () => {
  it("resolves per-org bucket names in production", () => {
    expect(resolveProvisioningBucket(makeConfig(), "org123")).toBe(
      "org123-ims-v5-prod"
    );
  });

  it("resolves the shared private bucket outside production", () => {
    expect(
      resolveProvisioningBucket(
        makeConfig({ NODE_ENV: "development", AWS_PRIVATE_BUCKET: "shared-bucket" }),
        "org123"
      )
    ).toBe("shared-bucket");
  });

  it("returns null for non-s3 or disabled files", () => {
    expect(
      resolveProvisioningBucket(makeConfig({ FILES_PROVIDER: "local" }), "org123")
    ).toBeNull();
    expect(
      resolveProvisioningBucket(makeConfig({ FILES_ENABLED: false }), "org123")
    ).toBeNull();
  });

  it("ensures the per-org bucket on ensureFileStorage and logs creation", async () => {
    const logger = makeLogger();
    const ensureBucket = vi.fn().mockResolvedValue({ created: true });
    const adapter = createFilesBucketSideEffectsAdapter({
      config: makeConfig(),
      logger,
      ensureBucket,
    });

    await adapter.ensureFileStorage?.({ organizationId: "org123" });

    expect(ensureBucket).toHaveBeenCalledWith("org123-ims-v5-prod");
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: "org123-ims-v5-prod", created: true }),
      expect.stringContaining("Provisioned")
    );
  });

  it("swallows provisioning failures (logs, never throws)", async () => {
    const logger = makeLogger();
    const ensureBucket = vi.fn().mockRejectedValue(new Error("s3 down"));
    const adapter = createFilesBucketSideEffectsAdapter({
      config: makeConfig(),
      logger,
      ensureBucket,
    });

    await expect(
      adapter.ensureFileStorage?.({ organizationId: "org123" })
    ).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });

  it("does nothing when files are not on s3", async () => {
    const logger = makeLogger();
    const ensureBucket = vi.fn().mockResolvedValue({ created: false });
    const adapter = createFilesBucketSideEffectsAdapter({
      config: makeConfig({ FILES_PROVIDER: "memory" }),
      logger,
      ensureBucket,
    });

    await adapter.ensureFileStorage?.({ organizationId: "org123" });
    expect(ensureBucket).not.toHaveBeenCalled();
  });
});
