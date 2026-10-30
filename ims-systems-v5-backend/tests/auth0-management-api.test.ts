import { describe, expect, it, vi } from "vitest";
import { loadConfig } from "../src/config";
import {
  Auth0ManagementApi,
  createAuth0ManagementApiFromConfig,
  isAuth0ManagementConfigured,
} from "../src/security/auth0/auth0-management-api";

const jsonRes = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("Auth0ManagementApi", () => {
  it("fetches a client-credentials token once and creates an organization", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonRes({ access_token: "mgmt-token", expires_in: 3600 }))
      .mockResolvedValueOnce(jsonRes({ id: "org_123" }, 201));
    const api = new Auth0ManagementApi({
      domain: "https://tenant.eu.auth0.com/",
      clientId: "m2m-id",
      clientSecret: "m2m-secret",
      fetchFn: fetchFn as typeof fetch,
    });
    expect(await api.createOrganization({ name: "acme" })).toEqual({ id: "org_123" });
    const [tokenUrl, tokenInit] = fetchFn.mock.calls[0];
    expect(tokenUrl).toBe("https://tenant.eu.auth0.com/oauth/token");
    expect(tokenInit.headers["Content-Type"]).toBe(
      "application/x-www-form-urlencoded",
    );
    expect(String(tokenInit.body)).toContain(
      "audience=https%3A%2F%2Ftenant.eu.auth0.com%2Fapi%2Fv2%2F",
    );
    const [orgUrl, orgInit] = fetchFn.mock.calls[1];
    expect(orgUrl).toBe("https://tenant.eu.auth0.com/api/v2/organizations");
    expect(orgInit.headers.Authorization).toBe("Bearer mgmt-token");
  });

  it("revokeUserGrants deletes grants and sessions, tolerating failures", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonRes({ access_token: "t", expires_in: 3600 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response("nope", { status: 404 }));
    const api = new Auth0ManagementApi({
      domain: "tenant.auth0.com",
      clientId: "id",
      clientSecret: "secret",
      fetchFn: fetchFn as typeof fetch,
    });
    await expect(api.revokeUserGrants("auth0|123")).resolves.toBeUndefined();
    expect(fetchFn.mock.calls[1][0]).toContain("/api/v2/grants?user_id=auth0%7C123");
  });

  it("is configured only with domain + M2M credentials", () => {
    const base = loadConfig({
      MONGODB_URI: "mongodb://127.0.0.1:27017/x",
      SECURITY_PROVIDER: "auth0-openfga",
      AUTH0_DOMAIN: "tenant.auth0.com",
      AUTH0_AUDIENCE: "api",
      OPENFGA_API_URL: "http://localhost:8080",
      OPENFGA_STORE_ID: "s",
      OPENFGA_MODEL_ID: "m",
    });
    expect(isAuth0ManagementConfigured(base)).toBe(false);
    expect(createAuth0ManagementApiFromConfig(base)).toBeNull();
    const withMgmt = { ...base, AUTH0_MGMT_CLIENT_ID: "id", AUTH0_MGMT_CLIENT_SECRET: "s" };
    expect(isAuth0ManagementConfigured(withMgmt)).toBe(true);
    expect(createAuth0ManagementApiFromConfig(withMgmt)).not.toBeNull();
  });
});
