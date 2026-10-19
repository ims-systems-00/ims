import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import { createLogger } from "../src/infrastructure/logging/logger";
import {
  createMongoConnection,
  type MongoConnection,
} from "../src/infrastructure/mongodb/connection";
import { createMemoryMongo } from "./helpers/memory-mongo";
import { createUserRepository } from "../src/modules/users/repositories/user.repository";
import { createOrganisationRepository } from "../src/modules/organisation/repositories/organisation.repository";
import { hashPassword } from "../src/modules/users/services/password";

describe("Auth0 identity mapping (M2)", () => {
  let memoryServer: MongoMemoryServer;
  let mongo: MongoConnection;
  const users = createUserRepository();
  const organisations = createOrganisationRepository();

  beforeAll(async () => {
    memoryServer = await createMemoryMongo("ims_v5_auth_identity");
    const logger = createLogger({ level: "silent" });
    mongo = createMongoConnection({ uri: memoryServer.getUri(), logger });
    await mongo.connect();
  });

  afterAll(async () => {
    await mongo.disconnect();
    try {
      await memoryServer.stop({ doCleanup: true, force: true });
    } catch {
      // ignore teardown noise in sandbox
    }
  });

  it("links and resolves Auth0 subject → IMS user", async () => {
    const passwordHash = await hashPassword("TestPass1!");
    const user = await users.create({
      reference: `USR-AUTH-${Date.now()}`,
      type: "Internal",
      firstName: "Auth",
      lastName: "Link",
      email: `auth-link-${Date.now()}@example.com`,
      passwordHash,
      systemPasswordStatus: "active",
      systemAccessExpires: null,
    });

    expect(user.auth0SubjectId).toBeNull();

    const linked = await users.linkAuth0SubjectId(
      user.id,
      "auth0|user-subject-1"
    );
    expect(linked?.auth0SubjectId).toBe("auth0|user-subject-1");

    const found = await users.findByAuth0SubjectId("auth0|user-subject-1");
    expect(found?.id).toBe(user.id);

    const cleared = await users.linkAuth0SubjectId(user.id, null);
    expect(cleared?.auth0SubjectId).toBeNull();
    expect(await users.findByAuth0SubjectId("auth0|user-subject-1")).toBeNull();
  });

  it("enforces unique Auth0 subject among linked users", async () => {
    const passwordHash = await hashPassword("TestPass1!");
    const stamp = Date.now();
    const a = await users.create({
      reference: `USR-AUTH-A-${stamp}`,
      type: "Internal",
      firstName: "A",
      lastName: "User",
      email: `auth-a-${stamp}@example.com`,
      passwordHash,
      systemPasswordStatus: "active",
      systemAccessExpires: null,
    });
    const b = await users.create({
      reference: `USR-AUTH-B-${stamp}`,
      type: "Internal",
      firstName: "B",
      lastName: "User",
      email: `auth-b-${stamp}@example.com`,
      passwordHash,
      systemPasswordStatus: "active",
      systemAccessExpires: null,
    });

    await users.linkAuth0SubjectId(a.id, "auth0|shared-sub");
    await expect(
      users.linkAuth0SubjectId(b.id, "auth0|shared-sub")
    ).rejects.toThrow();
  });

  it("links and resolves Auth0 organization → IMS organisation", async () => {
    const org = await organisations.create({
      reference: `ORG-AUTH-${Date.now()}`,
      createdBy: "test",
      createdOn: new Date(),
      data: {
        name: "Auth Linked Org",
        industry: "Information technology",
        sizeOfOrganisation: 10,
        officeEmail: "ops@auth-linked.local",
        contactNumber: "+44 20 0000 0000",
        address: {
          line1: "1 Auth Street",
          city: "London",
          county: "Greater London",
          postCode: "EC2A 4BX",
        },
        country: {
          name: "United Kingdom",
          code: "GB",
          currency: "GBP",
          phoneCode: 44,
        },
      },
    });

    expect(org.auth0OrganizationId).toBeNull();

    const linked = await organisations.linkAuth0OrganizationId(
      org.id,
      "org_testLinked1"
    );
    expect(linked?.auth0OrganizationId).toBe("org_testLinked1");

    const found =
      await organisations.findByAuth0OrganizationId("org_testLinked1");
    expect(found?.id).toBe(org.id);

    const cleared = await organisations.linkAuth0OrganizationId(org.id, null);
    expect(cleared?.auth0OrganizationId).toBeNull();
    expect(
      await organisations.findByAuth0OrganizationId("org_testLinked1")
    ).toBeNull();
  });
});
