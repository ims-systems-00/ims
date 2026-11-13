/**
 * Document Tree persistence.
 */

import type {
  AuthorisationEntry,
  AuthorisationStatus,
  DocumentApplicableModule,
  DocumentComplianceTool,
  DocumentFileMeta,
  DocumentNodeData,
  DocumentNodeType,
  DocumentPurpose,
  DocumentStatus,
  DocumentTreeNode,
  FolderNodeData,
  ListPublishedDocumentsQuery,
  ListRepoNodesQuery,
  PaginatedDocumentNodes,
  DocumentOverviewCounts,
} from "../types";
import { DOCUMENT_PURPOSES, documentToolForToolkit } from "../types";
import {
  getDocumentTreeModel,
  type DocumentTreeDocument,
} from "./document-tree.model";

function toAuthorisation(raw: unknown): AuthorisationEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const item = entry as {
      _id?: { toString(): string };
      userId: string;
      status: AuthorisationStatus;
      handledOn?: Date | null;
      message?: string;
    };
    return {
      id: item._id ? String(item._id) : "",
      userId: item.userId,
      status: item.status,
      handledOn: item.handledOn ?? null,
      message: item.message ?? "",
    };
  });
}

function toDocumentData(raw: unknown): DocumentNodeData | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as {
    storageInfo?: DocumentFileMeta | null;
    purpose?: DocumentPurpose;
    owners?: string[];
    applicableModules?: DocumentApplicableModule[];
    complianceTools?: DocumentComplianceTool[];
    complianceLinks?: Array<{ toolkitId?: string; clauseIds?: string[] }>;
    authorisation?: unknown;
    classification?: string;
    dvID?: number;
    conformance?: number;
    threadId?: string;
    reviewDate?: Date | null;
  };
  // Migrated folders sometimes carried a documentData stub without storageInfo.
  // Treat missing/invalid storage as "not a document payload" so listChildren
  // does not 500 the whole folder listing.
  const storage = data.storageInfo;
  if (
    !storage ||
    typeof storage !== "object" ||
    !storage.Name ||
    !(storage.Key || storage.key) ||
    !storage.Bucket
  ) {
    return null;
  }
  const key = String(storage.key ?? storage.Key);
  const rawSize = (storage as { Size?: unknown }).Size;
  const size =
    typeof rawSize === "number" && Number.isFinite(rawSize) && rawSize >= 0
      ? rawSize
      : undefined;
  return {
    storageInfo: {
      Name: String(storage.Name),
      Key: String(storage.Key ?? key),
      key,
      Bucket: String(storage.Bucket),
      ...(size !== undefined ? { Size: size } : {}),
    },
    purpose: (data.purpose && DOCUMENT_PURPOSES.includes(data.purpose)
      ? data.purpose
      : "Document") as DocumentPurpose,
    owners: [...(data.owners ?? [])].map(String),
    applicableModules: [...(data.applicableModules ?? [])],
    complianceTools: [...(data.complianceTools ?? [])],
    complianceLinks: (data.complianceLinks ?? [])
      .filter((link) => Boolean(link.toolkitId?.trim()))
      .map((link) => ({
        toolkitId: String(link.toolkitId).trim(),
        clauseIds: [...new Set((link.clauseIds ?? []).map((c) => c.trim()).filter(Boolean))],
      })),
    authorisation: toAuthorisation(data.authorisation),
    classification: data.classification ?? "",
    dvID: data.dvID ?? 0,
    conformance: data.conformance ?? -1,
    threadId: data.threadId ?? "",
    reviewDate: data.reviewDate ?? null,
  };
}

function toFolderData(raw: unknown): FolderNodeData | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as {
    reviewDate?: Date | null;
    modifiedBy?: string | null;
    modifiedOn?: Date | null;
  };
  return {
    reviewDate: data.reviewDate ?? null,
    modifiedBy: data.modifiedBy ?? null,
    modifiedOn: data.modifiedOn ?? null,
  };
}

function toDomain(doc: DocumentTreeDocument): DocumentTreeNode {
  const type = doc.type as DocumentNodeType;
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    repositoryId: doc.repositoryId,
    reference: doc.reference,
    name: doc.name,
    type,
    status: doc.status as DocumentStatus,
    parentNodeId: doc.parentNodeId ?? null,
    documentData: type === "document" ? toDocumentData(doc.documentData) : null,
    folderData: type === "folder" ? toFolderData(doc.folderData) : null,
    createdBy: doc.createdBy ?? "migration",
    createdOn: doc.createdOn ?? doc.createdAt ?? new Date(0),
    updatedBy: doc.updatedBy ?? null,
    updatedOn: doc.updatedOn ?? null,
    deletedAt: doc.deletedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type PersistFolderCreate = {
  reference: string;
  repositoryId: string;
  name: string;
  parentNodeId: string | null;
  reviewDate: Date | null;
  createdBy: string;
  createdOn: Date;
};

export type PersistDocumentCreate = {
  reference: string;
  repositoryId: string;
  name: string;
  parentNodeId: string | null;
  status: DocumentStatus;
  documentData: {
    storageInfo: DocumentFileMeta;
    purpose: DocumentPurpose;
    owners: string[];
    applicableModules: DocumentApplicableModule[];
    complianceTools: DocumentComplianceTool[];
    complianceLinks?: Array<{ toolkitId: string; clauseIds: string[] }>;
    authorisation: Array<{
      userId: string;
      status: AuthorisationStatus;
      handledOn: Date | null;
      message: string;
    }>;
    classification: string;
    dvID: number;
    conformance: number;
    threadId: string;
    reviewDate: Date | null;
  };
  createdBy: string;
  createdOn: Date;
};

export type DocumentTreeStore = ReturnType<typeof createDocumentTreeStore>;

export function createDocumentTreeStore() {
  const Model = getDocumentTreeModel();

  return {
    toDomain,

    async createFolder(
      organizationId: string,
      input: PersistFolderCreate
    ): Promise<DocumentTreeNode> {
      const doc = await Model.create({
        organizationId,
        repositoryId: input.repositoryId,
        reference: input.reference,
        name: input.name,
        type: "folder",
        status: "Published",
        parentNodeId: input.parentNodeId,
        folderData: {
          reviewDate: input.reviewDate,
          modifiedBy: null,
          modifiedOn: null,
        },
        documentData: null,
        createdBy: input.createdBy,
        createdOn: input.createdOn,
        deletedAt: null,
      });
      return toDomain(doc);
    },

    async createDocument(
      organizationId: string,
      input: PersistDocumentCreate
    ): Promise<DocumentTreeNode> {
      const doc = await Model.create({
        organizationId,
        repositoryId: input.repositoryId,
        reference: input.reference,
        name: input.name,
        type: "document",
        status: input.status,
        parentNodeId: input.parentNodeId,
        documentData: input.documentData,
        folderData: null,
        createdBy: input.createdBy,
        createdOn: input.createdOn,
        deletedAt: null,
      });
      return toDomain(doc);
    },

    async findById(
      organizationId: string,
      id: string,
      options?: { includeDeleted?: boolean }
    ): Promise<DocumentTreeNode | null> {
      const filter: Record<string, unknown> = { _id: id, organizationId };
      if (!options?.includeDeleted) filter.deletedAt = null;
      const doc = await Model.findOne(filter).lean();
      return doc ? toDomain(doc as DocumentTreeDocument) : null;
    },

    async listChildren(
      organizationId: string,
      repositoryId: string,
      query: ListRepoNodesQuery
    ): Promise<PaginatedDocumentNodes> {
      const deleted = query.deleted === true;
      const filter: Record<string, unknown> = {
        organizationId,
        repositoryId,
        deletedAt: deleted ? { $ne: null } : null,
        parentNodeId: query.parentNodeId ?? null,
      };
      if (query.type) filter.type = query.type;
      if (query.status) filter.status = query.status;

      // Live folder listing shows folders + published/pending/rejected docs
      // (not archived), unless an explicit status filter is set.
      if (!deleted && !query.status && !query.type) {
        filter.$or = [
          { type: "folder" },
          { type: "document", status: { $in: ["Published", "Pending", "Rejected"] } },
        ];
      }

      if (query.search?.trim()) {
        const escaped = query.search
          .trim()
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "i");
        filter.$and = [
          ...(Array.isArray(filter.$and) ? filter.$and : []),
          { $or: [{ name: regex }, { reference: regex }] },
        ];
      }

      const sortField = query.sort ?? "name";
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
        items: docs.map((doc) => toDomain(doc as DocumentTreeDocument)),
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize) || 1),
      };
    },

    /** All versions in a document family (same threadId), oldest first. */
    async listByThread(
      organizationId: string,
      threadId: string
    ): Promise<DocumentTreeNode[]> {
      if (!threadId) return [];
      const docs = await Model.find({
        organizationId,
        type: "document",
        "documentData.threadId": threadId,
      })
        .sort({ "documentData.dvID": 1, createdOn: 1 })
        .lean();
      return docs.map((doc) => toDomain(doc as DocumentTreeDocument));
    },

    async updateDocumentData(
      organizationId: string,
      id: string,
      patch: Partial<{
        conformance: number;
        reviewDate: Date | null;
        complianceLinks: Array<{ toolkitId: string; clauseIds: string[] }>;
      }>
    ): Promise<DocumentTreeNode | null> {
      const set: Record<string, unknown> = {};
      if (patch.conformance !== undefined) {
        set["documentData.conformance"] = patch.conformance;
      }
      if (patch.reviewDate !== undefined) {
        set["documentData.reviewDate"] = patch.reviewDate;
      }
      if (patch.complianceLinks !== undefined) {
        set["documentData.complianceLinks"] = patch.complianceLinks;
      }
      const doc = await Model.findOneAndUpdate(
        { _id: id, organizationId, type: "document" },
        { $set: set },
        { new: true }
      ).lean();
      return doc ? toDomain(doc as DocumentTreeDocument) : null;
    },

    async countSiblingNames(
      organizationId: string,
      repositoryId: string,
      parentNodeId: string | null
    ): Promise<number> {
      const names = await Model.distinct("name", {
        organizationId,
        repositoryId,
        parentNodeId,
        deletedAt: null,
      });
      return names.length;
    },

    async findActiveByName(
      organizationId: string,
      repositoryId: string,
      parentNodeId: string | null,
      name: string,
      options?: { status?: DocumentStatus | DocumentStatus[] }
    ): Promise<DocumentTreeNode | null> {
      const filter: Record<string, unknown> = {
        organizationId,
        repositoryId,
        parentNodeId,
        name,
        deletedAt: null,
      };
      if (options?.status) {
        filter.status = Array.isArray(options.status)
          ? { $in: options.status }
          : options.status;
      }
      const doc = await Model.findOne(filter).lean();
      return doc ? toDomain(doc as DocumentTreeDocument) : null;
    },

    async findPendingByName(
      organizationId: string,
      repositoryId: string,
      parentNodeId: string | null,
      name: string
    ): Promise<DocumentTreeNode | null> {
      return this.findActiveByName(
        organizationId,
        repositoryId,
        parentNodeId,
        name,
        { status: "Pending" }
      );
    },

    async updateOne(
      organizationId: string,
      id: string,
      $set: Record<string, unknown>
    ): Promise<DocumentTreeNode | null> {
      const doc = await Model.findOneAndUpdate(
        { _id: id, organizationId, deletedAt: null },
        { $set },
        { returnDocument: "after" }
      ).lean();
      return doc ? toDomain(doc as DocumentTreeDocument) : null;
    },

    async updateManyByFamily(
      organizationId: string,
      filter: {
        repositoryId: string;
        parentNodeId: string | null;
        name: string;
      },
      $set: Record<string, unknown>
    ): Promise<number> {
      const result = await Model.updateMany(
        {
          organizationId,
          repositoryId: filter.repositoryId,
          parentNodeId: filter.parentNodeId,
          name: filter.name,
          deletedAt: null,
        },
        { $set }
      );
      return result.modifiedCount;
    },

    async archivePublishedSibling(
      organizationId: string,
      repositoryId: string,
      parentNodeId: string | null,
      name: string,
      excludeId: string
    ): Promise<void> {
      await Model.updateMany(
        {
          organizationId,
          repositoryId,
          parentNodeId,
          name,
          status: "Published",
          deletedAt: null,
          _id: { $ne: excludeId },
        },
        { $set: { status: "Archived" } }
      );
    },

    async softDeleteFamily(
      organizationId: string,
      node: DocumentTreeNode,
      actorId: string
    ): Promise<number> {
      const now = new Date();
      const result = await Model.updateMany(
        {
          organizationId,
          repositoryId: node.repositoryId,
          parentNodeId: node.parentNodeId,
          name: node.name,
          deletedAt: null,
        },
        {
          $set: {
            deletedAt: now,
            updatedBy: actorId,
            updatedOn: now,
          },
        }
      );
      return result.modifiedCount;
    },

    async softDeleteByRepository(
      organizationId: string,
      repositoryId: string,
      actorId: string
    ): Promise<number> {
      const now = new Date();
      const result = await Model.updateMany(
        { organizationId, repositoryId, deletedAt: null },
        {
          $set: {
            deletedAt: now,
            updatedBy: actorId,
            updatedOn: now,
          },
        }
      );
      return result.modifiedCount;
    },

    async restoreFamily(
      organizationId: string,
      node: DocumentTreeNode,
      actorId: string
    ): Promise<number> {
      const now = new Date();
      const result = await Model.updateMany(
        {
          organizationId,
          repositoryId: node.repositoryId,
          parentNodeId: node.parentNodeId,
          name: node.name,
          deletedAt: { $ne: null },
        },
        {
          $set: {
            deletedAt: null,
            updatedBy: actorId,
            updatedOn: now,
          },
        }
      );
      return result.modifiedCount;
    },

    async hardDeleteById(
      organizationId: string,
      id: string
    ): Promise<DocumentTreeNode | null> {
      const doc = await Model.findOneAndDelete({
        _id: id,
        organizationId,
      }).lean();
      return doc ? toDomain(doc as DocumentTreeDocument) : null;
    },

    async hardDeleteByRepository(
      organizationId: string,
      repositoryId: string
    ): Promise<DocumentTreeNode[]> {
      const docs = await Model.find({ organizationId, repositoryId }).lean();
      await Model.deleteMany({ organizationId, repositoryId });
      return docs.map((doc) => toDomain(doc as DocumentTreeDocument));
    },

    async listFoldersInRepository(
      organizationId: string,
      repositoryId: string
    ): Promise<DocumentTreeNode[]> {
      const docs = await Model.find({
        organizationId,
        repositoryId,
        type: "folder",
        deletedAt: null,
      })
        .sort({ createdOn: 1 })
        .lean();
      return docs.map((doc) => toDomain(doc as DocumentTreeDocument));
    },

    async buildPath(
      organizationId: string,
      nodeId: string
    ): Promise<Array<{ nodeId: string; name: string }>> {
      const path: Array<{ nodeId: string; name: string }> = [];
      let currentId: string | null = nodeId;
      let guard = 0;
      while (currentId && guard < 30) {
        const node = await this.findById(organizationId, currentId, {
          includeDeleted: true,
        });
        if (!node) break;
        path.unshift({ nodeId: node.id, name: node.name });
        currentId = node.parentNodeId;
        guard += 1;
      }
      return path;
    },

    async overviewCounts(
      organizationId: string
    ): Promise<DocumentOverviewCounts> {
      const rows = await Model.aggregate<{ _id: string; count: number }>([
        {
          $match: {
            organizationId,
            type: "document",
            status: "Published",
            deletedAt: null,
          },
        },
        { $group: { _id: "$documentData.purpose", count: { $sum: 1 } } },
      ]);

      const byPurpose = Object.fromEntries(
        DOCUMENT_PURPOSES.map((purpose) => [purpose, 0])
      ) as Record<(typeof DOCUMENT_PURPOSES)[number], number>;

      let total = 0;
      for (const row of rows) {
        if (row._id && row._id in byPurpose) {
          byPurpose[row._id as (typeof DOCUMENT_PURPOSES)[number]] = row.count;
        }
        total += row.count;
      }
      return { total, byPurpose };
    },

    async listPublished(
      organizationId: string,
      query: ListPublishedDocumentsQuery
    ): Promise<PaginatedDocumentNodes> {
      const filter: Record<string, unknown> = {
        organizationId,
        type: "document",
        status: "Published",
        deletedAt: null,
      };
      if (query.purpose) filter["documentData.purpose"] = query.purpose;
      if (query.applicableModule) {
        filter["documentData.applicableModules"] = query.applicableModule;
      }
      if (query.complianceTool) {
        filter["documentData.complianceTools"] = query.complianceTool;
      }
      const toolkitId = query.complianceToolkitId?.trim();
      const clauseId = query.clauseId?.trim();
      const andClauses: Record<string, unknown>[] = [];
      if (toolkitId && clauseId) {
        // Clause filter only applies to Compliance Settings links.
        andClauses.push({
          "documentData.complianceLinks": {
            $elemMatch: { toolkitId, clauseIds: clauseId },
          },
        });
      } else if (toolkitId) {
        // Match Compliance Settings links OR upload-time complianceTools tags.
        const toolCode = documentToolForToolkit(toolkitId);
        const toolkitMatch: Record<string, unknown>[] = [
          { "documentData.complianceLinks.toolkitId": toolkitId },
        ];
        if (toolCode) {
          toolkitMatch.push({ "documentData.complianceTools": toolCode });
        }
        andClauses.push({ $or: toolkitMatch });
      } else if (clauseId) {
        andClauses.push({
          "documentData.complianceLinks.clauseIds": clauseId,
        });
      }
      if (query.search?.trim()) {
        const escaped = query.search
          .trim()
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "i");
        andClauses.push({ $or: [{ name: regex }, { reference: regex }] });
      }
      if (andClauses.length === 1) {
        Object.assign(filter, andClauses[0]);
      } else if (andClauses.length > 1) {
        filter.$and = andClauses;
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
        items: docs.map((doc) => toDomain(doc as DocumentTreeDocument)),
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize) || 1),
      };
    },

    /**
     * Published documents whose reviewDate falls on the given calendar day (UTC).
     * Used by the document-review reminder job.
     */
    async listDueForReviewOnDay(
      dayStart: Date,
      dayEnd: Date
    ): Promise<DocumentTreeNode[]> {
      const docs = await Model.find({
        type: "document",
        status: "Published",
        deletedAt: null,
        "documentData.reviewDate": { $gte: dayStart, $lt: dayEnd },
      })
        .limit(2_000)
        .lean();
      return docs.map((doc) => toDomain(doc as DocumentTreeDocument));
    },

    async changeRepositoryForFamily(
      organizationId: string,
      node: DocumentTreeNode,
      targetRepositoryId: string,
      parentNodeId: string | null,
      actorId: string
    ): Promise<void> {
      const now = new Date();
      await Model.updateMany(
        {
          organizationId,
          repositoryId: node.repositoryId,
          parentNodeId: node.parentNodeId,
          name: node.name,
          deletedAt: null,
        },
        {
          $set: {
            repositoryId: targetRepositoryId,
            parentNodeId,
            updatedBy: actorId,
            updatedOn: now,
          },
        }
      );
    },

    async moveFamily(
      organizationId: string,
      node: DocumentTreeNode,
      parentNodeId: string | null,
      actorId: string
    ): Promise<void> {
      const now = new Date();
      await Model.updateMany(
        {
          organizationId,
          repositoryId: node.repositoryId,
          parentNodeId: node.parentNodeId,
          name: node.name,
          deletedAt: null,
        },
        {
          $set: {
            parentNodeId,
            updatedBy: actorId,
            updatedOn: now,
          },
        }
      );
    },
  };
}
