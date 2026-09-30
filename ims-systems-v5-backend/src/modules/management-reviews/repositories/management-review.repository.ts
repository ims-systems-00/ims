/**
 * Management Review persistence.
 */

import { randomUUID } from "node:crypto";
import type { ManagementReviewListScope } from "../ports";
import {
  deriveDisplayStatus,
  type LifecycleFlag,
  type ListManagementReviewsQuery,
  type ManagementReview,
  type ManagementReviewStats,
  type PaginatedManagementReviews,
  type ReviewAttachment,
  type ReviewDisplayStatus,
  type ReviewInterval,
  type ReviewPrivacy,
} from "../types";
import {
  getManagementReviewModel,
  type ManagementReviewDocument,
} from "./management-review.model";

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

function toAttachment(file: ReviewAttachment): ReviewAttachment {
  return {
    id: file.id,
    fileName: file.fileName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    storageKey: file.storageKey,
    url: file.url,
    uploadedBy: file.uploadedBy,
    uploadedAt: file.uploadedAt,
  };
}

function toDomain(doc: ManagementReviewDocument): ManagementReview {
  const completed = toLifecycle(doc.completed);
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    reference: doc.reference,
    title: doc.title,
    date: doc.date,
    time: doc.time || undefined,
    interval: doc.interval as ReviewInterval,
    privacy: (doc.privacy as ReviewPrivacy) ?? "Organisational",
    businessUnitId: doc.businessUnitId ?? undefined,
    attendees: [...(doc.attendees ?? [])],
    agenda: ((doc.agenda ?? []) as ReviewAttachment[]).map(toAttachment),
    minutes: ((doc.minutes ?? []) as ReviewAttachment[]).map(toAttachment),
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
  scope: ManagementReviewListScope
): void {
  if (scope.mode === "all") return;
  const clauses: Record<string, unknown>[] = [
    { businessUnitId: { $in: scope.businessUnitIds } },
  ];
  if (scope.includeOrganisational) {
    clauses.push({ privacy: "Organisational" });
  }
  filter.$and = [...((filter.$and as unknown[]) ?? []), { $or: clauses }];
}

function statusFilter(status: ReviewDisplayStatus): Record<string, unknown> {
  if (status === "Completed") return { "completed.status": true };
  return { "completed.status": { $ne: true } };
}

export type PersistManagementReviewCreate = {
  reference: string;
  title: string;
  date: Date;
  time?: string;
  interval: ReviewInterval;
  privacy: ReviewPrivacy;
  businessUnitId?: string;
  attendees: string[];
  agenda: ReviewAttachment[];
  minutes: ReviewAttachment[];
  createdBy: string;
  createdOn: Date;
};

export type PersistManagementReviewPatch = {
  title?: string;
  date?: Date;
  time?: string | null;
  privacy?: ReviewPrivacy;
  attendees?: string[];
  agenda?: ReviewAttachment[];
  minutes?: ReviewAttachment[];
  completed?: LifecycleFlag;
  updatedBy: string;
  updatedOn: Date;
};

export type ManagementReviewRepository = {
  createMany: (
    organizationId: string,
    inputs: PersistManagementReviewCreate[]
  ) => Promise<ManagementReview[]>;
  findById: (
    organizationId: string,
    id: string,
    options?: { includeDeleted?: boolean }
  ) => Promise<ManagementReview | null>;
  list: (
    organizationId: string,
    query: ListManagementReviewsQuery,
    scope: ManagementReviewListScope
  ) => Promise<PaginatedManagementReviews>;
  update: (
    organizationId: string,
    id: string,
    patch: PersistManagementReviewPatch
  ) => Promise<ManagementReview | null>;
  softDelete: (organizationId: string, id: string) => Promise<boolean>;
  stats: (
    organizationId: string,
    scope: ManagementReviewListScope
  ) => Promise<ManagementReviewStats>;
};

export function createManagementReviewRepository(): ManagementReviewRepository {
  const model = getManagementReviewModel();

  return {
    async createMany(organizationId, inputs) {
      if (inputs.length === 0) return [];
      const docs = await model.insertMany(
        inputs.map((input) => ({
          organizationId,
          reference: input.reference,
          title: input.title,
          date: input.date,
          time: input.time,
          interval: input.interval,
          privacy: input.privacy,
          businessUnitId: input.businessUnitId,
          attendees: input.attendees,
          agenda: input.agenda,
          minutes: input.minutes,
          createdBy: input.createdBy,
          createdOn: input.createdOn,
          completed: emptyLifecycle(),
          deletedAt: null,
        }))
      );
      return docs.map((doc) =>
        toDomain(doc as unknown as ManagementReviewDocument)
      );
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

      if (query.status) Object.assign(filter, statusFilter(query.status));
      if (query.privacy) filter.privacy = query.privacy;
      if (query.interval) filter.interval = query.interval;
      if (query.businessUnitIds?.length) {
        filter.businessUnitId = { $in: query.businessUnitIds };
      }
      if (query.attendeeIds?.length) {
        filter.attendees = { $in: query.attendeeIds };
      }

      if (query.dateFrom || query.dateTo) {
        const range: Record<string, Date> = {};
        if (query.dateFrom) range.$gte = query.dateFrom;
        if (query.dateTo) range.$lte = query.dateTo;
        filter.date = range;
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
              : "date";
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
      if (patch.date !== undefined) set.date = patch.date;
      if (patch.time !== undefined) {
        set.time = patch.time === null ? undefined : patch.time;
      }
      if (patch.privacy !== undefined) set.privacy = patch.privacy;
      if (patch.attendees !== undefined) set.attendees = patch.attendees;
      if (patch.agenda !== undefined) set.agenda = patch.agenda;
      if (patch.minutes !== undefined) set.minutes = patch.minutes;
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

    async stats(organizationId, scope) {
      const filter: Record<string, unknown> = {
        organizationId,
        deletedAt: null,
      };
      applyListScope(filter, scope);

      const docs = await model
        .find(filter)
        .select({ completed: 1, date: 1 })
        .lean()
        .exec();

      const now = Date.now();
      const result: ManagementReviewStats = {
        total: docs.length,
        scheduled: 0,
        completed: 0,
        upcoming: 0,
      };

      for (const doc of docs) {
        const completed = toLifecycle(doc.completed);
        if (completed.status) result.completed += 1;
        else {
          result.scheduled += 1;
          if (doc.date && new Date(doc.date).getTime() >= now) {
            result.upcoming += 1;
          }
        }
      }

      return result;
    },
  };
}

export function newAttachmentId(): string {
  return randomUUID();
}
