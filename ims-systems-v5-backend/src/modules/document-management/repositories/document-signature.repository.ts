import { getDocumentSignatureModel } from "./document-signature.model";
import type {
  DocumentSignature,
  SignatureLocation,
  SignatureStatus,
} from "../types";

function toDomain(doc: Record<string, unknown>): DocumentSignature {
  const d = doc as unknown as DocumentSignature & { _id: unknown };
  return {
    id: String(d._id),
    organizationId: d.organizationId,
    repositoryId: d.repositoryId,
    documentNodeId: d.documentNodeId,
    inviteeType: d.inviteeType,
    userId: d.userId,
    email: d.email,
    displayName: d.displayName,
    message: d.message ?? "",
    status: d.status as SignatureStatus,
    signatureLocations: (d.signatureLocations ?? []) as SignatureLocation[],
    signatureName: d.signatureName,
    signatureFont: d.signatureFont,
    jobTitle: d.jobTitle,
    organisation: d.organisation,
    signedCopy: d.signedCopy,
    lastOpenedAt: d.lastOpenedAt ?? null,
    signedAt: d.signedAt ?? null,
    createdBy: d.createdBy,
    createdAt: d.createdAt as unknown as Date,
    updatedAt: d.updatedAt as unknown as Date,
  };
}

export type DocumentSignatureStore = ReturnType<
  typeof createDocumentSignatureStore
>;

export function createDocumentSignatureStore() {
  const Model = getDocumentSignatureModel();

  return {
    async create(
      input: Omit<DocumentSignature, "id" | "createdAt" | "updatedAt">
    ): Promise<DocumentSignature> {
      const doc = await Model.create(input);
      return toDomain(doc.toObject() as Record<string, unknown>);
    },

    async findById(
      organizationId: string,
      id: string
    ): Promise<DocumentSignature | null> {
      const doc = await Model.findOne({ _id: id, organizationId }).lean();
      return doc ? toDomain(doc as Record<string, unknown>) : null;
    },

    async findByIdAnyOrg(id: string): Promise<DocumentSignature | null> {
      const doc = await Model.findOne({ _id: id }).lean();
      return doc ? toDomain(doc as Record<string, unknown>) : null;
    },

    async listByNode(
      organizationId: string,
      documentNodeId: string
    ): Promise<DocumentSignature[]> {
      const docs = await Model.find({ organizationId, documentNodeId })
        .sort({ createdAt: -1 })
        .lean();
      return docs.map((d) => toDomain(d as Record<string, unknown>));
    },

    async listForOrganization(
      organizationId: string,
      filter: { userId?: string; status?: SignatureStatus }
    ): Promise<DocumentSignature[]> {
      const query: Record<string, unknown> = { organizationId };
      if (filter.userId) query.userId = filter.userId;
      if (filter.status) query.status = filter.status;
      const docs = await Model.find(query)
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();
      return docs.map((d) => toDomain(d as Record<string, unknown>));
    },

    async update(
      organizationId: string,
      id: string,
      patch: Partial<DocumentSignature>
    ): Promise<DocumentSignature | null> {
      const doc = await Model.findOneAndUpdate(
        { _id: id, organizationId },
        { $set: patch },
        { new: true }
      ).lean();
      return doc ? toDomain(doc as Record<string, unknown>) : null;
    },

    async deleteById(organizationId: string, id: string): Promise<void> {
      await Model.deleteOne({ _id: id, organizationId });
    },
  };
}
