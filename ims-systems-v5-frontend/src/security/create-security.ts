import type { AuthClient } from "./auth-client";
import type { AuthzClient } from "./authz-client";
import {
  assertDevelopmentStubAllowed,
  DevelopmentAuthClient,
  DevelopmentAuthzClient,
} from "./development-stub";

export type SecurityPorts = {
  authClient: AuthClient;
  authzClient: AuthzClient;
};

export type SecurityProvider = "development-stub" | "auth0-openfga";

/**
 * Resolve concrete security adapters from configuration.
 * Auth0 SPA ports are built inside `SecurityProvider` (React + Auth0 SDK).
 * This factory only builds the development stub synchronously.
 */
export function createSecurityPorts(options: {
  provider: SecurityProvider;
  nodeEnv?: string;
}): SecurityPorts {
  if (options.provider === "development-stub") {
    assertDevelopmentStubAllowed(options.nodeEnv ?? process.env.NODE_ENV);
    return {
      authClient: new DevelopmentAuthClient(),
      authzClient: new DevelopmentAuthzClient(),
    };
  }

  if (options.provider === "auth0-openfga") {
    throw new Error(
      "Auth0 security ports must be created via SecurityProvider (BffAuthClient). Do not call createSecurityPorts({ provider: \"auth0-openfga\" }) directly."
    );
  }

  const _exhaustive: never = options.provider;
  throw new Error(`Unsupported security provider: ${String(_exhaustive)}`);
}
