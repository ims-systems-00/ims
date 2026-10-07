/**
 * Activity persistence.
 */

import type { ActivityListScope } from "../ports";
import type {
  Activity,
  ActivityExtraLog,
  ActivityMetaInfo,
  ActivityModuleType,
  ListActivitiesQuery,
  PaginatedActivities,
} from "../types";
import { getActivityModel, type ActivityDocument } from "./activity.model";

function toDomain(doc: ActivityDocument): Activity {
  const extraLogs = (doc.extraLogs ?? []).map((entry) => ({
    title: entry.title,
    description: entry.description ?? "",
    icon: entry.icon ?? undefined,
    image: entry.image ?? undefined,
  }));

  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    moduleType: doc.moduleType as ActivityModuleType,
    moduleId: doc.moduleId,
    value: doc.value,
    isAutomated: Boolean(doc.isAutomated),
    iconSrc: doc.iconSrc ?? null,
    extraLogs,
    metaInfo: (doc.metaInfo ?? {}) as ActivityMetaInfo,
    groupId: doc.groupId ?? null,
    assignedTo: doc.assignedTo ?? null,
    assignedOn: doc.assignedOn ?? null,
    createdBy: doc.createdBy,
    createdOn: doc.createdOn,
    updatedBy: doc.updatedBy ?? null,
    updatedOn: doc.updatedOn ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type PersistActivityCreate = {
  moduleType: ActivityModuleType;
  moduleId: string;
  value: string;
  isAutomated: boolean;
  iconSrc: string | null;
  extraLogs: ActivityExtraLog[];
  metaInfo: ActivityMetaInfo;
  groupId: string | null;
  assignedTo: string | null;
  assignedOn: Date | null;
  createdBy: string;
  createdOn: Date;
};

export type PersistActivityPatch = {
  value: string;
  updatedBy: string;
  updatedOn: Date;
};

export type ActivityRepository = ReturnType<typeof createActivityRepository>;

export function createActivityRepository() {
  const Model = getActivityModel();

  return {
    async create(
      organizationId: string,
      input: PersistActivityCreate
    ): Promise<Activity> {
      const doc = await Model.create({
        organizationId,
        moduleType: input.moduleType,
        moduleId: input.moduleId,
        value: input.value,
        isAutomated: input.isAutomated,
        iconSrc: input.iconSrc,
        extraLogs: input.extraLogs,
        metaInfo: input.metaInfo,
        groupId: input.groupId,
        assignedTo: input.assignedTo,
        assignedOn: input.assignedOn,
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
    ): Promise<Activity | null> {
      const doc = await Model.findOne({ _id: id, organizationId }).lean();
      return doc ? toDomain(doc as ActivityDocument) : null;
    },

    async list(
      organizationId: string,
      query: ListActivitiesQuery,
      scope: ActivityListScope
    ): Promise<PaginatedActivities> {
      const filter: Record<string, unknown> = {
        organizationId,
        moduleType: query.moduleType,
        moduleId: query.moduleId,
      };

      if (query.isAutomated !== undefined) {
        filter.isAutomated = query.isAutomated;
      }

      if (query.threadId?.trim()) {
        filter["metaInfo.threadId"] = query.threadId.trim();
      }

      if (scope.mode === "groups") {
        const groupClause: unknown[] = [
          { groupId: { $in: scope.groupIds } },
        ];
        if (scope.includeNullGroup) {
          groupClause.push({ groupId: null });
          groupClause.push({ groupId: { $exists: false } });
        }
        filter.$or = groupClause;
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
        items: docs.map((doc) => toDomain(doc as ActivityDocument)),
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize) || 1),
      };
    },

    async update(
      organizationId: string,
      id: string,
      patch: PersistActivityPatch
    ): Promise<Activity | null> {
      const doc = await Model.findOneAndUpdate(
        { _id: id, organizationId },
        {
          $set: {
            value: patch.value,
            updatedBy: patch.updatedBy,
            updatedOn: patch.updatedOn,
          },
        },
        { returnDocument: "after" }
      ).lean();
      return doc ? toDomain(doc as ActivityDocument) : null;
    },

    async hardDelete(organizationId: string, id: string): Promise<boolean> {
      const result = await Model.deleteOne({ _id: id, organizationId });
      return result.deletedCount === 1;
    },
  };
}
