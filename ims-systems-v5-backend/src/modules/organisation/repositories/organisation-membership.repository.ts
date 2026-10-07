import type { OrganisationMembership, OrganisationRole } from "../types";
import {
  getOrganisationMembershipModel,
  type OrganisationMembershipDocument,
} from "./organisation-membership.model";

function toDomain(
  doc: OrganisationMembershipDocument
): OrganisationMembership {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    userId: doc.userId,
    role: doc.role as OrganisationRole,
    jobTitle: doc.jobTitle ?? "",
    createdOn: doc.createdOn,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type OrganisationMembershipRepository = ReturnType<
  typeof createOrganisationMembershipRepository
>;

export function createOrganisationMembershipRepository() {
  const Model = getOrganisationMembershipModel();

  return {
    async create(input: {
      organizationId: string;
      userId: string;
      role: OrganisationRole;
      jobTitle?: string;
      createdOn: Date;
    }): Promise<OrganisationMembership> {
      const doc = await Model.create({
        organizationId: input.organizationId,
        userId: input.userId,
        role: input.role,
        jobTitle: input.jobTitle ?? "",
        createdOn: input.createdOn,
      });
      return toDomain(doc);
    },

    async findByUserAndOrg(
      userId: string,
      organizationId: string
    ): Promise<OrganisationMembership | null> {
      const doc = await Model.findOne({ userId, organizationId }).lean();
      return doc ? toDomain(doc as OrganisationMembershipDocument) : null;
    },

    async listOrganizationIdsForUser(userId: string): Promise<string[]> {
      const docs = await Model.find({ userId }).select("organizationId").lean();
      return docs.map((doc) => String(doc.organizationId));
    },

    async countActiveMembers(organizationId: string): Promise<number> {
      return Model.countDocuments({ organizationId });
    },
  };
}
