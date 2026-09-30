/**
 * Charts domain types — persisted chart-definition registry.
 * Spec: docs/module-specifications/charts.md
 *
 * Charts stores reusable *recipes* (derivation + display config).
 * It does NOT render charts and does NOT execute arbitrary MongoDB pipelines.
 * Live user-visible visualisations come from Dashboard + Stats.
 */

export const CHARTS_RESOURCE = "charts";

/** Controlled source modules a chart definition may reference. */
export const CHART_SOURCE_MODULES = [
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
  "functional-units",
  "notifications",
] as const;
export type ChartSourceModule = (typeof CHART_SOURCE_MODULES)[number];

/** Controlled aggregation operations — recipes only; not executed in Phase 1. */
export const CHART_OPERATIONS = ["count", "group-count", "sum"] as const;
export type ChartOperation = (typeof CHART_OPERATIONS)[number];

/** Controlled grouping dimensions. */
export const CHART_GROUP_BY_DIMENSIONS = [
  "status",
  "type",
  "category",
  "priority",
  "severity",
  "businessUnit",
  "month",
  "quarter",
  "year",
  "stage",
] as const;
export type ChartGroupByDimension = (typeof CHART_GROUP_BY_DIMENSIONS)[number];

/** Optional display chart types for config (frontend-agnostic). */
export const CHART_DISPLAY_TYPES = [
  "bar",
  "line",
  "pie",
  "area",
  "donut",
  "stacked-bar",
] as const;
export type ChartDisplayType = (typeof CHART_DISPLAY_TYPES)[number];

/**
 * Bounded derivation definition (V5 replacement for V4 raw MongoDB pipeline).
 * Describes *what* to summarise — never an executable aggregation pipeline.
 */
export type ChartDerivation = {
  sourceModule: ChartSourceModule;
  operation: ChartOperation;
  groupBy?: ChartGroupByDimension[];
  /** Field name for sum operations — bounded string, not a Mongo path expression. */
  metricField?: string;
  filters?: {
    statuses?: string[];
  };
};

/** Optional presentation/behaviour hints — not library-specific. */
export type ChartConfig = {
  chartType?: ChartDisplayType;
  title?: string;
};

export type Chart = {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  derivation: ChartDerivation;
  /** Optional module category link (spec model field; optional). */
  moduleType?: ChartSourceModule;
  /** Optional linked business record id. */
  moduleId?: string;
  config?: ChartConfig;
  createdBy: string;
  createdOn: Date;
  updatedBy: string | null;
  updatedOn: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateChartInput = {
  name: string;
  description: string;
  derivation: ChartDerivation;
  moduleType?: ChartSourceModule;
  moduleId?: string;
  config?: ChartConfig;
};

export type UpdateChartInput = {
  description?: string;
  derivation?: ChartDerivation;
  moduleType?: ChartSourceModule | null;
  moduleId?: string | null;
  config?: ChartConfig | null;
};

export type ListChartsQuery = {
  page: number;
  pageSize: number;
  search?: string;
  moduleType?: ChartSourceModule;
  sort?: "createdOn" | "name" | "updatedAt";
  sortDir?: "asc" | "desc";
};

export type PaginatedCharts = {
  items: Chart[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export const MAX_CHART_NAME_LENGTH = 120;
export const MAX_CHART_DESCRIPTION_LENGTH = 2000;
export const MAX_CHART_GROUP_BY = 3;
export const MAX_CHART_FILTER_VALUES = 20;
export const MAX_METRIC_FIELD_LENGTH = 64;
