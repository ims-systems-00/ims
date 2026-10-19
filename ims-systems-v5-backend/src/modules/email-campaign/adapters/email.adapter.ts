import type { EmailSystem } from "../../../infrastructure/queue";
import type { CampaignEmailPort } from "../ports";
import { NoOpCampaignEmailAdapter } from "../ports";

export function createCampaignEmailAdapter(
  email?: EmailSystem
): CampaignEmailPort {
  if (!email) return new NoOpCampaignEmailAdapter();
  return {
    sendBulk: (input) => email.sendBulk(input),
  };
}
