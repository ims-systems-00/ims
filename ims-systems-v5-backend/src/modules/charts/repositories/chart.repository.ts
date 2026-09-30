/**
 * Chart definition persistence.
 */

import type {
  Chart,
  ChartConfig,
  ChartDerivation,
  ChartDisplayType,
  ChartGroupByDimension,
  ChartOperation,
  ChartSourceModule,
  ListChartsQuery,
  PaginatedCharts,
} from "../types";
import { getChartModel, type ChartDocument } from "./chart.model";

function toDerivation(value: unknown): ChartDerivation {
  const raw = (value ?? {}) as {
    sourceModule?: string;
    operation?: string;
    groupBy?: string[];
    metricField?: string;
    filters?: { statuses?: string[] };
  };
  return {
    sourceModule: raw.sourceModule as ChartSourceModule,
    operation: raw.operation as ChartOperation,
    groupBy: raw.groupBy?.length
      ? (raw.groupBy as ChartGroupByDimension[])
      : undefined,
    metricField: raw.metricField,
    filters: raw.filters?.statuses
      ? { statuses: [...raw.filters.statuses] }
      : undefined,
  };
}

function toConfig(value: unknown): ChartConfig | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as { chartType?: string; title?: string };
  const config: ChartConfig = {};
  if (raw.chartType) config.chartType = raw.chartType as ChartDisplayType;
  if (raw.title) config.title = raw.title;
  return Object.keys(config).length > 0 ? config : undefined;
}

function toDomain(doc: ChartDocument): Chart {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    name: doc.name,
    description: doc.description,
    derivation: toDerivation(doc.derivation),
    moduleType: (doc.moduleType as ChartSourceModule | undefined) ?? undefined,
    moduleId: doc.moduleId ?? undefined,
    config: toConfig(doc.config),
    createdBy: doc.createdBy,
    createdOn: doc.createdOn,
    updatedBy: doc.updatedBy ?? null,
    updatedOn: doc.updatedOn ?? null,
    createdAt: doc.createdAt as Date,
    updatedAt: doc.updatedAt as Date,
  };
}

export type PersistChartCreate = {
  name: string;
  description: string;
  derivation: ChartDerivation;
  moduleType?: ChartSourceModule;
  moduleId?: string;
  config?: ChartConfig;
  createdBy: string;
  createdOn: Date;
};

export type PersistChartPatch = {
  description?: string;
  derivation?: ChartDerivation;
  moduleType?: ChartSourceModule | null;
  moduleId?: string | null;
  config?: ChartConfig | null;
  updatedBy: string;
  updatedOn: Date;
};

export type ChartRepository = ReturnType<typeof createChartRepository>;

export function createChartRepository() {
  const Model = getChartModel();

  return {
    async create(
      organizationId: string,
      input: PersistChartCreate
    ): Promise<Chart> {
      const doc = await Model.create({
        organizationId,
        name: input.name,
        description: input.description,
        derivation: input.derivation,
        moduleType: input.moduleType,
        moduleId: input.moduleId,
        config: input.config,
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
    ): Promise<Chart | null> {
      const doc = await Model.findOne({ _id: id, organizationId }).lean();
      return doc ? toDomain(doc as ChartDocument) : null;
    },

    async findByName(
      organizationId: string,
      name: string
    ): Promise<Chart | null> {
      const doc = await Model.findOne({ organizationId, name }).lean();
      return doc ? toDomain(doc as ChartDocument) : null;
    },

    async list(
      organizationId: string,
      query: ListChartsQuery
    ): Promise<PaginatedCharts> {
      const filter: Record<string, unknown> = { organizationId };

      if (query.search?.trim()) {
        const escaped = query.search
          .trim()
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "i");
        filter.$or = [{ name: regex }, { description: regex }];
      }
      if (query.moduleType) {
        filter.moduleType = query.moduleType;
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
        items: docs.map((doc) => toDomain(doc as ChartDocument)),
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize) || 1),
      };
    },

    async update(
      organizationId: string,
      id: string,
      patch: PersistChartPatch
    ): Promise<Chart | null> {
      const $set: Record<string, unknown> = {
        updatedBy: patch.updatedBy,
        updatedOn: patch.updatedOn,
      };
      const $unset: Record<string, 1> = {};

      if (patch.description !== undefined) $set.description = patch.description;
      if (patch.derivation !== undefined) $set.derivation = patch.derivation;

      if (patch.moduleType === null) $unset.moduleType = 1;
      else if (patch.moduleType !== undefined) $set.moduleType = patch.moduleType;

      if (patch.moduleId === null) $unset.moduleId = 1;
      else if (patch.moduleId !== undefined) $set.moduleId = patch.moduleId;

      if (patch.config === null) $unset.config = 1;
      else if (patch.config !== undefined) $set.config = patch.config;

      const update: Record<string, unknown> = { $set };
      if (Object.keys($unset).length > 0) update.$unset = $unset;

      const doc = await Model.findOneAndUpdate(
        { _id: id, organizationId },
        update,
        { returnDocument: "after" }
      ).lean();
      return doc ? toDomain(doc as ChartDocument) : null;
    },

    async hardDelete(organizationId: string, id: string): Promise<boolean> {
      const result = await Model.deleteOne({ _id: id, organizationId });
      return result.deletedCount === 1;
    },
  };
}
