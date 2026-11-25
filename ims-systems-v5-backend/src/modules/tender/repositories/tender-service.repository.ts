import type { TenderService } from "../types";
import {
  getTenderServiceModel,
  type TenderServiceDocument,
} from "./tender-service.model";

function opt(v: string | null | undefined): string | undefined {
  return v == null ? undefined : v;
}

function toDomain(doc: TenderServiceDocument): TenderService {
  return {
    id: doc.entityId,
    name: doc.name,
    description: doc.description ?? "",
    method: opt(doc.method),
    people: [...(doc.people ?? [])],
    tags: [...(doc.tags ?? [])],
    hist: (doc.hist ?? []).map((h) => ({ t: h.t, by: h.by, what: h.what })),
  };
}

export type TenderServiceRepository = ReturnType<
  typeof createTenderServiceRepository
>;

export function createTenderServiceRepository() {
  const Model = getTenderServiceModel();

  return {
    async list(organizationId: string): Promise<TenderService[]> {
      const docs = await Model.find({ organizationId }).lean();
      return docs.map((d) => toDomain(d as TenderServiceDocument));
    },

    async upsert(
      organizationId: string,
      service: TenderService
    ): Promise<TenderService> {
      const doc = await Model.findOneAndUpdate(
        { organizationId, entityId: service.id },
        {
          $set: {
            organizationId,
            entityId: service.id,
            name: service.name,
            description: service.description,
            method: service.method,
            people: service.people || [],
            tags: service.tags || [],
            hist: service.hist || [],
          },
        },
        { upsert: true, returnDocument: "after" }
      ).lean();
      return toDomain(doc as TenderServiceDocument);
    },

    async remove(organizationId: string, entityId: string): Promise<boolean> {
      const res = await Model.deleteOne({ organizationId, entityId });
      return res.deletedCount > 0;
    },
  };
}
