import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const premiseAssetSchema = new Schema(
  {
    organizationId: { type: String, required: true },
    reference: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    businessUnitId: { type: String },
    categoryId: { type: String },
    cost: { type: Number, default: 0, min: 0 },
    createdBy: { type: String, required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

premiseAssetSchema.index({ organizationId: 1, deletedAt: 1, createdAt: -1 });
premiseAssetSchema.index({ organizationId: 1, reference: 1 }, { unique: true });
premiseAssetSchema.index({ organizationId: 1, deletedAt: 1, businessUnitId: 1 });

export type PremiseAssetDocument = InferSchemaType<typeof premiseAssetSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type PremiseAssetModel = Model<PremiseAssetDocument>;
export const PremiseAssetModelName = "PremiseAsset";

export function getPremiseAssetModel(): PremiseAssetModel {
  return (
    (mongoose.models[PremiseAssetModelName] as PremiseAssetModel | undefined) ??
    mongoose.model<PremiseAssetDocument>(PremiseAssetModelName, premiseAssetSchema)
  );
}
