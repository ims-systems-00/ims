/**
 * Organisation Live Dashboard + Stats types (mirror V5 backend contracts).
 * Spec: docs/module-specifications/dashboard.md, stats.md
 */

export const ORGANISATIONAL_STATES = [
  "Safe",
  "Secure",
  "Unsecure",
  "Vulnerable",
  "Hazardous",
] as const;
export type OrganisationalState = (typeof ORGANISATIONAL_STATES)[number];

export type DashboardContext = "organisation" | "functional-unit";

export type DashboardModuleKey =
  | "risks"
  | "incidents"
  | "audits"
  | "ofi"
  | "suppliers"
  | "inventory"
  | "managementReviews"
  | "functionalUnits"
  | "users"
  | "businessPremises"
  | "tasks";

export type DashboardHeadline = {
  organisationalConfidence: number;
  organisationalState: OrganisationalState;
  criticalArea: string | null;
};

export type DashboardCounts = {
  businessUnits: number;
  complianceBodies: number;
  staff: number;
  remoteStaff: number;
  premises: number;
  openTasks: number;
};

export type RiskModuleStats = {
  total: number;
  open: number;
  escalated: number;
  mitigated: number;
  accepted: number;
  byScoreBand: { low: number; medium: number; high: number };
};

export type IncidentModuleStats = {
  total: number;
  open: number;
  escalated: number;
  resolved: number;
  byPriority: { P1: number; P2: number; P3: number; P4: number };
};

export type AuditModuleStats = {
  total: number;
  scheduled: number;
  completed: number;
  upcoming: number;
  byType: { Internal: number; External: number };
};

export type OfiModuleStats = {
  total: number;
  pending: number;
  inProgress: number;
  implemented: number;
};

export type SupplierModuleStats = {
  procurementValue: number;
  supplierIncidents: {
    totalIncidents: number;
    openIncidents: number;
    resolvedIncidents: number;
  };
  supplierCompliance: {
    compliant: number;
    inCompliant: number;
    percentage: number;
    riskLevel: OrganisationalState | string;
  };
};

export type InventoryModuleStats = {
  categories: Array<{
    category: string;
    count: number;
    totalCost: number;
  }>;
  totalCount: number;
  totalCost: number;
};

export type ManagementReviewModuleStats = {
  total: number;
  scheduled: number;
  completed: number;
  upcoming: number;
};

export type DashboardModuleStats = {
  risks: RiskModuleStats | null;
  incidents: IncidentModuleStats | null;
  audits: AuditModuleStats | null;
  ofi: OfiModuleStats | null;
  suppliers: SupplierModuleStats | null;
  inventory: InventoryModuleStats | null;
  managementReviews: ManagementReviewModuleStats | null;
};

export type LiveDashboard = {
  context: DashboardContext;
  accurateAs: string;
  organizationId: string;
  headline: DashboardHeadline;
  counts: DashboardCounts;
  modules: DashboardModuleStats;
  unavailable: DashboardModuleKey[];
  metricScope: "organisation" | "identity-list-scope";
};

export type IncidentResolutionTime = {
  priority: "P1" | "P2" | "P3" | "P4";
  averageHours: number | null;
  count: number;
  alert: boolean;
  targetHours: number | null;
};

export type GlobalStats = {
  accurateAs: string;
  organizationalConfidence: number;
  organizationalState: OrganisationalState;
  criticalArea: string;
  businessUnit: number;
  numberOfStaffs: number;
  numberOfStaffsRemote: number;
  complianceBodies: number;
  incidentResolutionTimes: IncidentResolutionTime[];
};

export type ModuleMaturity = {
  key: string;
  label: string;
  score: 1 | 2 | 3 | 4;
  utilisationPercentage: number;
};

export type BusinessUnitMaturity = {
  functionalUnitId: string;
  name: string;
  modules: ModuleMaturity[];
};

export type DigitalMaturityStats = {
  businessUnitMaturity: BusinessUnitMaturity[];
  organisationalMaturity: ModuleMaturity[];
};

export type ComplianceStats = {
  frameworks: Array<{ name: string; totalPercentage: number }>;
  unavailable: boolean;
};

export type AuditStatsResult = {
  total: number;
  scheduled: number;
  completed: number;
  nonConformitiesByBusinessUnit: Array<{
    businessUnitId: string;
    name: string;
    count: number;
  }>;
};

export type MonthlySeries = {
  months: string[];
  series: Record<string, number[]>;
};

export type RiskStatsResult = {
  months: number;
  byType: MonthlySeries;
  byStatus: MonthlySeries;
  topBusinessFunctions: Array<{
    businessUnitId: string;
    name: string;
    total: number;
  }>;
};

export type IncidentStatsResult = {
  byBusinessFunction: Array<{
    businessUnitId: string;
    name: string;
    total: number;
    resolved: number;
  }>;
};

export type InventoryStatsResult = {
  amounts: number[];
  areas: string[];
  costs: number[];
};

export type SupplierStatsResult = {
  procurementValue: number;
  supplierIncidents: {
    totalIncidents: number;
    openIncidents: number;
    resolvedIncidents: number;
  };
  supplierCompliance: {
    compliant: number;
    inCompliant: number;
    percentage: number;
    riskLevel: OrganisationalState;
  };
};

export type CipStatsResult = {
  byBusinessUnit: Array<{
    businessUnitId: string;
    name: string;
    opportunities: number;
    improvements: number;
  }>;
};

export type CrmStatsResult = {
  totalContractValue: number;
  averageContractValue: number;
  highest: { name: string; value: number; stage: string };
  lowest: { name: string; value: number; stage: string };
  byStage: Array<{ stage: string; count: number; contractValue: number }>;
  invoicesByMonth: Array<{
    year: number;
    month: number;
    label: string;
    count: number;
    amount: number;
  }>;
  invoicesUnavailable: boolean;
};
