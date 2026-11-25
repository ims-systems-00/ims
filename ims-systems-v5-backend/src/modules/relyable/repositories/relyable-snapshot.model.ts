import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const capSchema = new Schema(
  {
    limit: { type: Number, default: null },
    reason: { type: String, required: true },
  },
  { _id: false }
);

const explainSchema = new Schema(
  {
    type: { type: String, required: true },
    domain: { type: String, required: true },
    state: { type: String, required: true },
    weight: { type: Number, required: true },
    score: { type: Number, required: true },
    level: { type: Number, default: null },
    count: { type: Number, default: 0 },
  },
  { _id: false }
);

const relyableSnapshotSchema = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    score: { type: Number, required: true },
    raw: { type: Number, required: true },
    band: { type: String, required: true },
    bandName: { type: String, required: true },
    tier: { type: Number, required: true },
    verifiedRatio: { type: Number, required: true },
    domains: { type: Schema.Types.Mixed, default: {} },
    caps: { type: [capSchema], default: [] },
    explain: { type: [explainSchema], default: [] },
    modelVersion: { type: String, required: true },
    computedAt: { type: Date, required: true },
    reason: { type: String, default: "recompute" },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "relyable_snapshots" }
);

relyableSnapshotSchema.index({ organizationId: 1, computedAt: -1 });

export type RelyableSnapshotDocument = InferSchemaType<
  typeof relyableSnapshotSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

export type RelyableSnapshotModel = Model<RelyableSnapshotDocument>;

export const RelyableSnapshotModelName = "RelyableSnapshot";

export function getRelyableSnapshotModel(): RelyableSnapshotModel {
  return (
    (mongoose.models[RelyableSnapshotModelName] as
      | RelyableSnapshotModel
      | undefined) ??
    mongoose.model<RelyableSnapshotDocument>(
      RelyableSnapshotModelName,
      relyableSnapshotSchema
    )
  );
}
