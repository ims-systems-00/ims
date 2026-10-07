/**
 * Public surface for the Activities (timeline) frontend module.
 * Spec: docs/module-specifications/activity.md
 *
 * No standalone page — embed ActivityTimeline in parent record sheets.
 */

export { ActivityTimeline } from "./components/activity-timeline";
export { SheetPanelTabs } from "./components/sheet-panel-tabs";
export type { SheetPanelTab } from "./components/sheet-panel-tabs";
export {
  listActivities,
  createActivity,
  updateActivity,
  deleteActivity,
} from "./api/activities";
export {
  useActivitiesQuery,
  useCreateActivityMutation,
  useUpdateActivityMutation,
  useDeleteActivityMutation,
  activityKeys,
} from "./hooks/use-activities";
export type {
  Activity,
  ActivityModuleType,
  CreateActivityInput,
  UpdateActivityInput,
  ListActivitiesParams,
  PaginatedActivities,
} from "./types";
export { ACTIVITY_MODULE_TYPES, MAX_ACTIVITY_VALUE_LENGTH } from "./types";
