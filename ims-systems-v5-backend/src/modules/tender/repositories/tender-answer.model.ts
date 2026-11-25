import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const histSchema = new Schema(
  {
    t: { type: String, required: true },
    by: { type: String, required: true },
    what: { type: String, required: true },
  },
  { _id: false }
);

const evidenceSchema = new Schema(
  {
    kind: { type: String, required: true },
    id: { type: String, required: true },
    label: { type: String },
  },
  { _id: false }
);

const tenderAnswerSchema = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    entityId: { type: String, required: true },
    question: { type: String, required: true },
    answer: { type: String, default: "" },
    tags: { type: [String], default: [] },
    standards: { type: [String], default: [] },
    owner: { type: String, default: "" },
    approvedBy: { type: String },
    approvedAt: { type: String },
    reviewBy: { type: String },
    uses: { type: Number, default: 0 },
    source: { type: Schema.Types.Mixed },
    evidence: { type: [evidenceSchema], default: [] },
    hist: { type: [histSchema], default: [] },
  },
  { timestamps: true, collection: "tender_answers" }
);

tenderAnswerSchema.index(
  { organizationId: 1, entityId: 1 },
  { unique: true }
);

export type TenderAnswerDocument = InferSchemaType<typeof tenderAnswerSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type TenderAnswerModel = Model<TenderAnswerDocument>;
export const TenderAnswerModelName = "TenderAnswer";

export function getTenderAnswerModel(): TenderAnswerModel {
  return (
    (mongoose.models[TenderAnswerModelName] as TenderAnswerModel | undefined) ??
    mongoose.model<TenderAnswerDocument>(
      TenderAnswerModelName,
      tenderAnswerSchema
    )
  );
}
