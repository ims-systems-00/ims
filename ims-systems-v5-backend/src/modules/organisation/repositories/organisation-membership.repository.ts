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
    complianceToolkits: [...(doc.complianceToolkits ?? [])],
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

    async listByOrganization(
      organizationId: string
    ): Promise<OrganisationMembership[]> {
      const docs = await Model.find({ organizationId }).lean();
      return docs.map((doc) =>
        toDomain(doc as OrganisationMembershipDocument)
      );
    },

    async listOrganizationIdsForUser(userId: string): Promise<string[]> {
      const docs = await Model.find({ userId }).select("organizationId").lean();
      return docs.map((doc) => String(doc.organizationId));
    },

    async countActiveMembers(organizationId: string): Promise<number> {
      return Model.countDocuments({ organizationId });
    },

    /** Replace a member's granted compliance toolkits (U-07). */
    async setComplianceToolkits(
      userId: string,
      organizationId: string,
      complianceToolkits: string[]
    ): Promise<OrganisationMembership | null> {
      const doc = await Model.findOneAndUpdate(
        { userId, organizationId },
        { $set: { complianceToolkits: [...new Set(complianceToolkits)] } },
        { returnDocument: "after" }
      ).lean();
      return doc ? toDomain(doc as OrganisationMembershipDocument) : null;
    },

    /** Grant one toolkit to a member if not already granted (N-10). */
    async addComplianceToolkit(
      userId: string,
      organizationId: string,
      toolkitName: string
    ): Promise<void> {
      await Model.updateOne(
        { userId, organizationId },
        { $addToSet: { complianceToolkits: toolkitName } }
      );
    },

    /** All memberships (OpenFGA tuple backfill). */
    async listAll(): Promise<OrganisationMembership[]> {
      const docs = await Model.find({}).lean();
      return docs.map((doc) =>
        toDomain(doc as OrganisationMembershipDocument)
      );
    },
  };
}
