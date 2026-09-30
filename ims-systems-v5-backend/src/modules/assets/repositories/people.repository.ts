import {
  getPeopleAssetModel,
  type PeopleAssetDocument,
} from "./people.model";
import { buildOrgActiveFilter, nextAssetReference, paginate } from "./shared";
import type {
  CreatePeopleInput,
  ListAssetsQuery,
  Paginated,
  PeopleAsset,
  UpdatePeopleInput,
} from "../types";
import { ASSET_REFERENCE_PREFIX } from "../types";

function toDomain(doc: PeopleAssetDocument): PeopleAsset {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    reference: doc.reference,
    name: doc.name,
    role: doc.role,
    responsibility: doc.responsibility ?? undefined,
    skill: doc.skill,
    businessUnitId: doc.businessUnitId ?? undefined,
    categoryId: doc.categoryId ?? undefined,
    cost: doc.cost ?? 0,
    createdBy: doc.createdBy,
    deletedAt: doc.deletedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type PeopleAssetRepository = {
  create: (
    organizationId: string,
    createdBy: string,
    input: CreatePeopleInput
  ) => Promise<PeopleAsset>;
  findById: (organizationId: string, id: string) => Promise<PeopleAsset | null>;
  list: (
    organizationId: string,
    query: ListAssetsQuery
  ) => Promise<Paginated<PeopleAsset>>;
  update: (
    organizationId: string,
    id: string,
    input: UpdatePeopleInput
  ) => Promise<PeopleAsset | null>;
  softDelete: (organizationId: string, id: string) => Promise<boolean>;
  aggregateStats: (
    organizationId: string
  ) => Promise<{ count: number; totalCost: number }>;
};

export function createPeopleAssetRepository(): PeopleAssetRepository {
  const model = getPeopleAssetModel();

  return {
    async create(organizationId, createdBy, input) {
      const created = await model.create({
        organizationId,
        createdBy,
        reference: nextAssetReference(ASSET_REFERENCE_PREFIX.people),
        name: input.name,
        role: input.role,
        skill: input.skill,
        responsibility: input.responsibility,
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
        searchFields: ["name", "role", "responsibility", "skill", "reference"],
      });
      return paginate(model, filter, query, toDomain);
    },

    async update(organizationId, id, input) {
      const $set: Record<string, unknown> = {};
      const $unset: Record<string, 1> = {};

      if (input.name !== undefined) $set.name = input.name;
      if (input.role !== undefined) $set.role = input.role;
      if (input.skill !== undefined) $set.skill = input.skill;
      if (input.responsibility !== undefined) {
        if (input.responsibility === null) $unset.responsibility = 1;
        else $set.responsibility = input.responsibility;
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
