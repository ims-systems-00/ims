import { describe, expect, it, vi } from "vitest";
import { ORGANISATION_RESOURCE } from "../src/modules/organisation/types";
import {
  DenyAuthorizer,
  HybridAuthorizer,
} from "../src/security/openfga/hybrid-authorizer";
import { createMembershipProjection } from "../src/security/openfga/membership-projection";
import { OpenFgaAuthorizer } from "../src/security/openfga/openfga-authorizer";
import type { OpenFgaGateway } from "../src/security/openfga/types";
import { ENFORCED_RESOURCE_TYPES } from "../src/security";

function createMemoryGateway(): OpenFgaGateway & {
  tuples: Set<string>;
} {
  const tuples = new Set<string>();
  const key = (t: { user: string; relation: string; object: string }) =>
    `${t.user}#${t.relation}@${t.object}`;

  return {
    tuples,
    async check(request) {
      const user = request.user;
      const object = request.object;
      const has = (relation: string) =>
        tuples.has(key({ user, relation, object }));

      if (request.relation === "can_read") {
        return (
          has("super_admin") ||
          has("head_of_service") ||
          has("basic") ||
          has("auditor")
        );
      }
      if (request.relation === "can_manage" || request.relation === "can_delete") {
        return has("super_admin");
      }
      if (
        request.relation === "can_create" ||
        request.relation === "can_update"
      ) {
        return has("super_admin") || has("head_of_service");
      }
      return tuples.has(key(request));
    },
    async writeTuples(writes) {
      for (const t of writes) tuples.add(key(t));
    },
    async deleteTuples(deletes) {
      for (const t of deletes) tuples.delete(key(t));
    },
  };
}

describe("OpenFgaAuthorizer (M7 full enforce)", () => {
  const identity = {
    subjectId: "aaaaaaaaaaaaaaaaaaaaaaaa",
    organizationId: "bbbbbbbbbbbbbbbbbbbbbbbb",
  };

  it("allows authenticated organisation create without organizationId", async () => {
    const gateway = createMemoryGateway();
    const authorizer = new OpenFgaAuthorizer({ gateway });
    await expect(
      authorizer.allow({
        identity,
        action: "create",
        resourceType: ORGANISATION_RESOURCE,
      })
    ).resolves.toBe(true);
  });

  it("allows read when Super Admin tuple exists", async () => {
    const gateway = createMemoryGateway();
    const projection = createMembershipProjection(gateway);
    await projection.onMembershipCreated({
      userId: identity.subjectId,
      organizationId: identity.organizationId!,
      role: "Super Admin",
    });

    const authorizer = new OpenFgaAuthorizer({ gateway });
    await expect(
      authorizer.allow({
        identity,
        action: "read",
        resourceType: ORGANISATION_RESOURCE,
        organizationId: identity.organizationId,
      })
    ).resolves.toBe(true);
    await expect(
      authorizer.allow({
        identity,
        action: "manage",
        resourceType: ORGANISATION_RESOURCE,
        organizationId: identity.organizationId,
      })
    ).resolves.toBe(true);
  });

  it("enforces users module via same org relations", async () => {
    const gateway = createMemoryGateway();
    const projection = createMembershipProjection(gateway);
    await projection.onMembershipCreated({
      userId: identity.subjectId,
      organizationId: identity.organizationId!,
      role: "Head of Service",
    });
    const authorizer = new OpenFgaAuthorizer({ gateway });

    await expect(
      authorizer.allow({
        identity,
        action: "read",
        resourceType: "users",
        organizationId: identity.organizationId,
      })
    ).resolves.toBe(true);
    await expect(
      authorizer.allow({
        identity,
        action: "create",
        resourceType: "users",
        organizationId: identity.organizationId,
      })
    ).resolves.toBe(true);
    await expect(
      authorizer.allow({
        identity,
        action: "delete",
        resourceType: "users",
        organizationId: identity.organizationId,
      })
    ).resolves.toBe(false);
  });

  it("allows Basic update deny and read allow", async () => {
    const gateway = createMemoryGateway();
    const projection = createMembershipProjection(gateway);
    await projection.onMembershipCreated({
      userId: identity.subjectId,
      organizationId: identity.organizationId!,
      role: "Basic",
    });
    const authorizer = new OpenFgaAuthorizer({ gateway });
    await expect(
      authorizer.allow({
        identity,
        action: "update",
        resourceType: "risks",
        organizationId: identity.organizationId,
      })
    ).resolves.toBe(false);
    await expect(
      authorizer.allow({
        identity,
        action: "read",
        resourceType: "risks",
        organizationId: identity.organizationId,
      })
    ).resolves.toBe(true);
  });

  it("denies read when no membership tuple", async () => {
    const gateway = createMemoryGateway();
    const authorizer = new OpenFgaAuthorizer({ gateway });
    await expect(
      authorizer.allow({
        identity,
        action: "read",
        resourceType: ORGANISATION_RESOURCE,
        organizationId: identity.organizationId,
      })
    ).resolves.toBe(false);
  });

  it("fails closed when OpenFGA check throws", async () => {
    const gateway: OpenFgaGateway = {
      check: vi.fn().mockRejectedValue(new Error("down")),
      writeTuples: vi.fn(),
      deleteTuples: vi.fn(),
    };
    const authorizer = new OpenFgaAuthorizer({ gateway });
    await expect(
      authorizer.allow({
        identity,
        action: "read",
        resourceType: ORGANISATION_RESOURCE,
        organizationId: identity.organizationId,
      })
    ).resolves.toBe(false);
  });

  it("HybridAuthorizer enforces known modules and denies unknown", async () => {
    const gateway = createMemoryGateway();
    const openfga = new OpenFgaAuthorizer({ gateway });
    const hybrid = new HybridAuthorizer(
      openfga,
      new DenyAuthorizer(),
      ENFORCED_RESOURCE_TYPES
    );

    await expect(
      hybrid.allow({
        identity,
        action: "read",
        resourceType: ORGANISATION_RESOURCE,
        organizationId: identity.organizationId,
      })
    ).resolves.toBe(false);

    await expect(
      hybrid.allow({
        identity,
        action: "read",
        resourceType: "not-a-real-module",
        organizationId: identity.organizationId,
      })
    ).resolves.toBe(false);
  });

  it("membershipProjection updates role tuples", async () => {
    const gateway = createMemoryGateway();
    const projection = createMembershipProjection(gateway);
    await projection.onMembershipCreated({
      userId: identity.subjectId,
      organizationId: identity.organizationId!,
      role: "Basic",
    });
    await projection.onMembershipRoleChanged({
      userId: identity.subjectId,
      organizationId: identity.organizationId!,
      previousRole: "Basic",
      nextRole: "Super Admin",
    });

    const authorizer = new OpenFgaAuthorizer({ gateway });
    await expect(
      authorizer.allow({
        identity,
        action: "manage",
        resourceType: ORGANISATION_RESOURCE,
        organizationId: identity.organizationId,
      })
    ).resolves.toBe(true);
  });
});
