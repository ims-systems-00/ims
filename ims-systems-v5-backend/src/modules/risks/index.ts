/**
 * Public surface for the Risk Management module.
 * Other modules may import only from this entry.
 */

export { createRiskRouter, createRiskModule } from "./routes/risk.routes";
export type { RiskRouterDeps } from "./routes/risk.routes";
export { createRiskService } from "./services/risk.service";
export type { RiskService } from "./services/risk.service";
export { createRiskRepository } from "./repositories/risk.repository";
export { calculateScore, SCORE_MIN, SCORE_MAX } from "./services/scoring";
export type {
  Risk,
  CreateRiskInput,
  UpdateRiskInput,
  ListRisksQuery,
  PaginatedRisks,
  RiskStats,
  RiskType,
  RiskDisplayStatus,
} from "./types";
export {
  RISK_TYPES,
  RISKS_RESOURCE,
  deriveDisplayStatus,
  riskScoreBand,
  isAssetLinkableRiskType,
} from "./types";
export {
  NoOpRiskNotificationAdapter,
  NoOpRiskTaskAdapter,
  DevAllRisksListScopeAdapter,
} from "./ports";
export type {
  RiskNotificationPort,
  RiskTaskPort,
  RiskListScopePort,
  RiskListScope,
} from "./ports";
