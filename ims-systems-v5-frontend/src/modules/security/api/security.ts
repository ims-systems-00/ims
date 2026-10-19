import { apiRequest } from "@/shared/lib/http";

export type SecurityCapabilities = {
  permissions: string[];
};

export function getSecurityCapabilities(): Promise<SecurityCapabilities> {
  return apiRequest<SecurityCapabilities>("/security/capabilities");
}
