/**
 * Public surface for the Leaves (Staff Wallet) module.
 * Other modules may import only from this entry.
 */

export {
  createLeavesRouter,
  createLeavesModule,
} from "./routes/leaves.routes";
export type { LeavesRouterDeps } from "./routes/leaves.routes";
export { createLeavesService } from "./services/leaves.service";
export type {
  LeavesService,
  LeavesServiceDeps,
} from "./services/leaves.service";
export { createLeaveRepository } from "./repositories/leave.repository";
export type { LeaveRepository } from "./repositories/leave.repository";
export {
  calculateWorkingDays,
  listPublicHolidays,
} from "./services/working-days";
export { createLeavesNotificationAdapter } from "./adapters/notification.adapter";
export { createLeavesMembershipAdapter } from "./adapters/membership.adapter";
export {
  NoOpLeavesNotificationAdapter,
  NoOpLeavesCalendarAdapter,
  NoOpLeavesMembershipAdapter,
} from "./ports";
export type {
  LeavesNotificationPort,
  LeavesCalendarPort,
  LeavesMembershipPort,
  LeavesMemberProfile,
} from "./ports";
export type {
  Leave,
  LeaveType,
  LeaveStatus,
  LeaveDecision,
  LeaveSubmission,
  LeaveCountry,
  CreateLeaveInput,
  UpdateLeaveInput,
  EvaluateLeaveInput,
  ListLeavesQuery,
  PaginatedLeaves,
  LeaveHoliday,
  LeaveHolidaysResult,
} from "./types";
export {
  LEAVES_RESOURCE,
  LEAVE_TYPES,
  LEAVE_STATUSES,
  LEAVE_DAY_FRACTIONS,
} from "./types";
