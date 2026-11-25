import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const histSchema = new Schema(
  {
    t: { type: String, required: true },
    by: { type: String, required: true },
    what: { type: String, required: true },
  },
  { _id: false }
);

const tenderCaseSchema = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    entityId: { type: String, required: true },
    client: { type: String, required: true },
    title: { type: String, required: true },
    sector: { type: String },
    year: { type: String },
    value: { type: String },
    summary: { type: String },
    outcome: { type: String },
    tags: { type: [String], default: [] },
    hist: { type: [histSchema], default: [] },
  },
  { timestamps: true, collection: "tender_cases" }
);

tenderCaseSchema.index({ organizationId: 1, entityId: 1 }, { unique: true });

export type TenderCaseDocument = InferSchemaType<typeof tenderCaseSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type TenderCaseModel = Model<TenderCaseDocument>;
export const TenderCaseModelName = "TenderCase";

export function getTenderCaseModel(): TenderCaseModel {
  return (
    (mongoose.models[TenderCaseModelName] as TenderCaseModel | undefined) ??
    mongoose.model<TenderCaseDocument>(TenderCaseModelName, tenderCaseSchema)
  );
}
