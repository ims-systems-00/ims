import { createOrganisationRepository } from "../../organisation/repositories/organisation.repository";
import type { RelyableOrgPort } from "../ports";

export function createRelyableOrgAdapter(): RelyableOrgPort {
  const organisations = createOrganisationRepository();
  return {
    async getLegalName(organizationId: string) {
      try {
        const org = await organisations.findById(organizationId);
        return org?.name?.trim() || null;
      } catch {
        return null;
      }
    },
  };
}

export {
  createAslEvidenceCollector,
  createInventoryEvidenceCollector,
  createLiveRelyableCollectors,
  createManagementReviewEvidenceCollector,
  createTrainingEvidenceCollector,
} from "./live-collectors";
