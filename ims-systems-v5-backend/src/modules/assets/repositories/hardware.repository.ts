import {
  getHardwareAssetModel,
  type HardwareAssetDocument,
} from "./hardware.model";
import { buildOrgActiveFilter, nextAssetReference, paginate } from "./shared";
import type {
  CreateHardwareInput,
  HardwareAsset,
  ListAssetsQuery,
  Paginated,
  UpdateHardwareInput,
} from "../types";
import { ASSET_REFERENCE_PREFIX } from "../types";

function toDomain(doc: HardwareAssetDocument): HardwareAsset {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    reference: doc.reference,
    name: doc.name,
    tag: doc.tag ?? undefined,
    ownerId: doc.ownerId,
    businessUnitId: doc.businessUnitId ?? undefined,
    categoryId: doc.categoryId ?? undefined,
    assignedDate: doc.assignedDate ?? doc.createdAt,
    returnDate: doc.returnDate ?? undefined,
    destructionDate: doc.destructionDate ?? undefined,
    cost: doc.cost ?? 0,
    createdBy: doc.createdBy,
    deletedAt: doc.deletedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type HardwareAssetRepository = {
  create: (
    organizationId: string,
    createdBy: string,
    input: CreateHardwareInput
  ) => Promise<HardwareAsset>;
  findById: (
    organizationId: string,
    id: string
  ) => Promise<HardwareAsset | null>;
  list: (
    organizationId: string,
    query: ListAssetsQuery
  ) => Promise<Paginated<HardwareAsset>>;
  update: (
    organizationId: string,
    id: string,
    input: UpdateHardwareInput
  ) => Promise<HardwareAsset | null>;
  softDelete: (organizationId: string, id: string) => Promise<boolean>;
  aggregateStats: (
    organizationId: string
  ) => Promise<{ count: number; totalCost: number }>;
};

export function createHardwareAssetRepository(): HardwareAssetRepository {
  const model = getHardwareAssetModel();

  return {
    async create(organizationId, createdBy, input) {
      const created = await model.create({
        organizationId,
        createdBy,
        reference: nextAssetReference(ASSET_REFERENCE_PREFIX.hardware),
        name: input.name,
        tag: input.tag,
        ownerId: input.ownerId,
        businessUnitId: input.businessUnitId,
        categoryId: input.categoryId,
        assignedDate: input.assignedDate ?? new Date(),
        returnDate: input.returnDate,
        destructionDate: input.destructionDate,
        cost: input.cost ?? 0,
        deletedAt: null,
      });
      return toDomain(created);
    },

    async findById(organizationId, id) {
      const doc = await model
        .findOne({ _id: id, organizationId, deletedAt: null })
        .exec();
      return doc ? toDomain(doc) : null;
    },

    async list(organizationId, query) {
      const filter = buildOrgActiveFilter(organizationId, query, {
        searchFields: ["name", "tag", "reference", "ownerId"],
        supportsOwnerFilter: true,
      });
      return paginate(model, filter, query, toDomain);
    },

    async update(organizationId, id, input) {
      const $set: Record<string, unknown> = {};
      const $unset: Record<string, 1> = {};

      if (input.name !== undefined) $set.name = input.name;
      if (input.ownerId !== undefined) $set.ownerId = input.ownerId;
      if (input.tag !== undefined) {
        if (input.tag === null) $unset.tag = 1;
        else $set.tag = input.tag;
      }
      if (input.categoryId !== undefined) {
        if (input.categoryId === null) $unset.categoryId = 1;
        else $set.categoryId = input.categoryId;
      }
      if (input.assignedDate !== undefined) $set.assignedDate = input.assignedDate;
      if (input.returnDate !== undefined) {
        if (input.returnDate === null) $unset.returnDate = 1;
        else $set.returnDate = input.returnDate;
      }
      if (input.destructionDate !== undefined) {
        if (input.destructionDate === null) $unset.destructionDate = 1;
        else $set.destructionDate = input.destructionDate;
      }
      if (input.cost !== undefined) $set.cost = input.cost;

      const update: Record<string, unknown> = {};
      if (Object.keys($set).length > 0) update.$set = $set;
      if (Object.keys($unset).length > 0) update.$unset = $unset;

      const doc = await model
        .findOneAndUpdate(
          { _id: id, organizationId, deletedAt: null },
          update,
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

    async aggregateStats(organizationId) {
      const [row] = await model
        .aggregate<{ count: number; totalCost: number }>([
          { $match: { organizationId, deletedAt: null } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              totalCost: { $sum: "$cost" },
            },
          },
        ])
        .exec();
      return {
        count: row?.count ?? 0,
        totalCost: row?.totalCost ?? 0,
      };
    },
  };
}
