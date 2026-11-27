/**
 * Public surface for the Live Compliance module.
 * Prototype: frontend/src/assets/ims-os-live-compliance 1.html
 */

export {
  createLiveComplianceModule,
  createComplianceClauseStore,
} from "./routes/live-compliance.routes";
export type { LiveComplianceRouterDeps } from "./routes/live-compliance.routes";
export {
  createLiveComplianceService,
  type LiveComplianceService,
  type RecalcResult,
  type ClauseTransition,
} from "./services/live-compliance.service";
export {
  createLiveSnapshotCollectors,
  createLegalSnapshotCollector,
} from "./adapters/collectors";
export {
  createLiveComplianceNotifier,
  type LiveComplianceNotifier,
} from "./services/live-compliance-notifier";
export {
  createLiveComplianceRuntime,
  type LiveComplianceRuntime,
} from "./services/live-compliance-runtime";
export {
  createLiveStreamHub,
  type LiveStreamHub,
  type LiveStreamEvent,
} from "./services/live-stream-hub";
export type {
  LiveComplianceContact,
  LiveComplianceEmailPort,
  LiveComplianceNotificationsPort,
  LiveComplianceRecipientsPort,
  AdviceCommandHandler,
  AdviceCommandRegistry,
  LiveClauseStorePort,
  SnapshotCollectorPort,
} from "./ports";
export {
  createAliceService,
  extractJson,
  type AliceService,
  type AliceApplyRegistry,
  type AliceModelPort,
} from "./alice/alice.service";
export { ALICE_TASKS, ALICE_TASK_IDS, type AliceTaskId } from "./alice/tasks";
export * from "./types";
