import { getCustomerModel } from "../../customers/repositories/customer.model";
import type {
  CampaignAudienceCustomer,
  CampaignAudiencePort,
} from "../ports";

/**
 * Resolve campaign audience from Customer register.
 * Match: business unit AND (stage in target OR id in customAudience).
 */
export function createCampaignAudienceAdapter(): CampaignAudiencePort {
  return {
    async findAudience(input): Promise<CampaignAudienceCustomer[]> {
      const Model = getCustomerModel();
      const orClauses: Record<string, unknown>[] = [];
      if (input.stages.length > 0) {
        orClauses.push({ stage: { $in: input.stages } });
      }
      if (input.customerIds.length > 0) {
        orClauses.push({ _id: { $in: input.customerIds } });
      }
      if (orClauses.length === 0) return [];

      const docs = await Model.find({
        organizationId: input.organizationId,
        deletedAt: null,
        businessUnitId: input.businessUnitId,
        $or: orClauses,
      })
        .select(
          "name reference primaryContact primaryEmail secondaryContact secondaryEmail stage"
        )
        .lean();

      return docs.map((doc) => ({
        id: String(doc._id),
        name: doc.name,
        reference: doc.reference,
        primaryContact: doc.primaryContact ?? undefined,
        primaryEmail: doc.primaryEmail,
        secondaryContact: doc.secondaryContact ?? undefined,
        secondaryEmail: doc.secondaryEmail ?? undefined,
      }));
    },
  };
}
