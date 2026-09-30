import { getUnitMembershipModel } from "./unit-membership.model";

export type UnitMembershipRepository = {
  listUserIdsForUnit: (
    organizationId: string,
    functionalUnitId: string
  ) => Promise<string[]>;
  listUnitIdsForUser: (
    organizationId: string,
    userId: string
  ) => Promise<string[]>;
  isMember: (
    organizationId: string,
    functionalUnitId: string,
    userId: string
  ) => Promise<boolean>;
  add: (
    organizationId: string,
    functionalUnitId: string,
    userId: string
  ) => Promise<"added" | "exists">;
  remove: (
    organizationId: string,
    functionalUnitId: string,
    userId: string
  ) => Promise<boolean>;
  countForUnit: (
    organizationId: string,
    functionalUnitId: string
  ) => Promise<number>;
};

export function createUnitMembershipRepository(): UnitMembershipRepository {
  const model = getUnitMembershipModel();

  return {
    async listUserIdsForUnit(organizationId, functionalUnitId) {
      const docs = await model
        .find({ organizationId, functionalUnitId })
        .select("userId")
        .lean()
        .exec();
      return docs.map((doc) => doc.userId);
    },

    async listUnitIdsForUser(organizationId, userId) {
      const docs = await model
        .find({ organizationId, userId })
        .select("functionalUnitId")
        .lean()
        .exec();
      return docs.map((doc) => doc.functionalUnitId);
    },

    async isMember(organizationId, functionalUnitId, userId) {
      const count = await model
        .countDocuments({ organizationId, functionalUnitId, userId })
        .exec();
      return count > 0;
    },

    async add(organizationId, functionalUnitId, userId) {
      try {
        await model.create({ organizationId, functionalUnitId, userId });
        return "added";
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code?: number }).code === 11000
        ) {
          return "exists";
        }
        throw error;
      }
    },

    async remove(organizationId, functionalUnitId, userId) {
      const result = await model
        .deleteOne({ organizationId, functionalUnitId, userId })
        .exec();
      return result.deletedCount === 1;
    },

    async countForUnit(organizationId, functionalUnitId) {
      return model.countDocuments({ organizationId, functionalUnitId }).exec();
    },
  };
}
