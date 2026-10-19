/**
 * Auth0-mode security tree — BFF password session (embedded forms).
 * Auth0 SPA SDK is no longer the primary email/password path.
 */

import {
  useEffect,
  useMemo,
  type Context,
  type ReactNode,
} from "react";
import { ApiAuthzClient } from "./api-authz-client";
import { BffAuthClient } from "./bff-auth-client";
import type { SecurityPorts } from "./create-security";
import { setActiveAuthClient } from "./runtime";

export type Auth0SecurityProviderProps = {
  /** Kept for API compatibility / optional future social redirect. */
  domain?: string;
  clientId?: string;
  audience?: string;
  organizationId?: string;
  securityContext: Context<SecurityPorts | null>;
  children: ReactNode;
};

/**
 * Wires BffAuthClient + ApiAuthzClient for auth0-openfga mode.
 */
export function Auth0SecurityProvider({
  securityContext,
  children,
}: Auth0SecurityProviderProps) {
  const ports = useMemo<SecurityPorts>(
    () => ({
      authClient: new BffAuthClient(),
      authzClient: new ApiAuthzClient(),
    }),
    []
  );

  useEffect(() => {
    setActiveAuthClient(ports.authClient);
    return () => setActiveAuthClient(null);
  }, [ports.authClient]);

  return (
    <securityContext.Provider value={ports}>{children}</securityContext.Provider>
  );
}
