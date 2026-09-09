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
});
