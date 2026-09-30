import { apiRequest } from "@/shared/lib/http";
import type { LiveDashboard } from "../types";

export function getOrganisationDashboard(): Promise<LiveDashboard> {
  return apiRequest<LiveDashboard>("/dashboard/organisation");
}
