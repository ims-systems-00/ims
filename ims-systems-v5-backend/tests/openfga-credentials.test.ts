import { describe, expect, it } from "vitest";
import { CredentialsMethod } from "@openfga/sdk";
import { resolveOpenFgaCredentials } from "../src/security/openfga/credentials";

const empty = {
  OPENFGA_CLIENT_ID: "",
  OPENFGA_CLIENT_SECRET: "",
  OPENFGA_API_TOKEN_ISSUER: "",
  OPENFGA_API_AUDIENCE: "",
  OPENFGA_API_TOKEN: "",
};

describe("resolveOpenFgaCredentials", () => {
  it("returns undefined for local no-auth", () => {
    expect(resolveOpenFgaCredentials(empty)).toBeUndefined();
  });

  it("prefers client credentials over api token", () => {
    const credentials = resolveOpenFgaCredentials({
      ...empty,
      OPENFGA_CLIENT_ID: "cid",
      OPENFGA_CLIENT_SECRET: "csecret",
      OPENFGA_API_TOKEN_ISSUER: "auth.fga.dev",
      OPENFGA_API_AUDIENCE: "https://api.us1.fga.dev/",
      OPENFGA_API_TOKEN: "legacy-token",
    });
    expect(credentials).toEqual({
      method: CredentialsMethod.ClientCredentials,
      config: {
        clientId: "cid",
        clientSecret: "csecret",
        apiTokenIssuer: "auth.fga.dev",
        apiAudience: "https://api.us1.fga.dev/",
      },
    });
  });

  it("falls back to api token when client credentials are unset", () => {
    expect(
      resolveOpenFgaCredentials({
        ...empty,
        OPENFGA_API_TOKEN: "static-token",
      })
    ).toEqual({
      method: CredentialsMethod.ApiToken,
      config: { token: "static-token" },
    });
  });

  it("rejects incomplete client credentials", () => {
    expect(() =>
      resolveOpenFgaCredentials({
        ...empty,
        OPENFGA_CLIENT_ID: "cid",
      })
    ).toThrow(/OPENFGA_CLIENT_SECRET/);
  });
});
