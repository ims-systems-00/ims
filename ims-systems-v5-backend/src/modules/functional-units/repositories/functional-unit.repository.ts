import {
  getFunctionalUnitModel,
  type FunctionalUnitDocument,
} from "./functional-unit.model";
import type {
  AccessType,
  CreateFunctionalUnitInput,
  FunctionalUnit,
  ListFunctionalUnitsQuery,
  PaginatedFunctionalUnits,
  UpdateFunctionalUnitInput,
} from "../types";

function toDomain(doc: FunctionalUnitDocument): FunctionalUnit {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    reference: doc.reference,
    name: doc.name,
    accessType: doc.accessType as AccessType,
    responsibility: doc.responsibility,
    operatingLocation: doc.operatingLocation ?? undefined,
    standards: doc.standards ?? undefined,
    totalMembers: doc.totalMembers ?? 0,
    policyId: doc.policyId ?? undefined,
    complianceToolkits: doc.complianceToolkits ?? [],
    userLicences: {
      superUser: {
        allocated: doc.userLicences?.superUser?.allocated ?? 0,
        used: doc.userLicences?.superUser?.used ?? 0,
      },
      hosUser: {
        allocated: doc.userLicences?.hosUser?.allocated ?? 0,
        used: doc.userLicences?.hosUser?.used ?? 0,
      },
      basicUser: {
        allocated: doc.userLicences?.basicUser?.allocated ?? 0,
        used: doc.userLicences?.basicUser?.used ?? 0,
      },
      auditorUser: {
        allocated: doc.userLicences?.auditorUser?.allocated ?? 0,
        used: doc.userLicences?.auditorUser?.used ?? 0,
      },
    },
    isSystemDefault: Boolean(doc.isSystemDefault),
    deletedAt: doc.deletedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type FunctionalUnitRepository = {
  create: (
    organizationId: string,
    input: CreateFunctionalUnitInput & {
      reference: string;
      isSystemDefault?: boolean;
    }
  ) => Promise<FunctionalUnit>;
  findById: (
    organizationId: string,
    id: string
  ) => Promise<FunctionalUnit | null>;
  list: (
    organizationId: string,
    query: ListFunctionalUnitsQuery
  ) => Promise<PaginatedFunctionalUnits>;
  update: (
    organizationId: string,
    id: string,
    input: UpdateFunctionalUnitInput
  ) => Promise<FunctionalUnit | null>;
  softDelete: (organizationId: string, id: string) => Promise<boolean>;
  setTotalMembers: (
    organizationId: string,
    id: string,
    totalMembers: number
  ) => Promise<FunctionalUnit | null>;
  attachPolicy: (
    organizationId: string,
    id: string,
    policyId: string
  ) => Promise<FunctionalUnit | null>;
  assignComplianceToolkits: (
    organizationId: string,
    id: string,
    complianceToolkits: string[]
  ) => Promise<FunctionalUnit | null>;
};

export function createFunctionalUnitRepository(): FunctionalUnitRepository {
  const model = getFunctionalUnitModel();

  return {
    async create(organizationId, input) {
      const created = await model.create({
        organizationId,
        reference: input.reference,
        name: input.name,
        accessType: input.accessType,
        responsibility: input.responsibility,
        operatingLocation: input.operatingLocation,
        standards: input.standards,
        isSystemDefault: input.isSystemDefault ?? false,
        deletedAt: null,
      });
      return toDomain(created);
    },

    async findById(organizationId, id) {
      const doc = await model
        .findOne({
          _id: id,
          organizationId,
          deletedAt: null,
        })
        .exec();
      return doc ? toDomain(doc) : null;
    },

    async list(organizationId, query) {
      const filter: Record<string, unknown> = {
        organizationId,
        deletedAt: null,
      };

      if (query.accessType) {
        filter.accessType = query.accessType;
      }

      if (query.search && query.search.length > 0) {
        const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "i");
        filter.$or = [
          { name: regex },
          { responsibility: regex },
          { operatingLocation: regex },
          { standards: regex },
          { reference: regex },
        ];
      }

      const skip = (query.page - 1) * query.pageSize;
      const [items, total] = await Promise.all([
        model
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(query.pageSize)
          .exec(),
        model.countDocuments(filter).exec(),
      ]);

      return {
        items: items.map(toDomain),
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize) || 1),
      };
    },

    async update(organizationId, id, input) {
      const doc = await model
        .findOneAndUpdate(
          { _id: id, organizationId, deletedAt: null },
          { $set: input },
          { returnDocument: "after" }
        )
        .exec();
      return doc ? toDomain(doc) : null;
    },

    async softDelete(organizationId, id) {
      const result = await model
        .updateOne(
          { _id: id, organizationId, deletedAt: null },
          { $set: { deletedAt: new Date() } }
        )
        .exec();
      return result.modifiedCount === 1;
    },

    async setTotalMembers(organizationId, id, totalMembers) {
      const doc = await model
        .findOneAndUpdate(
          { _id: id, organizationId, deletedAt: null },
          { $set: { totalMembers } },
          { returnDocument: "after" }
        )
        .exec();
      return doc ? toDomain(doc) : null;
    },

    async attachPolicy(organizationId, id, policyId) {
      const doc = await model
        .findOneAndUpdate(
          { _id: id, organizationId, deletedAt: null },
          { $set: { policyId } },
          { returnDocument: "after" }
        )
        .exec();
      return doc ? toDomain(doc) : null;
    },

    async assignComplianceToolkits(organizationId, id, complianceToolkits) {
      const doc = await model
        .findOneAndUpdate(
          { _id: id, organizationId, deletedAt: null },
          { $set: { complianceToolkits } },
          { returnDocument: "after" }
        )
        .exec();
      return doc ? toDomain(doc) : null;
    },
  };
}
