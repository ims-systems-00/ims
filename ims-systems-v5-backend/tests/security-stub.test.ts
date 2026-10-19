import { describe, expect, it } from "vitest";
import {
  assertDevelopmentStubAllowed,
  Auth0Authenticator,
  createSecurityPorts,
  DEV_STUB_IDENTITY,
  DevelopmentAuthenticator,
  DevelopmentAuthorizer,
  HybridAuthorizer,
  type SecurityPorts,
} from "../src/security";
import { loadConfig, type AppConfig } from "../src/config";

const baseConfig = loadConfig({
  NODE_ENV: "test",
  PORT: "3001",
  MONGODB_URI: "mongodb://127.0.0.1:27017/ims_v5_test",
  LOG_LEVEL: "silent",
  SECURITY_PROVIDER: "development-stub",
});

describe("development security stub", () => {
  it("assertDevelopmentStubAllowed rejects production", () => {
    expect(() => assertDevelopmentStubAllowed("production")).toThrow(
      /must not be used when NODE_ENV=production/
    );
  });

  it("assertDevelopmentStubAllowed allows development and test", () => {
    expect(() => assertDevelopmentStubAllowed("development")).not.toThrow();
    expect(() => assertDevelopmentStubAllowed("test")).not.toThrow();
  });

  it("DevelopmentAuthenticator returns deterministic identity", async () => {
    const authenticator = new DevelopmentAuthenticator();
    const identity = await authenticator.authenticate({ headers: {} });
    expect(identity).toEqual(DEV_STUB_IDENTITY);
  });

  it("DevelopmentAuthorizer allows checks", async () => {
    const authorizer = new DevelopmentAuthorizer();
    const allowed = await authorizer.allow({
      identity: DEV_STUB_IDENTITY,
      action: "read",
      resourceType: "health",
    });
    expect(allowed).toBe(true);
  });

  it("createSecurityPorts builds ports for non-production", () => {
    const ports: SecurityPorts = createSecurityPorts(baseConfig);
    expect(ports.authenticator).toBeInstanceOf(DevelopmentAuthenticator);
    expect(ports.authorizer).toBeInstanceOf(DevelopmentAuthorizer);
  });

  it("createSecurityPorts refuses stub when NODE_ENV is production", () => {
    expect(() =>
      createSecurityPorts({
        ...baseConfig,
        NODE_ENV: "production",
        SECURITY_PROVIDER: "development-stub",
      })
    ).toThrow(/must not be used when NODE_ENV=production/);
  });

  it("createSecurityPorts wires Auth0Authenticator + Hybrid OpenFGA authorizer", () => {
    const config: AppConfig = {
      ...baseConfig,
      SECURITY_PROVIDER: "auth0-openfga",
      AUTH0_DOMAIN: "example.eu.auth0.com",
      AUTH0_AUDIENCE: "https://api.example.local",
      AUTH0_ISSUER: "https://example.eu.auth0.com/",
      OPENFGA_API_URL: "http://127.0.0.1:8080",
      // OpenFGA SDK requires ULID-shaped ids
      OPENFGA_STORE_ID: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      OPENFGA_MODEL_ID: "01ARZ3NDEKTSV4RRFFQ69G5FB0",
      OPENFGA_API_TOKEN: "",
    };
    const ports = createSecurityPorts(config);
    expect(ports.authenticator).toBeInstanceOf(Auth0Authenticator);
    expect(ports.authorizer).toBeInstanceOf(HybridAuthorizer);
    expect(ports.membershipProjection).toBeDefined();
  });
});


