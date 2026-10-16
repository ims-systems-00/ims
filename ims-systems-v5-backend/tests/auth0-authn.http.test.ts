import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import type { MongoMemoryServer } from "mongodb-memory-server";
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
} from "jose";
import { loadConfig } from "../src/config";
import { createApp } from "../src/app/create-app";
import { createLogger } from "../src/infrastructure/logging/logger";
import {
  createMongoConnection,
  type MongoConnection,
} from "../src/infrastructure/mongodb/connection";
import { createEmailSystem } from "../src/infrastructure/queue";
import { createMemoryMongo } from "./helpers/memory-mongo";
import { Auth0Authenticator } from "../src/security/auth0/auth0-authenticator";
import { createMongoAuth0Lookups } from "../src/security/auth0/create-auth0-lookups";
import { createAuth0AccessTokenVerifier } from "../src/security/auth0/jwt-verifier";
import {
  createNoOpMembershipProjection,
  DevelopmentAuthorizer,
} from "../src/security";
import { createUserRepository } from "../src/modules/users/repositories/user.repository";
import { createOrganisationRepository } from "../src/modules/organisation/repositories/organisation.repository";
import { createOrganisationMembershipRepository } from "../src/modules/organisation/repositories/organisation-membership.repository";
import { hashPassword } from "../src/modules/users/services/password";

const ISSUER = "https://example.eu.auth0.com/";
const AUDIENCE = "https://api.example.local";

describe("Auth0 AuthN HTTP (M3)", () => {
  let app: Express;
  let mongo: MongoConnection;
  let memoryServer: MongoMemoryServer;
  let stopEmail: () => Promise<void>;
  let privateKey: CryptoKey;
  let organizationId: string;

  beforeAll(async () => {
    const { publicKey, privateKey: pk } = await generateKeyPair("RS256");
    privateKey = pk;
    const jwk = await exportJWK(publicKey);
    jwk.kid = "http-test-kid";
    const getKey = createLocalJWKSet({ keys: [jwk] });

    memoryServer = await createMemoryMongo("ims_v5_auth0_http");
    const logger = createLogger({ level: "silent" });
    const config = loadConfig({
      NODE_ENV: "test",
      PORT: "3001",
      MONGODB_URI: memoryServer.getUri(),
      LOG_LEVEL: "silent",
      SECURITY_PROVIDER: "auth0-openfga",
      AUTH0_DOMAIN: "example.eu.auth0.com",
      AUTH0_AUDIENCE: AUDIENCE,
      AUTH0_ISSUER: ISSUER,
      OPENFGA_API_URL: "http://127.0.0.1:8080",
      OPENFGA_STORE_ID: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      OPENFGA_MODEL_ID: "01ARZ3NDEKTSV4RRFFQ69G5FB0",
      EMAIL_ENABLED: "false",
      EMAIL_PROVIDER: "logging",
      EMAIL_QUEUE_ENABLED: "false",
      REPORT_BUG_SUPPORT_EMAILS: "support@example.local",
    });

    mongo = createMongoConnection({ uri: config.MONGODB_URI, logger });
    await mongo.connect();
    const email = createEmailSystem({ config, logger });
    stopEmail = () => email.close();

    const security = {
      authenticator: new Auth0Authenticator({
        verifier: createAuth0AccessTokenVerifier({
          issuer: ISSUER,
          audience: AUDIENCE,
          getKey,
        }),
        lookups: createMongoAuth0Lookups(),
      }),
      authorizer: new DevelopmentAuthorizer(),
      membershipProjection: createNoOpMembershipProjection(),
    };

    ({ app } = createApp({ config, logger, mongo, email, security }));

    const users = createUserRepository();
    const organisations = createOrganisationRepository();
    const memberships = createOrganisationMembershipRepository();

    const user = await users.create({
      reference: "USR-AUTH0-HTTP-1",
      type: "Internal",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada-auth0-http@example.com",
      passwordHash: await hashPassword("TestPass1!"),
      systemPasswordStatus: "active",
      systemAccessExpires: null,
    });
    await users.linkAuth0SubjectId(user.id, "auth0|ada-http");

    const org = await organisations.create({
      reference: "ORG-AUTH0-HTTP-1",
      createdBy: user.id,
      createdOn: new Date(),
      data: {
        name: "Auth0 HTTP Org",
        industry: "Information technology",
        sizeOfOrganisation: 5,
        officeEmail: "ops@auth0-http.local",
        contactNumber: "+44 20 0000 0001",
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
    await organisations.linkAuth0OrganizationId(org.id, "org_httpTest1");
    organizationId = org.id;

    await memberships.create({
      organizationId: org.id,
      userId: user.id,
      role: "Super Admin",
      createdOn: new Date(),
    });
  }, 60_000);

  afterAll(async () => {
    await stopEmail();
    await mongo.disconnect();
    try {
      await memoryServer.stop({ doCleanup: true, force: true });
    } catch {
      // ignore teardown noise
    }
  });

  async function signToken(input: {
    sub: string;
    org_id: string;
    email?: string;
  }): Promise<string> {
    return new SignJWT({
      org_id: input.org_id,
      email: input.email,
    })
      .setProtectedHeader({ alg: "RS256", kid: "http-test-kid" })
      .setSubject(input.sub)
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setExpirationTime("2h")
      .sign(privateKey);
  }

  it("rejects protected organisation profile without Bearer token (401)", async () => {
    const res = await request(app).get("/api/v1/organisations/current");
    expect(res.status).toBe(401);
  });

  it("accepts valid Bearer token and returns organisation context", async () => {
    const token = await signToken({
      sub: "auth0|ada-http",
      org_id: "org_httpTest1",
      email: "ada-auth0-http@example.com",
    });

    const res = await request(app)
      .get("/api/v1/organisations/current")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(organizationId);
    expect(res.body.data.membership.userId).toBeTruthy();
  });

  it("rejects valid token when x-org-id mismatches (401)", async () => {
    const token = await signToken({
      sub: "auth0|ada-http",
      org_id: "org_httpTest1",
    });

    const res = await request(app)
      .get("/api/v1/organisations/current")
      .set("Authorization", `Bearer ${token}`)
      .set("x-org-id", "cccccccccccccccccccccccc");

    expect(res.status).toBe(401);
  });

  it("rejects unknown Auth0 subject (401)", async () => {
    const token = await signToken({
      sub: "auth0|unknown",
      org_id: "org_httpTest1",
    });

    const res = await request(app)
      .get("/api/v1/organisations/current")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(401);
  });
});
