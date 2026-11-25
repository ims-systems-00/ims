import type { TenderLibraryAnswer } from "../types";
import {
  getTenderAnswerModel,
  type TenderAnswerDocument,
} from "./tender-answer.model";

function opt(v: string | null | undefined): string | undefined {
  return v == null ? undefined : v;
}

function toDomain(doc: TenderAnswerDocument): TenderLibraryAnswer {
  return {
    id: doc.entityId,
    question: doc.question,
    answer: doc.answer ?? "",
    tags: [...(doc.tags ?? [])],
    standards: [...(doc.standards ?? [])],
    owner: doc.owner ?? "",
    approvedBy: opt(doc.approvedBy),
    approvedAt: opt(doc.approvedAt),
    reviewBy: opt(doc.reviewBy),
    uses: doc.uses ?? 0,
    source: doc.source as TenderLibraryAnswer["source"],
    evidence: (doc.evidence ?? []).map((e) => ({
      kind: e.kind,
      id: e.id,
      ...(e.label != null ? { label: e.label } : {}),
    })),
    hist: (doc.hist ?? []).map((h) => ({ t: h.t, by: h.by, what: h.what })),
  };
}

export type TenderAnswerRepository = ReturnType<
  typeof createTenderAnswerRepository
>;

export function createTenderAnswerRepository() {
  const Model = getTenderAnswerModel();

  return {
    async list(organizationId: string): Promise<TenderLibraryAnswer[]> {
      const docs = await Model.find({ organizationId }).lean();
      return docs.map((d) => toDomain(d as TenderAnswerDocument));
    },

    async findByEntityId(
      organizationId: string,
      entityId: string
    ): Promise<TenderLibraryAnswer | null> {
      const doc = await Model.findOne({ organizationId, entityId }).lean();
      return doc ? toDomain(doc as TenderAnswerDocument) : null;
    },

    async upsert(
      organizationId: string,
      answer: TenderLibraryAnswer
    ): Promise<TenderLibraryAnswer> {
      const doc = await Model.findOneAndUpdate(
        { organizationId, entityId: answer.id },
        {
          $set: {
            organizationId,
            entityId: answer.id,
            question: answer.question,
            answer: answer.answer,
            tags: answer.tags || [],
            standards: answer.standards || [],
            owner: answer.owner || "",
            approvedBy: answer.approvedBy,
            approvedAt: answer.approvedAt,
            reviewBy: answer.reviewBy,
            uses: answer.uses ?? 0,
            source: answer.source,
            evidence: answer.evidence || [],
            hist: answer.hist || [],
          },
        },
        { upsert: true, returnDocument: "after" }
      ).lean();
      return toDomain(doc as TenderAnswerDocument);
    },

    async remove(organizationId: string, entityId: string): Promise<boolean> {
      const res = await Model.deleteOne({ organizationId, entityId });
      return res.deletedCount > 0;
    },

    async replaceAll(
      organizationId: string,
      answers: TenderLibraryAnswer[]
    ): Promise<void> {
      const ids = answers.map((a) => a.id);
      await Model.deleteMany({
        organizationId,
        entityId: { $nin: ids },
      });
      for (const a of answers) {
        await this.upsert(organizationId, a);
      }
    },
  };
}
