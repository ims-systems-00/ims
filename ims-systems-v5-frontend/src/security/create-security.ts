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

export type SecurityProvider = "development-stub";

/**
 * Resolve concrete security adapters from configuration.
 * Modules must depend on SecurityPorts, not stub classes directly.
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

  const _exhaustive: never = options.provider;
  throw new Error(`Unsupported security provider: ${String(_exhaustive)}`);
}
