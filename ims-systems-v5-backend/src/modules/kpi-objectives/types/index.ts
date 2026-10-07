/**
 * KPI Objective domain types.
 * Spec: docs/module-specifications/kpi-objective.md
 *
 * Central register of textual KPI/objective statements (org or business-unit).
 * Not supplier embedded KPI notes. Not Management Review meetings.
 */

export const KPI_OBJECTIVES_RESOURCE = "kpi-objectives";

export const KPI_PRIVACY = ["Organisational", "Business unit"] as const;
export type KpiPrivacy = (typeof KPI_PRIVACY)[number];

/**
 * Optional module link targets — allowlisted; unused by current KPI UI.
 * Kept for schema parity with V4 / future workflows.
 */
export const KPI_MODULE_TYPES = [
  "risks",
  "incidents",
  "audits",
  "tasks",
  "ofi",
  "suppliers",
  "customers",
  "assets",
  "management-reviews",
  "ims-projects",
  "documents",
] as const;
export type KpiModuleType = (typeof KPI_MODULE_TYPES)[number];

export type KpiObjective = {
  id: string;
  organizationId: string;
  reference: string;
  /** Free-text KPI/objective statement. */
  value: string;
  privacy: KpiPrivacy;
  /** Owning business unit when privacy is Business unit; absent for Organisational. */
  businessUnitId?: string;
  targetValue: number;
  currentValue: number;
  progressPercentage: number;
  unit: string;
  moduleType?: KpiModuleType;
  moduleId?: string;
  createdBy: string;
  createdOn: Date;
  updatedBy: string | null;
  updatedOn: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateKpiObjectiveInput = {
  value: string;
  privacy?: KpiPrivacy;
  businessUnitId?: string | null;
  targetValue?: number;
  unit?: string;
  moduleType?: KpiModuleType;
  moduleId?: string | null;
};

export type UpdateKpiObjectiveInput = {
  value?: string;
  privacy?: KpiPrivacy;
  businessUnitId?: string | null;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  moduleType?: KpiModuleType | null;
  moduleId?: string | null;
};

export type ListKpiObjectivesQuery = {
  page: number;
  pageSize: number;
  search?: string;
  privacy?: KpiPrivacy;
  businessUnitId?: string;
  sort?: "createdOn" | "reference" | "updatedAt";
  sortDir?: "asc" | "desc";
};

export type PaginatedKpiObjectives = {
  items: KpiObjective[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

/** Compact projection for Audit / Dashboard consumers. */
export type KpiObjectiveStatement = {
  id: string;
  reference: string;
  value: string;
  privacy: KpiPrivacy;
  businessUnitId?: string;
  createdBy: string;
  createdOn: Date;
};

export const MAX_KPI_VALUE_LENGTH = 4000;
export const MAX_KPI_UNIT_LENGTH = 100;
