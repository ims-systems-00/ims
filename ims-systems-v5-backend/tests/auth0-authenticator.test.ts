import { describe, expect, it, vi } from "vitest";
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
  type JWTPayload,
} from "jose";
import {
  Auth0Authenticator,
  type Auth0AuthenticatorLookups,
} from "../src/security/auth0/auth0-authenticator";
import { createAuth0AccessTokenVerifier } from "../src/security/auth0/jwt-verifier";

const ISSUER = "https://example.eu.auth0.com/";
const AUDIENCE = "https://api.example.local";

async function createTestSigner() {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  jwk.kid = "test-kid";
  const getKey = createLocalJWKSet({ keys: [jwk] });
  const verifier = createAuth0AccessTokenVerifier({
    issuer: ISSUER,
    audience: AUDIENCE,
    getKey,
  });

  async function sign(claims: JWTPayload & { org_id: string; sub: string }) {
    return new SignJWT({
      org_id: claims.org_id,
      email: claims.email,
    })
      .setProtectedHeader({ alg: "RS256", kid: "test-kid" })
      .setSubject(claims.sub)
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setExpirationTime("2h")
      .sign(privateKey);
  }

  return { verifier, sign };
}

function mockLookups(
  overrides: Partial<Auth0AuthenticatorLookups> = {}
): Auth0AuthenticatorLookups {
  return {
    findUserByAuth0SubjectId: vi.fn().mockResolvedValue({
      id: "aaaaaaaaaaaaaaaaaaaaaaaa",
      email: "ada@example.com",
      systemAccessStatus: "Active",
      lockedUntil: null,
    }),
    findOrganisationByAuth0OrganizationId: vi.fn().mockResolvedValue({
      id: "bbbbbbbbbbbbbbbbbbbbbbbb",
      status: "Running",
    }),
    hasMembership: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("Auth0Authenticator", () => {
  it("returns IMS identity for a valid Bearer token with membership", async () => {
    const { verifier, sign } = await createTestSigner();
    const lookups = mockLookups();
    const authenticator = new Auth0Authenticator({ verifier, lookups });

    const token = await sign({
      sub: "auth0|ada",
      org_id: "org_demo1",
      email: "ada@example.com",
    });

    const identity = await authenticator.authenticate({
      headers: { authorization: `Bearer ${token}` },
    });

    expect(identity).toEqual({
      subjectId: "aaaaaaaaaaaaaaaaaaaaaaaa",
      email: "ada@example.com",
      organizationId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    });
    expect(lookups.findUserByAuth0SubjectId).toHaveBeenCalledWith("auth0|ada");
    expect(lookups.findOrganisationByAuth0OrganizationId).toHaveBeenCalledWith(
      "org_demo1"
    );
  });

  it("returns null when Bearer token is missing", async () => {
    const { verifier } = await createTestSigner();
    const authenticator = new Auth0Authenticator({
      verifier,
      lookups: mockLookups(),
    });
    expect(await authenticator.authenticate({ headers: {} })).toBeNull();
  });

  it("returns null for an invalid / tampered token", async () => {
    const { verifier } = await createTestSigner();
    const authenticator = new Auth0Authenticator({
      verifier,
      lookups: mockLookups(),
    });
    expect(
      await authenticator.authenticate({
        headers: { authorization: "Bearer not-a-jwt" },
      })
    ).toBeNull();
  });

  it("returns null when user or organisation mapping is missing", async () => {
    const { verifier, sign } = await createTestSigner();
    const authenticator = new Auth0Authenticator({
      verifier,
      lookups: mockLookups({
        findUserByAuth0SubjectId: vi.fn().mockResolvedValue(null),
      }),
    });
    const token = await sign({ sub: "auth0|unknown", org_id: "org_demo1" });
    expect(
      await authenticator.authenticate({
        headers: { authorization: `Bearer ${token}` },
      })
    ).toBeNull();
  });

  it("returns null when Mongo membership is missing", async () => {
    const { verifier, sign } = await createTestSigner();
    const authenticator = new Auth0Authenticator({
      verifier,
      lookups: mockLookups({
        hasMembership: vi.fn().mockResolvedValue(false),
      }),
    });
    const token = await sign({ sub: "auth0|ada", org_id: "org_demo1" });
    expect(
      await authenticator.authenticate({
        headers: { authorization: `Bearer ${token}` },
      })
    ).toBeNull();
  });

  it("returns null when x-org-id does not match token-bound IMS org", async () => {
    const { verifier, sign } = await createTestSigner();
    const authenticator = new Auth0Authenticator({
      verifier,
      lookups: mockLookups(),
    });
    const token = await sign({ sub: "auth0|ada", org_id: "org_demo1" });
    expect(
      await authenticator.authenticate({
        headers: {
          authorization: `Bearer ${token}`,
          "x-org-id": "cccccccccccccccccccccccc",
        },
      })
    ).toBeNull();
  });

  it("allows matching x-org-id hint", async () => {
    const { verifier, sign } = await createTestSigner();
    const authenticator = new Auth0Authenticator({
      verifier,
      lookups: mockLookups(),
    });
    const token = await sign({ sub: "auth0|ada", org_id: "org_demo1" });
    const identity = await authenticator.authenticate({
      headers: {
        authorization: `Bearer ${token}`,
        "x-org-id": "bbbbbbbbbbbbbbbbbbbbbbbb",
      },
    });
    expect(identity?.organizationId).toBe("bbbbbbbbbbbbbbbbbbbbbbbb");
  });

  it("returns null when user system access is not Active", async () => {
    const { verifier, sign } = await createTestSigner();
    const authenticator = new Auth0Authenticator({
      verifier,
      lookups: mockLookups({
        findUserByAuth0SubjectId: vi.fn().mockResolvedValue({
          id: "aaaaaaaaaaaaaaaaaaaaaaaa",
          email: "ada@example.com",
          systemAccessStatus: "Blocked",
          lockedUntil: null,
        }),
      }),
    });
    const token = await sign({ sub: "auth0|ada", org_id: "org_demo1" });
    expect(
      await authenticator.authenticate({
        headers: { authorization: `Bearer ${token}` },
      })
    ).toBeNull();
  });
});
