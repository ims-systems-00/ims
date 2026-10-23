/**
 * Public surface for the Invitations module.
 * Other modules may import only from this entry.
 */

export {
  createInvitationModule,
  createInvitationRouter,
  type InvitationRouterDeps,
} from "./routes/invitation.routes";
export {
  createInvitationService,
  type InvitationService,
  type InvitationServiceDeps,
} from "./services/invitation.service";
export {
  createInvitationRepository,
  generateInvitationToken,
  hashInvitationToken,
  type InvitationRepository,
} from "./repositories/invitation.repository";
export { NoOpInvitationEmailAdapter } from "./ports";
export type {
  InvitationEmailPort,
  InvitationMembershipPort,
  InvitationMembershipView,
  InvitationOrganisation,
  InvitationOrganisationPort,
  InvitationUserPort,
  InvitationUserView,
} from "./ports";
export {
  INVITATIONS_RESOURCE,
  INVITATION_TOKEN_TTL_MS,
  ORGANISATION_ROLES,
  type AcceptInvitationResult,
  type CreateInvitationInput,
  type Invitation,
  type InvitationPreview,
  type InvitationStatus,
  type InvitationView,
  type ListInvitationsQuery,
  type OrganisationRole,
  type PaginatedInvitations,
} from "./types";
