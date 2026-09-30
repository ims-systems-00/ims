/**
 * Public surface for the Charts module.
 * Other modules may import only from this entry.
 *
 * Charts is a persisted definition registry — not Dashboard/Stats visualisation.
 * Do not import ChartModel / ChartRepository from outside this module.
 */

export {
  createChartsRouter,
  createChartsModule,
} from "./routes/charts.routes";
export type { ChartsRouterDeps } from "./routes/charts.routes";
export { createChartsService } from "./services/charts.service";
export type {
  ChartsService,
  ChartsApplicationPort,
} from "./services/charts.service";
export { createChartRepository } from "./repositories/chart.repository";
export type {
  Chart,
  ChartDerivation,
  ChartConfig,
  CreateChartInput,
  UpdateChartInput,
  ListChartsQuery,
  PaginatedCharts,
  ChartSourceModule,
  ChartOperation,
  ChartDisplayType,
} from "./types";
export {
  CHARTS_RESOURCE,
  CHART_SOURCE_MODULES,
  CHART_OPERATIONS,
  CHART_GROUP_BY_DIMENSIONS,
  CHART_DISPLAY_TYPES,
} from "./types";
