/**
 * Risk Management persistence.
 */

import { randomUUID } from "node:crypto";
import {
  deriveDisplayStatus,
  riskScoreBand,
  type ComplianceLink,
  type CreateRiskInput,
  type LifecycleFlag,
  type ListRisksQuery,
  type PaginatedRisks,
  type Risk,
  type RiskActivityEntry,
  type RiskAttachment,
  type RiskDisplayStatus,
  type RiskScorePair,
  type RiskSource,
  type RiskStats,
  type RiskType,
} from "../types";
import type { RiskListScope } from "../ports";
import { getRiskModel, type RiskDocument } from "./risk.model";

function emptyLifecycle(): LifecycleFlag {
  return { status: false, by: null, on: null };
}

function toLifecycle(value: unknown): LifecycleFlag {
  const flag = value as Partial<LifecycleFlag> | null | undefined;
  return {
    status: Boolean(flag?.status),
    by: flag?.by ?? null,
    on: flag?.on ?? null,
  };
}

function toScore(value: unknown): RiskScorePair {
  const score = value as Partial<RiskScorePair>;
  return {
    likelihood: score.likelihood ?? 1,
    consequence: score.consequence ?? 1,
    total: score.total ?? 1,
  };
}

function toDomain(doc: RiskDocument): Risk {
  const mitigated = toLifecycle(doc.mitigated);
  const accepted = toLifecycle(doc.accepted);
  const escalated = toLifecycle(doc.escalated);
  const currentScore = toScore(doc.currentScore);

  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    reference: doc.reference,
    title: doc.title,
    description: doc.description,
    type: doc.type as RiskType,
    businessUnitId: doc.businessUnitId ?? undefined,
    categoryId: doc.categoryId ?? undefined,
    assetId: doc.assetId ?? undefined,
    ownerId: doc.ownerId ?? undefined,
    initialScore: toScore(doc.initialScore),
    currentScore,
    mitigationText: doc.mitigationText ?? undefined,
    mitigated,
    acceptanceRationale: doc.acceptanceRationale ?? undefined,
    decisionMaker: doc.decisionMaker ?? undefined,
    accepted,
    escalated,
    attachments: ((doc.attachments ?? []) as RiskAttachment[]).map((a) => ({
      id: a.id,
      fileName: a.fileName,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      storageKey: a.storageKey,
      url: a.url,
      uploadedBy: a.uploadedBy,
      uploadedAt: a.uploadedAt,
    })),
    complianceLinks: ((doc.complianceLinks ?? []) as ComplianceLink[]).map(
      (link) => ({
        toolkitId: link.toolkitId,
        clauseIds: [...(link.clauseIds ?? [])],
      })
    ),
    source: doc.source
      ? {
          moduleType: (doc.source as RiskSource).moduleType,
          moduleId: (doc.source as RiskSource).moduleId,
        }
      : undefined,
    activity: ((doc.activity ?? []) as RiskActivityEntry[]).map((entry) => ({
      id: entry.id,
      type: entry.type,
      message: entry.message,
      actorId: entry.actorId ?? null,
      at: entry.at,
    })),
    raisedBy: doc.raisedBy,
    raisedOn: doc.raisedOn,
    updatedBy: doc.updatedBy ?? null,
    updatedOn: doc.updatedOn ?? null,
    nextNudgeAt: doc.nextNudgeAt ?? null,
    deletedAt: doc.deletedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    displayStatus: deriveDisplayStatus({ mitigated, accepted, escalated }),
    scoreBand: riskScoreBand(currentScore.total),
  };
}

function statusFilter(status: RiskDisplayStatus): Record<string, unknown> {
  switch (status) {
    case "Mitigated":
      return { "mitigated.status": true };
    case "Accepted":
      return {
        "mitigated.status": { $ne: true },
        "accepted.status": true,
      };
    case "Escalated":
      return {
        "mitigated.status": { $ne: true },
        "accepted.status": { $ne: true },
        "escalated.status": true,
      };
    case "Open":
      return {
        "mitigated.status": { $ne: true },
        "accepted.status": { $ne: true },
        "escalated.status": { $ne: true },
      };
    default:
      return {};
  }
}

function applyListScope(
  filter: Record<string, unknown>,
  scope: RiskListScope
): void {
  if (scope.mode === "all") {
    return;
  }

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

export type PersistRiskCreate = CreateRiskInput & {
  reference: string;
  initialScore: RiskScorePair;
  currentScore: RiskScorePair;
  raisedBy: string;
  raisedOn: Date;
  attachments: RiskAttachment[];
  activity: RiskActivityEntry[];
};

export type PersistRiskPatch = {
  title?: string;
  description?: string;
  type?: RiskType;
  categoryId?: string | null;
  assetId?: string | null;
  ownerId?: string | null;
  currentScore?: RiskScorePair;
  mitigationText?: string | null;
  acceptanceRationale?: string | null;
  decisionMaker?: string | null;
  mitigated?: LifecycleFlag;
  accepted?: LifecycleFlag;
  escalated?: LifecycleFlag;
  attachments?: RiskAttachment[];
  complianceLinks?: ComplianceLink[];
  nextNudgeAt?: Date | null;
  updatedBy: string;
  updatedOn: Date;
  activityEntry?: RiskActivityEntry;
  activityEntries?: RiskActivityEntry[];
};

export type RiskRepository = {
  create: (
    organizationId: string,
    input: PersistRiskCreate
  ) => Promise<Risk>;
  findById: (
    organizationId: string,
    id: string,
    options?: { includeDeleted?: boolean }
  ) => Promise<Risk | null>;
  list: (
    organizationId: string,
    query: ListRisksQuery,
    scope: RiskListScope
  ) => Promise<PaginatedRisks>;
  update: (
    organizationId: string,
    id: string,
    patch: PersistRiskPatch
  ) => Promise<Risk | null>;
  softDelete: (organizationId: string, id: string) => Promise<boolean>;
  stats: (
    organizationId: string,
    scope: RiskListScope
  ) => Promise<RiskStats>;
  listForReport: (
    organizationId: string,
    scope: RiskListScope,
    limit: number
  ) => Promise<Risk[]>;
};

export function createRiskRepository(): RiskRepository {
  const model = getRiskModel();

  return {
    async create(organizationId, input) {
      const created = await model.create({
        organizationId,
        reference: input.reference,
        title: input.title,
        description: input.description,
        type: input.type,
        businessUnitId: input.businessUnitId,
        categoryId: input.categoryId,
        assetId: input.assetId,
        ownerId: input.ownerId,
        initialScore: input.initialScore,
        currentScore: input.currentScore,
        attachments: input.attachments,
        activity: input.activity,
        source: input.source,
        raisedBy: input.raisedBy,
        raisedOn: input.raisedOn,
        mitigated: emptyLifecycle(),
        accepted: emptyLifecycle(),
        escalated: emptyLifecycle(),
        complianceLinks: [],
        deletedAt: null,
      });
      return toDomain(created);
    },

    async findById(organizationId, id, options = {}) {
      const filter: Record<string, unknown> = {
        _id: id,
        organizationId,
      };
      if (!options.includeDeleted) {
        filter.deletedAt = null;
      }
      const doc = await model.findOne(filter).exec();
      return doc ? toDomain(doc) : null;
    },

    async list(organizationId, query, scope) {
      const filter: Record<string, unknown> = {
        organizationId,
        deletedAt: null,
      };

      applyListScope(filter, scope);

      if (query.status) {
        Object.assign(filter, statusFilter(query.status));
      }

      if (query.businessUnitIds && query.businessUnitIds.length > 0) {
        filter.businessUnitId = { $in: query.businessUnitIds };
      }

      if (query.ownerIds && query.ownerIds.length > 0) {
        filter.ownerId = { $in: query.ownerIds };
      }

      if (query.categoryIds && query.categoryIds.length > 0) {
        filter.categoryId = { $in: query.categoryIds };
      }

      if (query.types && query.types.length > 0) {
        filter.type = { $in: query.types };
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
        filter.$or = [
          { reference: regex },
          { title: regex },
          { description: regex },
        ];
      }

      const sortField =
        query.sort === "score"
          ? "currentScore.total"
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
      if (patch.type !== undefined) set.type = patch.type;
      if (patch.categoryId !== undefined) {
        set.categoryId = patch.categoryId === null ? undefined : patch.categoryId;
      }
      if (patch.assetId !== undefined) {
        set.assetId = patch.assetId === null ? undefined : patch.assetId;
      }
      if (patch.ownerId !== undefined) {
        set.ownerId = patch.ownerId === null ? undefined : patch.ownerId;
      }
      if (patch.currentScore !== undefined) set.currentScore = patch.currentScore;
      if (patch.mitigationText !== undefined) {
        set.mitigationText =
          patch.mitigationText === null ? undefined : patch.mitigationText;
      }
      if (patch.acceptanceRationale !== undefined) {
        set.acceptanceRationale =
          patch.acceptanceRationale === null
            ? undefined
            : patch.acceptanceRationale;
      }
      if (patch.decisionMaker !== undefined) {
        set.decisionMaker =
          patch.decisionMaker === null ? undefined : patch.decisionMaker;
      }
      if (patch.mitigated !== undefined) set.mitigated = patch.mitigated;
      if (patch.accepted !== undefined) set.accepted = patch.accepted;
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
        updateOps.$push = {
          activity: { $each: activityPush },
        };
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
        .select({
          mitigated: 1,
          accepted: 1,
          escalated: 1,
          currentScore: 1,
        })
        .lean()
        .exec();

      const result: RiskStats = {
        total: docs.length,
        open: 0,
        escalated: 0,
        mitigated: 0,
        accepted: 0,
        byScoreBand: { low: 0, medium: 0, high: 0 },
      };

      for (const doc of docs) {
        const mitigated = toLifecycle(doc.mitigated);
        const accepted = toLifecycle(doc.accepted);
        const escalated = toLifecycle(doc.escalated);
        const status = deriveDisplayStatus({ mitigated, accepted, escalated });
        if (status === "Mitigated") result.mitigated += 1;
        else if (status === "Accepted") result.accepted += 1;
        else if (status === "Escalated") result.escalated += 1;
        else result.open += 1;

        const total = toScore(doc.currentScore).total;
        result.byScoreBand[riskScoreBand(total)] += 1;
      }

      return result;
    },

    async listForReport(organizationId, scope, limit) {
      const filter: Record<string, unknown> = {
        organizationId,
        deletedAt: null,
      };
      applyListScope(filter, scope);
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
): RiskActivityEntry {
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
