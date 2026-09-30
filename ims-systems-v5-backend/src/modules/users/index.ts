/**
 * Public surface for the Users module.
 * Other modules may import only from this entry.
 */

export { createUsersRouter, createUsersModule } from "./routes/users.routes";
export type { UsersRouterDeps } from "./routes/users.routes";
export { createUsersService } from "./services/users.service";
export type { UsersService } from "./services/users.service";
export { createUserRepository } from "./repositories/user.repository";
export type { UserRepository } from "./repositories/user.repository";
export {
  DevAllActiveUsersMembershipAdapter,
  NoOpComplianceToolkitAdapter,
  NoOpOwnershipIntegrityAdapter,
  NoOpSessionAdapter,
  NoOpUserNotificationAdapter,
} from "./ports";
export type {
  ComplianceToolkitPort,
  MembershipLookupPort,
  OwnershipIntegrityPort,
  SessionPort,
  UserNotificationPort,
} from "./ports";
export { createFunctionalUnitUsersAdapter } from "./adapters/functional-unit-users.adapter";
export type { CreateFunctionalUnitUsersAdapterDeps } from "./adapters/functional-unit-users.adapter";
export type {
  FunctionalUnitUsersPort,
  UnitMemberView,
} from "./functional-unit-users.port";
export { createUnitMembershipRepository } from "./repositories/unit-membership.repository";
export type {
  User,
  UserPublic,
  UserWithMembership,
  ProvisionUserInput,
  ListUsersQuery,
  PaginatedUsers,
  OrgMembershipView,
  OwnershipCheckResult,
} from "./types";
export {
  USER_TYPES,
  SYSTEM_ACCESS_STATUSES,
  USERS_RESOURCE,
} from "./types";
