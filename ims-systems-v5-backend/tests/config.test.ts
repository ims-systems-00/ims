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

  it("rejects groq AI provider in production", () => {
    expect(() =>
      loadConfig({
        ...valid,
        NODE_ENV: "production",
        SECURITY_PROVIDER: "auth0-openfga",
        AI_PROVIDER: "groq",
        AUTH0_DOMAIN: "example.auth0.com",
        AUTH0_AUDIENCE: "https://api.example",
        OPENFGA_API_URL: "http://127.0.0.1:8080",
        OPENFGA_STORE_ID: "store",
        OPENFGA_MODEL_ID: "model",
      })
    ).toThrow(/AI_PROVIDER=groq is not allowed when NODE_ENV=production/);
  });

  it("defaults AI provider to openai", () => {
    const config = loadConfig(valid);
    expect(config.AI_PROVIDER).toBe("openai");
    expect(config.GROQ_MODEL).toBe("openai/gpt-oss-120b");
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

  it("rejects auth0-openfga without Auth0 and OpenFGA settings", () => {
    expect(() =>
      loadConfig({
        ...valid,
        SECURITY_PROVIDER: "auth0-openfga",
      })
    ).toThrow(/AUTH0_DOMAIN|AUTH0_AUDIENCE|OPENFGA_/);
  });

  it("accepts auth0-openfga when Auth0 and OpenFGA settings are present", () => {
    const config = loadConfig({
      ...valid,
      SECURITY_PROVIDER: "auth0-openfga",
      AUTH0_DOMAIN: "example.eu.auth0.com",
      AUTH0_AUDIENCE: "https://api.example.local",
      OPENFGA_API_URL: "http://127.0.0.1:8080",
      OPENFGA_STORE_ID: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      OPENFGA_MODEL_ID: "01ARZ3NDEKTSV4RRFFQ69G5FB0",
    });
    expect(config.SECURITY_PROVIDER).toBe("auth0-openfga");
    expect(config.AUTH0_ISSUER).toBe("https://example.eu.auth0.com/");
  });

  it("allows auth0-openfga in production when Auth0 and OpenFGA settings are present", () => {
    const config = loadConfig({
      ...valid,
      NODE_ENV: "production",
      SECURITY_PROVIDER: "auth0-openfga",
      AUTH0_DOMAIN: "example.eu.auth0.com",
      AUTH0_AUDIENCE: "https://api.example.local",
      OPENFGA_API_URL: "http://127.0.0.1:8080",
      OPENFGA_STORE_ID: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      OPENFGA_MODEL_ID: "01ARZ3NDEKTSV4RRFFQ69G5FB0",
    });
    expect(config.NODE_ENV).toBe("production");
    expect(config.SECURITY_PROVIDER).toBe("auth0-openfga");
  });
});
