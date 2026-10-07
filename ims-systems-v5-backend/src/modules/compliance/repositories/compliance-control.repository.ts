/**
 * Compliance Control (global catalogue) repository.
 */

import type {
  CatalogueSeedRow,
} from "../lib/catalogue-builder";
import type {
  CatalogueControlItem,
  ComplianceControlTemplate,
  ComplianceToolkitName,
  ListCatalogueControlsQuery,
  PaginatedCatalogueControls,
} from "../types";
import {
  getComplianceControlModel,
  type ComplianceControlDocument,
} from "./compliance-control.model";

function mapDoc(doc: ComplianceControlDocument): ComplianceControlTemplate {
  return {
    id: String(doc._id),
    name: doc.name as ComplianceToolkitName,
    clause: doc.clause,
    title: doc.title,
    description: doc.description ?? "",
    annex: doc.annex ?? "",
    note: doc.note ?? "",
    isLocked: Boolean(doc.isLocked),
    parentClause: doc.parentClause ?? null,
    childrenClauses: [...(doc.childrenClauses ?? [])],
    moreInfo: (doc.moreInfo as Record<string, unknown> | null) ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type ComplianceControlRepository = ReturnType<
  typeof createComplianceControlRepository
>;

export function createComplianceControlRepository() {
  const Model = getComplianceControlModel();

  return {
    async listByToolkit(
      name: ComplianceToolkitName
    ): Promise<ComplianceControlTemplate[]> {
      const docs = await Model.find({ name }).sort({ clause: 1 }).exec();
      return docs.map(mapDoc);
    },

    async listCatalogue(
      name: ComplianceToolkitName,
      query: ListCatalogueControlsQuery
    ): Promise<PaginatedCatalogueControls> {
      const filter: Record<string, unknown> = { name };
      if (query.search) {
        const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filter.$or = [
          { clause: { $regex: escaped, $options: "i" } },
          { title: { $regex: escaped, $options: "i" } },
        ];
      }

      const total = await Model.countDocuments(filter).exec();
      const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
      const page = Math.min(query.page, totalPages);
      const docs = await Model.find(filter)
        .sort({ clause: 1 })
        .skip((page - 1) * query.pageSize)
        .limit(query.pageSize)
        .exec();

      const items: CatalogueControlItem[] = docs.map((doc) => ({
        id: String(doc._id),
        name: doc.name as ComplianceToolkitName,
        clause: doc.clause,
        title: doc.title,
        isLocked: Boolean(doc.isLocked),
        parentClause: doc.parentClause ?? null,
      }));

      return {
        items,
        page,
        pageSize: query.pageSize,
        total,
        totalPages,
      };
    },

    async countByToolkit(name: ComplianceToolkitName): Promise<number> {
      return Model.countDocuments({ name }).exec();
    },

    async upsertCatalogue(
      name: ComplianceToolkitName,
      rows: CatalogueSeedRow[]
    ): Promise<number> {
      let written = 0;
      for (const row of rows) {
        await Model.findOneAndUpdate(
          { name, clause: row.clause },
          {
            $set: {
              title: row.title,
              description: row.description,
              annex: row.annex,
              note: row.note,
              isLocked: row.isLocked,
              parentClause: row.parentClause,
              childrenClauses: row.childrenClauses,
              moreInfo: row.moreInfo,
            },
            $setOnInsert: {
              name,
              clause: row.clause,
            },
          },
          { upsert: true, new: true }
        ).exec();
        written += 1;
      }
      return written;
    },

    async deleteToolkitCatalogue(name: ComplianceToolkitName): Promise<number> {
      const result = await Model.deleteMany({ name }).exec();
      return result.deletedCount ?? 0;
    },
  };
}
