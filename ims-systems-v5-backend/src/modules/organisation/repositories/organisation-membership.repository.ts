import type {
  MembershipDayHours,
  MembershipWorkShift,
  OrganisationMembership,
  OrganisationRole,
  UpdateMembershipEmploymentInput,
} from "../types";
import {
  getOrganisationMembershipModel,
  type OrganisationMembershipDocument,
} from "./organisation-membership.model";

function dayHours(
  value: { start?: string | null; end?: string | null } | null | undefined
): MembershipDayHours {
  if (!value?.start || !value?.end) return null;
  return { start: String(value.start), end: String(value.end) };
}

function workShiftFromDoc(
  value: OrganisationMembershipDocument["workShift"] | null | undefined
): MembershipWorkShift {
  return {
    timezone: value?.timezone?.trim() || "UTC",
    monday: dayHours(value?.monday),
    tuesday: dayHours(value?.tuesday),
    wednesday: dayHours(value?.wednesday),
    thursday: dayHours(value?.thursday),
    friday: dayHours(value?.friday),
    saturday: dayHours(value?.saturday),
    sunday: dayHours(value?.sunday),
  };
}

function toDomain(
  doc: OrganisationMembershipDocument
): OrganisationMembership {
  const country = doc.country as { name?: string; code?: string } | undefined;
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    userId: doc.userId,
    role: doc.role as OrganisationRole,
    jobTitle: doc.jobTitle?.trim() ? doc.jobTitle : "Not set",
    workLocationType:
      doc.workLocationType === "Remote" ? "Remote" : "On-site",
    salary: typeof doc.salary === "number" ? doc.salary : 0,
    country: {
      name: country?.name?.trim() || "United Kingdom",
      code: country?.code?.trim() || "GB",
    },
    leaveDaysEntitled:
      typeof doc.leaveDaysEntitled === "number" ? doc.leaveDaysEntitled : 0,
    toilBalance: typeof doc.toilBalance === "number" ? doc.toilBalance : 0,
    workShift: workShiftFromDoc(doc.workShift),
    complianceToolkits: [...(doc.complianceToolkits ?? [])],
    lineManagerIds: [...(doc.lineManagerIds ?? [])],
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
        jobTitle: input.jobTitle ?? "Not set",
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

    async listByLineManager(
      organizationId: string,
      managerId: string
    ): Promise<OrganisationMembership[]> {
      const docs = await Model.find({
        organizationId,
        lineManagerIds: managerId,
      }).lean();
      return docs.map((doc) =>
        toDomain(doc as OrganisationMembershipDocument)
      );
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

    /** Replace line managers used by Leaves approval routing. */
    async setLineManagerIds(
      userId: string,
      organizationId: string,
      lineManagerIds: string[]
    ): Promise<OrganisationMembership | null> {
      return this.updateEmployment(userId, organizationId, { lineManagerIds });
    },

    /** Update employment / HR fields (V4 MembershipForm parity). */
    async updateEmployment(
      userId: string,
      organizationId: string,
      input: UpdateMembershipEmploymentInput
    ): Promise<OrganisationMembership | null> {
      const $set: Record<string, unknown> = {};
      if (input.jobTitle !== undefined) $set.jobTitle = input.jobTitle.trim();
      if (input.workLocationType !== undefined) {
        $set.workLocationType = input.workLocationType;
      }
      if (input.salary !== undefined) $set.salary = input.salary;
      if (input.country !== undefined) {
        $set.country = {
          name: input.country.name.trim(),
          code: input.country.code.trim().toUpperCase(),
        };
      }
      if (input.leaveDaysEntitled !== undefined) {
        $set.leaveDaysEntitled = input.leaveDaysEntitled;
      }
      if (input.lineManagerIds !== undefined) {
        $set.lineManagerIds = [
          ...new Set(input.lineManagerIds.filter(Boolean)),
        ];
      }
      if (input.workShift !== undefined) $set.workShift = input.workShift;

      if (Object.keys($set).length === 0) {
        return this.findByUserAndOrg(userId, organizationId);
      }

      const doc = await Model.findOneAndUpdate(
        { userId, organizationId },
        { $set },
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
