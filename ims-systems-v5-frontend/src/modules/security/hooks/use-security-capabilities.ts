import { useQuery } from "@tanstack/react-query";
import { loadPublicEnv } from "@/shared/lib/env";
import { getSecurityCapabilities } from "../api/security";

export const securityCapabilityKeys = {
  all: ["security", "capabilities"] as const,
};

/**
 * Nav permission set for the current org session.
 * Stub: treat all permissions as allowed (no API call).
 */
export function useSecurityCapabilitiesQuery(enabled = true) {
  const provider = loadPublicEnv().VITE_SECURITY_PROVIDER;
  const useApi = provider === "auth0-openfga";

  return useQuery({
    queryKey: securityCapabilityKeys.all,
    queryFn: getSecurityCapabilities,
    enabled: enabled && useApi,
    staleTime: 60_000,
  });
}

export function permissionAllowed(
  requiredPermission: string | undefined,
  permissions: string[] | undefined,
  provider: string
): boolean {
  if (!requiredPermission) return true;
  if (provider === "development-stub") return true;
  if (!permissions) return false;
  return permissions.includes(requiredPermission);
}
