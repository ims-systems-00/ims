/**
 * KPI Objective persistence.
 */

import type { KpiObjectiveListScope } from "../ports";
import type {
  KpiModuleType,
  KpiObjective,
  KpiPrivacy,
  ListKpiObjectivesQuery,
  PaginatedKpiObjectives,
} from "../types";
import {
  getKpiObjectiveModel,
  type KpiObjectiveDocument,
} from "./kpi-objective.model";

function toDomain(doc: KpiObjectiveDocument): KpiObjective {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    reference: doc.reference,
    value: doc.value,
    privacy: doc.privacy as KpiPrivacy,
    businessUnitId: doc.businessUnitId ?? undefined,
    targetValue: doc.targetValue ?? 0,
    currentValue: doc.currentValue ?? 0,
    progressPercentage: doc.progressPercentage ?? 0,
    unit: doc.unit ?? "",
    moduleType: (doc.moduleType as KpiModuleType | undefined) ?? undefined,
    moduleId: doc.moduleId ?? undefined,
    createdBy: doc.createdBy,
    createdOn: doc.createdOn,
    updatedBy: doc.updatedBy ?? null,
    updatedOn: doc.updatedOn ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type PersistKpiCreate = {
  reference: string;
  value: string;
  privacy: KpiPrivacy;
  businessUnitId?: string;
  targetValue: number;
  currentValue: number;
  progressPercentage: number;
  unit: string;
  moduleType?: KpiModuleType;
  moduleId?: string;
  createdBy: string;
  createdOn: Date;
};

export type PersistKpiPatch = {
  value?: string;
  privacy?: KpiPrivacy;
  businessUnitId?: string | null;
  targetValue?: number;
  currentValue?: number;
  progressPercentage?: number;
  unit?: string;
  moduleType?: KpiModuleType | null;
  moduleId?: string | null;
  updatedBy: string;
  updatedOn: Date;
};

export type KpiObjectiveRepository = ReturnType<
  typeof createKpiObjectiveRepository
>;

export function createKpiObjectiveRepository() {
  const Model = getKpiObjectiveModel();

  return {
    async create(
      organizationId: string,
      input: PersistKpiCreate
    ): Promise<KpiObjective> {
      const doc = await Model.create({
        organizationId,
        reference: input.reference,
        value: input.value,
        privacy: input.privacy,
        businessUnitId: input.businessUnitId,
        targetValue: input.targetValue,
        currentValue: input.currentValue,
        progressPercentage: input.progressPercentage,
        unit: input.unit,
        moduleType: input.moduleType,
        moduleId: input.moduleId,
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
    ): Promise<KpiObjective | null> {
      const doc = await Model.findOne({ _id: id, organizationId }).lean();
      return doc ? toDomain(doc as KpiObjectiveDocument) : null;
    },

    async list(
      organizationId: string,
      query: ListKpiObjectivesQuery,
      scope: KpiObjectiveListScope
    ): Promise<PaginatedKpiObjectives> {
      const filter: Record<string, unknown> = { organizationId };

      if (scope.mode === "businessUnits") {
        const clauses: Record<string, unknown>[] = [
          {
            privacy: "Business unit",
            businessUnitId: { $in: scope.businessUnitIds },
          },
        ];
        if (scope.includeOrganisational) {
          clauses.push({ privacy: "Organisational" });
        }
        filter.$or = clauses;
      }

      if (query.privacy) {
        filter.privacy = query.privacy;
      }
      if (query.businessUnitId) {
        filter.businessUnitId = query.businessUnitId;
      }
      if (query.search?.trim()) {
        const escaped = query.search
          .trim()
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "i");
        filter.$and = [
          ...(Array.isArray(filter.$and) ? (filter.$and as unknown[]) : []),
          { $or: [{ value: regex }, { reference: regex }] },
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
        items: docs.map((doc) => toDomain(doc as KpiObjectiveDocument)),
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize) || 1),
      };
    },

    async listOrganisational(
      organizationId: string
    ): Promise<KpiObjective[]> {
      const docs = await Model.find({
        organizationId,
        privacy: "Organisational",
        $or: [
          { businessUnitId: { $exists: false } },
          { businessUnitId: null },
          { businessUnitId: "" },
        ],
      })
        .sort({ createdOn: -1 })
        .lean();
      return docs.map((doc) => toDomain(doc as KpiObjectiveDocument));
    },

    async listByBusinessUnit(
      organizationId: string,
      businessUnitId: string
    ): Promise<KpiObjective[]> {
      const docs = await Model.find({
        organizationId,
        privacy: "Business unit",
        businessUnitId,
      })
        .sort({ createdOn: -1 })
        .lean();
      return docs.map((doc) => toDomain(doc as KpiObjectiveDocument));
    },

    async update(
      organizationId: string,
      id: string,
      patch: PersistKpiPatch
    ): Promise<KpiObjective | null> {
      const $set: Record<string, unknown> = {
        updatedBy: patch.updatedBy,
        updatedOn: patch.updatedOn,
      };
      const $unset: Record<string, 1> = {};

      if (patch.value !== undefined) $set.value = patch.value;
      if (patch.privacy !== undefined) $set.privacy = patch.privacy;
      if (patch.targetValue !== undefined) $set.targetValue = patch.targetValue;
      if (patch.currentValue !== undefined)
        $set.currentValue = patch.currentValue;
      if (patch.progressPercentage !== undefined) {
        $set.progressPercentage = patch.progressPercentage;
      }
      if (patch.unit !== undefined) $set.unit = patch.unit;

      if (patch.businessUnitId === null) $unset.businessUnitId = 1;
      else if (patch.businessUnitId !== undefined) {
        $set.businessUnitId = patch.businessUnitId;
      }

      if (patch.moduleType === null) $unset.moduleType = 1;
      else if (patch.moduleType !== undefined) $set.moduleType = patch.moduleType;

      if (patch.moduleId === null) $unset.moduleId = 1;
      else if (patch.moduleId !== undefined) $set.moduleId = patch.moduleId;

      const update: Record<string, unknown> = { $set };
      if (Object.keys($unset).length > 0) update.$unset = $unset;

      const doc = await Model.findOneAndUpdate(
        { _id: id, organizationId },
        update,
        { returnDocument: "after" }
      ).lean();
      return doc ? toDomain(doc as KpiObjectiveDocument) : null;
    },

    async hardDelete(organizationId: string, id: string): Promise<boolean> {
      const result = await Model.deleteOne({ _id: id, organizationId });
      return result.deletedCount === 1;
    },
  };
}
