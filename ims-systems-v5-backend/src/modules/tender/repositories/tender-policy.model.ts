import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const histSchema = new Schema(
  {
    t: { type: String, required: true },
    by: { type: String, required: true },
    what: { type: String, required: true },
  },
  { _id: false }
);

const tenderPolicySchema = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    entityId: { type: String, required: true },
    name: { type: String, required: true },
    ref: { type: String },
    version: { type: String },
    reviewed: { type: String },
    nextReview: { type: String },
    owner: { type: String },
    fileId: { type: String, default: null },
    fileName: { type: String, default: null },
    fileMeta: { type: Schema.Types.Mixed, default: null },
    summary: { type: String },
    tags: { type: [String], default: [] },
    hist: { type: [histSchema], default: [] },
  },
  { timestamps: true, collection: "tender_policies" }
);

tenderPolicySchema.index({ organizationId: 1, entityId: 1 }, { unique: true });

export type TenderPolicyDocument = InferSchemaType<typeof tenderPolicySchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type TenderPolicyModel = Model<TenderPolicyDocument>;
export const TenderPolicyModelName = "TenderPolicy";

export function getTenderPolicyModel(): TenderPolicyModel {
  return (
    (mongoose.models[TenderPolicyModelName] as TenderPolicyModel | undefined) ??
    mongoose.model<TenderPolicyDocument>(
      TenderPolicyModelName,
      tenderPolicySchema
    )
  );
}
