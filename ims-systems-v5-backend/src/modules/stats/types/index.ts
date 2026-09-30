/**
 * Stats domain types — live organisational analytics (not persisted).
 * Spec: docs/module-specifications/stats.md
 */

export const STATS_RESOURCE = "stats";

export const ORGANISATIONAL_STATES = [
  "Safe",
  "Secure",
  "Unsecure",
  "Vulnerable",
  "Hazardous",
] as const;
export type OrganisationalState = (typeof ORGANISATIONAL_STATES)[number];

export const RISK_TYPE_LABELS = [
  "Hardware",
  "Software",
  "People",
  "Premises",
  "Organisation",
  "Clinical",
] as const;

export type StatsDateQuery = {
  startDate?: string;
  endDate?: string;
};

export type StatsRiskQuery = {
  months?: number;
};

export type ResolvedDateRange = {
  startDate: Date;
  endDate: Date;
};

export type IncidentResolutionTime = {
  priority: "P1" | "P2" | "P3" | "P4";
  averageHours: number | null;
  count: number;
  /** True when average meets or exceeds organisation target hours. */
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

export type MaturityScore = 1 | 2 | 3 | 4;

export type ModuleMaturity = {
  key: string;
  label: string;
  score: MaturityScore;
  utilisationPercentage: number;
};

export type BusinessUnitMaturity = {
  functionalUnitId: string;
  name: string;
  modules: ModuleMaturity[];
};

export type DigitalMaturityStats = {
  businessUnitMaturity: BusinessUnitMaturity[];
  /** Weakest BU score per module — returned by V4; UI may ignore. */
  organisationalMaturity: ModuleMaturity[];
};

export type ComplianceFrameworkStat = {
  name: string;
  totalPercentage: number;
};

export type ComplianceStats = {
  frameworks: ComplianceFrameworkStat[];
  /** True when Compliance module is not available in V5 yet. */
  unavailable: boolean;
};

export type NonConformityByUnit = {
  businessUnitId: string;
  name: string;
  count: number;
};

export type AuditStatsResult = {
  total: number;
  scheduled: number;
  completed: number;
  nonConformitiesByBusinessUnit: NonConformityByUnit[];
};

export type MonthlySeries = {
  months: string[];
  series: Record<string, number[]>;
};

export type TopBusinessUnitRisk = {
  businessUnitId: string;
  name: string;
  total: number;
};

export type RiskStatsResult = {
  months: number;
  byType: MonthlySeries;
  byStatus: MonthlySeries;
  topBusinessFunctions: TopBusinessUnitRisk[];
};

export type IncidentByUnit = {
  businessUnitId: string;
  name: string;
  total: number;
  resolved: number;
};

export type IncidentStatsResult = {
  byBusinessFunction: IncidentByUnit[];
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

export type CipByUnit = {
  businessUnitId: string;
  name: string;
  opportunities: number;
  improvements: number;
};

export type CipStatsResult = {
  byBusinessUnit: CipByUnit[];
};

export type ContractValueHighlight = {
  name: string;
  value: number;
  stage: string;
};

export type ContractValueByStage = {
  stage: string;
  count: number;
  contractValue: number;
};

export type InvoiceMonthStat = {
  year: number;
  month: number;
  label: string;
  count: number;
  amount: number;
};

export type CrmStatsResult = {
  totalContractValue: number;
  averageContractValue: number;
  highest: ContractValueHighlight;
  lowest: ContractValueHighlight;
  byStage: ContractValueByStage[];
  invoicesByMonth: InvoiceMonthStat[];
  /** True when invoice stats port is a stub. */
  invoicesUnavailable: boolean;
};
