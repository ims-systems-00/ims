import { useEffect, useState, type ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { loadPublicEnv } from "@/shared/lib/env";
import { useAuthClient } from "./security-context";

/**
 * Protects application routes. Unauthenticated Auth0 users go to `/login`
 * (V5 UI). Stub mode always passes.
 */
export function RequireAuth({ children }: { children?: ReactNode }) {
  const env = loadPublicEnv();
  const authClient = useAuthClient();
  const location = useLocation();
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
      setAuthed(ok);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [authClient, env.VITE_SECURITY_PROVIDER]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Checking session…
      </div>
    );
  }

  if (!authed) {
    const returnTo = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to="/login"
        replace
        state={{ returnTo: returnTo === "/login" ? "/" : returnTo }}
      />
    );
  }

  if (children) return <>{children}</>;
  return <Outlet />;
}
