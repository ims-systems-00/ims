import { apiRequest } from "@/shared/lib/http";
import type {
  AuditStatsResult,
  CipStatsResult,
  ComplianceStats,
  CrmStatsResult,
  DigitalMaturityStats,
  GlobalStats,
  IncidentStatsResult,
  InventoryStatsResult,
  RiskStatsResult,
  SupplierStatsResult,
} from "../types";

export function getGlobalStats(): Promise<GlobalStats> {
  return apiRequest<GlobalStats>("/stats/global");
}

export function getDigitalMaturityStats(): Promise<DigitalMaturityStats> {
  return apiRequest<DigitalMaturityStats>("/stats/digital-maturity");
}

export function getComplianceStats(): Promise<ComplianceStats> {
  return apiRequest<ComplianceStats>("/stats/compliance");
}

export function getAuditStats(): Promise<AuditStatsResult> {
  return apiRequest<AuditStatsResult>("/stats/audit");
}

export function getRiskStats(months?: number): Promise<RiskStatsResult> {
  const qs =
    months === undefined ? "" : `?months=${encodeURIComponent(String(months))}`;
  return apiRequest<RiskStatsResult>(`/stats/risk${qs}`);
}

export function getIncidentStats(): Promise<IncidentStatsResult> {
  return apiRequest<IncidentStatsResult>("/stats/incident");
}

export function getInventoryStats(): Promise<InventoryStatsResult> {
  return apiRequest<InventoryStatsResult>("/stats/inventory");
}

export function getSupplierStats(): Promise<SupplierStatsResult> {
  return apiRequest<SupplierStatsResult>("/stats/supplier");
}

export function getCipStats(): Promise<CipStatsResult> {
  return apiRequest<CipStatsResult>("/stats/cip");
}

export function getCrmStats(): Promise<CrmStatsResult> {
  return apiRequest<CrmStatsResult>("/stats/crm");
}
