import type { AuthClient } from "./auth-client";

/**
 * Process-wide AuthClient used by the HTTP layer.
 * Set by SecurityProvider / Auth0 bridge; stub sets it at provider mount.
 */
let activeAuthClient: AuthClient | null = null;

export function setActiveAuthClient(client: AuthClient | null): void {
  activeAuthClient = client;
}

export function getActiveAuthClient(): AuthClient | null {
  return activeAuthClient;
}
