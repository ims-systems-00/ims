import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const tenderRateSchema = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    entityId: { type: String, required: true },
    item: { type: String, required: true },
    unit: { type: String, default: "" },
    rate: { type: Number, default: 0 },
    category: { type: String },
  },
  { timestamps: true, collection: "tender_rates" }
);

tenderRateSchema.index({ organizationId: 1, entityId: 1 }, { unique: true });

export type TenderRateDocument = InferSchemaType<typeof tenderRateSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type TenderRateModel = Model<TenderRateDocument>;
export const TenderRateModelName = "TenderRate";

export function getTenderRateModel(): TenderRateModel {
  return (
    (mongoose.models[TenderRateModelName] as TenderRateModel | undefined) ??
    mongoose.model<TenderRateDocument>(TenderRateModelName, tenderRateSchema)
  );
}
