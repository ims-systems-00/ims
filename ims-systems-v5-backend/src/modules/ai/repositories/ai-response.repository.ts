/**
 * AI Response persistence.
 */

import type {
  AiAnalyserTemplate,
  AiResponseRecord,
  AiSourceModuleType,
  ListAiResponsesQuery,
} from "../types";
import { getAiResponseModel, type AiResponseDocument } from "./ai-response.model";

export type PaginatedAiResponseRecords = {
  items: AiResponseRecord[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

function toRecord(doc: AiResponseDocument): AiResponseRecord {
  const source = doc.source as {
    moduleType: AiSourceModuleType;
    moduleId: string;
  };
  const template = doc.template as AiAnalyserTemplate;
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    source: {
      moduleType: source.moduleType,
      moduleId: source.moduleId,
    },
    template: {
      dataDisplay: template.dataDisplay,
      context: template.context,
      reportStructure: (template.reportStructure ?? []).map((section) => ({
        name: section.name,
        description: section.description ?? null,
        prompt: section.prompt,
        response: section.response ?? null,
      })),
    },
    createdBy: doc.createdBy,
    createdOn: doc.createdOn,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type PersistAiResponseCreate = {
  source: { moduleType: AiSourceModuleType; moduleId: string };
  template: AiAnalyserTemplate;
  createdBy: string;
  createdOn: Date;
};

export type AiResponseRepository = {
  create: (
    organizationId: string,
    input: PersistAiResponseCreate
  ) => Promise<AiResponseRecord>;
  findById: (
    organizationId: string,
    id: string
  ) => Promise<AiResponseRecord | null>;
  list: (
    organizationId: string,
    query: ListAiResponsesQuery
  ) => Promise<PaginatedAiResponseRecords>;
  updateTemplate: (
    organizationId: string,
    id: string,
    template: AiAnalyserTemplate
  ) => Promise<AiResponseRecord | null>;
  delete: (organizationId: string, id: string) => Promise<boolean>;
};

export function createAiResponseRepository(): AiResponseRepository {
  const model = getAiResponseModel();

  return {
    async create(organizationId, input) {
      const docs = await model.create([
        {
          organizationId,
          source: input.source,
          template: input.template,
          createdBy: input.createdBy,
          createdOn: input.createdOn,
        },
      ]);
      return toRecord(docs[0]! as unknown as AiResponseDocument);
    },

    async findById(organizationId, id) {
      const doc = await model.findOne({ _id: id, organizationId }).exec();
      return doc ? toRecord(doc) : null;
    },

    async list(organizationId, query) {
      const filter: Record<string, unknown> = { organizationId };
      if (query.moduleType) {
        filter["source.moduleType"] = query.moduleType;
      }
      if (query.moduleId) {
        filter["source.moduleId"] = query.moduleId;
      }

      const sortDir = query.sortDir === "asc" ? 1 : -1;
      const skip = (query.page - 1) * query.pageSize;
      const [total, docs] = await Promise.all([
        model.countDocuments(filter).exec(),
        model
          .find(filter)
          .sort({ createdOn: sortDir })
          .skip(skip)
          .limit(query.pageSize)
          .exec(),
      ]);

      const totalPages =
        query.pageSize > 0 ? Math.max(1, Math.ceil(total / query.pageSize)) : 1;

      return {
        items: docs.map((doc) => toRecord(doc)),
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: total === 0 ? 0 : totalPages,
      };
    },

    async updateTemplate(organizationId, id, template) {
      const doc = await model
        .findOneAndUpdate(
          { _id: id, organizationId },
          { $set: { template } },
          { new: true }
        )
        .exec();
      return doc ? toRecord(doc) : null;
    },

    async delete(organizationId, id) {
      const result = await model
        .deleteOne({ _id: id, organizationId })
        .exec();
      return (result.deletedCount ?? 0) > 0;
    },
  };
}
