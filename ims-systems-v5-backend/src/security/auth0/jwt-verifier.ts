import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
} from "jose";

export type VerifiedAccessToken = {
  sub: string;
  /** Present for org-bound tokens; absent during self-signup / pre-tenant bootstrap. */
  orgId: string | null;
  email?: string;
  name?: string;
  payload: JWTPayload;
};

export type AccessTokenVerifier = {
  verify(token: string): Promise<VerifiedAccessToken | null>;
};

export type Auth0JwtVerifierConfig = {
  issuer: string;
  audience: string;
  /** Optional override for tests (local JWKS). */
  getKey?: JWTVerifyGetKey;
  jwksUrl?: string;
};

function asSingleString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    const first = value.find(
      (part): part is string => typeof part === "string" && part.trim().length > 0
    );
    return first?.trim();
  }
  return undefined;
}

/**
 * Build a JWT verifier for Auth0 access tokens (Bearer).
 * Uses remote JWKS by default; tests can inject `getKey`.
 */
export function createAuth0AccessTokenVerifier(
  config: Auth0JwtVerifierConfig
): AccessTokenVerifier {
  const issuer = config.issuer.endsWith("/")
    ? config.issuer
    : `${config.issuer}/`;
  const getKey =
    config.getKey ??
    createRemoteJWKSet(
      new URL(
        config.jwksUrl ??
          new URL(".well-known/jwks.json", issuer).toString()
      )
    );

  return {
    async verify(token: string): Promise<VerifiedAccessToken | null> {
      try {
        const { payload } = await jwtVerify(token, getKey, {
          issuer,
          audience: config.audience,
          algorithms: ["RS256"],
        });

        const sub = asSingleString(payload.sub);
        if (!sub) {
          return null;
        }

        const orgId = asSingleString(payload.org_id) ?? null;
        const name =
          asSingleString(payload.name) ??
          asSingleString(payload.nickname) ??
          undefined;

        return {
          sub,
          orgId,
          email: asSingleString(payload.email),
          name,
          payload,
        };
      } catch {
        return null;
      }
    },
  };
}
