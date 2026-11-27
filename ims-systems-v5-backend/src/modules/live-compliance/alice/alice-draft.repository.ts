/**
 * ALICE drafts: what ALICE produced, and what a person decided.
 *
 * pending   — changes module data on approval; waiting for a person
 * approved  — applied to the module by `decidedBy`
 * discarded — rejected by `decidedBy`
 * ready     — read-only output (explanations, checklists); nothing to apply
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import type { AliceTaskId } from "./tasks";

export const ALICE_DRAFT_STATUSES = ["pending", "approved", "discarded", "ready"] as const;
export type AliceDraftStatus = (typeof ALICE_DRAFT_STATUSES)[number];

const draftSchema = new Schema(
  {
    organizationId: { type: String, required: true },
    task: { type: String, required: true },
    ref: { type: String, default: null },
    title: { type: String, required: true },
    status: { type: String, enum: [...ALICE_DRAFT_STATUSES], required: true },
    output: { type: Schema.Types.Mixed, required: true },
    markdown: { type: String, required: true },
    applyLabel: { type: String, default: null },
    model: { type: String, default: null },
    createdBy: { type: String, required: true },
    decidedBy: { type: String, default: null },
    decidedByName: { type: String, default: null },
    decidedAt: { type: Date, default: null },
    appliedMessage: { type: String, default: null },
  },
  { timestamps: true }
);
draftSchema.index({ organizationId: 1, status: 1, createdAt: -1 });

type DraftDocument = InferSchemaType<typeof draftSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

export function getAliceDraftModel(): Model<DraftDocument> {
  return (
    (mongoose.models.LiveComplianceAliceDraft as Model<DraftDocument> | undefined) ??
    mongoose.model<DraftDocument>("LiveComplianceAliceDraft", draftSchema, "liveComplianceAliceDrafts")
  );
}

export type AliceDraft = {
  id: string;
  task: AliceTaskId;
  ref: string | null;
  title: string;
  status: AliceDraftStatus;
  output: unknown;
  markdown: string;
  applyLabel: string | null;
  createdBy: string;
  createdAt: string;
  decidedBy: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  appliedMessage: string | null;
};

function toDomain(doc: DraftDocument): AliceDraft {
  return {
    id: String(doc._id),
    task: doc.task as AliceTaskId,
    ref: doc.ref ?? null,
    title: doc.title,
    status: doc.status as AliceDraftStatus,
    output: doc.output,
    markdown: doc.markdown,
    applyLabel: doc.applyLabel ?? null,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt.toISOString(),
    decidedBy: doc.decidedBy ?? null,
    decidedByName: doc.decidedByName ?? null,
    decidedAt: doc.decidedAt ? doc.decidedAt.toISOString() : null,
    appliedMessage: doc.appliedMessage ?? null,
  };
}

export type AliceDraftRepository = ReturnType<typeof createAliceDraftRepository>;

export function createAliceDraftRepository() {
  const Model = getAliceDraftModel();
  const isId = (id: string) => mongoose.isValidObjectId(id);

  return {
    async create(
      organizationId: string,
      input: Omit<AliceDraft, "id" | "createdAt" | "decidedBy" | "decidedByName" | "decidedAt" | "appliedMessage"> & { model?: string | null }
    ): Promise<AliceDraft> {
      const doc = await Model.create({ organizationId, ...input });
      return toDomain(doc.toObject() as DraftDocument);
    },

    async findById(organizationId: string, id: string): Promise<AliceDraft | null> {
      if (!isId(id)) return null;
      const doc = await Model.findOne({ _id: id, organizationId }).lean().exec();
      return doc ? toDomain(doc as DraftDocument) : null;
    },

    async list(
      organizationId: string,
      query: { status?: AliceDraftStatus; limit: number }
    ): Promise<AliceDraft[]> {
      const docs = await Model.find({ organizationId, ...(query.status ? { status: query.status } : {}) })
        .sort({ createdAt: -1 })
        .limit(query.limit)
        .lean()
        .exec();
      return docs.map((d) => toDomain(d as DraftDocument));
    },

    /** Atomic pending → decided transition; null when no longer pending. */
    async decide(
      organizationId: string,
      id: string,
      input: {
        status: "approved" | "discarded";
        decidedBy: string;
        decidedByName: string | null;
        appliedMessage?: string | null;
      }
    ): Promise<AliceDraft | null> {
      if (!isId(id)) return null;
      const doc = await Model.findOneAndUpdate(
        { _id: id, organizationId, status: "pending" },
        {
          $set: {
            status: input.status,
            decidedBy: input.decidedBy,
            decidedByName: input.decidedByName,
            decidedAt: new Date(),
            appliedMessage: input.appliedMessage ?? null,
          },
        },
        { new: true }
      )
        .lean()
        .exec();
      return doc ? toDomain(doc as DraftDocument) : null;
    },

    /** Undo a claim when applying failed, so the draft can be retried. */
    async revertToPending(organizationId: string, id: string): Promise<void> {
      await Model.updateOne(
        { _id: id, organizationId, status: "approved" },
        { $set: { status: "pending", decidedBy: null, decidedByName: null, decidedAt: null, appliedMessage: null } }
      ).exec();
    },

    async setAppliedMessage(organizationId: string, id: string, message: string): Promise<void> {
      await Model.updateOne({ _id: id, organizationId }, { $set: { appliedMessage: message } }).exec();
    },
  };
}
