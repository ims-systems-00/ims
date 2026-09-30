/**
 * Audit persistence.
 */

import { randomUUID } from "node:crypto";
import type { AuditListScope } from "../ports";
import {
  deriveDisplayStatus,
  type Audit,
  type AuditAttachment,
  type AuditDisplayStatus,
  type AuditEmbeddedRisk,
  type AuditIdentification,
  type AuditInterval,
  type AuditOfi,
  type AuditType,
  type ComplianceLink,
  type LifecycleFlag,
  type ListAuditsQuery,
  type PaginatedAudits,
  type AuditStats,
} from "../types";
import { getAuditModel, type AuditDocument } from "./audit.model";

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

function toDomain(doc: AuditDocument): Audit {
  const completed = toLifecycle(doc.completed);
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    reference: doc.reference,
    title: doc.title,
    type: doc.type as AuditType,
    focusArea: doc.focusArea,
    businessUnitId: doc.businessUnitId,
    complianceBodyId: doc.complianceBodyId,
    auditorId: doc.auditorId,
    startDate: doc.startDate,
    time: doc.time || undefined,
    interval: doc.interval as AuditInterval,
    comment: doc.comment || undefined,
    identifications: ((doc.identifications ?? []) as AuditIdentification[]).map(
      (item) => ({
        id: item.id,
        nonConformity: item.nonConformity,
        rootCause: item.rootCause,
      })
    ),
    risks: ((doc.risks ?? []) as AuditEmbeddedRisk[]).map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      likelihood: item.likelihood,
      consequence: item.consequence,
      total: item.total,
    })),
    ofis: ((doc.ofis ?? []) as AuditOfi[]).map((item) => ({
      id: item.id,
      title: item.title,
      opportunityForImprovement: item.opportunityForImprovement,
    })),
    attachments: ((doc.attachments ?? []) as AuditAttachment[]).map((file) => ({
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
    completed,
    createdBy: doc.createdBy,
    createdOn: doc.createdOn,
    updatedBy: doc.updatedBy ?? null,
    updatedOn: doc.updatedOn ?? null,
    deletedAt: doc.deletedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    displayStatus: deriveDisplayStatus({ completed }),
  };
}

function applyListScope(
  filter: Record<string, unknown>,
  scope: AuditListScope
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

function statusFilter(status: AuditDisplayStatus): Record<string, unknown> {
  if (status === "Completed") return { "completed.status": true };
  return { "completed.status": { $ne: true } };
}

export type PersistAuditCreate = {
  reference: string;
  title: string;
  type: AuditType;
  focusArea: string;
  businessUnitId: string;
  complianceBodyId: string;
  auditorId: string;
  startDate: Date;
  time?: string;
  interval: AuditInterval;
  attachments: AuditAttachment[];
  createdBy: string;
  createdOn: Date;
};

export type PersistAuditPatch = {
  title?: string;
  focusArea?: string;
  businessUnitId?: string;
  complianceBodyId?: string;
  startDate?: Date;
  time?: string | null;
  comment?: string | null;
  attachments?: AuditAttachment[];
  identifications?: AuditIdentification[];
  risks?: AuditEmbeddedRisk[];
  ofis?: AuditOfi[];
  complianceLinks?: ComplianceLink[];
  completed?: LifecycleFlag;
  updatedBy: string;
  updatedOn: Date;
};

export type AuditRepository = {
  create: (
    organizationId: string,
    input: PersistAuditCreate
  ) => Promise<Audit>;
  createMany: (
    organizationId: string,
    inputs: PersistAuditCreate[]
  ) => Promise<Audit[]>;
  findById: (
    organizationId: string,
    id: string,
    options?: { includeDeleted?: boolean }
  ) => Promise<Audit | null>;
  list: (
    organizationId: string,
    query: ListAuditsQuery,
    scope: AuditListScope
  ) => Promise<PaginatedAudits>;
  update: (
    organizationId: string,
    id: string,
    patch: PersistAuditPatch
  ) => Promise<Audit | null>;
  softDelete: (organizationId: string, id: string) => Promise<boolean>;
  stats: (
    organizationId: string,
    scope: AuditListScope,
    type?: AuditType
  ) => Promise<AuditStats>;
};

export function createAuditRepository(): AuditRepository {
  const model = getAuditModel();

  return {
    async create(organizationId, input) {
      const created = await model.create({
        organizationId,
        reference: input.reference,
        title: input.title,
        type: input.type,
        focusArea: input.focusArea,
        businessUnitId: input.businessUnitId,
        complianceBodyId: input.complianceBodyId,
        auditorId: input.auditorId,
        startDate: input.startDate,
        time: input.time,
        interval: input.interval,
        attachments: input.attachments,
        createdBy: input.createdBy,
        createdOn: input.createdOn,
        comment: "",
        identifications: [],
        risks: [],
        ofis: [],
        complianceLinks: [],
        completed: emptyLifecycle(),
        deletedAt: null,
      });
      return toDomain(created);
    },

    async createMany(organizationId, inputs) {
      if (inputs.length === 0) return [];
      const docs = await model.insertMany(
        inputs.map((input) => ({
          organizationId,
          reference: input.reference,
          title: input.title,
          type: input.type,
          focusArea: input.focusArea,
          businessUnitId: input.businessUnitId,
          complianceBodyId: input.complianceBodyId,
          auditorId: input.auditorId,
          startDate: input.startDate,
          time: input.time,
          interval: input.interval,
          attachments: input.attachments,
          createdBy: input.createdBy,
          createdOn: input.createdOn,
          comment: "",
          identifications: [],
          risks: [],
          ofis: [],
          complianceLinks: [],
          completed: emptyLifecycle(),
          deletedAt: null,
        }))
      );
      return docs.map((doc) => toDomain(doc as unknown as AuditDocument));
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

      if (query.type) filter.type = query.type;
      if (query.status) Object.assign(filter, statusFilter(query.status));
      if (query.businessUnitIds?.length) {
        filter.businessUnitId = { $in: query.businessUnitIds };
      }
      if (query.auditorIds?.length) {
        filter.auditorId = { $in: query.auditorIds };
      }

      const startRange: Record<string, Date> = {};
      if (query.scheduleFrom) startRange.$gte = query.scheduleFrom;
      if (query.scheduleBefore) startRange.$lte = query.scheduleBefore;
      if (query.upcoming) {
        startRange.$gte = startRange.$gte ?? new Date();
        Object.assign(filter, statusFilter("Scheduled"));
      }
      if (Object.keys(startRange).length > 0) {
        filter.startDate = startRange;
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
              { focusArea: regex },
              { interval: regex },
            ],
          },
        ];
      }

      const sortField =
        query.sort === "title"
          ? "title"
          : query.sort === "updatedAt"
            ? "updatedAt"
            : query.sort === "reference"
              ? "reference"
              : "startDate";
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
      if (patch.focusArea !== undefined) set.focusArea = patch.focusArea;
      if (patch.businessUnitId !== undefined) {
        set.businessUnitId = patch.businessUnitId;
      }
      if (patch.complianceBodyId !== undefined) {
        set.complianceBodyId = patch.complianceBodyId;
      }
      if (patch.startDate !== undefined) set.startDate = patch.startDate;
      if (patch.time !== undefined) {
        set.time = patch.time === null ? undefined : patch.time;
      }
      if (patch.comment !== undefined) {
        set.comment = patch.comment === null ? "" : patch.comment;
      }
      if (patch.attachments !== undefined) set.attachments = patch.attachments;
      if (patch.identifications !== undefined) {
        set.identifications = patch.identifications;
      }
      if (patch.risks !== undefined) set.risks = patch.risks;
      if (patch.ofis !== undefined) set.ofis = patch.ofis;
      if (patch.complianceLinks !== undefined) {
        set.complianceLinks = patch.complianceLinks;
      }
      if (patch.completed !== undefined) set.completed = patch.completed;

      const doc = await model
        .findOneAndUpdate(
          { _id: id, organizationId, deletedAt: null },
          { $set: set },
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

    async stats(organizationId, scope, type) {
      const filter: Record<string, unknown> = {
        organizationId,
        deletedAt: null,
      };
      applyListScope(filter, scope);
      if (type) filter.type = type;

      const docs = await model
        .find(filter)
        .select({ completed: 1, type: 1, startDate: 1 })
        .lean()
        .exec();

      const now = Date.now();
      const result: AuditStats = {
        total: docs.length,
        scheduled: 0,
        completed: 0,
        upcoming: 0,
        byType: { Internal: 0, External: 0 },
      };

      for (const doc of docs) {
        const completed = toLifecycle(doc.completed);
        if (completed.status) result.completed += 1;
        else {
          result.scheduled += 1;
          if (doc.startDate && new Date(doc.startDate).getTime() >= now) {
            result.upcoming += 1;
          }
        }
        const auditType = doc.type as AuditType;
        if (auditType in result.byType) {
          result.byType[auditType] += 1;
        }
      }

      return result;
    },
  };
}

export function newFindingId(): string {
  return randomUUID();
}

export function newAttachmentId(): string {
  return randomUUID();
}
