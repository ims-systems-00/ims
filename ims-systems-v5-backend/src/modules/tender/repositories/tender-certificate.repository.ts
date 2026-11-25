import type { TenderCertificate, TenderFileMeta } from "../types";
import {
  getTenderCertificateModel,
  type TenderCertificateDocument,
} from "./tender-certificate.model";

function opt(v: string | null | undefined): string | undefined {
  return v == null ? undefined : v;
}

function toFileMeta(raw: unknown): TenderFileMeta | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  if (typeof m.Bucket !== "string") return null;
  return {
    Name: String(m.Name ?? ""),
    Bucket: m.Bucket,
    Key: typeof m.Key === "string" ? m.Key : undefined,
    key: typeof m.key === "string" ? m.key : undefined,
    Size: typeof m.Size === "number" ? m.Size : undefined,
  };
}

function toDomain(doc: TenderCertificateDocument): TenderCertificate {
  return {
    id: doc.entityId,
    name: doc.name,
    body: opt(doc.body),
    number: opt(doc.number),
    standard: opt(doc.standard),
    scope: opt(doc.scope),
    issued: opt(doc.issued),
    expires: opt(doc.expires),
    fileId: doc.fileId ?? null,
    fileName: doc.fileName ?? null,
    fileMeta: toFileMeta(
      (doc as { fileMeta?: unknown }).fileMeta
    ),
    hist: (doc.hist ?? []).map((h) => ({ t: h.t, by: h.by, what: h.what })),
  };
}

export type TenderCertificateRepository = ReturnType<
  typeof createTenderCertificateRepository
>;

export function createTenderCertificateRepository() {
  const Model = getTenderCertificateModel();

  return {
    async list(organizationId: string): Promise<TenderCertificate[]> {
      const docs = await Model.find({ organizationId }).lean();
      return docs.map((d) => toDomain(d as TenderCertificateDocument));
    },

    async upsert(
      organizationId: string,
      cert: TenderCertificate
    ): Promise<TenderCertificate> {
      const doc = await Model.findOneAndUpdate(
        { organizationId, entityId: cert.id },
        {
          $set: {
            organizationId,
            entityId: cert.id,
            name: cert.name,
            body: cert.body,
            number: cert.number,
            standard: cert.standard,
            scope: cert.scope,
            issued: cert.issued,
            expires: cert.expires,
            fileId: cert.fileId ?? null,
            fileName: cert.fileName ?? null,
            fileMeta: cert.fileMeta ?? null,
            hist: cert.hist || [],
          },
        },
        { upsert: true, returnDocument: "after" }
      ).lean();
      return toDomain(doc as TenderCertificateDocument);
    },

    async remove(organizationId: string, entityId: string): Promise<boolean> {
      const res = await Model.deleteOne({ organizationId, entityId });
      return res.deletedCount > 0;
    },
  };
}
