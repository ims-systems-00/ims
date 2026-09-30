import {
  getInformationAssetModel,
  type InformationAssetDocument,
} from "./information.model";
import { buildOrgActiveFilter, nextAssetReference, paginate } from "./shared";
import type {
  CreateInformationInput,
  InformationAsset,
  ListAssetsQuery,
  Paginated,
  UpdateInformationInput,
} from "../types";
import { ASSET_REFERENCE_PREFIX } from "../types";

function toDomain(doc: InformationAssetDocument): InformationAsset {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    reference: doc.reference,
    title: doc.title,
    informationInventory: doc.informationInventory ?? undefined,
    ownerId: doc.ownerId ?? undefined,
    storageLocation: doc.storageLocation ?? undefined,
    format: doc.format ?? undefined,
    link: doc.link ?? undefined,
    businessUnitId: doc.businessUnitId ?? undefined,
    categoryId: doc.categoryId ?? undefined,
    cost: doc.cost ?? 0,
    createdBy: doc.createdBy,
    deletedAt: doc.deletedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type InformationAssetRepository = {
  create: (
    organizationId: string,
    createdBy: string,
    input: CreateInformationInput
  ) => Promise<InformationAsset>;
  findById: (
    organizationId: string,
    id: string
  ) => Promise<InformationAsset | null>;
  list: (
    organizationId: string,
    query: ListAssetsQuery
  ) => Promise<Paginated<InformationAsset>>;
  update: (
    organizationId: string,
    id: string,
    input: UpdateInformationInput
  ) => Promise<InformationAsset | null>;
  softDelete: (organizationId: string, id: string) => Promise<boolean>;
  aggregateStats: (
    organizationId: string
  ) => Promise<{ count: number; totalCost: number }>;
};

export function createInformationAssetRepository(): InformationAssetRepository {
  const model = getInformationAssetModel();

  return {
    async create(organizationId, createdBy, input) {
      const created = await model.create({
        organizationId,
        createdBy,
        reference: nextAssetReference(ASSET_REFERENCE_PREFIX.information),
        title: input.title,
        informationInventory: input.informationInventory,
        ownerId: input.ownerId,
        storageLocation: input.storageLocation,
        format: input.format,
        link: input.link,
        businessUnitId: input.businessUnitId,
        categoryId: input.categoryId,
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
        searchFields: [
          "title",
          "informationInventory",
          "storageLocation",
          "format",
          "link",
          "reference",
        ],
        supportsOwnerFilter: true,
      });
      return paginate(model, filter, query, toDomain);
    },

    async update(organizationId, id, input) {
      const $set: Record<string, unknown> = {};
      const $unset: Record<string, 1> = {};

      if (input.title !== undefined) $set.title = input.title;
      if (input.informationInventory !== undefined) {
        if (input.informationInventory === null) $unset.informationInventory = 1;
        else $set.informationInventory = input.informationInventory;
      }
      if (input.ownerId !== undefined) {
        if (input.ownerId === null) $unset.ownerId = 1;
        else $set.ownerId = input.ownerId;
      }
      if (input.storageLocation !== undefined) {
        if (input.storageLocation === null) $unset.storageLocation = 1;
        else $set.storageLocation = input.storageLocation;
      }
      if (input.format !== undefined) {
        if (input.format === null) $unset.format = 1;
        else $set.format = input.format;
      }
      if (input.link !== undefined) {
        if (input.link === null) $unset.link = 1;
        else $set.link = input.link;
      }
      if (input.categoryId !== undefined) {
        if (input.categoryId === null) $unset.categoryId = 1;
        else $set.categoryId = input.categoryId;
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
      return { count: row?.count ?? 0, totalCost: row?.totalCost ?? 0 };
    },
  };
}
