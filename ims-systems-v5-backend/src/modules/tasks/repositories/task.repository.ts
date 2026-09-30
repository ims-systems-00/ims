/**
 * Task Management persistence.
 */

import { randomUUID } from "node:crypto";
import type {
  AssigneeAcceptance,
  CreateTaskInput,
  ListTasksQuery,
  PaginatedTasks,
  Task,
  TaskActivityEntry,
  TaskAssignee,
  TaskAttachment,
  TaskPriority,
  TaskSource,
  TaskStatus,
} from "../types";
import { getTaskModel, type TaskDocument } from "./task.model";

function toDomain(doc: TaskDocument): Task {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    reference: doc.reference,
    name: doc.name,
    description: doc.description ?? "",
    dueDate: doc.dueDate,
    priority: doc.priority as TaskPriority,
    teamPriority: Boolean(doc.teamPriority),
    businessUnitId: doc.businessUnitId ?? undefined,
    assignees: ((doc.assignees ?? []) as TaskAssignee[]).map((a) => ({
      userId: a.userId,
      acceptance: a.acceptance as AssigneeAcceptance,
    })),
    status: doc.status as TaskStatus,
    completedBy: doc.completedBy ?? null,
    completedOn: doc.completedOn ?? null,
    attachments: ((doc.attachments ?? []) as TaskAttachment[]).map((file) => ({
      id: file.id,
      fileName: file.fileName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      storageKey: file.storageKey,
      url: file.url,
      uploadedBy: file.uploadedBy,
      uploadedAt: file.uploadedAt,
    })),
    source: doc.source
      ? {
          moduleType: (doc.source as TaskSource).moduleType,
          moduleId: (doc.source as TaskSource).moduleId,
        }
      : undefined,
    activity: ((doc.activity ?? []) as TaskActivityEntry[]).map((entry) => ({
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
  };
}

function visibilityFilter(subjectId: string): Record<string, unknown> {
  return {
    $or: [{ createdBy: subjectId }, { "assignees.userId": subjectId }],
  };
}

function applyStatusPreset(
  filter: Record<string, unknown>,
  preset: ListTasksQuery["statusPreset"],
  subjectId: string
): void {
  switch (preset) {
    case "complete":
      filter.status = "Complete";
      break;
    case "incomplete":
      filter.status = { $ne: "Complete" };
      break;
    case "in_progress":
      filter.status = "In progress";
      break;
    case "pending":
      filter.status = "Pending";
      break;
    case "assigned_to_me":
      filter["assignees.userId"] = subjectId;
      break;
    case "my_tasks":
    default:
      break;
  }
}

export type PersistTaskCreate = CreateTaskInput & {
  reference: string;
  assignees: TaskAssignee[];
  status: TaskStatus;
  attachments: TaskAttachment[];
  activity: TaskActivityEntry[];
  createdBy: string;
  createdOn: Date;
  dueDate: Date;
  priority: TaskPriority;
  description: string;
};

export type PersistTaskPatch = {
  name?: string;
  description?: string;
  dueDate?: Date;
  priority?: TaskPriority;
  teamPriority?: boolean;
  businessUnitId?: string | null;
  assignees?: TaskAssignee[];
  status?: TaskStatus;
  completedBy?: string | null;
  completedOn?: Date | null;
  attachments?: TaskAttachment[];
  nextNudgeAt?: Date | null;
  updatedBy: string;
  updatedOn: Date;
  activityEntry?: TaskActivityEntry;
  activityEntries?: TaskActivityEntry[];
};

export type TaskRepository = {
  create: (organizationId: string, input: PersistTaskCreate) => Promise<Task>;
  findById: (
    organizationId: string,
    id: string,
    options?: { includeDeleted?: boolean }
  ) => Promise<Task | null>;
  listForSubject: (
    organizationId: string,
    subjectId: string,
    query: ListTasksQuery
  ) => Promise<PaginatedTasks>;
  update: (
    organizationId: string,
    id: string,
    patch: PersistTaskPatch
  ) => Promise<Task | null>;
  softDelete: (organizationId: string, id: string) => Promise<boolean>;
  softDeleteBySource: (
    organizationId: string,
    source: TaskSource
  ) => Promise<number>;
  listTopIncomplete: (
    organizationId: string,
    subjectId: string,
    options: { team: boolean; limit: number }
  ) => Promise<Task[]>;
};

export function createTaskRepository(): TaskRepository {
  const model = getTaskModel();

  return {
    async create(organizationId, input) {
      const created = await model.create({
        organizationId,
        reference: input.reference,
        name: input.name,
        description: input.description,
        dueDate: input.dueDate,
        priority: input.priority,
        teamPriority: input.teamPriority,
        businessUnitId: input.businessUnitId,
        assignees: input.assignees,
        status: input.status,
        attachments: input.attachments,
        source: input.source,
        activity: input.activity,
        createdBy: input.createdBy,
        createdOn: input.createdOn,
        completedBy: null,
        completedOn: null,
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

    async listForSubject(organizationId, subjectId, query) {
      const filter: Record<string, unknown> = {
        organizationId,
        deletedAt: null,
        ...visibilityFilter(subjectId),
      };

      applyStatusPreset(filter, query.statusPreset, subjectId);

      if (query.priority) filter.priority = query.priority;
      if (query.assigneeId) filter["assignees.userId"] = query.assigneeId;
      if (query.dueBefore) filter.dueDate = { $lte: query.dueBefore };
      if (query.sourceModuleType && query.sourceModuleId) {
        filter["source.moduleType"] = query.sourceModuleType;
        filter["source.moduleId"] = query.sourceModuleId;
      } else if (query.sourceModuleType) {
        filter["source.moduleType"] = query.sourceModuleType;
      }

      if (query.search && query.search.length > 0) {
        const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "i");
        filter.$and = [
          ...((filter.$and as unknown[]) ?? []),
          {
            $or: [{ reference: regex }, { name: regex }, { description: regex }],
          },
        ];
      }

      const sortField =
        query.sort === "priority"
          ? "priority"
          : query.sort === "name"
            ? "name"
            : query.sort === "updatedAt"
              ? "updatedAt"
              : query.sort === "createdOn"
                ? "createdOn"
                : "dueDate";
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
      if (patch.name !== undefined) set.name = patch.name;
      if (patch.description !== undefined) set.description = patch.description;
      if (patch.dueDate !== undefined) set.dueDate = patch.dueDate;
      if (patch.priority !== undefined) set.priority = patch.priority;
      if (patch.teamPriority !== undefined) set.teamPriority = patch.teamPriority;
      if (patch.businessUnitId !== undefined) {
        set.businessUnitId =
          patch.businessUnitId === null ? undefined : patch.businessUnitId;
      }
      if (patch.assignees !== undefined) set.assignees = patch.assignees;
      if (patch.status !== undefined) set.status = patch.status;
      if (patch.completedBy !== undefined) set.completedBy = patch.completedBy;
      if (patch.completedOn !== undefined) set.completedOn = patch.completedOn;
      if (patch.attachments !== undefined) set.attachments = patch.attachments;
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

    async softDeleteBySource(organizationId, source) {
      const result = await model
        .updateMany(
          {
            organizationId,
            deletedAt: null,
            "source.moduleType": source.moduleType,
            "source.moduleId": source.moduleId,
          },
          { $set: { deletedAt: new Date() } }
        )
        .exec();
      return result.modifiedCount;
    },

    async listTopIncomplete(organizationId, subjectId, options) {
      const filter: Record<string, unknown> = {
        organizationId,
        deletedAt: null,
        status: { $ne: "Complete" },
        teamPriority: options.team,
        ...visibilityFilter(subjectId),
      };
      if (!options.team) {
        filter.createdBy = subjectId;
        filter.teamPriority = false;
      }

      const docs = await model
        .find(filter)
        .sort({ dueDate: 1 })
        .limit(options.limit)
        .exec();
      return docs.map(toDomain);
    },
  };
}

export function newActivityEntry(
  type: string,
  message: string,
  actorId: string | null
): TaskActivityEntry {
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
