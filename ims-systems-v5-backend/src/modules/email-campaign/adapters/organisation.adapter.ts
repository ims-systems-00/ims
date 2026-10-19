import { createOrganisationRepository } from "../../organisation/repositories/organisation.repository";
import type {
  CampaignOrganisationPort,
  CampaignOrganisationSender,
} from "../ports";

/**
 * Read organisation sender fields for campaign mail headers.
 */
export function createCampaignOrganisationAdapter(): CampaignOrganisationPort {
  const organisations = createOrganisationRepository();
  return {
    async getSender(
      organizationId: string
    ): Promise<CampaignOrganisationSender | null> {
      const org = await organisations.findById(organizationId);
      if (!org) return null;
      return {
        name: org.name,
        officeEmail: org.officeEmail,
        campaignEmail:
          (org as { campaignEmail?: string | null }).campaignEmail ??
          undefined,
      };
    },
  };
}
