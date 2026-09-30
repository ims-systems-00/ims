import { describe, expect, it } from "vitest";
import { loadPublicEnv } from "@/shared/lib/env";

describe("loadPublicEnv", () => {
  it("loads a valid public configuration", () => {
    const env = loadPublicEnv(
      {
        VITE_API_BASE_URL: "http://127.0.0.1:3001/api/v1/",
        VITE_SECURITY_PROVIDER: "development-stub",
      },
      "development"
    );
    expect(env.VITE_API_BASE_URL).toBe("http://127.0.0.1:3001/api/v1");
    expect(env.VITE_SECURITY_PROVIDER).toBe("development-stub");
  });

  it("rejects missing API base URL", () => {
    expect(() =>
      loadPublicEnv(
        {
          VITE_API_BASE_URL: undefined,
          VITE_SECURITY_PROVIDER: "development-stub",
        },
        "development"
      )
    ).toThrow(/Invalid frontend configuration/);
  });

  it("rejects development-stub when mode is production", () => {
    expect(() =>
      loadPublicEnv(
        {
          VITE_API_BASE_URL: "http://127.0.0.1:3001/api/v1",
          VITE_SECURITY_PROVIDER: "development-stub",
        },
        "production"
      )
    ).toThrow(/development-stub is not allowed when MODE=production/);
  });

  it("accepts a same-origin API base path for Nginx / Docker", () => {
    const env = loadPublicEnv(
      {
        VITE_API_BASE_URL: "/api/v1/",
        VITE_SECURITY_PROVIDER: "development-stub",
      },
      "docker"
    );
    expect(env.VITE_API_BASE_URL).toBe("/api/v1");
  });

  it("allows development-stub when mode is docker", () => {
    const env = loadPublicEnv(
      {
        VITE_API_BASE_URL: "/api/v1",
        VITE_SECURITY_PROVIDER: "development-stub",
      },
      "docker"
    );
    expect(env.VITE_SECURITY_PROVIDER).toBe("development-stub");
  });
});
