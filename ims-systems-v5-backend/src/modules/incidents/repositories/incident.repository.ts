/**
 * Incident Management persistence.
 */

import { randomUUID } from "node:crypto";
import type { IncidentListScope } from "../ports";
import {
  deriveDisplayStatus,
  STANDALONE_SOURCE_MODULE,
  type ComplianceLink,
  type CreateIncidentInput,
  type Incident,
  type IncidentActivityEntry,
  type IncidentAttachment,
  type IncidentDisplayStatus,
  type IncidentPriority,
  type IncidentPrivacy,
  type IncidentSource,
  type LifecycleFlag,
  type ListIncidentsQuery,
  type PaginatedIncidents,
  type IncidentStats,
} from "../types";
import { getIncidentModel, type IncidentDocument } from "./incident.model";

function emptyLifecycle(): LifecycleFlag {
  return { status: false, by: null, on: null };
}

function toLifecycle(value: unknown): LifecycleFlag {
  if (!value || typeof value !== "object") return emptyLifecycle();
  const raw = value as {
    status?: boolean;
    by?: string | null;
    on?: Date | null;
  };
  return {
    status: Boolean(raw.status),
    by: raw.by ?? null,
    on: raw.on ?? null,
  };
}

function toDomain(doc: IncidentDocument): Incident {
  const resolved = toLifecycle(doc.resolved);
  const escalated = toLifecycle(doc.escalated);
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    reference: doc.reference,
    title: doc.title,
    description: doc.description,
    businessUnitId: doc.businessUnitId ?? undefined,
    priority: doc.priority as IncidentPriority,
    ownerId: doc.ownerId ?? undefined,
    methodOfNotification: doc.methodOfNotification ?? undefined,
    affectedService: doc.affectedService ?? undefined,
    categoryId: doc.categoryId ?? undefined,
    privacy: (doc.privacy as IncidentPrivacy) ?? "Business unit",
    resolution: doc.resolution ?? undefined,
    resolved,
    resolutionTimeMs:
      typeof doc.resolutionTimeMs === "number" ? doc.resolutionTimeMs : null,
    escalated,
    attachments: ((doc.attachments ?? []) as IncidentAttachment[]).map(
      (file) => ({
        id: file.id,
        fileName: file.fileName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        storageKey: file.storageKey,
        url: file.url,
        uploadedBy: file.uploadedBy,
        uploadedAt: file.uploadedAt,
      })
    ),
    complianceLinks: ((doc.complianceLinks ?? []) as ComplianceLink[]).map(
      (link) => ({
        toolkitId: link.toolkitId,
        clauseIds: [...(link.clauseIds ?? [])],
      })
    ),
    source: doc.source
      ? {
          moduleType: (doc.source as IncidentSource).moduleType,
          moduleId: (doc.source as IncidentSource).moduleId,
        }
      : undefined,
    activity: ((doc.activity ?? []) as IncidentActivityEntry[]).map(
      (entry) => ({
        id: entry.id,
        type: entry.type,
        message: entry.message,
        actorId: entry.actorId ?? null,
        at: entry.at,
      })
    ),
    raisedBy: doc.raisedBy,
    raisedOn: doc.raisedOn,
    updatedBy: doc.updatedBy ?? null,
    updatedOn: doc.updatedOn ?? null,
    nextNudgeAt: doc.nextNudgeAt ?? null,
    deletedAt: doc.deletedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    displayStatus: deriveDisplayStatus({ resolved, escalated }),
  };
}

function statusFilter(
  status: IncidentDisplayStatus
): Record<string, unknown> {
  switch (status) {
    case "Resolved":
      return { "resolved.status": true };
    case "Escalated":
      return { "resolved.status": { $ne: true }, "escalated.status": true };
    case "Open":
      return {
        "resolved.status": { $ne: true },
        "escalated.status": { $ne: true },
      };
  }
}

function applyListScope(
  filter: Record<string, unknown>,
  scope: IncidentListScope
): void {
  if (scope.mode === "all") return;
  const clauses: Record<string, unknown>[] = [
    { businessUnitId: { $in: scope.businessUnitIds } },
  ];
  if (scope.includeUnassigned) {
    clauses.push({
      $or: [
        { businessUnitId: { $exists: false } },
        { businessUnitId: null },
        { businessUnitId: "" },
      ],
    });
  }
  filter.$and = [...((filter.$and as unknown[]) ?? []), { $or: clauses }];
}

/**
 * Main register lists standalone incidents (source missing or moduleType incidents).
 * Embedded views pass an explicit sourceModuleType.
 */
function applySourceFilter(
  filter: Record<string, unknown>,
  query: Pick<ListIncidentsQuery, "sourceModuleType" | "sourceModuleId">
): void {
  if (query.sourceModuleType && query.sourceModuleId) {
    filter["source.moduleType"] = query.sourceModuleType;
    filter["source.moduleId"] = query.sourceModuleId;
    return;
  }
  if (query.sourceModuleType) {
    filter["source.moduleType"] = query.sourceModuleType;
    return;
  }
  filter.$and = [
    ...((filter.$and as unknown[]) ?? []),
    {
      $or: [
        { source: { $exists: false } },
        { source: null },
        { "source.moduleType": STANDALONE_SOURCE_MODULE },
      ],
    },
  ];
}

export type PersistIncidentCreate = CreateIncidentInput & {
  reference: string;
  priority: IncidentPriority;
  privacy: IncidentPrivacy;
  raisedBy: string;
  raisedOn: Date;
  attachments: IncidentAttachment[];
  activity: IncidentActivityEntry[];
};

export type PersistIncidentPatch = {
  title?: string;
  description?: string;
  ownerId?: string | null;
  priority?: IncidentPriority;
  methodOfNotification?: string | null;
  affectedService?: string | null;
  categoryId?: string | null;
  privacy?: IncidentPrivacy;
  resolution?: string | null;
  resolved?: LifecycleFlag;
  resolutionTimeMs?: number | null;
  escalated?: LifecycleFlag;
  attachments?: IncidentAttachment[];
  complianceLinks?: ComplianceLink[];
  nextNudgeAt?: Date | null;
  updatedBy: string;
  updatedOn: Date;
  activityEntry?: IncidentActivityEntry;
  activityEntries?: IncidentActivityEntry[];
};

export type IncidentRepository = {
  create: (
    organizationId: string,
    input: PersistIncidentCreate
  ) => Promise<Incident>;
  findById: (
    organizationId: string,
    id: string,
    options?: { includeDeleted?: boolean }
  ) => Promise<Incident | null>;
  list: (
    organizationId: string,
    query: ListIncidentsQuery,
    scope: IncidentListScope
  ) => Promise<PaginatedIncidents>;
  update: (
    organizationId: string,
    id: string,
    patch: PersistIncidentPatch
  ) => Promise<Incident | null>;
  softDelete: (organizationId: string, id: string) => Promise<boolean>;
  stats: (
    organizationId: string,
    scope: IncidentListScope
  ) => Promise<IncidentStats>;
  listForReport: (
    organizationId: string,
    scope: IncidentListScope,
    limit: number
  ) => Promise<Incident[]>;
};

export function createIncidentRepository(): IncidentRepository {
  const model = getIncidentModel();

  return {
    async create(organizationId, input) {
      const created = await model.create({
        organizationId,
        reference: input.reference,
        title: input.title,
        description: input.description,
        businessUnitId: input.businessUnitId,
        priority: input.priority,
        ownerId: input.ownerId,
        methodOfNotification: input.methodOfNotification,
        affectedService: input.affectedService,
        categoryId: input.categoryId,
        privacy: input.privacy,
        attachments: input.attachments,
        activity: input.activity,
        source: input.source,
        raisedBy: input.raisedBy,
        raisedOn: input.raisedOn,
        resolved: emptyLifecycle(),
        resolutionTimeMs: null,
        escalated: emptyLifecycle(),
        complianceLinks: [],
        deletedAt: null,
      });
      return toDomain(created);
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
      applySourceFilter(filter, query);

      if (query.status) Object.assign(filter, statusFilter(query.status));
      if (query.businessUnitIds?.length) {
        filter.businessUnitId = { $in: query.businessUnitIds };
      }
      if (query.ownerIds?.length) {
        filter.ownerId = { $in: query.ownerIds };
      }
      if (query.priorities?.length) {
        filter.priority = { $in: query.priorities };
      }
      if (query.raisedFrom || query.raisedTo) {
        const range: Record<string, Date> = {};
        if (query.raisedFrom) range.$gte = query.raisedFrom;
        if (query.raisedTo) range.$lte = query.raisedTo;
        filter.raisedOn = range;
      }
      if (query.search && query.search.length > 0) {
        const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "i");
        filter.$and = [
          ...((filter.$and as unknown[]) ?? []),
          {
            $or: [
              { reference: regex },
              { title: regex },
              { description: regex },
            ],
          },
        ];
      }

      const sortField =
        query.sort === "priority"
          ? "priority"
          : query.sort === "title"
            ? "title"
            : query.sort === "updatedAt"
              ? "updatedAt"
              : "raisedOn";
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
      if (patch.description !== undefined) set.description = patch.description;
      if (patch.ownerId !== undefined) {
        set.ownerId = patch.ownerId === null ? undefined : patch.ownerId;
      }
      if (patch.priority !== undefined) set.priority = patch.priority;
      if (patch.methodOfNotification !== undefined) {
        set.methodOfNotification =
          patch.methodOfNotification === null
            ? undefined
            : patch.methodOfNotification;
      }
      if (patch.affectedService !== undefined) {
        set.affectedService =
          patch.affectedService === null ? undefined : patch.affectedService;
      }
      if (patch.categoryId !== undefined) {
        set.categoryId =
          patch.categoryId === null ? undefined : patch.categoryId;
      }
      if (patch.privacy !== undefined) set.privacy = patch.privacy;
      if (patch.resolution !== undefined) {
        set.resolution =
          patch.resolution === null ? undefined : patch.resolution;
      }
      if (patch.resolved !== undefined) set.resolved = patch.resolved;
      if (patch.resolutionTimeMs !== undefined) {
        set.resolutionTimeMs = patch.resolutionTimeMs;
      }
      if (patch.escalated !== undefined) set.escalated = patch.escalated;
      if (patch.attachments !== undefined) set.attachments = patch.attachments;
      if (patch.complianceLinks !== undefined) {
        set.complianceLinks = patch.complianceLinks;
      }
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
      applySourceFilter(filter, {});

      const docs = await model
        .find(filter)
        .select({ resolved: 1, escalated: 1, priority: 1 })
        .lean()
        .exec();

      const result: IncidentStats = {
        total: docs.length,
        open: 0,
        escalated: 0,
        resolved: 0,
        byPriority: { P1: 0, P2: 0, P3: 0, P4: 0 },
      };

      for (const doc of docs) {
        const resolved = toLifecycle(doc.resolved);
        const escalated = toLifecycle(doc.escalated);
        const status = deriveDisplayStatus({ resolved, escalated });
        if (status === "Resolved") result.resolved += 1;
        else if (status === "Escalated") result.escalated += 1;
        else result.open += 1;

        const priority = doc.priority as IncidentPriority;
        if (priority in result.byPriority) {
          result.byPriority[priority] += 1;
        }
      }

      return result;
    },

    async listForReport(organizationId, scope, limit) {
      const filter: Record<string, unknown> = {
        organizationId,
        deletedAt: null,
      };
      applyListScope(filter, scope);
      applySourceFilter(filter, {});
      const docs = await model
        .find(filter)
        .sort({ raisedOn: -1 })
        .limit(limit)
        .exec();
      return docs.map(toDomain);
    },
  };
}

export function newActivityEntry(
  type: string,
  message: string,
  actorId: string | null
): IncidentActivityEntry {
  return {
    id: randomUUID(),
    type,
    message,
    actorId,
    at: new Date(),
  };
}

export function newAttachmentId(): string {
  return randomUUID();
}
