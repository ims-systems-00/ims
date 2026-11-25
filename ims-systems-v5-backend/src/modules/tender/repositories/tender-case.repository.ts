import type { TenderCaseStudy } from "../types";
import {
  getTenderCaseModel,
  type TenderCaseDocument,
} from "./tender-case.model";

function opt(v: string | null | undefined): string | undefined {
  return v == null ? undefined : v;
}

function toDomain(doc: TenderCaseDocument): TenderCaseStudy {
  return {
    id: doc.entityId,
    client: doc.client,
    title: doc.title,
    sector: opt(doc.sector),
    year: opt(doc.year),
    value: opt(doc.value),
    summary: opt(doc.summary),
    outcome: opt(doc.outcome),
    tags: [...(doc.tags ?? [])],
    hist: (doc.hist ?? []).map((h) => ({ t: h.t, by: h.by, what: h.what })),
  };
}

export type TenderCaseRepository = ReturnType<
  typeof createTenderCaseRepository
>;

export function createTenderCaseRepository() {
  const Model = getTenderCaseModel();

  return {
    async list(organizationId: string): Promise<TenderCaseStudy[]> {
      const docs = await Model.find({ organizationId }).lean();
      return docs.map((d) => toDomain(d as TenderCaseDocument));
    },

    async upsert(
      organizationId: string,
      row: TenderCaseStudy
    ): Promise<TenderCaseStudy> {
      const doc = await Model.findOneAndUpdate(
        { organizationId, entityId: row.id },
        {
          $set: {
            organizationId,
            entityId: row.id,
            client: row.client,
            title: row.title,
            sector: row.sector,
            year: row.year,
            value: row.value,
            summary: row.summary,
            outcome: row.outcome,
            tags: row.tags || [],
            hist: row.hist || [],
          },
        },
        { upsert: true, returnDocument: "after" }
      ).lean();
      return toDomain(doc as TenderCaseDocument);
    },

    async remove(organizationId: string, entityId: string): Promise<boolean> {
      const res = await Model.deleteOne({ organizationId, entityId });
      return res.deletedCount > 0;
    },
  };
}
