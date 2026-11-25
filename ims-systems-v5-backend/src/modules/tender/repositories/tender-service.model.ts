import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const histSchema = new Schema(
  {
    t: { type: String, required: true },
    by: { type: String, required: true },
    what: { type: String, required: true },
  },
  { _id: false }
);

const tenderServiceSchema = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    entityId: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    method: { type: String },
    people: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    hist: { type: [histSchema], default: [] },
  },
  { timestamps: true, collection: "tender_services" }
);

tenderServiceSchema.index({ organizationId: 1, entityId: 1 }, { unique: true });

export type TenderServiceDocument = InferSchemaType<
  typeof tenderServiceSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type TenderServiceModel = Model<TenderServiceDocument>;
export const TenderServiceModelName = "TenderServiceItem";

export function getTenderServiceModel(): TenderServiceModel {
  return (
    (mongoose.models[TenderServiceModelName] as
      | TenderServiceModel
      | undefined) ??
    mongoose.model<TenderServiceDocument>(
      TenderServiceModelName,
      tenderServiceSchema
    )
  );
}
