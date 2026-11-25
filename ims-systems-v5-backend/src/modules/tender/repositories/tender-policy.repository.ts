import type { TenderFileMeta, TenderPolicy } from "../types";
import {
  getTenderPolicyModel,
  type TenderPolicyDocument,
} from "./tender-policy.model";

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

function toDomain(doc: TenderPolicyDocument): TenderPolicy {
  return {
    id: doc.entityId,
    name: doc.name,
    ref: opt(doc.ref),
    version: opt(doc.version),
    reviewed: opt(doc.reviewed),
    nextReview: opt(doc.nextReview),
    owner: opt(doc.owner),
    fileId: doc.fileId ?? null,
    fileName: (doc as { fileName?: string | null }).fileName ?? null,
    fileMeta: toFileMeta((doc as { fileMeta?: unknown }).fileMeta),
    summary: opt(doc.summary),
    tags: [...(doc.tags ?? [])],
    hist: (doc.hist ?? []).map((h) => ({ t: h.t, by: h.by, what: h.what })),
  };
}

export type TenderPolicyRepository = ReturnType<
  typeof createTenderPolicyRepository
>;

export function createTenderPolicyRepository() {
  const Model = getTenderPolicyModel();

  return {
    async list(organizationId: string): Promise<TenderPolicy[]> {
      const docs = await Model.find({ organizationId }).lean();
      return docs.map((d) => toDomain(d as TenderPolicyDocument));
    },

    async upsert(
      organizationId: string,
      policy: TenderPolicy
    ): Promise<TenderPolicy> {
      const doc = await Model.findOneAndUpdate(
        { organizationId, entityId: policy.id },
        {
          $set: {
            organizationId,
            entityId: policy.id,
            name: policy.name,
            ref: policy.ref,
            version: policy.version,
            reviewed: policy.reviewed,
            nextReview: policy.nextReview,
            owner: policy.owner,
            fileId: policy.fileId ?? null,
            fileName: policy.fileName ?? null,
            fileMeta: policy.fileMeta ?? null,
            summary: policy.summary,
            tags: policy.tags || [],
            hist: policy.hist || [],
          },
        },
        { upsert: true, returnDocument: "after" }
      ).lean();
      return toDomain(doc as TenderPolicyDocument);
    },

    async remove(organizationId: string, entityId: string): Promise<boolean> {
      const res = await Model.deleteOne({ organizationId, entityId });
      return res.deletedCount > 0;
    },
  };
}
