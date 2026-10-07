/**
 * KPI Objective frontend types — aligned with `/api/v1/kpi-objectives`.
 * Spec: docs/module-specifications/kpi-objective.md
 */

export const KPI_PRIVACY = ["Organisational", "Business unit"] as const;
export type KpiPrivacy = (typeof KPI_PRIVACY)[number];

export type KpiObjective = {
  id: string;
  organizationId: string;
  reference: string;
  value: string;
  privacy: KpiPrivacy;
  businessUnitId?: string;
  targetValue: number;
  currentValue: number;
  progressPercentage: number;
  unit: string;
  moduleType?: string;
  moduleId?: string;
  createdBy: string;
  createdOn: string;
  updatedBy: string | null;
  updatedOn: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateKpiObjectiveInput = {
  value: string;
  privacy?: KpiPrivacy;
  businessUnitId?: string | null;
};

export type UpdateKpiObjectiveInput = {
  value: string;
};

export type ListKpiObjectivesParams = {
  page?: number;
  pageSize?: number;
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
