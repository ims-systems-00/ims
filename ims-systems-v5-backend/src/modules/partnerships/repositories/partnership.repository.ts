import {
  getPartnershipModel,
  type PartnershipDocument,
} from "./partnership.model";
import type {
  ApplyPartnershipInput,
  Partnership,
} from "../types";

function toDomain(doc: PartnershipDocument): Partnership {
  return {
    id: String(doc._id),
    userId: doc.userId,
    organizationId: doc.organizationId,
    serviceProvision: doc.serviceProvision,
    customerReach: doc.customerReach,
    website: doc.website,
    standards: doc.standards,
    description: doc.description,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type PartnershipRepository = ReturnType<
  typeof createPartnershipRepository
>;

export function createPartnershipRepository() {
  const Model = getPartnershipModel();

  return {
    async create(input: {
      userId: string;
      organizationId: string;
      data: ApplyPartnershipInput;
    }): Promise<Partnership> {
      const doc = await Model.create({
        userId: input.userId,
        organizationId: input.organizationId,
        serviceProvision: input.data.serviceProvision,
        customerReach: input.data.customerReach,
        website: input.data.website,
        standards: input.data.standards,
        description: input.data.description,
        status: "Pending",
      });
      return toDomain(doc as PartnershipDocument);
    },

    async markAccepted(id: string): Promise<Partnership | null> {
      const doc = await Model.findByIdAndUpdate(
        id,
        { status: "iMS Accepted" },
        { new: true }
      ).lean();
      return doc ? toDomain(doc as PartnershipDocument) : null;
    },

    async findById(id: string): Promise<Partnership | null> {
      const doc = await Model.findOne({ _id: id, deletedAt: null }).lean();
      return doc ? toDomain(doc as PartnershipDocument) : null;
    },

    async findForUserOrOrg(
      userId: string,
      organizationId: string
    ): Promise<Partnership | null> {
      const doc = await Model.findOne({
        deletedAt: null,
        $or: [{ userId }, { organizationId }],
      }).lean();
      return doc ? toDomain(doc as PartnershipDocument) : null;
    },

    async listByUser(userId: string): Promise<Partnership[]> {
      const docs = await Model.find({ userId, deletedAt: null })
        .sort({ createdAt: -1 })
        .lean();
      return docs.map((doc) => toDomain(doc as PartnershipDocument));
    },

    async findAcceptedByUser(userId: string): Promise<Partnership | null> {
      const doc = await Model.findOne({
        userId,
        status: "iMS Accepted",
        deletedAt: null,
      }).lean();
      return doc ? toDomain(doc as PartnershipDocument) : null;
    },
  };
}
