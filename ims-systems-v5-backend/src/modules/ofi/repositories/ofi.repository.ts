/**
 * OFI persistence.
 */

import { randomUUID } from "node:crypto";
import type { OfiListScope } from "../ports";
import {
  deriveDisplayStatus,
  type ComplianceLink,
  type ListOfisQuery,
  type Ofi,
  type OfiActivityEntry,
  type OfiAttachment,
  type OfiDisplayStatus,
  type OfiImplemented,
  type OfiImplementationStatus,
  type OfiSource,
  type OfiStats,
  type PaginatedOfis,
} from "../types";
import { getOfiModel, type OfiDocument } from "./ofi.model";

function defaultImplemented(): OfiImplemented {
  return { status: "Pending", by: null, on: null };
}

function toImplemented(value: unknown): OfiImplemented {
  if (!value || typeof value !== "object") return defaultImplemented();
  const raw = value as {
    status?: string;
    by?: string | null;
    on?: Date | null;
  };
  const status = (OFI_STATUSES.includes(raw.status as OfiImplementationStatus)
    ? raw.status
    : "Pending") as OfiImplementationStatus;
  return {
    status,
    by: raw.by ?? null,
    on: raw.on ?? null,
  };
}

const OFI_STATUSES: OfiImplementationStatus[] = [
  "Pending",
  "In Progress",
  "Implemented",
];

function toDomain(doc: OfiDocument): Ofi {
  const implemented = toImplemented(doc.implemented);
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    reference: doc.reference,
    title: doc.title,
    opportunityForImprovement: doc.opportunityForImprovement,
    ownerId: doc.ownerId ?? undefined,
    businessUnitId: doc.businessUnitId,
    cost: typeof doc.cost === "number" ? doc.cost : undefined,
    implemented,
    attachments: ((doc.attachments ?? []) as OfiAttachment[]).map((file) => ({
      id: file.id,
      fileName: file.fileName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      storageKey: file.storageKey,
      url: file.url,
      uploadedBy: file.uploadedBy,
      uploadedAt: file.uploadedAt,
    })),
    complianceLinks: ((doc.complianceLinks ?? []) as ComplianceLink[]).map(
      (link) => ({
        toolkitId: link.toolkitId,
        clauseIds: [...(link.clauseIds ?? [])],
      })
    ),
    source: doc.source
      ? {
          moduleType: (doc.source as OfiSource).moduleType,
          moduleId: (doc.source as OfiSource).moduleId,
        }
      : undefined,
    activity: ((doc.activity ?? []) as OfiActivityEntry[]).map((entry) => ({
      id: entry.id,
      type: entry.type,
      message: entry.message,
      actorId: entry.actorId ?? null,
      at: entry.at,
    })),
    createdBy: doc.createdBy,
    createdOn: doc.createdOn,
    updatedBy: doc.updatedBy ?? null,
    updatedOn: doc.updatedOn ?? null,
    nextNudgeAt: doc.nextNudgeAt ?? null,
    deletedAt: doc.deletedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    displayStatus: deriveDisplayStatus({ implemented }),
  };
}

function applyListScope(
  filter: Record<string, unknown>,
  scope: OfiListScope
): void {
  if (scope.mode === "all") return;
  filter.businessUnitId = { $in: scope.businessUnitIds };
}

export type PersistOfiCreate = {
  id?: string;
  reference: string;
  title: string;
  opportunityForImprovement: string;
  ownerId?: string;
  businessUnitId: string;
  cost?: number;
  attachments: OfiAttachment[];
  source?: OfiSource;
  activity: OfiActivityEntry[];
  createdBy: string;
  createdOn: Date;
  implemented?: OfiImplemented;
};

export type PersistOfiPatch = {
  title?: string;
  opportunityForImprovement?: string;
  ownerId?: string | null;
  cost?: number | null;
  attachments?: OfiAttachment[];
  complianceLinks?: ComplianceLink[];
  implemented?: OfiImplemented;
  nextNudgeAt?: Date | null;
  updatedBy: string;
  updatedOn: Date;
  activityEntry?: OfiActivityEntry;
  activityEntries?: OfiActivityEntry[];
};

export type OfiRepository = {
  create: (organizationId: string, input: PersistOfiCreate) => Promise<Ofi>;
  findById: (
    organizationId: string,
    id: string,
    options?: { includeDeleted?: boolean }
  ) => Promise<Ofi | null>;
  list: (
    organizationId: string,
    query: ListOfisQuery,
    scope: OfiListScope
  ) => Promise<PaginatedOfis>;
  update: (
    organizationId: string,
    id: string,
    patch: PersistOfiPatch
  ) => Promise<Ofi | null>;
  softDelete: (organizationId: string, id: string) => Promise<boolean>;
  stats: (
    organizationId: string,
    scope: OfiListScope
  ) => Promise<OfiStats>;
};

export function createOfiRepository(): OfiRepository {
  const model = getOfiModel();

  return {
    async create(organizationId, input) {
      const docs = await model.create([
        {
          ...(input.id ? { _id: input.id } : {}),
          organizationId,
          reference: input.reference,
          title: input.title,
          opportunityForImprovement: input.opportunityForImprovement,
          ownerId: input.ownerId,
          businessUnitId: input.businessUnitId,
          cost: input.cost,
          attachments: input.attachments,
          source: input.source,
          activity: input.activity,
          implemented: input.implemented ?? defaultImplemented(),
          createdBy: input.createdBy,
          createdOn: input.createdOn,
          deletedAt: null,
        },
      ]);
      return toDomain(docs[0]! as unknown as OfiDocument);
    },

    async findById(organizationId, id, options = {}) {
      const filter: Record<string, unknown> = { _id: id, organizationId };
      if (!options.includeDeleted) filter.deletedAt = null;
      const doc = await model.findOne(filter).exec();
      return doc ? toDomain(doc) : null;
    },

    async list(organizationId, query, scope) {
      const filter: Record<string, unknown> = {
        organizationId,
        deletedAt: null,
      };
      applyListScope(filter, scope);

      if (query.status) filter["implemented.status"] = query.status;
      if (query.businessUnitIds?.length) {
        filter.businessUnitId = { $in: query.businessUnitIds };
      }
      if (query.ownerIds?.length) {
        filter.ownerId = { $in: query.ownerIds };
      }
      if (query.sourceModuleType) {
        filter["source.moduleType"] = query.sourceModuleType;
      }
      if (query.sourceModuleId) {
        filter["source.moduleId"] = query.sourceModuleId;
      }

      if (query.search && query.search.length > 0) {
        const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "i");
        filter.$or = [
          { reference: regex },
          { title: regex },
          { opportunityForImprovement: regex },
        ];
      }

      const sortField =
        query.sort === "title"
          ? "title"
          : query.sort === "updatedAt"
            ? "updatedAt"
            : query.sort === "reference"
              ? "reference"
              : "createdOn";
      const sortDir = query.sortDir === "asc" ? 1 : -1;
      const skip = (query.page - 1) * query.pageSize;

      const [items, total] = await Promise.all([
        model
          .find(filter)
          .sort({ [sortField]: sortDir })
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

    async update(organizationId, id, patch) {
      const set: Record<string, unknown> = {
        updatedBy: patch.updatedBy,
        updatedOn: patch.updatedOn,
      };
      if (patch.title !== undefined) set.title = patch.title;
      if (patch.opportunityForImprovement !== undefined) {
        set.opportunityForImprovement = patch.opportunityForImprovement;
      }
      if (patch.ownerId !== undefined) {
        set.ownerId = patch.ownerId === null ? undefined : patch.ownerId;
      }
      if (patch.cost !== undefined) {
        set.cost = patch.cost === null ? undefined : patch.cost;
      }
      if (patch.attachments !== undefined) set.attachments = patch.attachments;
      if (patch.complianceLinks !== undefined) {
        set.complianceLinks = patch.complianceLinks;
      }
      if (patch.implemented !== undefined) set.implemented = patch.implemented;
      if (patch.nextNudgeAt !== undefined) set.nextNudgeAt = patch.nextNudgeAt;

      const updateOps: Record<string, unknown> = { $set: set };
      const activityPush = [
        ...(patch.activityEntries ?? []),
        ...(patch.activityEntry ? [patch.activityEntry] : []),
      ];
      if (activityPush.length > 0) {
        updateOps.$push = { activity: { $each: activityPush } };
      }

      const doc = await model
        .findOneAndUpdate(
          { _id: id, organizationId, deletedAt: null },
          updateOps,
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

    async stats(organizationId, scope) {
      const filter: Record<string, unknown> = {
        organizationId,
        deletedAt: null,
      };
      applyListScope(filter, scope);

      const docs = await model
        .find(filter)
        .select({ implemented: 1 })
        .lean()
        .exec();

      const result: OfiStats = {
        total: docs.length,
        pending: 0,
        inProgress: 0,
        implemented: 0,
      };

      for (const doc of docs) {
        const status = toImplemented(doc.implemented).status;
        if (status === "Implemented") result.implemented += 1;
        else if (status === "In Progress") result.inProgress += 1;
        else result.pending += 1;
      }

      return result;
    },
  };
}

export function newAttachmentId(): string {
  return randomUUID();
}

export function newActivityEntry(
  type: string,
  message: string,
  actorId: string | null
): OfiActivityEntry {
  return {
    id: randomUUID(),
    type,
    message,
    actorId,
    at: new Date(),
  };
}

export type { OfiDisplayStatus };
