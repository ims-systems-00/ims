import type { AppConfig } from "../config";
import type { Authenticator } from "./authenticator";
import type { Authorizer } from "./authorizer";
import { Auth0Authenticator } from "./auth0/auth0-authenticator";
import { createMongoAuth0Lookups } from "./auth0/create-auth0-lookups";
import { createAuth0AccessTokenVerifier } from "./auth0/jwt-verifier";
import {
  assertDevelopmentStubAllowed,
  DevelopmentAuthenticator,
  DevelopmentAuthorizer,
} from "./development-stub";
import { ENFORCED_RESOURCE_TYPES } from "./openfga/enforced-resources";
import {
  DenyAuthorizer,
  HybridAuthorizer,
} from "./openfga/hybrid-authorizer";
import {
  createMembershipProjection,
  createNoOpMembershipProjection,
  type MembershipProjection,
} from "./openfga/membership-projection";
import { OpenFgaAuthorizer } from "./openfga/openfga-authorizer";
import { createOpenFgaSdkGateway } from "./openfga/sdk-gateway";

export type SecurityPorts = {
  authenticator: Authenticator;
  authorizer: Authorizer;
  /** Writes OpenFGA tuples when memberships change (no-op on stub). */
  membershipProjection: MembershipProjection;
};

/**
 * Resolve concrete security adapters from configuration.
 * Business code must depend on SecurityPorts, not on stub/Auth0/OpenFGA classes directly.
 *
 * `auth0-openfga`: AuthN via Auth0; AuthZ via OpenFGA for all module resource types (M7).
 */
export function createSecurityPorts(config: AppConfig): SecurityPorts {
  if (config.SECURITY_PROVIDER === "development-stub") {
    assertDevelopmentStubAllowed(config.NODE_ENV);
    return {
      authenticator: new DevelopmentAuthenticator(),
      authorizer: new DevelopmentAuthorizer(),
      membershipProjection: createNoOpMembershipProjection(),
    };
  }

  if (config.SECURITY_PROVIDER === "auth0-openfga") {
    const verifier = createAuth0AccessTokenVerifier({
      issuer: config.AUTH0_ISSUER,
      audience: config.AUTH0_AUDIENCE,
      jwksUrl: `https://${config.AUTH0_DOMAIN.replace(/^https?:\/\//, "").replace(/\/$/, "")}/.well-known/jwks.json`,
    });

    const gateway = createOpenFgaSdkGateway(config);
    const openfgaAuthorizer = new OpenFgaAuthorizer({
      gateway,
      enforcedResourceTypes: ENFORCED_RESOURCE_TYPES,
    });

    return {
      authenticator: new Auth0Authenticator({
        verifier,
        lookups: createMongoAuth0Lookups(),
        domain: config.AUTH0_DOMAIN,
      }),
      authorizer: new HybridAuthorizer(
        openfgaAuthorizer,
        new DenyAuthorizer(),
        ENFORCED_RESOURCE_TYPES
      ),
      membershipProjection: createMembershipProjection(gateway),
    };
  }

  const _exhaustive: never = config.SECURITY_PROVIDER;
  throw new Error(`Unsupported SECURITY_PROVIDER: ${String(_exhaustive)}`);
}
