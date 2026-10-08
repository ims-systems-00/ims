/**
 * Public surface for the Management Review module.
 * Other modules may import only from this entry.
 *
 * KPI/Objectives live under a separate specification (kpi-objective.md)
 * and are not part of this module surface.
 */

export {
  createManagementReviewRouter,
  createManagementReviewModule,
} from "./routes/management-review.routes";
export type { ManagementReviewRouterDeps } from "./routes/management-review.routes";
export {
  createManagementReviewService,
  buildScheduleDates,
} from "./services/management-review.service";
export type { ManagementReviewService } from "./services/management-review.service";
export { createManagementReviewRepository } from "./repositories/management-review.repository";
export type {
  ManagementReview,
  CreateManagementReviewInput,
  UpdateManagementReviewInput,
  ListManagementReviewsQuery,
  PaginatedManagementReviews,
  ManagementReviewStats,
  ReviewInterval,
  ReviewPrivacy,
  ReviewDisplayStatus,
} from "./types";
export {
  REVIEW_INTERVALS,
  REVIEW_PRIVACY,
  MANAGEMENT_REVIEWS_RESOURCE,
  MANAGEMENT_REVIEWS_SOURCE_MODULE,
  REVIEW_STATUS_OPTIONS,
  INTERVAL_OCCURRENCES,
  deriveDisplayStatus,
} from "./types";
export { createManagementReviewNotificationAdapter } from "./adapters/notification.adapter";
export {
  NoOpManagementReviewNotificationAdapter,
  NoOpManagementReviewCalendarAdapter,
  NoOpManagementReviewTaskAdapter,
  DevAllManagementReviewsListScopeAdapter,
} from "./ports";
export type {
  ManagementReviewNotificationPort,
  ManagementReviewCalendarPort,
  ManagementReviewTaskPort,
  ManagementReviewListScopePort,
  ManagementReviewListScope,
} from "./ports";
