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

  it("getUserByEmail returns the first match", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonRes({ access_token: "t", expires_in: 3600 }))
      .mockResolvedValueOnce(
        jsonRes([{ user_id: "auth0|abc", email: "a@b.com" }]),
      );
    const api = new Auth0ManagementApi({
      domain: "tenant.auth0.com",
      clientId: "id",
      clientSecret: "secret",
      fetchFn: fetchFn as typeof fetch,
    });
    expect(await api.getUserByEmail("A@B.com")).toEqual({
      user_id: "auth0|abc",
      email: "a@b.com",
    });
    expect(fetchFn.mock.calls[1][0]).toContain(
      "/api/v2/users-by-email?email=a%40b.com",
    );
  });

  it("ensureUserByEmail creates when missing", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonRes({ access_token: "t", expires_in: 3600 }))
      .mockResolvedValueOnce(jsonRes([]))
      .mockResolvedValueOnce(
        jsonRes({ user_id: "auth0|new", email: "n@x.com" }, 201),
      );
    const api = new Auth0ManagementApi({
      domain: "tenant.auth0.com",
      clientId: "id",
      clientSecret: "secret",
      fetchFn: fetchFn as typeof fetch,
    });
    const result = await api.ensureUserByEmail({
      email: "n@x.com",
      connection: "Username-Password-Authentication",
    });
    expect(result.created).toBe(true);
    expect(result.user.user_id).toBe("auth0|new");
    const createBody = JSON.parse(String(fetchFn.mock.calls[2][1].body));
    expect(createBody.email).toBe("n@x.com");
    expect(createBody.connection).toBe("Username-Password-Authentication");
    expect(typeof createBody.password).toBe("string");
    expect(createBody.password.length).toBeGreaterThan(16);
  });

  it("ensureUserByEmail reuses existing users", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonRes({ access_token: "t", expires_in: 3600 }))
      .mockResolvedValueOnce(
        jsonRes([{ user_id: "auth0|exist", email: "e@x.com" }]),
      );
    const api = new Auth0ManagementApi({
      domain: "tenant.auth0.com",
      clientId: "id",
      clientSecret: "secret",
      fetchFn: fetchFn as typeof fetch,
    });
    const result = await api.ensureUserByEmail({
      email: "e@x.com",
      connection: "Username-Password-Authentication",
    });
    expect(result).toEqual({
      created: false,
      user: { user_id: "auth0|exist", email: "e@x.com" },
    });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("sendChangePasswordEmail posts to dbconnections with SPA client", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(new Response("ok", { status: 200 }));
    const api = new Auth0ManagementApi({
      domain: "tenant.auth0.com",
      clientId: "m2m",
      clientSecret: "secret",
      spaClientId: "spa-client",
      fetchFn: fetchFn as typeof fetch,
    });
    await api.sendChangePasswordEmail({
      email: "U@X.com",
      connection: "Username-Password-Authentication",
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0][0]).toBe(
      "https://tenant.auth0.com/dbconnections/change_password",
    );
    expect(JSON.parse(String(fetchFn.mock.calls[0][1].body))).toEqual({
      client_id: "spa-client",
      email: "u@x.com",
      connection: "Username-Password-Authentication",
    });
  });
});
