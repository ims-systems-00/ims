/**
 * Public surface for Email Campaign (CRM).
 * Other modules may import only from this entry.
 */

export {
  createEmailCampaignRouter,
  createEmailCampaignModule,
} from "./routes/email-campaign.routes";
export type { EmailCampaignRouterDeps } from "./routes/email-campaign.routes";
export { createEmailCampaignService } from "./services/email-campaign.service";
export type { EmailCampaignService } from "./services/email-campaign.service";
export { createCustomerCampaignStatsAdapter } from "./adapters/customer-campaign-stats.adapter";
export { createCampaignAudienceAdapter } from "./adapters/audience.adapter";
export { createCampaignOrganisationAdapter } from "./adapters/organisation.adapter";
export { createCampaignEmailAdapter } from "./adapters/email.adapter";
export {
  NoOpCampaignAudienceAdapter,
  NoOpCampaignEmailAdapter,
  NoOpCampaignOrganisationAdapter,
} from "./ports";
export type {
  EmailCampaign,
  CreateEmailCampaignInput,
  UpdateEmailCampaignInput,
  ListEmailCampaignsQuery,
  PaginatedEmailCampaigns,
  CampaignOverview,
  CampaignDelivery,
  CampaignStatus,
  ManagerCampaignStats,
} from "./types";
export {
  EMAIL_CAMPAIGNS_RESOURCE,
  CAMPAIGN_STATUSES,
} from "./types";
