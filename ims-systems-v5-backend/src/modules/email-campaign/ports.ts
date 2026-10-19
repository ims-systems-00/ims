import type {
  EnqueueEmailInput,
  EnqueueEmailResult,
} from "../../infrastructure/queue";
import type { CustomerStage } from "../customers/types";

export type CampaignAudienceCustomer = {
  id: string;
  name: string;
  reference: string;
  primaryContact?: string;
  primaryEmail: string;
  secondaryContact?: string;
  secondaryEmail?: string;
};

/**
 * Narrow port to resolve campaign audience from Customer Management.
 */
export type CampaignAudiencePort = {
  findAudience(input: {
    organizationId: string;
    businessUnitId: string;
    stages: CustomerStage[];
    customerIds: string[];
  }): Promise<CampaignAudienceCustomer[]>;
};

export class NoOpCampaignAudienceAdapter implements CampaignAudiencePort {
  async findAudience(): Promise<CampaignAudienceCustomer[]> {
    return [];
  }
}

export type CampaignOrganisationSender = {
  name: string;
  officeEmail: string;
  /** Reply-to for campaigns; falls back to officeEmail when unset. */
  campaignEmail?: string;
};

export type CampaignOrganisationPort = {
  getSender(
    organizationId: string
  ): Promise<CampaignOrganisationSender | null>;
};

export class NoOpCampaignOrganisationAdapter
  implements CampaignOrganisationPort
{
  async getSender(): Promise<CampaignOrganisationSender | null> {
    return null;
  }
}

/**
 * Narrow mail port — bulk / customer-communication delivery.
 */
export type CampaignEmailPort = {
  sendBulk: (input: EnqueueEmailInput) => Promise<EnqueueEmailResult>;
};

export class NoOpCampaignEmailAdapter implements CampaignEmailPort {
  async sendBulk(): Promise<EnqueueEmailResult> {
    return { mode: "disabled" };
  }
}
