import { createHash, randomBytes } from "node:crypto";
import { getDocumentAccessTokenModel } from "./document-access-token.model";

export type DocumentAccessPurpose = "share" | "signature";

export type DocumentAccessTokenRecord = {
  id: string;
  organizationId: string;
  documentNodeId: string;
  signatureId?: string;
  purpose: DocumentAccessPurpose;
  recipientEmail?: string;
  createdBy: string;
  expiresAt: Date;
  invalidatedAt: Date | null;
  lastUsedAt: Date | null;
};

export function hashAccessToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateAccessToken(): string {
  return randomBytes(32).toString("hex");
}

export type DocumentAccessTokenStore = ReturnType<
  typeof createDocumentAccessTokenStore
>;

export function createDocumentAccessTokenStore() {
  const Model = getDocumentAccessTokenModel();

  function toRecord(doc: {
    _id: unknown;
    organizationId: string;
    documentNodeId: string;
    signatureId?: string | null;
    purpose: string;
    recipientEmail?: string | null;
    createdBy: string;
    expiresAt: Date;
    invalidatedAt?: Date | null;
    lastUsedAt?: Date | null;
  }): DocumentAccessTokenRecord {
    return {
      id: String(doc._id),
      organizationId: doc.organizationId,
      documentNodeId: doc.documentNodeId,
      signatureId: doc.signatureId ?? undefined,
      purpose: doc.purpose as DocumentAccessPurpose,
      recipientEmail: doc.recipientEmail ?? undefined,
      createdBy: doc.createdBy,
      expiresAt: doc.expiresAt,
      invalidatedAt: doc.invalidatedAt ?? null,
      lastUsedAt: doc.lastUsedAt ?? null,
    };
  }

  return {
    async create(input: {
      organizationId: string;
      documentNodeId: string;
      signatureId?: string;
      purpose: DocumentAccessPurpose;
      rawToken: string;
      recipientEmail?: string;
      createdBy: string;
      expiresAt: Date;
    }): Promise<DocumentAccessTokenRecord> {
      const doc = await Model.create({
        organizationId: input.organizationId,
        documentNodeId: input.documentNodeId,
        signatureId: input.signatureId,
        purpose: input.purpose,
        tokenHash: hashAccessToken(input.rawToken),
        recipientEmail: input.recipientEmail,
        createdBy: input.createdBy,
        expiresAt: input.expiresAt,
        invalidatedAt: null,
        lastUsedAt: null,
      });
      return toRecord(doc);
    },

    async findByRawToken(
      rawToken: string
    ): Promise<DocumentAccessTokenRecord | null> {
      const doc = await Model.findOne({
        tokenHash: hashAccessToken(rawToken),
      }).lean();
      return doc ? toRecord(doc) : null;
    },

    async markUsed(id: string): Promise<void> {
      await Model.updateOne({ _id: id }, { $set: { lastUsedAt: new Date() } });
    },

    async invalidate(id: string): Promise<void> {
      await Model.updateOne(
        { _id: id },
        { $set: { invalidatedAt: new Date() } }
      );
    },

    async invalidateForSignature(signatureId: string): Promise<void> {
      await Model.updateMany(
        { signatureId, invalidatedAt: null },
        { $set: { invalidatedAt: new Date() } }
      );
    },
  };
}
