/**
 * Public surface for the Activities module.
 * Other modules may import only from this entry.
 *
 * Cross-module automated timeline writes must use ActivitiesApplicationPort /
 * application.recordAutomated — never the repository or Mongoose model.
 */

export {
  createActivitiesRouter,
  createActivitiesModule,
} from "./routes/activities.routes";
export type { ActivitiesRouterDeps } from "./routes/activities.routes";
export { createActivitiesService } from "./services/activities.service";
export type {
  ActivitiesService,
  ActivitiesApplicationPort,
} from "./services/activities.service";
export { createActivityRepository } from "./repositories/activity.repository";
export { createActivityOfiFollowUpAdapter } from "./adapters";
export {
  NoOpActivityOfiFollowUpAdapter,
  DevAllActivitiesListScopeAdapter,
} from "./ports";
export type {
  ActivityOfiFollowUpPort,
  ActivityListScopePort,
  ActivityListScope,
} from "./ports";
export type {
  Activity,
  ActivityExtraLog,
  ActivityMetaInfo,
  ActivityModuleType,
  CreateActivityInput,
  RecordAutomatedActivityInput,
  UpdateActivityInput,
  ListActivitiesQuery,
  PaginatedActivities,
} from "./types";
export {
  ACTIVITIES_RESOURCE,
  ACTIVITY_MODULE_TYPES,
  MAX_ACTIVITY_VALUE_LENGTH,
  MAX_EXTRA_LOGS,
} from "./types";
