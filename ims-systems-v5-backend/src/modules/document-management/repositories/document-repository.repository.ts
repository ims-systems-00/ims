/**
 * Document Repository persistence.
 */

import type {
  DocumentPrivacy,
  DocumentRepository,
  DocumentReviewInterval,
  ListDocumentRepositoriesQuery,
  PaginatedDocumentRepositories,
} from "../types";
import {
  getDocumentRepositoryModel,
  type DocumentRepositoryDocument,
} from "./document-repository.model";

function toDomain(doc: DocumentRepositoryDocument): DocumentRepository {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    reference: doc.reference,
    name: doc.name,
    description: doc.description ?? "",
    privacy: doc.privacy as DocumentPrivacy,
    businessUnitId: doc.businessUnitId ?? null,
    owners: [...(doc.owners ?? [])],
    sharedWith: [...(doc.sharedWith ?? [])],
    reviewInterval: doc.reviewInterval as DocumentReviewInterval,
    createdBy: doc.createdBy,
    createdOn: doc.createdOn,
    updatedBy: doc.updatedBy ?? null,
    updatedOn: doc.updatedOn ?? null,
    deletedAt: doc.deletedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type PersistRepositoryCreate = {
  reference: string;
  name: string;
  description: string;
  privacy: DocumentPrivacy;
  businessUnitId: string | null;
  owners: string[];
  sharedWith: string[];
  reviewInterval: DocumentReviewInterval;
  createdBy: string;
  createdOn: Date;
};

export type PersistRepositoryPatch = {
  name?: string;
  description?: string | null;
  privacy?: DocumentPrivacy;
  businessUnitId?: string | null;
  owners?: string[];
  sharedWith?: string[];
  reviewInterval?: DocumentReviewInterval;
  updatedBy: string;
  updatedOn: Date;
};

export type DocumentRepositoryStore = ReturnType<
  typeof createDocumentRepositoryStore
>;

export function createDocumentRepositoryStore() {
  const Model = getDocumentRepositoryModel();

  return {
    async create(
      organizationId: string,
      input: PersistRepositoryCreate
    ): Promise<DocumentRepository> {
      const doc = await Model.create({
        organizationId,
        ...input,
        deletedAt: null,
        updatedBy: null,
        updatedOn: null,
      });
      return toDomain(doc);
    },

    async findById(
      organizationId: string,
      id: string,
      options?: { includeDeleted?: boolean }
    ): Promise<DocumentRepository | null> {
      const filter: Record<string, unknown> = { _id: id, organizationId };
      if (!options?.includeDeleted) filter.deletedAt = null;
      const doc = await Model.findOne(filter).lean();
      return doc ? toDomain(doc as DocumentRepositoryDocument) : null;
    },

    async list(
      organizationId: string,
      query: ListDocumentRepositoriesQuery,
      viewer: { subjectId: string }
    ): Promise<PaginatedDocumentRepositories> {
      const deleted = query.deleted === true;
      const filter: Record<string, unknown> = {
        organizationId,
        deletedAt: deleted ? { $ne: null } : null,
      };

      if (query.privacy) filter.privacy = query.privacy;

      // Privacy visibility (active list only — recycle bin shows all org deleted).
      if (!deleted) {
        filter.$or = [
          { privacy: "Organisational" },
          {
            privacy: "Business unit",
            $or: [
              { owners: viewer.subjectId },
              { createdBy: viewer.subjectId },
              { sharedWith: viewer.subjectId },
            ],
          },
          {
            privacy: "Only me",
            $or: [
              { owners: viewer.subjectId },
              { createdBy: viewer.subjectId },
            ],
          },
          {
            privacy: "Custom",
            $or: [
              { owners: viewer.subjectId },
              { createdBy: viewer.subjectId },
              { sharedWith: viewer.subjectId },
            ],
          },
          // Always include repos the user owns/created regardless of privacy label.
          { owners: viewer.subjectId },
          { createdBy: viewer.subjectId },
        ];
      }

      if (query.search?.trim()) {
        const escaped = query.search
          .trim()
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "i");
        filter.$and = [
          ...(Array.isArray(filter.$and) ? filter.$and : []),
          {
            $or: [{ name: regex }, { reference: regex }, { description: regex }],
          },
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
        items: docs.map((doc) => toDomain(doc as DocumentRepositoryDocument)),
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize) || 1),
      };
    },

    async update(
      organizationId: string,
      id: string,
      patch: PersistRepositoryPatch
    ): Promise<DocumentRepository | null> {
      const $set: Record<string, unknown> = {
        updatedBy: patch.updatedBy,
        updatedOn: patch.updatedOn,
      };
      if (patch.name !== undefined) $set.name = patch.name;
      if (patch.description !== undefined) {
        $set.description = patch.description ?? "";
      }
      if (patch.privacy !== undefined) $set.privacy = patch.privacy;
      if (patch.businessUnitId !== undefined) {
        $set.businessUnitId = patch.businessUnitId;
      }
      if (patch.owners !== undefined) $set.owners = patch.owners;
      if (patch.sharedWith !== undefined) $set.sharedWith = patch.sharedWith;
      if (patch.reviewInterval !== undefined) {
        $set.reviewInterval = patch.reviewInterval;
      }

      const doc = await Model.findOneAndUpdate(
        { _id: id, organizationId, deletedAt: null },
        { $set },
        { returnDocument: "after" }
      ).lean();
      return doc ? toDomain(doc as DocumentRepositoryDocument) : null;
    },

    async softDelete(
      organizationId: string,
      id: string,
      actorId: string
    ): Promise<DocumentRepository | null> {
      const doc = await Model.findOneAndUpdate(
        { _id: id, organizationId, deletedAt: null },
        {
          $set: {
            deletedAt: new Date(),
            updatedBy: actorId,
            updatedOn: new Date(),
          },
        },
        { returnDocument: "after" }
      ).lean();
      return doc ? toDomain(doc as DocumentRepositoryDocument) : null;
    },

    async restore(
      organizationId: string,
      id: string,
      actorId: string
    ): Promise<DocumentRepository | null> {
      const doc = await Model.findOneAndUpdate(
        { _id: id, organizationId, deletedAt: { $ne: null } },
        {
          $set: {
            deletedAt: null,
            updatedBy: actorId,
            updatedOn: new Date(),
          },
        },
        { returnDocument: "after" }
      ).lean();
      return doc ? toDomain(doc as DocumentRepositoryDocument) : null;
    },

    async hardDelete(organizationId: string, id: string): Promise<boolean> {
      const result = await Model.deleteOne({ _id: id, organizationId });
      return result.deletedCount === 1;
    },
  };
}
