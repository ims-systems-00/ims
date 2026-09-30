import { describe, expect, it } from "vitest";
import {
  assertDevelopmentStubAllowed,
  createSecurityPorts,
  DEV_STUB_IDENTITY,
  DevelopmentAuthClient,
} from "@/security";

describe("development security stub", () => {
  it("rejects stub usage in production", () => {
    expect(() => assertDevelopmentStubAllowed("production")).toThrow(
      /must not be used when NODE_ENV=production/
    );
  });

  it("createSecurityPorts returns development adapters", async () => {
    const ports = createSecurityPorts({
      provider: "development-stub",
      nodeEnv: "test",
    });
    expect(ports.authClient).toBeInstanceOf(DevelopmentAuthClient);
    await expect(ports.authClient.getIdentity()).resolves.toEqual(
      DEV_STUB_IDENTITY
    );
    await expect(
      ports.authzClient.allow({
        identity: DEV_STUB_IDENTITY,
        action: "read",
        resourceType: "platform",
      })
    ).resolves.toBe(true);
  });
});
