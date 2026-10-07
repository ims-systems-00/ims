/**
 * Tag and Category persistence.
 */

import type {
  ListTagsAndCategoriesQuery,
  PaginatedTagsAndCategories,
  TagAndCategory,
  TagApplicableModule,
} from "../types";
import {
  getTagAndCategoryModel,
  type TagAndCategoryDocument,
} from "./tag-and-category.model";

function toDomain(doc: TagAndCategoryDocument): TagAndCategory {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    name: doc.name,
    description: doc.description ?? "",
    applicableModules: [...(doc.applicableModules ?? [])] as TagApplicableModule[],
    createdBy: doc.createdBy,
    createdOn: doc.createdOn,
    updatedBy: doc.updatedBy ?? null,
    updatedOn: doc.updatedOn ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type PersistTagCreate = {
  name: string;
  description: string;
  applicableModules: TagApplicableModule[];
  createdBy: string;
  createdOn: Date;
};

export type PersistTagPatch = {
  name?: string;
  description?: string | null;
  updatedBy: string;
  updatedOn: Date;
};

export type TagAndCategoryRepository = ReturnType<
  typeof createTagAndCategoryRepository
>;

export function createTagAndCategoryRepository() {
  const Model = getTagAndCategoryModel();

  return {
    async create(
      organizationId: string,
      input: PersistTagCreate
    ): Promise<TagAndCategory> {
      const doc = await Model.create({
        organizationId,
        name: input.name,
        description: input.description,
        applicableModules: input.applicableModules,
        createdBy: input.createdBy,
        createdOn: input.createdOn,
        updatedBy: null,
        updatedOn: null,
      });
      return toDomain(doc);
    },

    async findById(
      organizationId: string,
      id: string
    ): Promise<TagAndCategory | null> {
      const doc = await Model.findOne({ _id: id, organizationId }).lean();
      return doc ? toDomain(doc as TagAndCategoryDocument) : null;
    },

    async list(
      organizationId: string,
      query: ListTagsAndCategoriesQuery
    ): Promise<PaginatedTagsAndCategories> {
      const filter: Record<string, unknown> = { organizationId };

      if (query.applicableModule) {
        filter.applicableModules = query.applicableModule;
      }

      if (query.search?.trim()) {
        const escaped = query.search
          .trim()
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "i");
        filter.$or = [
          { name: regex },
          { description: regex },
          { applicableModules: regex },
        ];
      }

      const sortField = query.sort ?? "createdOn";
      const sortDir = query.sortDir === "asc" ? 1 : -1;
      const skip = (query.page - 1) * query.pageSize;

      const [total, docs] = await Promise.all([
        Model.countDocuments(filter),
        Model.find(filter)
          .sort({ [sortField]: sortDir, _id: sortDir })
          .skip(skip)
          .limit(query.pageSize)
          .lean(),
      ]);

      return {
        items: docs.map((doc) => toDomain(doc as TagAndCategoryDocument)),
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize) || 1),
      };
    },

    async update(
      organizationId: string,
      id: string,
      patch: PersistTagPatch
    ): Promise<TagAndCategory | null> {
      const $set: Record<string, unknown> = {
        updatedBy: patch.updatedBy,
        updatedOn: patch.updatedOn,
      };

      if (patch.name !== undefined) $set.name = patch.name;
      if (patch.description !== undefined) {
        $set.description = patch.description ?? "";
      }

      const doc = await Model.findOneAndUpdate(
        { _id: id, organizationId },
        { $set },
        { returnDocument: "after" }
      ).lean();
      return doc ? toDomain(doc as TagAndCategoryDocument) : null;
    },

    async hardDelete(organizationId: string, id: string): Promise<boolean> {
      const result = await Model.deleteOne({ _id: id, organizationId });
      return result.deletedCount === 1;
    },
  };
}
