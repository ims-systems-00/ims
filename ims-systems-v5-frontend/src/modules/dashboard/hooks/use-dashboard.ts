import { useQuery, useQueryClient } from "@tanstack/react-query";
import { taskKeys } from "@/modules/tasks/hooks/use-tasks";
import { getOrganisationDashboard } from "../api/dashboard";
import {
  getAuditStats,
  getCipStats,
  getComplianceStats,
  getCrmStats,
  getDigitalMaturityStats,
  getGlobalStats,
  getIncidentStats,
  getInventoryStats,
  getRiskStats,
  getSupplierStats,
} from "../api/stats";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  organisation: () => [...dashboardKeys.all, "organisation"] as const,
};

export const statsKeys = {
  all: ["stats"] as const,
  global: () => [...statsKeys.all, "global"] as const,
  digitalMaturity: () => [...statsKeys.all, "digital-maturity"] as const,
  compliance: () => [...statsKeys.all, "compliance"] as const,
  audit: () => [...statsKeys.all, "audit"] as const,
  risk: (months?: number) => [...statsKeys.all, "risk", months ?? 12] as const,
  incident: () => [...statsKeys.all, "incident"] as const,
  inventory: () => [...statsKeys.all, "inventory"] as const,
  supplier: () => [...statsKeys.all, "supplier"] as const,
  cip: () => [...statsKeys.all, "cip"] as const,
  crm: () => [...statsKeys.all, "crm"] as const,
};

export function useOrganisationDashboardQuery() {
  return useQuery({
    queryKey: dashboardKeys.organisation(),
    queryFn: () => getOrganisationDashboard(),
  });
}

export function useGlobalStatsQuery() {
  return useQuery({
    queryKey: statsKeys.global(),
    queryFn: () => getGlobalStats(),
  });
}

export function useDigitalMaturityStatsQuery() {
  return useQuery({
    queryKey: statsKeys.digitalMaturity(),
    queryFn: () => getDigitalMaturityStats(),
  });
}

export function useComplianceStatsQuery() {
  return useQuery({
    queryKey: statsKeys.compliance(),
    queryFn: () => getComplianceStats(),
  });
}

export function useAuditStatsQuery() {
  return useQuery({
    queryKey: statsKeys.audit(),
    queryFn: () => getAuditStats(),
  });
}

export function useRiskStatsQuery(months = 12) {
  return useQuery({
    queryKey: statsKeys.risk(months),
    queryFn: () => getRiskStats(months),
  });
}

export function useIncidentStatsQuery() {
  return useQuery({
    queryKey: statsKeys.incident(),
    queryFn: () => getIncidentStats(),
  });
}

export function useInventoryStatsQuery() {
  return useQuery({
    queryKey: statsKeys.inventory(),
    queryFn: () => getInventoryStats(),
  });
}

export function useSupplierStatsQuery() {
  return useQuery({
    queryKey: statsKeys.supplier(),
    queryFn: () => getSupplierStats(),
  });
}

export function useCipStatsQuery() {
  return useQuery({
    queryKey: statsKeys.cip(),
    queryFn: () => getCipStats(),
  });
}

export function useCrmStatsQuery() {
  return useQuery({
    queryKey: statsKeys.crm(),
    queryFn: () => getCrmStats(),
  });
}

/** Refetch organisation dashboard, stats panels, and embedded todo list. */
export function useRefreshOrganisationDashboard() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      queryClient.invalidateQueries({ queryKey: statsKeys.all }),
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() }),
    ]);
  };
}
