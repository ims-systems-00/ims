import type { TenderRate } from "../types";
import {
  getTenderRateModel,
  type TenderRateDocument,
} from "./tender-rate.model";

function opt(v: string | null | undefined): string | undefined {
  return v == null ? undefined : v;
}

function toDomain(doc: TenderRateDocument): TenderRate {
  return {
    id: doc.entityId,
    item: doc.item,
    unit: doc.unit ?? "",
    rate: doc.rate ?? 0,
    category: opt(doc.category),
  };
}

export type TenderRateRepository = ReturnType<typeof createTenderRateRepository>;

export function createTenderRateRepository() {
  const Model = getTenderRateModel();

  return {
    async list(organizationId: string): Promise<TenderRate[]> {
      const docs = await Model.find({ organizationId }).lean();
      return docs.map((d) => toDomain(d as TenderRateDocument));
    },

    async upsert(
      organizationId: string,
      rate: TenderRate
    ): Promise<TenderRate> {
      const doc = await Model.findOneAndUpdate(
        { organizationId, entityId: rate.id },
        {
          $set: {
            organizationId,
            entityId: rate.id,
            item: rate.item,
            unit: rate.unit,
            rate: rate.rate,
            category: rate.category,
          },
        },
        { upsert: true, returnDocument: "after" }
      ).lean();
      return toDomain(doc as TenderRateDocument);
    },

    async remove(organizationId: string, entityId: string): Promise<boolean> {
      const res = await Model.deleteOne({ organizationId, entityId });
      return res.deletedCount > 0;
    },
  };
}
