import {
  createContext,
  lazy,
  Suspense,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loadPublicEnv } from "@/shared/lib/env";
import { createSecurityPorts, type SecurityPorts } from "./create-security";
import { setActiveAuthClient } from "./runtime";

const SecurityContext = createContext<SecurityPorts | null>(null);

const Auth0SecurityProviderLazy = lazy(async () => {
  const mod = await import("./auth0-security-provider");
  return { default: mod.Auth0SecurityProvider };
});

export function useSecurityPorts(): SecurityPorts {
  const value = useContext(SecurityContext);
  if (!value) {
    throw new Error("useSecurityPorts must be used within SecurityProvider");
  }
  return value;
}

export function useAuthClient() {
  return useSecurityPorts().authClient;
}

export function useAuthzClient() {
  return useSecurityPorts().authzClient;
}

function StubSecurityProvider({ children }: { children: ReactNode }) {
  const ports = useMemo(
    () =>
      createSecurityPorts({
        provider: "development-stub",
        nodeEnv: import.meta.env.MODE === "production" ? "production" : "development",
      }),
    []
  );

  useEffect(() => {
    setActiveAuthClient(ports.authClient);
    return () => setActiveAuthClient(null);
  }, [ports.authClient]);

  return (
    <SecurityContext.Provider value={ports}>{children}</SecurityContext.Provider>
  );
}

/**
 * Wires stub or Auth0 SPA security ports for the app tree.
 * Auth0 SDK is dynamically imported so stub mode works without the package linked.
 */
export function SecurityProvider({ children }: { children: ReactNode }) {
  const env = loadPublicEnv();

  if (env.VITE_SECURITY_PROVIDER === "development-stub") {
    return <StubSecurityProvider>{children}</StubSecurityProvider>;
  }

  const domain = env.VITE_AUTH0_DOMAIN;
  const clientId = env.VITE_AUTH0_CLIENT_ID;
  const audience = env.VITE_AUTH0_AUDIENCE;
  const organizationId = env.VITE_AUTH0_ORGANIZATION_ID?.trim() || undefined;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Loading security…
        </div>
      }
    >
      <Auth0SecurityProviderLazy
        domain={domain}
        clientId={clientId}
        audience={audience}
        organizationId={organizationId}
        securityContext={SecurityContext}
      >
        {children}
      </Auth0SecurityProviderLazy>
    </Suspense>
  );
}

/**
 * Redirects unauthenticated Auth0 users to login; stub always passes.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const env = loadPublicEnv();
  const authClient = useAuthClient();
  const [ready, setReady] = useState(
    env.VITE_SECURITY_PROVIDER === "development-stub"
  );
  const [authed, setAuthed] = useState(
    env.VITE_SECURITY_PROVIDER === "development-stub"
  );

  useEffect(() => {
    if (env.VITE_SECURITY_PROVIDER === "development-stub") {
      setReady(true);
      setAuthed(true);
      return;
    }

    let cancelled = false;
    void (async () => {
      const ok = await authClient.isAuthenticated();
      if (cancelled) return;
      if (!ok) {
        await authClient.login({ returnTo: window.location.pathname });
        return;
      }
      setAuthed(true);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [authClient, env.VITE_SECURITY_PROVIDER]);

  if (!ready || !authed) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Signing in…
      </div>
    );
  }

  return <>{children}</>;
}
