/**
 * Leave persistence.
 */

import {
  LEAVE_DEFAULT_COUNTRY,
  LEAVE_REFERENCE_PREFIX,
  type Leave,
  type LeaveCountry,
  type LeaveStatus,
  type LeaveSubmission,
  type LeaveType,
  type ListLeavesQuery,
  type PaginatedLeaves,
} from "../types";
import { getLeaveModel, type LeaveDocument } from "./leave.model";

function toDomain(doc: LeaveDocument): Leave {
  const submission = doc.submission;
  const country = doc.country as LeaveCountry | undefined;
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    reference: doc.reference,
    type: doc.type as LeaveType,
    description: doc.description,
    startDate: doc.startDate,
    endDate: doc.endDate,
    startDayFraction: doc.startDayFraction,
    endDayFraction: doc.endDayFraction,
    days: doc.days,
    country: {
      name: country?.name ?? LEAVE_DEFAULT_COUNTRY.name,
      code: country?.code ?? LEAVE_DEFAULT_COUNTRY.code,
    },
    submission: {
      status: (submission?.status ?? "Draft") as LeaveStatus,
      submissionDate: submission?.submissionDate ?? undefined,
      decisionDate: submission?.decisionDate ?? undefined,
      decisionMakerId: submission?.decisionMakerId ?? undefined,
      lineManagerIds: [...(submission?.lineManagerIds ?? [])],
    },
    createdBy: doc.createdBy,
    createdOn: doc.createdOn,
    updatedBy: doc.updatedBy ?? null,
    updatedOn: doc.updatedOn ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type PersistLeaveCreate = {
  reference: string;
  type: LeaveType;
  description: string;
  startDate: Date;
  endDate: Date;
  startDayFraction: number;
  endDayFraction: number;
  days: number;
  country: LeaveCountry;
  submission: LeaveSubmission;
  createdBy: string;
  createdOn: Date;
};

export type PersistLeavePatch = {
  reference?: string;
  type?: LeaveType;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  startDayFraction?: number;
  endDayFraction?: number;
  days?: number;
  submission?: LeaveSubmission;
  updatedBy: string;
  updatedOn: Date;
};

export type LeaveListFilter = Pick<
  ListLeavesQuery,
  "page" | "pageSize" | "scope" | "status" | "type" | "search" | "sortDir"
> & {
  actorId: string;
  managedUserIds: string[];
};

export type LeaveRepository = {
  create: (
    organizationId: string,
    input: PersistLeaveCreate
  ) => Promise<Leave>;
  findById: (organizationId: string, id: string) => Promise<Leave | null>;
  list: (
    organizationId: string,
    filter: LeaveListFilter
  ) => Promise<PaginatedLeaves>;
  update: (
    organizationId: string,
    id: string,
    patch: PersistLeavePatch
  ) => Promise<Leave | null>;
  delete: (organizationId: string, id: string) => Promise<boolean>;
  nextReference: (organizationId: string, type: LeaveType) => Promise<string>;
};

export function createLeaveRepository(): LeaveRepository {
  const model = getLeaveModel();

  return {
    async create(organizationId, input) {
      const docs = await model.create([{ organizationId, ...input }]);
      return toDomain(docs[0]! as unknown as LeaveDocument);
    },

    async findById(organizationId, id) {
      const doc = await model.findOne({ _id: id, organizationId }).exec();
      return doc ? toDomain(doc) : null;
    },

    async list(organizationId, query) {
      const filter: Record<string, unknown> = { organizationId };
      const and: Record<string, unknown>[] = [];

      if (query.scope === "mine") {
        filter.createdBy = query.actorId;
      } else {
        filter.createdBy = { $ne: query.actorId };
        and.push({
          $or: [
            { "submission.lineManagerIds": query.actorId },
            { createdBy: { $in: query.managedUserIds } },
          ],
        });
      }

      if (query.status) filter["submission.status"] = query.status;
      if (query.type) filter.type = query.type;

      if (query.search && query.search.length > 0) {
        const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "i");
        and.push({ $or: [{ reference: regex }, { description: regex }] });
      }
      if (and.length > 0) filter.$and = and;

      const sortDir = query.sortDir === "asc" ? 1 : -1;
      const skip = (query.page - 1) * query.pageSize;

      const [items, total] = await Promise.all([
        model
          .find(filter)
          .sort({ createdOn: sortDir })
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
      const doc = await model
        .findOneAndUpdate(
          { _id: id, organizationId },
          { $set: { ...patch } },
          { returnDocument: "after" }
        )
        .exec();
      return doc ? toDomain(doc) : null;
    },

    async delete(organizationId, id) {
      const result = await model
        .deleteOne({ _id: id, organizationId })
        .exec();
      return result.deletedCount === 1;
    },

    async nextReference(organizationId, type) {
      const prefix = LEAVE_REFERENCE_PREFIX[type];
      const rows = await model
        .find({ organizationId, type })
        .select({ reference: 1 })
        .lean()
        .exec();
      const max = rows.reduce((highest, row) => {
        const parsed = Number(row.reference.slice(prefix.length + 1));
        return Number.isFinite(parsed) && parsed > highest ? parsed : highest;
      }, 0);
      return `${prefix}-${max + 1}`;
    },
  };
}
