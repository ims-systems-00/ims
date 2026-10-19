import type { CustomerCampaignStatsPort } from "../../customers/ports";
import type { EmailCampaignService } from "../services/email-campaign.service";

/**
 * Live MY CRM campaign metrics from Email Campaign module.
 */
export function createCustomerCampaignStatsAdapter(
  service: Pick<EmailCampaignService, "getManagerStats">
): CustomerCampaignStatsPort {
  return {
    async getManagerCampaignStats(input) {
      return service.getManagerStats(input.organizationId, input.managerId);
    },
  };
}
