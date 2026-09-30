/**
 * Business Premise persistence.
 */

import type {
  BusinessPremise,
  ListBusinessPremisesQuery,
  PaginatedBusinessPremises,
} from "../types";
import {
  getBusinessPremiseModel,
  type BusinessPremiseDocument,
} from "./business-premise.model";

function toDomain(doc: BusinessPremiseDocument): BusinessPremise {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    reference: doc.reference ?? "",
    name: doc.name,
    location: doc.location,
    address: doc.address,
    functionalUnitIds: [...(doc.functionalUnitIds ?? [])],
    createdBy: doc.createdBy,
    createdOn: doc.createdOn,
    updatedBy: doc.updatedBy ?? null,
    updatedOn: doc.updatedOn ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type PersistBusinessPremiseCreate = {
  name: string;
  location: string;
  address: string;
  functionalUnitIds: string[];
  createdBy: string;
  createdOn: Date;
  reference?: string;
};

export type PersistBusinessPremisePatch = {
  name?: string;
  location?: string;
  address?: string;
  functionalUnitIds?: string[];
  updatedBy: string;
  updatedOn: Date;
};

export type BusinessPremiseRepository = {
  create: (
    organizationId: string,
    input: PersistBusinessPremiseCreate
  ) => Promise<BusinessPremise>;
  findById: (
    organizationId: string,
    id: string
  ) => Promise<BusinessPremise | null>;
  list: (
    organizationId: string,
    query: ListBusinessPremisesQuery
  ) => Promise<PaginatedBusinessPremises>;
  update: (
    organizationId: string,
    id: string,
    patch: PersistBusinessPremisePatch
  ) => Promise<BusinessPremise | null>;
  hardDelete: (organizationId: string, id: string) => Promise<boolean>;
  attachFunctionalUnit: (
    organizationId: string,
    id: string,
    functionalUnitId: string,
    actorId: string
  ) => Promise<BusinessPremise | null>;
};

export function createBusinessPremiseRepository(): BusinessPremiseRepository {
  const Model = getBusinessPremiseModel();

  return {
    async create(organizationId, input) {
      const doc = await Model.create({
        organizationId,
        reference: input.reference ?? "",
        name: input.name,
        location: input.location,
        address: input.address,
        functionalUnitIds: input.functionalUnitIds,
        createdBy: input.createdBy,
        createdOn: input.createdOn,
        updatedBy: null,
        updatedOn: null,
      });
      return toDomain(doc);
    },

    async findById(organizationId, id) {
      const doc = await Model.findOne({ _id: id, organizationId }).exec();
      return doc ? toDomain(doc) : null;
    },

    async list(organizationId, query) {
      const filter: Record<string, unknown> = { organizationId };

      if (query.search?.trim()) {
        const escaped = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "i");
        filter.$or = [
          { reference: regex },
          { name: regex },
          { address: regex },
          { location: regex },
        ];
      }

      const sortField = query.sort ?? "createdOn";
      const sortDir = query.sortDir === "asc" ? 1 : -1;
      const skip = (query.page - 1) * query.pageSize;

      const [total, docs] = await Promise.all([
        Model.countDocuments(filter),
        Model.find(filter)
          .sort({ [sortField]: sortDir })
          .skip(skip)
          .limit(query.pageSize)
          .exec(),
      ]);

      const totalPages = total === 0 ? 0 : Math.ceil(total / query.pageSize);

      return {
        items: docs.map(toDomain),
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages,
      };
    },

    async update(organizationId, id, patch) {
      const update: Record<string, unknown> = {
        updatedBy: patch.updatedBy,
        updatedOn: patch.updatedOn,
      };
      if (patch.name !== undefined) update.name = patch.name;
      if (patch.location !== undefined) update.location = patch.location;
      if (patch.address !== undefined) update.address = patch.address;
      if (patch.functionalUnitIds !== undefined) {
        update.functionalUnitIds = patch.functionalUnitIds;
      }

      const doc = await Model.findOneAndUpdate(
        { _id: id, organizationId },
        { $set: update },
        { returnDocument: "after" }
      ).exec();
      return doc ? toDomain(doc) : null;
    },

    async hardDelete(organizationId, id) {
      const result = await Model.deleteOne({ _id: id, organizationId }).exec();
      return result.deletedCount === 1;
    },

    async attachFunctionalUnit(organizationId, id, functionalUnitId, actorId) {
      const now = new Date();
      const doc = await Model.findOneAndUpdate(
        {
          _id: id,
          organizationId,
          functionalUnitIds: { $ne: functionalUnitId },
        },
        {
          $addToSet: { functionalUnitIds: functionalUnitId },
          $set: { updatedBy: actorId, updatedOn: now },
        },
        { returnDocument: "after" }
      ).exec();
      return doc ? toDomain(doc) : null;
    },
  };
}
