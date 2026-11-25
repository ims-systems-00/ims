import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const subjectSchema = new Schema(
  {
    kind: { type: String, required: true },
    id: { type: String, required: true },
  },
  { _id: false }
);

const relyableEvidenceSchema = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    type: { type: String, required: true, index: true },
    subject: { type: subjectSchema, default: null },
    status: {
      type: String,
      required: true,
      enum: ["valid", "partial", "fail", "expired", "adverse", "clear"],
    },
    observedAt: { type: String, required: true },
    validUntil: { type: String, default: null },
    payload: { type: Schema.Types.Mixed, default: {} },
    level: { type: Number, required: true, min: 0, max: 3 },
    source: { type: String, required: true },
    disputed: { type: Boolean, default: false },
    prevHash: { type: String, default: null },
    hash: { type: String, required: true },
    at: { type: Date, required: true },
    idempotencyKey: { type: String, required: true, index: true },
  },
  { timestamps: true, collection: "relyable_evidence" }
);

relyableEvidenceSchema.index(
  { organizationId: 1, idempotencyKey: 1 },
  { unique: true }
);
relyableEvidenceSchema.index({ organizationId: 1, at: 1 });

export type RelyableEvidenceDocument = InferSchemaType<
  typeof relyableEvidenceSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type RelyableEvidenceModel = Model<RelyableEvidenceDocument>;

export const RelyableEvidenceModelName = "RelyableEvidence";

export function getRelyableEvidenceModel(): RelyableEvidenceModel {
  return (
    (mongoose.models[RelyableEvidenceModelName] as
      | RelyableEvidenceModel
      | undefined) ??
    mongoose.model<RelyableEvidenceDocument>(
      RelyableEvidenceModelName,
      relyableEvidenceSchema
    )
  );
}
