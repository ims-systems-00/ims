/**
 * Backend-backed AuthzClient for auth0-openfga (M7).
 * Delegates checks to POST /security/check so OpenFGA stays server-side.
 */

import { apiRequest } from "@/shared/lib/http";
import type { AuthzClient, ClientAuthorizationCheck } from "./authz-client";

export class ApiAuthzClient implements AuthzClient {
  async allow(check: ClientAuthorizationCheck): Promise<boolean> {
    const organizationId =
      check.organizationId ?? check.identity.organizationId ?? undefined;
    const result = await apiRequest<{ allowed: boolean }>("/security/check", {
      method: "POST",
      body: {
        action: check.action,
        resourceType: check.resourceType,
        ...(check.resourceId ? { resourceId: check.resourceId } : {}),
        ...(organizationId ? { organizationId } : {}),
      },
    });
    return result.allowed;
  }
}
