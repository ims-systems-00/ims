/**
 * Relyable rating module (Standard v1.1).
 * Tenant-scoped evidence ledger + score engine for iMS OS.
 */

export { createRelyableModule } from "./routes/relyable.routes";
export type { RelyableRouterDeps } from "./routes/relyable.routes";
export { createRelyableService } from "./services/relyable.service";
export type { RelyableService } from "./services/relyable.service";
export {
  createAslEvidenceCollector,
  createInventoryEvidenceCollector,
  createLiveRelyableCollectors,
  createManagementReviewEvidenceCollector,
  createRelyableOrgAdapter,
  createTrainingEvidenceCollector,
} from "./adapters";
export {
  aggregateAslCriticalApproved,
  aggregateInventorySchedule,
  aggregateTrainingCompetence,
  aggregateTrainingEvidence,
  aggregateTrainingInduction,
  aggregateTrainingLicence,
} from "./lib/collectors-aggregate";
export {
  NoOpRelyableEvidenceCollector,
  NoOpRelyableOrgAdapter,
  type RelyableEvidenceCollectorPort,
  type RelyableOrgPort,
} from "./ports";
export {
  RELYABLE_RESOURCE,
  RELYABLE_ATTRS,
  RELYABLE_FAMILIES,
  RELYABLE_BANDS,
} from "./types";
export type {
  RelyableDashboard,
  RelyableSettings,
  RelyableEvidenceItem,
  RelyableSnapshot,
  RelyableSyncResult,
  EmitEvidenceInput,
} from "./types";
export {
  compute,
  contributions,
  applicability,
  fromSic,
  defaultScope,
  raiseIt,
  nextRisks,
  MODEL_VERSION,
  TYPES,
  DOMAINS,
  BANDS,
} from "./lib/relyable-rules";
