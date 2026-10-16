/**
 * Auth0 SPA security tree — loaded only when VITE_SECURITY_PROVIDER=auth0-openfga.
 * Kept separate so development-stub Vite builds do not require @auth0/auth0-react at transform time.
 */

import {
  useEffect,
  useMemo,
  type Context,
  type ReactNode,
} from "react";
import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import { ApiAuthzClient } from "./api-authz-client";
import { Auth0AuthClient } from "./auth0-auth-client";
import type { SecurityPorts } from "./create-security";
import { setActiveAuthClient } from "./runtime";

function Auth0SecurityBridge({
  audience,
  organizationId,
  securityContext,
  children,
}: {
  audience: string;
  organizationId?: string;
  securityContext: Context<SecurityPorts | null>;
  children: ReactNode;
}) {
  const auth0 = useAuth0();

  const ports = useMemo<SecurityPorts>(() => {
    const authClient = new Auth0AuthClient({
      audience,
      defaultOrganizationId: organizationId,
      sdk: {
        isAuthenticated: auth0.isAuthenticated,
        user: auth0.user,
        getAccessTokenSilently: (options) =>
          auth0.getAccessTokenSilently(options),
        loginWithRedirect: (options) => auth0.loginWithRedirect(options),
        logout: (options) => auth0.logout(options),
      },
    });
    return {
      authClient,
      authzClient: new ApiAuthzClient(),
    };
  }, [
    audience,
    organizationId,
    auth0.isAuthenticated,
    auth0.user,
    auth0.getAccessTokenSilently,
    auth0.loginWithRedirect,
    auth0.logout,
  ]);

  useEffect(() => {
    setActiveAuthClient(ports.authClient);
    return () => setActiveAuthClient(null);
  }, [ports.authClient]);

  if (auth0.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Checking session…
      </div>
    );
  }

  return (
    <securityContext.Provider value={ports}>{children}</securityContext.Provider>
  );
}

export type Auth0SecurityProviderProps = {
  domain: string;
  clientId: string;
  audience: string;
  organizationId?: string;
  securityContext: Context<SecurityPorts | null>;
  children: ReactNode;
};

export function Auth0SecurityProvider({
  domain,
  clientId,
  audience,
  organizationId,
  securityContext,
  children,
}: Auth0SecurityProviderProps) {
  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience,
        ...(organizationId ? { organization: organizationId } : {}),
      }}
      cacheLocation="localstorage"
      useRefreshTokens
    >
      <Auth0SecurityBridge
        audience={audience}
        organizationId={organizationId}
        securityContext={securityContext}
      >
        {children}
      </Auth0SecurityBridge>
    </Auth0Provider>
  );
}
