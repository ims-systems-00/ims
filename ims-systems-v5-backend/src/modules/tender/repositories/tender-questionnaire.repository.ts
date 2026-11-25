import type { TenderQuestionnaire } from "../types";
import {
  getTenderQuestionnaireModel,
  type TenderQuestionnaireDocument,
} from "./tender-questionnaire.model";

function opt(v: string | null | undefined): string | undefined {
  return v == null ? undefined : v;
}

function toDomain(doc: TenderQuestionnaireDocument): TenderQuestionnaire {
  return {
    id: doc.entityId,
    kind: (doc.kind as TenderQuestionnaire["kind"]) || "questionnaire",
    buyer: doc.buyer ?? "",
    title: doc.title ?? "",
    reference: doc.reference ?? "",
    submissionEmail: doc.submissionEmail ?? "",
    buyerContact: doc.buyerContact ?? "",
    portalUrl: doc.portalUrl ?? "",
    source: doc.source ?? "text",
    fileName: doc.fileName ?? null,
    fileId: doc.fileId ?? null,
    received: doc.received ?? "",
    due: doc.due ?? null,
    owner: doc.owner ?? "",
    status: doc.status ?? "new",
    notes: opt(doc.notes),
    questions: (doc.questions as TenderQuestionnaire["questions"]) || [],
    documents: (doc.documents as TenderQuestionnaire["documents"]) || [],
    requirements:
      (doc.requirements as TenderQuestionnaire["requirements"]) || [],
    criteria: (doc.criteria as TenderQuestionnaire["criteria"]) || [],
    dates: (doc.dates as TenderQuestionnaire["dates"]) || {},
    pricing: (doc.pricing as TenderQuestionnaire["pricing"]) ?? null,
    priceTotals: doc.priceTotals as TenderQuestionnaire["priceTotals"],
    layout: doc.layout as TenderQuestionnaire["layout"],
    exports: (doc.exports as TenderQuestionnaire["exports"]) || [],
    submitted: opt(doc.submitted),
    submittedVia: opt(doc.submittedVia),
    submission: (doc as { submission?: TenderQuestionnaire["submission"] })
      .submission,
    hist: (doc.hist ?? []).map((h) => ({ t: h.t, by: h.by, what: h.what })),
  };
}

function toPersist(q: TenderQuestionnaire) {
  return {
    entityId: q.id,
    kind: q.kind,
    buyer: q.buyer,
    title: q.title,
    reference: q.reference,
    submissionEmail: q.submissionEmail,
    buyerContact: q.buyerContact,
    portalUrl: q.portalUrl,
    source: q.source,
    fileName: q.fileName,
    fileId: q.fileId,
    received: q.received,
    due: q.due,
    owner: q.owner,
    status: q.status,
    notes: q.notes,
    questions: q.questions,
    documents: q.documents,
    requirements: q.requirements,
    criteria: q.criteria,
    dates: q.dates,
    pricing: q.pricing,
    priceTotals: q.priceTotals,
    layout: q.layout,
    exports: q.exports,
    submitted: q.submitted,
    submittedVia: q.submittedVia,
    submission: q.submission,
    hist: q.hist || [],
  };
}

export type TenderQuestionnaireRepository = ReturnType<
  typeof createTenderQuestionnaireRepository
>;

export function createTenderQuestionnaireRepository() {
  const Model = getTenderQuestionnaireModel();

  return {
    async list(organizationId: string): Promise<TenderQuestionnaire[]> {
      const docs = await Model.find({ organizationId })
        .sort({ updatedAt: -1 })
        .lean();
      return docs.map((d) => toDomain(d as TenderQuestionnaireDocument));
    },

    async findByEntityId(
      organizationId: string,
      entityId: string
    ): Promise<TenderQuestionnaire | null> {
      const doc = await Model.findOne({ organizationId, entityId }).lean();
      return doc ? toDomain(doc as TenderQuestionnaireDocument) : null;
    },

    async upsert(
      organizationId: string,
      q: TenderQuestionnaire
    ): Promise<TenderQuestionnaire> {
      const doc = await Model.findOneAndUpdate(
        { organizationId, entityId: q.id },
        { $set: { organizationId, ...toPersist(q) } },
        { upsert: true, returnDocument: "after" }
      ).lean();
      return toDomain(doc as TenderQuestionnaireDocument);
    },

    async remove(organizationId: string, entityId: string): Promise<boolean> {
      const res = await Model.deleteOne({ organizationId, entityId });
      return res.deletedCount > 0;
    },
  };
}
