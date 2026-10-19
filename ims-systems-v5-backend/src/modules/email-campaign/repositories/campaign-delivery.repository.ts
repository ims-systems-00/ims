/**
 * Campaign Delivery batch persistence.
 */

import type {
  CampaignDelivery,
  CampaignRecipient,
  PaginatedDeliveries,
} from "../types";
import {
  getCampaignDeliveryModel,
  type CampaignDeliveryDocument,
} from "./campaign-delivery.model";

function toDomain(doc: CampaignDeliveryDocument): CampaignDelivery {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    campaignId: doc.campaignId,
    recipients: (doc.recipients ?? []) as CampaignRecipient[],
    total: doc.total ?? 0,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type CampaignDeliveryRepository = ReturnType<
  typeof createCampaignDeliveryRepository
>;

export function createCampaignDeliveryRepository() {
  return {
    async create(input: {
      organizationId: string;
      campaignId: string;
      recipients: CampaignRecipient[];
    }): Promise<CampaignDelivery> {
      const Model = getCampaignDeliveryModel();
      const doc = await Model.create({
        ...input,
        total: input.recipients.length,
      });
      return toDomain(doc.toObject() as CampaignDeliveryDocument);
    },

    async listByCampaign(
      organizationId: string,
      campaignId: string,
      page: number,
      pageSize: number
    ): Promise<PaginatedDeliveries> {
      const Model = getCampaignDeliveryModel();
      const filter = { organizationId, campaignId };
      const skip = (page - 1) * pageSize;
      const [total, docs] = await Promise.all([
        Model.countDocuments(filter),
        Model.find(filter)
          .sort({ createdAt: 1 })
          .skip(skip)
          .limit(pageSize)
          .lean(),
      ]);
      const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
      return {
        items: docs.map((doc) => toDomain(doc as CampaignDeliveryDocument)),
        page,
        pageSize,
        total,
        totalPages,
      };
    },

    async sumRecipients(
      organizationId: string,
      campaignId: string
    ): Promise<number> {
      const Model = getCampaignDeliveryModel();
      const result = await Model.aggregate<{ total: number }>([
        { $match: { organizationId, campaignId } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]);
      return result[0]?.total ?? 0;
    },
  };
}
