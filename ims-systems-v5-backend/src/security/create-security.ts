import type { AppConfig } from "../config";
import type { Authenticator } from "./authenticator";
import type { Authorizer } from "./authorizer";
import {
  assertDevelopmentStubAllowed,
  DevelopmentAuthenticator,
  DevelopmentAuthorizer,
} from "./development-stub";

export type SecurityPorts = {
  authenticator: Authenticator;
  authorizer: Authorizer;
};

/**
 * Resolve concrete security adapters from configuration.
 * Business code must depend on SecurityPorts, not on stub classes directly.
 */
export function createSecurityPorts(config: AppConfig): SecurityPorts {
  if (config.SECURITY_PROVIDER === "development-stub") {
    assertDevelopmentStubAllowed(config.NODE_ENV);
    return {
      authenticator: new DevelopmentAuthenticator(),
      authorizer: new DevelopmentAuthorizer(),
    };
  }

  // Exhaustive guard for future providers.
  const _exhaustive: never = config.SECURITY_PROVIDER;
  throw new Error(`Unsupported SECURITY_PROVIDER: ${String(_exhaustive)}`);
}
