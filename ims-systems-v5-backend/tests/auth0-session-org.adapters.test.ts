import { describe, expect, it, vi } from "vitest";
import { createAuth0SessionAdapter } from "../src/modules/users/adapters/session.adapter";
import { createAuth0OrganisationSideEffectsAdapter, toAuth0OrgName } from "../src/modules/organisation/adapters/auth0-organisation.adapter";
import type { Auth0ManagementApi } from "../src/security/auth0/auth0-management-api";

describe("createAuth0SessionAdapter (N-13)", () => {
  it("revokes grants for the user's Auth0 subject", async () => {
    const revoke = vi.fn().mockResolvedValue(undefined);
    const adapter = createAuth0SessionAdapter({
      mgmt: { revokeUserGrants: revoke } as unknown as Auth0ManagementApi,
      findAuth0SubjectId: async () => "auth0|abc",
    });
    await adapter.clearSessionsForUser("user1");
    expect(revoke).toHaveBeenCalledWith("auth0|abc");
  });

  it("skips users without an Auth0 subject and never throws", async () => {
    const revoke = vi.fn();
    const adapter = createAuth0SessionAdapter({
      mgmt: { revokeUserGrants: revoke } as unknown as Auth0ManagementApi,
      findAuth0SubjectId: async () => null,
    });
    await expect(adapter.clearSessionsForUser("user1")).resolves.toBeUndefined();
    expect(revoke).not.toHaveBeenCalled();

    const failing = createAuth0SessionAdapter({
      mgmt: {
        revokeUserGrants: vi.fn().mockRejectedValue(new Error("auth0 down")),
      } as unknown as Auth0ManagementApi,
      findAuth0SubjectId: async () => "auth0|abc",
    });
    await expect(failing.clearSessionsForUser("user1")).resolves.toBeUndefined();
  });
});

describe("createAuth0OrganisationSideEffectsAdapter (N-09)", () => {
  it("derives Auth0-safe organization names", () => {
    expect(toAuth0OrgName("64f00000000000000000abcd", "Acme Care Ltd.")).toBe(
      "acme-care-ltd-00abcd",
    );
  });

  it("creates and links when unlinked; skips when already linked", async () => {
    const link = vi.fn().mockResolvedValue(undefined);
    const create = vi.fn().mockResolvedValue({ id: "org_new" });
    const organisations = {
      findById: vi.fn().mockResolvedValue({
        id: "org1",
        name: "Acme",
        auth0OrganizationId: null,
      }),
      linkAuth0OrganizationId: link,
    };
    const adapter = createAuth0OrganisationSideEffectsAdapter({
      mgmt: {
        getOrganizationByName: vi.fn().mockResolvedValue(null),
        createOrganization: create,
      } as unknown as Auth0ManagementApi,
      organisations: organisations as never,
    });
    await adapter.ensureAuth0Organisation?.({ organizationId: "org1" });
    expect(create).toHaveBeenCalled();
    expect(link).toHaveBeenCalledWith("org1", "org_new");

    const linked = createAuth0OrganisationSideEffectsAdapter({
      mgmt: {
        getOrganizationByName: vi.fn(),
        createOrganization: create,
      } as unknown as Auth0ManagementApi,
      organisations: {
        findById: vi.fn().mockResolvedValue({
          id: "org1",
          name: "Acme",
          auth0OrganizationId: "org_existing",
        }),
        linkAuth0OrganizationId: link,
      } as never,
    });
    await linked.ensureAuth0Organisation?.({ organizationId: "org1" });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("never throws when Auth0 fails (failSoft default)", async () => {
    const adapter = createAuth0OrganisationSideEffectsAdapter({
      mgmt: {
        getOrganizationByName: vi.fn().mockRejectedValue(new Error("down")),
        createOrganization: vi.fn(),
      } as unknown as Auth0ManagementApi,
      organisations: {
        findById: vi.fn().mockResolvedValue({ id: "o", name: "A", auth0OrganizationId: null }),
        linkAuth0OrganizationId: vi.fn(),
      } as never,
    });
    await expect(
      adapter.ensureAuth0Organisation?.({ organizationId: "o" }),
    ).resolves.toBeUndefined();
  });

  it("rethrows when failSoft is false", async () => {
    const adapter = createAuth0OrganisationSideEffectsAdapter({
      mgmt: {
        getOrganizationByName: vi.fn().mockRejectedValue(new Error("down")),
        createOrganization: vi.fn(),
      } as unknown as Auth0ManagementApi,
      organisations: {
        findById: vi.fn().mockResolvedValue({ id: "o", name: "A", auth0OrganizationId: null }),
        linkAuth0OrganizationId: vi.fn(),
      } as never,
    });
    await expect(
      adapter.ensureAuth0Organisation?.({
        organizationId: "o",
        failSoft: false,
      }),
    ).rejects.toThrow("down");
  });

  it("enables DB connection and adds the actor as a member", async () => {
    const enable = vi.fn().mockResolvedValue(undefined);
    const addMembers = vi.fn().mockResolvedValue(undefined);
    const link = vi.fn().mockResolvedValue(undefined);
    const adapter = createAuth0OrganisationSideEffectsAdapter({
      mgmt: {
        getOrganizationByName: vi.fn().mockResolvedValue(null),
        createOrganization: vi.fn().mockResolvedValue({ id: "org_new" }),
        getConnectionIdByName: vi.fn().mockResolvedValue("con_db"),
        enableOrganizationConnection: enable,
        addOrganizationMembers: addMembers,
      } as unknown as Auth0ManagementApi,
      dbConnectionName: "Username-Password-Authentication",
      organisations: {
        findById: vi.fn().mockResolvedValue({
          id: "org1",
          name: "Acme",
          auth0OrganizationId: null,
        }),
        linkAuth0OrganizationId: link,
      } as never,
    });
    await adapter.ensureAuth0Organisation?.({
      organizationId: "org1",
      auth0UserId: "auth0|actor",
    });
    expect(enable).toHaveBeenCalledWith({
      organizationId: "org_new",
      connectionId: "con_db",
    });
    expect(addMembers).toHaveBeenCalledWith("org_new", ["auth0|actor"]);
  });
});
