import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config";

describe("loadConfig", () => {
  const valid = {
    NODE_ENV: "development",
    PORT: "3001",
    MONGODB_URI: "mongodb://127.0.0.1:27017/ims_v5_dev",
    LOG_LEVEL: "info",
    SECURITY_PROVIDER: "development-stub",
  };

  it("loads valid configuration", () => {
    const config = loadConfig(valid);
    expect(config.NODE_ENV).toBe("development");
    expect(config.PORT).toBe(3001);
    expect(config.MONGODB_URI).toContain("mongodb://");
    expect(config.SECURITY_PROVIDER).toBe("development-stub");
  });

  it("fails when MONGODB_URI is missing", () => {
    expect(() =>
      loadConfig({
        ...valid,
        MONGODB_URI: undefined,
      })
    ).toThrow(/Invalid configuration/);
  });

  it("fails when MONGODB_URI is not a mongodb URI", () => {
    expect(() =>
      loadConfig({
        ...valid,
        MONGODB_URI: "postgres://localhost/db",
      })
    ).toThrow(/MONGODB_URI/);
  });

  it("rejects development-stub in production", () => {
    expect(() =>
      loadConfig({
        ...valid,
        NODE_ENV: "production",
        SECURITY_PROVIDER: "development-stub",
      })
    ).toThrow(/development-stub is not allowed when NODE_ENV=production/);
  });

  it("fails on invalid PORT", () => {
    expect(() =>
      loadConfig({
        ...valid,
        PORT: "not-a-number",
      })
    ).toThrow(/Invalid configuration/);
  });

  it("defaults File Handler to disabled + memory provider", () => {
    const config = loadConfig(valid);
    expect(config.FILES_ENABLED).toBe(false);
    expect(config.FILES_PROVIDER).toBe("memory");
  });

  it("maps V4 AWS aliases into standard names", () => {
    const config = loadConfig({
      ...valid,
      AWS_ID: "AKIAEXAMPLE",
      AWS_SECRET: "secret-example",
      AWS_TEST_BUCKET_NAME: "ims-dev-bucket",
      AWS_BUCKET_NAME: "-ims-prod",
      AWS_PUBLIC_BUCKET_NAME: "ims-public",
    });
    expect(config.AWS_ACCESS_KEY_ID).toBe("AKIAEXAMPLE");
    expect(config.AWS_SECRET_ACCESS_KEY).toBe("secret-example");
    expect(config.AWS_PRIVATE_BUCKET).toBe("ims-dev-bucket");
    expect(config.AWS_BUCKET_SUFFIX).toBe("-ims-prod");
    expect(config.AWS_PUBLIC_BUCKET).toBe("ims-public");
  });

  it("requires S3 credentials when FILES_ENABLED + FILES_PROVIDER=s3", () => {
    expect(() =>
      loadConfig({
        ...valid,
        FILES_ENABLED: "true",
        FILES_PROVIDER: "s3",
      })
    ).toThrow(/AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AWS_PRIVATE_BUCKET/);
  });
});
