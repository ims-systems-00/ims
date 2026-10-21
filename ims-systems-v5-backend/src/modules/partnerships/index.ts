/**
 * Public surface for the Partnership Programme.
 * Other modules may import only from this entry.
 */

export {
  createPartnershipModule,
  createPartnershipRouter,
  type PartnershipRouterDeps,
} from "./routes/partnership.routes";
export {
  createPartnershipService,
  type PartnershipService,
} from "./services/partnership.service";
export type {
  PartnershipMembershipPort,
  PartnershipOrganisationPort,
} from "./ports";
export {
  PARTNERSHIP_STATUSES,
  type ApplyPartnershipInput,
  type Partnership,
  type PartnershipDashboard,
  type PartnershipStatus,
  type ReferredOrganisationSummary,
} from "./types";
