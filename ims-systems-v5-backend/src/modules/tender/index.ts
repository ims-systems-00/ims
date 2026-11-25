/**
 * Tender Autopilot module.
 * Product requirements: frontend/src/assets/ims-os-tender-module/SPECIFICATION.md
 */

export { createTenderModule } from "./routes/tender.routes";
export type { TenderRouterDeps } from "./routes/tender.routes";
export { createTenderService } from "./services/tender.service";
export type { TenderService } from "./services/tender.service";
export {
  createTenderAliceAdapter,
  createTenderEmailAdapter,
  createTenderFilesAdapter,
  createTenderNotificationAdapter,
  createTenderOrgAdapter,
  createTenderUsersAdapter,
} from "./adapters";
export {
  NoOpTenderAliceAdapter,
  NoOpTenderEmailAdapter,
  NoOpTenderFilesAdapter,
  NoOpTenderNotificationAdapter,
  NoOpTenderOrgAdapter,
  NoOpTenderUsersAdapter,
  type TenderAlicePort,
  type TenderEmailPort,
  type TenderFilesPort,
  type TenderNotificationPort,
  type TenderOrgPort,
  type TenderUsersPort,
} from "./ports";
export {
  TENDER_RESOURCE,
  TENDER_QUESTION_STATUSES,
  TENDER_QUESTIONNAIRE_STATUSES,
  TENDER_GATE_VERDICTS,
  DEFAULT_SETTINGS,
} from "./types";
export type {
  TenderQuestionnaire,
  TenderSettings,
  TenderLibraryAnswer,
  TenderRulesModel,
  TenderStats,
  TenderGateResult,
} from "./types";
export {
  draft,
  draftAll,
  libraryHealth,
  stats,
  gate,
  canSubmit,
} from "./lib/tender-rules";
