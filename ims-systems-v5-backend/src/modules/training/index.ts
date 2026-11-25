/**
 * Training & Competency module.
 * Product requirements: frontend/src/assets/ims-os-training-module/SPECIFICATION.md
 */

export { createTrainingModule } from "./routes/training.routes";
export type { TrainingRouterDeps } from "./routes/training.routes";
export { createTrainingService } from "./services/training.service";
export type { TrainingService } from "./services/training.service";
export {
  createTrainingChaseService,
  startTrainingChaseSchedule,
} from "./services/training-chase.service";
export type { TrainingChaseService } from "./services/training-chase.service";
export {
  createTrainingEmailAdapter,
  createTrainingFilesAdapter,
  createTrainingNotificationAdapter,
  createTrainingOrgAdapter,
  createTrainingUsersAdapter,
} from "./adapters";
export {
  NoOpTrainingEmailAdapter,
  NoOpTrainingFilesAdapter,
  NoOpTrainingNotificationAdapter,
  NoOpTrainingOrgAdapter,
  NoOpTrainingUsersAdapter,
  type TrainingEmailPort,
  type TrainingFilesPort,
  type TrainingNotificationPort,
  type TrainingOrgPort,
  type TrainingUsersPort,
} from "./ports";
export {
  TRAINING_RESOURCE,
  TRAINING_EVIDENCE_TYPES,
  TRAINING_RESULTS,
  TRAINING_PERSON_STATUSES,
  TRAINING_SESSION_STATUSES,
  TRAINING_RSVP_STATUSES,
  TRAINING_CELL_STATES,
  TRAINING_REQUIREMENT_LEVELS,
} from "./types";
export type {
  TrainingCompetency,
  TrainingRole,
  TrainingPerson,
  TrainingRecord,
  TrainingSession,
  TrainingSettings,
  TrainingOverview,
  TrainingModel,
  CompetentResult,
} from "./types";
export {
  DEFAULT_SETTINGS,
  DEFAULT_COMPETENCIES,
  DEFAULT_ROLES,
  matrixRow,
  gaps,
  plan,
  readiness,
  isCompetent,
  matrixCsv,
  personSummary,
  validatePerson,
  validateCompetencyInput,
  validateSettingsInput,
  validateRecord,
  remindersDue,
} from "./lib/training-rules";
